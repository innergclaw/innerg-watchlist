import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {toggleSymbol,monotonePath,seriesSet,cardMarkup,plotMarkup,tooltipMarkup,legendMarkup,niceTicks,displayLabel,MAX_LINES} from './watchlist-chart.mjs';

const data=JSON.parse(readFileSync('data/watchlist.json','utf8'));
const css=readFileSync('styles.css','utf8');
const pages=['index.html','stocks/index.html','crypto/index.html'].map(p=>readFileSync(p,'utf8'));

test('each page has exactly one watchlist chart card and no sector select',()=>{
  for(const html of pages){
    assert.equal(html.split('id="watchlist-chart"').length-1,1);
    assert.doesNotMatch(html,/id="sector-filter"/);
  }
});
test('asset rows render without per-asset charts',()=>{
  const app=readFileSync('app.js','utf8');
  assert.doesNotMatch(app,/chartMarkup\(asset\)|function chart\(/);
  assert.match(app,/class="asset-row"/);
});
test('ticker selection overlays at most three lines and never empties',()=>{
  let s=['A'];
  for(const t of ['B','C','D'])s=toggleSymbol(s,t);
  assert.deepEqual(s,['B','C','D']);
  assert.equal(s.length,MAX_LINES);
  assert.deepEqual(toggleSymbol(['A'],'A'),['A']);
  assert.deepEqual(toggleSymbol(['A','B'],'A'),['B']);
});
test('monotone path is one smooth continuous curve',()=>{
  const d=monotonePath([{x:0,y:10},{x:10,y:5},{x:20,y:8},{x:30,y:8}]);
  assert.equal((d.match(/M /g)||[]).length,1);
  assert.equal((d.match(/C /g)||[]).length,3);
  assert.doesNotMatch(d,/NaN|Infinity/);
  assert.equal(monotonePath([]),'');
});
test('one ticker shows price, several show percent change',()=>{
  const single=seriesSet(data.assets,['ZEC'],'week');
  assert.equal(single.mode,'price');
  const multi=seriesSet(data.assets,['ZEC','BTC','SOL'],'week');
  assert.equal(multi.mode,'percent');
  assert.equal(multi.series.length,3);
  for(const s of multi.series)assert.ok(Math.abs(s.points[0][1])<1e-9);
});
test('plot follows the line-charts-4 look',()=>{
  const set=seriesSet(data.assets,['ZEC','BTC'],'week');
  const svg=plotMarkup(set,'week',640,280);
  assert.match(svg,/class="line-grid"/);
  assert.doesNotMatch(svg,/<circle/);
  assert.doesNotMatch(svg,/NaN|undefined/);
  assert.equal((svg.match(/class="line-series/g)||[]).length,2);
  assert.match(css,/\.line-grid\{stroke:var\(--line\);stroke-dasharray:4 8\}/);
  assert.match(css,/\.line-tick\{font:11px/);
  assert.match(css,/\.line-series\{fill:none;stroke-width:2/);
  assert.match(css,/\.line-cursor\{[^}]*stroke-dasharray/);
  const tip=tooltipMarkup(set,set.series[0].points.at(-1)[0],'week');
  assert.equal((tip.match(/class="ring-dot/g)||[]).length,2);
  assert.equal((legendMarkup(set).match(/class="ring-dot/g)||[]).length,2);
  assert.match(plotMarkup(seriesSet(data.assets,['NONE'],'week'),'week',640,280),/No recorded prices/);
});
test('card offers categories, tickers, periods as pressable buttons',()=>{
  const html=cardMarkup({category:'crypto',symbols:['ZEC'],period:'week'},data.assets,data.sectors);
  assert.match(html,/data-category="all"/);
  for(const s of data.sectors)assert.match(html,new RegExp(`data-category="${s.id}"`));
  for(const sym of ['ZEC','HYPE','BTC','SOL'])assert.match(html,new RegExp(`data-symbol="${sym}"`));
  assert.doesNotMatch(html,/data-symbol="VOO"/);
  assert.match(html,/data-symbol="ZEC"[^>]*aria-pressed="true"/);
  assert.match(html,/class="line-plot" tabindex="0"/);
  assert.match(html,/aria-live="polite"/);
  assert.doesNotMatch(html,/\bAI\b/);
  assert.equal(displayLabel('AI + Compute'),'SI + Compute');
});
test('ticks are evenly spaced and cover the range',()=>{
  const t=niceTicks(3.2,9.7);
  assert.ok(t[0]<=3.2&&t.at(-1)>=9.7);
  assert.ok(niceTicks(5,5).length>=2);
});
test('new UI copy has no emojis, em dashes, or arrow characters',()=>{
  const files=['watchlist-chart.mjs','app.js','market-update.mjs',...['index.html','stocks/index.html','crypto/index.html']];
  for(const f of files){
    const text=readFileSync(f,'utf8');
    assert.doesNotMatch(text,/\u2014|[\u2190-\u21FF]|[\u{1F300}-\u{1FAFF}]/u,f);
  }
});
