// Data loaders — fetch and cache data from Airtable

import type { Produit, Projet, SiteConfig, Commande } from './types';
import { getAirtableClient } from './airtable/client';
import { cachedFetch, invalidateCache } from './cache';

// Mock data fallback (when Airtable is not configured)
const mockProduits: Produit[] = [
  {
    id: 'mock-1',
    slug: 'air-force-1',
    nom: 'Air Force 1',
    marque: 'Nike',
    categorie: 'Chaussures',
    prix: 85000,
    prixPromo: null,
    accroche: 'Chaussure de sport intemporelle',
    description:
      'Les légendaires Air Force 1 de Nike avec leur design iconique et leur confort inégalé.',
    couverture: '/images/boutique/air-force-1.jpg',
    images: [],
    tailles: [
      { valeur: '36', disponible: true },
      { valeur: '37', disponible: true },
      { valeur: '38', disponible: false },
    ],
    couleurs: [
      { nom: 'Blanc', hex: '#FFFFFF', disponible: true },
      { nom: 'Noir', hex: '#000000', disponible: true },
    ],
    statut: 'en stock',
    quantiteStock: 15,
    nouveaute: false,
    misEnAvant: true,
  },
];

const mockProjets: Projet[] = [
  {
    id: 'mock-proj-1',
    slug: 'projet-augment',
    titre: 'Redesign Augment',
    client: 'Augment',
    categorie: 'Web Design',
    accroche: 'Transformation numérique complète',
    description: 'Un projet de redesign complet du site Augment.',
    couverture: '/images/portfolio/augment.jpg',
    images: [],
    misEnAvant: true,
  },
];

const mockConfig: SiteConfig = {
  id: 'mock-config',
  nom: 'Micro Office',
  tagline: 'Solutions numériques innovantes',
  description: 'Micro Office fournit des solutions innovantes.',
  email: 'contact@microofficeml.com',
  telephone: '+223XXXXXXXX',
  telephoneAffichage: '+223 XX XX XX XX',
  adresse: 'Bamako',
  ville: 'Mali',
  devises: [
    { code: 'XOF', nom: 'Franc CFA', symbole: 'F', taux: 1 },
    { code: 'EUR', nom: 'Euro', symbole: '€', taux: 655 },
    { code: 'USD', nom: 'Dollar US', symbole: '$', taux: 600 },
  ],
};

/**
 * Load all products from Airtable (with caching)
 * Falls back to mock data if Airtable is not configured
 */
export async function loadAllProduits(): Promise<Produit[]> {
  try {
    const client = getAirtableClient();
    if (!client) {
      console.info('Airtable not configured, using mock data');
      return mockProduits;
    }

    return await cachedFetch('produits:all', async () => {
      return client.getProduits();
    });
  } catch (error) {
    console.warn('Airtable error loading produits, using mock data:', error);
    return mockProduits;
  }
}

/**
 * Load product by slug
 */
export async function loadProduitBySlug(slug: string): Promise<Produit | null> {
  try {
    const client = getAirtableClient();
    if (!client) {
      return mockProduits.find((p) => p.slug === slug) || null;
    }

    return await cachedFetch(`produit:${slug}`, async () => {
      const produit = await client.getProduitBySlug(slug);
      if (!produit) throw new Error(`Produit not found: ${slug}`);
      return produit;
    });
  } catch (error) {
    console.warn(`Airtable error loading produit ${slug}, checking mock data:`, error);
    return mockProduits.find((p) => p.slug === slug) || null;
  }
}

/**
 * Load all projects from Airtable (with caching)
 */
export async function loadAllProjets(): Promise<Projet[]> {
  try {
    const client = getAirtableClient();
    if (!client) {
      return mockProjets;
    }

    return await cachedFetch('projets:all', async () => {
      return client.getProjets();
    });
  } catch (error) {
    console.warn('Airtable error loading projets, using mock data:', error);
    return mockProjets;
  }
}

/**
 * Load project by slug
 */
export async function loadProjetBySlug(slug: string): Promise<Projet | null> {
  try {
    const client = getAirtableClient();
    if (!client) {
      return mockProjets.find((p) => p.slug === slug) || null;
    }

    return await cachedFetch(`projet:${slug}`, async () => {
      const projet = await client.getProjetBySlug(slug);
      if (!projet) throw new Error(`Projet not found: ${slug}`);
      return projet;
    });
  } catch (error) {
    console.warn(`Airtable error loading projet ${slug}, checking mock data:`, error);
    return mockProjets.find((p) => p.slug === slug) || null;
  }
}

/**
 * Load site configuration from Airtable
 */
export async function loadSiteConfig(): Promise<SiteConfig> {
  try {
    const client = getAirtableClient();
    if (!client) {
      return mockConfig;
    }

    return await cachedFetch('config:site', async () => {
      const config = await client.getConfig();
      if (!config) throw new Error('No site config found');
      return config;
    });
  } catch (error) {
    console.warn('Airtable error loading config, using mock data:', error);
    return mockConfig;
  }
}

/**
 * Create a new order in Airtable
 */
export async function createCommande(data: Omit<Commande, 'id' | 'createdAt'>): Promise<Commande> {
  try {
    const client = getAirtableClient();
    const commande = await client.createCommande(data);
    // Invalidate any cached orders
    invalidateCache('commandes:');
    return commande;
  } catch (error) {
    console.error('Error creating order:', error);
    throw error;
  }
}

/**
 * Get order by reference number
 */
export async function loadCommandeByReference(reference: string): Promise<Commande | null> {
  try {
    return await cachedFetch(`commande:${reference}`, async () => {
      const client = getAirtableClient();
      const commande = await client.getCommande(reference);
      if (!commande) throw new Error(`Order not found: ${reference}`);
      return commande;
    });
  } catch (error) {
    console.warn(`Airtable error loading order ${reference}:`, error);
    return null;
  }
}

/**
 * Invalidate cache for products (called by webhooks)
 */
export function invalidateProduitsCache(): void {
  invalidateCache('produit:');
  invalidateCache('produits:');
}

/**
 * Invalidate cache for projects (called by webhooks)
 */
export function invalidateProjetsCache(): void {
  invalidateCache('projet:');
  invalidateCache('projets:');
}

/**
 * Invalidate cache for config (called by webhooks)
 */
export function invalidateConfigCache(): void {
  invalidateCache('config:');
}
