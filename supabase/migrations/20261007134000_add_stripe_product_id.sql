-- Each tee maps to its own product in the live Stripe account (Product catalogue).
alter table public.products add column stripe_product_id text unique;

update public.products set stripe_product_id = v.pid
from (values
  ('arabic', 'slop_arabic'),
  ('bones', 'slop_bones'),
  ('cali', 'slop_cali'),
  ('manga', 'slop_manga'),
  ('waxy', 'slop_waxy'),
  ('wild-cat-pink', 'slop_wild_cat_pink')
) as v(slug, pid)
where products.slug = v.slug;
