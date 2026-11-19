import { surveyGlobe } from './survey-globe.mjs';
import { HANGAR_ART } from './hangar.generated.mjs';
import { commandPanel } from './desk-panels.mjs';
import { hangarModel,territoryShape,orbitalChart } from './console-view.mjs';
import { authority,contactRank,orderPrice } from './command.mjs';
import { SLOT_LABELS, ARMOR_PARTS, ARMOR_RANKS, MECHA_GRADES, SHIP_FORMS, FAUNA_TEMPLATES } from './content.mjs';
import { UI_CSS } from './atlas-style.generated.mjs';
import { UI_FONTS } from './fonts.generated.mjs';
import { GRAY_MEDIA } from './gray-media.generated.mjs';
import { GRAY_PRESENTATION, GRAY_REUNION, GRAY_TIMELINE, GRAY_FIRST_CONTACT, GRAY_PORTRAITS, GRAY_AFFECTION_MIN, GRAY_AFFECTION_MAX, GRAY_AFFECTION_REUNION, grayAffectionStage, resolveGrayArt } from './gray-content.mjs';
import { ICON_PATHS, HULLS, MODULES, BODY_SLOTS, atlasHash, atlasPosition, factionOf, estimateRoute, assembleDesign, equipmentBonuses, availableCatalog, dualArmorStatus } from './ui-model.mjs';
import { L_GATE_REGION, L_GATE_SYSTEM, L_GATE_PLACE, L_GATE_TERMINAL, L_GATE_OUTPOSTS, L_GATE_ANCHOR, L_GATE_CLUES, L_CLUSTER_ENCOUNTERS, lGateStage, lClusterPlaceId } from './l-gate.mjs';

