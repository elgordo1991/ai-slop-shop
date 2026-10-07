-- "Suggest your slop" ideas from the site. Written only by the suggest-slop edge function.
create table public.suggestions (
  id uuid primary key default gen_random_uuid(),
  text text not null check (char_length(text) between 2 and 280),
  name text check (name is null or char_length(name) <= 60),
  ip_hash text,
  notified_at timestamptz,
  created_at timestamptz not null default now()
);
create index suggestions_ip_recent_idx on public.suggestions (ip_hash, created_at desc);
alter table public.suggestions enable row level security;
-- no policies: only the suggest-slop edge function (service role) reads/writes.
