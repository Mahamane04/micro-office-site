# Deployment Guide — Micro Office Astro ISR

Guide étape-par-étape pour déployer la migration Astro en production sur Netlify.

## Pré-requisites

- ✅ Code commité dans `main` branch
- ✅ Build local sans erreurs (`npm run build`)
- ✅ QA checklist complétée (voir `QA_CHECKLIST.md`)
- ✅ Netlify account créé + site connecté
- ✅ Domain custom configuré (si applicable)

## Step 1: Préparer Netlify

### 1.1 Accéder au site Netlify

1. https://app.netlify.com → Select site
2. Aller à **Settings** → **Build & deploy**
3. Vérifier:
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Functions directory: `netlify/functions`

### 1.2 Configurer les variables d'environnement

1. **Settings** → **Build & deploy** → **Environment**
2. Cliquer **Edit variables**
3. Ajouter les variables (certaines peuvent rester vides si not needed):

```
NETLIFY_ISR_SECRET = [générer clé random: openssl rand -hex 32]
CLOUDINARY_CLOUD_NAME = [votre cloud name - optionnel]
CLOUDINARY_API_KEY = [votre API key - optionnel]
CLOUDINARY_API_SECRET = [votre API secret - optionnel]
AIRTABLE_API_TOKEN = [votre token - optionnel]
AIRTABLE_BASE_ID = [votre base ID - optionnel]
```

**Important**: Ces variables seront injectées au build time.

### 1.3 Vérifier le domaine custom

1. **Settings** → **Domain management**
2. Vérifier DNS configuré:
   - CNAME vers Netlify (ou Netlify NS)
