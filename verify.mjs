import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { test } from 'node:test';
import { filterAssets, money, percent, chartPath, escapeHTML } from './display.mjs';
const html=fs.readFileSync('index.html','utf8');
const script=fs.readFileSync('app.js','utf8');
const css=fs.readFileSync('styles.css','utf8');
const data=JSON.parse(fs.readFileSync('data/watchlist.json','utf8'));
test('Market Pulse name and approved tagline match page and sharing metadata',()=>{assert.ok(html.includes('<h1 id="page-title">INNERG Market Pulse</h1>'));assert.ok(html.includes('<title>INNERG Market Pulse | INNERG INTEL</title>'));assert.ok(html.includes('What moved. What matters. What I\'m watching.'));assert.ok(html.includes('property="og:title" content="INNERG Market Pulse"'));});
test('all 31 assets and six sectors are public',()=>{assert.equal(data.assets.length,31);assert.equal(data.sectors.length,6);assert.equal(new Set(data.assets.map(a=>a.symbol)).size,31);});
test('Zcash stays first and Cash Cat stays removed',()=>assert.deepEqual(data.assets.filter(a=>a.sector==='crypto').map(a=>a.symbol),['ZEC','HYPE','BTC','SOL']));
test('search ticker and name without case sensitivity',()=>{assert.equal(filterAssets(data.assets,' zEc ')[0].symbol,'ZEC');assert.equal(filterAssets(data.assets,'bitcoin')[0].symbol,'BTC');});
test('sector filter and empty search results',()=>{assert.equal(filterAssets(data.assets,'','crypto').length,4);assert.equal(filterAssets(data.assets,'not-a-real-ticker').length,0);});
test('sort handles missing values and does not mutate source',()=>{const assets=[{symbol:'B',returns:{week:null}},{symbol:'A',returns:{week:0}},{symbol:'C',returns:{week:-2}}];assert.deepEqual(filterAssets(assets,'','all','week').map(a=>a.symbol),['A','C','B']);assert.deepEqual(filterAssets(assets,'','all','loss').map(a=>a.symbol),['C','A','B']);assert.equal(assets[0].symbol,'B');});
test('number formatting handles zero, losses, and missing data',()=>{assert.equal(money(0),'$0.0000');assert.equal(percent(0),'0.00%');assert.equal(percent(-2),'-2.00%');assert.equal(percent(null),'Unavailable');});
test('charts handle flat lines and unavailable history',()=>{assert.equal(chartPath([1]),'');assert.ok(chartPath([3,3,3]).includes('40.00'));assert.ok(!chartPath([2,null,4]).includes('NaN'));});
test('external strings are escaped',()=>assert.equal(escapeHTML('<script>'),'&lt;script&gt;'));
test('public client has no auth or checkout calls',()=>{assert.ok(!/supabase|stripe|signIn|password|payment-required|locked-row/i.test(script));assert.ok(!/auth-panel|payment-required|email-auth-form/.test(html));});
test('help and referral remain public',()=>{assert.ok(html.includes('How to read the numbers'));assert.ok(html.includes('https://join.robinhood.com/nasirrm'));assert.ok(html.includes('noopener noreferrer sponsored'));assert.ok(html.includes('not a live trading feed'));});
test('accessible controls and reduced motion remain',()=>{assert.ok(html.includes('type="search"'));assert.ok(html.includes('role="status"'));assert.ok(css.includes(':focus-visible'));assert.ok(css.includes('prefers-reduced-motion:reduce'));assert.ok(css.includes('min-height:44px'));});
test('workflow refreshes full public snapshot',()=>assert.ok(fs.readFileSync('.github/workflows/update-market-data.yml','utf8').includes('git add data/watchlist.json')));

function harness({failure=false,hash=''}={}) {
  const nodes=new Map();
  const get=id=>{if(!nodes.has(id))nodes.set(id,{value:id==='#sector-filter'?'all':id==='#sort'?'default':'',innerHTML:'',textContent:'',addEventListener(){},querySelectorAll(){return [];}});return nodes.get(id);};
  let fail=failure;const calls=[];const redirects=[];
  const context={Intl,Date,Number,Set,Array,String,console,document:{querySelector:get,querySelectorAll:()=>[],hidden:false},window:{},matchMedia:()=>({matches:true}),location:{hash,replace:path=>redirects.push(path)},setInterval:()=>{},fetch:async url=>{calls.push(url);if(fail)throw Error('offline');return {ok:true,json:async()=>structuredClone(data)};}};
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('display.mjs','utf8').replaceAll('export ','')+'\n'+script.replace(/^import[^\n]+\n/,''),context);
  return {nodes,get,calls,redirects,context,setFailure:value=>{fail=value;},settle:()=>new Promise(resolve=>setImmediate(resolve))};
}
test('signed-out load renders full data with only a public JSON request',async()=>{const h=harness();await h.settle();assert.equal((h.get('#sector-list').innerHTML.match(/class="asset-card"/g)||[]).length,31);assert.equal(h.calls.length,1);assert.match(h.calls[0],/^data\/watchlist.json/);assert.equal(h.get('#results-status').textContent,'31 of 31 assets shown');});
test('rendered search and empty state',async()=>{const h=harness();await h.settle();h.get('#search').value='Zcash';vm.runInContext('renderAssets()',h.context);assert.equal(h.get('#results-status').textContent,'1 of 31 assets shown');h.get('#search').value='no matching';vm.runInContext('renderAssets()',h.context);assert.ok(h.get('#sector-list').innerHTML.includes('No matching assets'));});
test('load failure offers retry, not a paywall',async()=>{const h=harness({failure:true});await h.settle();assert.equal(h.get('#market-state').textContent,'Snapshot unavailable');assert.equal(h.get('#refresh').disabled,false);});
test('refresh failure retains usable data',async()=>{const h=harness();await h.settle();h.setFailure(true);await vm.runInContext('loadData()',h.context);assert.ok(h.get('#market-state').textContent.includes('Refresh failed'));assert.equal((h.get('#sector-list').innerHTML.match(/class="asset-card"/g)||[]).length,31);});
test('old member-access links lead to public data',async()=>{const h=harness({hash:'#member-access'});await h.settle();assert.deepEqual(h.redirects,['#sectors']);});
