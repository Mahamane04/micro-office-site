// Cloudinary image transformation helper

export interface CloudinaryTransformOptions {
  width?: number;
  height?: number;
  quality?: 'auto' | number;
  crop?: 'fill' | 'fit' | 'scale' | 'pad';
  format?: 'auto' | 'webp' | 'jpg' | 'png';
  radius?: number;
  gravity?: 'auto' | 'face' | 'center';
  aspectRatio?: string;
  zoom?: number;
}

/**
 * Build Cloudinary image URL with transformations
 */
export function buildCloudinaryUrl(publicId: string, options: CloudinaryTransformOptions = {}): string {
  const cloudName = import.meta.env.CLOUDINARY_CLOUD_NAME;

  if (!cloudName) {
    console.warn('CLOUDINARY_CLOUD_NAME not configured');
    return '';
  }

  const {
    width,
    height,
    quality = 'auto',
    crop = 'fill',
    format = 'auto',
    radius,
    gravity,
    aspectRatio,
    zoom,
  } = options;

  const transformations: string[] = [];

  // Build transformation string
  if (width || height) {
    let transform = '';
    if (width) transform += `w_${width}`;
    if (height) transform += (transform ? ',' : '') + `h_${height}`;
    if (crop) transform += `,c_${crop}`;
    if (gravity) transform += `,g_${gravity}`;
    if (aspectRatio) transform += `,ar_${aspectRatio}`;
    transformations.push(transform);
  }

  if (quality) {
    transformations.push(`q_${quality}`);
  }

  if (format) {
    transformations.push(`f_${format}`);
  }

  if (radius) {
    transformations.push(`r_${radius}`);
  }

  if (zoom) {
    transformations.push(`z_${zoom}`);
  }

  // Auto-select device pixel ratio
  transformations.push('dpr_auto');

  const transformationString = transformations.join(',');

  return `https://res.cloudinary.com/${cloudName}/image/upload/${transformationString}/${publicId}`;
}

/**
 * Get responsive image URLs for different breakpoints
 */
export function getResponsiveImages(publicId: string, options: CloudinaryTransformOptions = {}) {
  return {
    mobile: buildCloudinaryUrl(publicId, { ...options, width: 375, format: 'webp' }),
    tablet: buildCloudinaryUrl(publicId, { ...options, width: 768, format: 'webp' }),
    desktop: buildCloudinaryUrl(publicId, { ...options, width: 1280, format: 'webp' }),
    full: buildCloudinaryUrl(publicId, { ...options, format: 'webp' }),
  };
}

/**
 * Get thumbnail URL
 */
export function getThumbnailUrl(publicId: string, size = 200): string {
  return buildCloudinaryUrl(publicId, {
    width: size,
    height: size,
    crop: 'fill',
    quality: 80,
    format: 'webp',
  });
}

/**
 * Get hero image URL (large, optimized)
 */
export function getHeroImageUrl(publicId: string): string {
  return buildCloudinaryUrl(publicId, {
    width: 1920,
    quality: 'auto',
    format: 'webp',
    gravity: 'auto',
    crop: 'fill',
  });
}

/**
 * Get product image URL (medium size)
 */
export function getProductImageUrl(publicId: string): string {
  return buildCloudinaryUrl(publicId, {
    width: 600,
    height: 600,
    crop: 'fill',
    quality: 'auto',
    format: 'webp',
  });
}

/**
 * Insert a smart-crop transformation into an existing full Cloudinary delivery URL
 * (as stored in Airtable: https://res.cloudinary.com/<cloud>/image/upload/v123/path/img.jpg).
 * Uses g_auto (content-aware/saliency cropping) so the subject stays framed
 * regardless of the source image's original orientation or aspect ratio —
 * works for any image dropped into Airtable without manual curation.
 */
export function smartCrop(url: string, width: number, height: number): string {
  if (!url || !isCloudinaryUrl(url)) return url;
  const marker = '/image/upload/';
  const idx = url.indexOf(marker);
  if (idx === -1) return url;
  const transform = `c_fill,g_auto,w_${width},h_${height},q_auto,f_auto,dpr_auto`;
  return url.slice(0, idx + marker.length) + transform + '/' + url.slice(idx + marker.length);
}

/**
 * Check if URL is already a Cloudinary URL
 */
export function isCloudinaryUrl(url: string): boolean {
  return url.includes('cloudinary.com') || url.includes('res.cloudinary.com');
}

/**
 * Extract public ID from Cloudinary URL
 */
export function extractPublicId(url: string): string {
  if (!isCloudinaryUrl(url)) {
    return url;
  }

  try {
    const urlObj = new URL(url);
    const parts = urlObj.pathname.split('/');
    // Extract from path like /image/upload/.../{publicId}
    return parts.pop() || url;
  } catch {
    return url;
  }
}
