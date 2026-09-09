import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chartMarkup} from './interactive-charts.mjs';

test('chart entrance never applies a dash pattern to price paths',()=>{
  const css=readFileSync(new URL('./styles.css',import.meta.url),'utf8');
  assert.doesNotMatch(css,/stroke-dashoffset|@keyframes draw/);
  assert.match(css,/\.chart-enter svg\{animation:chart-reveal 240ms/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\).*\.chart-enter svg\{animation:none\}/);
});
test('seven recorded weekly prices render as one continuous path',()=>{
  const points=Array.from({length:7},(_,i)=>[1700000000+i*86400,100+i*i]);
  const html=chartMarkup({symbol:'ZEC',currency:'USD',charts:{week:{points,label:'Past 7 calendar days',interval:'Daily samples'}}});
  const path=html.match(/<path[^>]* d="([^"]+)"/)[1];
  assert.equal((path.match(/M /g)||[]).length,1);
  assert.equal((path.match(/L /g)||[]).length,6);
  assert.doesNotMatch(path,/NaN|undefined/);
});
