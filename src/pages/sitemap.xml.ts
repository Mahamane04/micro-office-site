// Dynamic sitemap — static routes + project slugs pulled live from Airtable,
// so new portfolio entries appear without a rebuild (same ISR caching as pages).
import type { APIRoute } from 'astro';
import { site } from '@lib/site';
import { loadAllProjets } from '@lib/data';

export const prerender = false;

const STATIC_ROUTES = [
  '/',
  '/solutions/',
  '/solutions/branding-signaletique-3d/',
  '/solutions/creation-digitale-print/',
  '/solutions/sites-web-applications-gestion/',
  '/solutions/automatisation-ia/',
  '/realisations/',
  '/boutique/',
  '/a-propos/',
  '/contact/',
  '/presenter-mon-projet/',
  '/mentions-legales/',
  '/politique-de-confidentialite/',
];

export const GET: APIRoute = async () => {
  const projets = await loadAllProjets();
  const urls = [
    ...STATIC_ROUTES,
    ...projets.filter((p) => p.slug).map((p) => `/realisations/${p.slug}/`),
  ];

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${site.baseUrl}${u}</loc></url>`).join('\n')}
</urlset>
`;

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400, public',
    },
  });
};
