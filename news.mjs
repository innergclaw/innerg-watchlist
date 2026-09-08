import { escapeHTML as esc } from './display.mjs';

export function safeNewsURL(value) {
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password && ['coindesk.com','globenewswire.com'].some(host => url.hostname === host || url.hostname.endsWith('.' + host)) ? url.href : ''; } catch { return ''; }
}
export function newsStatus(data, now = Date.now()) {
  const age = now - Date.parse(data.checkedAt);
  if (!Number.isFinite(age)) return 'News snapshot date is unavailable.';
  const failed = data.sources.filter(s => s.status !== 'ok').length;
  return `${age > 6 * 3600000 ? 'Updates delayed. Last check' : 'Last checked'}: ${new Date(data.checkedAt).toLocaleString('en-US', {timeZone:'America/New_York',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'})}. ${data.coverage.length} assets checked.${failed ? ` ${failed} source feeds unavailable; coverage is partial.` : ''}`;
}
export function renderNews(items) {
  const valid = items.filter(i => safeNewsURL(i.url) && Number.isFinite(Date.parse(i.publishedAt)));
  if (!valid.length) return '<p class="section-note">No matching headlines in the last seven days from these feeds. This does not mean there is no news for this asset.</p>';
  return valid.map(i => `<article class="news-item"><p class="news-meta">${esc(i.symbol)} · ${esc(i.kind)} · <time datetime="${esc(i.publishedAt)}">${esc(new Date(i.publishedAt).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'America/New_York'}))}</time></p><h3><a href="${esc(safeNewsURL(i.url))}" target="_blank" rel="noopener noreferrer">${esc(i.headline)}</a></h3><p class="news-meta">Source: ${esc(i.source)}</p></article>`).join('');
}
export async function loadNews(root = document, fetcher = fetch) {
  const status = root.querySelector('#news-status');
  try {
    const response = await fetcher(`data/asset-news.json?t=${Date.now()}`, {cache:'no-store'});
    if (!response.ok) throw Error('News fetch failed');
    const data = await response.json();
    if (!Array.isArray(data.items) || !Array.isArray(data.coverage) || !Array.isArray(data.sources)) throw Error('Invalid news');
    status.textContent = newsStatus(data);
    const filter = root.querySelector('#news-filter');
    const selected = filter.value || 'all';
    filter.innerHTML = '<option value="all">All tracked assets</option>' + data.coverage.map(a => `<option value="${esc(a.symbol)}">${esc(a.symbol)} · ${esc(a.name)}</option>`).join('');
    filter.value = data.coverage.some(a => a.symbol === selected) ? selected : 'all';
    const fresh = data.items.filter(i => Date.now() - Date.parse(i.publishedAt) <= 7 * 86400000);
    function render() {
      const items = filter.value === 'all' ? fresh : fresh.filter(i => i.symbol === filter.value);
      const unique = [...new Map(items.map(i => [i.url,i])).values()];
      root.querySelector('#news-items').innerHTML = renderNews(unique.slice(0,6)) + (unique.length > 6 ? `<details class="news-more"><summary>Show ${unique.length - 6} more headlines</summary>${renderNews(unique.slice(6))}</details>` : '');
    }
    filter.onchange = render;
    root.querySelector('#news-coverage').innerHTML = data.coverage.map(a => `<p>${esc(a.symbol)}: ${fresh.filter(i=>i.symbol===a.symbol).length} matching headlines</p>`).join('') + data.sources.map(s=>`<p>${esc(s.name)}: ${esc(s.status)}</p>`).join('');
    render();
  } catch { status.textContent = 'News updates are unavailable right now. The charts and Sunday Brief remain open.'; }
}
if (typeof document !== 'undefined') {
  loadNews();
  setInterval(() => { if (!document.hidden && !document.querySelector('#asset-news').contains(document.activeElement)) loadNews(); }, 5 * 60000);
}
