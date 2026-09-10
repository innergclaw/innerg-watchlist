# Member-only founder portfolio

The `#my-holdings` section uses the existing `member-research` response and active membership check. The `portfolio` record in `public.innerg_research_content` holds the private snapshot. Anonymous and authenticated browser roles have no direct table privileges. Do not commit the actual holdings, plans, or watch notes to this repository.

Payload fields: `updatedAt`, `holdings: [{symbol}]`, `planned: [{symbol}]`, and `watch: [{symbol, thesis, watchFor, risk}]`. Update this record only from explicit founder instructions through authorized database access. The routine news/brief publishers cannot overwrite this record. Planned assets are not confirmed purchases. Prices in personal notes are user-supplied levels, not live quotes.

The public site contains only a generic placeholder. Sign-out and failed membership checks empty both the holdings container and the personal watch notes. The Home Base mirror uses these same public interface files. No brokerage connection, quantities, cost bases, or portfolio returns are inferred.

Checks: `node --test portfolio.test.mjs research-access.test.mjs section-nav.test.mjs`. Browser checks: `scripts/test_portfolio_browser.mjs`, using synthetic member responses without creating real users or changing member records.
