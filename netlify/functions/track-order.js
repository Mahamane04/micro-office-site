// Suivi de commande : référence + téléphone → statut (sans compte).
const { supabase, hasSupabase, json, readBody, digits } = require("./_supabase");

const STATUTS = ["reçue", "confirmée", "préparation", "expédiée", "livrée"];

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { ok: false, error: "Méthode non autorisée" });

  const b = readBody(event);
  const ref = String(b.reference || "").trim().toUpperCase();
  const tel = digits(b.tel);
  if (!ref || !tel) return json(400, { ok: false, error: "Référence et téléphone requis" });

  // MODE MOCK — statut stable dérivé de la référence
  if (!hasSupabase) {
    const idx = (ref.charCodeAt(ref.length - 1) || 0) % STATUTS.length;
    return json(200, {
      ok: true,
      mock: true,
      reference: ref,
      statut: STATUTS[idx],
      created_at: new Date().toISOString(),
      total_xof: 120000,
      livraison_zone: "Bamako",
    });
  }

  try {
    const { data, error } = await supabase
      .from("commandes")
      .select("reference, statut, created_at, total_xof, livraison_zone, client_tel")
      .eq("reference", ref)
      .maybeSingle();
    if (error) throw error;
    if (!data) return json(404, { ok: false, error: "Commande introuvable" });

    // Vérification légère : le téléphone doit correspondre
    if (digits(data.client_tel).slice(-8) !== tel.slice(-8)) {
      return json(403, { ok: false, error: "Le téléphone ne correspond pas à cette commande" });
    }

    return json(200, {
      ok: true,
      reference: data.reference,
      statut: data.statut,
      created_at: data.created_at,
      total_xof: data.total_xof,
      livraison_zone: data.livraison_zone,
    });
  } catch (e) {
    return json(500, { ok: false, error: "Erreur de suivi" });
  }
};
