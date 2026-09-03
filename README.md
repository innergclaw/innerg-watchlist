# InnerG Market Watchlist

A member research view for Nasirr's Home Base ecosystem. Public visitors see one asset from each sector and the weekly market movers. Existing members keep access without a new charge. New members create a shared Home Base account, pay $10 per month through Stripe, and then receive full access.

## Data updates

GitHub Actions builds `data/watchlist-preview.json` about every 30 minutes during U.S. market hours. The public snapshot includes one asset per sector, the three weekly leaders, and seven-session chart data. The page checks for a newer preview every 60 seconds. The full 32-asset snapshot is stored in Supabase and returned only through the authenticated `member-watchlist` Edge Function.

Google and email/password sign-in use the same Supabase project as the other Home Base member sites. Account creation and membership are separate states. New accounts stay in `payment_required` until Stripe confirms payment. The protected data function checks active access on every request. The Robinhood referral remains public.

## Stripe activation

Stripe Checkout creates a fixed $10 monthly subscription. The checkout function adds the signed-in Supabase user ID as Stripe's `client_reference_id`. Stripe sends that value back in the signed payment event. The webhook then activates the matching membership, issues a sequential `INNERG-000000` member number, and emails that number once. No member number is created for an unpaid signup.

The membership checkout requires these Supabase Edge Function secrets:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `RESEND_API_KEY`

The member email defaults to `INNERG INTEL <updates@ownyourweb.xyz>`. Set `INNERG_MEMBER_EMAIL_FROM` if a different verified sender is required.

Set the Stripe Payment Link redirect to:

`https://innergclaw.github.io/innerg-watchlist/?membership=success#member-access`

Send these events to:

`https://zkyhhoxcrjkhywblzehr.supabase.co/functions/v1/watchlist-stripe-webhook`

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `invoice.paid`
- `invoice.payment_failed`
- `customer.subscription.deleted`

Equity, fund, Bitcoin, Solana, and Zcash data comes from Yahoo Finance chart data. HYPE data comes from the Hyperliquid public API. This project is for research and education. It is not financial advice.

## Local checks

```sh
python3 scripts/update_market_data.py
node verify.mjs
python3 -m http.server 4173
```
