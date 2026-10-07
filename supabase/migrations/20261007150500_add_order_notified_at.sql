-- When the "new order" email for this order was sent (null = not sent yet).
alter table public.orders add column notified_at timestamptz;
