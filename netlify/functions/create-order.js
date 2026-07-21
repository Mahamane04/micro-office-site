// Enregistre une commande et décrémente le stock.
const { supabase, hasSupabase, json, readBody } = require("./_supabase");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { ok: false, error: "Méthode non autorisée" });

  const b = readBody(event);
  if (!b.reference || !Array.isArray(b.articles)) {
    return json(400, { ok: false, error: "Données de commande incomplètes" });
  }

  // MODE MOCK — pas de base configurée
  if (!hasSupabase) {
    return json(200, { ok: true, reference: b.reference, mock: true });
  }

  try {
    const row = {
      reference: b.reference,
      client_nom: b.client && b.client.nom,
      client_tel: b.client && b.client.tel,
      client_whatsapp: b.client && b.client.whatsapp,
      client_email: b.client && b.client.email,
      adresse: b.client && b.client.adresse,
      note: b.client && b.client.note,
      livraison_zone: b.livraison && b.livraison.zone,
      livraison_frais: b.livraison && b.livraison.frais,
      paiement_mode: b.paiement,
      devise: b.devise,
      articles: b.articles,
      sous_total_xof: b.sousTotalXof || 0,
      total_xof: b.totalXof || 0,
      canal: b.canal || "formulaire",
      statut: "reçue",
    };

    const { error } = await supabase.from("commandes").insert(row);
    if (error) throw error;

    // Décrément atomique du stock
    const items = b.articles.map((a) => ({ slug: a.slug, qty: a.qty }));
    await supabase.rpc("decrementer_stock", { items });

    return json(200, { ok: true, reference: b.reference });
  } catch (e) {
    return json(500, { ok: false, error: "Erreur d'enregistrement", detail: String(e.message || e) });
  }
};
