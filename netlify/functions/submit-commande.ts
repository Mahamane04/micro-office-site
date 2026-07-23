// Netlify function: writes a boutique order to the Airtable "CommandesBoutique"
// table. No online payment — the client contacts the customer to confirm.
// Runs server-side so the Airtable token is never exposed to the browser.

import type { Context } from '@netlify/functions';

const AIRTABLE_TOKEN = process.env.AIRTABLE_API_TOKEN;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const TABLE_NAME = 'CommandesBoutique';

interface CommandePayload {
  reference?: string;
  produit?: string;
  slug?: string;
  quantite?: number;
  prixUnitaire?: number;
  total?: number;
  nomClient?: string;
  telephone?: string;
  ville?: string;
  note?: string;
  canal?: 'whatsapp' | 'formulaire';
}

export default async (req: Request, _context: Context) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  if (!AIRTABLE_TOKEN || !AIRTABLE_BASE_ID) {
    console.error('submit-commande: Airtable not configured');
    return new Response(JSON.stringify({ error: 'Server not configured' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: CommandePayload;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!body.produit || !body.reference) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const fields: Record<string, unknown> = {
    'Référence': body.reference,
    Statut: 'Nouvelle',
    Produit: body.produit,
    'Slug produit': body.slug || undefined,
    'Quantité': body.quantite || 1,
    'Prix unitaire': body.prixUnitaire || undefined,
    Total: body.total || undefined,
    'Nom client': body.nomClient || undefined,
    'Téléphone': body.telephone || undefined,
    Ville: body.ville || undefined,
    Note: body.note || undefined,
    Canal: body.canal || 'whatsapp',
  };

  try {
    const response = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(TABLE_NAME)}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${AIRTABLE_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ records: [{ fields }], typecast: true }),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error('submit-commande: Airtable error', error);
      return new Response(JSON.stringify({ error: 'Airtable write failed' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    return new Response(JSON.stringify({ ok: true, id: data.records?.[0]?.id }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('submit-commande: unexpected error', error);
    return new Response(JSON.stringify({ error: 'Unexpected error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
