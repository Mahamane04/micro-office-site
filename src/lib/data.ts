// Data loaders — fetch and cache portfolio data from Airtable

import type { Projet, ProjetImage } from './types';
import { getAirtableClient } from './airtable/client';
import { cachedFetch, invalidateCache } from './cache';

// ---- Mock data (used when Airtable is not configured) ----------------------
// Mirrors the real Airtable schema so templates render identically offline.
const mockProjets: Projet[] = [
  {
    id: 'mock-1',
    titre: 'COOFIX & EMS — Espace intérieur',
    slug: 'coofix-ems-interieur',
    categories: ['Signalétique intérieure', '3D - Avant et apres'],
    familles: ['Signalétique & Aménagement', '3D & Visualisation'],
    couverture: '/images/portfolio/hero-final.jpg',
    nombreImages: 2,
    misEnAvant: true,
    client: 'COOFIX & EMS',
    accroche: "L'aménagement intérieur visualisé en 3D avant réalisation.",
    description:
      "L'aménagement intérieur a été entièrement visualisé en 3D avant sa réalisation, pour valider les proportions, les matières et l'éclairage.",
  },
  {
    id: 'mock-2',
    titre: 'BAH Automobile',
    slug: 'bah-automobile',
    categories: ['Signalétique extérieure'],
    familles: ['Signalétique & Aménagement'],
    couverture: '/images/portfolio/realisation-signaletique-exterieure.jpg',
    nombreImages: 1,
    misEnAvant: true,
    client: 'BAH Automobile',
    accroche: 'Une façade complète pensée comme une vitrine de marque.',
    description:
      'Une façade complète pensée comme une vitrine de marque : enseigne principale, totem publicitaire, habillage des vitrines et PLV partenaires.',
  },
  {
    id: 'mock-3',
    titre: 'FEBAK — Thé Andalousi',
    slug: 'febak-the-andalousi',
    categories: ['Packaging & visualisation 3D', '3D - Stand'],
    familles: ['Packaging', 'Stand & Événementiel'],
    couverture: '/images/portfolio/diff-3b.jpg',
    nombreImages: 2,
    misEnAvant: true,
    client: 'FEBAK',
    accroche: "Du rendu 3D du stand jusqu'à sa fabrication et son installation.",
    description:
      "Le stand Thé Andalousi a d'abord été modélisé en 3D pour validation, puis fabriqué et installé en foire.",
  },
  {
    id: 'mock-4',
    titre: "Djina's Collection",
    slug: 'djinas-collection',
    categories: ['Branding'],
    familles: ['Branding & Identité'],
    couverture: '/images/portfolio/solution-branding.jpg',
    nombreImages: 1,
    misEnAvant: false,
    client: "Djina's Collection",
    accroche: 'Une identité de marque affirmée, du logo à son application.',
    description:
      'Une identité de marque affirmée, appliquée en lettres dorées en relief dans l\'espace de vente.',
  },
];

const mockImages: Record<string, ProjetImage[]> = {
  'coofix-ems-interieur': [
    { id: 'i1', nom: 'hero-3d.jpg', projet: 'COOFIX & EMS — Espace intérieur', categorie: '3D', url: '/images/portfolio/hero-3d.jpg' },
    { id: 'i2', nom: 'hero-final.jpg', projet: 'COOFIX & EMS — Espace intérieur', categorie: 'Réalisation', url: '/images/portfolio/hero-final.jpg' },
  ],
  'bah-automobile': [
    { id: 'i3', nom: 'facade.jpg', projet: 'BAH Automobile', categorie: 'Signalétique', url: '/images/portfolio/realisation-signaletique-exterieure.jpg' },
  ],
  'febak-the-andalousi': [
    { id: 'i4', nom: 'diff-3a.jpg', projet: 'FEBAK — Thé Andalousi', categorie: '3D', url: '/images/portfolio/diff-3a.jpg' },
    { id: 'i5', nom: 'diff-3b.jpg', projet: 'FEBAK — Thé Andalousi', categorie: 'Réalisation', url: '/images/portfolio/diff-3b.jpg' },
  ],
  'djinas-collection': [
    { id: 'i6', nom: 'branding.jpg', projet: "Djina's Collection", categorie: 'Branding', url: '/images/portfolio/solution-branding.jpg' },
  ],
};

// ---- Loaders ---------------------------------------------------------------

/** Load all portfolio projects (cached, mock fallback). */
export async function loadAllProjets(): Promise<Projet[]> {
  try {
    const client = getAirtableClient();
    if (!client) {
      console.info('Airtable not configured, using mock projets');
      return mockProjets;
    }
    return await cachedFetch('projets:all', () => client.getProjets(), 300);
  } catch (error) {
    console.warn('Airtable error loading projets, using mock data:', error);
    return mockProjets;
  }
}

/** Load a project by slug (cached, mock fallback). */
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
    }, 300);
  } catch (error) {
    console.warn(`Airtable error loading projet ${slug}, checking mock data:`, error);
    return mockProjets.find((p) => p.slug === slug) || null;
  }
}

/** Load gallery images for a project (cached, mock fallback). */
export async function loadImagesForProjet(projet: Projet): Promise<ProjetImage[]> {
  try {
    const client = getAirtableClient();
    if (!client) {
      return mockImages[projet.slug] || [];
    }
    return await cachedFetch(`images:${projet.slug}`, () => client.getImagesForProjet(projet.titre), 300);
  } catch (error) {
    console.warn(`Airtable error loading images for ${projet.slug}:`, error);
    return mockImages[projet.slug] || [];
  }
}

// ---- Cache invalidation (called by webhooks) -------------------------------
export function invalidateProjetsCache(): void {
  invalidateCache('projet:');
  invalidateCache('projets:');
  invalidateCache('images:');
}

export function invalidateProduitsCache(): void {
  invalidateCache('produit:');
  invalidateCache('produits:');
}

export function invalidateConfigCache(): void {
  invalidateCache('config:');
}
