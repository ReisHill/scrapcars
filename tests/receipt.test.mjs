import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../public/assets/app.js',import.meta.url),'utf8');
const context=vm.createContext({document:{querySelector:()=>null,querySelectorAll:()=>[],addEventListener:()=>{}}});
vm.runInContext(source,context);
test('confirmation requires explicit mail receipt rather than just HTTP success',async()=>{
 for(const payload of [{}, {status:'queued',request_id:'quote-123'}, {status:'sent'}, {status:'sent',request_id:'<bad>'}]){
  await assert.rejects(()=>context.readDeliveryReceipt({ok:true,json:async()=>payload}));
 }
 await assert.rejects(()=>context.readDeliveryReceipt({ok:false,json:async()=>({status:'sent',request_id:'quote-123'})}));
 const receipt=await context.readDeliveryReceipt({ok:true,json:async()=>({status:'sent',request_id:'quote-123'})});
 assert.equal(receipt.request_id,'quote-123');
});
