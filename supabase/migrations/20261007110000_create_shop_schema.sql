-- slop shop schema: products (public read), orders (written by the stripe-webhook function only),
-- and a public storage bucket for product photos.

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  price integer not null check (price > 0),          -- pence
  currency text not null default 'gbp',
  color text not null default 'black',
  images text[] not null default '{}',
  sizes text[] not null default array['s','m','l','xl'],
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index products_active_sort_idx on public.products (active, sort_order);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  stripe_session_id text not null unique,
  stripe_payment_intent text,
  email text,
  customer_name text,
  shipping jsonb,
  items jsonb not null default '[]',
  amount_total integer,
  currency text,
  status text not null default 'paid',
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end; $$;

create trigger products_set_updated_at before update on public.products
for each row execute function public.set_updated_at();

alter table public.products enable row level security;
alter table public.orders enable row level security;

-- Anyone can read products that are on sale; writes only via dashboard/service role.
create policy "Public can read active products" on public.products
  for select to anon, authenticated using (active);

-- orders: no policies = only the service role (edge functions) can read/write.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/webp','image/jpeg','image/png']);
