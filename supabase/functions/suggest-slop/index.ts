// Receives "suggest your slop" ideas from the site, saves them and emails them to the shop owner.
// The recipient address lives only here (or in the ORDER_EMAIL_TO secret) — never in the website.
//
// Secrets: RESEND_API_KEY (required for the email), ORDER_EMAIL_TO / ORDER_EMAIL_FROM (optional)
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_TEXT = 280;
const MAX_NAME = 60;
const MAX_PER_HOUR = 5; // per visitor

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const esc = (v: unknown) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

async function sha256(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: { text?: unknown; name?: unknown; website?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid request" }, 400);
  }

  // Honeypot: real people never see or fill the "website" field.
  if (typeof body.website === "string" && body.website.trim()) return json({ ok: true });

  const text = typeof body.text === "string" ? body.text.replace(/\s+/g, " ").trim() : "";
  const name = typeof body.name === "string" ? body.name.replace(/\s+/g, " ").trim().slice(0, MAX_NAME) : "";
  if (text.length < 2) return json({ error: "tell us a bit more" }, 400);
  if (text.length > MAX_TEXT) return json({ error: `keep it under ${MAX_TEXT} characters` }, 400);

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const ipHash = await sha256(`slop:${ip}`);
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("suggestions")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .gte("created_at", since);
  if ((count ?? 0) >= MAX_PER_HOUR) return json({ error: "that's a lot of slop — try again later" }, 429);

  const { data: saved, error } = await supabase
    .from("suggestions")
    .insert({ text, name: name || null, ip_hash: ipHash })
    .select("id")
    .single();
  if (error) {
    console.error("suggestion insert failed", error);
    return json({ error: "couldn't save that, please try again" }, 500);
  }

  const key = Deno.env.get("RESEND_API_KEY")?.trim();
  if (key) {
    const to = Deno.env.get("ORDER_EMAIL_TO")?.trim() || "jordan.richards.ta@gmail.com";
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "Idempotency-Key": `suggestion-${saved.id}` },
        body: JSON.stringify({
          from: Deno.env.get("ORDER_EMAIL_FROM")?.trim() || "slop shop <onboarding@resend.dev>",
          to: [to],
          subject: `Slop suggestion: ${text.slice(0, 60)}${text.length > 60 ? "…" : ""}`,
          text: `Slop suggestion\n\n"${text}"\n\nFrom: ${name || "anonymous"}`,
          html: `<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;color:#111">
  <h2 style="font-weight:500;margin:0 0 16px">Slop suggestion</h2>
  <blockquote style="margin:0 0 16px;padding:12px 16px;border-left:3px solid #111;background:#f5f5f4;font-size:17px">${esc(text)}</blockquote>
  <p style="color:#666;margin:0">From: ${esc(name || "anonymous")}</p>
</div>`,
        }),
      });
      if (res.ok) {
        await supabase.from("suggestions").update({ notified_at: new Date().toISOString() }).eq("id", saved.id);
      } else {
        console.error("suggestion email failed", res.status, await res.text());
      }
    } catch (e) {
      console.error("suggestion email error", (e as Error).message);
    }
  }

  return json({ ok: true });
});
