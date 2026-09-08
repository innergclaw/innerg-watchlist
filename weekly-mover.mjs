import { escapeHTML } from './display.mjs';
import { safeSource } from './brief.mjs';

export function topWeeklyMover(assets) {
  return assets.filter(a => Number.isFinite(a.returns?.week))
    .sort((a, b) => b.returns.week - a.returns.week)[0] || null;
}

// Dated editorial context. Never reuse one asset's story for another leader.
export let moverContext = null;
export function setMoverContext(value) { moverContext=value; }

export function moverExplanation(symbol, now = Date.now()) {
  if(!moverContext)return '<div class="mover-context"><h4>What is behind the move?</h4><p>Members can read the news, context, and risks behind the numbers.</p><a href="#member-access">Sign in with INNERG ID</a> · <a href="https://nasirr.innergintel.org/innergid/">Become a member</a></div>';
  const age = now - Date.parse(moverContext.reviewedAt);
  if (symbol !== moverContext.symbol || !Number.isFinite(age) || age > 7 * 86400000 || age < 0) {
    return '<div class="mover-context"><h4>What is behind the move?</h4><p>A fresh news review for this weekly leader is not available yet. The chart and ranking use the latest collected price data.</p></div>';
  }
  const esc = escapeHTML;
  const reviewed=new Date(moverContext.reviewedAt).toLocaleDateString('en-US',{timeZone:'America/New_York',month:'short',day:'numeric',year:'numeric'});
  return `<div class="mover-context"><h4>What is behind the move?</h4><p class="mover-reviewed">Financial reporting · Reviewed ${esc(reviewed)}</p><p><strong>X reporting.</strong> ${esc(moverContext.x)}</p><p class="mover-caution">${esc(moverContext.caution)}</p><nav aria-label="Weekly mover sources">${(moverContext.sources||[]).filter(s=>safeSource(s.url)).map(s => `<a href="${esc(safeSource(s.url))}" target="_blank" rel="noopener noreferrer">${esc(s.label)}</a>`).join('')}</nav></div>`;
}
