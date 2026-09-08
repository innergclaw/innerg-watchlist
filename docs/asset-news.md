# Asset news

The public news section is separate from the Sunday Brief. It checks every symbol in `data/watchlist.json` against selected RSS headlines every two hours, at minute 23. GitHub schedules can run late. The browser reloads the snapshot every five minutes while visible, except when a reader is using the news controls.

## Coverage

- CoinDesk reporting.
- GlobeNewswire public-company, earnings and dividend releases, using feeds listed at https://www.globenewswire.com/rss/list.
- Only direct HTTPS links on these publisher domains are accepted.
- Headline matching uses company names and selected aliases. Ambiguous words such as ARM, OPEN, HYPE, CORN and CANE do not match by themselves.
- Each source exposes a limited recent window. This is not a complete company-news terminal. Funds and smaller companies may have no matching headline. That is a coverage limit, not evidence that nothing happened.
- No Reddit, price predictions, generated causes or automatic buy recommendations.

The source date comes from the publisher RSS field and may reflect an updated article. Recent stored headlines survive a temporary outage, but expire after seven days. The UI flags partial source failures and snapshots older than six hours. A complete source outage fails the job after publishing the failure status.

## Refresh and checks

Run `python3 scripts/update_asset_news.py` to refresh. Run `python3 -m unittest discover -s scripts -p 'test_asset_news.py'` and `node --test news.test.mjs verify.mjs weekly-mover.test.mjs` to check the parser, coverage, links and existing charts. The script uses Python standard libraries and curl, available on the GitHub runner. It needs no API credentials.

Use GitHub Actions **Update asset news → Run workflow** for a manual cloud check. The job commits the news snapshot and requests the existing branch-based Pages build because bot commits alone do not trigger that build. Confirm both the news job and Pages build succeed.

## Discord summaries

The requested daily researched digest is separate from the automatic headline feed. It must open source articles, use plain language, preserve dates, identify risks and avoid repeating old stories. Do not treat a headline as a verified explanation. Delivery is to Nasirr in Codex, not a public Discord post. The existing Sunday automation must be preserved when enabling the additional daily schedule.