import {sectorInstruments} from './flightdeck.mjs';
export function mountAtlas({ backend, document: doc, preview = false, onAction } = {}) {
  if(!doc?.body)throw Error('无法访问浮窗宿主文档');
  const previous=doc.getElementById('dl4-atlas-host');previous?.dispatchEvent(new doc.defaultView.Event('dl4-atlas-destroy'));previous?.remove();
  const host=doc.createElement('div');host.id='dl4-atlas-host';doc.body.append(host);const root=host.attachShadow({mode:'open'});
  const style=doc.createElement('style');style.textContent=UI_CSS;root.append(style);
  const svgNS='http://www.w3.org/2000/svg';
  const el=(tag,attrs={},...children)=>{const n=doc.createElement(tag);for(const[k,v]of Object.entries(attrs)){if(k==='class')n.className=v;else if(k==='text')n.textContent=v;else if(k.startsWith('on'))n.addEventListener(k.slice(2),v);else if(v!==null&&v!==undefined)n.setAttribute(k,v);}for(const child of children.flat(Infinity)){if(child!==null&&child!==undefined)n.append(typeof child==='string'?doc.createTextNode(child):child);}return n;};
  const sv=(tag,attrs={},...children)=>{const n=doc.createElementNS(svgNS,tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,String(v));for(const c of children.flat())if(c)n.append(c);return n;};
  const icon=(name,cls='icon')=>sv('svg',{viewBox:'0 0 24 24',fill:'none',stroke:'currentColor','stroke-width':1.45,'stroke-linecap':'round','stroke-linejoin':'round',class:cls,'aria-hidden':'true'},sv('path',{d:ICON_PATHS[name]||ICON_PATHS.atlas}));
  const btn=(text,fn,kind='btn',ico)=>el('button',{type:'button',class:kind,onclick:fn},ico?icon(ico):null,text);
  const chip=(text,ico)=>el('span',{class:'chip'},ico?icon(ico):null,text);
  const muted=t=>el('div',{class:'muted',text:t});
  const empty=(text,ico='scan')=>el('div',{class:'empty'},icon(ico),text);
  const facts=entries=>{const dl=el('dl',{class:'facts'});for(const[k,v]of entries){dl.append(el('dt',{text:k}),el('dd',{text:v===null||v===undefined?'未记录':typeof v==='object'?JSON.stringify(v):String(v)}));}return dl;};
  const state={tab:'map',systemId:null,planetId:null,mapScope:'galaxy',filter:'all',search:'',zoom:1,panX:0,panY:0,hullId:'hull_escort',loadout:null,modules:['engine','jump','sensor','laser'],designName:'白隼 · 远航改型',equipmentCategory:'斗铠',grayView:'auto',grayFraming:'half',grayHistoryOpen:false,grayQuotesOpen:false,grayQuoteScroll:0,closed:true,expanded:new Set(['常见太空生命']),toast:null,mapSelection:null};
  let grayEntering=false,data=backend.getUIState(),unsub=null,resizeTimer=null,toastTimer=null,enterTimer=null,grayEnterTimer=null,lastPage=null,lastGrayPage=null,tickerKey='',fontFaces=null;
  const win$=doc.defaultView,still=()=>!!win$.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const frame=fn=>(win$.requestAnimationFrame||(f=>setTimeout(()=>f(Date.now()),16)))(fn);
  // 字体随包内嵌：Shadow DOM 内的 @font-face 不生效，改用宿主文档的 FontFace 集合；失败时回退系统字体。
  function loadFonts(){if(fontFaces)return;fontFaces=[];const FF=win$.FontFace,set=doc.fonts;if(!FF||!set)return;for(const f of UI_FONTS){try{const bin=win$.atob(f.data),bytes=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);const face=new FF(f.family,bytes,{weight:String(f.weight),style:'normal',display:'swap'});set.add(face);fontFaces.push(face);face.load?.().catch(()=>{});}catch{}}}
  const ornament=cls=>sv('svg',{class:'orn '+cls,viewBox:'0 0 44 44','aria-hidden':'true'},sv('path',{d:'M7 40V12L12 7H40',fill:'none',stroke:'currentColor'}),sv('path',{d:'M3 44V10L10 3H44',fill:'none',stroke:'currentColor',opacity:.45}),sv('rect',{x:4,y:4,width:6,height:6,transform:'rotate(45 7 7)',fill:'currentColor'}),sv('circle',{cx:22,cy:7,r:1.5,fill:'currentColor'}),sv('circle',{cx:7,cy:22,r:1.5,fill:'currentColor'}));
  const ornaments=()=>['tl','tr','bl','br'].map(ornament);
  const sigil=()=>sv('svg',{class:'sigil',viewBox:'0 0 52 52','aria-hidden':'true'},
    sv('defs',{},sv('linearGradient',{id:'dl4-sigil',x1:0,y1:0,x2:1,y2:1},sv('stop',{offset:0,'stop-color':'#fff0c6'}),sv('stop',{offset:.5,'stop-color':'#d8b46a'}),sv('stop',{offset:1,'stop-color':'#6b4f22'}))),
    sv('g',{class:'spin'},sv('circle',{cx:26,cy:26,r:24,fill:'none',stroke:'#d8b46a','stroke-width':.8,'stroke-dasharray':'1 3.2'})),
    sv('g',{class:'spin2'},sv('circle',{cx:26,cy:26,r:20,fill:'none',stroke:'#d8b46a','stroke-width':.6,opacity:.6}),sv('path',{d:'M26 4v4M26 44v4M4 26h4M44 26h4',stroke:'#f6dea2','stroke-width':1})),
    sv('path',{d:'M26 9 29.6 22.4 43 26 29.6 29.6 26 43 22.4 29.6 9 26 22.4 22.4Z',fill:'url(#dl4-sigil)',stroke:'#f6dea2','stroke-width':.6}),sv('circle',{cx:26,cy:26,r:3,fill:'#fff6dc'}));
  const fmt=n=>Number.isFinite(Number(n))?Number(n).toLocaleString('zh-CN'):String(n);
  // 数字从旧值滚到新值；首次打开从零开始。减少动效时直接显示。
  const counted=new Map();
  function countTo(node,key,value){const prev=counted.get(key);counted.set(key,value);const n=Number(value);if(prev===value||still()||!Number.isFinite(n)){node.textContent=fmt(value);return;}const from=Number.isFinite(Number(prev))?Number(prev):0,t0=Date.now();node.textContent=fmt(from);const step=()=>{const p=Math.min(1,(Date.now()-t0)/1100),e=1-Math.pow(1-p,4);node.textContent=fmt(Math.round(from+(n-from)*e));if(p<1&&node.isConnected)frame(step);else node.textContent=fmt(value);};frame(step);}
  const orb=el('button',{class:'orb',type:'button','aria-label':'打开星海导航',title:'星海导航',onclick:()=>open()},icon('atlas'));
  const win=el('section',{class:'window',role:'region','aria-label':'星海导航控制台',hidden:''});
  const grayOrb=el('button',{class:'orb gray-orb',type:'button','aria-label':'打开灰风管理界面',onclick:()=>openGray()},icon('gray'));
  const grayWindow=el('section',{class:'window gray-window',role:'region','aria-label':'灰风独立管理界面',hidden:''}),grayContent=el('main',{class:'content gray-content'});
  const grayClose=btn('',()=>closeGray(),'wbtn','close');grayClose.setAttribute('aria-label','关闭灰风界面');
  const grayEyebrow=el('div',{class:'eyebrow'}),grayTitle=el('b',{class:'brand'}),grayFooterText=el('span'),grayFooter=el('footer',{class:'footer'},el('i',{class:'beat','aria-hidden':'true'}),grayFooterText);
  const grayHeader=el('header',{class:'topbar'},icon('gray'),el('div',{},grayEyebrow,grayTitle),el('span',{class:'spacer'}),el('div',{class:'top-actions'},grayClose),el('i',{class:'glint','aria-hidden':'true'}));
  grayWindow.append(...ornaments(),grayHeader,grayContent,grayFooter);root.append(grayOrb,grayWindow);
  const brand=el('div',{class:'brand'},el('b',{text:'星海导航'}),el('small',{text:'Douluo · Astral Orrery'}));
  const refreshBtn=btn('',()=>{backend.refresh();toast('已重新读取当前聊天档案');},'wbtn','scan');refreshBtn.setAttribute('aria-label','刷新世界档案');refreshBtn.title='刷新世界档案';
  const closeBtn=btn('',()=>close(),'wbtn','close');closeBtn.setAttribute('aria-label','关闭星图');closeBtn.title='关闭';
  const counters=el('div',{class:'asset-bar','aria-label':'玩家资产'});
  const header=el('header',{class:'topbar'},sigil(),brand,counters,el('div',{class:'top-actions'},refreshBtn,closeBtn),el('i',{class:'glint','aria-hidden':'true'}));
  const sidebar=el('nav',{class:'sidebar','aria-label':'控制台栏目'}),rings=el('div',{class:'rings'},el('i',{class:'pillar','aria-hidden':'true'}));sidebar.append(rings);
  const tabs=[['map','星图','ATLAS','atlas'],['diplomacy','外交与贸易','CONTACTS','trade'],['designer','舰船设计器','SHIPYARD','ship'],['fleets','舰队编辑器','FLEETS','mercenary'],['equipment','玩家装备','ARMORY','armor'],['codex','星海图鉴','ARCHIVES','curator'],['tech','科技','RESEARCH','scan'],['growth','养成','COMPANIONS','gray'],['governance','玩家内政','ADMINISTRATION','federation']];
  // 九个栏目对应九枚魂环：百年黄、千年紫、万年黑、十万年红、百万年金。黑环以紫光描边。
  const RINGS={map:['I','#f2c84b','百年'],diplomacy:['II','#f2c84b','百年'],designer:['III','#a066ff','千年'],fleets:['IV','#a066ff','千年'],equipment:['V','#1b1222','万年'],codex:['VI','#1b1222','万年'],tech:['VII','#1b1222','万年'],growth:['VIII','#ec3d55','十万年'],governance:['IX','#ffd66e','百万年']};
  const ringGlow=id=>RINGS[id][1]==='#1b1222'?'#9b4dff':RINGS[id][1];
  const navs={};tabs.forEach(([id,title,sub],i)=>{const [num,col,age]=RINGS[id],glow=ringGlow(id),dark=col==='#1b1222'?{style:`filter:drop-shadow(0 0 2px ${glow})`}:{};
    const b=el('button',{type:'button',class:'nav','aria-label':title,title:`${title} · ${sub}`,'data-station':id});b.addEventListener('click',()=>go(id,b));
    b.style.setProperty('--rc',glow);b.style.setProperty('--d',((tabs.length-1-i)*110+250)+'ms');
    b.append(sv('svg',{class:'ring',viewBox:'0 0 88 56','aria-hidden':'true'},sv('g',{class:'ringg'},sv('path',{class:'halo',d:'M10 28A34 9 0 0 1 78 28',stroke:glow}),sv('path',{class:'arc',d:'M10 28A34 9 0 0 1 78 28',stroke:col,opacity:.85,...dark}),sv('rect',{x:42.5,y:16,width:3,height:7,fill:'#ffe9bd',opacity:.75}),sv('path',{class:'halo',d:'M78 28A34 9 0 0 1 10 28',stroke:glow}),sv('path',{class:'arc',d:'M78 28A34 9 0 0 1 10 28',stroke:col,...dark}),sv('ellipse',{class:'glintA',cx:44,cy:28,rx:34,ry:9}))),
      el('span',{class:'lbl'},el('b',{text:title}),el('small',{},num+' · ',el('i',{text:age}))));
    rings.append(b);navs[id]=b;});
  const sideLocation=el('div',{class:'sidebar-foot'});sidebar.append(sideLocation);
  const content=el('main',{class:'content'});
  const footerLeft=el('span'),ticker=el('div',{class:'ticker','aria-hidden':'true'}),footerRight=el('span');
  win.append(...ornaments(),header);if(preview)win.append(el('div',{class:'preview-banner',text:'离线界面预览 · 使用合成场景展示交互；不会写入酒馆或真实存档'}));win.append(el('div',{class:'layout'},sidebar,content),el('footer',{class:'footer'},el('i',{class:'beat','aria-hidden':'true'}),footerLeft,ticker,footerRight));root.append(orb,win);
  function go(id,from){state.tab=id;if(from&&!still()){const r=from.querySelector('svg').getBoundingClientRect(),w=win.getBoundingClientRect(),s=el('i',{class:'shock','aria-hidden':'true'});s.style.left=(r.left-w.left+r.width/2)+'px';s.style.top=(r.top-w.top+r.height/2)+'px';s.style.setProperty('--accent',ringGlow(id));win.append(s);setTimeout(()=>s.remove(),950);}render();content.scrollTop=0;}
  // 切页时内容逐块浮现、标题逐字升起、带 data-count 的数字从零滚动；仅在换页时触发，数据刷新不重播。
  function enterPage(box,timerName){box.classList.remove('enter');void box.offsetWidth;box.classList.add('enter');[...box.children].forEach((c,i)=>c.style.setProperty('--i',Math.min(i,9)));
    for(const h of box.querySelectorAll('.page-head h2')){const text=h.textContent;if(!text||text.length>24)continue;h.setAttribute('aria-label',text);h.replaceChildren(el('span',{'aria-hidden':'true'},[...text].map((c,k)=>{const s=el('span',{class:'ch',text:c});s.style.setProperty('--k',k);return s;})));}
    for(const n of box.querySelectorAll('[data-count]')){const v=Number(n.dataset.count);if(!Number.isFinite(v)||still())continue;const t0=Date.now();n.textContent='0';const step=()=>{const p=Math.min(1,(Date.now()-t0)/1500),e=1-Math.pow(1-p,4);n.textContent=fmt(Math.round(v*e));if(p<1&&n.isConnected)frame(step);};frame(step);}
    if(timerName==='gray'){clearTimeout(grayEnterTimer);grayEnterTimer=setTimeout(()=>box.classList.remove('enter'),1700);}else{clearTimeout(enterTimer);enterTimer=setTimeout(()=>box.classList.remove('enter'),1700);}}
  function tickerItems(){const items=['当前位置 · '+knownName(data.player.locationId||data.player.systemId)];for(const id of data.player.ownedShipIds||[]){const s=data.tables.ships[id];if(s)items.push(`${s.name} · ${s.status||'状态未确认'} · ${knownName(s.systemId)}`);}for(const o of Object.values(data.orders||{}))items.push(`造船委托 ${o.name} · ${o.status} · 交付日 ${Math.ceil(o.finishesAt/1440)}`);if(data.lGate?.opened)items.push('L-星门 · 已开启');else if(data.lGate?.clues?.length)items.push(`L-星门认知 · ${data.lGate.clues.length} / ${L_GATE_CLUES.length}`);const mecha=data.tables.mechas?.[data.player.activeMechaId];if(mecha)items.push(`驾驶中 · ${mecha.name}`);return items;}
  function toast(text){clearTimeout(toastTimer);state.toast?.remove();const t=el('div',{class:'toast',role:'status',text});(grayWindow.hidden?win:grayWindow).append(t);state.toast=t;toastTimer=setTimeout(()=>{t.remove();if(state.toast===t)state.toast=null;},5000);}
  function openGray(){loadFonts();const reopening=grayWindow.hidden;grayWindow.hidden=false;grayOrb.setAttribute('aria-expanded','true');if(reopening)lastGrayPage=null;data=backend.getUIState();renderGray();grayClose.focus();}
  function closeGray(){grayWindow.hidden=true;grayOrb.setAttribute('aria-expanded','false');grayOrb.focus();}
  function open(){loadFonts();const reopening=state.closed;state.closed=false;win.hidden=false;orb.setAttribute('aria-expanded','true');if(reopening){lastPage=null;counted.clear();sidebar.classList.remove('ignite');void sidebar.offsetWidth;sidebar.classList.add('ignite');}render();closeBtn.focus();}
  function close(){state.closed=true;win.hidden=true;orb.setAttribute('aria-expanded','false');orb.focus();}
  function pageHead(kicker,title,action,num=RINGS[state.tab]?.[0]){return el('div',{class:'page-head'},el('div',{},el('div',{class:'eyebrow'},num?el('i',{text:num}):null,kicker),el('h2',{text:title})),action);}
  function list(table){return Object.values(data.tables[table]||{});}
  function knownName(id){for(const rows of Object.values(data.tables))if(rows[id])return rows[id].name;return id?'未公开地点':'尚未定位';}
  async function confirmAction(title,text){
    const snapshot={revision:data.revision,token:data.contextToken};
    const overlay=el('div',{class:'overlay'}),dialog=el('section',{class:'dialog',role:'dialog','aria-modal':'true','aria-label':title});
    const area=el('textarea',{readonly:'','aria-label':'将发送的角色行动'});area.value=text;
    const opener=root.activeElement;const dismiss=()=>{overlay.remove();if(opener?.isConnected)opener.focus();};
    const cancel=btn('取消',dismiss);const submit=btn(preview?'模拟提交行动':'发送到正文',async()=>{submit.disabled=true;try{if(onAction)await onAction(text);else await backend.requestAction({text,...snapshot});dismiss();root.querySelectorAll('.overlay').forEach(n=>n.remove());toast(preview?'已模拟行动提交，预览不改变存档':'行动已发送，等待正文与后端更新');}catch(e){submit.disabled=e.committed===true;toast(e.message);}},'btn primary','check');
    dialog.append(el('div',{class:'eyebrow',text:'CONFIRM / PLAYER ACTION'}),el('h3',{text:title}),muted('确认后创建一条真实角色行动并触发正常回复。预览阶段不会改变世界档案。'),el('div',{style:'height:14px'}),area,el('div',{class:'row',style:'justify-content:flex-end;margin-top:16px'},cancel,submit));overlay.append(dialog);(grayWindow.hidden?win:grayWindow).append(overlay);cancel.focus();
    overlay.addEventListener('keydown',e=>{if(e.key==='Escape'){dismiss();e.stopPropagation();}if(e.key==='Tab'){const buttons=[area,cancel,...(submit.disabled?[]:[submit])];const i=buttons.indexOf(root.activeElement);if(e.shiftKey&&i===0){e.preventDefault();buttons.at(-1).focus();}if(!e.shiftKey&&i===buttons.length-1){e.preventDefault();area.focus();}}});
  }
  function requestSurvey(target='当前星区'){
    confirmAction('测绘与细化星图',`以正文中我的实际所在地为准${data.player.systemId?'（已登记导航位置：'+knownName(data.player.systemId)+'）':''}，我希望通过当地公共星图、导航服务或实际探测，了解${target}。请依据既定框架自主细化当前可获知的恒星系、各方实际控制范围、中立组织、公开航路及可探索行星；行星记录planetType、宜居度和天然宝地线索。合理生成太空生命栖息环境与少量固定的利维坦特殊空间，但未经发现的秘密不能直接公开。沿用已有ID，重要新信息通过DL4Space登记，并discover公开位置、类型、归属及已实际探明的生物标记。根据正文确认当前位置，不替我瞬移或授予舰队所有权。`);
  }
  function render(){
    data=backend.getUIState();for(const[id]of tabs){navs[id].classList.toggle('active',state.tab===id);navs[id].setAttribute('aria-current',state.tab===id?'page':'false');}
    win.style.setProperty('--accent',ringGlow(state.tab));
    if(!grayWindow.hidden)renderGray();
    sideLocation.replaceChildren(el('div',{class:'eyebrow',text:'Current Location'}),el('b',{text:knownName(data.player.locationId||data.player.systemId)}),el('div',{class:'hint',text:data.player.shipId?`载舰 · ${knownName(data.player.shipId)}`:'公共交通优先'}));
    footerLeft.textContent=`DL4 · World Rev ${String(data.revision).padStart(4,'0')} · Day ${Math.floor(data.clock/1440)}`;
    footerRight.textContent=preview?'Preview · 不写入存档':'仅显示已知资料';
    const items=tickerItems(),key=items.join('|');if(key!==tickerKey){tickerKey=key;const strip=el('div',{},items.map(t=>el('span',{text:t})));strip.style.setProperty('--dur',Math.max(28,key.length*.32)+'s');ticker.replaceChildren(strip);}
    const board=data.player.command,assets=[...Object.entries(board.wallet),['控制星球',Object.values(board.control).filter(x=>x.table==='planets').length],['自有舰船',data.player.ownedShipIds.length]];counters.replaceChildren(...assets.map(([k,v])=>{const b=el('b');countTo(b,'asset:'+k,v);return el('span',{'data-resource':k},el('small',{text:k}),b);}));
    if(state.closed)return;
    const pageKey=state.tab==='map'?(state.planetId?'planet:'+state.planetId:state.systemId?'orbit:'+state.systemId:'map:'+state.mapScope):state.tab,entering=pageKey!==lastPage;lastPage=pageKey;
    const scroll=content.scrollTop;content.replaceChildren();content.dataset.page=state.tab==='map'?(state.planetId?'planet':state.systemId?'orbit':'map'):state.tab;
    try{if(state.tab==='map'){if(state.planetId)renderPlanet();else if(state.systemId)renderSystem();else renderMap();}else if(state.tab==='designer')renderDesigner();else if(state.tab==='equipment')renderEquipment();else if(state.tab==='codex')renderCodex();else commandPanel(state.tab,{el,btn,chip,content,pageHead,facts,list,knownName,confirmAction,openGray,render,data,state,travelDialog,toast,icon,sv});}catch(e){content.replaceChildren(empty(`显示失败：${e.message}`));}
    content.scrollTop=scroll;if(entering)enterPage(content);
  }
  function renderMap(){
    if(!data.lGate?.opened)state.mapScope='galaxy';
    const cluster=state.mapScope==='lcluster',orgs=data.tables.organizations;
    content.append(pageHead(cluster?'L · Terminal Egress':'Galactic Cartography · 星域测绘',cluster?'L 星团':'已知星域',
      cluster?btn('返回斗罗星域',()=>showMap('galaxy'),'btn','back'):btn('完善星图',()=>requestSurvey(),'btn primary','scan')));
    if(data.lGate?.opened&&!cluster)content.append(el('div',{class:'row lgate-map-entry'},chip('近拱黑洞 · 星门已开','route'),btn('查看 L 星团星图',()=>showMap('lcluster'),'btn primary','atlas')));
    if(cluster)content.append(el('div',{class:'notice',text:'终端出口与近拱黑洞相通。选择恒星系规划接驳，抵达后扫描当地行星与异常。'}));
    const systemList=list('systems').filter(s=>(s.regionId===L_GATE_REGION)===cluster);
    const planetList=list('planets').filter(p=>(p.regionId===L_GATE_REGION)===cluster);
    const inScope=new Set(systemList.map(s=>s.id)),laneList=list('lanes').filter(l=>inScope.has(l.fromId)&&inScope.has(l.toId));
    const metrics=[['恒星系',systemList.length],['已知行星',planetList.length],['接触组织',list('organizations').length],['生态记录',list('species').filter(s=>s.kind==='太空生命').length]];
    const pos=id=>atlasPosition(data.tables.systems[id],orgs);
    if(!inScope.has(state.mapSelection))state.mapSelection=(systemList.find(s=>s.id===data.player.systemId)||systemList[0])?.id||null;
    const enter=id=>{state.systemId=id;state.planetId=null;render();content.scrollTop=0;};
    const plot=el('section',{class:'panel plot-window'}),scope=el('div',{class:'tactical-layout'});
    plot.append(el('div',{class:'scope-caption'},el('b',{text:cluster?'L 星团航路':'航道测绘'}),el('small',{text:`Hyperlanes · ${laneList.length}`})));
    const filters=el('div',{class:'row'});
    for(const[key,label,ico,color]of (cluster?[]:[['all','全部','atlas','#d8b46a'],['federation','联邦','federation','#79c3ff'],['longma','龙马','longma','#b691ff'],['neutral','中立','neutral','#4fd6a8'],['nomad','游牧','nomad','#f2a13a'],['pirate','海盗','pirate','#ff5d72'],['hostile','敌对','hostile','#ff6d80']])){
      const b=btn(label,()=>{state.filter=key;render();},`chip${state.filter===key?' active':''}`,ico);b.style.setProperty('--fc',color);b.setAttribute('aria-pressed',String(state.filter===key));filters.append(b);}
    const search=el('input',{class:'search',type:'search',placeholder:'检索已知恒星系','aria-label':'搜索已知恒星系',value:state.search});search.addEventListener('change',()=>{state.search=search.value.trim();render();});
    filters.append(el('span',{class:'spacer'}),search);plot.append(filters);
    // 筛选与搜索只压暗其余星系，保留整张星图的方位感。
    const matchesFilter=s=>state.filter==='all'||(state.filter==='hostile'?orgs[s.controllerId]?.stance==='敌对':factionOf(s,orgs).key===state.filter);
    const matches=s=>matchesFilter(s)&&(!state.search||s.name.includes(state.search)),dimming=state.filter!=='all'||!!state.search;
    const viewBox=()=>`${500-500/state.zoom+state.panX} ${320-320/state.zoom+state.panY} ${1000/state.zoom} ${640/state.zoom}`;
    const map=el('div',{class:(cluster?'map cluster-map':'map')+(dimming?' dim':'')}),svg=sv('svg',{class:'map-svg',viewBox:viewBox(),role:'group','aria-label':cluster?'L 星团勘测星图':'已知星系及势力范围星图'});
    const defs=sv('defs',{},sv('filter',{id:'m-g1',x:'-50%',y:'-50%',width:'200%',height:'200%'},sv('feGaussianBlur',{stdDeviation:3})),sv('filter',{id:'m-g2',x:'-100%',y:'-100%',width:'300%',height:'300%'},sv('feGaussianBlur',{stdDeviation:7})));svg.append(defs);
    // 星盘底纹：刻度环、罗马数字与辐线缓慢自转，并随平移做视差。
    const astroWrap=sv('g',{'aria-hidden':'true'}),a1=sv('g',{class:'astro'}),a2=sv('g',{class:'astro2'});astroWrap.append(a1,a2);svg.append(astroWrap);
    [150,230,310,390].forEach((r,i)=>a1.append(sv('circle',{cx:500,cy:320,r,fill:'none',stroke:'#d8b46a','stroke-width':i===2?.8:.4,opacity:i===2?.32:.16})));
    a1.append(sv('circle',{cx:500,cy:320,r:318,fill:'none',stroke:'#d8b46a','stroke-width':6,'stroke-dasharray':'.6 9.4',opacity:.3}),sv('circle',{cx:500,cy:320,r:323,fill:'none',stroke:'#d8b46a','stroke-width':12,'stroke-dasharray':'.8 49.4',opacity:.35}));
    ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'].forEach((n,i)=>{const a=i/12*Math.PI*2-Math.PI/2,x=500+Math.cos(a)*348,y=320+Math.sin(a)*348,t=sv('text',{x,y:y+4,'text-anchor':'middle',class:'astro-num',transform:`rotate(${i*30} ${x} ${y})`});t.textContent=n;a1.append(t);});
    for(let i=0;i<24;i++){const a=i/24*Math.PI*2;a2.append(sv('line',{x1:500+Math.cos(a)*150,y1:320+Math.sin(a)*150,x2:500+Math.cos(a)*(i%2?230:390),y2:320+Math.sin(a)*(i%2?230:390),stroke:'#d8b46a','stroke-width':.3,opacity:.12}));}
    a2.append(sv('path',{d:'M500 -120V760M-120 320H1120',stroke:'#d8b46a','stroke-width':.3,opacity:.14}));
    const world=sv('g',{}),terrLayer=sv('g',{});world.append(terrLayer);svg.append(world);
    // 领地：每个恒星系的单元按相邻星系裁切；同一势力的单元合并后只描外轮廓，内部用雕版排线区分阵营。
    const cellPath=pts=>'M'+pts.map(p=>p[0].toFixed(1)+' '+p[1].toFixed(1)).join('L')+'Z',delay=s=>`--d:${systemList.indexOf(s)*110+300}ms`;
    const groups=new Map();for(const s of systemList){const k=s.controllerId||'none';if(!groups.has(k))groups.set(k,[]);groups.get(k).push(s);}
    const hatch={federation:45,longma:-45,pirate:90,nomad:'x',neutral:'dot'};let gid=0;
    for(const[k,group]of groups){const f=factionOf(group[0],orgs),g=sv('g',{class:'terr','data-f':k});terrLayer.append(g);if(dimming&&group.some(matches)){g.classList.add('hot');g.dataset.base='1';}
      if(k==='none'){for(const s of group)g.append(sv('path',{d:cellPath(territoryShape(s,systemList,pos,70)),class:'cell',fill:'none',stroke:'#a9abb6','stroke-width':.8,'stroke-dasharray':'3 4',opacity:.5,style:delay(s)}));continue;}
      const id='m-t'+(gid++),mode=hatch[f.key]??45,pattern=sv('pattern',{id:id+'h',patternUnits:'userSpaceOnUse',width:7,height:7,...(typeof mode==='number'?{patternTransform:`rotate(${mode})`}:{})});
      pattern.append(mode==='dot'?sv('circle',{cx:3.5,cy:3.5,r:.9,fill:f.color,opacity:.55}):mode==='x'?sv('path',{d:'M0 0L7 7M7 0L0 7',stroke:f.color,'stroke-width':.6,opacity:.5}):sv('line',{x1:0,y1:0,x2:0,y2:7,stroke:f.color,'stroke-width':.8,opacity:.5}));
      defs.append(pattern,sv('filter',{id:id+'o',x:'-5%',y:'-5%',width:'110%',height:'110%'},sv('feMorphology',{in:'SourceAlpha',operator:'dilate',radius:1.6,result:'d'}),sv('feComposite',{in:'d',in2:'SourceAlpha',operator:'out',result:'o'}),sv('feFlood',{'flood-color':f.color}),sv('feComposite',{in2:'o',operator:'in'})));
      const glow=sv('g',{}),fill=sv('g',{}),edge=sv('g',{filter:`url(#${id}o)`});g.append(glow,fill,edge);
      for(const s of group){const d=cellPath(territoryShape(s,systemList,pos));glow.append(sv('path',{d,class:'cell',fill:f.color,opacity:.07,style:delay(s)}));fill.append(sv('path',{d,class:'cell',fill:`url(#${id}h)`,style:delay(s)}));edge.append(sv('path',{d,class:'cell',fill:'#000',stroke:'#000','stroke-width':1,style:delay(s)}));}
      const pts=group.map(s=>pos(s.id)),label=sv('text',{x:pts.reduce((a,p)=>a+p.x,0)/pts.length,y:Math.max(40,Math.min(...pts.map(p=>p.y))-54),'text-anchor':'middle',class:'territory-label',fill:f.color});label.textContent=f.name;g.append(label);}
    // 航道：弧形虚线，开场有一道亮线描过；光点沿航道流动，周期随航程长短变化。
    const laneLayer=sv('g',{'aria-hidden':'true'}),moteLayer=sv('g',{'aria-hidden':'true'});world.append(laneLayer,moteLayer);
    laneList.forEach((l,i)=>{const a=pos(l.fromId),b=pos(l.toId),mx=(a.x+b.x)/2+(b.y-a.y)*.08,my=(a.y+b.y)/2-(b.x-a.x)*.08,d=`M${a.x} ${a.y}Q${mx} ${my} ${b.x} ${b.y}`,id='m-lane-'+i;
      laneLayer.append(sv('path',{id,d,class:'lane'}),sv('path',{d,class:'lane-trace',pathLength:100,style:`--d:${900+i*90}ms`}));
      if(still())return;const dur=Math.max(4,Math.min(30,(l.minutes||1440)/1440*3.2)),begin=-((atlasHash(l.id)%1000)/1000*dur);
      for(const[r,color,opacity,glowing]of [[5,'#f6dea2',.35,true],[1.8,'#fff3d0',.95,false]]){const c=sv('circle',{r,fill:color,opacity,...(glowing?{filter:'url(#m-g1)'}:{})}),m=sv('animateMotion',{dur:dur+'s',begin:begin.toFixed(2)+'s',repeatCount:'indefinite'}),mp=sv('mpath',{href:'#'+id});mp.setAttributeNS('http://www.w3.org/1999/xlink','xlink:href','#'+id);m.append(mp);c.append(m);moteLayer.append(c);}});
    const sysLayer=sv('g',{}),nodes=new Map();world.append(sysLayer);
    for(const s of systemList){const p=pos(s.id),f=factionOf(s,orgs),here=s.id===data.player.systemId;
      const g=sv('g',{class:'system-node'+(s.id===state.mapSelection?' selected':''),transform:`translate(${p.x} ${p.y})`,tabindex:0,role:'button','data-f':s.controllerId||'none','aria-label':`${s.name}，${f.name}。选中后查看航程，再次确认进入恒星系`});
      if(dimming&&matches(s)){g.classList.add('hot');g.dataset.base='1';}
      g.append(sv('circle',{r:17,fill:f.color,opacity:.24,filter:'url(#m-g2)',class:'hl'}),sv('circle',{r:12,fill:f.color,opacity:.16,filter:'url(#m-g1)'}),
        sv('g',{class:'star'},sv('path',{d:'M0 -9 1.8 -1.8 9 0 1.8 1.8 0 9 -1.8 1.8 -9 0 -1.8 -1.8Z',fill:'#fff6dc',stroke:f.color,'stroke-width':.8}),sv('circle',{r:2.2,fill:'#fff'})),sv('rect',{x:-28,y:-26,width:56,height:68,fill:'transparent'}));
      const locals=list('creatures').filter(c=>c.systemId===s.id),leviathan=locals.some(c=>data.tables.species[c.speciesId]?.tier==='利维坦');
      if(locals.length){const col=leviathan?'#ff7ad9':'#4fd6a8';g.append(sv('circle',{cx:14,cy:-12,r:3.4,fill:'none',stroke:col,'stroke-width':1}),sv('circle',{cx:14,cy:-12,r:1.1,fill:col}));if(leviathan)g.append(sv('circle',{cx:14,cy:-12,r:6.2,fill:'none',stroke:col,'stroke-width':.7,'stroke-dasharray':'1.5 1.5'}));}
      if(orgs[s.controllerId]?.stance==='敌对')g.append(sv('path',{d:'M-14 -21 -9.5 -12 -18.5 -12Z',fill:'rgba(255,93,114,.25)',stroke:'#ff5d72','stroke-width':1.1}));
      const controlled=list('planets').some(q=>q.systemId===s.id&&data.player.command.control[q.id])||data.player.command.control[s.controllerId];if(controlled){const mark=sv('text',{x:-27,y:5,class:'mark-flag'});mark.textContent='⚑';g.append(mark);}
      const deployed=list('ships').filter(ship=>ship.systemId===s.id&&data.player.ownedShipIds.includes(ship.id)&&!['入库','摧毁','收束'].includes(ship.status));if(deployed.length){const fleet=icon('ship');for(const[k,v]of Object.entries({x:11,y:1,width:14,height:14,color:'#f6dea2'}))fleet.setAttribute(k,v);const tip=sv('title');tip.textContent=deployed.map(ship=>ship.name+' · '+ship.status).join('、');fleet.append(tip);g.append(fleet);}
      if(list('planets').some(q=>q.systemId===s.id&&q.habitability==='盖亚')){const leaf=icon('gaia');for(const[k,v]of Object.entries({x:-26,y:-25,width:12,height:12,color:'#8fdc7a'}))leaf.setAttribute(k,v);g.append(leaf);}
      if(s.specialSpace)g.append(sv('circle',{r:21,fill:'none',stroke:'#a9abb6','stroke-width':.6,'stroke-dasharray':'1 3'}));
      if([L_GATE_SYSTEM,L_GATE_TERMINAL].includes(s.id))g.append(sv('circle',{r:19,fill:'none',stroke:'#6fd3d9','stroke-width':1.4,'stroke-dasharray':'3 3'}));
      if(here){const pm=sv('g',{transform:'translate(0 -3)','pointer-events':'none'});[['#f2c84b',-6],['#a066ff',0],['#d8b46a',6]].forEach(([c,dy],i)=>{const e=sv('ellipse',{cx:0,cy:dy,rx:22,ry:5.5,fill:'none',stroke:c,'stroke-width':1.6,opacity:.9});if(!still())e.append(sv('animate',{attributeName:'cy',values:`${dy};${dy-3};${dy}`,dur:`${2.4+i*.3}s`,repeatCount:'indefinite'}));pm.append(e);});g.append(pm);}
      const label=sv('text',{y:here?34:25,'text-anchor':'middle',class:'sys-name'});label.textContent=s.name;
      const sub=sv('text',{y:here?46:37,'text-anchor':'middle',class:'sub-label'});sub.textContent=s.id===L_GATE_SYSTEM?(data.lGate?.opened?'L-星门已开':'休眠 L-星门'):s.id===L_GATE_TERMINAL?'斗罗星域入口':cluster?(data.lGate?.surveyed.includes(s.id)?'已勘测':'待勘测'):f.name;g.append(label,sub);
      const pick=()=>{if(state.mapSelection===s.id)enter(s.id);else select(s.id);};
      g.addEventListener('click',pick);g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();pick();}});
      sysLayer.append(g);nodes.set(s.id,g);}
    const retWrap=sv('g',{'aria-hidden':'true'}),reticle=sv('g',{class:'reticle'}),r1=sv('g',{class:'r1'}),r2=sv('g',{class:'r2'});
    r1.append(sv('circle',{r:34,fill:'none',stroke:'#f6dea2','stroke-width':.8,'stroke-dasharray':'10 4 2 4'}));
    r2.append(sv('circle',{r:44,fill:'none',stroke:'#d8b46a','stroke-width':4,'stroke-dasharray':'.6 6.3',opacity:.8}));for(let i=0;i<4;i++)r2.append(sv('path',{d:'M0 -56L4 -48H-4Z',fill:'#f6dea2',transform:`rotate(${i*90})`}));
    reticle.append(r1,r2,sv('circle',{r:26,fill:'none','stroke-width':1.4,opacity:.9,style:'stroke:var(--accent)'}));retWrap.append(reticle);world.append(retWrap);
    const placeReticle=id=>{const ok=id&&nodes.has(id);retWrap.style.display=ok?'':'none';if(ok){const p=pos(id);retWrap.setAttribute('transform',`translate(${p.x} ${p.y})`);}};placeReticle(state.mapSelection);
    let instruments=null;
    function select(id){state.mapSelection=id;for(const[k,n]of nodes)n.classList.toggle('selected',k===id);placeReticle(id);reticle.classList.remove('moved');reticle.getBoundingClientRect();reticle.classList.add('moved');instruments?.selectSystem(id);}
    // 悬停右侧势力列表时临时高亮对应领地；离开后恢复筛选状态。
    const applyHot=keys=>{map.classList.toggle('dim',!!keys||dimming);for(const n of map.querySelectorAll('.system-node,.terr'))n.classList.toggle('hot',keys?keys.includes(n.dataset.f):n.dataset.base==='1');};
    const astroShift=()=>astroWrap.setAttribute('transform',`translate(${(state.panX*.65).toFixed(1)} ${(state.panY*.65).toFixed(1)})`),applyView=()=>{svg.setAttribute('viewBox',viewBox());astroShift();};astroShift();
    const clampPan=()=>{state.panX=Math.max(-450,Math.min(450,state.panX));state.panY=Math.max(-280,Math.min(280,state.panY));};
    const unit=()=>{const r=svg.getBoundingClientRect();return {r,s:Math.min(r.width/(1000/state.zoom),r.height/(640/state.zoom))};};
    let pan=null;svg.addEventListener('pointerdown',e=>{if(e.button!==0||e.target.closest('.system-node'))return;pan={x:e.clientX,y:e.clientY,px:state.panX,py:state.panY,s:unit().s};svg.setPointerCapture(e.pointerId);});
    svg.addEventListener('pointermove',e=>{if(!pan)return;state.panX=pan.px-(e.clientX-pan.x)/pan.s;state.panY=pan.py-(e.clientY-pan.y)/pan.s;clampPan();applyView();});for(const n of ['pointerup','pointercancel'])svg.addEventListener(n,()=>pan=null);
    // 滚轮以指针处为中心缩放；到达最小或最大倍率后把滚轮还给页面滚动。
    svg.addEventListener('wheel',e=>{const next=Math.max(1,Math.min(3,state.zoom*(e.deltaY<0?1.15:1/1.15)));if(next===state.zoom)return;e.preventDefault();const {r,s}=unit(),ox=(r.width-1000/state.zoom*s)/2,oy=(r.height-640/state.zoom*s)/2,px=500-500/state.zoom+state.panX+(e.clientX-r.left-ox)/s,py=320-320/state.zoom+state.panY+(e.clientY-r.top-oy)/s,s2=s*next/state.zoom;
      state.zoom=next;state.panX=px-(e.clientX-r.left-ox)/s2-500+500/next;state.panY=py-(e.clientY-r.top-oy)/s2-320+320/next;clampPan();applyView();},{passive:false});
    const zoomBy=f=>{state.zoom=Math.max(1,Math.min(3,state.zoom*f));applyView();};
    const minus=btn('−',()=>zoomBy(1/1.25),'icon-btn'),plus=btn('+',()=>zoomBy(1.25),'icon-btn'),reset=btn('复位',()=>{state.zoom=1;state.panX=state.panY=0;applyView();},'btn small');minus.setAttribute('aria-label','缩小星图');plus.setAttribute('aria-label','放大星图');
    map.append(svg,el('span',{class:'map-note',text:'拖动平移 · 滚轮缩放 · 点选恒星系看航程，再点一次进入'}),el('div',{class:'map-tools'},reset,minus,plus));plot.append(map);
    const mark=(...nodes)=>sv('svg',{class:'icon',viewBox:'-8 -8 16 16','aria-hidden':'true'},...nodes),legend=el('div',{class:'row map-legend'});
    for(const[label,glyph]of [['恒星系',mark(sv('path',{d:'M0 -6 1.2 -1.2 6 0 1.2 1.2 0 6 -1.2 1.2 -6 0 -1.2 -1.2Z',fill:'#f6dea2'}))],['已知航道',mark(sv('path',{d:'M-7 0H7',stroke:'#d8b46a','stroke-dasharray':'2 3'}))],['当前位置',mark(sv('ellipse',{rx:7,ry:2.2,fill:'none',stroke:'#f2c84b','stroke-width':1.2}),sv('ellipse',{cy:-3,rx:7,ry:2.2,fill:'none',stroke:'#a066ff','stroke-width':1.2}))],['太空生命信号',mark(sv('circle',{r:3.4,fill:'none',stroke:'#4fd6a8'}),sv('circle',{r:1.1,fill:'#4fd6a8'}))],['利维坦固定空间',mark(sv('circle',{r:3.4,fill:'none',stroke:'#ff7ad9'}),sv('circle',{r:6,fill:'none',stroke:'#ff7ad9','stroke-dasharray':'1.5 1.5'}))],['对玩家敌对',mark(sv('path',{d:'M0 -5 4.5 4 -4.5 4Z',fill:'rgba(255,93,114,.25)',stroke:'#ff5d72'}))],['L-星门',mark(sv('circle',{r:6,fill:'none',stroke:'#6fd3d9','stroke-width':1.2,'stroke-dasharray':'2 2'}))]])legend.append(el('span',{class:'chip'},glyph,label));
    legend.append(chip('天然宝地','gaia'),chip('己方在场舰船','ship'),el('span',{class:'chip'},el('span',{class:'mark-flag',text:'⚑','aria-hidden':'true'}),'个人控制资产'));plot.append(legend);
    instruments=sectorInstruments({el,sv,icon,btn,systems:systemList,metrics,data,knownName,enter,selected:state.mapSelection,travel:s=>travelDialog(s,s.id),route:id=>estimateRoute(data,id),highlight:applyHot,still});
    scope.append(plot,instruments);content.append(scope);
    if(!systemList.length)content.append(el('div',{class:'alert',text:'星区尚未测绘。点击“完善星图”让AI依据正文生成可获知的星系、航路与探索信息，未发现秘密不会直接显示。'}));
    const unlinked=planetList.filter(p=>!p.systemId);if(unlinked.length)content.append(el('div',{class:'notice',text:`已有${unlinked.length}颗原作行星锚点尚未建立恒星系关联，测绘后即可进入导航。`}));
    if(cluster)return;
    content.append(el('div',{class:'subhead',text:'Contact Network · 接触组织'}));
    const orgList=list('organizations'),cards=el('div',{class:'grid'});for(const o of orgList){const key={学术:'curator',商业:'trade',打捞:'salvage',佣兵:'mercenary',文化:'culture',生态:'ecology',航路:'route',游牧:'nomad',海盗:'pirate'}[o.kind]||factionOf({controllerId:o.id},orgs).key,card=el('section',{class:'panel org-card'},el('div',{class:'org-logo'},icon(key)),el('div',{},el('h3',{text:o.name}),el('div',{class:'muted',text:[o.kind||'已接触组织',o.stance].filter(Boolean).join(' · ')})));card.style.setProperty('--fc',factionOf({controllerId:o.id},orgs).color);cards.append(card);}
    content.append(orgList.length?cards:empty('尚未建立组织联系，探索与正文交互后自动更新。','neutral'));
  }
  function showMap(scope, systemId=null){
    Object.assign(state,{tab:'map',systemId,planetId:null,mapScope:scope,filter:'all',search:'',zoom:1,panX:0,panY:0});
    if(!grayWindow.hidden)closeGray();
    open();content.scrollTop=0;
  }
  function breadcrumbs(label,fn){return btn(label,fn,'btn small','back');}
  function renderSystem(){
    const s=data.tables.systems[state.systemId];if(!s){state.systemId=null;renderMap();return;}
    const sf=factionOf(s,data.tables.organizations),badge=chip(sf.name,sf.key);badge.style.setProperty('--fc',sf.color);
    content.append(breadcrumbs('返回星域',()=>{state.systemId=null;render();}),pageHead('System Exploration · 恒星系',s.name,badge));
    const detail=el('div',{class:'orbit-readout',role:'status',text:s.environment||'轨道情报待调查'});content.append(el('section',{class:'panel orbit-stage'},orbitalChart(doc,s,data.tables,item=>{if(item.table==='planets'){state.planetId=item.id;render();content.scrollTop=0;}else detail.textContent=item.name+' · '+(item.kind||item.status||item.condition||'恒星系目标')+' '+(item.summary||'');})),detail,btn('前往该星系',()=>travelDialog(s,s.id),'btn primary','route'));
    const tracks=el('div',{class:'row orbit-index'});for(const [table,label]of [['planets','行星'],['orbitals','卫星'],['places','设施'],['ships','舰船'],['creatures','生态信号']])for(const object of list(table).filter(x=>x.systemId===s.id&&x.status!=='入库')){tracks.append(btn((object.kind||label)+' · '+object.name,()=>{if(table==='planets'){state.planetId=object.id;render();content.scrollTop=0;}else{detail.textContent=(object.kind||label)+' / '+object.name+'　'+(object.summary||'')+(object.planetId?' · 环绕 '+knownName(object.planetId):'');}},'chip'));}content.append(tracks);
    const cluster=s.regionId===L_GATE_REGION;
    if(cluster)content.append(clusterNavigation(s));
    if(s.id===L_GATE_SYSTEM&&data.lGate?.opened)content.append(el('div',{class:'row lgate-map-entry'},btn('查看 L 星团星图',()=>showMap('lcluster'),'btn','atlas'),btn('规划穿越 L-星门',()=>travelDialog(data.tables.systems[L_GATE_TERMINAL],L_GATE_TERMINAL),'btn primary','route')));
    const planets=list('planets').filter(p=>p.systemId===s.id);const grid=el('div',{class:'grid',style:'margin-top:20px'});
    for(const p of planets){const locals=list('creatures').filter(c=>c.planetId===p.id),lev=locals.some(c=>data.tables.species[c.speciesId]?.tier==='利维坦');const card=btn('',()=>{state.planetId=p.id;render();content.scrollTop=0;},'panel planet-card');card.append(surveyGlobe(doc,p),el('strong',{class:'planet-name',text:p.name}),el('div',{class:'card-meta'},chip(p.habitability||'宜居度待扫描',p.habitability==='盖亚'?'gaia':'planet'),chip(p.planetType||'类型待扫描'),p.colonized===false?chip('未殖民','scan'):null),...(locals.length?[el('div',{class:'row',style:'justify-content:center;margin-top:10px'},chip(lev?'利维坦邻近空间':'太空生命活动',lev?'leviathan':'beast'))]:[]));grid.append(card);}
    content.append(planets.length?grid:empty('尚未探明本星系行星，发起扫描后生成探索档案。','planet'));
    if(!cluster || data.lGate?.surveyed.includes(s.id))content.append(el('div',{class:'row',style:'margin-top:20px'},btn('扫描与细化本星系',()=>requestSurvey(s.name),'btn primary','scan')));
    const creatures=list('creatures').filter(c=>c.systemId===s.id);if(creatures.length){content.append(el('div',{class:'subhead',text:'Local Signals · 已知生态信号'}));for(const c of creatures){const sp=data.tables.species[c.speciesId];content.append(el('div',{class:'panel row',style:'margin-bottom:8px'},icon(sp?.tier==='利维坦'?'leviathan':'beast'),el('div',{},el('div',{text:c.name}),muted(`${sp?.tier||'类型未鉴定'} · ${c.level??'?'}级 · ${c.planetId?knownName(c.planetId)+'附近':'星系空间'}`))));}}
    const places=list('places').filter(p=>p.systemId===s.id);if(places.length){content.append(el('div',{class:'subhead',text:'Destinations · 空间设施'}));content.append(el('div',{class:'grid'},places.map(p=>el('section',{class:'panel'},el('h3',{text:p.name}),muted(p.kind||'设施'),el('p',{text:p.summary||''}),facts([['所属组织',p.organizationId?knownName(p.organizationId):'未确认'],['可用服务',p.services?.join('、')||'尚未取得资料'],['准入条件',p.access||'待确认']]),btn('规划前往',()=>travelDialog(p,s.id),'btn small','route')))));}
  }
  function planetClass(p){return /海洋/.test(p.planetType||'')?'':/冰/.test(p.planetType||'')?'ice':/熔岩|沙漠/.test(p.planetType||'')?'lava':/岩石|荒芜/.test(p.planetType||'')?'rock':'land';}
  function renderPlanet(){
    const p=data.tables.planets[state.planetId];if(!p){state.planetId=null;renderSystem();return;}
    content.append(breadcrumbs('返回恒星系',()=>{state.planetId=null;render();}),pageHead('Planetary Survey · 行星',p.name,chip(p.habitability||'待扫描',p.habitability==='盖亚'?'gaia':'planet')));
    const main=el('div',{class:'panel'},surveyGlobe(doc,p,true),muted(p.summary||''),facts([['行星类型',p.planetType||'未完成扫描'],['自然成长上限',p.nativeMaxLevel==null?'无原生生命 / 待确认':`${p.nativeMaxLevel}级`],['控制方',p.controllerId?knownName(p.controllerId):'未确认'],['殖民状态',p.colonized===undefined?'未确认':p.colonized?'已殖民':'未殖民'],['环境',p.environment||'未取得资料']]));
    if(p.colonized)main.append(facts([['约计人口'+(['planet_douluo','planet_tianlong','planet_tianma'].includes(p.id)?'（MOD估值）':''),p.population==null?'待人口普查':Number(p.population).toLocaleString('zh-CN')+' 人'],['主要产业',p.industries?.join('、')||'待产业调查'],['经济概况',p.economy||'待取得统计'],['地方特产',p.specialties?.join('、')||'待市场调查']]));
    const travel=el('aside',{class:'panel'},el('div',{class:'eyebrow',text:'Navigation · 行程规划'}),el('h3',{style:'margin-top:8px',text:'前往此行星'}));renderTravelControls(travel,p,p.systemId);
    content.append(el('div',{class:'detail-layout'},main,travel));
    content.append(el('div',{class:'subhead',text:'Natural Treasures · 已发现天然宝地'}));const sites=list('sites').filter(s=>s.planetId===p.id);content.append(sites.length?el('div',{class:'grid'},sites.map(s=>el('section',{class:'panel'},el('h3',{text:s.name}),chip(s.grade||'品质待勘测','gaia'),el('p',{class:'muted',text:s.formation||s.summary}),facts([['资源',s.resources?.join('、')||'待鉴定'],['危险',s.hazards?.join('、')||'尚未调查']]),btn('前往探索',()=>travelDialog(s,p.systemId),'btn small','route')))):empty('尚无已发现宝地。勘探会按自然成因生成结果，不代表这颗行星没有宝地。','gaia'));
    content.append(el('div',{class:'row',style:'margin-top:18px'},btn('开展行星调查',()=>requestSurvey(`${p.name}的地表、天然宝地线索及周边太空生态`),'btn','scan')));
  }
  function renderTravelControls(container,destination,systemId){
    const select=el('select',{'aria-label':'选择交通方式'},el('option',{value:'public',text:'公共星系交通（默认）'}));
    for(const id of data.player.ownedShipIds||[]){const ship=data.tables.ships[id];if(ship)select.append(el('option',{value:id,text:`私人战舰 · ${ship.name}`}));}
    const resultBox=el('div'),go=btn('确认前往',()=>{const isPublic=select.value==='public';const result=estimateRoute(data,systemId,{publicTransport:isPublic,shipId:isPublic?null:select.value});if(!result.available)return;const vehicle=isPublic?'公共星系交通':knownName(select.value);const placeId=data.tables.places[destination.id]?destination.id:null;const publicNote=isPublic?`实际到达后用 publicTravel，laneIds=${JSON.stringify(result.path)}，placeId=${JSON.stringify(placeId)}，destinationId=${JSON.stringify(destination.id)}；如中途停下，仅记已完成的航段。`:'若使用私人舰船，按其性能及燃料状态结算。';confirmAction(`前往${destination.name}`,`我选择乘坐${vehicle}，从${knownName(data.player.systemId)}前往${destination.name}（${knownName(systemId)}，${systemId}）。星图预估约${result.days}天。请按实际交通、许可、班次与剧情结算，经过相应时间后再抵达。${publicNote}到达后更新当前位置及locationId=${destination.id}；进一步的线索、勘测和奇遇依实际探索登记。`);},'btn primary','route');
    const update=()=>{const r=estimateRoute(data,systemId,{publicTransport:select.value==='public',shipId:select.value==='public'?null:select.value});resultBox.replaceChildren();go.disabled=!r.available;if(r.available)resultBox.append(el('div',{class:'route-box'},el('div',{class:'eyebrow',text:'Estimated Arrival · 预计抵达'}),el('div',{class:'days',text:`${r.days} 天`}),el('small',{text:r.label}),el('div',{class:'hint',text:`${r.local?'星系内接驳':r.path.length+' 段航程'}${r.fuel===null?'':` · ${r.fuel} 燃料`}`})));else resultBox.append(el('div',{class:'alert',text:r.reason}));};select.addEventListener('change',update);container.append(el('label',{class:'field'},'交通方式',select),resultBox,go,el('p',{class:'hint',text:'按已知航路与舰型速度估算；公共交通含候车/转乘时间，实际到达由正文结算。'}));update();
  }
  function travelDialog(destination,systemId){if(!destination)return;const overlay=el('div',{class:'overlay'}),dialog=el('section',{class:'dialog',role:'dialog','aria-modal':'true','aria-label':'行程规划'});dialog.append(el('h3',{text:`前往 ${destination.name}`}));renderTravelControls(dialog,destination,systemId);dialog.append(btn('关闭规划',()=>overlay.remove(),'btn', 'close'));overlay.append(dialog);(grayWindow.hidden?win:grayWindow).append(overlay);dialog.querySelector('select')?.focus();overlay.addEventListener('keydown',e=>{if(e.key==='Escape'){overlay.remove();e.stopPropagation();}});}
  function shipDrawing(hull,loadout={},modules=[]) {
    const h=typeof hull==='string'?(availableCatalog(data.tables).hulls.find(x=>x.id===hull)||HULLS.find(x=>x.id===hull)||HULLS[1]):hull;
    const form=h.silhouette?{...SHIP_FORMS.spear,...h.silhouette}:SHIP_FORMS[h.shape]||SHIP_FORMS.spear;
    const drawing=sv('svg',{viewBox:'0 0 600 365',role:'img','aria-label':`${h.name} · ${h.shape}舰体结构预览`});
    const gid='hull-'+atlasHash(h.id),defs=sv('defs');
    defs.append(sv('linearGradient',{id:gid,x1:0,y1:0,x2:1,y2:1},sv('stop',{offset:'0%','stop-color':'#f6dea2'}),sv('stop',{offset:'28%','stop-color':'#8c6a2c'}),sv('stop',{offset:'55%','stop-color':'#2a1f14'}),sv('stop',{offset:'80%','stop-color':'#d8b46a'}),sv('stop',{offset:'100%','stop-color':'#3a2c18'})));
    drawing.append(defs);
    for(let y=40;y<340;y+=40)drawing.append(sv('path',{d:`M35 ${y}H565`,stroke:'#d8b46a1a'}));
    drawing.append(sv('circle',{cx:300,cy:177,r:137,fill:'none',stroke:'#d8b46a2a','stroke-dasharray':'2 8'}),sv('path',{d:'M300 12V344M106 178H494',stroke:'#d8b46a29','stroke-dasharray':'4 6'}));
    drawing.append(sv('path',{d:form.outline,fill:'#0b0810',transform:'translate(5 7)',stroke:'#f6dea233','stroke-width':5}),sv('path',{d:form.outline,fill:`url(#${gid})`,'fill-rule':'evenodd',stroke:'#f6dea2','stroke-width':1.6}));
    for(const d of form.panels)drawing.append(sv('path',{d,fill:'#1a120a77',stroke:'#d8b46a88','stroke-width':1}));
    for(const[x,y,w,hh]of form.pods){drawing.append(sv('rect',{x,y,width:w,height:hh,rx:3,fill:'#140e08',stroke:'#d8b46a99'}));for(let n=1;n<6;n++)drawing.append(sv('path',{d:`M${x+3} ${y+n*hh/6}h${w-6}`,stroke:'#f6dea277'}));drawing.append(sv('path',{class:'engine-flame',d:`M${x+2} ${y+hh+1}l${w/2-2} 25 ${w/2-2} -25Z`,fill:'#a066ff99'}));}
    const [bx,by,bw,bh]=form.bridge;drawing.append(sv('rect',{x:bx,y:by,width:bw,height:bh,rx:3,fill:'#fff0c6',stroke:'#fff'}),sv('path',{d:`M${bx+bw/2} ${by+2}v${bh-4}`,stroke:'#8c6a2c'}));
    const weaponSlots=(h.slotLayout||[]).filter(s=>['S','M','L','X','G','P','H'].includes(s.type));
    for(const[i,slot]of weaponSlots.entries()){const m=modules.find(m=>m.id===loadout[slot.id]),x=300+(i%2?1:-1)*(h.shape==='dart'?19:43),y=104+Math.floor(i/2)*40;
      drawing.append(sv('circle',{cx:x,cy:y,r:9,fill:m?'#f6dea2':'#1a120a',stroke:'#d8b46a','stroke-width':.9}));
      if(m)drawing.append(sv('path',{d:slot.type==='H'?`M${x-5} ${y}h10M${x-5} ${y+3}h10`:`M${x} ${y-2}v-${slot.type==='X'?35:18}`,stroke:'#fff6dc','stroke-width':slot.type==='X'?4:2}));
      const label=sv('text',{x:x+(i%2?25:-25),y:y+3,fill:'#efe5cf','font-size':9,'text-anchor':i%2?'start':'end'});label.textContent=slot.type;drawing.append(label);
    }
    drawing.append(sv('path',{d:'M130 45H117V305H130M465 45H482V305H465',stroke:'#d8b46a55',fill:'none'}));
    const label=sv('text',{x:93,y:175,transform:'rotate(-90 93 175)',fill:'#c3b79f','font-size':9,'text-anchor':'middle'});label.textContent=`${(h.shape||'custom').toUpperCase()} / ${h.size||'N'} / 独立舰体轮廓`;drawing.append(label);return drawing;
  }
  function renderDesigner(){
    const catalog=availableCatalog(data.tables);
    content.append(pageHead('Modular Shipyard · 舰船工坊','分型插槽舰船设计器',chip(`${catalog.hulls.length}种船体 · ${catalog.modules.length}种配件`,'ship')));
    if(!catalog.hulls.length){content.append(empty('没有已解锁的船体资料。请先通过正文登记研究成果。'));return;}
    if(!catalog.hulls.some(h=>h.id===state.hullId))state.hullId=catalog.hulls[0].id;
    let model=assembleDesign(state.hullId,state.loadout||state.modules,state.designName,catalog);if(!state.loadout)state.loadout=model.loadout;
    const h=model.hull,r=model.record;
    const hullArt=(h)=>{const i=HULLS.findIndex(x=>'hull_'+x.id===h.id);return i<0?shipDrawing(h):el('img',{src:HANGAR_ART[i],alt:h.name,class:'hull-art'});};
    const hullCards=el('div',{class:'hull-gallery'});
    for(const hull of catalog.hulls){const b=btn('',()=>{state.hullId=hull.id;state.loadout=assembleDesign(hull.id,['engine','jump','sensor',...(hull.role==='母舰'?['axial']:hull.role==='载舰'?['medium_laser','hangar']:['laser'])],state.designName,catalog).loadout;render();},`hull-choice${hull.id===state.hullId?' selected':''}`);b.setAttribute('aria-label',`选择船体 ${hull.name}`);b.append(hullArt(hull),el('b',{text:hull.name}),el('small',{text:`${hull.role} · ${hull.slotLayout.length}独立槽位`}));hullCards.append(b);}
    hullCards.setAttribute('aria-label','船体目录');
    if(h.size===1){const choices=['军用侦察','科考','资源勘探','民用航天'],mode=choices.includes(state.scoutMode)?state.scoutMode:choices[0];r.details.missionProfile=mode;r.role=({'军用侦察':'侦察','科考':'科考','资源勘探':'科考','民用航天':'运输'})[mode];if(mode!==choices[0])r.id+='_'+choices.indexOf(mode);}
    const name=el('input',{value:state.designName,maxlength:60,'aria-label':'舰型名称'});name.addEventListener('change',()=>{state.designName=name.value.trim()||'未命名舰型';render();});
    const left=el('div',{},el('label',{class:'field'},'设计图纸名称',name),el('div',{class:'blueprint'},state.diagram?shipDrawing(h,state.loadout,catalog.modules):hullArt(h),btn(state.diagram?'查看舰体外观':'查看装配示意',()=>{state.diagram=!state.diagram;render();},'btn small diagram-toggle')),el('p',{class:'hint',text:'S/M/L/X为不同武器尺寸；G导弹、P点防御、H机库；U防护、A辅助；R/E/J/C分别为反应炉、推进、空间核心和传感器。'}));
    if(h.size===1){const mode=el('select',{'aria-label':'轻型舰用途'});for(const x of ['军用侦察','科考','资源勘探','民用航天'])mode.append(el('option',{value:x,text:x,...(r.details.missionProfile===x?{selected:''}:{})}));mode.onchange=()=>{state.scoutMode=mode.value;render();};left.querySelector('.field').append(mode);}
    const slots=el('div',{class:'hardpoint-grid'});
    for(const slot of h.slotLayout){const select=el('select',{'aria-label':`${slot.type}槽 ${slot.id}`}),compatible=catalog.modules.filter(m=>m.fitTypes.includes(slot.type)&&m.minSize<=h.size);select.append(el('option',{value:'',text:'空置'}));for(const m of compatible)select.append(el('option',{value:m.id,text:m.name,...(state.loadout[slot.id]===m.id?{selected:''}:{})}));select.addEventListener('change',()=>{if(select.value)state.loadout[slot.id]=select.value;else delete state.loadout[slot.id];render();});slots.append(el('label',{class:'hardpoint'},el('span',{class:'slot-letter',text:slot.type}),el('span',{},el('b',{text:SLOT_LABELS[slot.type]}),el('small',{text:`${slot.section||'舰身'} / ${slot.id}`})),select));}
    const banks=[el('div',{class:'bank top-bank'}),el('div',{class:'bank lower-bank'}),el('div',{class:'bank core-bank'})];Array.from(slots.children).forEach((cell,i)=>banks['SMXLGPH'.includes(h.slotLayout[i].type)?0:'UA'.includes(h.slotLayout[i].type)?1:2].append(cell));const blueprint=left.querySelector('.blueprint');left.insertBefore(banks[0],blueprint);left.append(banks[1],banks[2]);left.className='assembly';
    const right=el('aside',{class:'panel'},el('div',{class:'eyebrow',text:'Specification · 规格'}),el('h3',{text:r.name}),facts([['船体',h.name],['定位',r.details.missionProfile||r.role],['长度 / 舰员',`${r.dimensions} / ${r.crew}人`],['槽位',`${model.used} / ${h.slots}`],['净电力负载',`${model.power} / ${h.power}`],['配件质量',`${model.mass} / ${h.mass}`],['舰体 / 护盾',`${r.hull} / ${r.shield}`],['装甲 / 规避',`${r.armor} / ${Math.round(r.evasion*100)}%`],['航速倍率',`${r.speed}×`],['探测',`${r.sensor}km`],['载荷',r.capacity],['燃料 / 补给',`${r.fuelCapacity} / ${r.supplyCapacity}`],['成本 / 工期',`${r.cost.舰材}舰材 / ${r.buildMinutes/1440}天`]]),el('details',{},el('summary',{text:'动力、通信与舱室档案'}),facts([['动力',r.propulsion],['通信',r.communication],['舱室',r.compartments.join('、')],['限制',r.limitations.join('；')]])));
    right.append(model.valid?el('p',{class:'ok',text:'插槽、电力与质量校验通过'}):el('div',{class:'alert'},model.errors.map(text=>el('div',{text}))));
    const save=btn('提交设计图纸',()=>confirmAction('登记模块化图纸',`我要保存下面这份已通过界面校验的舰船图纸。请用DL4Space create designs登记并discover公开档案；若ID已存在则沿用，不自行改参数。不要把图纸当作已造好的舰船，建造另按资源、船坞与时间结算。\n${JSON.stringify(r)}`),'btn primary','check');save.disabled=!model.valid;right.append(save);
    right.append(btn('研发新船体 / 配件',()=>confirmAction('研发舰船技术',`我要基于当前剧情中掌握的技术、材料、实验条件，开展新的船体或配件研发。请先在正文说明研究目标、条件、成本、试验风险和需要的时间，不直接赠送成品。研究完成后创建hulls或modules档案，给稳定ID与researchProof，船体填写slotLayout各槽type/section/id及独立shape，可用custom与silhouette限定SVG路径定义独立舰形；配件填写fitTypes和实际属性。完成后unlockTechnology解锁并discover，星海导航自动读取新目录。`),'btn','scan'));
    const yards=list('places').filter(x=>x.kind==='船坞'&&data.tables.organizations[x.organizationId]&&authority(data.player,data.player.command)>=contactRank(data.tables.organizations[x.organizationId]));const yard=el('select',{'aria-label':'承造船坞'},yards.map(y=>el('option',{value:y.id,text:y.name})));const shipName=el('input',{placeholder:'交付舰名','aria-label':'交付舰名',maxlength:60,value:state.orderName||r.name+'号'});shipName.addEventListener('input',()=>state.orderName=shipName.value);const fee=orderPrice(r),build=btn('委托建造',()=>confirmAction('委托建造 '+r.name,'按图纸和报价签订委托。若设计尚未登记，先create designs '+JSON.stringify(r)+'，随后提交 '+JSON.stringify({op:'command',action:'commission',placeId:yard.value,designId:r.id,id:'ship_'+Date.now().toString(36),name:shipName.value.trim()||r.name+'号',reason:'已与船坞签订委托并同意报价'})+'。到工期后交付。'),'btn primary');build.disabled=!model.valid||!yards.length||data.player.command.wallet.联邦币<fee;right.append(el('div',{class:'subhead',text:'签约船坞'}),yards.length?yard:muted('尚未接触有签约资格的船坞'),muted('委托报价 '+fee.toLocaleString()+' 联邦币'),shipName,build);content.append(el('div',{class:'ship-layout'},hullCards,left,right));
    if(r.weapons.length)content.append(el('div',{class:'subhead',text:'Weapon Archive · 武器档案'}),el('div',{class:'grid'},r.weapons.map(w=>el('section',{class:'panel'},el('h3',{text:w.name}),facts([['类型 / 射界',`${w.kind} / ${w.arc}`],['伤害 / 射程',`${w.damage} / ${w.range}km`],['命中 / 穿透',`${Math.round(w.accuracy*100)}% / ${Math.round(w.penetration*100)}%`],['能源 / 弹药',`${w.energyCost} / ${w.ammoCost}`],['冷却',`${w.cooldown}分钟`]])))));
    const pending=list('hulls').concat(list('modules')).filter(x=>!x.unlocked);if(pending.length)content.append(muted(`研究中：${pending.map(x=>x.name).join('、')}，尚不能装配。`));
  }
  function renderEquipment(){
    const switches=el('div',{class:'section-tabs'});for(const name of ['斗铠','机甲'])switches.append(btn(name,()=>{state.equipmentCategory=name;render();},state.equipmentCategory===name?'active':''));content.append(switches);
    content.prepend(pageHead('Battle Armor & Mecha · 斗铠机甲','斗铠、整体机甲与双甲流',chip('双甲配置','armor')));
    const dual=dualArmorStatus(data),items=Object.values(data.player.loadouts?.斗铠||{}).map(id=>data.tables.equipment[id]).filter(Boolean),bonuses=dual.armor;
    content.append(el('div',{class:dual.active?'dual-state active':'dual-state'},icon('armor'),el('div',{},el('b',{text:dual.active?'双甲流 · 协同已激活':'双甲流 · 待就绪'}),muted(dual.reason)),el('span',{class:'spacer'}),chip((dual.mecha?.grade==='金级'?'神级':dual.mecha?.grade)||'未驾驶机甲')));
    if(state.equipmentCategory==='斗铠'){
    const rankRow=el('div',{class:'armor-ranks'});for(const rank of ARMOR_RANKS)rankRow.append(el('details',{class:rank.words===items[0]?.wordCount?'current':''},el('summary',{text:rank.name}),muted(rank.craft),el('p',{text:rank.features.join(' · ')}),el('p',{class:'hint',text:rank.evolution})));content.append(rankRow);
    const armor=el('div',{class:'panel'},el('div',{class:'eyebrow',text:'Battle Armor · 十一部位'}));
    const inv=(data.player.inventoryIds||[]).map(id=>data.tables.equipment[id]).filter(e=>e?.category==='斗铠'&&e.status!=='archived'),wear=data.player.loadouts?.斗铠||{};
    const cells=el('div',{class:'armor-parts'});
    for(const slot of ARMOR_PARTS){const current=data.tables.equipment[wear[slot]],select=el('select',{'aria-label':`斗铠${slot}装备选择`});select.append(el('option',{value:'',text:'选择已持有部件'}));for(const item of inv.filter(i=>i.slot===slot))select.append(el('option',{value:item.id,text:`${item.name} · ${item.wordCount||'?'}字`}));select.addEventListener('change',()=>{const item=data.tables.equipment[select.value];if(item)confirmAction(`穿戴${item.name}`,`我要穿戴已持有的斗铠部件${item.name}（${item.id}）。请核对wordCount、requirements、当前身体及环境条件，允许后equip登记。`);});const cell=el('div',{class:`equip-slot${current?' filled':''}`},el('span',{class:'hint',text:slot}),el('strong',{text:current?.name||'未装备'}),select);if(current)cell.append(btn('卸下',()=>confirmAction('卸下斗铠',`我要卸下${current.name}，用equip id=${current.id} remove=true登记。`),'btn small'));cells.append(cell);}const worn=items[0];armor.prepend(el('h3',{text:(worn?.wordCount?worn.wordCount+' 字　':'')+(worn?.setName||'通用斗铠')}));const mannequin=el('div',{class:'mannequin'});const portraitKey='dl4-armor-'+(data.portraitScope||'preview');let custom;try{custom=doc.defaultView.localStorage.getItem(portraitKey);}catch{}mannequin.append(custom?.startsWith('data:image/jpeg;base64,')?el('img',{src:custom,alt:'自定义斗铠'}):el('img',{src:HANGAR_ART[5],alt:'白金蓝通用斗铠'}));cells.prepend(mannequin);armor.append(cells);const upload=el('input',{type:'file',accept:'image/png,image/jpeg,image/webp','aria-label':'更换斗铠预览图'});upload.onchange=async()=>{const f=upload.files[0];if(!f)return;try{if(f.size>12000000)throw Error('请选择小于12 MB的图片');const bitmap=await doc.defaultView.createImageBitmap(f),canvas=doc.createElement('canvas'),scale=Math.min(1,640/Math.max(bitmap.width,bitmap.height));canvas.width=Math.max(1,bitmap.width*scale);canvas.height=Math.max(1,bitmap.height*scale);const ctx=canvas.getContext('2d');ctx.fillStyle='#0d0a12';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();doc.defaultView.localStorage.setItem(portraitKey,canvas.toDataURL('image/jpeg',.82));render();}catch(e){toast('图片保存失败 · '+e.message);}};armor.append(el('label',{class:'field'},'更换斗铠预览图',upload),btn('恢复通用斗铠',()=>{try{doc.defaultView.localStorage.removeItem(portraitKey);render();}catch(e){toast(e.message);}},'btn small'));
    const info=el('aside',{class:'panel'},el('div',{class:'eyebrow',text:'Armor Status · 字数与套装'}));const sets=new Map();for(const i of inv)if(!sets.has(i.setName))sets.set(i.setName,i);
    for(const[name,item]of sets){const count=new Set(items.filter(i=>i.setName===name).map(i=>i.slot)).size,rank=ARMOR_RANKS.find(r=>r.words===item.wordCount);info.append(el('h3',{text:`${name} · ${rank?.name||'字数待鉴定'}`}),chip(`${count} / ${item.setSize}部位`),el('p',{text:`整套加成：${Object.entries(item.setBonus).map(([k,n])=>`${k}+${n}`).join('、')||'无'}`}),muted(rank?.features.join(' · ')||'旧版记录保留，不擅自推定字数。'));}
    info.append(el('div',{class:'subhead',text:'当前总属性 / 含有效双甲流'}),Object.keys(dual.stats).length?facts(Object.entries(dual.stats)):muted('尚无生效装备属性。'));
    content.append(el('div',{class:'equip-layout'},armor,info));
    }else{
    // 机甲图版：六级各占一列，选中的一列展开为主图并浮出规格卡；切换只改列宽与选中态，不重建页面。
    const gradeOf=m=>m?.grade==='金级'?'神级':m?.grade,grades=MECHA_GRADES.map(([g])=>g),roman=['I','II','III','IV','V','VI'];
    const tones=[['#ece8de','#ffffff'],['#f2c84b','#f2c84b'],['#a066ff','#a066ff'],['#5a4474','#9b4dff'],['#ec3d55','#ec3d55'],['#ffd66e','#ffd66e']];
    const mechas=(data.player.ownedMechaIds||[]).map(id=>data.tables.mechas[id]).filter(Boolean),actual=data.tables.mechas[data.player.activeMechaId];
    const pick=Math.min(5,Math.max(0,state.mechPreview??grades.indexOf(gradeOf(actual)))),plates=el('div',{class:'plates',role:'group','aria-label':'六级机甲图版'}),plateEls=[];
    const cols=i=>grades.map((_,k)=>k===i?'minmax(0,2.6fr)':'minmax(0,1fr)').join(' ');
    const pilot=m=>btn(data.player.activeMechaId===m.id?'离开机甲':'驾驶机甲',()=>confirmAction('整体机甲操作',data.player.activeMechaId===m.id?`我要离开${m.name}，允许后deployMecha id=null reason记录。`:`我要驾驶已经持有的${m.name}（${m.id}），请先核对驾驶要求、能源、机舱环境与斗铠兼容，允许后deployMecha并确认requirementsMet=true。斗铠穿在身体上，机甲作为整体载具，不能拆成同一套六件装备。`),'btn primary','armor');
    const choose=i=>{state.mechPreview=i;plates.style.gridTemplateColumns=cols(i);plateEls.forEach(([p,b],k)=>{p.classList.toggle('on',k===i);b.setAttribute('aria-pressed',String(k===i));});};
    grades.forEach((g,i)=>{
      const owned=mechas.filter(m=>gradeOf(m)===g),m=owned.find(x=>x.id===data.player.activeMechaId)||owned[0],plate=el('div',{class:'plt'+(i===pick?' on':'')});
      plate.style.setProperty('--gc',tones[i][0]);plate.style.setProperty('--gg',tones[i][1]);
      const hit=el('button',{type:'button',class:'plt-hit','aria-label':`${g}机甲图版`,'aria-pressed':String(i===pick)});hit.addEventListener('click',()=>choose(i));
      const specs=el('div',{class:'specs'});
      if(m){const pct=m.maxEnergy>0?Math.max(0,Math.min(100,m.energy/m.maxEnergy*100)):0;specs.append(el('h4',{text:m.name}),el('div',{class:'in'},el('div',{class:'meter'},el('span',{text:'能源'}),el('div',{},el('i',{style:`width:${pct.toFixed(1)}%`})),el('b',{text:`${m.energy??'?'} / ${m.maxEnergy??'?'}`})),facts([['双甲流',m.dualArmorCompatible?'已配置接口':'不支持'],['驾驶要求',m.requirements],['能力',(m.features||[]).join('、')||'待登记']]),pilot(m)));}
      else specs.append(el('h4',{text:g+'机甲'}),el('div',{class:'in'},el('p',{class:'muted',text:`${MECHA_GRADES[i][1]}。尚未持有此级机甲。`}),el('p',{class:'hint',text:'图版为通用机体示意，不代表已拥有，也不提供数值。'})));
      plate.append(hit,el('span',{class:'num','aria-hidden':'true',text:String(i+1).padStart(2,'0')}),el('span',{class:'gn','aria-hidden':'true',text:g}),el('div',{class:'art'},el('img',{src:HANGAR_ART[6+i],alt:g+'通用机体'})),el('div',{class:'cap'},el('span',{text:'Plate '+roman[i]}),el('span',{text:MECHA_GRADES[i][1]})),owned.length?el('span',{class:'owned',text:m.id===data.player.activeMechaId?'驾驶中':'已持有'}):null,specs);
      plateEls.push([plate,hit]);plates.append(plate);
    });
    plates.style.gridTemplateColumns=cols(pick);content.append(plates);
    const wear=data.player.loadouts?.斗铠||{},worn=items[0],strip=el('div',{class:'parts'},ARMOR_PARTS.map(slot=>el('span',{class:wear[slot]?'own':'',title:wear[slot]?knownName(wear[slot]):slot+' · 未装备',text:slot})));
    content.append(el('section',{class:'panel armstrip'},el('div',{class:'t'},(worn?.wordCount?worn.wordCount+' 字 · ':'')+(worn?.setName||'通用斗铠'),el('small',{text:`${ARMOR_PARTS.filter(s=>wear[s]).length} / 11 部位 · 斗铠穿在身上，机甲为整体载具`})),strip,btn('查看斗铠',()=>{state.equipmentCategory='斗铠';render();},'btn small','armor')));
    content.append(el('div',{class:'subhead',text:'Whole Mecha · 整体机甲'}),el('p',{class:'muted',text:MECHA_GRADES.map(([g,n])=>`${g}：${n}`).join(' → ')}));
    const mechaCards=el('div',{class:'grid'});
    for(const m of mechas)mechaCards.append(el('section',{class:'panel mecha-card'},icon('armor','mecha-mark'),el('h3',{text:m.name}),chip(gradeOf(m)),chip(data.player.activeMechaId===m.id?'正在驾驶':'已持有'),facts([['能源',`${m.energy} / ${m.maxEnergy}`],['双甲流接口',m.dualArmorCompatible?'已配置':'不支持'],['适配条件',m.compatibility],['驾驶要求',m.requirements],['能力',(m.features||[]).join('、')]]),el('details',{},el('summary',{text:'整体机甲属性 / 双甲协同加成'}),facts(Object.entries(m.stats||{})),facts(Object.entries(m.dualArmorBonus||{}))),pilot(m)));
    content.append(mechas.length?mechaCards:empty('尚未登记已拥有的整体机甲。','armor'));
    if(Object.values(data.player.loadouts?.机甲||{}).length)content.append(el('div',{class:'alert',text:'检测到旧版机甲部件记录。记录已保留，请同步正文装备，核实后合并为整体机甲，不会自动赠送新机甲。'}));
    }
    content.append(btn('同步正文装备',()=>confirmAction('整理原著装备结构',`请依据正文实际持有的装备同步。斗铠按十一部位创建equipment，category=斗铠，写清wordCount一至六字、setName、setSize=11、stats/setBonus和requirements。机甲创建独立mechas记录，白/黄/紫/黑/红/神级（金色），作为完整机甲，不拆成部件；说明dualArmorCompatible、dualArmorBonus、能源与驾驶条件。只有实际持有才ownership登记，实际驾驶才deployMecha。五、六字斗铠由孕养进化，不以普通制造直接赠送；旧版六部位斗铠与机甲记录均须先核实：若用新档案替代，旧记录update status=archived并ownership owned=false，解除旧穿戴后再登记新结构；保留旧档案，不重复计算新旧装备。`),'btn','scan'));
  }

  function renderCodex(){
    for(const [table,label]of [['organizations','势力档案'],['planets','已知星球']]){const section=el('details',{class:'codex-group'},el('summary',{},label,chip(list(table).length+' 份')));for(const x of list(table))section.append(el('article',{class:'panel'},el('h3',{text:x.name}),muted([x.kind||x.planetType,x.stance||x.habitability,x.summary].filter(Boolean).join(' · ')),facts(table==='organizations'?[['经济',x.economy],['服务',x.services?.join('、')]]:[['资源',x.resources?.join('、')],['所属星系',knownName(x.systemId)]])));content.append(section);}
    const reference=el('details',{class:'panel fauna-reference'},el('summary',{text:'群星生态模板库 · 世界生成参考，不是玩家已解锁图鉴'}));reference.append(el('p',{class:'hint',text:'物种概念来自群星；实力等级按本MOD框架转换。模板不会泄露实际生成位置，未遭遇的生命不进入已知星图。'}),el('div',{class:'grid'},FAUNA_TEMPLATES.map(t=>el('div',{},chip(t.name,t.tier==='利维坦'?'leviathan':'beast'),muted(t.tier)))));content.append(reference);
    const species=list('species').filter(s=>s.kind==='太空生命');content.prepend(pageHead('Xenobiology Archive · 太空生命','太空生命图鉴',chip(`${species.length} 类已解锁`,'beast')));
    const scale=el('div',{class:'specimen-band'});
    for(const [tier,range,mark,color] of [['常见太空生命','70–99','fauna_amoeba','#7fe6c2'],['危险群落','100–110','fauna_crystal','#f2c84b'],['区域霸主','111–120','fauna_matriarch','#a066ff'],['利维坦','121–150','leviathan','#ec3d55']]){
      const tile=btn('',()=>{const group=[...content.querySelectorAll('.codex-group')].find(g=>g.firstElementChild.textContent.includes(tier));if(group){group.open=true;group.scrollIntoView({block:'nearest'});}},'tier-tile');
      tile.style.setProperty('--ink',color);tile.disabled=!species.length;tile.append(icon(mark),el('b',{text:tier}),el('small',{text:'Lv. '+range}),el('strong',{},el('span',{'data-count':species.filter(x=>x.tier===tier).length,text:String(species.filter(x=>x.tier===tier).length)}),' 种'));scale.append(tile);
    }
    content.querySelector('.page-head').after(scale);
    content.append(muted('依据正文遭遇、有效扫描与可靠资料逐步填写。未发现物种与利维坦秘密不会提前公开。'));
    if(!species.length){content.append(empty('尚无已解锁的太空生命档案。探索中实际遭遇并识别后，这里会自动填写。','beast'));return;}
    for(const[tier,range]of [['常见太空生命','70—99级'],['危险群落','100—110级 / 个体'],['区域霸主','111—120级'],['利维坦','121—150级']]){
      const entries=species.filter(s=>s.tier===tier);const group=el('details',{class:'codex-group',...(state.expanded.has(tier)?{open:''}:{})});group.append(el('summary',{},icon(tier==='利维坦'?'leviathan':'beast'),tier,chip(range),el('span',{class:'hint',text:`${entries.length}种`})));group.addEventListener('toggle',()=>{if(group.open)state.expanded.add(tier);else state.expanded.delete(tier);});
      const body=el('div',{class:'codex-body'});for(const s of entries){const individuals=list('creatures').filter(c=>c.speciesId===s.id);body.append(el('article',{class:'panel'},el('div',{class:'creature-art'},icon(s.templateId?'fauna_'+s.templateId:tier==='利维坦'?'leviathan':'beast')),el('h3',{text:s.name}),el('p',{class:'muted',text:s.summary}),facts([['栖息地',s.habitat],['能量来源',s.energySource],['行为',s.behavior],['智慧',s.intelligence],['已识别个体',individuals.map(c=>`${c.name} ${c.level??'?'}级`).join('、')||'尚未确认'],['死亡魂环','不会产生']]),el('details',{},el('summary',{class:'hint',text:'展开已知能力与材料'}),el('p',{class:'muted',text:`能力：${s.abilities?.join('、')||'待观察'}`}),el('p',{class:'muted',text:`弱点：${s.weaknesses?.join('、')||'尚未发现'}`}),el('p',{class:'muted',text:`材料：${s.materials?.join('、')||'未鉴定'}`}))));}
      if(!entries.length)body.append(muted('此类暂未发现，保留空白档案。'));group.append(body);content.append(group);
    }
  }
  function gateAction(title, request, action, id){
    const receipt = { op:'lGate', action, ...(id?{id}:{}), reason:'用本轮正文实际发生的证据替换' };
    return confirmAction(title,`${request} 由我决定如何回应。请根据实际经过结算，完成后在 DL4Space 登记 ${JSON.stringify(receipt)}；未完成就保留当前进度。`);
  }
  function gateVisit(place, system, label='规划前往'){
    return btn(label,()=>travelDialog(place,system),'btn small','route');
  }
  function investigationPanel(){
    const q=data.lGate,stage=lGateStage(q),count=q?.clues.length??0;
    // 七芒星盘：七个顶点对应七条认知，已收集的点亮；中心环转动，数字为已校准路数。
    const dial=sv('svg',{viewBox:'-80 -80 160 160',class:'gate-dial',role:'img','aria-label':'七路星门信号 '+count+' 路已校准'}),pt=i=>{const a=(i/7-.25)*2*Math.PI;return [62*Math.cos(a),62*Math.sin(a)];};
    dial.append(sv('circle',{r:74,fill:'none',stroke:'#d8b46a','stroke-width':.6,opacity:.4}),sv('circle',{r:70,fill:'none',stroke:'#d8b46a','stroke-width':4,'stroke-dasharray':'.6 5.6',opacity:.5}),sv('circle',{r:62,fill:'none',stroke:'#6fd3d9','stroke-width':.6,opacity:.35}));
    dial.append(sv('path',{class:'trace',d:'M'+[0,3,6,2,5,1,4,0].map(i=>pt(i).map(n=>n.toFixed(1)).join(' ')).join('L'),fill:'none',stroke:'#d8b46a','stroke-width':1.1,opacity:.75}));
    L_GATE_CLUES.forEach((clue,i)=>{const[x,y]=pt(i),lit=q?.clues.includes(clue.id);dial.append(sv('circle',{cx:x,cy:y,r:lit?9:6,fill:lit?'#6fd3d9':'none',opacity:lit?.25:0}),sv('rect',{x:x-4,y:y-4,width:8,height:8,transform:`rotate(45 ${x} ${y})`,fill:lit?'#f6dea2':'#14101a',stroke:lit?'#fff3d0':'#8c6a2c','stroke-width':1}));});
    const hub=sv('text',{y:7,'text-anchor':'middle',fill:'#f6dea2','font-size':20,'font-family':'"DL4 Latin",serif'});hub.textContent=count;
    dial.append(sv('g',{class:'spin'},sv('circle',{r:22,fill:'#0b0810',stroke:'#ec3d55','stroke-width':1,'stroke-dasharray':'8 3 1 3'})),sv('circle',{r:16,fill:'none',stroke:'#d8b46a','stroke-width':.6}),hub);
    const title={briefing:'观测组的简报',clues:'收集星门认知',activation:'启动项目已就绪',exploration:'追寻星团内的呼号'}[stage];
    grayContent.append(
      pageHead('L-Gate · Investigation',title,chip('灰风面板 · 锁定','gray'),'VIII'),
      el('section',{class:'panel lgate-progress'},dial,el('div',{class:'row'},el('b',{text:'L-星门认知'}),el('span',{class:'spacer'}),el('strong',{text:`${count} / ${L_GATE_CLUES.length}`})),
        el('progress',{max:L_GATE_CLUES.length,value:count,'aria-label':'L-星门线索进度'}),
        muted('七条认知可按任意顺序取得。启动星门后，循终端出口的呼号在星团内寻找发信者。')),
    );
    if(stage==='briefing')grayContent.append(btn('接收观测组简报',()=>gateAction('接收L-星门简报','我想从当地公开信道联系观测组，了解休眠的 L-星门并接收调查简报。若尚无星图定位，请依据正文先登记我所在的恒星系。','start'),'btn primary','scan'));
    if(stage==='activation'){
      const atGate=data.player.placeId===L_GATE_PLACE;
      grayContent.append(el('section',{class:'panel lgate-section'},el('h3',{text:'近拱黑洞 · L-星门定标平台'}),muted('用七条认知校对启动序列，标定与稳定性测试用时三天。'),
        atGate?btn('执行 L-星门启动项目',()=>gateAction('启动 L-星门','我在定标平台协助观测组核对七条认知，参与三天的标定并执行启动。后端自动结算用时，启动后我保留在平台。','activate'),'btn primary','check'):
          gateVisit(data.tables.places[L_GATE_PLACE],L_GATE_SYSTEM,'规划返回定标平台')));
    }
    if(stage==='exploration'){
      const next=L_CLUSTER_ENCOUNTERS.find(e=>e.required&&!q.encounters.includes(e.id));
      const target=data.tables.systems[next.systemId];
      const place=data.tables.places[lClusterPlaceId(next)];
      grayContent.append(el('section',{class:'panel lgate-section'},el('h3',{text:next.name}),muted(`${target.name}${place?' · '+place.name:''}｜${place?next.hint:'抵达后在恒星系页面执行实地勘测。'}`),
        el('div',{class:'row'},btn('查看 L 星团星图',()=>showMap('lcluster'),'btn primary','atlas'),btn(`查看${target.name}`,()=>showMap('lcluster',target.id),'btn','scan')),
        el('ol',{class:'lgate-steps'},L_CLUSTER_ENCOUNTERS.filter(e=>e.required).map(e=>el('li',{text:`${e.name} · ${q.encounters.includes(e.id)?'已确认':e.id===next.id?'进行中':'待追踪'}`})))));
    }
    const grid=el('div',{class:'grid lgate-grid'});
    for(const clue of L_GATE_CLUES){
      const found=q?.clues.includes(clue.id);
      const place=data.tables.places[clue.placeId];
      const system=L_GATE_OUTPOSTS.find(s=>s.id===clue.systemId);
      const atPlace=data.player.placeId===clue.placeId;
      const task=found||!place?null:atPlace?
        btn('调查这条线索',()=>gateAction(clue.name,`我在${place.name}调查“${clue.name}”。${clue.hint}`,'clue',clue.id),'btn small primary','scan'):
        gateVisit(place,system.id);
      grid.append(el('section',{class:'panel lgate-clue'},el('div',{class:'row'},el('h3',{text:clue.name}),el('span',{class:'spacer'}),chip(found?'已收集':'待调查',found?'check':'scan')),
        el('p',{class:'lgate-location',text:`${system.name} · ${clue.place||L_GATE_ANCHOR.name}`}),el('p',{class:'hint',text:clue.hint}),task));
    }
    grayContent.append(el('details',{class:'lgate-brief',...(stage!=='exploration'?{open:''}:{})},el('summary',{text:'七条线索及调查地点'}),grid));
  }
  function clusterNavigation(system){
    const q=data.lGate,section=el('section',{class:'panel lgate-section'});
    const current=data.player.systemId===system.id;
    const scanned=q.surveyed.includes(system.id);
    section.append(el('div',{class:'row'},chip(scanned?'已实地勘测':'初始航图 · 待勘测','scan'),current?chip('当前位置','route'):gateVisit(system,system.id,'规划前往此星系')));
    if(system.id===L_GATE_TERMINAL)section.append(gateVisit(data.tables.systems[L_GATE_SYSTEM],L_GATE_SYSTEM,'规划返回斗罗星域'));
    if(!scanned){
      if(current)section.append(btn('开展实地勘测',()=>gateAction('勘测'+system.name,`我在${system.name}对本地行星和异常信号做实地勘测，登记观测到的目标和近场信号。`,'survey'),'btn primary','scan'));
      return section;
    }
    const event=L_CLUSTER_ENCOUNTERS.find(e=>e.systemId===system.id);
    if(!event)return section;
    const id=lClusterPlaceId(event),place=data.tables.places[id],done=q.encounters.includes(event.id);
    const prerequisite={echo:'arrival',reunion:'echo'}[event.id];
    const ready=!prerequisite||q.encounters.includes(prerequisite);
    section.append(el('h3',{text:event.name}),muted(done?event.result:`${event.place} · ${event.hint}`));
    if(done)section.append(chip('已完成','check'));
    else if(!ready)section.append(muted('先核实上一处主线呼号，再继续这一段。'));
    else if(data.player.placeId===id)section.append(btn(event.id==='reunion'?'回应信号 · 与发信者会面':'调查奇遇',()=>gateAction(event.name,`我在${event.place}调查“${event.name}”。${event.hint}${event.id==='reunion'?'请以旧日熟人的身份安排重逢。':''}`,'encounter',event.id),'btn primary','scan'));
    else section.append(gateVisit(place,system.id,'规划前往奇遇地点'));
    return section;
  }
  function renderGray(){
    const old=grayContent.scrollTop;grayContent.replaceChildren();const g=data.tables.companions.gray_unique;
    const unlocked=lGateStage(data.lGate)==='complete'&&g?.bonded===true;
    grayTitle.textContent=unlocked?'灰风 · 唯一的你':'L-星门事件链';
    grayEyebrow.textContent=unlocked?'Gray · Across Countless Worlds':'L-Gate · Signal Trace';
    grayFooterText.textContent=preview?'Preview · 合成场景':unlocked?'同一人格 · 同一实体 · 独立管理':'调查进度跟随当前聊天分支';
    const grayKey=unlocked?'companion':'gate:'+lGateStage(data.lGate);grayEntering=grayKey!==lastGrayPage;lastGrayPage=grayKey;
    grayWindow.dataset.channel=unlocked?'companion':'gate';grayWindow.setAttribute('aria-label',unlocked?'灰风独立管理界面':'L-星门事件链');
    if(!unlocked){investigationPanel();grayContent.scrollTop=old;if(grayEntering)enterPage(grayContent,'gray');return;}
    grayContent.append(pageHead('Only One · Nano Entity','跨越无数世界，仍只为你',chip(g?.bonded?'已重逢 · 唯一伴侣':'等待重逢相认','gray'),'VIII'));
    const tabs=el('div',{class:'gray-art-tabs','aria-label':'灰风画面选择'});for(const[id,label]of [['auto','跟随当前形态'],['portrait','人物立绘'],['ship','舰形立绘'],['smile','笑容表情'],['battle','战意表情']]){const b=btn(label,()=>{state.grayView=id;renderGray();},`btn small${state.grayView===id?' primary':''}`);b.setAttribute('aria-pressed',String(state.grayView===id));tabs.append(b);}grayContent.append(tabs);
    const artId=resolveGrayArt(g,state.grayView);
    const profile=el('div',{class:'gray-profile'},el('p',{class:'gray-story',text:GRAY_PRESENTATION}),el('p',{class:'gray-story',text:GRAY_REUNION}),chip(`实际形态 · ${g?.bonded?g.form:'等待重逢'}`),grayAffectionPanel(g));
    grayContent.append(el('section',{class:`gray-hero gray-art-${artId}`},grayArtGallery(g,artId),profile));
    const past=el('details',{class:'panel gray-history',...(state.grayHistoryOpen?{open:''}:{})},el('summary',{text:'她的来路 · 从L-星团到斗罗重逢'})),timeline=el('ol',{class:'gray-timeline'});for(const[title,text]of GRAY_TIMELINE)timeline.append(el('li',{},el('b',{text:title}),el('p',{text})));past.append(timeline);past.addEventListener('toggle',()=>{if(past.isConnected)state.grayHistoryOpen=past.open;});grayContent.append(past);
    const memories=el('details',{class:'panel gray-memories',...(state.grayQuotesOpen?{open:''}:{})},el('summary',{text:'第一次接触时的小灰 · 历史语录'}));memories.append(el('p',{class:'hint',text:'这些对白属于最初的L-星团相遇。现在是斗罗重逢，她记得与你共同经历的岁月。'}),el('div',{class:'gray-quotes'},GRAY_FIRST_CONTACT.map(text=>el('blockquote',{text}))),btn('和她回忆最初相遇',()=>confirmAction('回忆L-星团的初遇',`我想听灰风回忆：当年科研船在L-星团找到她时，我们第一次谈话的样子。请从历史语录选取适合的片段，以如今重逢后的关系讲述，保留她笨拙模仿人类又忍不住坦白的性格；不把历史对白当成当下的新指令，不重置记忆，也不替我发言。`),'btn','gray'));memories.querySelector('button').disabled=!g?.bonded;memories.addEventListener('toggle',()=>{if(memories.isConnected)state.grayQuotesOpen=memories.open;});const quoteBox=memories.querySelector('.gray-quotes');quoteBox.scrollTop=state.grayQuoteScroll;quoteBox.addEventListener('scroll',()=>state.grayQuoteScroll=quoteBox.scrollTop);grayContent.append(memories);
    const sh=data.tables.ships[g.shipId],design=sh&&data.tables.designs[sh.designId];
    const status=el('div',{class:'panel'},facts([['当前形态',g.form],['力量映射','150 级 · 此界承载上限'],['能量体系','独立纳米生命 · 无武魂、魂环或神位'],['物理位置',sh?knownName(sh.systemId):'待定位'],['纳米物质',g.nanites],['舰体 / 护盾',sh?`${sh.hull} / ${sh.shield}`:'未登记'],['战斗锁',g.inCombat?'交战中':'未锁定'],['重构等待',g.reconstructAt?`${Math.max(0,Math.ceil((g.reconstructAt-data.clock)/1440))}天`:'无'],['核心羁绊','跨越平行世界 · 只指向你']]));
    const controls=el('div',{class:'gray-actions'});for(const[form,label]of [['陪伴','回到身边 · 陪伴形态'],['战舰','展开舰体 · 战舰形态']]){const b=btn(label,()=>confirmAction('灰风形态转换',`我请求灰风变为${form}形态。请先核对她的意愿、物理位置、战斗/航行状态与纳米物质。满足条件后grayShift form=${form} reason登记；每次实际切换耗25纳米物质，沿用唯一舰体的战损与资源，不创建替身。收束前我必须先离开舰内。`),g.form===form?'btn':'btn primary',form==='战舰'?'ship':'gray');b.disabled=g.form===form||g.form==='重构'||g.inCombat||g.nanites<25||!sh||sh.systemId!==data.player.systemId||!['收束','就绪'].includes(sh.status)||data.player.shipId===sh.id;controls.append(b);}
    controls.append(btn('和她聊聊',()=>confirmAction('与灰风相伴',`我来到灰风身边，想听听她此刻的心事，也想告诉她这一路的经历。请保持她是只爱我一人的成熟女性纳米人格，带着跨越无数世界的记忆与自己的性格，不替我说话或决定我的回应。`),'btn','gray'));
    controls.append(btn('补给与重构',()=>confirmAction('灰风后勤',`我要检查灰风当前战损、纳米物质与补给。补充纳米物质须来自同星系自有舰货舱的实际纳米物质，通过graySupply守恒转入；舰体/护盾/燃料仍走原有维修与补给规则。若被摧毁，只有经过登记的十年重构时间并有200纳米物质后才能grayRebuild，不切换形态刷满资源。`),'btn','salvage'));
    grayContent.append(el('div',{class:'gray-layout'},status,el('section',{class:'panel'},el('h3',{text:'同一人格 · 两种生活'}),controls,el('p',{class:'hint',text:'战斗、航行和重构期间不能随意切换；陪伴形态收束实际舰体，战舰形态使用同一个资源与战损档案。'}))));
    if(design)grayContent.append(el('details',{class:'panel gray-ship-file'},el('summary',{text:'展开灰风纳米舰档案'}),grayImage('ship'),facts([['舰体 / 护盾上限',`${design.hull} / ${design.shield}`],['航速',design.speed],['武器',design.weapons.map(w=>w.name).join('、')],['舰形限制',design.limitations.join('；')]])));
    grayContent.scrollTop=old;if(grayEntering)enterPage(grayContent,'gray');
  }
  // 立绘舞台：背后一圈缓转的光环与刻度，右侧竖排金字“灰风”。
  function grayHalo(){
    const halo=sv('svg',{class:'gray-halo',viewBox:'-100 -100 200 200','aria-hidden':'true'},sv('defs',{},sv('radialGradient',{id:'gh-g'},sv('stop',{offset:'0%','stop-color':'#ec3d55','stop-opacity':.32}),sv('stop',{offset:'60%','stop-color':'#6fd3d9','stop-opacity':.08}),sv('stop',{offset:'100%','stop-color':'#000','stop-opacity':0}))));
    const h2=sv('g',{class:'h2'},sv('circle',{r:88,fill:'none',stroke:'#d8b46a','stroke-width':.5,opacity:.5}));for(let i=0;i<72;i++){const a=i/72*Math.PI*2,l=i%6?3:7;h2.append(sv('line',{x1:Math.cos(a)*88,y1:Math.sin(a)*88,x2:Math.cos(a)*(88-l),y2:Math.sin(a)*(88-l),stroke:'#d8b46a','stroke-width':.5,opacity:.6}));}
    halo.append(sv('circle',{r:80,fill:'url(#gh-g)'}),sv('g',{class:'h1'},sv('circle',{r:96,fill:'none',stroke:'#f6dea2','stroke-width':.6,'stroke-dasharray':'14 4 2 4',opacity:.55})),h2,sv('circle',{r:72,fill:'none',stroke:'#ec3d55','stroke-width':3,opacity:.25,filter:'blur(2px)'}),sv('circle',{r:72,fill:'none',stroke:'#ec3d55','stroke-width':.6,opacity:.8}));
    return halo;
  }
  function grayArtGallery(gray,artId){
    const choices=GRAY_PORTRAITS.filter(([id])=>id!=='wedding'||gray?.weddingUnlocked===true);
    const index=choices.findIndex(([id])=>id===artId);
    const label=choices[index]?.[1]||GRAY_MEDIA[artId].alt;
    const isPortrait=index>=0;
    const half=state.grayFraming==='half';
    const picture=el('div',{class:`gray-portrait gray-picture${isPortrait?' framed':''}${isPortrait&&half?' half':''}`});
    const image=grayImage(artId);
    if(isPortrait){
      const frame=btn('',()=>{state.grayFraming=half?'full':'half';renderGray();grayContent.querySelector('.gray-frame-toggle')?.focus({preventScroll:true});},'gray-frame-toggle');
      frame.setAttribute('aria-label',half?'点击头像切换全身':'点击头像切换半身');
      frame.append(image);
      picture.append(frame);
    }else picture.append(image);

    const gallery=el('div',{class:'gray-gallery'},el('div',{class:'gray-stage'},grayHalo(),picture,el('div',{class:'vname',role:'heading','aria-level':'2',text:'灰风'}),el('div',{class:'vsub','aria-hidden':'true',text:'Gray · Across Countless Worlds'})));
    const controls=el('div',{class:'gray-gallery-controls'});
    for(const [direction,name,mark] of [[-1,'上一张立绘','‹'],[1,'下一张立绘','›']]){
      const arrow=btn(mark,()=>{const base=index<0?(direction>0?-1:0):index;state.grayView=choices[(base+direction+choices.length)%choices.length][0];renderGray();grayContent.querySelector(`[aria-label="${name}"]`)?.focus({preventScroll:true});},'btn gray-gallery-arrow');
      arrow.setAttribute('aria-label',name);
      controls.append(arrow);
    }
    controls.insertBefore(el('span',{class:'gray-gallery-label','aria-live':'polite',text:isPortrait?`${label} · ${index+1}/${choices.length}`:label}),controls.lastChild);
    gallery.append(controls);
    if(isPortrait)gallery.append(el('p',{class:'gray-gallery-hint',text:`${half?'半身':'全身'} · 点击头像切换` }));
    return gallery;
  }
  function grayAffectionPanel(gray){
    if(!gray?.bonded)return el('p',{class:'muted',text:'重逢相认后记录好感度。'});
    const score=gray.affection??GRAY_AFFECTION_REUNION;
    // 半圆仪表：弧长为好感度在区间内的位置，金色刻线标出重逢基准；切页时弧线与数字从零走到当前值。
    const meter=el('div',{class:'gray-affection-meter',role:'meter','aria-label':'灰风好感度','aria-valuemin':GRAY_AFFECTION_MIN,'aria-valuemax':GRAY_AFFECTION_MAX,'aria-valuenow':score,'aria-valuetext':`${score}，${grayAffectionStage(score)}`});
    const span=GRAY_AFFECTION_MAX-GRAY_AFFECTION_MIN,ratio=Math.max(0,Math.min(1,(score-GRAY_AFFECTION_MIN)/span)),arcLen=Math.PI*86,at=v=>{const a=Math.PI*(1-(v-GRAY_AFFECTION_MIN)/span);return [Math.cos(a),-Math.sin(a)];};
    const gauge=sv('svg',{viewBox:'-100 -100 200 118','aria-hidden':'true'},sv('defs',{},sv('linearGradient',{id:'gg-arc',x1:0,y1:0,x2:1,y2:0},sv('stop',{offset:'0%','stop-color':'#6fd3d9'}),sv('stop',{offset:'55%','stop-color':'#d8b46a'}),sv('stop',{offset:'100%','stop-color':'#ec3d55'}))));
    for(let i=0;i<=20;i++){const[c,n]=at(GRAY_AFFECTION_MIN+span*i/20),l=i%5?4:9;gauge.append(sv('line',{x1:c*97,y1:n*97,x2:c*(97-l),y2:n*(97-l),stroke:'#d8b46a','stroke-width':.7,opacity:.6}));}
    const track='M-86 0A86 86 0 0 1 86 0',arc=sv('path',{d:track,class:'gray-gauge-arc',fill:'none',stroke:'url(#gg-arc)','stroke-width':9,'stroke-dasharray':arcLen.toFixed(1),'stroke-dashoffset':(grayEntering&&!still()?arcLen:arcLen*(1-ratio)).toFixed(1)});
    const[rc,rn]=at(GRAY_AFFECTION_REUNION);gauge.append(sv('path',{d:track,fill:'none',stroke:'rgba(216,180,106,.12)','stroke-width':9}),arc,sv('line',{x1:rc*76,y1:rn*76,x2:rc*100,y2:rn*100,stroke:'#f6dea2','stroke-width':1.6}));
    if(grayEntering&&!still())frame(()=>frame(()=>arc.setAttribute('stroke-dashoffset',(arcLen*(1-ratio)).toFixed(1))));
    meter.append(gauge,el('div',{},el('div',{class:'gray-affection-score'},el('span',{'data-count':score,text:String(score)}),el('small',{text:' / '+GRAY_AFFECTION_MAX})),el('div',{class:'gray-affection-stage',text:grayAffectionStage(score)})));
    const card=el('section',{class:'gray-affection'},el('div',{class:'row gray-affection-title'},el('b',{text:'好感度'}),el('span',{text:`重逢基准 ${GRAY_AFFECTION_REUNION}`})),meter);
    if(gray.affectionReason)card.append(el('p',{class:'muted',text:gray.affectionReason}));
    if(gray.weddingUnlocked===true)card.append(btn('查看婚纱立绘',()=>{state.grayView='wedding';state.grayFraming='full';renderGray();},'btn small'));
    else card.append(el('p',{class:'hint',text:'好感度达到 200 解锁婚纱立绘'}));
    return card;
  }
  function grayImage(id){const asset=GRAY_MEDIA[id]||GRAY_MEDIA.portrait;const image=el('img',{class:`gray-media gray-media-${id}`,src:asset.src,alt:asset.alt,width:asset.width,height:asset.height,loading:'lazy',decoding:'async'});image.addEventListener('error',()=>{image.replaceWith(empty('图片暂不可用，角色档案与操作仍可使用。','gray'));},{once:true});return image;}
  const keydown=e=>{if(e.key==='Escape'&&!root.querySelector('.overlay')){if(!grayWindow.hidden)closeGray();else if(!state.closed)close();}};doc.addEventListener('keydown',keydown);
  function bindDrag(shell,handle){let motion=null;handle.addEventListener('pointerdown',e=>{if(e.target.closest('button')||doc.defaultView.innerWidth<850)return;const r=shell.getBoundingClientRect();motion={x:e.clientX,y:e.clientY,left:r.left,top:r.top};handle.setPointerCapture(e.pointerId);});handle.addEventListener('pointermove',e=>{if(!motion)return;shell.style.left=Math.max(0,Math.min(doc.defaultView.innerWidth-shell.offsetWidth,motion.left+e.clientX-motion.x))+'px';shell.style.top=Math.max(0,Math.min(doc.defaultView.innerHeight-60,motion.top+e.clientY-motion.y))+'px';});for(const name of ['pointerup','pointercancel'])handle.addEventListener(name,()=>motion=null);}
  bindDrag(win,header);bindDrag(grayWindow,grayHeader);
  const resize=()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{if(!state.closed&&win.getBoundingClientRect().left>doc.defaultView.innerWidth-80)win.style.left='10px';},100);};doc.defaultView.addEventListener('resize',resize);
  unsub=backend.subscribe(()=>{const next=backend.getUIState();if(next.chatEpoch!==data.chatEpoch){state.systemId=state.planetId=null;state.orderName=state.contact=state.fleet=state.arc=state.mechPreview=null;state.grayView='auto';state.grayFraming='half';state.grayHistoryOpen=state.grayQuotesOpen=false;state.grayQuoteScroll=0;state.hullId='hull_escort';state.loadout=null;state.designName='白隼 · 远航改型';root.querySelectorAll('.overlay').forEach(n=>n.remove());render();return;}const focused=root.activeElement;if(focused&&['INPUT','SELECT','TEXTAREA'].includes(focused.tagName))return;render();});
  root.addEventListener('focusout',()=>queueMicrotask(()=>{if(backend.getUIState().contextToken!==data.contextToken&&!root.querySelector('.overlay'))render();}));
  render();if(preview)open();
  const destroy=()=>{unsub?.();clearTimeout(resizeTimer);clearTimeout(toastTimer);doc.removeEventListener('keydown',keydown);doc.defaultView.removeEventListener('resize',resize);host.remove();};host.addEventListener('dl4-atlas-destroy',destroy,{once:true});
  return {open,close,refresh:render,destroy};
}
