import { SLOT_TYPES, SLOT_LABELS, ARMOR_PARTS, ARMOR_RANKS } from './content.mjs';
// UI共享的纯计算：星图布局、导航、舰型组合与装备。宿主和离线预览使用同一份。
export const PLANET_TYPES = ['岩石行星','陆地行星','海洋行星','沙漠行星','冰封行星','熔岩行星','气态巨行星','荒芜行星'];
export const BODY_SLOTS = ['头部','躯干','左臂','右臂','左腿','右腿'];
export const HULLS = [
  {id:'scout',name:'曙光级轻型船体',role:'侦察',size:1,slots:4,power:80,mass:80,hull:650,shield:80,capacity:120,crew:12,speed:1.6,cost:25,shape:'dart'},
  {id:'escort',name:'白隼级护航船体',role:'护航',size:2,slots:6,power:150,mass:160,hull:1300,shield:180,capacity:250,crew:35,speed:1.25,cost:60,shape:'wing'},
  {id:'cruiser',name:'北辰级巡航船体',role:'主力',size:3,slots:9,power:270,mass:340,hull:2800,shield:350,capacity:650,crew:100,speed:1,cost:150,shape:'spear'},
  {id:'carrier_v7',name:'云海级载舰船体',role:'载舰',size:4,slots:12,power:430,mass:580,hull:5200,shield:650,capacity:1500,crew:240,speed:.8,cost:320,shape:'carrier'},
  {id:'capital',name:'苍穹级母舰舰体',role:'母舰',size:5,slots:16,power:700,mass:1000,hull:10000,shield:1200,capacity:3000,crew:650,speed:.6,cost:700,shape:'citadel'},
];
// 以下为本MOD设计目录参数，不冒充原作舰型；大船槽位、质量、电力共同限制装配。
export const MODULES = [
  {id:'engine',name:'巡航推进阵列',kind:'动力',slot:1,power:18,mass:14,minSize:1,speed:.35,cost:12},
  {id:'jump',name:'空间航行核心',kind:'航行',slot:1,power:22,mass:20,minSize:1,cost:18},
  {id:'reactor',name:'高密魂导反应炉',kind:'能源',slot:1,power:-90,mass:35,minSize:2,cost:25},
  {id:'sensor',name:'远距星域扫描仪',kind:'探测',slot:1,power:10,mass:6,minSize:1,sensor:15000,cost:8},
  {id:'shield',name:'蓝晶护盾发生器',kind:'防御',slot:1,power:25,mass:12,minSize:1,shield:260,cost:18},
  {id:'armor',name:'复合舰体装甲',kind:'防御',slot:1,power:0,mass:30,minSize:1,armor:20,cost:15},
  {id:'laser',name:'脉冲魂导炮',kind:'武器',slot:1,power:20,mass:16,minSize:1,weapon:{kind:'能量',damage:130,range:2400,accuracy:.88,penetration:.25,energyCost:3,ammoCost:0,ammoType:'energy',cooldown:2},cost:16},
  {id:'rail',name:'重型电磁主炮',kind:'武器',slot:2,power:42,mass:60,minSize:3,weapon:{kind:'动能',damage:380,range:6000,accuracy:.72,penetration:.65,energyCost:5,ammoCost:1,ammoType:'重型炮弹',cooldown:5},cost:48},
  {id:'missile',name:'制导导弹发射组',kind:'武器',slot:1,power:12,mass:22,minSize:2,weapon:{kind:'导弹',damage:220,range:8000,accuracy:.8,penetration:.3,energyCost:1,ammoCost:1,ammoType:'导弹',cooldown:4},cost:30},
  {id:'pd',name:'近防拦截阵列',kind:'武器',slot:1,power:8,mass:8,minSize:1,weapon:{kind:'点防御',damage:35,range:350,accuracy:.98,penetration:0,energyCost:1,ammoCost:0,ammoType:'energy',cooldown:1},cost:10},
  {id:'hangar',name:'舰载机与轻艇整备机库',kind:'载具',slot:2,power:20,mass:55,minSize:3,cost:45},
  {id:'med',name:'医疗与生命维持舱',kind:'保障',slot:1,power:8,mass:15,minSize:1,cost:12},
  {id:'cargo',name:'扩展补给货舱',kind:'保障',slot:1,power:3,mass:15,minSize:1,capacity:250,cost:10},
];
const layouts=[['E','J','C','R','S','U','A'],['E','J','C','R','S','S','P','U','U','A'],['E','J','C','R','S','M','L','G','P','U','U','U','A','H'],['E','J','C','R','M','M','P','H','H','P','U','U','U','A','A','H'],['E','J','C','R','S','X','L','L','G','P','H','U','U','U','U','A','A']];
HULLS.forEach((h,i)=>{h.slotLayout=[...layouts[i],'B'].map((type,n)=>({id:'slot_'+n,type,section:['E','J','R'].includes(type)?'舰艉':['S','M','L','X','G','P'].includes(type)?'舰艏':'舰身'}));h.slots=h.slotLayout.length;});
const fits={engine:['E'],jump:['J'],reactor:['R'],sensor:['C'],shield:['U'],armor:['U'],laser:['S'],rail:['L'],missile:['G'],pd:['P'],hangar:['H'],med:['A'],cargo:['A']};
MODULES.forEach(m=>{m.fitTypes=fits[m.id];m.slot=1;});
MODULES.push({id:'medium_laser',name:'中型聚焦光束',kind:'武器',slot:1,power:30,mass:25,minSize:2,fitTypes:['M'],weapon:{kind:'能量',damage:235,range:3900,accuracy:.82,penetration:.4,energyCost:4,ammoCost:0,ammoType:'energy',cooldown:3},cost:28},{id:'axial',name:'轴基贯星炮',kind:'武器',slot:1,power:180,mass:180,minSize:5,fitTypes:['X'],weapon:{kind:'能量',damage:1800,range:15000,accuracy:.65,penetration:.8,energyCost:18,ammoCost:0,ammoType:'energy',cooldown:10},cost:180});
MODULES.push({id:'computer',name:'协同航行计算机',kind:'保障',slot:1,power:6,mass:5,minSize:1,fitTypes:['B'],sensor:1200,cost:14});
export function legacyCarrier(){const h={...HULLS[3],id:'hull_carrier',name:'云海级旧式舰体',role:'载舰',unlocked:true,researchProof:'旧版图纸兼容'};h.slotLayout='E J C R S M P H H G U U U A A'.split(' ').map((type,i)=>({id:'slot_'+i,type,section:'舰身'}));h.slots=h.slotLayout.length;return h;}
export function starterCatalog(){return {hulls:HULLS.map(h=>({...h,id:'hull_'+h.id,unlocked:true,researchProof:'本MOD基础技术库'})),modules:MODULES.map(m=>({...m,id:'module_'+m.id,unlocked:true,researchProof:'本MOD基础技术库'}))};}
export function availableCatalog(tables){const base=starterCatalog();return {hulls:Object.values(tables?.hulls||{}).filter(h=>h.id!=='hull_carrier'&&h.unlocked&&h.slotLayout?.length),modules:Object.values(tables?.modules||{}).filter(m=>m.unlocked&&m.fitTypes?.length),base};}
export function validateHullDefinition(h){if(!Array.isArray(h.slotLayout)||!h.slotLayout.length||h.slotLayout.length>48||h.slots!==h.slotLayout.length)throw Error('船体插槽定义与容量不一致');const ids=new Set();for(const slot of h.slotLayout){if(!slot||typeof slot.id!=='string'||!SLOT_TYPES.includes(slot.type)||ids.has(slot.id))throw Error('插槽类型/ID不合法或重复');ids.add(slot.id);}if(!Number.isInteger(h.size)||h.size<1||h.size>12)throw Error('船体尺寸须为1到12整数');if(h.shape==='custom'||h.silhouette){const a=h.silhouette;if(!a||typeof a.outline!=='string'||a.outline.length>6000||![a.outline,...(a.panels||[])].every(p=>typeof p==='string'&&/^[MmLlHhVvCcSsQqTtAaZz0-9eE+., \-]+$/.test(p)))throw Error('自定义舰形必须是受限SVG路径');if(a.pods&&!a.pods.every(row=>Array.isArray(row)&&row.length===4&&row.every(n=>Number.isFinite(n)&&n>=0&&n<=600)))throw Error('引擎舱坐标不合法');if(a.bridge&&(!Array.isArray(a.bridge)||a.bridge.length!==4||!a.bridge.every(n=>Number.isFinite(n)&&n>=0&&n<=600)))throw Error('舰桥坐标不合法');}}
export const ICON_PATHS = {
  gray:'M19 3A9 9 0 1 0 21 17Q12 21 9 13T19 3ZM17 7H21M19 5V9', atlas:'M12 3 14 9 21 12 14 15 12 21 10 15 3 12 10 9Z', federation:'M12 2 21 6 19 16 12 22 5 16 3 6ZM12 6V17M7 9 12 6 17 9', longma:'M4 18 7 8 12 3 17 8 20 18 12 14ZM7 18 12 21 17 18', neutral:'M12 3 21 12 12 21 3 12ZM7 12H17M12 7V17', hostile:'M5 4 19 20M19 4 5 20M4 8 8 4M16 20 20 16', nomad:'M3 17 12 4 21 17 12 13ZM5 20H19', pirate:'M6 5 12 2 18 5 19 12 16 16H8L5 12ZM8 19 16 21M16 19 8 21M8 8H10M14 8H16', curator:'M3 5 11 4 12 6 13 4 21 5V19L13 18 12 20 11 18 3 19ZM12 7V17', trade:'M3 8 12 3 21 8V18L12 22 3 18ZM3 8 12 13 21 8M12 13V22', salvage:'M6 3 5 8 9 12 13 8 12 3M9 12 18 21 21 18 12 9', mercenary:'M12 2 20 5V13L12 22 4 13V5ZM8 9 16 15M16 9 8 15', culture:'M5 5Q12 0 19 5V14Q12 25 5 14ZM8 9H9M15 9H16M9 14Q12 17 15 14', ecology:'M20 3Q5 1 4 12T12 21Q23 18 20 3ZM6 18 17 7', route:'M4 18 9 5 16 17 21 6M2 18H6M7 5H11M14 17H18', beast:'M4 16Q1 10 5 8L9 10 12 3 15 10 19 8Q23 10 20 16L12 21ZM8 14H9M15 14H16', leviathan:'M2 12 5 6 10 8 12 2 14 8 19 6 22 12 18 20 12 17 6 20ZM8 12 10 13M14 13 16 12', planet:'M3 12A9 9 0 1 0 21 12A9 9 0 1 0 3 12M1 16 23 8', ship:'M12 2 19 17 15 16 12 22 9 16 5 17ZM9 12H15', armor:'M8 3H16L20 7 18 12 16 11V21H8V11L6 12 4 7ZM10 6H14', gaia:'M12 2 14 8 21 7 17 12 21 17 14 16 12 22 10 16 3 17 7 12 3 7 10 8Z', close:'M5 5 19 19M19 5 5 19', back:'M15 4 7 12 15 20', scan:'M3 8V3H8M16 3H21V8M21 16V21H16M8 21H3V16M5 12H19', clock:'M12 3A9 9 0 1 1 11.99 3M12 6V12L16 15', plus:'M12 4V20M4 12H20', check:'M4 12 9 18 20 5', help:'M8 7Q8 2 13 3T17 9L12 13V15M12 19H12.01'
};
export function atlasHash(text) {let n=0;for(const c of String(text))n=(Math.imul(n,31)+c.charCodeAt(0))>>>0;return n;}
// 中立组织按业态区分色相，未归属星域用冷灰；颜色只作辅助，名称与排线另行区分。
const NEUTRAL_TINT={商业:'#4fd6a8',学术:'#6fd3d9',打捞:'#c9a37a',佣兵:'#e28f6b',文化:'#e7a6d0',生态:'#8fdc7a',航路:'#7fd0ff'};
export function factionOf(record, organizations={}) {
  const id=record?.controllerId || record?.organizationId;
  if(id==='org_federation')return {key:'federation',name:'斗罗联邦',color:'#79c3ff'};
  if(id==='org_longma')return {key:'longma',name:'龙马势力',color:'#b691ff'};
  const o=organizations[id];
  if(o?.kind==='游牧')return {key:'nomad',name:o.name,color:'#f2a13a'};
  if(o?.kind==='海盗')return {key:'pirate',name:o.name,color:'#ff5d72'};
  if(!o)return {key:'neutral',name:'中立 / 归属未明',color:'#a9abb6'};
  return {key:'neutral',name:o.name||'中立 / 归属未明',color:NEUTRAL_TINT[o.kind]||'#4fd6a8'};
}
export function atlasPosition(system, organizations) {
  const c=system?.coordinates||system?.details?.coordinates;if(c&&Number.isFinite(c.x)&&Number.isFinite(c.y))return {x:Math.max(90,Math.min(910,c.x)),y:Math.max(90,Math.min(550,c.y))};
  const f=factionOf(system,organizations), centers={federation:[270,280],longma:[735,265],neutral:[500,435],nomad:[720,480],pirate:[300,480]};const [x,y]=centers[f.key]||centers.neutral;
  const h=atlasHash(system.id),a=(h%360)*Math.PI/180,r=35+(h%135);return {x:x+Math.cos(a)*r,y:y+Math.sin(a)*r*.65};
}
export function estimateRoute(state, targetSystemId, {shipId=null, publicTransport=true}={}) {
  const origin=state.player.systemId;
  if(!origin)return {available:false,reason:'正文中的当前位置尚未定位，请先登记当前恒星系。'};
  if(!targetSystemId)return {available:false,reason:'目的地尚未关联恒星系。'};
  if(state.tables.ships[state.player.shipId]?.status==='航行')return {available:false,reason:'当前正在舰上航行，请先等待抵达再规划新的接驳。'};
  let selectedShip=null,design=null;
  if(!publicTransport){selectedShip=state.tables.ships[shipId];if(!selectedShip||!(state.player.ownedShipIds||[]).includes(shipId))return {available:false,reason:'这艘舰船尚未登记为玩家所有。'};if(selectedShip.systemId!==origin||selectedShip.status!=='就绪')return {available:false,reason:'舰船不在当前位置或当前不能出航。'};design=state.tables.designs[selectedShip.designId];if(!design)return {available:false,reason:'舰型性能档案尚未登记。'};}
  if(origin===targetSystemId){const minutes=publicTransport?180:Math.ceil(60/design.speed);return {available:true,minutes,days:Math.round(minutes/1440*1000)/1000,local:true,path:[],fuel:publicTransport?null:0,label:publicTransport?'公共星系交通':'舰载接驳',publicTransport};}
  const lanes=Object.values(state.tables.lanes||{}).filter(l=>state.knowledge[l.id]);
  const dist=new Map([[origin,0]]),previous=new Map(),todo=new Set([origin]);
  while(todo.size){let u=[...todo].sort((a,b)=>(dist.get(a)||0)-(dist.get(b)||0))[0];todo.delete(u);if(u===targetSystemId)break;
    for(const l of lanes){let v=l.fromId===u?l.toId:l.toId===u?l.fromId:null;if(!v||!Number.isFinite(l.minutes)||l.minutes<=0)continue;const cost=publicTransport?l.minutes+360:Math.ceil(l.minutes/design.speed);const n=dist.get(u)+cost;if(n<(dist.get(v)??Infinity)){dist.set(v,n);previous.set(v,{from:u,lane:l});todo.add(v)}}}
  if(!dist.has(targetSystemId))return {available:false,reason:'尚无已知航路连接目的地，需先测绘或取得航图。'};
  let speed=1,label='公共星际客运',fuel=0,path=[],v=targetSystemId;
  while(v!==origin){const p=previous.get(v);path.unshift(p.lane);fuel+=p.lane.fuelCost;v=p.from;}
  if(!publicTransport){label=selectedShip.name;if(path.some(l=>!Number.isFinite(l.fuelCost)))return {available:false,reason:'航路的燃料消耗尚未探明。'};if(selectedShip.fuel<fuel)return {available:false,reason:`航线需${fuel}燃料，当前不足。`};const supplies=path.reduce((sum,l)=>sum+Math.ceil(Math.ceil(l.minutes/design.speed)/1440),0);if(selectedShip.supplies<supplies)return {available:false,reason:`航线需${supplies}补给，当前不足。`};}
  const minutes=dist.get(targetSystemId);
  return {available:true,minutes,days:Math.round(minutes/1440*100)/100,path:path.map(l=>l.id),fuel:publicTransport?null:fuel,label,publicTransport};
}
export function assembleDesign(hullId, selection, name='未命名舰型', catalog=starterCatalog()) {
  const h=catalog.hulls.find(x=>x.id===hullId||x.id==='hull_'+hullId||(hullId==='carrier'&&x.id==='hull_carrier_v7'));if(!h)throw Error('未知或尚未解锁的船体');validateHullDefinition(h);
  const findModule=id=>catalog.modules.find(m=>m.id===id||m.id==='module_'+id),loadout={},errors=[];
  if(Array.isArray(selection)){for(const id of selection){const m=findModule(id);if(!m){errors.push('未知或未解锁的配件：'+id);continue;}const slot=h.slotLayout.find(t=>!loadout[t.id]&&m.fitTypes.includes(t.type));if(slot)loadout[slot.id]=m.id;else errors.push(m.name+'没有可用的对应插槽');}}
  else for(const [slotId,id]of Object.entries(selection||{}))if(id)loadout[slotId]=id;
  const parts=[];for(const [slotId,id]of Object.entries(loadout)){const slot=h.slotLayout.find(t=>t.id===slotId),m=findModule(id);if(!slot||!m){errors.push('未知插槽或配件');continue;}if(!m.fitTypes.includes(slot.type))errors.push(m.name+'不匹配'+slot.type+'槽');if(m.minSize>h.size)errors.push(m.name+'尺寸不兼容');parts.push(m);loadout[slotId]=m.id;}
  const used=parts.length,power=parts.reduce((n,m)=>n+m.power,0),mass=parts.reduce((n,m)=>n+m.mass,0);if(power>h.power)errors.push('供电不足');if(mass>h.mass)errors.push('配件质量超出承载');if(!parts.some(m=>m.kind==='动力'))errors.push('需要至少一个推进阵列');if(!parts.some(m=>m.kind==='航行'))errors.push('需要空间航行核心');
  const speed=Math.round((h.speed+parts.reduce((n,m)=>n+(m.speed||0),0))*100)/100, weapons=parts.filter(m=>m.weapon).map((m,i)=>({...m.weapon,id:'weapon_'+(i+1),name:m.name,description:'分型插槽配件',arc:m.fitTypes.includes('X')?'固定舰艏轴向':'前向120度'}));
  const signature=Object.entries(loadout).sort(([a],[b])=>a.localeCompare(b));
  const record={id:'design_'+atlasHash(JSON.stringify([h.id,signature,name])).toString(16),name,role:h.role,manufacturer:'玩家模块化设计',dimensions:(h.size*95+45)+'米标准船体',crew:h.crew,capacity:h.capacity+parts.reduce((n,m)=>n+(m.capacity||0),0),hull:h.hull,shield:h.shield+parts.reduce((n,m)=>n+(m.shield||0),0),armor:parts.reduce((n,m)=>n+(m.armor||0),0),evasion:Math.max(.02,.2-h.size*.025),sensor:5000+parts.reduce((n,m)=>n+(m.sensor||0),0),speed,fuelCapacity:h.size*150,supplyCapacity:h.size*200,propulsion:'模块化魂导推进与空间航行',communication:'加密定向星际通信',compartments:['舰桥','动力舱','生命维持舱',...parts.map(m=>m.name)],weapons,capabilities:parts.map(m=>m.name),limitations:['按插槽类型独立装配','电力'+power+'/'+h.power,'配件质量'+mass+'/'+h.mass,'图纸不等于舰船'],cost:{舰材:h.cost+parts.reduce((n,m)=>n+m.cost,0)},buildMinutes:h.size*1440,details:{catalogVersion:3,hullId:h.id,loadout,shape:h.shape,powerUsed:power,powerCapacity:h.power,slots:used,maxSlots:h.slots}};
  return {record,errors,valid:errors.length===0,hull:h,parts,loadout,used,power,mass};
}
export function equipmentBonuses(items) {
  const stats={},sets={};for(const item of items){for(const [k,n]of Object.entries(item.stats||{}))if(Number.isFinite(n))stats[k]=(stats[k]||0)+n;if(item.setName)(sets[item.setName]??=[]).push(item)}
  const bonuses=[];for(const [name,parts]of Object.entries(sets)){const unique=new Set(parts.map(p=>p.slot));const required=parts[0].setSize||6;if(unique.size>=required){const extra=parts[0].setBonus||{};for(const[k,n]of Object.entries(extra))if(Number.isFinite(n))stats[k]=(stats[k]||0)+n;bonuses.push({name,stats:extra})}}
  return {stats,bonuses};
}

