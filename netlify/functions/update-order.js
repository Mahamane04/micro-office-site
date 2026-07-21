// Met à jour le statut d'une commande (mini-admin, protégé par mot de passe).
const { supabase, hasSupabase, json, readBody, adminOk } = require("./_supabase");

const STATUTS = ["reçue", "confirmée", "préparation", "expédiée", "livrée", "annulée"];

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { ok: false, error: "Méthode non autorisée" });
  const b = readBody(event);
  if (!adminOk(b.password)) return json(401, { ok: false, error: "Mot de passe incorrect" });

  const ref = String(b.reference || "").trim().toUpperCase();
  const statut = String(b.statut || "").trim();
  if (!ref || STATUTS.indexOf(statut) === -1) return json(400, { ok: false, error: "Paramètres invalides" });

  if (!hasSupabase) return json(200, { ok: true, mock: true, reference: ref, statut });

  try {
    const { error } = await supabase.from("commandes").update({ statut }).eq("reference", ref);
    if (error) throw error;
    return json(200, { ok: true, reference: ref, statut });
  } catch (e) {
    return json(500, { ok: false, error: "Erreur de mise à jour" });
  }
};
