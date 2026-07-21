// Airtable API client for Micro Office — Portfolio (Projets + Images)

import type { Projet, ProjetImage, AccueilItem, AirtableRecord, AirtableResponse } from '../types';

const AIRTABLE_API_URL = 'https://api.airtable.com/v0';

interface AirtableClientConfig {
  token: string;
  baseId: string;
  projetsTableName?: string;
  imagesTableName?: string;
  accueilTableName?: string;
}

// ---- Field mapping helpers -------------------------------------------------
// Read a field trying several possible names (accents/apostrophes vary).
function pick(fields: Record<string, any>, ...names: string[]): any {
  for (const name of names) {
    if (fields[name] !== undefined && fields[name] !== null && fields[name] !== '') {
      return fields[name];
    }
  }
  return undefined;
}

// Airtable attachment field → first URL; plain string → itself.
function toUrl(value: any): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && value.length > 0) {
    return value[0]?.url || value[0]?.thumbnails?.large?.url || '';
  }
  return '';
}

// "3D - Stand | Affiches | Documents" → ["3D - Stand", "Affiches", "Documents"]
function splitCategories(value: any): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  return String(value)
    .split('|')
    .map((c) => c.trim())
    .filter(Boolean);
}

function mapProjet(record: AirtableRecord<Record<string, any>>): Projet {
  const f = record.fields;
  return {
    id: record.id,
    titre: pick(f, 'Nom', 'Titre', 'titre', 'nom') || '',
    slug: pick(f, 'Slug', 'slug') || '',
    categories: splitCategories(pick(f, 'Catégories', 'Categories', 'categorie', 'Catégorie')),
    familles: (() => {
      const v = pick(f, 'Famille', 'Familles', 'famille');
      return Array.isArray(v) ? v : splitCategories(v);
    })(),
    couverture: toUrl(pick(f, 'URL Couverture', 'Couverture', 'couverture')),
    nombreImages: Number(pick(f, "Nombre d'images", 'Nombre d’images', 'nombreImages')) || 0,
    dossierCloudinary: pick(f, 'Dossier Cloudinary', 'dossierCloudinary'),
    misEnAvant: Boolean(pick(f, 'Mis en avant', 'misEnAvant', 'Featured')),
    // Optional narrative fields (flexible templates)
    client: pick(f, 'Client', 'client'),
    accroche: pick(f, 'Accroche', 'accroche'),
    description: pick(f, 'Description', 'description'),
    createdAt: record.createdTime,
  };
}

function mapImage(record: AirtableRecord<Record<string, any>>): ProjetImage {
  const f = record.fields;
  const projetRaw = pick(f, 'Projet', 'projet');
  // "Projet" may be a linked-record array of ids/names, or a plain string.
  const projet = Array.isArray(projetRaw) ? String(projetRaw[0] ?? '') : String(projetRaw ?? '');
  return {
    id: record.id,
    nom: pick(f, 'Nom', 'nom') || '',
    projet,
    categorie: pick(f, 'Catégorie', 'Categorie', 'categorie') || '',
    url: toUrl(pick(f, 'URL Cloudinary', 'Image', 'url')),
    publicId: pick(f, 'Public ID', 'publicId'),
  };
}

// ---- Client ----------------------------------------------------------------
export class AirtableClient {
  private token: string;
  private baseId: string;
  private projetsTableName: string;
  private imagesTableName: string;
  private accueilTableName: string;

  constructor(config: AirtableClientConfig) {
    this.token = config.token;
    this.baseId = config.baseId;
    this.projetsTableName = config.projetsTableName || 'Projets';
    this.imagesTableName = config.imagesTableName || 'Images';
    this.accueilTableName = config.accueilTableName || 'Accueil';
  }

