# INNERG Market Pulse interface system

## Direction

The site should feel like a focused research desk. It uses a warm paper canvas, black market panels, and signal-lime accents. Data leads. Education follows. Avoid decorative finance graphics, gradients, and generic dashboard cards.

## Depth and spacing

- Use surface shifts and quiet borders. Do not add heavy shadows.
- Use a 4px spacing base. Common component spacing is 8px, 12px, 16px, 20px, 24px, 28px, and 32px.
- Use 8px for controls, 12px for data cards, and 14px for large market panels.
- Keep interactive targets at least 44px high.

## Hierarchy

- A market view gets one focal item. On featured-asset reports, the price chart is the focal item after the headline and key metrics.
- Use Inter for display and reading text. Use DM Mono for prices, timestamps, tickers, and market labels.
- Use weight, contrast, and spacing before adding more type sizes.
- Keep the signal-lime color for selected controls, positive price action, and the most important live values.

## Featured asset pattern

Use this sequence for a featured market asset:

1. Dated headline and short market summary.
2. Four key metrics in a compact grid.
3. Interactive chart with 1D, 1W, and 30D controls, a live readout, and a keyboard-accessible scrubber.
4. Plain-language asset brief that explains what the asset is and what it does.
5. Catalyst analysis, levels, risk, sources, and research disclaimer.

Reuse `chartMarkup(asset, 'market-flash')` and `bindCharts()` from `interactive-charts.mjs`. Use the shared `market-snapshot` event from `app.js` so a featured chart reads the same canonical `data/watchlist.json` data as the watchlist cards.

## Responsive behavior

- Desktop chart height: 210px.
- Mobile chart height: 150px.
- On mobile, stack chart instructions, asset-brief content, and definition rows into one column.
- Keep timeframe controls full width on mobile.

## Content rules

- Define the asset before discussing catalysts.
- Separate verified facts from interpretation.
- Use official project documentation for protocol mechanics.
- Keep price snapshots dated. Never present a reviewed price as live.
- Include downside and execution risks. Do not write buy or sell instructions.
