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
  formspreeEndpoint: 'https://formspree.io/f/VOTRE_ID_FORMSPREE',
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
  trustedClients: [
    { name: 'NBB', file: 'nbb.png' },
    { name: 'BAH Automobile', file: 'bah-automobile.png' },
    { name: 'COOFIX & EMS', file: 'ems.png' },
    { name: 'SSE — Sonikara Solar Electro', file: 'sse.png' },
    { name: 'AMADER', file: 'amader.png' },
    { name: 'BK Gaz', file: 'bk-gaz.png' },
    { name: 'Balim', file: 'balim.png' },
    { name: 'FEBAK — Thé Andalousi', file: 'the-andalousi-febak.png' },
    { name: 'Gandhi Malien TV', file: 'gandhi-malien-tv.png' },
    { name: 'Thé Barika', file: 'the-barika.png' },
    { name: 'Oryx Energies', file: 'oryx-energies.png' },
    { name: 'IRA', file: 'ira.png' },
    { name: 'GB Carrières & BTP', file: 'gb-carrieres-btp.png' },
    { name: 'Hollantex', file: 'hollantex.png' },
    { name: 'Partenaire Micro Office', file: 'partenaire.png' },
  ],
} as const;

export type SiteConfig = typeof site;