3. HTTPS auto-enabled (gratuit via Let's Encrypt)

## Step 2: Préparer le code

### 2.1 Commit final

```bash
cd /Users/mahamanehaidara/Documents/Claude\ code/site

# Vérifier status
git status

# Voir ce qui va être commité
git diff

# Commit
git add -A
git commit -m "Pre-deployment: finalize Astro migration

- Build complet + all pages working
- Cache headers configured
- Webhooks ready for Airtable
- Cloudinary integration ready
- QA checklist completed

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"

# Vérifier que le commit est prêt
git log --oneline | head -5
```

### 2.2 Push vers main

```bash
# Vérifier qu'on est sur main
git branch

# Push
git push origin main

# Vérifier sur GitHub/Netlify
# Netlify devrait auto-déclencher le build
```

## Step 3: Netlify Auto-build

Netlify devrait automatiquement:

1. Détecter le push `main`
2. Déclencher un nouveau build
3. Exécuter `npm run build`
4. Générer la SSR function
5. Déployer sur le CDN

### 3.1 Monitoring du build

1. Aller à **Deploys** tab dans Netlify
2. Cliquer sur le build en cours
3. Observer les logs (en temps réel)
4. Attendre "Site deployed"

Logs attendus:
```
npm run build
...
[build] Complete!
[@astrojs/netlify] Generated SSR Function
[@astrojs/netlify] Generated Middleware Edge Function
Finished processing build request
```

### 3.2 Si build échoue

1. Voir le **Build log** complet
2. Chercher le message d'erreur rouge
3. Corriger localement:
   ```bash
   npm run build  # Reproduire localement
   # Fixer l'erreur
   git add -A && git commit -m "Fix build error"
   git push origin main
   ```
4. Netlify re-déclenche le build

## Step 4: Tester le site live

### 4.1 Accéder au site

```
https://your-domain.netlify.app (ou votre domain custom)
```

### 4.2 Vérifier les pages principales

- [ ] https://your-domain/
- [ ] https://your-domain/boutique/
- [ ] https://your-domain/realisations/
- [ ] https://your-domain/contact/
- [ ] https://your-domain/a-propos/

### 4.3 Vérifier les routes dynamiques

- [ ] https://your-domain/boutique/air-force-1/ (mock product)
- [ ] https://your-domain/realisations/projet-augment/ (mock project)

### 4.4 Vérifier la performance

```bash
# F12 → Lighthouse → Generate report
# Vérifier scores >= 80

# Ou utiliser PageSpeed Insights:
https://pagespeed.web.dev/?url=https://your-domain/
```

### 4.5 Vérifier les cache headers

```bash
# Terminal: check cache headers
curl -I https://your-domain/boutique/
# Voir: Cache-Control: s-maxage=300, stale-while-revalidate=86400, public

curl -I https://your-domain/boutique/air-force-1/
# Voir: Cache-Control: s-maxage=300, stale-while-revalidate=86400, public
```

## Step 5: Configurer les Webhooks Airtable

Une fois la production live:

### 5.1 Créer webhooks Airtable

(Voir `WEBHOOK_SETUP.md` pour détails complets)

1. Airtable → Webhooks
2. Create webhook:
   - URL: `https://your-domain/.netlify/functions/revalidate`
   - Header: `x-webhook-secret: [value of NETLIFY_ISR_SECRET]`
   - Table: Produits, action: all

3. Test webhook manuellement

### 5.2 Vérifier Scheduled Functions

Netlify scheduled functions s'exécutent automatiquement:
- Cron: `*/5 * * * *` (every 5 minutes)
- Function: `schedule-revalidate`

Vérifier dans **Functions** → **schedule-revalidate** → **Invocations**

## Step 6: Monitoring Post-deployment

### 6.1 Netlify Logs

Vérifier régulièrement:
- **Functions** → **revalidate** → **Invocations** (webhooks reçus)
- **Builds** → last deploy (build success)
- **Analytics** → Real-time (trafic, errors)

### 6.2 Cloudinary (si utilisé)

- Vérifier images servent correctement
- Vérifier formats WebP/JPEG
- Vérifier compression appliquée

### 6.3 Performance Monitoring

```bash
# Vérifier LCP (Largest Contentful Paint)
# Idéalement < 2.5s

# Tools:
- https://web.dev/measure/ (Google)
- https://pagespeed.web.dev/
- Netlify Analytics (Core Web Vitals)
```

## Step 7: Rollback (Emergency)

Si quelque chose casse après déploiement:

### 7.1 Rollback complet

```bash
# Option 1: Revert le dernier commit
git revert HEAD
git push origin main
# Netlify re-déploiera le commit précédent

# Option 2: Déployer branche backup
git switch eleventy-backup
git push origin main -f  # Force push (⚠️ careful!)
```

### 7.2 Rollback partiel (via Netlify UI)

1. **Deploys** → Voir l'historique
2. Cliquer sur un ancien deploy qui fonctionnait
3. Cliquer **Publish deploy**
4. Attendre "Site deployed"

## Timeline Estimée

```
Pre-deployment setup:        5-10 min
Code commit + push:          2 min
Netlify build:               3-5 min
Site live:                   1 min
Verification testing:        10-15 min
Webhook setup (Airtable):    10-15 min
─────────────────────────────────────
TOTAL:                       ~45-60 min
```

## Troubleshooting

### Build fails

```
❌ Error: Cannot find module '@lib/...'

Solution:
1. Vérifier les imports paths
2. Vérifier tsconfig.json paths aliases
3. npm install localement et retry
```

### Pages show 404

```
❌ Error: 404 Not Found

Solution:
1. Vérifier que build.output = 'hybrid'
2. Vérifier netlify.toml configure le publish directory
3. Attendre 30s pour que le deploy soit complet
```

### Webhooks not triggering

```
❌ Airtable webhook not sending to Netlify

Solution:
1. Vérifier URL du webhook est correct
2. Vérifier NETLIFY_ISR_SECRET env var est défini
3. Tester manuellement avec script: bash scripts/test-webhook.sh
4. Vérifier Netlify logs pour errors
```

### Performance slow

```
❌ LCP > 3s

Solution:
1. Vérifier images optimisées via Cloudinary
2. Vérifier pas d'unused JavaScript
3. Vérifier Web Vitals dans Lighthouse
4. Reduce bundle size si nécessaire
```

## Success Criteria

Déploiement réussi si:

- ✅ Site accessible via domain custom
- ✅ Toutes pages chargent (pas 404)
- ✅ Pas de console errors
- ✅ Images affichent correctement
- ✅ Performance LCP < 3s
- ✅ Cache headers corrects
- ✅ Webhooks déclenchent revalidation

---

**Deployed:** [DATE]  
**Deployed by:** [NAME]  
**Status:** [ ] Success | [ ] Needs fixes | [ ] Rolled back
