import { escapeHTML, money, percent, tone, filterAssets, chartPath } from './display.mjs';

const DATA_URL = 'data/watchlist.json';
let snapshot = null;
let loading = false;
const search = document.querySelector('#search');
const sectorFilter = document.querySelector('#sector-filter');
const sort = document.querySelector('#sort');
const refresh = document.querySelector('#refresh');
const esc = escapeHTML;

function chart(asset) {
  const points = (asset.weekSeries || []).filter(Number.isFinite);
  const path = chartPath(points);
  if (!path) return '<p class="chart-empty">Chart unavailable</p>';
  return `<figure class="chart"><svg viewBox="0 0 320 80" role="img" aria-label="${esc(asset.symbol)}: last seven daily price points, ${esc(money(points[0], asset.currency))} to ${esc(money(points.at(-1), asset.currency))}"><line x1="0" y1="40" x2="320" y2="40"/><path class="${tone(points.at(-1) - points[0])}" d="${path}" pathLength="1" /></svg><figcaption><span>7 daily points</span><span>${money(points[0], asset.currency)} → ${money(points.at(-1), asset.currency)}</span></figcaption></figure>`;
}

function assetCard(asset) {
  return `<article class="asset-card" id="asset-${esc(asset.symbol)}"><div class="asset-heading"><div><h4>${esc(asset.symbol)}</h4><p>${esc(asset.name)}</p></div><strong class="price">${money(asset.price, asset.currency)}</strong></div>${chart(asset)}<dl class="returns">${[['1 day','day'],['1 week','week'],['30 days','month']].map(([label,key])=>`<div><dt>${label}</dt><dd class="${tone(asset.returns?.[key])}">${percent(asset.returns?.[key])}</dd></div>`).join('')}</dl><details class="ranges" data-symbol="${esc(asset.symbol)}"><summary>Daily &amp; 52-week ranges</summary><dl>${[['Day low','dayLow'],['Day high','dayHigh'],['52-week low','yearLow'],['52-week high','yearHigh']].map(([label,key])=>`<div><dt>${label}</dt><dd>${money(asset[key],asset.currency)}</dd></div>`).join('')}</dl><p>${Number(asset.historySessions) || 0} daily data points available.</p></details></article>`;
}

function renderAssets() {
  if (!snapshot) return;
  observer?.disconnect();
  const openRanges = new Set([...document.querySelectorAll('.ranges[open]')].map(el=>el.dataset.symbol));
  const assets = filterAssets(snapshot.assets, search.value, sectorFilter.value, sort.value);
  document.querySelector('#results-status').textContent = `${assets.length} of ${snapshot.assets.length} assets shown`;
  document.querySelector('#sector-list').innerHTML = assets.length ? snapshot.sectors.map(sector=>{
    const rows = assets.filter(asset=>asset.sector===sector.id);
    if (!rows.length) return '';
    return `<section class="sector-group" aria-labelledby="group-${esc(sector.id)}"><h3 id="group-${esc(sector.id)}">${esc(sector.name)} <span>${rows.length} ${rows.length===1?'asset':'assets'}</span></h3><div class="asset-grid">${rows.map(assetCard).join('')}</div></section>`;
  }).join('') : '<p class="empty-state">No matching assets. Try another ticker or choose all sectors.</p>';
  document.querySelectorAll('.ranges').forEach(el=>{ el.open = openRanges.has(el.dataset.symbol); });
  observeCharts();
}

const observer = 'IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches
  ? new IntersectionObserver(entries=>entries.forEach(entry=>{ if(entry.isIntersecting){entry.target.classList.add('chart-enter');observer.unobserve(entry.target);} }), {threshold:.2}) : null;
function observeCharts() {
  if(observer) document.querySelectorAll('.chart:not(.chart-enter)').forEach(el=>observer.observe(el));
}

function renderSnapshot(data) {
  const changed = snapshot?.generatedAt !== data.generatedAt;
  snapshot = data;
  const generated = new Date(data.generatedAt);
  const old = Date.now() - generated.getTime() > 48 * 60 * 60 * 1000;
  document.querySelector('#market-state').textContent = old ? 'Older snapshot · check the date' : 'Latest collected snapshot';
  document.querySelector('#snapshot-time').textContent = generated.toLocaleString('en-US',{dateStyle:'medium',timeStyle:'short',timeZone:'America/New_York'})+' ET';
  if(!changed) return;
  const selected = sectorFilter.value;
  sectorFilter.innerHTML = '<option value="all">All sectors</option>' + data.sectors.map(s=>`<option value="${esc(s.id)}">${esc(s.name)}</option>`).join('');
  sectorFilter.value = selected;
  document.querySelector('#asset-count').textContent = `${data.assets.length} assets / ${data.sectors.length} sectors / Free access`;
  const leaders = [...data.assets].filter(a=>Number.isFinite(a.returns?.week)).sort((a,b)=>b.returns.week-a.returns.week).slice(0,3);
  document.querySelector('#leader-grid').innerHTML = leaders.length ? leaders.map(a=>`<article class="leader-card"><div class="leader-top"><div><h3>${esc(a.symbol)}</h3><p>${esc(a.name)}</p></div><strong class="${tone(a.returns.week)}">${percent(a.returns.week)}<small>1 week</small></strong></div>${chart(a)}</article>`).join('') : '<p>Weekly data is unavailable. Try refreshing shortly.</p>';
  renderAssets();
}

async function loadData() {
  if(loading) return;
  loading = true;
  refresh.disabled = true;
  refresh.textContent = 'Checking…';
  try {
    const response = await fetch(`${DATA_URL}?v=${Date.now()}`,{cache:'no-store'});
    if(!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if(!Array.isArray(data.assets) || !data.assets.length || !Array.isArray(data.sectors) || !Number.isFinite(Date.parse(data.generatedAt))) throw new Error('Invalid snapshot');
    renderSnapshot(data);
  } catch {
    document.querySelector('#market-state').textContent = snapshot ? 'Refresh failed · showing saved snapshot' : 'Snapshot unavailable';
    if(!snapshot){document.querySelector('#snapshot-time').textContent='Please retry';document.querySelector('#leader-grid').textContent='Could not load market data.';document.querySelector('#results-status').textContent='Use Refresh data to try again.';}
  } finally { loading=false;refresh.disabled=false;refresh.textContent='Refresh data'; }
}

search.addEventListener('input', renderAssets);
sectorFilter.addEventListener('change', renderAssets);
sort.addEventListener('change', renderAssets);
refresh.addEventListener('click', loadData);
if(location.hash === '#member-access') location.replace('#sectors');
loadData();
setInterval(()=>{if(!document.hidden) loadData();}, 60_000);
