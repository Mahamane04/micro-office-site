// Netlify function: optional INSTANT cache purge, triggered by an Airtable
// Automation (or any authenticated caller). Purely optional — the content
// pages are on-demand ISR and already auto-refresh from Airtable within the
// edge-cache window (see netlify.toml / middleware) with NO rebuild. This just
// lets you skip that wait by purging the CDN so the next request refetches.
//
// IMPORTANT — credit safety: this function does NOT trigger a site rebuild.
// A rebuild costs Netlify build credits; on the free plan (300 credits/month)
// rebuilding on every Airtable edit would exhaust them fast. A CDN purge is
// cheap and, with ISR, is all that's needed to show fresh content immediately.
// (An earlier version triggered a Build Hook on every call — removed.)

import type { Context } from '@netlify/functions';

const WEBHOOK_SECRET = process.env.NETLIFY_ISR_SECRET;
const PURGE_TOKEN = process.env.NETLIFY_PURGE_TOKEN;
const SITE_ID = process.env.NETLIFY_SITE_ID;

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

  try {
    const res = await fetch('https://api.netlify.com/api/v1/purge', {
      method: 'POST',
      headers: { Authorization: `Bearer ${PURGE_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ site_id: SITE_ID }),
    });

    if (!res.ok) {
      const error = await res.text().catch(() => '');
      console.error('revalidate: purge failed', res.status, error);
      return new Response(JSON.stringify({ ok: false, error: 'Purge failed' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({ ok: true, message: 'CDN cache purged (no rebuild)', timestamp: new Date().toISOString() }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('revalidate: unexpected error', error);
    return new Response(JSON.stringify({ ok: false, error: String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
