// Renvoie le stock actuel { slug: quantite } pour l'affichage temps réel.
const { supabase, hasSupabase, json } = require("./_supabase");

const MOCK = {
  "air-force-1-low": 12,
  "sneakers-urban-runner": 8,
  "hoodie-premium": 20,
  "tshirt-oversize": 35,
  "casquette-brodee": 25,
  "sac-a-dos-tech": 0,
};

exports.handler = async () => {
  if (!hasSupabase) return json(200, { ok: true, mock: true, stock: MOCK });

  try {
    const { data, error } = await supabase.from("stock").select("slug, quantite");
    if (error) throw error;
    const map = {};
    (data || []).forEach((r) => { map[r.slug] = r.quantite; });
    return json(200, { ok: true, stock: map });
  } catch (e) {
    return json(500, { ok: false, error: "Erreur de stock", stock: {} });
  }
};
