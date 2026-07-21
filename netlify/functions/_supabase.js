// Client Supabase partagé + utilitaires pour les fonctions serverless.
// Si les variables d'environnement Supabase ne sont pas définies, les fonctions
// basculent en MODE MOCK (données simulées) pour permettre les tests sans base.

const { createClient } = require("@supabase/supabase-js");

const URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const hasSupabase = Boolean(URL && SERVICE_KEY);
const supabase = hasSupabase
  ? createClient(URL, SERVICE_KEY, { auth: { persistSession: false } })
  : null;

const HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

function json(statusCode, data) {
  return { statusCode, headers: HEADERS, body: JSON.stringify(data) };
}

function readBody(event) {
  try {
    return JSON.parse(event.body || "{}");
  } catch (e) {
    return {};
  }
}

function adminOk(password) {
  const expected = process.env.ADMIN_PASSWORD || "demo";
  return typeof password === "string" && password === expected;
}

function digits(tel) {
  return String(tel || "").replace(/\D/g, "");
}

module.exports = { supabase, hasSupabase, json, readBody, adminOk, digits };
