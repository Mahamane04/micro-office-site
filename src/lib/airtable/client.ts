// Airtable API client for Micro Office CMS

import type {
  Produit,
  Projet,
  SiteConfig,
  Commande,
  AirtableRecord,
  AirtableResponse,
} from '../types';

const AIRTABLE_API_URL = 'https://api.airtable.com/v0';

interface AirtableClientConfig {
  token: string;
  baseId: string;
  produitTableName?: string;
  portfolioTableName?: string;
  configTableName?: string;
  commandeTableName?: string;
}

export class AirtableClient {
  private token: string;
  private baseId: string;
  private produitTableName: string;
  private portfolioTableName: string;
  private configTableName: string;
  private commandeTableName: string;

  constructor(config: AirtableClientConfig) {
    this.token = config.token;
    this.baseId = config.baseId;
    this.produitTableName = config.produitTableName || 'Produits';
    this.portfolioTableName = config.portfolioTableName || 'Projets';
    this.configTableName = config.configTableName || 'Configuration';
    this.commandeTableName = config.commandeTableName || 'Commandes';
  }

  private async request<T>(
    tableName: string,
    options?: {
      view?: string;
      maxRecords?: number;
      filterByFormula?: string;
      sortBy?: { field: string; direction: 'asc' | 'desc' }[];
    }
  ): Promise<AirtableResponse<T>> {
    const params = new URLSearchParams();

    if (options?.view) params.append('view', options.view);
    if (options?.maxRecords) params.append('maxRecords', String(options.maxRecords));
    if (options?.filterByFormula) params.append('filterByFormula', options.filterByFormula);
    if (options?.sortBy) {
      options.sortBy.forEach((sort, idx) => {
        params.append(`sort[${idx}][field]`, sort.field);
        params.append(`sort[${idx}][direction]`, sort.direction);
      });
    }

    const url = `${AIRTABLE_API_URL}/${this.baseId}/${tableName}?${params.toString()}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Airtable API error: ${error.error.message}`);
    }

    return response.json();
  }

  async getProduits(options?: {
    view?: string;
    maxRecords?: number;
    filterByFormula?: string;
  }): Promise<Produit[]> {
    const response = await this.request<Produit>(this.produitTableName, options);
    return response.records.map((record) => ({
      id: record.id,
      ...record.fields,
    }));
  }

  async getProduitBySlug(slug: string): Promise<Produit | null> {
    const response = await this.request<Produit>(this.produitTableName, {
      filterByFormula: `{slug} = "${slug}"`,
      maxRecords: 1,
    });

    if (response.records.length === 0) return null;

    const record = response.records[0];
    return {
      id: record.id,
      ...record.fields,
    };
  }

  async getProjets(options?: {
    view?: string;
    maxRecords?: number;
  }): Promise<Projet[]> {
    const response = await this.request<Projet>(this.portfolioTableName, options);
    return response.records.map((record) => ({
      id: record.id,
      ...record.fields,
    }));
  }

  async getProjetBySlug(slug: string): Promise<Projet | null> {
    const response = await this.request<Projet>(this.portfolioTableName, {
      filterByFormula: `{slug} = "${slug}"`,
      maxRecords: 1,
    });

    if (response.records.length === 0) return null;

    const record = response.records[0];
    return {
      id: record.id,
      ...record.fields,
    };
  }

  async getConfig(): Promise<SiteConfig | null> {
    const response = await this.request<SiteConfig>(this.configTableName, {
      maxRecords: 1,
    });

    if (response.records.length === 0) return null;

    const record = response.records[0];
    return {
      id: record.id,
      ...record.fields,
    };
  }

  async createCommande(data: Omit<Commande, 'id' | 'createdAt'>): Promise<Commande> {
    const url = `${AIRTABLE_API_URL}/${this.baseId}/${this.commandeTableName}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fields: data,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Airtable API error: ${error.error.message}`);
    }

    const record = await response.json();
    return {
      id: record.id,
      createdAt: record.createdTime,
      ...record.fields,
    };
  }

  async getCommande(reference: string): Promise<Commande | null> {
    const response = await this.request<Commande>(this.commandeTableName, {
      filterByFormula: `{reference} = "${reference}"`,
      maxRecords: 1,
    });

    if (response.records.length === 0) return null;

    const record = response.records[0];
    return {
      id: record.id,
      createdAt: record.createdTime,
      ...record.fields,
    };
  }
}

// Singleton instance (initialized on first use)
let client: AirtableClient | null = null;

export function getAirtableClient(): AirtableClient | null {
  if (!client) {
    const token = import.meta.env.AIRTABLE_API_TOKEN;
    const baseId = import.meta.env.AIRTABLE_BASE_ID;

    // Return null if credentials are missing (will use fallback)
    if (!token || !baseId) {
      return null;
    }

    client = new AirtableClient({
      token,
      baseId,
      produitTableName: import.meta.env.AIRTABLE_TABLE_PRODUITS || 'Produits',
      portfolioTableName: import.meta.env.AIRTABLE_TABLE_PORTFOLIO || 'Projets',
      configTableName: import.meta.env.AIRTABLE_TABLE_CONFIG || 'Configuration',
    });
  }

  return client;
}
