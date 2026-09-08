import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {updateSectionNavigation} from './section-nav.mjs';
test('all six menu links have unique existing sections',()=>{
 const html=readFileSync(new URL('./index.html',import.meta.url),'utf8');
 const nav=html.match(/<nav class="section-nav"[\s\S]*?<\/nav>/)[0];
 const ids=[...nav.matchAll(/href="#([^"]+)"/g)].map(m=>m[1]);
 assert.equal(ids.length,6);
 for(const id of ids) assert.equal(html.split(`id="${id}"`).length-1,1);
 assert.match(html,/<body id="top">/);
});
test('selected section is identified without changing page content',()=>{
 const links=['#overview','#asset-news'].map(href=>({href,getAttribute(){return href;},setAttribute(key,value){this[key]=value;},removeAttribute(key){delete this[key];}}));
 const root={querySelectorAll:()=>links};
 updateSectionNavigation(root,'#asset-news');
 assert.equal(links[1]['aria-current'],'location');
 assert.equal(links[0]['aria-current'],undefined);
 updateSectionNavigation(root,'#overview');
 assert.equal(links[1]['aria-current'],undefined);
});
