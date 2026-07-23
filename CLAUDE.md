# Micro Office — Fiche de référence du projet

> **But de ce fichier** : source de vérité pour ne pas casser de fonctionnalité existante
> et ne pas re-poser les mêmes questions. À lire avant toute modification. À mettre à jour
> quand une nouvelle zone est connectée ou qu'une convention change.

## Stack
- **Astro 4** (mode `hybrid` : SSG + ISR), adaptateur `@astrojs/netlify`
- **Airtable** = CMS (base `appEXrTyylWFmW3U7`, nom "Portfolio")
- **Cloudinary** = hébergement/optimisation images (cloud `yvskaorq`)
- **Netlify** = hébergement + fonctions serverless
- **Formspree** = notification email des demandes (form ID `maqrdezn`)
- Tailwind v4, tokens design façon Augment (rounded, pill, dark). Dev : `npm run dev` (port 8080).
- Ancien site Eleventy (`src/*.njk`, `src/solutions/`, etc.) = **source de référence historique uniquement**, PAS servi. Ne pas éditer pour la prod.

## ⚠️ Comportement du CACHE (cause n°1 des « mes modifs Airtable n'apparaissent pas »)
Les données Airtable sont mises en cache **5 minutes** en mémoire (`cachedFetch(..., 300)` dans `src/lib/data.ts`).
- **En dev** : après une modif dans Airtable, soit attendre 5 min, soit **redémarrer le serveur** (`preview_stop` + `preview_start`, ou relancer `npm run dev`). Un simple reload de page NE suffit PAS.
- **En prod (Netlify)** : l'ISR revalide toutes les 5 min automatiquement, ou instantanément via le webhook `netlify/functions/revalidate.ts`.
- Ce n'est **pas un bug** — ne jamais « corriger » en supprimant le cache sans raison.

## Tables Airtable et où elles alimentent le site

| Table | Rôle | Consommée par |
|-------|------|---------------|
| `Projets` | Portfolio (28 projets) : Nom, Slug, Catégories, **Famille** (7 groupes propres), URL Couverture, Nombre d'images, Mis en avant, Description*, Client*, Accroche* | `/realisations/`, `/realisations/[slug]/`, grille "featured" de l'accueil |
| `Images` | Galerie (324 images) liée aux projets par nom | `/realisations/[slug]/` |
| `Accueil` | Éléments éditoriaux de l'accueil, groupés par champ **Zone** (voir ci-dessous) | Accueil + pages Solutions |
| `SolutionsPages` | Contenu des 4 pages détail Solutions (Titre H1, Intro, Texte bouton, CTA titre/texte), clé = `Cle` (slug) | `/solutions/*/` |
| `SolutionsPrestations` | Liste des prestations par page, liée par `Cle Page` | `/solutions/*/` |
| `Demandes` | Demandes reçues via le formulaire projet (écrites par la fonction serverless) | — (consultation dans Airtable) |
| `Produits` | Catalogue boutique (seed : 1 produit exemple « à remplacer ») — seuls les produits cochés `Actif` s'affichent | `/boutique/`, `/boutique/[slug]/` |
| `CommandesBoutique` | Commandes boutique (écrites par `submit-commande.ts`) — **pas de paiement en ligne**, contact WhatsApp pour confirmer | — (consultation dans Airtable) |

\* champs optionnels — s'affichent seulement si remplis.

### Table `Accueil` — valeurs du champ `Zone`
| Zone | Ce que ça pilote | Champs utilisés |
|------|------------------|-----------------|
| `Hero` | 4 cartes du hero (galerie expansible) | Titre (=nom), Badge (=pastille, repli "Réalisation"), Sous-titre (=ligne rôle, optionnel), Image, Ordre |
| `Clients` | Logos "Ils nous font confiance" (marquee) | Titre (=nom), Image, Ordre |
| `Solutions` | Image + titre des 4 cartes Solutions | `Cle` = `solution-branding` / `solution-digital` / `solution-web` / `solution-automatisation` ; Titre ; Image |
| `Différence` | Paires avant/après ("Voyez le résultat…") | `Cle` = `diff-1/2/3` ; Titre (=label) ; Image (=avant) ; Image 2 (=après) |
| `Lancement` | Visuels "Lancement produit" | Image (=rendu), Image 2 (=vignette) |
| `Témoignages` | Capture d'écran témoignages (optionnel) | Image (vide = section garde le placeholder texte) |

