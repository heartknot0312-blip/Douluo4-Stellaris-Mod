import {factionOf,atlasHash} from './ui-model.mjs';
import {STUDIES} from './command.mjs';

const PLANET_TINT=[[/海洋/,'#6fb7e8'],[/冰/,'#cfe8f2'],[/熔岩|沙漠/,'#e8945a'],[/气态/,'#d9b27a'],[/岩石|荒芜/,'#a99b86']];
const GONE=['入库','摧毁','收束'];

// 星图右侧的星盘册页：所在位置、选中星系档案、势力分布与索引。点选星系时只重绘档案，不重建整页。
export function sectorInstruments({el,sv,icon,btn,systems,metrics,data,knownName,enter,selected,select,travel,route,highlight,still}) {
  const orgs=data.tables.organizations,tables=data.tables,here=data.player.systemId;
  const badge=sv('svg',{class:'badge',viewBox:'0 0 56 56','aria-hidden':'true'},
    sv('g',{class:'spin'},sv('circle',{cx:28,cy:28,r:26,fill:'none',stroke:'#d8b46a','stroke-width':.8,'stroke-dasharray':'2 4'})),
    sv('circle',{cx:28,cy:28,r:19,fill:'none',stroke:'#f2c84b','stroke-width':1.2,opacity:.85}),sv('circle',{cx:28,cy:28,r:14,fill:'none',stroke:'#a066ff','stroke-width':1.2,opacity:.85}),
    sv('path',{d:'M28 18 30.2 25.8 38 28 30.2 30.2 28 38 25.8 30.2 18 28 25.8 25.8Z',fill:'#f6dea2'}));
  const position=el('section',{class:'panel instrument position-window'},el('div',{class:'instrument-title',text:'命盘 · 所在'}),
    el('div',{class:'fix'},badge,el('div',{},el('strong',{text:knownName(data.player.locationId||here)}),el('small',{text:data.player.shipId?'载舰 · '+knownName(data.player.shipId):'公共星系交通'}))));
  const dossier=el('section',{class:'panel instrument dossier','aria-live':'polite'});
  function orrery(s){
    const planets=Object.values(tables.planets||{}).filter(p=>p.systemId===s.id).slice(0,5);
    const svg=sv('svg',{class:'mini-orrery',viewBox:'0 0 280 118',role:'img','aria-label':planets.length?`${s.name}已知行星 ${planets.length} 颗`:'行星待扫描'});
    svg.append(sv('circle',{cx:140,cy:59,r:16,fill:factionOf(s,orgs).color,opacity:.18}),sv('circle',{cx:140,cy:59,r:6.5,fill:'#fff3d0'}),sv('circle',{cx:140,cy:59,r:10,fill:'none',stroke:'#f6dea2','stroke-width':.6,opacity:.6}));
    if(!planets.length){const t=sv('text',{x:140,y:106,'text-anchor':'middle',fill:'#978c76','font-size':11,'letter-spacing':2});t.textContent='行星待扫描';svg.append(t);return svg;}
    planets.forEach((p,i)=>{
      const rx=(planets.length<=2?62:34)+i*(planets.length<=2?52:24),ry=rx*.34,d=`M${140-rx} 59a${rx} ${ry} 0 1 0 ${2*rx} 0a${rx} ${ry} 0 1 0 ${-2*rx} 0`,tint=(PLANET_TINT.find(([re])=>re.test(p.planetType||''))||[0,'#8fdc7a'])[1];
      svg.append(sv('path',{d,fill:'none',stroke:'#d8b46a','stroke-width':.5,opacity:.35}));
      const dot=sv('circle',{r:3.2+Math.min(2,i*.4),fill:tint,stroke:'#07060b','stroke-width':.8}),dur=9+i*5,phase=(atlasHash(p.id)%1000)/1000;
      if(still()){const a=phase*Math.PI*2;dot.setAttribute('cx',(140+Math.cos(a)*rx).toFixed(1));dot.setAttribute('cy',(59+Math.sin(a)*ry).toFixed(1));}
      else dot.append(sv('animateMotion',{path:d,dur:dur+'s',begin:(-phase*dur).toFixed(2)+'s',repeatCount:'indefinite'}));
      const tip=sv('title');tip.textContent=p.name;dot.append(tip);svg.append(dot);
    });
    return svg;
  }
  function fill(id,swap){
    const s=tables.systems[id];dossier.classList.remove('swap');
    if(!s){dossier.replaceChildren(el('div',{class:'instrument-title',text:'星系档案'}),el('div',{class:'muted',text:'在星图上点选一个恒星系，查看航程与档案。'}));return;}
    const f=factionOf(s,orgs),stance=orgs[s.controllerId]?.stance,r=s.id===here?null:route(s.id);
    const span=r?(r.available?el('span',{},el('em',{text:String(r.days)}),` 天 · ${r.label}`):el('span',{text:r.reason})):el('span',{text:'所在星系'});
    const hops=[];if(r?.available&&r.path?.length){let at=here;for(const lid of r.path){const l=tables.lanes[lid];if(!l)continue;at=l.fromId===at?l.toId:l.fromId;hops.push(knownName(at));}}
    const creatures=Object.values(tables.creatures||{}).filter(c=>c.systemId===s.id),gaia=Object.values(tables.planets||{}).filter(p=>p.systemId===s.id&&p.habitability==='盖亚');
    const ships=(data.player.ownedShipIds||[]).map(x=>tables.ships[x]).filter(x=>x&&x.systemId===s.id&&!GONE.includes(x.status));
    const tag=el('div',{class:'tag'},el('i'),[f.name,stance].filter(Boolean).join(' · '));tag.style.setProperty('--fc',f.color);
    const dl=el('dl',{class:'facts'});
    for(const[k,v]of [['环境',s.environment||'轨道情报待调查'],['航程',span],['途经',hops.length>1?[knownName(here),...hops].join(' → '):null],
      ['生命',creatures.length?el('span',{class:'life',text:creatures.map(c=>c.name).slice(0,3).join('、')+(creatures.length>3?` 等 ${creatures.length} 处`:'')}):'未见记录'],
      ['宝地',gaia.length?gaia.map(p=>p.name).join('、'):null],['舰船',ships.length?ships.map(x=>x.name+' · '+x.status).join('、'):null]]){
      if(v===null)continue;dl.append(el('dt',{text:k}),el('dd',{},v));}
    dossier.replaceChildren(el('div',{class:'instrument-title',text:'星系档案'}),el('div',{class:'sysname',text:s.name}),tag,orrery(s),dl,
      el('div',{class:'btnrow'},btn('规划前往',()=>travel(s),'btn','route'),btn('进入星系',()=>enter(s.id),'btn primary','atlas')));
    if(swap&&!still()){void dossier.offsetWidth;dossier.classList.add('swap');}
  }
  fill(selected,false);
  // 势力分布：同心弧长 = 该势力控制的恒星系占比；悬停或聚焦条目时在星图上点亮对应领地。
  const groups=new Map();for(const s of systems){const k=s.controllerId||'none';if(!groups.has(k))groups.set(k,{key:k,f:factionOf(s,orgs),n:0});groups.get(k).n++;}
  const ranked=[...groups.values()].sort((a,b)=>b.n-a.n).slice(0,7),total=Math.max(1,systems.length);
  const dial=sv('svg',{viewBox:'-59 -59 118 118','aria-hidden':'true'}),arcs=[];
  ranked.forEach((g,i)=>{
    const r=52-i*6.5,c=2*Math.PI*r,target=(c*(1-g.n/total)).toFixed(2),color=g.key==='none'?'#a9abb6':g.f.color;
    dial.append(sv('circle',{r,fill:'none',stroke:'rgba(216,180,106,.1)','stroke-width':5}));
    const a=sv('circle',{r,class:'arcr',stroke:color,transform:'rotate(-90)','stroke-dasharray':c.toFixed(2),'stroke-dashoffset':still()?target:c.toFixed(2),'stroke-linecap':'round'});
    a.dataset.target=target;arcs.push(a);dial.append(a);
  });
  const mid=sv('text',{y:6,'text-anchor':'middle',fill:'#efe5cf','font-size':18,'font-family':'"DL4 Latin",serif'});mid.textContent=systems.length;dial.append(mid);
  if(!still())setTimeout(()=>arcs.forEach(a=>a.setAttribute('stroke-dashoffset',a.dataset.target)),120);
  const key=el('div',{class:'sector-key'});
  for(const g of ranked){
    const name=g.key==='none'?'未归属星域':g.f.name,row=el('div',{tabindex:0,'aria-label':`${name}，${g.n} 个恒星系；聚焦时在星图上高亮`},el('i'),el('span',{text:name}),el('b',{text:String(g.n)}));
    row.style.setProperty('--ink',g.key==='none'?'#a9abb6':g.f.color);
    const on=()=>highlight([g.key]),off=()=>highlight(null);
    row.addEventListener('mouseenter',on);row.addEventListener('mouseleave',off);row.addEventListener('focus',on);row.addEventListener('blur',off);key.append(row);
  }
  const index=el('details',{class:'panel index-window'},el('summary',{text:'恒星系索引　'+systems.length}));
  for(const s of systems){const b=btn(s.name,()=>select(s.id),'index-key','atlas');b.setAttribute('aria-label',`选中${s.name}，双击进入`);b.addEventListener('dblclick',()=>enter(s.id));index.append(b);}
  const aside=el('aside',{class:'instruments'},position,dossier,
    el('section',{class:'panel instrument spectrum-window'},el('div',{class:'instrument-title',text:'星域控制'}),el('div',{class:'sector-dial'},dial,key)),
    el('div',{class:'panel survey-counts'},metrics.slice(1).map(([label,n])=>el('div',{},el('b',{'data-count':n,text:String(n)}),el('small',{text:label})))),index);
  aside.selectSystem=id=>fill(id,true);
  return aside;
}

