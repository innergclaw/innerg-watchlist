import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {closingReportMarkup, validateClosingReport} from './closing-report.mjs';

const report=JSON.parse(readFileSync('data/closing-report.json','utf8'));

test('closing report contains five unique gainers and five unique losers',()=>{
  validateClosingReport(report);
  const all=[...report.gainers,...report.losers];
  assert.equal(all.length,10);
  assert.equal(new Set(all.map(item=>item.symbol)).size,10);
});

test('closing report is ordered and excludes continuous crypto markets',()=>{
  assert.deepEqual(report.gainers.map(item=>item.changePercent),[...report.gainers].map(item=>item.changePercent).sort((a,b)=>b-a));
  assert.deepEqual(report.losers.map(item=>item.changePercent),[...report.losers].map(item=>item.changePercent).sort((a,b)=>a-b));
  for(const item of [...report.gainers,...report.losers])assert.notEqual(item.sector,'crypto');
});

test('closing report markup escapes names and links the graphic',()=>{
  const copy=structuredClone(report);copy.gainers[0].name='<script>';
  const html=closingReportMarkup(copy);
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('assets/innerg-closing-bell.png'));
});
