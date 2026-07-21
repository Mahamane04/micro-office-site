# Configuration Cloudinary

Guide complet pour configurer Cloudinary pour l'optimisation des images.

## Qu'est-ce que Cloudinary ?

Cloudinary est un CDN (Content Delivery Network) spécialisé dans la gestion et l'optimisation des images. Il offre:

- **Optimisation auto** : compression, choix du format (WebP, JPEG, PNG)
- **Transformations à la volée** : redimensionnement, cropping, filtres
- **Responsive images** : génère plusieurs versions pour mobile/desktop
- **CDN global** : livraison rapide depuis le serveur le plus proche
- **Stockage illimité** : gratuit jusqu'à 25GB

## 1. Créer un compte Cloudinary

1. Aller à https://cloudinary.com
2. Cliquer **Sign Up Free**
3. Créer un compte
4. Confirmer email
5. Dashboard → Notes Cloud Name et API Key

## 2. Configuration Netlify

Ajouter les variables d'environnement dans Netlify:

1. **Settings** → **Build & deploy** → **Environment**
2. Ajouter:
   ```
   CLOUDINARY_CLOUD_NAME = [votre cloud name]
   CLOUDINARY_API_KEY = [votre API key]
   CLOUDINARY_API_SECRET = [votre API secret]
   ```

3. Note: l'API secret ne doit **jamais** être exposé au client (il n'est utilisé que côté serveur)

## 3. Ajouter images à Cloudinary

### Option A: Upload manuel via Cloudinary Console

1. Dashboard → **Media Library**
2. Cliquer **Upload**
3. Drag-drop images
4. Folder: `microoffice/`

### Option B: Script automatisé

```bash
# Setup
npm install form-data

# Configure env vars
export CLOUDINARY_CLOUD_NAME=your-cloud-name
export CLOUDINARY_API_KEY=your-api-key
export CLOUDINARY_API_SECRET=your-api-secret

# Run migration
node scripts/migrate-to-cloudinary.js src/images microoffice
```

**Note**: Le script utilise l'API Cloudinary pour uploader en batch.

## 4. Utiliser Cloudinary dans vos pages

### Méthode 1: Component OptimizedImage

```astro
---
import OptimizedImage from '@components/OptimizedImage.astro';
---

<OptimizedImage
  src="https://res.cloudinary.com/your-cloud/image/upload/microoffice/product-name.jpg"
  alt="Product description"
  width={800}
  height={600}
/>
```

### Méthode 2: Helper Cloudinary (manual)

```astro
---
import { buildCloudinaryUrl } from '@lib/cloudinary';

// Build URL with transformations
const imageUrl = buildCloudinaryUrl('microoffice/product-name', {
  width: 400,
  height: 400,
  crop: 'fill',
  quality: 'auto',
  format: 'webp',
});
---

<img src={imageUrl} alt="Product" />
```

### Méthode 3: URLs brutes (non optimisées)

```html
<!-- Simple URL (no transformations) -->
<img src="https://res.cloudinary.com/your-cloud/image/upload/microoffice/product.jpg" />
```

## 5. Transformations disponibles

### Redimensionnement

```
w_400              # Width: 400px
h_300              # Height: 300px
c_fill             # Crop mode: fill
ar_16:9            # Aspect ratio: 16:9
```

### Format & Qualité

```
f_webp             # Format: WebP (auto-negotiation avec f_auto)
f_auto             # Auto-select best format per browser
q_auto             # Auto-select quality (80-100 depending on image)
q_80               # Fixed quality: 80
```

### Effets

```
r_max              # Rounded corners (max = circle)
e_blur:300         # Blur effect
e_sepia            # Sepia effect
b_auto             # Background auto
```

### Exemples complets

```
# Product card thumbnail
w_200,h_200,c_fill,q_80,f_webp

# Hero image (responsive)
w_1920,q_auto,f_auto

# Portfolio gallery item
w_800,h_600,c_fill,q_85,f_webp,r_20
```

## 6. Responsive Images

Le component `OptimizedImage.astro` génère automatiquement:

```html
<picture>
  <source srcset="mobile.webp 375w, tablet.webp 768w, ..." type="image/webp" />
  <source srcset="mobile.jpg 375w, tablet.jpg 768w, ..." type="image/jpeg" />
  <img src="original.jpg" alt="..." />
</picture>
```

Cela signifie:
- ✅ WebP en priorité (plus petit)
- ✅ Fallback JPEG pour vieux navigateurs
- ✅ Responsive: différentes tailles selon viewport
- ✅ Compression auto: qualité adaptée

## 7. Optimiser existant

### Migrer depuis Eleventy

Les images Eleventy sont dans `src/images/` :

```bash
# Backup local images
cp -r src/images src/images-backup

# Upload vers Cloudinary
node scripts/migrate-to-cloudinary.js src/images microoffice

# Mettre à jour les URLs dans les fichiers:
# Avant: /images/boutique/product.jpg
# Après: https://res.cloudinary.com/[cloud]/image/upload/microoffice/product.jpg

# Ou utiliser les helpers pour construire URLs dynamiquement
```

## 8. Bonnes pratiques

### ✅ À faire

- Utiliser `quality: 'auto'` pour laisser Cloudinary décider
- Utiliser `format: 'auto'` (ou `f_auto`) pour meilleur format
- Définir width/height pour éviter layout shift
- Utiliser les helpers pour construire URLs (pas d'URLs hardcodées)

### ❌ À éviter

- Uploader des images énormes (> 10MB)
- Oublier de supprimer images locales après migration
- Hardcoder des URLs de transformation (utiliser helpers)
- Exposer l'API secret au client

## 9. Troubleshooting

### Image ne s'affiche pas?

1. Vérifier que `CLOUDINARY_CLOUD_NAME` est correct
2. Vérifier que l'image existe dans Cloudinary Media Library
3. Vérifier l'URL complète dans navigateur

### Qualité mauvaise?

- Ajouter `q_auto` ou `q_85` à la transformation
- Vérifier que le format est adapté (WebP vs JPEG)

### Performance lente?

- Vérifier que les images sont compressées côté Cloudinary
- Réduire les transformations si beaucoup de variations
- Utiliser `dpr_auto` pour retina displays

## 10. Configuration Airtable

Stocker les public IDs Cloudinary dans Airtable:

### Table Produits

```
Champ: cloudinary_id
Type: Single line text
Value: microoffice/air-force-1
```

### Table Projets

```
Champ: couverture_cloudinary_id
Type: Single line text
Value: microoffice/projet-augment
```

Puis dans les loaders:

```typescript
const imageUrl = buildCloudinaryUrl(product.cloudinary_id, {
  width: 400,
  quality: 'auto',
});
```

## Ressources

- [Cloudinary Dashboard](https://cloudinary.com/console)
- [Cloudinary Documentation](https://cloudinary.com/documentation)
- [URL API Reference](https://cloudinary.com/documentation/image_transformation_reference)
- [Responsive Images Guide](https://cloudinary.com/documentation/responsive_images)
