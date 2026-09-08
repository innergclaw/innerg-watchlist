import {test} from 'node:test';
import assert from 'node:assert/strict';
import {researchEmail} from './scripts/research-email.mjs';
const sample={date:'2026-09-08',dailyBrief:'Sample brief.',lastWeek:'Verified work.',nextWeek:'Planned work.',news:[]};
test('email contains all requested sections and email controls',()=>{const m=researchEmail(sample);for(const text of ['NEWS / WHAT TO WATCH','DAILY BRIEF',"FROM THE BUILDER'S DESK",'Last week','Upcoming week focus','To stop'])assert.ok(m.body.includes(text));});
test('email refuses missing founder context and unsafe sources',()=>{assert.throws(()=>researchEmail({...sample,lastWeek:''}));assert.throws(()=>researchEmail({...sample,news:[{symbol:'TEST',date:'2026-09-08',summary:'Test',watch:'Test',risk:'Test',url:'javascript:alert(1)'}]}));});
