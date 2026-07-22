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
- **Boutique** (`/boutique/`) : données fictives (`src/lib/produits.ts`), aucune table Airtable.
- **Coordonnées** (tél/email/WhatsApp/adresse) : `src/lib/site.ts`.
- **Textes accueil** : FAQ, Méthode, Comparaison, "Notre différence" — codés dans `src/pages/index.astro`.
- **À propos, Contact** : statiques.
- **Pages Solutions détail** : les blocs images "Notre différence" hors `diff-2`, et l'icône SVG placeholder d'automatisation, restent locaux.

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
- Le hero est piloté par `Accueil` zone `Hero` ; repli sur `Projets` "Mis en avant" si vide. Ne pas re-câbler sur les couvertures projet (elles peuvent être des scans de documents).
- L'accueil a **11 sections** — ne jamais écraser `index.astro` par une version générique.
- Tout loader Airtable a un **repli** (mock/local) : garder ce filet pour que le site rende même si Airtable est indisponible.
- Secrets (`.env.local`, tokens Airtable/Cloudinary) : jamais commités, jamais exposés côté client (passer par une fonction serverless).

## Workflow de vérification (après toute modif visible)
1. `npm run build` → 0 erreur.
2. Redémarrer le dev (vide le cache 5 min) puis vérifier dans le navigateur.
3. Console sans erreur. Screenshot si changement visuel.
4. Commit seulement si demandé.
