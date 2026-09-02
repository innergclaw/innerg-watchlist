# InnerG Market Watchlist

A member research view for Nasirr's Home Base ecosystem. Public visitors see one asset from each sector. Members use the shared Home Base Supabase account to unlock the full list.

## Data updates

GitHub Actions builds `data/watchlist-preview.json` about every 30 minutes during U.S. market hours. The public snapshot includes one asset per sector, the three weekly leaders, and seven-session chart data. The page checks for a newer preview every 60 seconds. The full 30-asset snapshot is stored in Supabase and returned only through the authenticated `member-watchlist` Edge Function.

Google and email/password sign-in use the same Supabase project as the other Home Base member sites. The Robinhood referral remains public.

Equity and fund data comes from Yahoo Finance chart data. PURR data comes from the Hyperliquid public API. This project is for research and education. It is not financial advice.

## Local checks

```sh
python3 scripts/update_market_data.py
node verify.mjs
python3 -m http.server 4173
```
