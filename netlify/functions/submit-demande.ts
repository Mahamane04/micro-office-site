// Netlify function: writes a project request (from /presenter-mon-projet/) to
// the Airtable "Demandes" table. Runs server-side so the Airtable token is
// never exposed to the browser. Files are already uploaded to Cloudinary
// client-side (unsigned preset) before this is called — we only receive URLs.

import type { Context } from '@netlify/functions';

const AIRTABLE_TOKEN = process.env.AIRTABLE_API_TOKEN;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const TABLE_NAME = 'Demandes';

interface DemandePayload {
  typeBesoin?: string;
  description?: string;
  objectif?: string;
  ville?: string;
  delai?: string;
  budget?: string;
  fichiers?: string[]; // Cloudinary secure_urls
  nom?: string;
  entreprise?: string;
  telephone?: string;
  whatsapp?: string;
  email?: string;
  contactPrefere?: string;
}

export default async (req: Request, _context: Context) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  if (!AIRTABLE_TOKEN || !AIRTABLE_BASE_ID) {
    console.error('submit-demande: Airtable not configured');
    return new Response(JSON.stringify({ error: 'Server not configured' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: DemandePayload;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Mirror the HTML form's required fields
  if (!body.nom || !body.telephone || !body.email || !body.description || !body.typeBesoin || !body.contactPrefere) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const fields: Record<string, unknown> = {
    Statut: 'Nouveau',
    Nom: body.nom,
    Entreprise: body.entreprise || undefined,
    Téléphone: body.telephone,
    WhatsApp: body.whatsapp || undefined,
    'E-mail': body.email,
    'Moyen de contact préféré': body.contactPrefere,
    'Type de besoin': body.typeBesoin,
    'Description du projet': body.description,
    'Objectif recherché': body.objectif || undefined,
    'Ville ou zone': body.ville || undefined,
    'Délai souhaité': body.delai || undefined,
    'Budget indicatif': body.budget || undefined,
  };

  if (body.fichiers && body.fichiers.length > 0) {
    fields['Fichiers joints'] = body.fichiers.map((url) => ({ url }));
  }

  try {
    const response = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(TABLE_NAME)}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${AIRTABLE_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ records: [{ fields }] }),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error('submit-demande: Airtable error', error);
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
    console.error('submit-demande: unexpected error', error);
    return new Response(JSON.stringify({ error: 'Unexpected error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