  private async request<T = Record<string, any>>(
    tableName: string,
    options?: {
      view?: string;
      maxRecords?: number;
      pageSize?: number;
      filterByFormula?: string;
      sortBy?: { field: string; direction: 'asc' | 'desc' }[];
    }
  ): Promise<AirtableRecord<T>[]> {
    const all: AirtableRecord<T>[] = [];
    let offset: string | undefined;

    do {
      const params = new URLSearchParams();
      if (options?.view) params.append('view', options.view);
      if (options?.maxRecords) params.append('maxRecords', String(options.maxRecords));
      params.append('pageSize', String(options?.pageSize ?? 100));
      if (options?.filterByFormula) params.append('filterByFormula', options.filterByFormula);
      if (options?.sortBy) {
        options.sortBy.forEach((sort, idx) => {
          params.append(`sort[${idx}][field]`, sort.field);
          params.append(`sort[${idx}][direction]`, sort.direction);
        });
      }
      if (offset) params.append('offset', offset);

      const url = `${AIRTABLE_API_URL}/${this.baseId}/${encodeURIComponent(tableName)}?${params.toString()}`;
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(`Airtable API error (${response.status}): ${error?.error?.message || response.statusText}`);
      }

      const data = (await response.json()) as AirtableResponse<T>;
      all.push(...data.records);
      offset = data.offset;
    } while (offset);

    return all;
  }

  async getProjets(): Promise<Projet[]> {
    const records = await this.request(this.projetsTableName);
    return records.map(mapProjet);
  }

  async getProjetBySlug(slug: string): Promise<Projet | null> {
    const records = await this.request(this.projetsTableName, {
      filterByFormula: `{Slug} = "${slug.replace(/"/g, '\\"')}"`,
      maxRecords: 1,
    });
    return records.length ? mapProjet(records[0]) : null;
  }

  async getImages(): Promise<ProjetImage[]> {
    const records = await this.request(this.imagesTableName);
    return records.map(mapImage);
  }

  // Fetch gallery images for a given project (by project name).
  async getImagesForProjet(projetNom: string): Promise<ProjetImage[]> {
    const records = await this.request(this.imagesTableName, {
      filterByFormula: `{Projet} = "${projetNom.replace(/"/g, '\\"')}"`,
    });
    return records.map(mapImage);
  }

  // Fetch homepage dynamic content (Accueil table).
  async getAccueil(): Promise<AccueilItem[]> {
    const records = await this.request(this.accueilTableName);
    return records
      .map((r) => ({
        cle: pick(r.fields, 'Cle', 'cle') || '',
        zone: pick(r.fields, 'Zone', 'zone') || '',
        titre: pick(r.fields, 'Titre', 'titre') || '',
        image: toUrl(pick(r.fields, 'Image', 'image')),
        image2: toUrl(pick(r.fields, 'Image 2', 'image2')),
        badge: pick(r.fields, 'Badge', 'badge') || '',
        sousTitre: pick(r.fields, 'Sous-titre', 'Sous titre', 'sousTitre') || '',
        ordre: Number(pick(r.fields, 'Ordre', 'ordre')) || 0,
        actif: Boolean(pick(r.fields, 'Actif', 'actif')),
      }))
      .sort((a, b) => a.ordre - b.ordre);
  }
}

// ---- Singleton -------------------------------------------------------------
let client: AirtableClient | null = null;

function env(key: string): string | undefined {
  // Server-side secrets can live on either import.meta.env (Astro/Vite)
  // or process.env (Node adapter / Netlify functions).
  return import.meta.env[key] ?? (typeof process !== 'undefined' ? process.env?.[key] : undefined);
}

export function getAirtableClient(): AirtableClient | null {
  if (!client) {
    const token = env('AIRTABLE_API_TOKEN');
    const baseId = env('AIRTABLE_BASE_ID');
    if (!token || !baseId) return null;

    client = new AirtableClient({
      token,
      baseId,
      projetsTableName: env('AIRTABLE_TABLE_PORTFOLIO') || 'Projets',
      imagesTableName: env('AIRTABLE_TABLE_IMAGES') || 'Images',
      accueilTableName: env('AIRTABLE_TABLE_ACCUEIL') || 'Accueil',
    });
  }
  return client;
}
