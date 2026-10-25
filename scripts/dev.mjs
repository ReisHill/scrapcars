import {watch} from 'node:fs';
import path from 'node:path';
import {build,root} from './build.mjs';
import {createServer} from './server.mjs';
function argument(flag){
 const index=process.argv.indexOf(flag);
 if(index<0)return undefined;
 const value=process.argv[index+1];
 if(!value||value.startsWith('--'))throw new Error(`Missing value for ${flag}.`);
 return value;
}
const host=argument('--host')||process.env.HOST||'127.0.0.1';
const port=Number(argument('--port')||process.env.PORT||3000);
if(!Number.isInteger(port)||port<1||port>65535)throw new Error('PORT must be between 1 and 65535.');
// The canonical origin follows the local port unless explicitly configured.
process.env.SITE_ORIGIN ||= `http://localhost:${port}`;
build();
const server=createServer(path.join(root,'dist'));
server.on('error',error=>{console.error(error.message);process.exitCode=1;});
server.listen(port,host,()=>console.log(`Scrapcars running at http://localhost:${port}/ (${host}). ${process.argv.includes('--no-watch')?'':'Edit public/ or scripts/build.py, then refresh.'}`));
const watchers=[];
if(!process.argv.includes('--no-watch')){
 let timer;
 const rebuild=()=>{clearTimeout(timer);timer=setTimeout(()=>{try{build();console.log('Rebuilt. Refresh your browser.');}catch(error){console.error(error.message);}},150);};
 watchers.push(watch(path.join(root,'public'),{recursive:true},rebuild));
 watchers.push(watch(path.join(root,'scripts/build.py'),rebuild));
}
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{watchers.forEach(w=>w.close());server.close(()=>process.exit(0));});
