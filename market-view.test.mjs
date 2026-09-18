import fs from 'node:fs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { assetsForView } from './display.mjs';
import { validateMarketUpdate, marketUpdateMarkup } from './market-update.mjs';

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

test('HYPE update is dated, sourced, risk-aware, and escaped',()=>{
  const update={...updates.updates[0],updatedAt:updates.updatedAt};
  const hype=data.assets.find(asset=>asset.symbol==='HYPE');
  validateMarketUpdate(update);
  const markup=marketUpdateMarkup({...update,headline:'<img src=x onerror=alert(1)>'},hype);
  assert.ok(!markup.includes('<img'));
  assert.match(markup,/Research and education only/);
  assert.match(markup,/Risk check/);
  assert.match(markup,/noopener noreferrer/);
  assert.match(markup,/HYPE chart/);
  assert.match(markup,/data-period="day"/);
  assert.match(markup,/data-period="week"/);
  assert.match(markup,/data-period="month"/);
  assert.match(markup,/data-chart-key="market-flash-HYPE"/);
  assert.equal(update.symbol,'HYPE');
  assert.equal(update.metrics[0].value,'$91.79');
});

test('public build includes both routes and the shared market update',()=>{
  const build=fs.readFileSync('scripts/build_public_site.mjs','utf8');
  for(const path of ['stocks/index.html','crypto/index.html','data/market-updates.json','market-update.mjs'])assert.ok(build.includes(path));
});
