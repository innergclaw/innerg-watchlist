import {test} from 'node:test';
import assert from 'node:assert/strict';
import {researchEmail} from './scripts/research-email.mjs';
const sample={date:'2026-09-08',dailyBrief:'Sample brief.',lastWeek:'Verified work.',nextWeek:'Planned work.',news:[]};
test('email contains all requested sections and email controls',()=>{const m=researchEmail(sample);for(const text of ['news / what to watch for','daily brief',"from the builder's desk",'last week','upcoming week focus','to stop'])assert.ok(m.body.includes(text));assert.match(m.body,/https:\/\/nasirr.innergintel.org\/watchlist\/#what-to-watch/);assert.doesNotMatch(m.body,/innergclaw.github.io/);});
test('email refuses missing founder context and unsafe sources',()=>{assert.throws(()=>researchEmail({...sample,lastWeek:''}));assert.throws(()=>researchEmail({...sample,news:[{symbol:'TEST',date:'2026-09-08',summary:'Test',watch:'Test',risk:'Test',url:'javascript:alert(1)'}]}));});
