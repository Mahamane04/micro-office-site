# Configuration des Webhooks Airtable

Guide pour configurer les webhooks Airtable et Netlify pour la revalidation ISR automatique.

## Architecture

```
Airtable (données changent)
    ↓ (webhook POST)
Netlify Function (/revalidate)
    ↓ (invalidate cache)
ISR Cache
    ↓ (5 min TTL)
Site live
```

## Étapes de configuration

### 1. Créer un Build Hook Netlify

1. Aller à **Netlify Dashboard** → Your Site → **Settings** → **Build & deploy** → **Build hooks**
2. Cliquer sur **Add build hook**
3. Nommer: `airtable-revalidation`
4. Branch: `main`
5. Cliquer **Save**
6. Copier l'URL générée (format: `https://api.netlify.com/build_hooks/xxxxx...`)

### 2. Définir la clé secrète Netlify

Ajouter la variable d'environnement dans Netlify:

1. **Settings** → **Build & deploy** → **Environment**
2. Cliquer **Edit variables**
3. Ajouter:
   ```
   NETLIFY_ISR_SECRET = [une clé secrète random, ex: abc123def456xyz789]
   ```

### 3. Configurer Airtable Webhooks

#### 3.1 Accéder aux Webhooks Airtable

1. Ouvrir votre base Airtable
2. Aller à **Tools** → **Webhooks** (en bas à droite)
3. Ou: **Settings** → **API & Webhooks**

#### 3.2 Créer un webhook pour les Produits

1. Cliquer **Add a webhook** ou **Create Webhook**
2. **Payload URL**: `https://your-domain.netlify.app/.netlify/functions/revalidate`
3. **Are you notifying Airtable?**: No
4. **What should trigger this webhook?**
   - ✓ record.created
   - ✓ record.updated
   - ✓ record.destroyed
5. **Webhook setup code** (Airtable vous donne un code - le copier, on en aura besoin)
6. **Test webhook** (pour vérifier que c'est connecté)
7. Sauvegarder

#### 3.3 Ajouter des Custom Headers (optionnel mais recommandé)

Si Airtable supporte les custom headers:

1. Dans le webhook settings:
2. Ajouter header:
   ```
   Name: x-webhook-secret
   Value: [la clé NETLIFY_ISR_SECRET]
   ```

#### 3.4 Créer un webhook pour les Projets

Répéter les étapes 3.2-3.3 pour la table **Projets** avec la même URL.

#### 3.5 Créer un webhook pour Configuration (optionnel)

Répéter pour la table **Configuration** si vous avez des paramètres dynamiques.

### 4. Vérifier la configuration

#### Test local (avec ngrok)

```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Start ngrok tunnel
ngrok http 8888

# Terminal 3: Test webhook
bash scripts/test-webhook.sh https://your-ngrok-url/.netlify/functions/revalidate Produits updated test-product
```

Réponse attendue:
```json
{
  "ok": true,
  "message": "Revalidation triggered",
  "revalidatedPaths": ["/boutique/", "/boutique/test-product/"],
  "timestamp": "2026-07-21T12:00:00.000Z"
}
```

#### Test sur Netlify

1. Ajouter un produit de test dans Airtable
2. Vérifier que le webhook est déclenché:
   - **Airtable** → Webhooks → **Activity log**
   - Vérifier "Delivery succeeded"
3. Vérifier que le cache est invalidé:
   - **Netlify** → **Functions** → **revalidate** → **Logs**
   - Chercher le log "Cache invalidated for paths:"

### 5. Payloads attendues

#### Webhook Produits

```json
{
  "table": "Produits",
  "action": "updated",
  "record": {
    "id": "recXXXXXXXX",
    "slug": "air-force-1",
    "nom": "Air Force 1"
  },
  "timestamp": "2026-07-21T12:00:00Z"
}
```

#### Webhook Projets

```json
{
  "table": "Projets",
  "action": "updated",
  "record": {
    "id": "recXXXXXXXX",
    "slug": "projet-augment",
    "titre": "Redesign Augment"
  },
  "timestamp": "2026-07-21T12:00:00Z"
}
```

### 6. TTL Revalidation (arrière-plan)

Sans webhook, les pages sont revalidées automatiquement toutes les 5 minutes via la scheduled function.

La scheduled function `/schedule-revalidate` s'exécute:
```
Cron: */5 * * * *  (chaque 5 minutes)
```

Vérifier dans **Netlify** → **Functions** → **schedule-revalidate** → **Logs**

### 7. Troubleshooting

**Webhook ne se déclenche pas?**
- Vérifier que l'URL Netlify est accessible de l'extérieur
- Vérifier les **Activity logs** dans Airtable (section Webhooks)
- Vérifier les **Logs** dans Netlify Functions

**Cache pas invalidé?**
- Vérifier que `NETLIFY_ISR_SECRET` est défini en production
- Vérifier que le secret du webhook correspond
- Vérifier les logs Netlify function

**TTL revalidation pas actif?**
- Vérifier que Netlify Scheduled Functions sont activées (plan payant)
- Attendre 5 minutes après le déploiement
- Vérifier les logs de `schedule-revalidate`

## Résumé des URLs

| Endpoint | Fonction |
|----------|----------|
| `/.netlify/functions/revalidate` | Webhook revalidation (Airtable POST) |
| `/.netlify/functions/schedule-revalidate` | TTL revalidation (Netlify Cron) |

## Sécurité

1. **Ne pas** committer `NETLIFY_ISR_SECRET` dans `.env`
2. Utiliser des secrets Netlify pour les variables sensibles
3. Toujours vérifier la signature du webhook si possible
4. Limiter l'accès aux fonctions via authentication si nécessaire

## Références

- [Airtable Webhooks API](https://airtable.com/developers/web/api/webhooks-overview)
- [Netlify Scheduled Functions](https://docs.netlify.com/functions/overview/#schedule-functions)
- [Astro ISR Documentation](https://docs.astro.build/en/guides/integrations-guide/netlify/#deployment)
