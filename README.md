# INNERG Market Pulse

Public research page for the Home Base ecosystem. All 31 assets across six sectors are available without login or payment. The page does not load Supabase Auth or call checkout. Paid INNERG ID membership, private videos, and other ecosystem access are unchanged.

Public name: INNERG Market Pulse. Tagline: What moved. What matters. What I'm watching. The existing `innerg-watchlist` URL stays unchanged. Future live shows or daily editions are not yet advertised as available or scheduled.

## Data

`scripts/update_market_data.py` collects Yahoo Finance chart data and Hyperliquid public data into `data/watchlist.json`. The existing GitHub Actions schedule refreshes the file about every 30 minutes during U.S. weekday market hours. The page checks the published file every 60 seconds while visible. Refresh data checks that file; it does not request a new trade quote. This is scheduled data, not a real-time feed.

Missing data stays unavailable. Snapshots older than 48 hours are labeled. All price points and change windows remain visible through cards, search, sector filters, and sort within each sector. Each chart has an independent scale. Percentage changes exclude dividends. The latest daily point may be incomplete.

Legacy files in `supabase/` are retained for the existing shared membership infrastructure. They are not deployed or changed by this public-page update. Do not remove shared billing or member security based on the public Watchlist status. `data/watchlist-preview.json` remains for older cached clients; the current page uses the full file.

The Robinhood referral is public and disclosed. This page is research and education, not financial advice.

## Checks and deployment

```sh
python3 scripts/update_market_data.py
node --check app.js
node --test verify.mjs
python3 -m http.server 4173
```

GitHub Pages publishes the root of `main`. Verify the public route and `data/watchlist.json` after pushing. Test search, sorting, ranges, refresh failure, and 390px mobile layout. No test user or payment is needed.
