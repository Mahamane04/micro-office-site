// TypeScript interfaces for data models

export interface Produit {
  id: string;
  slug: string;
  nom: string;
  marque: string;
  categorie: 'Chaussures' | 'Vêtements' | 'Accessoires' | string;
  prix: number;
  prixPromo?: number | null;
  accroche: string;
  description: string;
  couverture: string; // Cloudinary URL or local image path
  images: Array<{
    src: string;
    alt: string;
  }>;
  tailles?: Array<{
    valeur: string;
    disponible: boolean;
  }>;
  couleurs?: Array<{
    nom: string;
    hex: string;
    disponible: boolean;
  }>;
  statut: 'en stock' | 'sur commande' | 'rupture';
  quantiteStock?: number;
  nouveaute: boolean;
  misEnAvant: boolean;
  createdAt?: string;
}

export interface Projet {
  id: string;
  slug: string;
  titre: string;
  client: string;
  categorie: string;
  accroche: string;
  description: string;
  couverture: string;
  images?: Array<{
    src: string;
    alt: string;
  }>;
  misEnAvant: boolean;
  createdAt?: string;
}

export interface SiteConfig {
  id: string;
  nom: string;
  tagline: string;
  description: string;
  email: string;
  telephone: string;
  telephoneAffichage: string;
  adresse: string;
  ville: string;
  devises?: Array<{
    code: string;
    nom: string;
    symbole: string;
    taux: number;
  }>;
  navigation?: Array<{
    label: string;
    url: string;
  }>;
}

export interface Commande {
  id: string;
  reference: string;
  createdAt: string;
  clientNom: string;
  clientTel: string;
  clientEmail: string;
  adresse: string;
  articlesJson: string; // JSON stringified
  sousTotal: number;
  fraisLivraison: number;
  total: number;
  livraisonZone: string;
  paiementMode: 'a_la_livraison' | 'orange_money' | 'moov_money';
  statut: 'reçue' | 'confirmée' | 'preparation' | 'expédiée' | 'livrée';
  canal?: 'whatsapp' | 'formulaire';
  note?: string;
}

export interface AirtableRecord<T> {
  id: string;
  fields: T;
  createdTime: string;
}

export interface AirtableResponse<T> {
  records: AirtableRecord<T>[];
  offset?: string;
}
