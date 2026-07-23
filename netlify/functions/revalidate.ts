// Netlify function: instant cache purge triggered by an Airtable Automation
// (or any authenticated caller). Any edit takes effect immediately instead
// of waiting for the s-maxage/stale-while-revalidate window in netlify.toml.
//
// Why this purges via the Netlify API instead of clearing an in-memory
// cache: on Netlify each function invocation can run in a different,
// isolated process. A JS Map cleared inside THIS function's memory has no
// effect on the separate process serving actual page requests — the old
// version of this file did that and silently did nothing. Purging
// Netlify's CDN via its API is the mechanism that actually works across
// serverless instances.

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

  // Payload is informational only (which table/record triggered this) —
  // logged for visibility, but the purge itself is whole-site (simplest
  // correct option on the free plan, which has no per-path cache tags set up).
  let payload: Record<string, unknown> = {};
  try {
    payload = await req.json();
  } catch {
    // No/invalid body is fine — still purge.
  }

  try {
    const res = await fetch('https://api.netlify.com/api/v1/purge', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PURGE_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ site_id: SITE_ID }),
    });

    if (!res.ok) {
      const error = await res.text().catch(() => '');
      console.error('revalidate: Netlify purge failed', res.status, error);
      return new Response(JSON.stringify({ ok: false, error: 'Purge failed' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log('revalidate: purge triggered', { table: payload.table, timestamp: new Date().toISOString() });

    return new Response(
      JSON.stringify({ ok: true, message: 'Site cache purge triggered', timestamp: new Date().toISOString() }),
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
