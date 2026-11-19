import { ARMOR_PARTS } from '../src/content.mjs';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import crypto from 'node:crypto';
import { createSeed, validateState, applyTransaction } from '../src/engine.mjs';
import { TABLES } from '../src/schema.mjs';
import { assembleDesign, BODY_SLOTS, estimateRoute } from '../src/ui-model.mjs';
import { L_GATE_CLUES, L_GATE_SYSTEM, L_GATE_PLACE, L_CLUSTER_ENCOUNTERS, lClusterPlaceId } from '../src/l-gate.mjs';
const s=createSeed();
const add=(table,id,name,fields)=>s.tables[table][id]={id,name,origin:'mod',summary:`${name}的合成预览资料`,details:{},secrets:{},aliases:[],status:'active',...fields};
for(const[id,name,kind]of [['org_archive','星海典藏会','学术'],['org_trade','联合航贸公社','商业'],['org_salvage','残星打捞联合体','打捞'],['org_nomad','逐星诸部','游牧'],['org_pirate','赤棘掠袭团','海盗']])add('organizations',id,name,{kind,territoryIds:[],headquartersId:null,structure:'议事会与常驻人员',economy:'专业服务与贸易',military:'驻站防卫力量',policy:'依条约开放',services:['资料服务'],contact:'公开通讯'});
const systems=[['sys_home','天罗航区','org_federation',220,230],['sys_douluo','母星航区','org_federation',330,190],['sys_border','银湾前哨','org_federation',190,365],['sys_longma','龙马核心区','org_longma',750,210],['sys_azure','碧潮恒星系','org_longma',660,340],['sys_trade','三帆恒星系','org_trade',465,385],['sys_archive','万卷恒星系','org_archive',520,295],['sys_nomad','逐星锚地','org_nomad',825,470],['sys_pirate','赤棘暗礁','org_pirate',340,470],['sys_void','寂蓝异常空间',null,600,500]];
for(const[id,name,controllerId,x,y]of systems)add('systems',id,name,{regionId:controllerId==='org_longma'?'region_longma_core':controllerId==='org_federation'?'region_federal_border':'region_neutral',environment:id==='sys_void'?'稳定裂隙与稀薄电离云':'稳定恒星、行星及航行空间',specialSpace:id==='sys_void',controllerId,claimedBy:controllerId?[controllerId]:[],coordinates:{x,y}});
const planets=[['planet_demo','澄海星','sys_home','高宜居度','海洋行星'],['planet_rock','霜砾四号','sys_home','低宜居度','岩石行星'],['planet_terra','晨陆星','sys_home','中宜居度','陆地行星'],['planet_ice','镜霜星','sys_home','低宜居度','冰封行星'],['planet_lava','赤熔二号','sys_home','不可宜居','熔岩行星'],['planet_trade','三帆星','sys_trade','中宜居度','陆地行星'],['planet_void','寂蓝漂移天体','sys_void','不可宜居','荒芜行星']];
for(const[id,name,systemId,habitability,planetType]of planets){const sys=s.tables.systems[systemId];add('planets',id,name,{systemId,regionId:sys.regionId,habitability,planetType,nativeLife:habitability!=='不可宜居',nativeMaxLevel:{不可宜居:null,低宜居度:70,中宜居度:99,高宜居度:110}[habitability],environment:'合成场景中的可探索天体环境',controllerId:sys.controllerId,colonized:habitability!=='不可宜居',resources:['稀有晶体','水资源'],surveyComplete:false});}
s.tables.planets.planet_douluo.systemId='sys_douluo';s.tables.planets.planet_douluo.regionId='region_federal_border';s.tables.planets.planet_douluo.planetType='陆地行星';
for(const[id,fromId,toId,minutes]of [['lane_1','sys_home','sys_trade',2880],['lane_2','sys_trade','sys_archive',1440],['lane_3','sys_archive','sys_longma',4320],['lane_4','sys_home','sys_douluo',1440],['lane_5','sys_longma','sys_azure',2160],['lane_6','sys_trade','sys_void',5760],['lane_7','sys_home','sys_border',1440],['lane_8','sys_trade','sys_pirate',2880],['lane_9','sys_longma','sys_nomad',2880]])add('lanes',id,`航路${id}`,{fromId,toId,minutes,fuelCost:15,hazards:[],access:'登记通行'});
add('sites','site_demo','潮汐蓝晶泉',{});
Object.assign(s.tables.sites.site_demo,{planetId:'planet_demo',natural:true,formation:'天然地热水脉与潮汐周期共同形成',grade:'星球级',lifeBearing:true,resourceType:'混合',hazards:['强潮汐','高能水流'],resources:['蓝晶髓','深海灵藻'],controllerId:null});
add('places','place_demo','远航港',{systemId:'sys_home',planetId:'planet_demo',organizationId:'org_federation',kind:'港口',access:'公共开放',services:['补给','客运'],hazards:[]});
const model=assembleDesign('escort',['engine','jump','sensor','laser'],'白隼号标准型');add('designs',model.record.id,model.record.name,model.record);
add('ships','ship_player','白隼 · 星澜号',{designId:model.record.id,organizationId:null,systemId:'sys_home',captainId:null,hull:model.record.hull,shield:model.record.shield,fuel:250,supplies:300,ammo:{},cargo:{舰材:50},credits:8000,damage:[],status:'就绪',availableAt:0,transit:null});
for(const[templateId,id,systemId,planetId]of [['bubbles','life_bubbles','sys_home','planet_demo'],['crystal','life_crystal','sys_azure',null],['amoeba_elder','life_elder','sys_border',null],['ether_drake','life_drake','sys_void','planet_void']])Object.assign(s,applyTransaction(s,{version:1,ops:[{op:'encounterFauna',templateId,id,systemId,planetId,source:'合成场景中实际遭遇'}]},{key:'preview-'+id}).state);
const inventory=[];for(const[i,slot]of ARMOR_PARTS.entries()){const id=`armor_${i}`;add('equipment',id,`星澜斗铠 · ${slot}`,{category:'斗铠',slot,setName:'星澜',setSize:11,wordCount:2,stats:{防御:12,机动:3},setBonus:{防御:45,魂导协调:20},requirements:'适配当前修为与身体状态'});inventory.push(id);}
s.player={...s.player,systemId:'sys_home',placeId:'place_demo',shipId:'ship_player',focusIds:['planet_demo'],ownedShipIds:['ship_player'],inventoryIds:inventory,loadouts:{斗铠:Object.fromEntries(ARMOR_PARTS.map((slot,i)=>[slot,`armor_${i}`])),机甲:{}}};add('mechas','mecha_wing','天翼 · 星澜定制型',{grade:'紫级',stats:{防御:60,机动:30},dualArmorCompatible:true,dualArmorBonus:{魂导协调:15,机动:12},compatibility:'可容纳斗铠并已完成魂导接口适配',features:['机甲/战机形态转换','武魂协同'],energy:850,maxEnergy:1000,requirements:'适配体型、驾驶训练与当前能源条件'});s.player.ownedMechaIds=['mecha_wing'];s.player.activeMechaId='mecha_wing';s.revision=28;s.clock=7200;
for(const[table,rows]of Object.entries(s.tables))for(const r of Object.values(rows))s.knowledge[r.id]={fields:Object.keys(TABLES[table]),source:'合成场景预览',learnedAt:0};
Object.assign(s.player.command.wallet,{联邦币:84000,能源:720,物资:1820});add('places','preview_yard','三帆联合船台',{systemId:'sys_trade',planetId:'planet_trade',organizationId:'org_trade',kind:'船坞',access:'民用开放',services:['造船'],hazards:[]});add('markets','preview_market','船台交易所',{placeId:'preview_yard',stock:{耐热瓷片:18},prices:{耐热瓷片:85}});add('orbitals','preview_moon','汐月',{systemId:'sys_home',planetId:'planet_demo',kind:'卫星',orbitRadius:230000});add('orbitals','preview_probe','气象哨',{systemId:'sys_home',planetId:'planet_demo',kind:'人造卫星',orbitRadius:35000});Object.assign(s.tables.planets.planet_demo,{population:18600000,industries:['潮汐能源','冷水养殖'],economy:'由海底电站与出口渔业支撑',specialties:['深海灵藻']});s.tables.organizations.org_pirate.stance='敌对';validateState(s);
// 只供离线视觉验收，真实组件不加载此场景。
fs.mkdirSync('work/atlas-preview',{recursive:true});fs.writeFileSync('work/atlas-preview/state.json',JSON.stringify(s));
const uiFiles=['src/command.mjs','src/console-view.mjs','src/flightdeck.mjs','src/desk-panels.mjs','src/survey-globe.mjs','src/hangar.generated.mjs','src/content.mjs','src/gray-content.mjs','src/gray-media.generated.mjs','src/l-gate.mjs','src/ui-model.mjs','src/fonts.generated.mjs','src/atlas-style.generated.mjs','src/atlas.mjs'];
const uiSource=uiFiles.map(p=>fs.readFileSync(p,'utf8').replace(/^import .*;\s*$/gm,'').replace(/^export /gm,'')).join('\n');
const reason='合成预览剧情中完成现场行动';
let demo=s;
function simulate(...ops){demo=applyTransaction(demo,{version:1,ops},{key:'gate-demo-'+demo.revision}).state;}
function gate(action,id){simulate({op:'lGate',action,...(id?{id}:{}),reason});}
function go(systemId,placeId=null){
  const {path:laneIds}=estimateRoute(demo,systemId);
  simulate({op:'publicTravel',laneIds,placeId,reason});
}
const scenes={briefing:s};
gate('start');
for(const clue of L_GATE_CLUES.slice(0,3)){go(clue.systemId,clue.placeId);gate('clue',clue.id);}
scenes.clues=demo;
for(const clue of L_GATE_CLUES.slice(3)){go(clue.systemId,clue.placeId);gate('clue',clue.id);}
go(L_GATE_SYSTEM,L_GATE_PLACE);
scenes.activation=demo;
gate('activate');
scenes.exploration=demo;
for(const event of L_CLUSTER_ENCOUNTERS.filter(item=>item.required)){
  go(event.systemId);gate('survey');go(event.systemId,lClusterPlaceId(event));gate('encounter',event.id);
}
scenes.complete=demo;
const html=`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>星海导航 · L-星门预览</title><body style="margin:0;background:linear-gradient(120deg,#edf8fa,#c5e3ef 55%,#f1ecfa);font:14px system-ui;color:#234858"><div style="padding:25px">星海导航离线预览　<label>演示存档 <select id="demo-stage"><option value="briefing">尚未开始</option><option value="clues">已收集 3/7</option><option value="activation">集齐 7/7</option><option value="exploration">星门已开启</option><option value="complete">已与灰风重逢</option></select></label> <button type="button" id="demo-affection" disabled>预览满好感</button></div><script type="module">
${uiSource.replace(/<\/script/gi,'<\\/script')}
const scenes=${JSON.stringify(scenes)};
let scene='briefing',state=structuredClone(scenes[scene]),notify=()=>{};
const backend={getUIState:()=>({ ...structuredClone(state),contextToken:scene,chatEpoch:0 }),subscribe:f=>{notify=f;return()=>{}},refresh:()=>notify(),requestAction:async()=>{}};
const affectionButton=document.querySelector('#demo-affection');
document.querySelector('#demo-stage').addEventListener('change',e=>{scene=e.currentTarget.value;state=structuredClone(scenes[scene]);affectionButton.disabled=scene!=='complete';affectionButton.textContent='预览满好感';notify();});
affectionButton.addEventListener('click',e=>{const g=state.tables.companions.gray_unique;g.weddingUnlocked=!g.weddingUnlocked;g.affection=g.weddingUnlocked?200:160;g.affectionReason=g.weddingUnlocked?'独立预览的演示档案':'在斗罗重逢，延续从L-星团起的羁绊';e.currentTarget.textContent=g.weddingUnlocked?'预览重逢时的好感度':'预览满好感';notify();});
window.previewActions=[];window.atlasPreview=mountAtlas({backend,document,preview:true,onAction:async text=>{window.previewActions.push(text)}});
</script></body></html>`;fs.writeFileSync('outputs/星海导航-预览.html',html);
fs.writeFileSync('outputs/前端预览证据.json',JSON.stringify({sourceFiles:uiFiles.map(p=>({path:p,sha256:crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')})),syntheticScene:true,sameMaintainedComponent:true,realSillyTavern:false,hostDocumentFrameHierarchy:'preview direct mount; actual helper iframe → accessible parent document pending',externalRequests:false},null,2));
if(fs.existsSync('outputs/manifest.json')){const manifest=JSON.parse(fs.readFileSync('outputs/manifest.json','utf8'));const alias='星海导航-v'+(manifest.workshopVersion||3)+'-预览.html';fs.writeFileSync('outputs/'+alias,html);const files=['星海导航-预览.html','前端预览证据.json',alias];manifest.artifacts=manifest.artifacts.filter(x=>!files.includes(x.path));for(const name of files)manifest.artifacts.push({path:name,sha256:crypto.createHash('sha256').update(fs.readFileSync('outputs/'+name)).digest('hex')});fs.writeFileSync('outputs/manifest.json',JSON.stringify(manifest,null,2));}
if(!process.argv.includes('--build-only')){const root=path.resolve('.');const server=http.createServer((req,res)=>{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);const target=path.resolve(root,'.'+(pathname==='/'?'/outputs/星海导航-预览.html':pathname));if(!target.startsWith(root+path.sep)){res.writeHead(403).end();return;}try{const ext=path.extname(target);res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.css':'text/css; charset=utf-8'})[ext]||'text/plain');res.end(fs.readFileSync(target));}catch{res.writeHead(404).end();}});server.listen(8766,'127.0.0.1',()=>console.log('Atlas preview: http://127.0.0.1:8766'));}
