const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const {test} = require('node:test');
const source = fs.readFileSync('dist/assets/coverage.js', 'utf8');
function load(fetch) {
  const context = vm.createContext({fetch, AbortController, Date, setTimeout, clearTimeout});
  vm.runInContext(source + '\nthis.coverage = SCRAPLOCAL_COVERAGE;', context);
  return context.coverage;
}
const reply = (district, status=200) => ({ok:status===200, status, json:async()=>({status, result:{admin_district:district}})});
test('all five named districts accepted; neighbouring and unrelated districts blocked', async()=>{
  for(const district of ['Birmingham','Sandwell','Dudley','Walsall','Wolverhampton']) {
    assert.equal((await load(async()=>reply(district)).check('b700aa')).ok,true);
  }
  for(const district of ['Solihull','Coventry','Bromsgrove','Lichfield','South Staffordshire','Westminster']) {
    const result=await load(async()=>reply(district)).check('B1 1BB');
    assert.equal(result.ok,false); assert.equal(result.reason,'outside');
  }
});
test('404, provider failures, aborted requests and incomplete results never permit submission',async()=>{
  const replies=[async()=>reply(null,404),async()=>reply(null,500),async()=>{throw new Error('offline')},async()=>{throw Object.assign(new Error('timeout'),{name:'AbortError'})},async()=>({ok:true,status:200,json:async()=>({status:200,result:{}})})];
  for(const fetch of replies) assert.equal((await load(fetch).check('B1 1BB')).ok,false);
});
test('normalises postcodes, sends no contact details, and only caches completed checks',async()=>{
  let calls=0;
  const coverage=load(async(url, options)=>{calls++;assert.equal(url,'https://api.postcodes.io/postcodes/B11BB');assert.equal(options.credentials,'omit');assert.equal(options.referrerPolicy,'no-referrer');return reply('Birmingham');});
  assert.equal((await coverage.check('b1 1bb')).ok,true);
  assert.equal((await coverage.check('B11BB')).ok,true);
  assert.equal(calls,1);
  const unavailable=load(async()=>{calls++;throw new Error('offline');});
  await unavailable.check('B11BB');await unavailable.check('B11BB');assert.equal(calls,3);
});