export function relationScope(ui,orgs,sel,locked){
  const {el,sv,icon,btn,data,state,render}=ui;
  const target=factionOf({controllerId:sel.id},data.tables.organizations);
  const score=data.player.command.relations[sel.id]||0;
  const radar=el('div',{class:'contact-scope'});
  const linked=orgs.filter(x=>x!==sel),start=Math.floor(Math.max(0,Math.min(state.netPage||0,Math.ceil(linked.length/6)-1)))*6;
  const peers=linked.slice(start,start+6);
  const links=sv('svg',{viewBox:'0 0 100 100',preserveAspectRatio:'none','aria-hidden':true});
  radar.append(links);
  for(let i=0;i<peers.length;i++){
    const o=peers[i],a=2*Math.PI*i/peers.length-.56,x=50+37*Math.cos(a),y=50+33*Math.sin(a);
    const f=factionOf({controllerId:o.id},data.tables.organizations);
    links.append(sv('line',{x1:50,y1:50,x2:x,y2:y,stroke:f.color,'stroke-width':.24,'stroke-dasharray':'1.2 1'}));
    const pick=btn('',()=>{state.contact=o.id;render();},'signal-node');pick.append(icon(f.key),el('small',{text:o.name}));pick.style.cssText='left:'+x+'%;top:'+y+'%;--ink:'+f.color;radar.append(pick);
  }
  radar.append(el('div',{class:'signal-hub',style:'--ink:'+target.color},icon(target.key),el('b',{text:sel.name})));
  const badge=el('section',{class:'contact-transponder',style:'--ink:'+target.color},el('small',{class:'eyebrow',text:'通讯目标'}),icon(target.key,'civilization-seal'),el('h3',{text:sel.name}),el('div',{class:'relationship'},el('span',{text:'好感度'}),el('b',{text:(score>0?'+':'')+score})),el('meter',{min:-100,max:100,value:score,'aria-label':'好感度'}),el('small',{class:locked?'warning':'ok',text:locked?'外交权限受限':'通讯权限已开放'}));
  if(linked.length>6)badge.append(btn('切换通讯组',()=>{state.netPage=(start/6+1)%Math.ceil(linked.length/6);render();},'btn small'));
  return el('section',{class:'comms-board'},radar,badge);
}

