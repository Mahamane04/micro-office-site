// Netlify function: revalidation triggered by an Airtable Automation (or
// any authenticated caller). Does two things, because this site mixes two
// rendering modes:
//
// 1. Most pages (/, /solutions/, /realisations/, /boutique/) are STATIC —
//    prerendered once at build time into plain HTML. No cache purge can
//    ever make new Airtable content appear on them; only a fresh build
//    can. So this function triggers a Netlify Build Hook, which rebuilds
//    and redeploys the site (~1-3 min, not instant, but the only correct
//    mechanism for these pages).
// 2. The two dynamic detail pages (/realisations/[slug]/, /boutique/[slug]/)
//    use on-demand ISR (prerender = false) and are cached at the edge per
//    netlify.toml's s-maxage. For those, purging the CDN does help show
//    fresh content sooner, so we also purge.
//
// (Earlier version of this file cleared an in-memory Map instead — that
// did nothing, since each Netlify Function invocation runs in an isolated
// process separate from the one serving page requests.)

import type { Context } from '@netlify/functions';

const WEBHOOK_SECRET = process.env.NETLIFY_ISR_SECRET;
const PURGE_TOKEN = process.env.NETLIFY_PURGE_TOKEN;
const SITE_ID = process.env.NETLIFY_SITE_ID;
const BUILD_HOOK_URL = process.env.NETLIFY_BUILD_HOOK_URL;

export default async (req: Request, _context: Context) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const providedSecret = req.headers.get('x-webhook-secret');
  if (!WEBHOOK_SECRET || providedSecret !== WEBHOOK_SECRET) {
    console.warn('revalidate: invalid or missing webhook secret');
    return new Response('Unauthorized', { status: 401 });
  }

  if (!PURGE_TOKEN || !SITE_ID) {
    console.error('revalidate: NETLIFY_PURGE_TOKEN or NETLIFY_SITE_ID not configured');
    return new Response(JSON.stringify({ ok: false, error: 'Server not configured' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Payload is informational only (which table/record triggered this) —
  // logged for visibility, but both actions below are whole-site (simplest
  // correct option; no per-page cache tags or incremental builds are set up).
  let payload: Record<string, unknown> = {};
  try {
    payload = await req.json();
  } catch {
    // No/invalid body is fine — still proceed.
  }

  const results: { purge?: string; build?: string } = {};

  // 1. Purge the CDN — helps the two on-demand ISR pages (project/product detail)
  try {
    const res = await fetch('https://api.netlify.com/api/v1/purge', {
      method: 'POST',
      headers: { Authorization: `Bearer ${PURGE_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ site_id: SITE_ID }),
    });
    results.purge = res.ok ? 'ok' : `failed (${res.status})`;
    if (!res.ok) console.error('revalidate: purge failed', res.status, await res.text().catch(() => ''));
  } catch (error) {
    results.purge = 'error';
    console.error('revalidate: purge request failed', error);
  }

  // 2. Trigger a real rebuild — the only way to refresh the static pages
  //    (/, /solutions/, /realisations/, /boutique/), which are prerendered
  //    HTML and unaffected by cache purges.
  if (BUILD_HOOK_URL) {
    try {
      const res = await fetch(BUILD_HOOK_URL, { method: 'POST' });
      results.build = res.ok ? 'triggered' : `failed (${res.status})`;
      if (!res.ok) console.error('revalidate: build hook failed', res.status, await res.text().catch(() => ''));
    } catch (error) {
      results.build = 'error';
      console.error('revalidate: build hook request failed', error);
    }
  } else {
    results.build = 'not configured';
  }

  console.log('revalidate: done', { table: payload.table, results, timestamp: new Date().toISOString() });

  return new Response(JSON.stringify({ ok: true, results, timestamp: new Date().toISOString() }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
