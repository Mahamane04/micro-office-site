// Airtable API client for Micro Office — Portfolio (Projets + Images)

import type { Projet, ProjetImage, AccueilItem, SolutionPage, Prestation, Produit, AirtableRecord, AirtableResponse } from '../types';

const AIRTABLE_API_URL = 'https://api.airtable.com/v0';

interface AirtableClientConfig {
  token: string;
  baseId: string;
  projetsTableName?: string;
  imagesTableName?: string;
  accueilTableName?: string;
  solutionsPagesTableName?: string;
  solutionsPrestationsTableName?: string;
  produitsTableName?: string;
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
  private solutionsPagesTableName: string;
  private solutionsPrestationsTableName: string;
  private produitsTableName: string;

  constructor(config: AirtableClientConfig) {
    this.token = config.token;
    this.baseId = config.baseId;
    this.projetsTableName = config.projetsTableName || 'Projets';
    this.imagesTableName = config.imagesTableName || 'Images';
    this.accueilTableName = config.accueilTableName || 'Accueil';
    this.solutionsPagesTableName = config.solutionsPagesTableName || 'SolutionsPages';
    this.solutionsPrestationsTableName = config.solutionsPrestationsTableName || 'SolutionsPrestations';
    this.produitsTableName = config.produitsTableName || 'Produits';
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

  // Fetch a Solutions detail page's content (hero + CTA copy) by slug.
  async getSolutionPage(cle: string): Promise<SolutionPage | null> {
    const records = await this.request(this.solutionsPagesTableName, {
      filterByFormula: `{Cle} = "${cle.replace(/"/g, '\\"')}"`,
      maxRecords: 1,
    });
    if (!records.length) return null;
    const f = records[0].fields as Record<string, any>;
    return {
      cle: pick(f, 'Cle', 'cle') || '',
      titreH1: pick(f, 'Titre H1', 'titreH1') || '',
      intro: pick(f, 'Intro', 'intro') || '',
      texteBouton: pick(f, 'Texte bouton hero', 'texteBouton') || '',
      ctaTitre: pick(f, 'CTA titre', 'ctaTitre') || '',
      ctaTexte: pick(f, 'CTA texte', 'ctaTexte') || '',
      ordre: Number(pick(f, 'Ordre', 'ordre')) || 0,
    };
  }

  // Fetch the service items ("prestations") for a given Solutions page.
  async getPrestations(clePage: string): Promise<Prestation[]> {
    const records = await this.request(this.solutionsPrestationsTableName, {
      filterByFormula: `{Cle Page} = "${clePage.replace(/"/g, '\\"')}"`,
    });
    return records
      .map((r) => {
        const f = r.fields as Record<string, any>;
        return {
          clePage: pick(f, 'Cle Page', 'clePage') || '',
          titre: pick(f, 'Titre', 'titre') || '',
          description: pick(f, 'Description', 'description') || '',
          ordre: Number(pick(f, 'Ordre', 'ordre')) || 0,
        };
      })
      .sort((a, b) => a.ordre - b.ordre);
  }

  // Fetch active boutique products (Produits table).
  async getProduits(): Promise<Produit[]> {
    const records = await this.request(this.produitsTableName);
    return records
      .filter((r) => Boolean(pick(r.fields as Record<string, any>, 'Actif', 'actif')))
      .map((r) => {
        const f = r.fields as Record<string, any>;
        // "Images" is a multiline field: one gallery URL per line
        const gallery = String(pick(f, 'Images', 'images') || '')
          .split('\n')
          .map((s: string) => s.trim())
          .filter(Boolean)
          .map((src: string) => ({ src, alt: pick(f, 'Nom', 'nom') || '' }));
        return {
          id: r.id,
          slug: pick(f, 'Slug', 'slug') || '',
          nom: pick(f, 'Nom', 'nom') || '',
          marque: pick(f, 'Marque', 'marque') || '',
          categorie: pick(f, 'Catégorie', 'Categorie', 'categorie') || '',
          prix: Number(pick(f, 'Prix', 'prix')) || 0,
          prixPromo: pick(f, 'Prix promo', 'prixPromo') != null ? Number(pick(f, 'Prix promo', 'prixPromo')) : null,
          accroche: pick(f, 'Accroche', 'accroche') || '',
          description: pick(f, 'Description', 'description') || '',
          couverture: toUrl(pick(f, 'Image', 'Couverture', 'couverture')),
          images: gallery,
          statut: (pick(f, 'Statut', 'statut') || 'en stock') as Produit['statut'],
          quantiteStock: pick(f, 'Stock', 'quantiteStock') != null ? Number(pick(f, 'Stock', 'quantiteStock')) : undefined,
          nouveaute: Boolean(pick(f, 'Nouveauté', 'Nouveaute', 'nouveaute')),
          misEnAvant: Boolean(pick(f, 'Mis en avant', 'misEnAvant')),
          createdAt: r.createdTime,
        };
      });
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
      solutionsPagesTableName: env('AIRTABLE_TABLE_SOLUTIONS_PAGES') || 'SolutionsPages',
      solutionsPrestationsTableName: env('AIRTABLE_TABLE_SOLUTIONS_PRESTATIONS') || 'SolutionsPrestations',
      produitsTableName: env('AIRTABLE_TABLE_PRODUITS') || 'Produits',
    });
  }
  return client;
}
