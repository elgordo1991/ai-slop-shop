// Receives Stripe events and records paid orders in the `orders` table.
//
// Stripe dashboard → Developers → Webhooks → Add endpoint:
//   URL:    https://<project-ref>.supabase.co/functions/v1/stripe-webhook
//   Events: checkout.session.completed, checkout.session.async_payment_succeeded
//
// Secrets: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET (whsec_...)
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const cryptoProvider = Stripe.createSubtleCryptoProvider();

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY")?.trim();
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")?.trim();
  if (!stripeKey || !webhookSecret) return new Response("Not configured", { status: 503 });

  const stripe = new Stripe(stripeKey, { httpClient: Stripe.createFetchHttpClient() });
  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret, undefined, cryptoProvider);
  } catch (e) {
    console.error("bad signature", (e as Error).message);
    return new Response("Invalid signature", { status: 400 });
  }

  if (
    event.type !== "checkout.session.completed" &&
    event.type !== "checkout.session.async_payment_succeeded"
  ) {
    return new Response(JSON.stringify({ received: true }), { status: 200 });
  }

  const base = event.data.object as Stripe.Checkout.Session;
  // Only record once the money is in (card payments are "paid" immediately).
  if (base.payment_status !== "paid") {
    return new Response(JSON.stringify({ received: true, pending: true }), { status: 200 });
  }

  const session = await stripe.checkout.sessions.retrieve(base.id, {
    expand: ["line_items.data.price.product"],
  });

  // Sizes come from session metadata ("slug:size:qty,..."); amounts from the line items.
  const sized = (session.metadata?.items ?? "")
    .split(",")
    .filter(Boolean)
    .map((entry) => {
      const [slug, size, qty] = entry.split(":");
      return { slug, size, quantity: Number(qty) };
    });

  const lines = (session.line_items?.data ?? []).map((li) => {
    const product = li.price?.product as Stripe.Product | undefined;
    return {
      stripe_product_id: product?.id ?? null,
      // Older sessions stored these on an ad-hoc product
      slug: product?.metadata?.slug ?? null,
      product_id: product?.metadata?.supabase_id ?? product?.metadata?.product_id ?? null,
      legacy_size: product?.metadata?.size ?? null,
      name: li.description,
      quantity: li.quantity,
      unit_amount: li.price?.unit_amount ?? null,
      amount_total: li.amount_total,
    };
  });

  const items = sized.length
    ? sized.map((s) => {
        const line = lines.find((l) => l.slug === s.slug);
        return {
          product_id: line?.product_id ?? null,
          stripe_product_id: line?.stripe_product_id ?? null,
          slug: s.slug,
          name: line?.name ?? s.slug,
          size: s.size,
          quantity: s.quantity,
          unit_amount: line?.unit_amount ?? null,
        };
      })
    : lines.map(({ legacy_size, ...l }) => ({ ...l, size: legacy_size }));

  const shipping =
    session.collected_information?.shipping_details ??
    (session as unknown as { shipping_details?: Stripe.Checkout.Session.CollectedInformation.ShippingDetails }).shipping_details ??
    null;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { error } = await supabase.from("orders").upsert(
    {
      stripe_session_id: session.id,
      stripe_payment_intent:
        typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null,
      email: session.customer_details?.email ?? null,
      customer_name: shipping?.name ?? session.customer_details?.name ?? null,
      shipping,
      items,
      amount_total: session.amount_total,
      currency: session.currency,
      status: "paid",
    },
    { onConflict: "stripe_session_id" },
  );

  if (error) {
    console.error("order insert failed", error);
    return new Response("DB error", { status: 500 }); // Stripe will retry
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
});
