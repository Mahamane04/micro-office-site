// Data loaders — fetch and cache portfolio data from Airtable

import type { Projet, ProjetImage, AccueilItem, SolutionPage, Prestation } from './types';
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

// ---- Homepage dynamic content (Accueil table) ------------------------------

export interface AccueilContent {
  hero: { titre: string; image: string; badge: string; sousTitre: string }[];
  clients: { name: string; url: string }[];
  solutions: Record<string, { image: string; titre: string }>; // cle → { image, titre }
  diffs: { cle: string; titre: string; a: string; b: string }[];
  lancement: { image: string; image2: string } | null;
  temoignages: { titre: string; image: string }[];
}

function groupAccueil(items: AccueilItem[]): AccueilContent {
  const active = items.filter((i) => i.actif !== false);
  return {
    hero: active
      .filter((i) => i.zone === 'Hero' && i.image)
      .map((i) => ({ titre: i.titre, image: i.image, badge: i.badge, sousTitre: i.sousTitre })),
    clients: active.filter((i) => i.zone === 'Clients' && i.image).map((i) => ({ name: i.titre, url: i.image })),
    solutions: Object.fromEntries(
      active.filter((i) => i.zone === 'Solutions').map((i) => [i.cle, { image: i.image, titre: i.titre }])
    ),
    diffs: active.filter((i) => i.zone === 'Différence' && i.image).map((i) => ({ cle: i.cle, titre: i.titre, a: i.image, b: i.image2 })),
    lancement: (() => {
      const l = active.find((i) => i.zone === 'Lancement' && i.image);
      return l ? { image: l.image, image2: l.image2 } : null;
    })(),
    temoignages: active.filter((i) => i.zone === 'Témoignages' && i.image).map((i) => ({ titre: i.titre, image: i.image })),
  };
}

const emptyAccueil: AccueilContent = { hero: [], clients: [], solutions: {}, diffs: [], lancement: null, temoignages: [] };

/** Load homepage dynamic content from Airtable. Returns empty (site uses local fallbacks) if unavailable. */
export async function loadAccueil(): Promise<AccueilContent> {
  try {
    const client = getAirtableClient();
    if (!client) return emptyAccueil;
    return await cachedFetch('accueil:all', async () => groupAccueil(await client.getAccueil()), 300);
  } catch (error) {
    console.warn('Airtable error loading accueil, using local fallbacks:', error);
    return emptyAccueil;
  }
}

// ---- Cache invalidation (called by webhooks) -------------------------------
export function invalidateProjetsCache(): void {
  invalidateCache('projet:');
  invalidateCache('projets:');
  invalidateCache('images:');
}

export function invalidateAccueilCache(): void {
  invalidateCache('accueil:');
}

// ---- Solutions detail pages (SolutionsPages + SolutionsPrestations) --------

// Mock fallback mirrors the content originally hardcoded in each page,
// so the site renders identically if Airtable is ever unreachable.
const mockSolutionPages: Record<string, SolutionPage> = {
  'branding-signaletique-3d': {
    cle: 'branding-signaletique-3d',
    titreH1: 'Branding, signalétique & visualisation 3D',
    intro: "Construisez une identité forte et visualisez son intégration dans vos espaces avant la fabrication ou l'installation.",
    texteBouton: 'Visualiser mon projet',
    ctaTitre: 'Prêt à donner forme à votre identité ?',
    ctaTexte: 'Décrivez votre projet de branding, de signalétique ou de visualisation 3D : nous revenons vers vous avec une proposition claire.',
    ordre: 1,
  },
  'creation-digitale-print': {
    cle: 'creation-digitale-print',
    titreH1: 'Création digitale & print',
    intro: "Communiquez avec des supports professionnels et cohérents, du téléphone de votre client jusqu'à vos supports imprimés.",
    texteBouton: 'Créer mes supports',
    ctaTitre: 'Besoin de supports cohérents et professionnels ?',
    ctaTexte: 'Décrivez votre besoin de communication digitale ou imprimée : nous vous proposons les supports adaptés à votre activité.',
    ordre: 2,
  },
  'sites-web-applications-gestion': {
    cle: 'sites-web-applications-gestion',
    titreH1: 'Sites web, applications & solutions de gestion',
    intro: "Présentez votre entreprise, facilitez l'accès à vos services et centralisez les informations importantes de votre activité.",
    texteBouton: 'Créer ma solution digitale',
    ctaTitre: 'Un site, une application ou un outil de gestion en tête ?',
    ctaTexte: 'Décrivez votre activité et vos besoins : nous vous proposons la solution digitale la plus adaptée.',
    ordre: 3,
  },
  'automatisation-ia': {
    cle: 'automatisation-ia',
    titreH1: 'Automatisation & intelligence artificielle',
    intro: 'Réduisez les tâches répétitives et répondez plus rapidement à vos clients.',
    texteBouton: 'Automatiser mon activité',
    ctaTitre: 'Envie de gagner du temps au quotidien ?',
    ctaTexte: 'Décrivez vos échanges clients les plus répétitifs : nous identifions ce qui peut être automatisé en priorité.',
    ordre: 4,
  },
};

