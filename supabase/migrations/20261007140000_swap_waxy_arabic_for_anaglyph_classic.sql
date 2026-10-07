-- Take waxy and arabic off sale (kept for order history) and add two new tees.
update public.products set active = false where slug in ('waxy', 'arabic');

insert into public.products (slug, name, description, price, images, sort_order, stripe_product_id) values
  ('small-front-anaglyph', 'small front anaglyph', '', 2000, array['https://urplirziygoyzsqwtvlt.supabase.co/storage/v1/object/public/product-images/small-front-anaglyph/front.webp','https://urplirziygoyzsqwtvlt.supabase.co/storage/v1/object/public/product-images/small-front-anaglyph/flat.webp','https://urplirziygoyzsqwtvlt.supabase.co/storage/v1/object/public/product-images/small-front-anaglyph/back.webp'], 70, 'slop_small_front_anaglyph'),
  ('classic', 'classic', '', 2000, array['https://urplirziygoyzsqwtvlt.supabase.co/storage/v1/object/public/product-images/classic/front.webp','https://urplirziygoyzsqwtvlt.supabase.co/storage/v1/object/public/product-images/classic/flat.webp','https://urplirziygoyzsqwtvlt.supabase.co/storage/v1/object/public/product-images/classic/back.webp'], 80, 'slop_classic')
on conflict (slug) do update set
  name = excluded.name, price = excluded.price, images = excluded.images,
  sort_order = excluded.sort_order, stripe_product_id = excluded.stripe_product_id, active = true;
