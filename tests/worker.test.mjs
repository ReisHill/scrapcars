import {test} from 'node:test';
import assert from 'node:assert/strict';
import worker, {handleQuote,validateLead} from '../worker/index.mjs';
const lead={registration:'AB12 CDE',condition:'running',v5c:'yes',postcode:'B1 1BB',email:'seller@example.com',phone:null,website:'',submission_id:'75f7d571-d0d3-4ec2-87a8-f4b2d208c7fe'};
const env={PUBLIC_ORIGIN:'https://example.com',QUOTE_DELIVERY_ENABLED:'true',RESEND_API_KEY:'test-only-key',QUOTE_TO:'quotes@example.com',QUOTE_FROM:'website@example.com',QUOTE_RATE_LIMITER:{limit:async()=>({success:true})}};
const request=(body=lead,headers={})=>new Request('https://example.com/api/quote',{method:'POST',headers:{Origin:'https://example.com','Content-Type':'application/json','CF-Connecting-IP':'192.0.2.1',...headers},body:JSON.stringify(body)});
const coverage=district=>Response.json({status:200,result:{admin_district:district}});

test('server validation rejects malformed inputs and honeypot submissions',()=>{
 assert.equal(validateLead(lead).registration,'AB12CDE');
 for(const bad of [{registration:'<x>'},{condition:'other'},{v5c:'maybe'},{email:'a@b.com\r\nBcc:x@y.com'},{phone:'abc'},{phone:'123'},{postcode:'bad'},{website:'spam'},{submission_id:'x'}])assert.equal(validateLead({...lead,...bad}),null);
});
test('email is accepted only after server coverage and provider acceptance',async()=>{
 const calls=[];
 const fetcher=async(url,options)=>{
  calls.push({url,options});
  return url.includes('postcodes.io')?coverage('Birmingham'):Response.json({id:'provider-123'});
 };
 const response=await handleQuote(request(),env,fetcher);
 assert.equal(response.status,200);assert.equal(response.headers.get('Cache-Control'),'no-store');
 assert.deepEqual(await response.json(),{status:'sent',request_id:lead.submission_id});
 assert.equal(calls.length,2);
 const mail=JSON.parse(calls[1].options.body);
 assert.equal(mail.reply_to,lead.email);assert.deepEqual(mail.to,['quotes@example.com']);
 assert.match(mail.text,/Phone: Not provided/);assert.doesNotMatch(mail.text,/192\.0\.2\.1/);
 assert.equal(calls[1].options.headers['Idempotency-Key'],'quote/'+lead.submission_id);
});
test('out-of-area, unavailable lookup and provider failure never report sent',async()=>{
 for(const district of ['Coventry','Solihull','London']){
  let count=0;const response=await handleQuote(request(),env,async()=>{count++;return coverage(district);});
  assert.equal(response.status,422);assert.equal(count,1);
 }
 for(const lookup of [()=>new Response('',{status:503}),()=>Response.json({status:200,result:{}}),()=>{throw new Error('timeout');}]){
  assert.equal((await handleQuote(request(),env,lookup)).status,503);
 }
 for(const provider of [()=>new Response('',{status:500}),()=>Response.json({}),()=>Response.json({id:'<invalid>'})]){
  assert.equal((await handleQuote(request(),env,async url=>url.includes('postcodes.io')?coverage('Sandwell'):provider())).status,503);
 }
});
test('origin, configuration, rate limit and body limits block upstream sends',async()=>{
 const noFetch=()=>{throw new Error('No upstream expected');};
 assert.equal((await handleQuote(request(),{...env,QUOTE_DELIVERY_ENABLED:'false'},noFetch)).status,503);
 assert.equal((await handleQuote(request(),{...env,RESEND_API_KEY:''},noFetch)).status,503);
 assert.equal((await handleQuote(request(lead,{Origin:'https://other.example'}),env,noFetch)).status,403);
 assert.equal((await handleQuote(request(),{...env,QUOTE_RATE_LIMITER:{limit:async()=>({success:false})}},noFetch)).status,429);
 assert.equal((await handleQuote(request(lead,{'Content-Type':'text/plain'}),env,noFetch)).status,415);
 assert.equal((await handleQuote(request({...lead,extra:'x'.repeat(9000)}),env,noFetch)).status,400);
 assert.equal((await handleQuote(new Request('https://example.com/api/quote'),env,noFetch)).status,405);
});
test('worker serves assets and rejects unknown API paths',async()=>{
 const assets={ASSETS:{fetch:async()=>new Response('static')}};
 assert.equal(await (await worker.fetch(new Request('https://example.com/'),assets)).text(),'static');
 assert.equal((await worker.fetch(new Request('https://example.com/api/other'),assets)).status,404);
});
