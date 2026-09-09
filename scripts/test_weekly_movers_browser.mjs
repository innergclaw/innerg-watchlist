import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL || 'chrome'});
const base=process.env.TEST_BASE_URL || 'http://127.0.0.1:4173/';
await mkdir('/tmp/innerg-weekly-movers-qa',{recursive:true});
try {
 for(const width of [1440,390]){
  const page=await browser.newPage({viewport:{width,height:900}});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  // Local test doubles exercise the real controller. No users or sessions are created.
  await page.route('**/@supabase/supabase-js@2.112.4/+esm',route=>route.fulfill({contentType:'text/javascript',body:`
    let listener, session=null, status=200;
    window.testMemberState=(nextStatus)=>{status=nextStatus;session=nextStatus===0?null:{user:{id:'test-only'}};listener('SIGNED_IN',session);};
    export const createClient=()=>({auth:{getSession:async()=>({data:{session}}),onAuthStateChange:fn=>{listener=fn;},signOut:async()=>{session=null;listener('SIGNED_OUT',null);return{};}},functions:{invoke:async()=>status!==200?{error:{context:{status}}}:{data:{membershipNumber:'TEST-ONLY',mover:null,brief:{publishedAt:new Date().toISOString(),priceCapturedAt:new Date().toISOString(),weekOf:'2026-09-07',edition:'Test',items:[]},news:{checkedAt:new Date().toISOString(),coverage:[],items:[],sources:[]}}}}});
  `}));
  await page.goto(base,{waitUntil:'networkidle'});
  await page.locator('#leader-grid [data-weekly-rank="1"]').waitFor();
  assert.equal(await page.locator('#leader-grid [data-weekly-rank]').count(),1);
  assert.equal(await page.locator('.leader-locked').count(),2);
  for(const status of [403,500]){
   await page.evaluate(value=>window.testMemberState(value),status);
   await page.waitForFunction(()=>!document.querySelector('#research-retry').hidden);
   assert.equal(await page.locator('#leader-grid [data-weekly-rank]').count(),1);
  }
  await page.locator('#weekly-mover').scrollIntoViewIfNeeded();
  await page.screenshot({path:'/tmp/innerg-weekly-movers-qa/public-'+width+'.png'});
  await page.evaluate(()=>window.testMemberState(200));
  await page.waitForFunction(()=>document.querySelectorAll('#leader-grid [data-weekly-rank]').length===3);
  assert.equal(await page.locator('.leader-locked').count(),0);
  const first=page.locator('#leader-grid .interactive-chart').first();
  await first.locator('[data-period="day"]').click();
  assert.equal(await first.locator('[data-period="day"]').getAttribute('aria-pressed'),'true');
  await first.locator('[data-period="week"]').click();
  const slider=first.locator('.chart-slider');
  await slider.focus();await page.keyboard.press('ArrowLeft');
  assert.ok(await slider.getAttribute('aria-valuetext'));
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.locator('#weekly-mover').scrollIntoViewIfNeeded();
  await page.screenshot({path:'/tmp/innerg-weekly-movers-qa/member-'+width+'.png'});
  await page.locator('#research-signout').click();
  await page.waitForFunction(()=>document.querySelectorAll('.leader-locked').length===2);
  await page.locator('#research-signout').waitFor({state:'hidden'});
  assert.equal(await page.locator('#leader-grid [data-weekly-rank]').count(),1);
  assert.equal(await page.locator('#research-signout').isVisible(),false);
  assert.equal(await page.locator('.research-content').first().isVisible(),false);
  assert.deepEqual(errors,[]);
  console.log(width+': public, member, denied, error, chart keyboard, sign-out, no overflow passed');
  await page.close();
 }
} finally {await browser.close();}
