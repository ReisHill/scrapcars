import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import path from 'node:path';
import {root} from '../scripts/build.mjs';
const read = name => readFile(path.join(root,'dist',name),'utf8');
test('independent build retains the complete site, reg-only entry and protected quote journey',async()=>{
 const home=await read('index.html');
 assert.match(home,/Sell your car/);assert.match(home,/name="reg"/);assert.doesNotMatch(home,/name="postcode"/);
 const quote=await read('quote/index.html');
 assert.match(quote,/name="postcode"/);assert.match(quote,/coverage\.js/);assert.doesNotMatch(quote,/Open menu|class="btn small"/);
 assert.equal((quote.match(/name="condition"/g)||[]).length,4);
 assert.match(await read('robots.txt'),/Allow: \//);
 assert.match(home,/<meta name="robots" content="noindex, nofollow">/);
 assert.doesNotMatch(home,/chatgpt\.site|appgprj_/);
 for(const city of ['birmingham','west-bromwich','smethwick','dudley','walsall','wolverhampton'])assert.match(await read(`locations/${city}/index.html`),/canonical/);
 assert.ok((await readdir(path.join(root,'dist','assets'))).includes('car-value.svg'));
});
