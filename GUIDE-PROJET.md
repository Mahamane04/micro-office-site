# Guide du projet — Site Micro Office

> **Ce document est le centre d'information du projet.** Il résume tout ce qui a été construit, où le trouver, ce qui reste à faire, et l'historique des évolutions. Il doit être mis à jour à chaque changement notable (nouvelle page, nouveau contenu, nouvelle décision technique).

Dernière mise à jour : **21 juillet 2026**

### 21 juillet 2026 (soir) — **Couche dynamique** : suivi de commande + stock temps réel + recherche
- **Sans comptes clients** (commande toujours ouverte aux invités). Ajout d'une base **Supabase** + **fonctions serverless Netlify**, le front Eleventy reste statique (SEO intact).
- **Suivi de commande** : chaque commande est enregistrée en base à la validation ; le client la suit sur **`/suivi/`** avec **référence + téléphone** (frise Reçue → Confirmée → Préparation → Expédiée → Livrée).
- **Mini-admin** : **`/admin-commandes/`** (protégé par mot de passe `ADMIN_PASSWORD`) pour lister les commandes et **changer leur statut** (noindex).
- **Stock temps réel** : décrément automatique à la commande ; badges « Rupture » / « Plus que N » et désactivation de l'achat, hydratés depuis Supabase.
- **Recherche** : barre de recherche instantanée (filtre client) sur `/boutique/`.
- **Mode MOCK** : tant que les clés Supabase ne sont pas définies, les fonctions renvoient des données simulées → le site est **testable en local** (`npx netlify dev`) avant de brancher la vraie base.
- **Fichiers clés** : `supabase/schema.sql` (à exécuter dans Supabase), `netlify/functions/*.js`, `netlify.toml`, `.env.example`, `src/suivi/`, `src/admin-commandes/`.
- **Mise en ligne** : créer un projet Supabase + exécuter `schema.sql`, déployer sur Netlify, définir `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SUPABASE_ANON_KEY`, `ADMIN_PASSWORD`. Voir `.env.example`.