const mockPrestations: Record<string, Prestation[]> = {
  'branding-signaletique-3d': [
    { clePage: 'branding-signaletique-3d', titre: 'Création de logo', description: 'Une marque simple, mémorable et déclinable sur tous vos supports.', ordre: 1 },
    { clePage: 'branding-signaletique-3d', titre: 'Identité visuelle', description: "Couleurs, typographies, règles d'usage pour une image cohérente.", ordre: 2 },
    { clePage: 'branding-signaletique-3d', titre: 'Enseignes', description: 'Enseignes lumineuses ou non, pensées pour votre façade.', ordre: 3 },
    { clePage: 'branding-signaletique-3d', titre: 'Habillage de façades', description: 'Une devanture qui affirme votre marque dans la rue.', ordre: 4 },
    { clePage: 'branding-signaletique-3d', titre: 'Branding de bureaux & boutiques', description: 'Une identité déclinée dans vos espaces intérieurs.', ordre: 5 },
    { clePage: 'branding-signaletique-3d', titre: 'Stands', description: "Des stands d'exposition qui représentent votre marque sur le terrain.", ordre: 6 },
    { clePage: 'branding-signaletique-3d', titre: 'Visualisation 3D intérieure et extérieure', description: 'Un rendu réaliste de votre projet avant toute fabrication.', ordre: 7 },
  ],
  'creation-digitale-print': [
    { clePage: 'creation-digitale-print', titre: 'Affiches', description: 'Des visuels percutants pour vos campagnes et événements.', ordre: 1 },
    { clePage: 'creation-digitale-print', titre: 'Réseaux sociaux', description: 'Un contenu cohérent avec votre identité, prêt à publier.', ordre: 2 },
    { clePage: 'creation-digitale-print', titre: 'Vidéos courtes', description: 'Des formats courts adaptés aux usages mobiles.', ordre: 3 },
    { clePage: 'creation-digitale-print', titre: 'Catalogues', description: 'Une présentation claire de vos produits ou services.', ordre: 4 },
    { clePage: 'creation-digitale-print', titre: 'Cartes de visite', description: 'Une première impression professionnelle et soignée.', ordre: 5 },
    { clePage: 'creation-digitale-print', titre: 'Flyers', description: 'Des supports imprimés efficaces pour votre communication terrain.', ordre: 6 },
    { clePage: 'creation-digitale-print', titre: 'Packaging', description: 'Un emballage qui valorise votre produit sur le point de vente.', ordre: 7 },
    { clePage: 'creation-digitale-print', titre: 'Objets personnalisés', description: 'Des supports à votre image pour vos équipes et événements.', ordre: 8 },
  ],
  'sites-web-applications-gestion': [
    { clePage: 'sites-web-applications-gestion', titre: 'Sites de présentation', description: 'Un site clair pour présenter votre activité et générer des contacts.', ordre: 1 },
    { clePage: 'sites-web-applications-gestion', titre: 'Sites e-commerce', description: 'Une boutique en ligne pour vendre vos produits.', ordre: 2 },
    { clePage: 'sites-web-applications-gestion', titre: 'Applications', description: 'Une application mobile adaptée à vos usages métier.', ordre: 3 },
    { clePage: 'sites-web-applications-gestion', titre: 'Portails clients', description: 'Un espace dédié pour vos clients ou partenaires.', ordre: 4 },
    { clePage: 'sites-web-applications-gestion', titre: 'Gestion des clients', description: 'Un suivi centralisé de votre relation client.', ordre: 5 },
    { clePage: 'sites-web-applications-gestion', titre: 'Commandes', description: 'Un processus de commande simple et fiable.', ordre: 6 },
    { clePage: 'sites-web-applications-gestion', titre: 'Paiements', description: 'Des solutions de paiement adaptées à votre marché.', ordre: 7 },
    { clePage: 'sites-web-applications-gestion', titre: 'Stocks', description: 'Un suivi précis de vos stocks et de vos produits.', ordre: 8 },
    { clePage: 'sites-web-applications-gestion', titre: 'Tableaux de bord', description: 'Une vision claire de votre activité, en temps réel.', ordre: 9 },
  ],
  'automatisation-ia': [
    { clePage: 'automatisation-ia', titre: 'Chatbot WhatsApp', description: 'Un premier contact automatisé, disponible à tout moment.', ordre: 1 },
    { clePage: 'automatisation-ia', titre: 'Assistant commercial', description: 'Un accompagnement automatisé de vos prospects.', ordre: 2 },
    { clePage: 'automatisation-ia', titre: 'Qualification des prospects', description: 'Identifiez rapidement les demandes prioritaires.', ordre: 3 },
    { clePage: 'automatisation-ia', titre: 'Préparation des devis', description: 'Des devis préparés plus rapidement à partir des demandes reçues.', ordre: 4 },
    { clePage: 'automatisation-ia', titre: 'Relances automatiques', description: 'Ne perdez plus une opportunité faute de suivi.', ordre: 5 },
    { clePage: 'automatisation-ia', titre: 'Notifications', description: 'Restez informé des étapes clés de chaque demande.', ordre: 6 },
    { clePage: 'automatisation-ia', titre: 'Suivi des demandes', description: "Une vue claire sur l'ensemble de vos échanges clients.", ordre: 7 },
  ],
};

/** Load a Solutions detail page's hero/CTA copy + its service items (cached, mock fallback). */
export async function loadSolutionPage(slug: string): Promise<{ page: SolutionPage | null; prestations: Prestation[] }> {
  try {
    const client = getAirtableClient();
    if (!client) {
      return { page: mockSolutionPages[slug] || null, prestations: mockPrestations[slug] || [] };
    }
    return await cachedFetch(`solution-page:${slug}`, async () => {
      const [page, prestations] = await Promise.all([client.getSolutionPage(slug), client.getPrestations(slug)]);
      return { page, prestations };
    }, 300);
  } catch (error) {
    console.warn(`Airtable error loading solution page ${slug}, using mock data:`, error);
    return { page: mockSolutionPages[slug] || null, prestations: mockPrestations[slug] || [] };
  }
}

export function invalidateSolutionsCache(): void {
  invalidateCache('solution-page:');
}

export function invalidateProduitsCache(): void {
  invalidateCache('produit:');
  invalidateCache('produits:');
}

export function invalidateConfigCache(): void {
  invalidateCache('config:');
}
