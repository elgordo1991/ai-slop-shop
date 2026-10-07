-- The six launch tees. Images live in the public `product-images` storage bucket
-- (source files: supabase/product-images/). Price is in pence.
insert into public.products (slug, name, description, price, images, sort_order) values
  ('arabic', 'arabic', 'slop in arabic script, circled in white. back print on heavyweight black.', 2000, array['https://urplirziygoyzsqwtvlt.supabase.co/storage/v1/object/public/product-images/arabic/back.webp','https://urplirziygoyzsqwtvlt.supabase.co/storage/v1/object/public/product-images/arabic/back-close.webp','https://urplirziygoyzsqwtvlt.supabase.co/storage/v1/object/public/product-images/arabic/front.webp'], 10),
  ('bones', 'bones', 'slop spelled out in bone, wrapped in a ring of bones. back print on heavyweight black.', 2000, array['https://urplirziygoyzsqwtvlt.supabase.co/storage/v1/object/public/product-images/bones/back.webp','https://urplirziygoyzsqwtvlt.supabase.co/storage/v1/object/public/product-images/bones/back-close.webp','https://urplirziygoyzsqwtvlt.supabase.co/storage/v1/object/public/product-images/bones/front.webp'], 20),
  ('cali', 'cali', 'old-school blackletter slop in a cream ring. back print on heavyweight black.', 2000, array['https://urplirziygoyzsqwtvlt.supabase.co/storage/v1/object/public/product-images/cali/back.webp','https://urplirziygoyzsqwtvlt.supabase.co/storage/v1/object/public/product-images/cali/back-close.webp','https://urplirziygoyzsqwtvlt.supabase.co/storage/v1/object/public/product-images/cali/front.webp'], 30),
  ('manga', 'manga', 'スロップ in brushstroke katakana, cracked white ring. back print on heavyweight black.', 2000, array['https://urplirziygoyzsqwtvlt.supabase.co/storage/v1/object/public/product-images/manga/back.webp','https://urplirziygoyzsqwtvlt.supabase.co/storage/v1/object/public/product-images/manga/back-close.webp','https://urplirziygoyzsqwtvlt.supabase.co/storage/v1/object/public/product-images/manga/front.webp'], 40),
  ('waxy', 'waxy', 'slop pressed into a red wax seal. back print on heavyweight black.', 2000, array['https://urplirziygoyzsqwtvlt.supabase.co/storage/v1/object/public/product-images/waxy/back.webp'], 50),
  ('wild-cat-pink', 'wild cat pink', 'slop in pink leopard print, ringed to match. back print on heavyweight black.', 2000, array['https://urplirziygoyzsqwtvlt.supabase.co/storage/v1/object/public/product-images/wild-cat-pink/back.webp','https://urplirziygoyzsqwtvlt.supabase.co/storage/v1/object/public/product-images/wild-cat-pink/back-close.webp','https://urplirziygoyzsqwtvlt.supabase.co/storage/v1/object/public/product-images/wild-cat-pink/front.webp'], 60)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  price = excluded.price,
  images = excluded.images,
  sort_order = excluded.sort_order;
