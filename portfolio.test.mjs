import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validatePortfolio,renderPortfolio,renderFounderWatch} from './brief.mjs';
const sample={updatedAt:'2026-09-10T01:00:00Z',holdings:[{symbol:'TEST'}],planned:[{symbol:'PLAN'}],watch:[{symbol:'DEMO',thesis:'my scenario',watchFor:'hold the level',risk:'could fall'}]};
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
