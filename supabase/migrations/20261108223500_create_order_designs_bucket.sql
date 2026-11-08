-- Full-size copies of random-slop print images, saved when an order is paid.
-- Public-domain images, unguessable paths; public so the order email link never expires.
insert into storage.buckets (id, name, public, file_size_limit)
values ('order-designs', 'order-designs', true, 52428800)
on conflict (id) do nothing;
