create table public.page_views (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  path text not null,
  referrer_host text,
  visitor_hash text not null,
  device text
);
create index page_views_created_at_idx on public.page_views (created_at);
alter table public.page_views enable row level security;
comment on table public.page_views is 'Cookie-free page view log written by the track edge function. visitor_hash = sha256(daily salt + IP + user agent), rotates daily.';
