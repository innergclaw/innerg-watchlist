import { escapeHTML } from './display.mjs';

export function topWeeklyMover(assets) {
  return assets.filter(a => Number.isFinite(a.returns?.week))
    .sort((a, b) => b.returns.week - a.returns.week)[0] || null;
}

// Dated editorial context. Never reuse one asset's story for another leader.
export const moverContext = {
  symbol: 'ZEC',
  reviewedAt: '2026-09-07T20:41:15Z',
  reddit: 'Reddit users are talking about private payments and interest in a Zcash investment fund. Some are excited. Others warn against buying just because the price jumped. These are community views, not proof of what caused the move.',
  x: 'Wu Blockchain reported losses on bets that ZEC would fall. Closing those bets can add buying pressure. In simple terms: people bet down, price goes up, some must buy back. That can push a rally further.',
  caution: 'This helps explain the discussion around the move. It does not prove one cause. A fast rise can reverse quickly.',
  sources: [
    { label: 'Reddit discussion · Sep 6', url: 'https://www.reddit.com/r/zec/comments/1w922q6/why_is_zcash_zec_up_18_today_while_every_stock/' },
    { label: 'Reddit caution · Sep 7', url: 'https://www.reddit.com/r/zec/comments/1w9gkg1/i_wouldnt_invest_now/' },
    { label: 'Wu Blockchain on X · Sep 6', url: 'https://x.com/WuBlockchain/status/2096585867246846265' },
    { label: 'X post verified in CoinCodex report', url: 'https://coincodex.com/article/91605/zcash-price-surged-past-1200-with-etf-inflows-fueling-zec-short-squeeze/' }
  ]
};

export function moverExplanation(symbol, now = Date.now()) {
  const age = now - Date.parse(moverContext.reviewedAt);
  if (symbol !== moverContext.symbol || age > 7 * 86400000 || age < 0) {
    return '<div class="mover-context"><h4>What is behind the move?</h4><p>A fresh news review for this weekly leader is not available yet. The chart and ranking use the latest collected price data.</p></div>';
  }
  const esc = escapeHTML;
  return `<div class="mover-context"><h4>What is behind the move?</h4><p class="mover-reviewed">News and community context · Reviewed Sep 7, 2026</p><p><strong>Reddit discussion.</strong> ${esc(moverContext.reddit)}</p><p><strong>X reporting.</strong> ${esc(moverContext.x)}</p><p class="mover-caution">${esc(moverContext.caution)}</p><nav aria-label="Weekly mover sources">${moverContext.sources.map(s => `<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.label)}</a>`).join('')}</nav></div>`;
}
