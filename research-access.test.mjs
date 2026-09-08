import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {activeResearchMember,researchState} from './research-rules.mjs';
import {setMoverContext,moverExplanation} from './weekly-mover.mjs';
test('only active, numbered, unexpired members can read research',()=>{
 const now=Date.parse('2026-09-08');
 const base={status:'active',membership_number:'TEST',access_source:'stripe',access_expires_at:'2027-01-01'};
 assert.equal(activeResearchMember(base,now),true);
 for(const m of [null,{}, {...base,status:'canceled'},{...base,status:'pending'},{...base,membership_number:null},{...base,access_expires_at:'2026-01-01'},{...base,access_expires_at:'bad'}])assert.equal(activeResearchMember(m,now),false);
 assert.equal(activeResearchMember({...base,access_source:'grandfathered'},now),true);
});
test('auth errors fail closed and do not become a free membership',()=>{assert.equal(researchState(401),'signed-out');assert.equal(researchState(403),'membership-required');assert.equal(researchState(500),'error');});
test('private content is absent from the public artifact',()=>{for(const file of ['asset-news.json','sunday-brief.json','researched-news.json'])assert.equal(fs.existsSync(`.public-site/data/${file}`),false);assert.equal(fs.existsSync('.public-site/supabase'),false);assert.ok(fs.existsSync('.public-site/data/watchlist.json'));});
test('public leader has no editorial text; sign-out clears member context',()=>{setMoverContext({symbol:'TEST',reviewedAt:new Date().toISOString(),x:'PRIVATE FACT',caution:'Risk',sources:[]});assert.match(moverExplanation('TEST'),/PRIVATE FACT/);setMoverContext(null);assert.doesNotMatch(moverExplanation('TEST'),/PRIVATE FACT/);assert.match(moverExplanation('TEST'),/Sign in/);});
test('research controller never requests public news files',()=>{const s=fs.readFileSync('member-access.mjs','utf8');assert.doesNotMatch(s,/data\/.*\.json/);assert.match(s,/signInWithOAuth/);assert.match(s,/verifyOtp/);assert.match(s,/membershipNumber/);assert.match(s,/SIGNED_OUT/);assert.match(s,/setMoverContext\(null\)/);});
test('email delivery uniqueness is enforced by the database',()=>{const s=fs.readFileSync('supabase/migrations/20260908233059_member_research_access.sql','utf8');assert.match(s,/primary key \(edition_id,user_id\)/);assert.match(s,/daily_email boolean not null default false/);assert.match(s,/enable row level security/);assert.match(s,/revoke all/);});
