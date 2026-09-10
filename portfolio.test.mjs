import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validatePortfolio,renderPortfolio,renderFounderWatch} from './brief.mjs';
const sample={updatedAt:'2026-09-10T01:00:00Z',holdings:[{symbol:'TEST'}],planned:[{symbol:'PLAN'}],watch:[{symbol:'DEMO',thesis:'my scenario',watchFor:'hold the level',risk:'could fall'}]};
test('heatmap shows signed daily changes and distinct missing/flat states',()=>{
 const html=renderPortfolio({...sample,holdings:[{symbol:'UP',dailyChangePercent:4.5},{symbol:'DOWN',dailyChangePercent:-2.5},{symbol:'FLAT',dailyChangePercent:0},{symbol:'MISSING'}]});
 assert.match(html,/holding-up holding-strong/);assert.match(html,/\+4\.50%/);
 assert.match(html,/holding-down holding-medium/);assert.match(html,/-2\.50%/);
 assert.match(html,/0\.00%/);assert.match(html,/unchanged/);assert.match(html,/no update/);
 assert.equal((html.match(/class="holding-tile/g)||[]).length,4);
 for(const value of ['2.5',NaN,Infinity,-101])assert.throws(()=>renderPortfolio({...sample,holdings:[{symbol:'TEST',dailyChangePercent:value}]}));
});
test('heatmap ignores sensitive brokerage fields and uses equal tile sizes',()=>{
 const html=renderPortfolio({...sample,accountNumber:'PRIVATE_ACCOUNT',accountValue:98765.43,holdings:[{symbol:'TEST',dailyChangePercent:1.23,currentValue:98765.43,quantity:9876.54,costBasis:8765.43,accountWeight:76.54,totalGain:7654.32}]});
 assert.doesNotMatch(html,/PRIVATE_ACCOUNT|98765|9876|8765|76\.54|7654|currentValue|quantity|costBasis|accountWeight|totalGain|\$/);
 const css=readFileSync('styles.css','utf8');
 assert.match(css,/\.holdings-heatmap\{[^}]*grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
 assert.doesNotMatch(html,/style=/);
});
test('member copy has no internal provenance labels and retains risk context',()=>{
 const rendered=renderPortfolio(sample)+renderFounderWatch(sample);
 assert.doesNotMatch(rendered,/user-supplied|self-reported|verified live quote|not confirmed purchases|separate from the sunday news brief/i);
 assert.match(rendered,/investing involves risk/);
 assert.match(rendered,/what could weaken the case/);
 assert.match(rendered,/updated/);
});
test('holdings, plans, and personal watch notes remain distinct',()=>{
 const html=renderPortfolio(sample);
 assert.match(html,/what i hold/);assert.match(html,/planned long-term additions/);
 assert.match(html,/i do not hold these yet/);assert.doesNotMatch(html,/self-reported/);
 assert.match(renderFounderWatch(sample),/my personal watch notes/);
 assert.doesNotMatch(renderFounderWatch(sample),/user-supplied|verified live quote/);
});
test('portfolio data rejects invalid symbols and escapes private text',()=>{
 assert.throws(()=>validatePortfolio({...sample,holdings:[{symbol:'<script>'}]}));
 assert.throws(()=>validatePortfolio({...sample,planned:[{symbol:'TEST'}]}));
 assert.doesNotMatch(renderFounderWatch({...sample,watch:[{...sample.watch[0],thesis:'<script>alert(1)</script>'}]}),/<script>/);
 assert.match(renderPortfolio(null),/unavailable/);
});
test('holdings gate is cleared on lock and uses authenticated research response',()=>{
 const src=readFileSync('member-access.mjs','utf8');
 assert.match(src,/'sunday-brief','asset-news','my-holdings'/);
 assert.match(src,/'#portfolio-items'\)\.replaceChildren/);
 assert.match(src,/'#founder-watch-points'\)\.replaceChildren/);
 assert.match(src,/renderPortfolio\(data.portfolio\)/);
 const server=readFileSync('supabase/functions/member-research/index.ts','utf8');
 assert.ok(server.lastIndexOf("service.from('innerg_research_content')") > server.indexOf('if(!activeResearchMember(member))'));
});
