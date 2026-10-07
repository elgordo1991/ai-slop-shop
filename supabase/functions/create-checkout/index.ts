// Creates a Stripe Checkout session for the items in the bag.
// Prices, names and images are read from the products table — never trusted from the browser.
//
// Secrets (Supabase dashboard → Edge Functions → Secrets):
//   STRIPE_SECRET_KEY   sk_test_... or sk_live_...
//   SITE_URL            optional, defaults to https://slop-shop.xyz
//   SHIPPING_COUNTRIES  optional, comma-separated ISO codes, defaults to GB
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_QTY_PER_LINE = 10;
const MAX_LINES = 20;

type BagItem = { product_id: string; size: string; quantity: number };

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Only send shoppers back to our own site (or a local/preview build).
function returnBase(req: Request): string {
  const site = (Deno.env.get("SITE_URL") ?? "https://slop-shop.xyz").replace(/\/$/, "");
  const origin = req.headers.get("origin");
  if (!origin) return site;
  try {
    const { hostname, protocol } = new URL(origin);
    const allowed =
      origin === site ||
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname.endsWith("--slop-shop.netlify.app") ||
      hostname === "slop-shop.netlify.app" ||
      hostname === "www.slop-shop.xyz";
    if (allowed && (protocol === "https:" || hostname === "localhost" || hostname === "127.0.0.1")) {
      return origin;
    }
  } catch { /* fall through */ }
  return site;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY")?.trim();
  if (!stripeKey) return json({ error: "Checkout isn't set up yet. Please try again later." }, 503);

  let items: BagItem[];
  try {
    ({ items } = await req.json());
  } catch {
    return json({ error: "Invalid request" }, 400);
  }

  if (!Array.isArray(items) || items.length === 0 || items.length > MAX_LINES) {
    return json({ error: "Your bag is empty" }, 400);
  }
  for (const it of items) {
    if (
      typeof it?.product_id !== "string" ||
      typeof it?.size !== "string" ||
      !Number.isInteger(it?.quantity) ||
      it.quantity < 1 ||
      it.quantity > MAX_QTY_PER_LINE
    ) {
      return json({ error: "Invalid item in bag" }, 400);
    }
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const ids = [...new Set(items.map((i) => i.product_id))];
  const { data: products, error } = await supabase
    .from("products")
    .select("id, slug, name, price, currency, images, sizes, stripe_product_id")
    .in("id", ids)
    .eq("active", true);

  if (error) {
    console.error("products lookup failed", error);
    return json({ error: "Couldn't load products" }, 500);
  }

  const byId = new Map(products.map((p) => [p.id, p]));
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
  const summary: string[] = []; // e.g. "bones (M) x2" — shown on the payment in Stripe
  const sizing: string[] = []; // e.g. "bones:m:2" — read back by stripe-webhook

  for (const it of items) {
    const p = byId.get(it.product_id);
    if (!p) return json({ error: "One of the items in your bag is no longer available" }, 409);
    const size = it.size.toLowerCase();
    if (!p.sizes.includes(size)) return json({ error: `${p.name} isn't available in ${size}` }, 409);

    // Each tee is its own product in Stripe (stripe_product_id); the price comes from the
    // products table so the site and checkout can never disagree.
    lineItems.push({
      quantity: it.quantity,
      price_data: p.stripe_product_id
        ? { currency: p.currency, unit_amount: p.price, product: p.stripe_product_id }
        : {
            currency: p.currency,
            unit_amount: p.price,
            product_data: { name: p.name, images: p.images.slice(0, 1), metadata: { supabase_id: p.id, slug: p.slug } },
          },
    });
    summary.push(`${p.name} (${size.toUpperCase()}) x${it.quantity}`);
    sizing.push(`${p.slug}:${size}:${it.quantity}`);
  }

  const countries = (Deno.env.get("SHIPPING_COUNTRIES") ?? "GB")
    .split(",")
    .map((c) => c.trim().toUpperCase())
    .filter(Boolean) as Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry[];

  const base = returnBase(req);
  const stripe = new Stripe(stripeKey, { httpClient: Stripe.createFetchHttpClient() });

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      shipping_address_collection: { allowed_countries: countries },
      phone_number_collection: { enabled: false },
      billing_address_collection: "auto",
      // Shows "Add promotion code" on the Stripe page; codes are managed in the Stripe dashboard.
      allow_promotion_codes: true,
      // Sizes live here because line items point at the product, not a per-size variant.
      metadata: { items: sizing.join(",").slice(0, 500) },
      payment_intent_data: { description: summary.join(", ").slice(0, 1000) },
      success_url: `${base}/?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/?cancelled=true`,
    });
    return json({ url: session.url });
  } catch (e) {
    console.error("stripe session failed", e);
    return json({ error: "Couldn't start checkout. Please try again." }, 502);
  }
});