export function technologyCircuit(ui,rows,selection,select){
  const {el,sv,icon,data}=ui,defs=new Map(STUDIES.map(x=>[x.id,x])),colCounts=[],positions=new Map();
  function level(id){const req=defs.get(id)?.requirements||[];return req.length?1+Math.max(...req.map(level)):0;}
  for(const x of rows){const col=level(x.id),row=colCounts[col]||0;colCounts[col]=row+1;positions.set(x.id,{col,row});}
  const w=Math.max(1,colCounts.length)*196,h=Math.max(1,...colCounts)*63+20;
  const box=el('div',{class:'tech-circuit',style:'width:'+w+'px;height:'+h+'px'}),lines=sv('svg',{viewBox:'0 0 '+w+' '+h,'aria-hidden':true});box.append(lines);
  for(const x of rows){
    const {col,row}=positions.get(x.id),left=col*196+10,top=row*63+10,req=defs.get(x.id)?.requirements||[];
    for(const id of req){const prev=positions.get(id);if(!prev)continue;
      const ax=prev.col*196+159,ay=prev.row*63+34,bx=left,by=top+24,mid=(ax+bx)/2;
      lines.append(sv('path',{d:'M'+ax+' '+ay+' H'+mid+' V'+by+' H'+bx,fill:'none',stroke:data.tables.modules[id]?.unlocked?'#7fe6c2':'rgba(216,180,106,.45)','stroke-width':1.6}));
    }
    const ok=req.every(id=>data.tables.modules[id]?.unlocked),status=x.unlocked?'complete':ok?'ready':'locked';
    box.append(el('button',{type:'button',class:'tech-node '+status+(x.id===selection?' selected':''),style:'left:'+left+'px;top:'+top+'px',onclick:()=>select(x.id),'aria-pressed':String(x.id===selection)},icon(x.unlocked?'check':ok?'scan':'route'),el('span',{},el('small',{text:defs.get(x.id)?.field||'自主研发'}),el('b',{text:x.name}))));
  }
  return el('div',{class:'circuit-scroll',tabindex:0,'aria-label':'科技树，横向滚动查看解锁路径'},box);
}
