// Netlify function to handle ISR revalidation
// Triggered by Airtable webhooks or scheduled tasks

import type { Context } from '@netlify/functions';
import { invalidateProduitsCache, invalidateProjetsCache, invalidateConfigCache } from '../../src/lib/data';

const WEBHOOK_SECRET = process.env.NETLIFY_ISR_SECRET || 'dev-secret';

interface WebhookPayload {
  table?: string;
  action?: string;
  record?: {
    id: string;
    slug?: string;
    nom?: string;
  };
  timestamp?: string;
}

export default async (req: Request, context: Context) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    // Verify webhook secret
    const providedSecret = req.headers.get('x-webhook-secret');
    if (providedSecret !== WEBHOOK_SECRET) {
      console.warn('Invalid webhook secret');
      return new Response('Unauthorized', { status: 401 });
    }

    // Parse payload
    let payload: WebhookPayload;
    try {
      const body = await req.text();
      payload = JSON.parse(body);
    } catch (error) {
      console.error('Failed to parse webhook payload:', error);
      return new Response('Invalid JSON', { status: 400 });
    }

    console.log('Webhook received:', {
      table: payload.table,
      action: payload.action,
      slug: payload.record?.slug,
    });

    const revalidatedPaths: string[] = [];

    // Handle table-specific revalidation
    if (payload.table === 'Produits') {
      invalidateProduitsCache();
      revalidatedPaths.push('/boutique/');
      if (payload.record?.slug) {
        revalidatedPaths.push(`/boutique/${payload.record.slug}/`);
      }
    } else if (payload.table === 'Projets') {
      invalidateProjetsCache();
      revalidatedPaths.push('/realisations/');
      if (payload.record?.slug) {
        revalidatedPaths.push(`/realisations/${payload.record.slug}/`);
      }
    } else if (payload.table === 'Configuration') {
      invalidateConfigCache();
      revalidatedPaths.push('/');
    } else if (payload.table === 'TTL' || payload.action === 'periodic') {
      // Periodic TTL revalidation
      invalidateProduitsCache();
      invalidateProjetsCache();
      invalidateConfigCache();
      revalidatedPaths.push('/boutique/', '/realisations/', '/');
    }

    console.log('Cache invalidated for paths:', revalidatedPaths);

    // Return success response
    return new Response(
      JSON.stringify({
        ok: true,
        message: 'Revalidation triggered',
        revalidatedPaths,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Revalidation error:', error);
    return new Response(
      JSON.stringify({
        ok: false,
        error: String(error),
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
