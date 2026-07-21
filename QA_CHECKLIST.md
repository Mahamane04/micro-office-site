# QA Checklist — Migration Astro ISR + Webhooks

Checklist complète pour valider la migration Eleventy → Astro avant déploiement.

## 🟢 Phase 1: Build & Compilation

- [ ] `npm run build` réussit sans erreurs
- [ ] Build time < 5 secondes
- [ ] SSR function générée (`dist/.netlify/functions/`)
- [ ] Middleware Edge Function générée
- [ ] 8 pages statiques pré-générées
- [ ] Pas de warnings TypeScript

**Vérification:**
```bash
npm run build
# Vérifier: [build] Complete!
# Vérifier: Generated SSR Function
# Vérifier: Generated Middleware Edge Function
```

## 🟢 Phase 2: Pages & Routes

### Pages statiques (SSG)
- [ ] `/` (accueil) charge sans erreur
- [ ] `/boutique/` liste produits (mock data visible)
- [ ] `/realisations/` liste projets
- [ ] `/contact/` formulaire affiche
- [ ] `/a-propos/` contenu affiche
- [ ] `/mentions-legales/` affiche
- [ ] `/politique-de-confidentialite/` affiche
- [ ] `/404` affiche pour URL invalide

### Routes dynamiques (ISR)
- [ ] `/boutique/air-force-1/` (mock product) charge
- [ ] Détail produit: images, prix, stock, description
- [ ] Produits liés ("Vous aimerez aussi") affichent
- [ ] `/realisations/projet-augment/` (mock project) charge
- [ ] Détail projet: galerie, infos client, projets liés

**Commande test:**
```bash
npm run build && npm run preview
# Tester chaque URL ci-dessus en navigateur
```

## 🟢 Phase 3: Fonctionnalités

### Boutique
- [ ] Search/filtrage fonctionne (client-side)
- [ ] Tri par catégorie fonctionne
- [ ] Tri par prix ↑/↓ fonctionne
- [ ] Tri A→Z fonctionne
- [ ] Badge "Nouveau" affiche
- [ ] Badge "Rupture" affiche
- [ ] Stock status affiche (En stock / Sur commande / Rupture)
- [ ] Prix promo affiche et s'affiche barré
- [ ] Quantité +/- fonctionne
- [ ] Bouton "Ajouter au panier" cliquable
- [ ] Bouton "Commander sur WhatsApp" cliquable

### Portfolio
- [ ] Filtrage par catégorie fonctionne
- [ ] Badge "À la une" visible
- [ ] Galerie images chargent
- [ ] Métadata projet affichent (client, date, categorie)

### Navigation
- [ ] Header links pointent aux bons endroits
- [ ] Footer links cliquables
- [ ] Back links ("← Retour") fonctionnent
- [ ] Breadcrumbs (le cas échéant) corrects

## 🟢 Phase 4: Responsive Design

### Mobile (375px)
- [ ] Layout s'adapte (pas de horizontal scroll)
- [ ] Texte lisible (font-size >= 16px)
- [ ] Boutons cliquables (min 44x44px)
- [ ] Images responsive
- [ ] Spacing/padding approprié
- [ ] Navigation mobile friendly

### Tablet (768px)
- [ ] 2-colonnes grilles affichent correctement
- [ ] Spacing adéquat
- [ ] Images optimisées

### Desktop (1280px+)
- [ ] Layout complet visible
- [ ] 3-4 colonnes grilles
- [ ] Spacing cohérent
- [ ] Pas de ligne trop longue (< 100 chars)

**Test:**
```bash
npm run preview
# F12 → Device toolbar → test responsivité
```

## 🟢 Phase 5: Performance

### Lighthouse (DevTools)
- [ ] Performance score >= 80
- [ ] Accessibility score >= 90
- [ ] Best Practices score >= 90
- [ ] SEO score >= 90

**Métriques Web Vitals:**
- [ ] LCP (Largest Contentful Paint) < 2.5s
- [ ] FID (First Input Delay) < 100ms
- [ ] CLS (Cumulative Layout Shift) < 0.1

**Test:**
```bash
npm run preview
# F12 → Lighthouse → Generate report
```

### Images
- [ ] Images chargent via Cloudinary (si configuré)
- [ ] WebP servi à navigateurs modernes
- [ ] Responsive srcsets générées
- [ ] Pas de placeholder/broken images
- [ ] Images responsive et compressées

### Assets
- [ ] JS bundles minifiés
- [ ] CSS bundles minifiés
- [ ] Pas de unused CSS/JS
- [ ] Fonts chargent sans FOUT

## 🟢 Phase 6: ISR & Caching

### Cache Headers
- [ ] Dynamic routes ont `s-maxage=300` header
- [ ] Static pages ont `max-age=3600` header
- [ ] Assets ont `max-age=31536000, immutable` header

