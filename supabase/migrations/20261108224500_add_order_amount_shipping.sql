-- Postage the customer paid (pence), included in amount_total.
alter table public.orders add column if not exists amount_shipping integer not null default 0;
