import { escapeHTML } from './display.mjs';

const esc=escapeHTML;
const safeUrl=value=>{
  try {
    const url=new URL(value);
    return url.protocol==='https:'&&!url.username&&!url.password ? url.href : '';
  } catch { return ''; }
};

export function validateMarketUpdate(update) {
  if(!update||!/^[-A-Z0-9.]{1,12}$/.test(update.symbol)||!Number.isFinite(Date.parse(update.reviewedAt||update.updatedAt))) throw Error('Invalid market update');
  if(!Array.isArray(update.metrics)||update.metrics.length<3||!Array.isArray(update.catalysts)||!update.catalysts.length||!Array.isArray(update.levels)||!update.levels.length) throw Error('Incomplete market update');
  if(!Array.isArray(update.sources)||!update.sources.length||update.sources.some(source=>!safeUrl(source.url))) throw Error('Unsafe market update source');
  return update;
}

export function marketUpdateMarkup(update) {
  validateMarketUpdate(update);
  const reviewed=new Date(update.reviewedAt||update.updatedAt).toLocaleString('en-US',{dateStyle:'medium',timeStyle:'short',timeZone:'America/New_York'});
  return `<article class="market-flash-card"><div class="market-flash-lead"><div><p class="eyebrow">${esc(update.label)}</p><p class="market-flash-time">Reviewed ${esc(reviewed)} ET</p><h2>${esc(update.headline)}</h2><p class="market-flash-summary">${esc(update.summary)}</p></div><strong class="market-flash-symbol">${esc(update.symbol)}</strong></div><dl class="market-flash-metrics">${update.metrics.map(metric=>`<div><dt>${esc(metric.label)}</dt><dd>${esc(metric.value)}</dd></div>`).join('')}</dl><div class="market-flash-body"><section><h3>What moved it</h3>${update.catalysts.map(item=>`<p>${esc(item)}</p>`).join('')}</section><section><h3>Levels in focus</h3><dl class="market-levels">${update.levels.map(level=>`<div><dt>${esc(level.label)}</dt><dd>${esc(level.value)}</dd></div>`).join('')}</dl></section><section class="market-risk"><h3>Risk check</h3><p>${esc(update.risk)}</p></section></div><nav class="market-sources" aria-label="HYPE update sources">${update.sources.map(source=>`<a href="${esc(safeUrl(source.url))}" target="_blank" rel="noopener noreferrer">${esc(source.label)}</a>`).join('')}</nav><p class="market-flash-disclaimer">${esc(update.disclaimer)}</p></article>`;
}

export async function loadMarketUpdate(root=document,fetcher=fetch) {
  const target=root.querySelector('#market-flash-content');
  if(!target)return;
  try {
    const dataUrl=root.body?.dataset?.updateUrl||(typeof document!=='undefined'?document.body?.dataset.updateUrl:'')||'data/market-updates.json';
    const response=await fetcher(`${dataUrl}?v=${Date.now()}`,{cache:'no-store'});
    if(!response.ok)throw Error(`HTTP ${response.status}`);
    const payload=await response.json();
    const update=payload.updates?.find(item=>item.symbol==='HYPE');
    target.innerHTML=marketUpdateMarkup({...update,updatedAt:payload.updatedAt});
  } catch {
    target.innerHTML='<p class="section-note">The latest HYPE update is temporarily unavailable. Price charts remain available below.</p>';
  }
}

if(typeof document!=='undefined')loadMarketUpdate();
