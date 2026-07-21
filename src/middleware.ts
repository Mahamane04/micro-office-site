// Astro middleware for cache headers and ISR revalidation

import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async (context, next) => {
  const response = await next();
  const { pathname } = context.url;

  // Set cache control headers based on route type
  // These headers work with Netlify's ISR (stale-while-revalidate)

  // Boutique & Portfolio routes: ISR with 5 min TTL
  if (pathname.startsWith('/boutique/') && pathname !== '/boutique/') {
    response.headers.set(
      'Cache-Control',
      's-maxage=300, stale-while-revalidate=86400, public'
    );
  } else if (pathname.startsWith('/realisations/') && pathname !== '/realisations/') {
    response.headers.set(
      'Cache-Control',
      's-maxage=600, stale-while-revalidate=86400, public'
    );
  }
  // Main pages: longer cache
  else if (
    pathname === '/' ||
    pathname === '/boutique/' ||
    pathname === '/realisations/' ||
    pathname === '/contact/' ||
    pathname === '/a-propos/'
  ) {
    response.headers.set('Cache-Control', 'public, max-age=3600, s-maxage=3600');
  }
  // Static assets
  else if (pathname.match(/\.(js|css|woff2?)$/)) {
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  }
  // Legal pages
  else if (
    pathname === '/mentions-legales/' ||
    pathname === '/politique-de-confidentialite/'
  ) {
    response.headers.set('Cache-Control', 'public, max-age=86400');
  }

  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Robots headers for admin pages
  if (pathname.startsWith('/admin/')) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }

  return response;
});
