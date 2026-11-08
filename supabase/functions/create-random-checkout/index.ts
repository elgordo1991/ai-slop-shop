// Stripe Checkout for a single "random slop" tee: a black tee printed with an
// image from the Public Domain Image Archive. The browser sends only the image id
// and size; the image is looked up again here and the price is set here.
//
// Secrets: STRIPE_SECRET_KEY. Optional: RANDOM_TEE_PRICE (pence, default 2000),
// SITE_URL, SHIPPING_COUNTRIES (same as create-checkout).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@18.5.0";
import { findImage } from "../_shared/pdia.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SIZES = ["s", "m", "l", "xl"];
const SLUG = "random-slop";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// Same rules as create-checkout: only send shoppers back to our own site or a preview.
function returnBase(req: Request): string {
  const site = (Deno.env.get("SITE_URL") ?? "https://slop-shop.xyz").replace(/\/$/, "");
  const origin = req.headers.get("origin");
  if (!origin) return site;
  try {
    const { hostname, protocol } = new URL(origin);
    const local = hostname === "localhost" || hostname === "127.0.0.1";
    const allowed =
      origin === site ||
      local ||
      hostname.endsWith("--slop-shop.netlify.app") ||
      hostname === "slop-shop.netlify.app" ||
      hostname === "www.slop-shop.xyz";
    if (allowed && (protocol === "https:" || local)) return origin;
  } catch { /* fall through */ }
  return site;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY")?.trim();
  if (!stripeKey) return json({ error: "Checkout isn't set up yet. Please try again later." }, 503);

  let imageId: unknown, size: unknown;
  try {
    ({ image_id: imageId, size } = await req.json());
  } catch {
    return json({ error: "Invalid request" }, 400);
  }
  if (typeof imageId !== "string" || typeof size !== "string" || !SIZES.includes(size.toLowerCase())) {
    return json({ error: "Pick a size first" }, 400);
  }
  const sz = size.toLowerCase();

  let image;
  try {
    image = await findImage(imageId);
  } catch (e) {
    console.error("image lookup failed", (e as Error).message);
    return json({ error: "Couldn't reach the image archive. Try again." }, 502);
  }
  if (!image) return json({ error: "That image isn't available any more. Roll again." }, 409);

  const price = Number(Deno.env.get("RANDOM_TEE_PRICE") ?? 2000);
  const countries = (Deno.env.get("SHIPPING_COUNTRIES") ?? "GB")
    .split(",")
    .map((c) => c.trim().toUpperCase())
    .filter(Boolean) as Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry[];

  const name = `random slop — ${image.title}`.slice(0, 120);
  const base = returnBase(req);
  const stripe = new Stripe(stripeKey, { httpClient: Stripe.createFetchHttpClient() });

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{
        quantity: 1,
        price_data: {
          currency: "gbp",
          unit_amount: price,
          product_data: {
            name,
            images: [image.preview_url],
            metadata: { slug: SLUG, design_id: image.id },
          },
        },
      }],
      shipping_address_collection: { allowed_countries: countries },
      phone_number_collection: { enabled: false },
      billing_address_collection: "auto",
      allow_promotion_codes: true,
      // stripe-webhook reads "items" for sizes and design_* for what to print.
      metadata: {
        items: `${SLUG}:${sz}:1`,
        design_id: image.id,
        design_title: image.title.slice(0, 450),
        design_print_url: image.print_url.slice(0, 500),
        design_source_url: image.source_url,
      },
      payment_intent_data: {
        description: `${name} (${sz.toUpperCase()}) x1 — print: ${image.print_url}`.slice(0, 1000),
      },
      success_url: `${base}/?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/?cancelled=random`,
    });
    return json({ url: session.url });
  } catch (e) {
    console.error("stripe session failed", e);
    return json({ error: "Couldn't start checkout. Please try again." }, 502);
  }
});
