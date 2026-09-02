# InnerG Market Watchlist

A paid member research view for Nasirr's Home Base ecosystem. Public visitors see one asset from each sector and the weekly market movers. A person creates a shared Home Base account, completes payment through Stripe, and then receives full access.

## Data updates

GitHub Actions builds `data/watchlist-preview.json` about every 30 minutes during U.S. market hours. The public snapshot includes one asset per sector, the three weekly leaders, and seven-session chart data. The page checks for a newer preview every 60 seconds. The full 30-asset snapshot is stored in Supabase and returned only through the authenticated `member-watchlist` Edge Function.

Google and email/password sign-in use the same Supabase project as the other Home Base member sites. Account creation and paid access are separate states. The protected data function checks paid access on every request. The Robinhood referral remains public.

## Stripe activation

Stripe uses a Payment Link and a signed webhook. The checkout function adds the signed-in Supabase user ID as Stripe's `client_reference_id`. Stripe sends that value back in the signed payment event. The webhook then activates the matching membership. No shareable access code is used.

Set these Supabase Edge Function secrets before opening checkout:

- `STRIPE_PAYMENT_LINK_URL`
- `STRIPE_PAYMENT_LINK_ID`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

Set the Stripe Payment Link redirect to:

`https://innergclaw.github.io/innerg-watchlist/?payment=success#member-access`

Send these events to:

`https://zkyhhoxcrjkhywblzehr.supabase.co/functions/v1/watchlist-stripe-webhook`

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `invoice.paid`
- `invoice.payment_failed`
- `customer.subscription.deleted`

Equity and fund data comes from Yahoo Finance chart data. PURR data comes from the Hyperliquid public API. This project is for research and education. It is not financial advice.

## Local checks

```sh
python3 scripts/update_market_data.py
node verify.mjs
python3 -m http.server 4173
```
