// Receives Stripe events and records paid orders in the `orders` table.
//
// Stripe dashboard → Developers → Webhooks → Add endpoint:
//   URL:    https://<project-ref>.supabase.co/functions/v1/stripe-webhook
//   Events: checkout.session.completed, checkout.session.async_payment_succeeded
//
// Secrets: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET (whsec_...)
// Optional: RESEND_API_KEY (+ ORDER_EMAIL_TO) to email each new order for manual
// fulfilment in Tapstitch.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const cryptoProvider = Stripe.createSubtleCryptoProvider();

type OrderItem = { name: string | null; size: string | null; quantity: number | null };
type Address = {
  line1?: string | null; line2?: string | null; city?: string | null;
  state?: string | null; postal_code?: string | null; country?: string | null;
};

const esc = (v: unknown) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const money = (pence: number | null | undefined) => `£${((pence ?? 0) / 100).toFixed(2)}`;

// Emails the order laid out for copying into Tapstitch. Never throws.
async function sendOrderEmail(order: {
  sessionId: string; paymentIntent: string | null; email: string | null; name: string | null;
  address: Address | null; items: OrderItem[]; total: number | null; discount: number; codes: string[];
}): Promise<boolean> {
  const key = Deno.env.get("RESEND_API_KEY")?.trim();
  if (!key) return false;
  const to = Deno.env.get("ORDER_EMAIL_TO")?.trim() || "jordan.richards.ta@gmail.com";

  const a = order.address ?? {};
  const addressLines = [order.name, a.line1, a.line2, a.city, a.state, a.postal_code, a.country].filter(Boolean);
  const itemCount = order.items.reduce((n, i) => n + (i.quantity ?? 0), 0);
  const itemRows = order.items
    .map((i) => `<tr><td style="padding:6px 12px 6px 0">${esc(i.name)}</td><td style="padding:6px 12px 6px 0"><b>${esc((i.size ?? "?").toUpperCase())}</b></td><td style="padding:6px 0">× ${esc(i.quantity)}</td></tr>`)
    .join("");
  const stripeLink = order.paymentIntent ? `https://dashboard.stripe.com/payments/${order.paymentIntent}` : null;

  const html = `<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;color:#111">
  <h2 style="font-weight:500;margin:0 0 4px">New slop order — ${itemCount} ${itemCount === 1 ? "tee" : "tees"}</h2>
  <p style="color:#666;margin:0 0 20px">Place this in Tapstitch.</p>
  <h3 style="font-size:13px;text-transform:uppercase;letter-spacing:.08em;color:#888;margin:0 0 6px">Items</h3>
  <table style="border-collapse:collapse;margin-bottom:20px">${itemRows}</table>
  <h3 style="font-size:13px;text-transform:uppercase;letter-spacing:.08em;color:#888;margin:0 0 6px">Ship to</h3>
  <p style="margin:0 0 20px;line-height:1.5">${addressLines.map(esc).join("<br>")}</p>
  <h3 style="font-size:13px;text-transform:uppercase;letter-spacing:.08em;color:#888;margin:0 0 6px">Customer</h3>
  <p style="margin:0 0 20px">${esc(order.email)}</p>
  <p style="margin:0 0 4px">Paid: <b>${money(order.total)}</b>${order.discount ? ` (discount ${money(order.discount)}${order.codes.length ? `, code ${esc(order.codes.join(", "))}` : ""})` : ""}</p>
  ${stripeLink ? `<p style="margin:16px 0 0"><a href="${stripeLink}">View payment in Stripe</a></p>` : ""}
</div>`;

  const text = [
    `New slop order — place this in Tapstitch`,
    ``,
    `ITEMS`,
    ...order.items.map((i) => `- ${i.name} | size ${(i.size ?? "?").toUpperCase()} | x${i.quantity}`),
    ``,
    `SHIP TO`,
    ...addressLines,
    ``,
    `CUSTOMER: ${order.email ?? ""}`,
    `PAID: ${money(order.total)}${order.discount ? ` (discount ${money(order.discount)} ${order.codes.join(", ")})` : ""}`,
    stripeLink ? `STRIPE: ${stripeLink}` : "",
  ].join("\n");

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "Idempotency-Key": `order-${order.sessionId}` },
      body: JSON.stringify({
        from: Deno.env.get("ORDER_EMAIL_FROM")?.trim() || "slop orders <onboarding@resend.dev>",
        to: [to],
        subject: `New order: ${order.items.map((i) => `${i.name} ${(i.size ?? "").toUpperCase()}${(i.quantity ?? 1) > 1 ? ` x${i.quantity}` : ""}`).join(", ")} → ${order.name ?? "customer"}`,
        html,
        text,
      }),
    });
    if (!res.ok) {
      console.error("order email failed", res.status, await res.text());
      return false;
    }
    return true;
  } catch (e) {
    console.error("order email error", (e as Error).message);
    return false;
  }
}

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
    expand: ["line_items.data.price.product", "discounts.promotion_code"],
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

  const discountCodes = (session.discounts ?? [])
    .map((d) => (typeof d.promotion_code === "object" ? d.promotion_code?.code : null))
    .filter((c): c is string => !!c);

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
      amount_discount: session.total_details?.amount_discount ?? 0,
      discount_codes: discountCodes,
      currency: session.currency,
      status: "paid",
    },
    { onConflict: "stripe_session_id" },
  );

  if (error) {
    console.error("order insert failed", error);
    return new Response("DB error", { status: 500 }); // Stripe will retry
  }

  // Email the order once (Stripe can deliver the same event more than once).
  const { data: saved } = await supabase
    .from("orders")
    .select("notified_at")
    .eq("stripe_session_id", session.id)
    .single();

  if (saved && !saved.notified_at) {
    const sent = await sendOrderEmail({
      sessionId: session.id,
      paymentIntent:
        typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null,
      email: session.customer_details?.email ?? null,
      name: shipping?.name ?? session.customer_details?.name ?? null,
      address: (shipping?.address as Address | undefined) ?? null,
      items,
      total: session.amount_total,
      discount: session.total_details?.amount_discount ?? 0,
      codes: discountCodes,
    });
    if (sent) {
      await supabase.from("orders").update({ notified_at: new Date().toISOString() }).eq("stripe_session_id", session.id);
    }
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
});