export function dualArmorStatus(state){const items=Object.values(state.player.loadouts?.斗铠||{}).map(id=>state.tables.equipment[id]).filter(Boolean),armor=equipmentBonuses(items),mecha=state.tables.mechas?.[state.player.activeMechaId],ready=armor.bonuses.length>0&&items.every(i=>i.wordCount>=1),active=!!(mecha?.dualArmorCompatible&&ready&&mecha.energy>0);const stats={...armor.stats};if(mecha)for(const[k,n]of Object.entries(mecha.stats))stats[k]=(stats[k]||0)+n;if(active)for(const[k,n]of Object.entries(mecha.dualArmorBonus))stats[k]=(stats[k]||0)+n;return {active,mecha,armor,stats,reason:!mecha?'尚未驾驶整体机甲':!mecha.dualArmorCompatible?'机甲未配置双甲流接口':!ready?'斗铠未成套或字数未鉴定':mecha.energy<=0?'机甲能源耗尽':'斗铠在内、机甲在外，双甲协同已激活'};}

Object.assign(ICON_PATHS,{fauna_amoeba:'M6 15Q1 9 7 5Q13 1 18 6Q24 11 18 15L20 21 15 17 12 22 10 16 5 21ZM8 10H9M15 10H16',fauna_tiyanki:'M3 8Q11 2 19 7L22 11 18 13 16 20 12 21 14 14Q7 17 3 12ZM5 12 2 16M9 7 10 9',fauna_crystal:'M12 2 18 8 16 20 8 22 3 13 7 5ZM12 2 10 14 8 22M18 8 10 14 3 13M16 20 10 14',fauna_voidcloud:'M6 18Q1 17 3 11Q3 5 9 6Q15 0 19 7Q25 9 20 16L15 18M13 7 9 13H14L10 22',fauna_voidworm:'M2 6Q9 0 13 8T19 16L23 12 21 22Q14 24 12 16T5 12L2 16ZM7 5 9 7',fauna_cutholoid:'M5 5 15 2 22 10 18 20 7 22 2 13ZM6 14Q12 7 18 14L12 18ZM3 20 5 17M20 22 18 18',fauna_amoeba_elder:'M3 8 7 3 12 6 17 3 21 8 19 16 15 19 12 16 8 21 5 16ZM7 11H9M15 11H17',fauna_ether_drake:'M12 2 15 8 22 4 20 16 15 13 12 22 9 13 4 16 2 4 9 8ZM9 9 12 6 15 9',fauna_matriarch:'M2 8 6 2 12 6 18 2 22 8 18 15 16 22 12 20 14 13Q6 17 2 8ZM6 8H8M16 8H18',fauna_devourer:'M12 6A6 6 0 1 0 12.01 6M12 1V4M12 20V23M1 12H4M20 12H23M4 4 6 6M18 18 20 20M4 20 6 18M18 6 20 4',fauna_horror:'M2 22 4 9 8 14 10 2 14 9 19 3 18 15 23 19 17 22ZM8 17 12 14 16 17 12 20Z'});
