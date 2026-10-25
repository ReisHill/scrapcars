import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.xml':'application/xml','.txt':'text/plain; charset=utf-8','.json':'application/json'};
export function createServer(directory) {
 const root=path.resolve(directory);
 return http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Cache-Control','no-store');
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{Allow:'GET, HEAD'});res.end('Method not allowed');return;}
  let url,pathname;
  try{url=new URL(req.url,'http://localhost');pathname=decodeURIComponent(url.pathname);}catch{res.writeHead(400);res.end('Bad request');return;}
  if(pathname.includes('\0')||pathname.includes('\\')||pathname.split('/').some(segment=>segment.startsWith('.')&&segment!=='')){res.writeHead(400);res.end('Bad request');return;}
  let file=path.resolve(root,'.'+pathname);
  if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403);res.end('Forbidden');return;}
  let status=200;
  try{
   const info=await stat(file);
   if(info.isDirectory()){
    if(!pathname.endsWith('/')){res.writeHead(308,{Location:pathname+'/'+url.search});res.end();return;}
    file=path.join(file,'index.html');
   }
   const body=await readFile(file);
   res.writeHead(status,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Content-Length':body.length});
   res.end(req.method==='HEAD'?undefined:body);
  }catch(error){
   if(!['ENOENT','ENOTDIR','EISDIR'].includes(error.code)){res.writeHead(500);res.end('Server error');return;}
   try{const body=await readFile(path.join(root,'404.html'));res.writeHead(404,{'Content-Type':types['.html']});res.end(req.method==='HEAD'?undefined:body);}
   catch{res.writeHead(404);res.end(req.method==='HEAD'?undefined:'Not found');}
  }
 });
}
