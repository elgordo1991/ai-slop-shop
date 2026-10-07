# slop

Minimal shop for heavyweight black tees — React, TypeScript, Vite and Tailwind on the front,
Supabase for everything else, Stripe Checkout for payments. Hosted on Netlify.

## How it fits together

| Piece | Where |
| --- | --- |
| Products (name, price in pence, photos, sizes) | Supabase table `products` — edit in the Supabase Table Editor |
| Product photos | Supabase Storage bucket `product-images` (source files in `supabase/product-images/`) |
| Checkout | Edge function `create-checkout` builds a Stripe Checkout session from **database** prices |
| Orders | Edge function `stripe-webhook` writes paid orders to the private `orders` table |

Guest checkout only — Stripe collects the email and shipping address.

## Running locally

```bash
cp .env.example .env   # fill in the anon key
npm install
npm run dev
```

## One-time setup

**Supabase → Edge Functions → Secrets**

- `STRIPE_SECRET_KEY` — `sk_test_…` while testing, `sk_live_…` to go live
- `STRIPE_WEBHOOK_SECRET` — `whsec_…` from the webhook below
- `SITE_URL` *(optional)* — defaults to `https://slop-shop.xyz`
- `SHIPPING_COUNTRIES` *(optional)* — comma-separated, defaults to `GB`

**Stripe → Developers → Webhooks → Add endpoint**

- URL: `https://urplirziygoyzsqwtvlt.supabase.co/functions/v1/stripe-webhook`
- Events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`

**Netlify → Site configuration → Environment variables**

- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (as in `.env.example`)

## Adding a product

1. Upload photos to the `product-images` bucket (square, ~1400px WebP works well).
2. Add a row to `products`: `slug`, `name`, `description`, `price` in pence (2000 = £20),
   and `images` as the public URLs, back view first.
3. Set `active` to false to take something off sale.
