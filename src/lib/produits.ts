// Boutique products — Airtable "Produits" table with mock fallback,
// same safety pattern as every other Airtable-backed loader.

import type { Produit } from './types';
import { getAirtableClient } from './airtable/client';
import { cachedFetch, invalidateCache } from './cache';

// Mock fallback: renders if Airtable is unreachable or not configured.
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
    description: 'Les légendaires Air Force 1 de Nike avec leur design iconique.',
    couverture: '/images/boutique/air-force-1.jpg',
    images: [],
    tailles: [
      { valeur: '40', disponible: true },
      { valeur: '41', disponible: true },
      { valeur: '42', disponible: false },
    ],
    couleurs: [{ nom: 'Blanc', hex: '#FFFFFF', disponible: true }],
    statut: 'en stock',
    quantiteStock: 15,
    nouveaute: false,
    misEnAvant: true,
  },
];

/** Load all active boutique products (cached, mock fallback). */
export async function loadAllProduits(): Promise<Produit[]> {
  try {
    const client = getAirtableClient();
    if (!client) {
      console.info('Airtable not configured, using mock produits');
      return mockProduits;
    }
    return await cachedFetch('produits:all', () => client.getProduits(), 300);
  } catch (error) {
    console.warn('Airtable error loading produits, using mock data:', error);
    return mockProduits;
  }
}

/** Load one product by slug (cached via loadAllProduits, mock fallback). */
export async function loadProduitBySlug(slug: string): Promise<Produit | null> {
  const produits = await loadAllProduits();
  return produits.find((p) => p.slug === slug) || null;
}

export function invalidateProduitsBoutiqueCache(): void {
  invalidateCache('produits:');
}
