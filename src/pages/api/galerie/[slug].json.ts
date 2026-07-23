// On-demand gallery endpoint for the portfolio lightbox.
// The grid page never embeds the ~400 gallery images; the lightbox fetches
// this endpoint when a project is opened (then caches client-side).
import type { APIRoute } from 'astro';
import { loadProjetBySlug, loadImagesForProjet } from '@lib/data';
import { containUrl } from '@lib/cloudinary';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const slug = params.slug || '';
  const projet = await loadProjetBySlug(slug);

  if (!projet) {
    return new Response(JSON.stringify({ error: 'Projet introuvable' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const images = await loadImagesForProjet(projet);

  const body = JSON.stringify({
    titre: projet.titre,
    categorie: projet.familles[0] || projet.categories[0] || '',
    images: images
      .filter((img) => img.url)
      .map((img) => ({
        // c_limit 1600px: full image visible (no crop), sized for fullscreen
        src: containUrl(img.url, 1600),
        alt: `${projet.titre} — ${img.categorie || img.nom || 'visuel'}`,
      })),
  });

  return new Response(body, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      // Same ISR profile as the pages: fresh within 5 min, SWR for a day
      'Cache-Control': 's-maxage=300, stale-while-revalidate=86400, public',
    },
  });
};
