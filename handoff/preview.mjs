// Rebuild outside the checkout. Only the self-contained HTML is served.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
const root=fileURLToPath(new URL('../',import.meta.url));
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'douluo4-preview-'));
let page;
try {
  for(const dir of ['src','scripts','prompts','assets'])fs.cpSync(path.join(root,dir),path.join(tmp,dir),{recursive:true});
  for(const args of [['scripts/build.mjs'],['scripts/preview.mjs','--build-only']])execFileSync(process.execPath,args,{cwd:tmp,stdio:'pipe'});
  page=fs.readFileSync(path.join(tmp,'outputs/星海导航-预览.html'));
} finally {fs.rmSync(tmp,{recursive:true,force:true});}
const port=Number(process.env.PORT||8766);
if(!Number.isInteger(port)||port<0||port>65535)throw Error('Invalid PORT');
const server=http.createServer((req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;
  if(!['GET','HEAD'].includes(req.method)||!['/','/index.html'].includes(pathname)){res.writeHead(404).end();return;}
  res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});
  res.end(req.method==='HEAD'?undefined:page);
});
server.listen(port,'127.0.0.1',()=>console.log('http://127.0.0.1:'+server.address().port+'/'));
