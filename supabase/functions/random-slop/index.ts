// Picks a random printable image from the Public Domain Image Archive for the
// "random slop" page. GET or POST, optional { exclude: "<id>" } / ?exclude=<id>
// so a re-roll never lands on the same picture.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { randomImage } from "../_shared/pdia.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  let exclude = new URL(req.url).searchParams.get("exclude") ?? undefined;
  if (req.method === "POST") {
    try {
      const body = await req.json();
      if (typeof body?.exclude === "string") exclude = body.exclude;
    } catch { /* empty body is fine */ }
  }

  try {
    return json(await randomImage(exclude));
  } catch (e) {
    console.error("random-slop failed", (e as Error).message);
    return json({ error: "Couldn't find any slop right now. Try again." }, 502);
  }
});
