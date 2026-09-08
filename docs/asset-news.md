# Asset news

The public news section is separate from the Sunday Brief. Every two hours, at minute 23, it checks every symbol in `data/watchlist.json` separately. It keeps up to two newest reports per asset from a rolling seven-day window. Shared stories can appear under each affected asset. GitHub schedules can run late. The browser reloads the snapshot every five minutes while visible, except when a reader is using the news controls.

## Coverage

- StockAnalysis public per-symbol news metadata supplies original publisher links and dates for each stock and fund. Only allowlisted financial publishers and company-release services pass validation.
- Cointelegraph topic RSS supplies Bitcoin, Solana and Zcash. Hyperliquid has a separate filtered check of the general feed because that publisher has no working Hyperliquid topic feed.
- CoinDesk reporting supplements these checks.
- GlobeNewswire public-company, earnings and dividend releases, using feeds listed at https://www.globenewswire.com/rss/list.
- Only direct HTTPS links on the publisher allowlist are accepted. Reporting, analysis and company statements remain labeled.
- The daily researched check can add opened, verified source articles in `data/researched-news.json`. These expire after seven days and use the same two-item cap. This file is not a permanent list.
- Headline matching uses company names and selected aliases. Ambiguous words such as ARM, OPEN, HYPE, CORN and CANE do not match by themselves.
- Each source exposes a limited recent window. This is not a complete company-news terminal. Funds and smaller companies may have no matching headline. That is a coverage limit, not evidence that nothing happened.
- No Reddit, price predictions, generated causes or automatic buy recommendations.

Publisher dates use ISO, RSS or explicit Eastern time. Future dates beyond five minutes are rejected. Recent stored headlines survive a temporary outage, but expire after seven days. The UI flags partial source failures and snapshots older than six hours. A complete source outage fails the job after publishing the failure status. No copied article bodies or invented stories to fill empty assets.

## Refresh and checks

Run `python3 scripts/update_asset_news.py` to refresh. Run `python3 -m unittest discover -s scripts -p 'test_asset_news.py'` and `node --test news.test.mjs verify.mjs weekly-mover.test.mjs` to check the parser, coverage, links and existing charts. The script uses Python standard libraries and curl, available on the GitHub runner. It needs no API credentials.

Use GitHub Actions **Update asset news → Run workflow** for a manual cloud check. The job commits the news snapshot and requests the existing branch-based Pages build because bot commits alone do not trigger that build. Confirm both the news job and Pages build succeed.

## Discord summaries

The combined Codex automation checks the last seven days for every asset at 9 AM Eastern. It can update verified supplemental headlines, publish and verify the snapshot, and deliver short Discord-ready explanations for material new stories to Nasirr in the task. It must open articles, preserve dates, identify risks and avoid repeats. Do not treat a headline as a verified explanation or post to Discord automatically. The Sunday Brief remains at 11 AM Eastern on Sunday. Codex research requires the configured task runtime; the two-hour GitHub job is the cloud headline refresh path.
