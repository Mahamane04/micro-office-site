// Site configuration (port of _data/site.js)

export const site = {
  name: 'Micro Office',
  baseUrl: 'https://www.microofficeml.com',
  tagline: 'Imaginons. Visualisons. Réalisons.',
  since: 2014,
  email: 'infos@microofficeml.com',
  phoneDisplay: '+223 89 46 00 00',
  phoneHref: 'tel:+22389460000',
  whatsappNumber: '22389460000',
  addressLine: 'Bamako, Mali',
  nav: [
    { label: 'Accueil', url: '/' },
    { label: 'Solutions', url: '/solutions/' },
    { label: 'Réalisations', url: '/realisations/' },
    { label: 'Boutique', url: '/boutique/' },
    { label: 'À propos', url: '/a-propos/' },
    { label: 'Contact', url: '/contact/' },
  ],
  solutions: [
    { label: 'Branding & signalétique', url: '/solutions/branding-signaletique-3d/' },
    { label: 'Création digitale & print', url: '/solutions/creation-digitale-print/' },
    { label: 'Sites, applications & gestion', url: '/solutions/sites-web-applications-gestion/' },
    { label: 'Automatisation & IA', url: '/solutions/automatisation-ia/' },
  ],
} as const;

export type SiteConfig = typeof site;
