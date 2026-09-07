import test from 'node:test';
import assert from 'node:assert/strict';
import { topWeeklyMover, moverExplanation, moverContext } from './weekly-mover.mjs';
test('highest finite return wins without mutating the list',()=>{
  const assets=[{symbol:'A',returns:{week:2}},{symbol:'ZEC',returns:{week:36}},{symbol:'B',returns:{week:null}}];
  assert.equal(topWeeklyMover(assets).symbol,'ZEC');assert.equal(assets[0].symbol,'A');
  assert.equal(topWeeklyMover([]),null);
  assert.equal(topWeeklyMover([{symbol:'A',returns:{week:-5}},{symbol:'B',returns:{week:-2}}]).symbol,'B');
});
test('context cannot follow a different leader or outlive its review',()=>{
  const now=Date.parse(moverContext.reviewedAt);
  assert.match(moverExplanation('ZEC',now),/Wu Blockchain/);
  assert.doesNotMatch(moverExplanation('BTC',now),/Wu Blockchain/);
  assert.doesNotMatch(moverExplanation('ZEC',now+8*86400000),/Wu Blockchain/);
  assert.match(moverExplanation('ZEC',now),/noopener noreferrer/);
});