### 21 juillet 2026 — Ajout d'une **boutique en ligne** (commande sans paiement intégré)
- **Nouvelles pages** : `/boutique/` (catalogue), `/boutique/{slug}/` (fiche produit, générée par pagination), `/commander/` (tunnel de commande), `/commande-confirmee/` (confirmation).
- **Commande sans paiement en ligne** (adapté au Mali) : le panier se transforme en **message WhatsApp pré-rempli** OU en **commande e-mail** (Formspree). Modes de paiement affichés : **à la livraison**, **Orange Money**, **Moov Money**. Zones de livraison + frais (Bamako, régions, international « sur devis »). Référence de commande générée.
- **Devise automatique par pays** : prix stockés en **FCFA**, détection du pays par **géolocalisation IP** (`get.geojs.io`, sans clé) → conversion vers la devise locale (USD, EUR, GBP, XAF, MAD, CAD), + **sélecteur manuel**. **Taux fixes éditables** dans l'admin. Fallback FCFA si détection impossible.
- **Panier & favoris** : panier persistant (`localStorage`), **tiroir latéral** accessible depuis l'icône du header (badge compteur), gestion des quantités, favoris (cœur sur les cartes).
- **Produits avec variantes** : tailles + couleurs (avec disponibilité par variante) et statut de stock (en stock / rupture / sur commande).
- **Données & CMS** : `src/_data/produits.json` (catalogue) et `src/_data/shop.json` (devises, taux, mapping pays, livraison, paiement), tous deux **éditables via Decap CMS** (collection « Boutique » dans `/admin`). Images de démo en SVG dans `src/images/boutique/` (à remplacer par de vraies photos via l'admin).
- **À COMPLÉTER par le client** (dans `/admin` → Boutique → Paramètres) : numéros **Orange Money / Moov Money**, **frais de livraison** réels, et affinage des **taux de change**.


---

## 1. Vue d'ensemble

Site vitrine professionnel pour **Micro Office**, agence créative et digitale malienne fondée en 2014, orienté génération de devis (formulaire, téléphone, WhatsApp).

- **Stack** : [Eleventy](https://www.11ty.dev/) (générateur de site statique) + [Tailwind CSS](https://tailwindcss.com/)
- **Sortie** : HTML/CSS/JS 100% statique dans `_site/` — hébergeable n'importe où (aucun serveur Node requis en production)
- **Langue** : français
- **Design** : minimaliste, premium, palette rouge/noir/blanc cassé, typographies Sora (titres) + Inter (texte)

---

## 2. Démarrer le projet

```bash
cd site
npm install        # une seule fois
npm run dev         # serveur local avec rechargement automatique (http://localhost:8080)
npm run admin       # comme dev + interface d'administration sur http://localhost:8080/admin/
npm run build        # build de production → dossier _site/
```

**Gérer le portfolio sans coder** : lancer `npm run admin`, ouvrir `http://localhost:8080/admin/`, cliquer sur « Projets (réalisations) ». Vous pouvez ajouter, modifier, réordonner ou supprimer des projets et téléverser des images ; tout est enregistré dans `src/_data/portfolio.json` et pris en compte au prochain build.

Fichier de config du serveur de preview : `.claude/launch.json` (racine du repo, au-dessus de `site/`).

---

## 3. Structure du projet

```
site/
├── src/
│   ├── _data/site.js          # ⭐ Coordonnées, réseaux, nav, logos clients — voir section 6
│   ├── _includes/
│   │   ├── layouts/base.njk   # Squelette HTML commun (head, header, footer, WhatsApp)
│   │   └── partials/          # Composants réutilisables (header, footer, boutons,
│   │                          # image encadrée, motifs géométriques, carrousel logos, CTA)
│   ├── css/tailwind.css       # Styles de base + composants (.btn-primary, .eyebrow, etc.)
│   ├── js/main.js             # Menu mobile + logique du formulaire de contact
│   ├── images/
│   │   ├── brand/             # Logo Micro Office (mark.svg, logo-on-dark.svg)
│   │   ├── portfolio/         # Photos de réalisations réelles (recadrées, optimisées)
│   │   ├── clients/           # 15 logos partenaires (carrousel "Ils nous font confiance")
│   │   └── IL NOUS FONT CONFIANCE/  # Fichiers sources bruts des logos clients (non publiés tels quels)
│   ├── index.njk              # Page d'accueil (9 sections)
│   ├── solutions/              # Hub + 4 sous-pages de service
│   ├── realisations/           # Études de cas
│   ├── a-propos/
│   ├── contact/
│   ├── presenter-mon-projet/   # Formulaire de devis
│   ├── mentions-legales/
│   ├── politique-de-confidentialite/
│   └── sitemap.njk
├── tailwind.config.js         # Palette, typographies, animation du carrousel
└── eleventy.config.js         # Config Eleventy (dossiers, copies de fichiers)
```

---

## 4. Pages livrées (12/12 demandées)

| Page | URL | Contenu |
|---|---|---|
| Accueil | `/` | Intro, histoire, 4 solutions (mise en page éditoriale), section 3D immersive, lancement produit, réalisations, méthode, confiance (logos + témoignages à venir), CTA final |
| Solutions (hub) | `/solutions/` | Vue d'ensemble des 4 pôles |
| Branding, signalétique & 3D | `/solutions/branding-signaletique-3d/` | |
| Création digitale & print | `/solutions/creation-digitale-print/` | |
| Sites, applications & gestion | `/solutions/sites-web-applications-gestion/` | |
| Automatisation & IA | `/solutions/automatisation-ia/` | |
| Réalisations | `/realisations/` | 8 études de cas avec vraies photos (COOFIX & EMS, BAH Automobile, FEBAK, Djina's Collection, NBB Planet, Reaktor, SSE Sonikara) |
| À propos | `/a-propos/` | Histoire + 6 valeurs |
| Contact | `/contact/` | Téléphone, WhatsApp, e-mail, zone d'intervention |
| Présenter mon projet | `/presenter-mon-projet/` | Formulaire complet + upload fichier + confirmation + lien WhatsApp |
| Mentions légales | `/mentions-legales/` | Avec placeholders juridiques à compléter |
| Politique de confidentialité | `/politique-de-confidentialite/` | |

SEO : chaque page a un `title`/`description` ciblé sur les recherches du brief (agence de branding à Bamako, signalétique intérieure/extérieure, visualisation 3D, création de site internet au Mali, chatbot WhatsApp, etc.). Sitemap généré automatiquement (`/sitemap.xml`) + `robots.txt`.

---

## 5. Design system

| Élément | Valeur |
|---|---|
| Rouge principal | `#F01B2D` (bouton, accents) |
| Noir profond | `#050505` |
| Anthracite | `#171717` |
| Blanc cassé | `#F6F6F3` (fond principal) |
| Gris secondaire | `#737373` |
| Titres | Sora (bold/extrabold), échelle poussée (jusqu'à `text-7xl` en hero) |
| Texte courant | Inter |
| Technique / annotations | **Space Mono** — utilisé pour les eyebrows, légendes d'image, libellés de catégorie (classes `.eyebrow` et `.tag-mono`) |
| Motifs | Arc discret (`motif-arc.njk`), diagonales (`motif-diagonal.njk`) inspirés du logo — utilisés en fond, jamais envahissants |
| Texture | Trame pointillée façon papier calque (`.bg-blueprint-light` / `.bg-blueprint-dark`), réservée au hero et à la section "Notre différence" |
| Cadres image | **Signature du site** : réticule technique façon viewport 3D (`partials/framed-image.njk`) — 2 coins visibles au repos, les 2 autres + un repère central + une légende mono apparaissent au survol. Accepte `fLabel` pour une légende optionnelle. |

Répartition des couleurs : ~70 % clair / 20 % sombre / 10 % rouge, conforme au brief.

**Signature visuelle** : le site emprunte le vocabulaire d'un plan technique / logiciel de visualisation 3D (réticules, légendes "Fig. 01", trame pointillée) pour incarner la promesse de Micro Office — *voir le résultat avant de produire*. Direction choisie avec le skill `frontend-design` : la palette et les typographies du brief sont respectées à la lettre, la distinction vient de ce système d'annotation et du cadre-viewport, pas d'une refonte de la charte.

---

## 6. Informations à connaître (coordonnées, données)

Tout est centralisé dans **`src/_data/site.js`** :

- **Téléphone / WhatsApp** : `+223 89 46 00 00` (même numéro pour les deux)
- **E-mail** : `infos@microofficeml.com`
- **Ville** : Bamako, Mali
- **15 logos clients** (carrousel « Ils nous font confiance », défilement automatique droite→gauche) : NBB, BAH Automobile, EMS, SSE, AMADER, BK Gaz, Balim, FEBAK/Thé Andalousi, Gandhi Malien TV, Thé Barika, Oryx Energies, IRA, GB Carrières & BTP, Hollantex, + 1 logo partenaire non identifié par texte
- **Formulaire de devis** : configuré pour Formspree (⚠️ ID à renseigner, voir section 7)

---

## 7. ⚠️ Ce qu'il reste à compléter avant mise en ligne

| # | Action | Où |
|---|---|---|
| 1 | Créer un compte [Formspree](https://formspree.io) relié à `infos@microofficeml.com` et coller l'ID | `src/_data/site.js` → `formspreeEndpoint` |
| 2 | Confirmer si le téléphone fixe diffère du WhatsApp | `src/_data/site.js` → `phoneDisplay` / `phoneHref` |
| 3 | Infos légales réelles (forme juridique, RCCM, NIF, adresse du siège) | `src/_data/site.js` → `legal.*` et `src/mentions-legales/index.njk` |
| 4 | Témoignages clients authentiques (actuellement en placeholder) | `src/index.njk`, section "Confiance" |
| 5 | Choisir un hébergement (Vercel, Netlify, hébergeur Mali...) — décision non encore prise | — |
| 6 | Identifier le nom du logo partenaire non reconnu (`partenaire.png`) ou le retirer | `src/images/clients/partenaire.png` |

---

## 8. Historique des évolutions (changelog)

### 19 juillet 2026 — Construction initiale complète
- Recherche et installation de 6 skills (voir section 9)
- Mise en place du projet Eleventy + Tailwind, design system (couleurs, typo, boutons, motifs géométriques)
- Conversion de 44 photos HEIC → JPEG et curation des vraies réalisations du portfolio (COOFIX & EMS, BAH Automobile, FEBAK, NBB, Reaktor, etc.) — plusieurs erreurs d'association image/projet de l'agent de curation détectées et corrigées manuellement
- Construction des 12 pages du brief avec tous les textes fournis
- Formulaire de devis avec upload de fichiers et confirmation
- Pages légales avec placeholders clairement identifiés
- SEO (metas ciblés, sitemap, schema.org), accessibilité (WCAG), performance, vérification mobile complète

### 19 juillet 2026 — Ajouts post-livraison
- Ajout des 15 vrais logos clients trouvés dans `src/images/IL NOUS FONT CONFIANCE/`, en commençant par NBB
- Configuration du numéro WhatsApp/téléphone réel : `+223 89 46 00 00`
- Transformation de la grille de logos statique en **carrousel animé** (défilement continu droite→gauche, pause au survol, désactivé si `prefers-reduced-motion`)
- Recadrage automatique (Python/Pillow) de 7 logos trop petits dans leur cadre (Hollantex, EMS, BK Gaz, NBB, BAH Automobile, SSE, AMADER) pour une taille visuelle homogène
- Création de `GUIDE-PROJET.md` comme centre d'information unique du projet

### 20 juillet 2026 — Refonte visuelle « style Augment » (palette conservée)
- Direction inspirée du site Augment demandé par le client : thème **sombre dominant**, **coins arrondis** (cartes `rounded-3xl`/`rounded-5xl`), **boutons pilule** (`rounded-full`), grilles bento, sections en gros blocs arrondis. **Seule la palette Micro Office est conservée** (rouge/noir/anthracite/blanc cassé/gris) — pas de vert citron.
- **Header** : barre flottante arrondie sombre, nav en pilules, CTA rouge pilule ; menu mobile en panneau arrondi.
- **Footer** et **bandeau CTA** : gros blocs arrondis (footer sombre, CTA rouge).
- **Page d'accueil entièrement reconstruite** en structure Augment : hero bento sombre + stats, bandeau logos, solutions en 4 cartes sombres, différence 3D en cartes avant/après, section **lancement produit**, **comparaison « approche classique vs méthode Micro Office »** (coche/croix), réalisations en cartes, méthode en 6 blocs, **FAQ en accordéon** (`<details>`, sans JS), CTA final.
- Composants partagés mis à jour (`framed-image` en carte arrondie, `.btn-*` en pilules, `.eyebrow` en pilule, `.card`, marquee configurable clair/sombre) → **toutes les pages internes héritent automatiquement** du nouveau look ; champs du formulaire arrondis.
- Typographies Sora/Inter/Space Mono conservées (elles collent déjà à l'esthétique) ; seule la forme/le thème changent.

### 19 juillet 2026 — Portfolio dynamique + admin CMS + services en cartes
- **Base de données portfolio** : tous les projets sont désormais dans `src/_data/portfolio.json` (titre, slug, client, catégorie, accroche, description, images, mis en avant). Une seule source alimente la page Réalisations, les pages détail et l'accueil.
- **Page Réalisations refaite** : grille de cartes de présentation avec **filtres par catégorie** et **tri** (par défaut / A→Z / par client), générée depuis le JSON. Chaque projet a maintenant sa **page détail dédiée** (`/realisations/slug-du-projet/`) créée automatiquement au build.
- **Section services de l'accueil réorganisée** en rangée de 4 cartes sombres (inspiration Augment, palette Micro Office conservée) : image, numéro, titre, 3 prestations clés, CTA.
- **Admin Decap CMS à `/admin/`** : ajouter/modifier/supprimer des projets et téléverser des images **sans toucher au code**. En local : `npm run admin` puis ouvrir `http://localhost:8080/admin/`. Au déploiement, remplacer `local_backend` par un backend Git dans `src/admin/config.yml` (instructions dans le fichier).

### 19 juillet 2026 — Refonte de la direction visuelle (skill `frontend-design`)
- Ajout d'une typographie technique **Space Mono** pour tous les eyebrows, légendes et libellés de catégorie (`.eyebrow`, `.tag-mono`)
- Nouveau cadre-image "viewport" : réticule qui se complète au survol (4 coins + repère central + légende), signature visuelle du site inspirée de la promesse "voir le résultat avant de produire"
- Hero remanié : titre agrandi (`text-7xl`), paire d'images "Fig. 01 — Rendu 3D → Fig. 02 — Réalisé" avec flèche de transformation, trame pointillée discrète, ligne de signature "Imaginons · Visualisons · Réalisons"
- Section "Notre différence" : trame pointillée sur fond noir, légendes de comparaison en mono
- Les 3 images de la section Solutions sont désormais cliquables vers leur page dédiée, avec légende "Découvrir →" au survol
- **Bug corrigé** : la grille CSS des deux images du hero se répartissait de façon inégale sur mobile (`grid-cols-[1fr_auto_1fr]` provoquait un "blowout" de grille) — remplacée par une disposition flexbox robuste (`flex-1 basis-0 min-w-0`)
- Palette et typographies Sora/Inter du brief conservées à l'identique ; seule la couche d'annotation/interaction a été ajoutée

---

## 9. Skills installés pour ce projet

| Skill | Source | Usage |
|---|---|---|
| `nextjs-app-router-patterns` | wshobson/agents | Référence si migration future vers Next.js |
| `tailwind-design-system` | wshobson/agents | Structuration des tokens et composants Tailwind |
| `landing-page-design` | 101-skills/skills | Règles de conversion (hero, CTA, structure éditoriale) |
| `seo` | addyosmani/web-quality-skills | Metas, sitemap, données structurées |
| `accessibility` | addyosmani/web-quality-skills | WCAG (alt, labels, contrastes, prefers-reduced-motion) |
| `performance` | addyosmani/web-quality-skills | Lazy loading, sortie statique légère |

Installés globalement dans `~/.agents/skills/` — disponibles pour d'autres projets.

---

## 10. Comment mettre à jour ce guide

À chaque évolution notable du site, ajouter une nouvelle entrée en haut de la **section 8 (Historique)** avec la date du jour, et mettre à jour les sections concernées (4, 6, 7) si des pages, coordonnées ou tâches en attente changent. Garder ce fichier à la racine de `site/` pour qu'il reste le point d'entrée unique du projet.
