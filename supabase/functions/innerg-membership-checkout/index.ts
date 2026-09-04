import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@22.6.1";
import { createClient } from "npm:@supabase/supabase-js@2.112.4";

const allowedOrigins = new Set([
  "https://nasirr.innergintel.org",
  "https://innergclaw.github.io",
  "http://localhost:8000",
  "http://127.0.0.1:8000",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
]);
const MONTHLY_AMOUNT = 1000;
const returnUrl = "https://nasirr.innergintel.org/innergid/?membership=success#member-panel";

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin") ?? "";
  const corsHeaders = {
    "Access-Control-Allow-Origin": allowedOrigins.has(origin) ? origin : "https://nasirr.innergintel.org",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405, headers: corsHeaders });

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const authClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: { user }, error: userError } = await authClient.auth.getUser(token);
  if (userError || !user) return Response.json({ error: "Sign in before activating your INNERG ID." }, { status: 401, headers: corsHeaders });

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const service = createClient(supabaseUrl, serviceKey);
  const { data: membership } = await service
    .from("innerg_memberships")
    .select("status")
    .eq("user_id", user.id)
    .maybeSingle();
  if (membership?.status === "active") {
    return Response.json({ alreadyActive: true, returnUrl: "https://nasirr.innergintel.org/innerg-id/" }, { headers: corsHeaders });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
  if (!stripeKey) return Response.json({ error: "INNERG ID checkout is not configured yet." }, { status: 503, headers: corsHeaders });
  const stripe = new Stripe(stripeKey);
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price_data: { currency: "usd", unit_amount: MONTHLY_AMOUNT, recurring: { interval: "month" }, product_data: { name: "INNERG ID Monthly Access", description: "Monthly INNERG ID access to the member ecosystem, Discord, Research Desk, Media Hub, direct member support, and selected service discounts." } }, quantity: 1 }],
      customer_email: user.email ?? undefined,
      client_reference_id: user.id,
      success_url: returnUrl,
      cancel_url: "https://nasirr.innergintel.org/innergid/#access",
      metadata: { membership_type: "innerg_founding", monthly_amount_cents: String(MONTHLY_AMOUNT), user_id: user.id },
      subscription_data: { metadata: { membership_type: "innerg_founding", user_id: user.id, monthly_amount_cents: String(MONTHLY_AMOUNT) } },
    });
    return Response.json({ url: session.url }, { headers: { ...corsHeaders, "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("INNERG ID checkout failed", error);
    return Response.json({ error: "Stripe could not start checkout. Please try again." }, { status: 502, headers: corsHeaders });
  }
});