## Règle d'or : source unique par élément (éviter le bug de cohérence)
Un même élément visuel/texte affiché à plusieurs endroits doit lire **la même clé Airtable** partout, jamais une copie locale en dur.
- Cartes Solutions : accueil, `/solutions/`, ET les 4 pages détail lisent toutes `accueil.solutions['solution-*']`.
- Avant/après façade (`diff-2`) : accueil ET page branding lisent `accueil.diffs` (par `cle`).
- Helper `heroImage`/`solImg`/`solTitle` = pattern à réutiliser. Les chemins `/images/...` restants ne sont que des **replis** (`|| '/images/...'`), jamais la source principale.

## Zones NON encore connectées à Airtable (codées en dur — état connu, à ne pas confondre avec un bug)
- **Coordonnées** (tél/email/WhatsApp/adresse) : `src/lib/site.ts`.
- **Textes accueil** : FAQ, Méthode, Comparaison, "Notre différence" — codés dans `src/pages/index.astro`.
- **À propos, Contact** : statiques.

## Boutique (connectée Airtable — sans paiement en ligne)
- Catalogue : table `Produits` → `loadAllProduits()` (`src/lib/produits.ts`, repli mock). Seuls les produits `Actif` cochés s'affichent. Galerie = champ `Images` (une URL par ligne).
- Commande : bouton « Commander sur WhatsApp » sur la fiche produit → (1) trace la commande dans `CommandesBoutique` via `netlify/functions/submit-commande.ts` (non bloquant), (2) ouvre WhatsApp avec message pré-rempli portant la même **Référence** (`MO-XXXXXX`) pour rapprocher les deux. Le client confirme par contact — aucun paiement en ligne.
- Les boutons « Ajouter au panier » ont été retirés (pas de panier) — remplacés par « Voir le produit ».
- **Supabase entièrement supprimé** (paquet + 6 fonctions serverless mortes) — ne pas réintroduire, la boutique est 100% Airtable.

