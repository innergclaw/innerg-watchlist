import test from 'node:test';
import assert from 'node:assert/strict';
import { topWeeklyMover, topWeeklyMovers, weeklyMoversMarkup, setWeeklyMoverAccess, moverExplanation, moverContext, setMoverContext } from './weekly-mover.mjs';
const rows=[{symbol:'AAA',name:'First',returns:{week:30}},{symbol:'BBB',name:'Second',returns:{week:20}},{symbol:'CCC',name:'Third',returns:{week:10}},{symbol:'DDD',name:'Fourth',returns:{week:5}}];
test('top three sort by percentage, exclude invalid returns and duplicates, preserve inputs',()=>{
 const input=[rows[2],{symbol:'BAD',returns:{week:NaN}},rows[0],rows[1],rows[0],rows[3]];
 assert.deepEqual(topWeeklyMovers(input).map(a=>a.symbol),['AAA','BBB','CCC']);
 assert.equal(input[0].symbol,'CCC');
 assert.deepEqual(topWeeklyMovers([{symbol:'Z',returns:{week:-2}},{symbol:'A',returns:{week:-2}},{symbol:'B',returns:{week:-9}}]).map(a=>a.symbol),['A','Z','B']);
 assert.equal(topWeeklyMovers([{symbol:'A',returns:{week:null}},{symbol:'B',returns:{week:Infinity}}]).length,0);
});
test('public sees one actual mover plus two anonymous locked cards',()=>{
 setWeeklyMoverAccess(false);setMoverContext(null);
 const html=weeklyMoversMarkup(rows);
 assert.equal((html.match(/data-weekly-rank=/g)||[]).length,1);
 assert.equal((html.match(/class="leader-card leader-locked"/g)||[]).length,2);
 assert.match(html,/>AAA</);assert.doesNotMatch(html,/BBB|CCC|Second|Third/);
 assert.match(html,/href="#member-access"/);
});
test('verified member sees three; sign-out and non-boolean access fail closed',()=>{
 setWeeklyMoverAccess(true);let html=weeklyMoversMarkup(rows);
 assert.equal((html.match(/data-weekly-rank=/g)||[]).length,3);assert.doesNotMatch(html,/leader-locked/);
 for(const value of [false,null,'true',{},undefined]){
  setWeeklyMoverAccess(value);html=weeklyMoversMarkup(rows);
  assert.equal((html.match(/data-weekly-rank=/g)||[]).length,1);
 }
});
test('rankings change with the snapshot; missing data does not fabricate movers',()=>{
 setWeeklyMoverAccess(true);
 assert.match(weeklyMoversMarkup([{...rows[3],returns:{week:99}},...rows]),/data-weekly-rank="1"[\s\S]*?>DDD</);
 assert.doesNotMatch(weeklyMoversMarkup([rows[0]]),/Weekly rank 02/);
 assert.match(weeklyMoversMarkup([]),/Weekly data is unavailable/);
 setWeeklyMoverAccess(false);
});
test('highest finite return wins without mutating the list',()=>{
  const assets=[{symbol:'A',returns:{week:2}},{symbol:'ZEC',returns:{week:36}},{symbol:'B',returns:{week:null}}];
  assert.equal(topWeeklyMover(assets).symbol,'ZEC');assert.equal(assets[0].symbol,'A');
  assert.equal(topWeeklyMover([]),null);
  assert.equal(topWeeklyMover([{symbol:'A',returns:{week:-5}},{symbol:'B',returns:{week:-2}}]).symbol,'B');
});
test('context cannot follow a different leader or outlive its review',()=>{
  setMoverContext({symbol:'ZEC',reviewedAt:'2026-09-08T12:00:00Z',x:'Test reporting',caution:'Test risk',sources:[{label:'Test source',url:'https://example.com/research'}]});
  const now=Date.parse(moverContext.reviewedAt);
  assert.match(moverExplanation('ZEC',now),/Test reporting/);
  assert.doesNotMatch(moverExplanation('BTC',now),/Test reporting/);
  assert.doesNotMatch(moverExplanation('ZEC',now+8*86400000),/Test reporting/);
  assert.match(moverExplanation('ZEC',now),/noopener noreferrer/);
});
test('published mover explanation excludes Reddit material and links',()=>{
  assert.doesNotMatch(JSON.stringify(moverContext),/reddit/i);
  assert.doesNotMatch(moverExplanation('ZEC',Date.parse(moverContext.reviewedAt)),/reddit/i);
  setMoverContext(null);assert.match(moverExplanation('ZEC'),/Sign in with INNERG ID/);
});
