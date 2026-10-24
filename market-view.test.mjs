import fs from 'node:fs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { assetsForView } from './display.mjs';
import { validateMarketUpdate, marketUpdateMarkup, marketUpdatesMarkup, loadMarketUpdate, EMPTY_UPDATES } from './market-update.mjs';

const data=JSON.parse(fs.readFileSync('data/watchlist.json','utf8'));
const updates=JSON.parse(fs.readFileSync('data/market-updates.json','utf8'));
const home=fs.readFileSync('index.html','utf8');
const stocks=fs.readFileSync('stocks/index.html','utf8');
const crypto=fs.readFileSync('crypto/index.html','utf8');

test('market views split one canonical watchlist without overlap',()=>{
  const stockAssets=assetsForView(data.assets,'stocks');
  const cryptoAssets=assetsForView(data.assets,'crypto');
  assert.equal(stockAssets.length,33);
  assert.deepEqual(cryptoAssets.map(asset=>asset.symbol),['ZEC','HYPE','BTC','SOL']);
  assert.equal(stockAssets.length+cryptoAssets.length,data.assets.length);
  assert.ok(stockAssets.every(asset=>asset.assetType!=='Crypto'));
});

test('all three public pages link to each market view and declare their scope',()=>{
  for(const html of [home,stocks,crypto]){
    assert.match(html,/market-view-nav/);
    assert.match(html,/All Markets/);
    assert.match(html,/>Stocks</);
    assert.match(html,/>Crypto</);
  }
  assert.match(home,/data-market-view="all"/);
  assert.match(stocks,/data-market-view="stocks"/);
  assert.match(crypto,/data-market-view="crypto"/);
});

test('HYPE market update card and its chart links are gone',()=>{
  assert.ok(!updates.updates.some(item=>item.symbol==='HYPE'));
  for(const html of [home,stocks,crypto]){
    assert.doesNotMatch(html,/Open HYPE chart|hype-chart-title|HYPE enters price discovery|Loading the latest HYPE/);
  }
  assert.ok(data.assets.some(asset=>asset.symbol==='HYPE'),'HYPE stays on the watchlist itself');
});

test('every remaining market update validates, escapes, and links to the shared chart',()=>{
  assert.ok(updates.updates.length>=1);
  for(const entry of updates.updates)validateMarketUpdate({...entry,updatedAt:entry.updatedAt||updates.updatedAt});
  const entry={...updates.updates[0],updatedAt:updates.updates[0].updatedAt||updates.updatedAt};
  const asset={symbol:entry.symbol,name:entry.symbol};
  const markup=marketUpdateMarkup({...entry,headline:'<img src=x onerror=alert(1)>'},asset);
  assert.ok(!markup.includes('<img'));
  assert.doesNotMatch(markup,/interactive-chart|data-chart-key/);
  assert.match(markup,new RegExp(`href="#asset-${entry.symbol}"`));
  assert.doesNotMatch(marketUpdateMarkup(entry,null),/href="#asset-/);
});

test('empty or near-empty update lists render cleanly',()=>{
  assert.equal(marketUpdatesMarkup([]),EMPTY_UPDATES);
  assert.equal(marketUpdatesMarkup(undefined),EMPTY_UPDATES);
  assert.equal(marketUpdatesMarkup([{symbol:'bad'}]),EMPTY_UPDATES);
  const one=marketUpdatesMarkup([{...updates.updates[0],updatedAt:updates.updatedAt},{symbol:'bad'}]);
  assert.equal((one.match(/class="market-flash-card"/g)||[]).length,1);
  assert.doesNotMatch(EMPTY_UPDATES,/HYPE|\u2014/);
});

test('loader shows the empty note for an empty payload',async()=>{
  const target={innerHTML:''};
  const root={querySelector:()=>target,body:{dataset:{updateUrl:'x.json'}}};
  await loadMarketUpdate(root,async()=>({ok:true,json:async()=>({updatedAt:'2026-10-24T08:45:00-04:00',updates:[]})}));
  assert.equal(target.innerHTML,EMPTY_UPDATES);
});

test('public build includes both routes and the shared market update',()=>{
  const build=fs.readFileSync('scripts/build_public_site.mjs','utf8');
  for(const path of ['stocks/index.html','crypto/index.html','data/market-updates.json','market-update.mjs','watchlist-chart.mjs'])assert.ok(build.includes(path));
});
