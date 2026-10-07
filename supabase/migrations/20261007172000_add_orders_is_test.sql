alter table public.orders add column is_test boolean not null default false;
comment on column public.orders.is_test is 'Owner test purchase — excluded from stats.';
