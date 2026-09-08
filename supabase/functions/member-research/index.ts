import { createClient } from 'npm:@supabase/supabase-js@2.112.4';
import { activeResearchMember } from '../../../research-rules.mjs';
const origins = new Set(['https://innergclaw.github.io','https://nasirr.innergintel.org','http://localhost:4173','http://127.0.0.1:4173']);
Deno.serve(async(req:Request)=>{
  const origin=req.headers.get('origin')||'';
  const headers={'Access-Control-Allow-Origin':origins.has(origin)?origin:'https://innergclaw.github.io','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info,x-publish-key','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Cache-Control':'private, no-store','Vary':'Origin'};
  const reply=(body:unknown,status=200)=>Response.json(body,{status,headers});
  if(req.method==='OPTIONS')return new Response('ok',{headers});
  if(!['GET','POST'].includes(req.method))return reply({error:'Method not allowed'},405);
  try {
    const url=Deno.env.get('SUPABASE_URL')!;
    const service=createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
    const publishKey=req.headers.get('x-publish-key');
    if(publishKey){
      const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(publishKey)))).map(b=>b.toString(16).padStart(2,'0')).join('');
      const {data:setting,error}=await service.from('innerg_research_settings').select('value').eq('id','publisher_sha256').maybeSingle();
      if(error||!setting||hash!==setting.value)return reply({error:'Unauthorized'},401);
      if(req.method==='GET'){
        const {data,error}=await service.from('innerg_research_content').select('id,payload');
        if(error)throw error;
        return reply(Object.fromEntries(data.map(row=>[row.id,row.payload])));
      }
      const text=await req.text();if(text.length>2000000)return reply({error:'Payload too large'},413);
      const {id,payload}=JSON.parse(text);
      if(!['news','brief','mover'].includes(id)||!payload||typeof payload!=='object')return reply({error:'Invalid publication'},400);
      if(id==='news'&&(!Array.isArray(payload.coverage)||!Array.isArray(payload.items)||!Number.isFinite(Date.parse(payload.checkedAt))))return reply({error:'Invalid news'},400);
      if(id==='brief'&&(!Array.isArray(payload.items)||!Number.isFinite(Date.parse(payload.publishedAt))))return reply({error:'Invalid brief'},400);
      const {error:saveError}=await service.from('innerg_research_content').upsert({id,payload,updated_at:new Date().toISOString()});
      if(saveError)throw saveError;return reply({ok:true});
    }
    const token=(req.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');
    if(!token)return reply({error:'Sign in with your INNERG account.'},401);
    const {data:{user},error:authError}=await service.auth.getUser(token);
    if(authError||!user)return reply({error:'Sign in with your INNERG account.'},401);
    const {data:member,error:memberError}=await service.from('innerg_memberships').select('status,membership_number,access_source,access_expires_at').eq('user_id',user.id).maybeSingle();
    if(memberError)throw memberError;
    if(req.method==='POST'){
      const body=await req.json();
      if(typeof body.dailyEmail!=='boolean')return reply({error:'Choose an email preference.'},400);
      // Former members can always unsubscribe. Only active members can opt in.
      if(body.dailyEmail&&!activeResearchMember(member))return reply({error:'Active INNERG membership required.'},403);
      const {error}=await service.from('innerg_research_preferences').upsert({user_id:user.id,daily_email:body.dailyEmail,updated_at:new Date().toISOString()});
      if(error)throw error;return reply({ok:true,dailyEmail:body.dailyEmail});
    }
    if(!activeResearchMember(member))return reply({error:'Active INNERG membership required.'},403);
    const [{data:content,error:contentError},{data:preference,error:prefError}]=await Promise.all([
      service.from('innerg_research_content').select('id,payload'),
      service.from('innerg_research_preferences').select('daily_email').eq('user_id',user.id).maybeSingle()
    ]);
    if(contentError||prefError)throw contentError||prefError;
    return reply({membershipNumber:member.membership_number,dailyEmail:preference?.daily_email===true,...Object.fromEntries(content.map(row=>[row.id,row.payload]))});
  }catch(error){console.error('Research request failed',error?.message);return reply({error:'Research is temporarily unavailable. Please retry.'},500);}
});
