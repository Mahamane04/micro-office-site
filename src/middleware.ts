// Astro middleware — sets edge cache headers on the on-demand (ISR) pages.
//
// The content pages (prerender = false) fetch Airtable live. Without this,
// Astro's Netlify adapter defaults them to `Cache-Control: no-cache`, so the
// CDN would call the function on every visit. Here we give them a 5-minute
// edge cache with stale-while-revalidate: the CDN serves cached HTML instantly
// to visitors and refreshes in the background, so an Airtable edit propagates
// automatically within ~5 min while keeping function invocations low (works
// well within the Netlify free tier). Static prerendered pages never run this.

import { defineMiddleware } from 'astro:middleware';

const ISR_CACHE = 's-maxage=300, stale-while-revalidate=86400, public';

// Content routes backed by Airtable (prerender = false)
function isIsrContentRoute(pathname: string): boolean {
  if (pathname === '/') return true;
  return (
    pathname.startsWith('/solutions/') ||
    pathname.startsWith('/realisations/') ||
    pathname.startsWith('/boutique/')
  );
}

export const onRequest = defineMiddleware(async (context, next) => {
  const response = await next();
  const { pathname } = context.url;

  if (isIsrContentRoute(pathname)) {
    response.headers.set('Cache-Control', ISR_CACHE);
  }

  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Keep admin/CMS surfaces out of search indexes
  if (pathname.startsWith('/admin/') || pathname.startsWith('/admin-commandes/')) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }

  return response;
});
