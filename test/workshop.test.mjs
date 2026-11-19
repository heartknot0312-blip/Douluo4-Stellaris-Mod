import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
const exists = fs.existsSync('outputs/斗四星际MOD-工坊作品包.json');
function setup() {
  const sandbox={crypto:crypto.webcrypto,TextEncoder,TextDecoder,console,setTimeout,clearTimeout};
  vm.runInNewContext(fs.readFileSync('work/workshop/modules.cjs','utf8'),sandbox);
  const modules=sandbox.__workshopModules;
  const original=JSON.parse(fs.readFileSync('work/card-inspection/decoded/original-zod.json'));
  let global={},scripts=[original],regexes=[],bindings={primary:'原卡世界书',additional:[]};
  const books=new Map([['原卡世界书',[{uid:1,name:'斗罗力量体系',content:'原卡内容',enabled:true,strategy:{type:'constant'}}]]]);
  let nextUid=10;
  const tv={win:{},api:()=>null,missing:[],charId:()=> 'test-character',charName:()=> '斗罗宇宙',charBooks:()=>structuredClone(bindings),rebindBooks:async b=>{bindings=structuredClone(b)},
    version:()=>({st:'1.19.0',th:'4.11.3'}),bookNames:()=>[...books.keys()],getBook:async n=>structuredClone(books.get(n)||[]),createBook:async n=>books.set(n,[]),deleteBook:async n=>books.delete(n),
    updateBook:async(n,fn)=>{books.set(n,await fn(structuredClone(books.get(n)||[])))},addEntries:async(n,rows)=>{const added=rows.map(r=>({...structuredClone(r),uid:nextUid++}));books.set(n,[...(books.get(n)||[]),...added]);return {new_entries:structuredClone(added)}},
    deleteEntries:async(n,predicate)=>{books.set(n,(books.get(n)||[]).filter(r=>!predicate(r)));return {worldbook:structuredClone(books.get(n)||[])}},savedEntries:async n=>structuredClone(books.get(n)||[]),
    scripts:()=>structuredClone(scripts),updateScripts:async fn=>{scripts=await fn(structuredClone(scripts))},regexes:()=>structuredClone(regexes),updateRegexes:async fn=>{regexes=await fn(structuredClone(regexes))},
    getGlobal:()=>structuredClone(global),updateGlobal:async fn=>{global=await fn(structuredClone(global))},saveSettings:async()=>{},scriptId:()=> 'installer-script',};
  let confirms=0;
  const core=modules.core.createCore({tv,confirm:async()=>{confirms++;return true}});
  const payload=JSON.parse(fs.readFileSync('outputs/斗四星际MOD-工坊作品包.json'));
  return {modules,tv,core,payload,original,inspect:()=>({scripts,regexes,bindings,books,global,confirms})};
}
test('工坊包通过原卡原生规范化与逐项SHA256检查', {skip:!exists},()=>{
  const {modules,payload}=setup();
  assert.equal(payload.parts.length,10);
  for(const p of payload.parts){const data=modules.parts.normalizePart(p.kind,p.data);const hash=crypto.createHash('sha256').update(modules.parts.hashInput(p.kind,data)).digest('hex');assert.equal(hash,p.hash)}
});
test('原工坊内核一次安装全部组件、登记原工坊记录并备份ZOD，卸载原样恢复', {skip:!exists},async()=>{
  const {core,payload,original,inspect}=setup();
  const pre=await core.preflight({work:payload.work,parts:payload.parts});assert(pre.isTarget);assert(Object.values(pre.parts).every(p=>p.state==='ready'));
  const installed=await core.importWork({payload,selected:payload.parts.map(p=>p.id)});
  assert.equal(installed.applied,10,JSON.stringify(installed));assert.equal(installed.failed.length,0);
  let s=inspect();assert.equal(s.scripts.length,2);assert.equal(s.regexes.length,1);assert.equal(s.bindings.additional.length,1);
  assert(s.scripts.find(x=>x.name==='斗罗ZOD').content.includes('DL4_SPACE_COMPAT_V1'));
  assert.equal(core.records().items[0].workId,payload.work.id);assert.equal(s.confirms,1);
  const removed=await core.uninstall({workId:payload.work.id});assert.equal(removed.problems.length,0);
  s=inspect();assert.equal(s.scripts.length,1);assert.equal(s.scripts[0].content,original.content);assert.equal(s.regexes.length,0);assert.equal(s.bindings.additional.length,0);assert.equal(core.records().items.length,0);
});
test('上一版发行包v6可升级到v7，原脚本及单一世界书绑定可恢复',{skip:!exists||!fs.existsSync('outputs/斗四星际MOD-v6-一键安装.script.json')},async()=>{const {core,payload,inspect,original}=setup();const content=JSON.parse(fs.readFileSync('outputs/斗四星际MOD-v6-一键安装.script.json')).content;const start=content.indexOf('const DL4_PACKAGE = ');const end=content.indexOf(';\nconst localTv',start);assert(start>=0&&end>start);const v6=JSON.parse(content.slice(start+'const DL4_PACKAGE = '.length,end));assert.equal(v6.work.version,6);for(const pkg of [v6,payload]){const result=await core.importWork({payload:pkg,selected:pkg.parts.map(p=>p.id)});assert.equal(result.failed.length,0);assert.equal(result.problems.length,0);}assert.equal(inspect().scripts.filter(s=>s.name==='斗四星际后端').length,1);assert.equal(inspect().bindings.additional.length,1);await core.uninstall({workId:payload.work.id});assert.equal(inspect().scripts[0].content,original.content);});
test('浅色 V8 可升级到魂环星盘，原工坊绑定及卸载备份可用', {skip:!exists}, async () => {
  const {core,payload,inspect,original}=setup();
  const installer=JSON.parse(fs.readFileSync('outputs/斗四星际MOD-v8-一键安装.script.json','utf8'));
  const previous=JSON.parse(installer.content.match(/^const DL4_PACKAGE = (.+);$/m)[1]);
  assert.equal(previous.work.version,8);
  assert(previous.work.version<payload.work.version);
  assert.equal(previous.work.id,payload.work.id);
  for(const pkg of [previous,payload]){
    const result=await core.importWork({payload:pkg,selected:pkg.parts.map(p=>p.id)});
    assert.equal(result.failed.length,0);
    assert.equal(result.problems.length,0);
  }
  assert.equal(core.records().items.length,1);
  assert.equal(core.records().items[0].version,payload.work.version);
  const backends=inspect().scripts.filter(s=>s.name==='斗四星际后端');
  assert.equal(backends.length,1);
  assert.equal(backends[0].content,payload.parts.find(p=>p.data.id===backends[0].id).data.content);
  assert.equal(inspect().bindings.additional.length,1);
  const removed=await core.uninstall({workId:payload.work.id});
  assert.equal(removed.problems.length,0);
  assert.equal(inspect().scripts[0].content,original.content);
});
test('工坊篡改哈希被拒绝，未改动任何原卡组件', {skip:!exists},async()=>{
  const {core,payload,inspect,original}=setup();payload.parts[0].data.content+='tampered';
  await assert.rejects(()=>core.importWork({payload,selected:payload.parts.map(p=>p.id)}),/校验码/);
  assert.equal(inspect().scripts[0].content,original.content);assert.equal(inspect().confirms,0);
});

