# Member-only founder portfolio

The `#my-holdings` section uses the existing `member-research` response and active membership check. The `portfolio` record in `public.innerg_research_content` holds the private snapshot. Anonymous and authenticated browser roles have no direct table privileges. Do not commit the actual holdings, plans, or watch notes to this repository.

Payload fields: `updatedAt`, `holdings: [{symbol, dailyChangePercent}]`, `planned: [{symbol}]`, and `watch: [{symbol, thesis, watchFor, risk}]`. Update this record only from explicit founder instructions through authorized database access. The routine news/brief publishers cannot overwrite this record. Planned assets are not confirmed purchases. Prices in personal notes are user-supplied levels, not live quotes.

For each nightly screenshot, transcribe only the ticker and the percentage in the daily gain/loss column. Percentages are percentage points, not fractions. Never copy the screenshot, account number, value, allocation, quantity, cost basis, dollar gain/loss, or total return into site files or the research payload. Read back the saved values and compare them with the screenshot. Preserve planned assets and watch notes unless instructed otherwise. Set `updatedAt` to the actual update time; do not describe the snapshot as live. Missing daily percentages render as unavailable, not zero. Updates require a new supplied screenshot; there is no automatic brokerage or screenshot connection.

Heatmap tiles are equal-sized. Color strength uses only absolute daily percentage change, with signed numbers and text labels for accessibility. No allocation or position value determines tile area.

The public site contains only a generic placeholder. Sign-out and failed membership checks empty both the holdings container and the personal watch notes. The Home Base mirror uses these same public interface files. No brokerage connection, quantities, cost bases, or portfolio returns are inferred.

Checks: `node --test portfolio.test.mjs research-access.test.mjs section-nav.test.mjs`. Browser checks: `scripts/test_portfolio_browser.mjs`, using synthetic member responses without creating real users or changing member records.
