import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface Product {
  name: string;
  description: string;
  price: number;
  color: string;
  images: string[];
  stripe_price_id: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { method } = req;
    const url = new URL(req.url);
    const path = url.pathname;

    // GET /manage-products - list all products
    if (method === "GET" && path.endsWith("/manage-products")) {
      const { createClient } = await import("npm:@supabase/supabase-js@2.105.4");
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL"),
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
      );

      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST /manage-products - add product (admin only)
    if (method === "POST" && path.endsWith("/manage-products")) {
      const adminSecret = req.headers.get("x-admin-secret");
      const expectedSecret = Deno.env.get("ADMIN_SECRET");

      if (!expectedSecret || adminSecret !== expectedSecret) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const product: Product = await req.json();

      if (!product.name || !product.description || !product.price || !product.images || product.images.length !== 3) {
        return new Response(JSON.stringify({ error: "Invalid product data" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { createClient } = await import("npm:@supabase/supabase-js@2.105.4");
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL"),
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
      );

      const { data, error } = await supabase.from("products").insert([
        {
          name: product.name,
          description: product.description,
          price: product.price,
          color: product.color,
          images: product.images,
          stripe_price_id: product.stripe_price_id,
          active: true,
        },
      ]);

      if (error) throw error;

      return new Response(JSON.stringify({ success: true, data }), {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // DELETE /manage-products/:id - delete product (admin only)
    if (method === "DELETE") {
      const adminSecret = req.headers.get("x-admin-secret");
      const expectedSecret = Deno.env.get("ADMIN_SECRET");

      if (!expectedSecret || adminSecret !== expectedSecret) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const productId = path.split("/").pop();
      if (!productId) {
        return new Response(JSON.stringify({ error: "Product ID required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { createClient } = await import("npm:@supabase/supabase-js@2.105.4");
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL"),
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
      );

      const { error } = await supabase.from("products").delete().eq("id", productId);

      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
