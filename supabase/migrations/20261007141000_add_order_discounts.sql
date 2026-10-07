-- Record Stripe promotion codes used on each order.
alter table public.orders
  add column amount_discount integer not null default 0,   -- pence
  add column discount_codes text[] not null default '{}';
