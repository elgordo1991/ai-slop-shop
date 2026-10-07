// Cookie-free page view counter for slop-shop.xyz.
// Visitors are identified only by a hash of (daily salt + IP + user agent), so the
// same person counts once per day and nothing personal is stored.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BOT = /bot|crawl|spider|slurp|preview|headless|lighthouse|facebookexternalhit|embedly|whatsapp|telegram|discord|monitor|curl|wget|python|go-http/i;

const ok = () => new Response(null, { status: 204, headers: corsHeaders });

async function sha256(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  const ua = req.headers.get("user-agent") ?? "";
  if (!ua || BOT.test(ua)) return ok();

  let body: { path?: unknown; referrer?: unknown };
  try {
    body = await req.json();
  } catch {
    return ok();
  }

  const path = typeof body.path === "string" ? body.path.split("?")[0].slice(0, 200) || "/" : "/";
  let referrerHost: string | null = null;
  if (typeof body.referrer === "string" && body.referrer) {
    try {
      const h = new URL(body.referrer).hostname.replace(/^www\./, "");
      if (h && !h.endsWith("slop-shop.xyz") && !h.endsWith("netlify.app")) referrerHost = h.slice(0, 100);
    } catch { /* ignore */ }
  }
  const device = /mobi|android|iphone|ipad/i.test(ua) ? "mobile" : "desktop";

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const day = new Date().toISOString().slice(0, 10);
  const salt = (Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "").slice(-24);
  const visitorHash = (await sha256(`${salt}:${day}:${ip}:${ua}`)).slice(0, 32);

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { error } = await supabase.from("page_views").insert({ path, referrer_host: referrerHost, visitor_hash: visitorHash, device });
  if (error) console.error("page view insert failed", error.message);
  return ok();
});
