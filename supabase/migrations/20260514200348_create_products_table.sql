/*
  # Create products table for t-shirt inventory

  1. New Tables
    - `products`
      - `id` (uuid, primary key)
      - `name` (text) - product name
      - `description` (text) - product description
      - `price` (integer) - price in pence
      - `color` (text) - product color (black, white, etc)
      - `images` (text[]) - array of 3 image URLs
      - `stripe_price_id` (text) - Stripe price ID for checkout
      - `active` (boolean) - whether product is for sale
      - `created_at` (timestamp) - creation time
      - `updated_at` (timestamp) - last update time

  2. Security
    - RLS disabled for now (will be public product listing)
    - Consider enabling if you need admin-only product management

  3. Notes
    - Each product has exactly 3 images for the carousel
    - Products are indexed by color for filtering
*/

CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL,
  price integer NOT NULL,
  color text NOT NULL,
  images text[] NOT NULL DEFAULT ARRAY[]::text[],
  stripe_price_id text NOT NULL,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS products_active_idx ON products(active);
CREATE INDEX IF NOT EXISTS products_color_idx ON products(color);
