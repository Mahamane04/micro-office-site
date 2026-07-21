// Boutique products — mock data only (Airtable base is portfolio-focused).
// Kept separate from portfolio data. Wire to Airtable later if a shop base is added.

import type { Produit } from './types';

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

export async function loadAllProduits(): Promise<Produit[]> {
  return mockProduits;
}

export async function loadProduitBySlug(slug: string): Promise<Produit | null> {
  return mockProduits.find((p) => p.slug === slug) || null;
}
