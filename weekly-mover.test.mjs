import test from 'node:test';
import assert from 'node:assert/strict';
import { topWeeklyMover, moverExplanation, moverContext, setMoverContext } from './weekly-mover.mjs';
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
