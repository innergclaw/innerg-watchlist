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
    export const createClient=()=>({auth:{getSession:async()=>({data:{session}}),onAuthStateChange:fn=>{listener=fn;},signOut:async()=>{session=null;listener('SIGNED_OUT',null);return{};}},functions:{invoke:async()=>status!==200?{error:{context:{status}}}:{data:{membershipNumber:'TEST-ONLY',portfolio:{updatedAt:new Date().toISOString(),holdings:Array.from({length:8},(_,i)=>({symbol:'TEST'+i,dailyChangePercent:[-2.5,0.5,-1.5,4.5,0.25,7.5,0,null][i],currentValue:98765.43,quantity:9876.54})),planned:[{symbol:'PLAN1'},{symbol:'PLAN2'}],watch:[{symbol:'DEMO',thesis:'my private scenario',watchFor:'hold the level',risk:'could fall'}]},mover:null,brief:{publishedAt:new Date().toISOString(),priceCapturedAt:new Date().toISOString(),weekOf:'2026-09-07',edition:'Test',items:[]},news:{checkedAt:new Date().toISOString(),coverage:[],items:[],sources:[]}}}}});
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
  assert.equal(await page.locator('.holding-tile').count(),8);
  assert.doesNotMatch(await page.locator('#portfolio-items').textContent(),/98765|9876|\$/);
  const sizes=await page.locator('.holding-tile').evaluateAll(tiles=>tiles.map(tile=>({w:tile.getBoundingClientRect().width,h:tile.getBoundingClientRect().height})));
  for(const size of sizes){assert.ok(Math.abs(size.w-sizes[0].w)<1);assert.equal(size.h,sizes[0].h);}
  const contrast=await page.locator('.holding-tile').evaluateAll(tiles=>tiles.map(tile=>{
    const ctx=document.createElement('canvas').getContext('2d',{willReadFrequently:true});
    const luminance=color=>{ctx.fillStyle=color;ctx.fillRect(0,0,1,1);const rgb=[...ctx.getImageData(0,0,1,1).data].slice(0,3).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;};
    const css=getComputedStyle(tile),a=luminance(css.color),b=luminance(css.backgroundColor);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
  }));
  assert.ok(contrast.every(ratio=>ratio>=4.5),JSON.stringify(contrast));
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
