# InnerG Market Watchlist

A public research view for Nasirr's Home Base ecosystem.

## Data updates

GitHub Actions builds `data/watchlist.json` about every 30 minutes during U.S. market hours. The page checks for a newer snapshot every 60 seconds. No market-data credential is shipped to the browser.

Equity and fund data comes from Yahoo Finance chart data. PURR data comes from the Hyperliquid public API. This project is for research and education. It is not financial advice.

## Local checks

```sh
python3 scripts/update_market_data.py
node verify.mjs
python3 -m http.server 4173
```