**Test avec DevTools Network tab:**
```
Request → Response Headers → Cache-Control
Vérifier valeurs correctes
```

### Middleware
- [ ] Cache headers injectés correctement
- [ ] Security headers présents:
  - [ ] X-Content-Type-Options: nosniff
  - [ ] X-Frame-Options: SAMEORIGIN
  - [ ] Referrer-Policy: strict-origin-when-cross-origin

## 🟢 Phase 7: SEO & Metadata

### Meta Tags
- [ ] `<title>` correct et descriptif
- [ ] `<meta name="description">` présent
- [ ] `<meta property="og:title">` présent
- [ ] `<meta property="og:image">` présent
- [ ] `<meta property="og:description">` présent
- [ ] Canonical URLs correctes

### Structured Data
- [ ] Produits ont JSON-LD (schema.org/Product)
- [ ] Projets ont JSON-LD approprié

**Test:**
```bash
# Vérifier source HTML (/boutique/[slug]/)
# Chercher: <script type="application/ld+json">
```

### Sitemap & Robots
- [ ] `robots.txt` généré (Netlify adapter)
- [ ] `/admin/` pages ont `X-Robots-Tag: noindex`
- [ ] Sitemap.xml générée (si nécessaire)

## 🟢 Phase 8: Build & Deployment

### Pre-deployment
- [ ] Tous les git changes committés
- [ ] Pas de `.env.local` committés
- [ ] Branch main est clean
- [ ] Remote origin configuré

### Netlify Setup
- [ ] Env vars définis:
  - [ ] `NETLIFY_ISR_SECRET` ✓
  - [ ] `CLOUDINARY_CLOUD_NAME` (optionnel)
  - [ ] `CLOUDINARY_API_KEY` (optionnel)
  - [ ] `AIRTABLE_API_TOKEN` (optionnel)
  - [ ] `AIRTABLE_BASE_ID` (optionnel)

- [ ] Build command: `npm run build`
- [ ] Publish directory: `dist`
- [ ] Functions directory: `netlify/functions`

### Webhooks (Post-deployment)
- [ ] Airtable webhooks configurés
- [ ] Webhook URL: `https://your-domain.netlify.app/.netlify/functions/revalidate`
- [ ] Secret header configuré
- [ ] Test webhook déclenche revalidation

## 🟢 Phase 9: Post-deployment

### Live Site Testing
- [ ] Site accessible via domain custom
- [ ] Pages chargent sans erreur 404
- [ ] Pas de console errors (DevTools)
- [ ] Images affichent correctement
- [ ] Performance acceptable (LCP < 3s)

### Webhook Testing
- [ ] Ajouter produit dans Airtable
- [ ] Vérifier webhook déclenché (Airtable Webhooks log)
- [ ] Vérifier page revalidée (Netlify Functions log)
- [ ] Contenu nouveau visible en < 1 minute

### Form Testing
- [ ] Contact form soumis
- [ ] Pas d'erreur d'envoi

## 📋 Validation Checklist

Avant le lancement officiel, cocher:

```
☐ Build complet sans erreurs
☐ Toutes les pages accessibles
☐ Responsive mobile/tablet/desktop
☐ Lighthouse scores >= 80
☐ Cache headers corrects
☐ SEO meta tags complètes
☐ Images optimisées Cloudinary
☐ Webhooks configurés & testés
☐ Env vars Netlify définis
☐ Pas de console errors
☐ Performance acceptable
```

## 🔴 Blockers

Si l'un de ces points échoue, **NE PAS DÉPLOYER:**

- ❌ Build échoue
- ❌ Routes ne chargent pas (404)
- ❌ Lighthouse performance < 60
- ❌ Console errors (red X in DevTools)
- ❌ Images ne chargent pas
- ❌ Webhooks non-fonctionnels

## ✅ Rollback Plan

Si déploiement échoue:

```bash
# Revenir à Eleventy
git switch eleventy-backup
git push -f origin main

# Ou revenir à commit précédent Astro
git revert [astro-commit-hash]
git push origin main
```

## 📊 Performance Targets

| Métrique | Target | Action si manqué |
|----------|--------|------------------|
| LCP | < 2.5s | Optimiser images |
| FID | < 100ms | Réduire JS |
| CLS | < 0.1 | Fixer layout shifts |
| Performance Score | >= 80 | Reduire bundles |
| Accessibility | >= 90 | Vérifier a11y |
| SEO | >= 90 | Compléter meta tags |

## 📞 Support

En cas de problème après déploiement:

1. Vérifier **Netlify Logs** → Functions
2. Vérifier **Netlify Analytics** → Real-time
3. Vérifier **Airtable Logs** → Webhooks Activity
4. Vérifier **DevTools Console** pour errors client-side
5. Vérifier `.env` variables définies

---

**Status:** [ ] Ready to deploy | [ ] Blocked | [ ] In progress

**Last updated:** [DATE]

**Tested by:** [NAME]
