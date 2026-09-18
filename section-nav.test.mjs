import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {updateSectionNavigation} from './section-nav.mjs';
test('daily research replaces the Sunday menu and keeps old links working',()=>{
 const html=readFileSync(new URL('./index.html',import.meta.url),'utf8');
 assert.match(html,/href="#what-to-watch">Daily Research/);
 assert.match(html,/id="sunday-brief"/);
 assert.doesNotMatch(html,/Sunday Brief|The Sunday brief/);
 const link={getAttribute:()=> '#what-to-watch',setAttribute(key,value){this[key]=value;},removeAttribute(key){delete this[key];}};
 updateSectionNavigation({querySelectorAll:()=>[link]},'#sunday-brief');
 assert.equal(link['aria-current'],'location');
});
test('all menu links have unique existing sections',()=>{
 const html=readFileSync(new URL('./index.html',import.meta.url),'utf8');
 const nav=html.match(/<nav class="section-nav"[\s\S]*?<\/nav>/)[0];
 const ids=[...nav.matchAll(/href="#([^"]+)"/g)].map(m=>m[1]);
 assert.deepEqual(ids,['overview','closing-bell','weekly-setups','weekly-mover','my-holdings','what-to-watch','asset-news','sectors']);
 for(const id of ids) assert.equal(html.split(`id="${id}"`).length-1,1);
 assert.doesNotMatch(nav,/HYPE ATH|market-flash|Referral/);
 assert.match(html,/<body id="top"[^>]*>/);
});
test('HYPE feature sits inside Asset News instead of the global menu',()=>{
 const html=readFileSync(new URL('./index.html',import.meta.url),'utf8');
 const assetNewsStart=html.indexOf('<section class="asset-news" id="asset-news"');
 const assetNewsEnd=html.indexOf('</section>',html.indexOf('</section>',assetNewsStart)+10);
 const hypeStart=html.indexOf('<section class="market-flash" id="market-flash"');
 assert.ok(assetNewsStart>=0);
 assert.ok(hypeStart>assetNewsStart);
 assert.ok(hypeStart<assetNewsEnd);
 assert.match(html.slice(assetNewsStart,hypeStart),/Keep up with what changed/);
 assert.match(html.slice(hypeStart),/Featured asset update/);
 assert.ok(hypeStart<html.indexOf('Your assets, one at a time.',assetNewsStart));
});
test('selected section is identified without changing page content',()=>{
 const links=['#overview','#asset-news'].map(href=>({href,getAttribute(){return href;},setAttribute(key,value){this[key]=value;},removeAttribute(key){delete this[key];}}));
 const root={querySelectorAll:()=>links};
 updateSectionNavigation(root,'#asset-news');
 assert.equal(links[1]['aria-current'],'location');
 assert.equal(links[0]['aria-current'],undefined);
 updateSectionNavigation(root,'#overview');
 assert.equal(links[1]['aria-current'],undefined);
 updateSectionNavigation(root,'#hype-chart-title');
 assert.equal(links[1]['aria-current'],'location');
});
