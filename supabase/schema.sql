-- ============================================================
-- Micro Office — Boutique dynamique (Supabase / PostgreSQL)
-- À exécuter une fois dans l'éditeur SQL de votre projet Supabase.
-- ============================================================

-- 1) Table des commandes ------------------------------------------------
create table if not exists public.commandes (
  id             uuid primary key default gen_random_uuid(),
  reference      text unique not null,
  created_at     timestamptz not null default now(),
  client_nom     text,
  client_tel     text,
  client_whatsapp text,
  client_email   text,
  adresse        text,
  note           text,
  livraison_zone  text,
  livraison_frais integer,
  paiement_mode   text,
  devise         text,
  articles       jsonb not null default '[]'::jsonb,
  sous_total_xof integer not null default 0,
  total_xof      integer not null default 0,
  canal          text,                         -- 'whatsapp' | 'formulaire'
  statut         text not null default 'reçue' -- reçue|confirmée|préparation|expédiée|livrée|annulée
);

create index if not exists commandes_reference_idx on public.commandes (reference);

-- 2) Table du stock (une ligne par produit) -----------------------------
create table if not exists public.stock (
  slug       text primary key,
  quantite   integer not null default 0,
  updated_at timestamptz not null default now()
);

-- 3) Décrément atomique du stock à la commande --------------------------
-- items = [{ "slug": "air-force-1-low", "qty": 2 }, ...]
create or replace function public.decrementer_stock(items jsonb)
returns void
language plpgsql
security definer
as $$
declare
  item jsonb;
begin
  for item in select * from jsonb_array_elements(items)
  loop
    update public.stock
      set quantite = greatest(0, quantite - (item->>'qty')::int),
          updated_at = now()
      where slug = item->>'slug';
  end loop;
end;
$$;

-- 4) Row Level Security -------------------------------------------------
alter table public.commandes enable row level security;
alter table public.stock     enable row level security;

-- Le stock est lisible publiquement (affichage temps réel côté site).
drop policy if exists "stock lecture publique" on public.stock;
create policy "stock lecture publique"
  on public.stock for select
  to anon
  using (true);

-- Les commandes ne sont PAS accessibles au public.
-- Toute lecture/écriture passe par les fonctions serverless (clé service).

-- 5) Seed d'exemple du stock (à ajuster) --------------------------------
insert into public.stock (slug, quantite) values
  ('air-force-1-low', 12),
  ('sneakers-urban-runner', 8),
  ('hoodie-premium', 20),
  ('tshirt-oversize', 35),
  ('casquette-brodee', 25),
  ('sac-a-dos-tech', 0)
on conflict (slug) do nothing;
