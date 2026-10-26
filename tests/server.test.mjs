import {test} from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {createServer} from '../scripts/server.mjs';
import {root} from '../scripts/build.mjs';

test('local server handles real pages, query strings, redirects, 404s and unsafe requests',async t=>{
 const server=createServer(path.join(root,'dist'));
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 t.after(()=>new Promise(resolve=>server.close(resolve)));
 const base=`http://127.0.0.1:${server.address().port}`;
 let response=await fetch(base+'/quote/?reg=AB12%20CDE');
 assert.equal(response.status,200);assert.match(await response.text(),/Get a quote for:/);
 response=await fetch(base+'/locations/birmingham',{redirect:'manual'});
 assert.equal(response.status,308);assert.equal(response.headers.get('location'),'/locations/birmingham/');
 response=await fetch(base+'/does-not-exist/');assert.equal(response.status,404);assert.match(await response.text(),/Wrong turn/);
 response=await fetch(base+'/assets/style.css',{method:'HEAD'});assert.equal(response.status,200);assert.match(response.headers.get('content-type'),/text\/css/);assert.equal(await response.text(),'');
 response=await fetch(base+'/quote/',{method:'POST',body:'test'});assert.equal(response.status,405);
 response=await fetch(base+'/%2eenv');assert.equal(response.status,400);
});
