// Liste des commandes pour le mini-admin (protégé par mot de passe).
const { supabase, hasSupabase, json, readBody, adminOk } = require("./_supabase");

const MOCK = [
  {
    reference: "MO-DEMO01", statut: "reçue", created_at: new Date().toISOString(),
    client_nom: "Aïcha Traoré", client_tel: "+223 70 00 00 00", total_xof: 120000,
    livraison_zone: "Bamako", paiement_mode: "À la livraison", canal: "whatsapp",
    articles: [{ nom: "Air Force 1 Low", taille: "42", couleur: "Blanc", qty: 2, prixXof: 59000 }],
  },
  {
    reference: "MO-DEMO02", statut: "expédiée", created_at: new Date(Date.now() - 86400000).toISOString(),
    client_nom: "Moussa Koné", client_tel: "+223 66 12 34 56", total_xof: 27000,
    livraison_zone: "Autres régions du Mali", paiement_mode: "Orange Money", canal: "formulaire",
    articles: [{ nom: "Hoodie Premium", taille: "L", couleur: "Rouge", qty: 1, prixXof: 25000 }],
  },
];

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { ok: false, error: "Méthode non autorisée" });
  const b = readBody(event);
  if (!adminOk(b.password)) return json(401, { ok: false, error: "Mot de passe incorrect" });

  if (!hasSupabase) return json(200, { ok: true, mock: true, commandes: MOCK });

  try {
    const { data, error } = await supabase
      .from("commandes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    return json(200, { ok: true, commandes: data || [] });
  } catch (e) {
    return json(500, { ok: false, error: "Erreur de chargement" });
  }
};