test('同一工坊作品v1升级新版后只有一份后端，卸载仍恢复最初ZOD', {skip:!exists},async()=>{
  const {core,payload,modules,inspect,original}=setup();const old=structuredClone(payload);old.work.version=1;old.work.title='斗四星际战争与探索·后端';old.parts=old.parts.slice(0,5);
  const backend=old.parts.find(p=>p.kind==='script'&&p.data.name==='斗四星际后端');backend.data.content='// v1 synthetic backend';backend.hash=crypto.createHash('sha256').update(modules.parts.hashInput('script',modules.parts.normalizePart('script',backend.data))).digest('hex');
  await core.importWork({payload:old,selected:old.parts.map(p=>p.id)});const pre=await core.preflight({work:payload.work,parts:payload.parts});assert.equal(pre.record.version,1);assert(Object.values(pre.parts).every(p=>p.state!=='missing'));
  const upgraded=await core.importWork({payload,selected:payload.parts.map(p=>p.id)});assert.equal(upgraded.failed.length,0);assert.equal(upgraded.problems.length,0);assert.equal(core.records().items.length,1);assert.equal(core.records().items[0].version,payload.work.version);assert.equal(inspect().scripts.filter(s=>s.name==='斗四星际后端').length,1);
  await core.uninstall({workId:payload.work.id});assert.equal(inspect().scripts[0].content,original.content);
});

test('真实v2单字段ZOD形状升级v3双字段后仍可原样卸载', {skip:!exists},async()=>{
  const {core,payload,modules,inspect,original}=setup(),old=structuredClone(payload);old.work.version=2;
  const zod=old.parts.find(p=>p.kind==='script'&&p.data.name==='斗罗ZOD');zod.data.content=zod.data.content.replace('\n    星际待办: z.any().optional(),','');zod.hash=crypto.createHash('sha256').update(modules.parts.hashInput('script',modules.parts.normalizePart('script',zod.data))).digest('hex');
  await core.importWork({payload:old,selected:old.parts.map(p=>p.id)});assert(!inspect().scripts.find(s=>s.name==='斗罗ZOD').content.includes('星际待办:'));
  const result=await core.importWork({payload,selected:payload.parts.map(p=>p.id)});assert.equal(result.problems.length,0);assert(inspect().scripts.find(s=>s.name==='斗罗ZOD').content.includes('星际待办:'));assert.equal(inspect().scripts.filter(s=>s.name==='斗四星际后端').length,1);
  await core.uninstall({workId:payload.work.id});assert.equal(inspect().scripts[0].content,original.content);
});
