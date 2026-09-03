import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@22.6.1";
import { createClient } from "npm:@supabase/supabase-js@2.112.4";

const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";
const expectedPaymentLinkId = Deno.env.get("STRIPE_PAYMENT_LINK_ID") ?? "";
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const text = (value: unknown) => typeof value === "string" ? value : value && typeof value === "object" && "id" in value ? String(value.id) : null;

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  if (!stripeKey || !webhookSecret || !expectedPaymentLinkId) return new Response("Stripe is not configured", { status: 503 });
  const stripe = new Stripe(stripeKey);

  const signature = req.headers.get("stripe-signature") ?? "";
  const rawBody = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const service = createClient(url, serviceKey);

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.client_reference_id ?? "";
    const isFounding = session.metadata?.membership_type === "innerg_founding";
    if (!uuidPattern.test(userId) || session.payment_status === "unpaid") {
      return Response.json({ received: true });
    }
    if (isFounding) {
      const amount = Number(session.metadata?.monthly_amount_cents ?? 0);
      if (!Number.isInteger(amount) || amount < 700 || amount > 1400) return Response.json({ received: true });
      const { error } = await service.from("innerg_memberships").upsert({
        user_id: userId,
        membership_number: `INNERG-${crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase()}`,
        status: "active",
        membership_type: "founding",
        monthly_amount_cents: amount,
        stripe_checkout_session_id: session.id,
        stripe_customer_id: text(session.customer),
        stripe_subscription_id: text(session.subscription),
        joined_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
      if (error) return new Response("Membership update failed", { status: 500 });
      await service.from("watchlist_memberships").upsert({
        user_id: userId, status: "active", access_source: "innerg_membership",
        stripe_checkout_session_id: session.id, stripe_customer_id: text(session.customer),
        stripe_subscription_id: text(session.subscription), paid_at: new Date().toISOString(),
        access_granted_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
      return Response.json({ received: true });
    }
    if (text(session.payment_link) !== expectedPaymentLinkId) return Response.json({ received: true });
    const { error } = await service.from("watchlist_memberships").upsert({
      user_id: userId,
      status: "active",
      access_source: "stripe",
      stripe_checkout_session_id: session.id,
      stripe_customer_id: text(session.customer),
      stripe_subscription_id: text(session.subscription),
      stripe_payment_intent_id: text(session.payment_intent),
      paid_at: new Date().toISOString(),
      access_granted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    if (error) return new Response("Membership update failed", { status: 500 });
  }

  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;
    await service.from("watchlist_memberships").update({ status: "canceled", updated_at: new Date().toISOString() }).eq("stripe_subscription_id", subscription.id);
    await service.from("innerg_memberships").update({ status: "canceled", updated_at: new Date().toISOString() }).eq("stripe_subscription_id", subscription.id);
  }

  if (event.type === "invoice.payment_failed" || event.type === "invoice.paid") {
    const invoice = event.data.object as Stripe.Invoice;
    const subscriptionId = text(invoice.parent?.subscription_details?.subscription);
    if (subscriptionId) {
      await service.from("watchlist_memberships")
        .update({ status: event.type === "invoice.paid" ? "active" : "past_due", updated_at: new Date().toISOString() })
        .eq("stripe_subscription_id", subscriptionId);
      await service.from("innerg_memberships")
        .update({ status: event.type === "invoice.paid" ? "active" : "past_due", updated_at: new Date().toISOString() })
        .eq("stripe_subscription_id", subscriptionId);
    }
  }

  return Response.json({ received: true });
});