## Galerie portfolio (lightbox plein écran)
- `/realisations/` : cliquer une **couverture** ouvre la galerie du projet en plein écran (sans changer de page) ; cliquer le **titre** mène à la page détail (conservée).
- `src/components/Lightbox.astro` — composant autonome, vanilla (aucune lib), design tokens du site. Inclure **une fois** par page ; tout élément avec `data-lightbox-open` + `data-slug` l'ouvre.
- Images à la demande : `src/pages/api/galerie/[slug].json.ts` (jamais les ~400 images au démarrage ; cache client par slug + préchargement des seules voisines ; 1 seule `<img>` dans le DOM).
- Cloudinary : `containUrl(url, 1600)` (c_limit, sans recadrage) pour la lightbox ; `smartCrop` + `srcset` 480/768/1024 pour les miniatures de grille (width/height explicites, 1re carte eager).
- Comportements : flèches clavier, balayage tactile, Échap/fond/bouton pour fermer (l'image ne ferme pas), boucle circulaire, compteur `01 / 47`, points d'accès direct, scroll bloqué puis restauré à l'identique, focus restauré (`preventScroll`), safe-areas iOS, `prefers-reduced-motion`, états chargement/erreur/vide, garde anti-course (`renderToken`).
- `FramedImage.astro` étendu (srcset/sizes/width/height/eager, optionnels — usages existants inchangés).

## SEO technique (en place)
- `public/favicon.svg` — logo de marque (M rouge / O blanc sur fond ink).
- `public/images/og/micro-office-og.jpg` (1200×630) — carte de partage, référencée par `Base.astro`.
- `src/pages/sitemap.xml.ts` — sitemap **dynamique** : 13 routes statiques + tous les slugs projets lus en direct d'Airtable (nouveau projet ⇒ dans le sitemap sans rebuild).
- `public/robots.txt` — tout autorisé sauf `/admin-commandes/`, pointe vers le sitemap.

## Cloudinary
- Cloud : `yvskaorq`. Images éditoriales de l'accueil dans le dossier `site-accueil/`.
- Preset non signé `demandes_projet` (dossier `demandes-projet/`) = upload des fichiers du formulaire depuis le navigateur.
- Recadrage intelligent hero : `smartCrop()` dans `src/lib/cloudinary.ts` (utilise `g_auto`).
- Pour changer une image gérée par Airtable : uploader sur Cloudinary → coller l'URL `secure_url` dans le champ Image de la ligne Airtable.

## Formulaire "Présenter mon projet" (double envoi)
`src/pages/presenter-mon-projet/index.astro` : à la soumission →
1. upload fichiers → Cloudinary (preset `demandes_projet`)
2. **Formspree** (`maqrdezn`) → email — pilote l'affichage du message de succès
3. **Airtable** table `Demandes` via `netlify/functions/submit-demande.ts` — en tâche de fond, non bloquant
- La fonction serverless ne tourne qu'avec `netlify dev` ou en prod, pas sous `astro dev` seul (404 attendu en dev simple).

## Invariants à ne PAS casser
- **Ne jamais remplir ni remplacer un champ Airtable vide.** Les champs vides le sont **intentionnellement** (ex. `Description`, `Client`, `Accroche`, `Badge`, `Sous-titre`). Ne pas auto-générer de contenu pour les combler — le site est conçu pour n'afficher ces éléments que s'ils sont remplis par le client. Proposer, jamais imposer.
- Le hero est piloté par `Accueil` zone `Hero` ; repli sur `Projets` "Mis en avant" si vide. Ne pas re-câbler sur les couvertures projet (elles peuvent être des scans de documents).
- L'accueil a **11 sections** — ne jamais écraser `index.astro` par une version générique.
- Tout loader Airtable a un **repli** (mock/local) : garder ce filet pour que le site rende même si Airtable est indisponible.
- Secrets (`.env.local`, tokens Airtable/Cloudinary) : jamais commités, jamais exposés côté client (passer par une fonction serverless).

## Workflow de vérification (après toute modif visible)
1. `npm run build` → 0 erreur.
2. Redémarrer le dev (vide le cache 5 min) puis vérifier dans le navigateur.
3. Console sans erreur. Screenshot si changement visuel.
4. Commit seulement si demandé.

## Déploiement (en ligne)
- **Dépôt GitHub** : `git@github.com:Mahamane04/micro-office-site.git` (branche `main`, push = auto-deploy)
- **Netlify** : site `famous-malasada-d32eb7` → https://famous-malasada-d32eb7.netlify.app (Site ID `a270187a-e7e5-4598-82b2-8e33c0e45577`, compte `mahamane04`, plan gratuit)
- **Variables d'environnement Netlify** (compte gratuit → forcément **scope "site"**, pas "account/shared" ; passer par `POST /api/v1/accounts/{account}/env?site_id={id}` sans le champ `scopes` sinon 403) : `AIRTABLE_API_TOKEN`, `AIRTABLE_BASE_ID`, `CLOUDINARY_CLOUD_NAME`, `NETLIFY_ISR_SECRET`
- Vérifié en direct après déploiement : accueil (Airtable), réalisations + lightbox + endpoint galerie, boutique — tout fonctionne en prod, 0 erreur console.
- **Webhook de revalidation** — `netlify/functions/revalidate.ts` (POST, header `x-webhook-secret` = `NETLIFY_ISR_SECRET`). Fait DEUX choses, car le site mélange deux modes de rendu :
  1. **Pages statiques** (`/`, `/solutions/`, `/realisations/`, `/boutique/` — pas de `prerender = false`) : générées une fois au build, une purge CDN n'a aucun effet dessus. Le webhook déclenche donc un **Build Hook Netlify** (`NETLIFY_BUILD_HOOK_URL`) → vrai rebuild + redéploiement (~1-3 min).
  2. **Pages détail ISR** (`realisations/[slug]`, `boutique/[slug]`, ont `prerender = false`) : mises en cache CDN par `netlify.toml`. Le webhook purge aussi via l'**API Purge Netlify** (`NETLIFY_PURGE_TOKEN` + `NETLIFY_SITE_ID`) pour un effet plus rapide sur ces pages précises.
  - ⚠️ Piège découvert en testant : l'ancienne version vidait un `Map` en mémoire — inutile, car chaque fonction Netlify tourne dans un processus isolé séparé de celui qui sert les pages. Toujours vérifier par un vrai test bout-en-bout (modifier Airtable → appeler le webhook → recharger le site) avant de faire confiance à un mécanisme de cache serverless.
  - **Reste à faire côté toi** : configurer une **Airtable Automation** ("When record updated" → "Send webhook") sur les tables que tu édites (`Projets`, `Accueil`, `SolutionsPages`, `SolutionsPrestations`, `Produits`), pointant vers `https://famous-malasada-d32eb7.netlify.app/.netlify/functions/revalidate` avec le header `x-webhook-secret`. Pas d'API publique Airtable pour créer une Automation — configuration UI unique par table.
- Domaine personnalisé (optionnel) ; analytics : encore à faire.

## Schéma Airtable exact (base `appEXrTyylWFmW3U7`)
> Source de vérité des noms de champs. Le client `src/lib/airtable/client.ts` tolère les
> variantes d'accents mais s'aligner sur ces noms exacts. Régénérer via l'API meta si le
> schéma change. Les champs marqués ⃝ sont souvent vides = optionnels (ne jamais les remplir d'office).

**`Projets`** (28 lignes) — portfolio
- `Nom` (multilineText) → code `titre`
- `Slug` (multilineText) → `slug`
- `Nombre d'images` (number) → `nombreImages`
- `Catégories` (multilineText, séparées par `|`) → `categories` (28 sous-catégories, non utilisées pour les filtres)
- `Dossier Cloudinary` (multilineText)
- `Couverture` (multilineText) — repli de `URL Couverture`
- `URL Couverture` (multilineText) → `couverture`
- `Description` (multilineText) ⃝ → `description`
- `Famille` (multipleSelects) → `familles` — **c'est ce champ qui pilote les filtres** (7 groupes propres)
- `Mis en avant` (checkbox) → `misEnAvant`
- *Champs `Client`, `Accroche` référencés par le code mais absents du schéma actuel — s'ajoutent si besoin, s'affichent si remplis.*

**`Images`** (324 lignes) — galerie
- `Nom` (multilineText) → `nom` (sert d'alt)
- `Projet` (singleSelect, = nom du projet) → lien vers `Projets`
- `Catégorie` (singleSelect)
- `Image` (multilineText) — repli de `URL Cloudinary`
- `URL Cloudinary` (multilineText) → `url`
- `Public ID` (multilineText) → `publicId`
- `Dossier Cloudinary` (singleSelect), `Chemin d'origine` (multilineText), `Aperçu` (attachments) — internes

**`Accueil`** — éléments éditoriaux accueil + solutions (regroupés par `Zone`)
- `Cle` (singleLineText, identifiant du slot) · `Zone` (singleSelect : Hero, Clients, Solutions, Différence, Lancement, Témoignages) · `Titre` · `Image` (URL) · `Image 2` (URL) · `Badge` ⃝ · `Sous-titre` ⃝ · `Ordre` (number) · `Actif` (checkbox)

**`SolutionsPages`** (4 lignes) — contenu pages solutions
- `Cle` (= slug page) · `Titre H1` · `Intro` · `Texte bouton hero` · `CTA titre` · `CTA texte` · `Ordre`

**`SolutionsPrestations`** (31 lignes) — prestations par page
- `Titre` · `Cle Page` (lien vers SolutionsPages.Cle) · `Description` · `Ordre`

**`Demandes`** — soumissions du formulaire (écrites par `submit-demande.ts`)
- `Nom` · `Statut` (Nouveau/En cours/Traité/Archivé) · `Type de besoin` · `Description du projet` · `Objectif recherché` · `Ville ou zone` · `Délai souhaité` · `Budget indicatif` · `Fichiers joints` (attachments) · `Entreprise` · `Téléphone` · `WhatsApp` · `E-mail` · `Moyen de contact préféré`

**`Produits`** — catalogue boutique
- `Nom` · `Slug` · `Marque` · `Catégorie` (Chaussures/Vêtements/Accessoires) · `Prix` · `Prix promo` ⃝ · `Accroche` · `Description` · `Image` (URL couverture) · `Images` ⃝ (une URL par ligne = galerie) · `Statut` (en stock/sur commande/rupture) · `Stock` · `Nouveauté` · `Mis en avant` · `Actif` (décoché = masqué du site)

**`CommandesBoutique`** — commandes boutique (écrites par `submit-commande.ts`)
- `Référence` (MO-XXXXXX) · `Statut` (Nouvelle/Contactée/Confirmée/Livrée/Annulée) · `Produit` · `Slug produit` · `Quantité` · `Prix unitaire` · `Total` · `Nom client` ⃝ · `Téléphone` ⃝ · `Ville` ⃝ · `Note` (taille/couleur) · `Canal` (whatsapp/formulaire)

**`Table 1`** — table par défaut d'Airtable, **inutilisée** par le site (peut être ignorée/supprimée).

## Dépendances — état après nettoyage (ne pas réintroduire sans raison)
Retirés car inutilisés : `react`/`react-dom`/`@astrojs/react` (aucun composant JSX), `sharp` (images via Cloudinary), `dotenv` (env via import.meta.env/process.env), `@supabase/supabase-js` (boutique migrée sur Airtable), scripts npm `format`/`lint` (prettier/eslint jamais installés).
