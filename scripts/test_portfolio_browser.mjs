import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser=await chromium.launch({headless:true,channel:'chrome'});
const base=process.env.TEST_BASE_URL || 'http://127.0.0.1:4173/';
await mkdir('/tmp/innerg-portfolio-qa',{recursive:true});
try {
 for(const width of [1440,390]){
  const page=await browser.newPage({viewport:{width,height:900}});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/@supabase/supabase-js@2.112.4/+esm',route=>route.fulfill({contentType:'text/javascript',body:`
    let listener,session=null,status=200;
    window.testMemberState=next=>{status=next;session=next===0?null:{user:{id:'test-only'}};listener('SIGNED_IN',session);};
    export const createClient=()=>({auth:{getSession:async()=>({data:{session}}),onAuthStateChange:fn=>{listener=fn;},signOut:async()=>{session=null;listener('SIGNED_OUT',null);return{};}},functions:{invoke:async()=>status!==200?{error:{context:{status}}}:{data:{membershipNumber:'TEST-ONLY',portfolio:{updatedAt:new Date().toISOString(),holdings:Array.from({length:8},(_,i)=>({symbol:'TEST'+i})),planned:[{symbol:'PLAN1'},{symbol:'PLAN2'}],watch:[{symbol:'DEMO',thesis:'my private scenario',watchFor:'hold the level',risk:'could fall'}]},mover:null,brief:{publishedAt:new Date().toISOString(),priceCapturedAt:new Date().toISOString(),weekOf:'2026-09-07',edition:'Test',items:[]},news:{checkedAt:new Date().toISOString(),coverage:[],items:[],sources:[]}}}}});
  `}));
  await page.goto(base,{waitUntil:'networkidle'});
  await page.locator('#my-holdings .research-gate').waitFor({state:'visible'});
  assert.equal(await page.locator('#portfolio-items').textContent(),'');
  for(const status of [403,500]){
   await page.evaluate(n=>window.testMemberState(n),status);
   await page.waitForFunction(()=>!document.querySelector('#research-retry').hidden);
   assert.equal(await page.locator('#portfolio-items').textContent(),'');
  }
  await page.locator('#my-holdings').scrollIntoViewIfNeeded();
  await page.screenshot({path:'/tmp/innerg-portfolio-qa/public-'+width+'.png'});
  await page.evaluate(()=>window.testMemberState(200));
  await page.locator('#portfolio-items li').first().waitFor();
  assert.equal(await page.locator('#portfolio-items li').count(),10);
  assert.match(await page.locator('#founder-watch-points').textContent(),/my private scenario/);
  await page.locator('#my-holdings').scrollIntoViewIfNeeded();
  await page.screenshot({path:'/tmp/innerg-portfolio-qa/member-'+width+'.png'});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.locator('#research-signout').click();
  await page.waitForFunction(()=>document.querySelector('#portfolio-items').textContent==='');
  assert.equal(await page.locator('#founder-watch-points').textContent(),'');
  assert.equal(await page.locator('#my-holdings .research-gate').isVisible(),true);
  const link=page.locator('#my-holdings .research-gate a').first();await link.focus();
  assert.equal(await link.evaluate(el=>el===document.activeElement),true);
  assert.deepEqual(errors,[]);
  console.log(width+': portfolio public/denied/error/member/sign-out/focus/overflow passed');
  await page.close();
 }
} finally {await browser.close();}
