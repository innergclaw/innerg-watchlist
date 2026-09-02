import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.4";

const allowedOrigins = new Set([
  "https://innergclaw.github.io",
  "http://localhost:8000",
  "http://127.0.0.1:8000",
]);

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin") ?? "";
  const corsHeaders = {
    "Access-Control-Allow-Origin": allowedOrigins.has(origin) ? origin : "https://innergclaw.github.io",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const authClient = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: { user }, error: userError } = await authClient.auth.getUser(token);
  if (userError || !user) {
    return Response.json({ error: "Sign in before payment." }, { status: 401, headers: corsHeaders });
  }

  const { data: membership } = await authClient
    .from("watchlist_memberships")
    .select("status")
    .eq("user_id", user.id)
    .maybeSingle();
  if (membership?.status === "active") {
    return Response.json({ status: "active" }, { headers: corsHeaders });
  }

  const paymentLink = Deno.env.get("STRIPE_PAYMENT_LINK_URL") ?? "";
  if (!paymentLink) {
    return Response.json({ error: "Payment setup is not available yet." }, { status: 503, headers: corsHeaders });
  }

  let checkoutUrl: URL;
  try {
    checkoutUrl = new URL(paymentLink);
    if (checkoutUrl.hostname !== "buy.stripe.com") throw new Error("Invalid payment host");
  } catch {
    return Response.json({ error: "Payment setup needs attention." }, { status: 503, headers: corsHeaders });
  }
  checkoutUrl.searchParams.set("client_reference_id", user.id);
  if (user.email) checkoutUrl.searchParams.set("prefilled_email", user.email);
  return Response.json({ url: checkoutUrl.toString() }, { headers: { ...corsHeaders, "Cache-Control": "private, no-store" } });
});
