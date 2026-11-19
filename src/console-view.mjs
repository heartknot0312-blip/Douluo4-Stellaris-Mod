// Each cartographic cell is clipped against its neighbours. Uncharted space stays open.
// 领地单元：先画一圈带轻微起伏的有机椭圆，再按与相邻星系的中垂线裁切（Voronoi 式），同势力单元由星图合并描边。
export function territoryShape(system, systems, pos, radius=118) {
  const c=pos(system.id), seed=[...String(system.id)].reduce((n,ch)=>(n*31+ch.charCodeAt(0))>>>0,7), k1=1+seed%3, k2=3+seed%4, ph=(seed%628)/100;
  let pts=Array.from({length:56},(_,i)=>{const a=i*Math.PI*2/56, r=radius*(1+.07*Math.sin(a*k1+ph)+.04*Math.sin(a*k2-ph*1.7));return [c.x+r*Math.cos(a),c.y+r*.86*Math.sin(a)];});
  for(const other of systems){
    if(other.id===system.id)continue;
    const n=pos(other.id), dx=n.x-c.x,dy=n.y-c.y, mid=(n.x*n.x+n.y*n.y-c.x*c.x-c.y*c.y)/2;
    const next=[],side=p=>p[0]*dx+p[1]*dy-mid;
    for(let i=0;i<pts.length;i++){
      const a=pts[i],b=pts[(i+1)%pts.length],sa=side(a),sb=side(b);
      if(sa<=0)next.push(a);
      if((sa<0)!==(sb<0)){const t=sa/(sa-sb);next.push([a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])]);}
    }
    pts=next;
  }
  return pts;
}

// 恒星系轨道盘：正投影倾斜的椭圆轨道，行星按固定相位落位（不移动，便于点选）；卫星绕所属行星，设施/舰船/生态信号贴近所属天体或外环。
const ORBIT_TINT=[[/海洋|海/,'#6fb7e8'],[/冰/,'#cfe8f2'],[/熔岩|熔|沙漠/,'#e8945a'],[/气态/,'#d9b27a'],[/岩石|荒芜/,'#a99b86']];
export function orbitalChart(doc, s, tables, select){
  const NS='http://www.w3.org/2000/svg',sv=(tag,attrs={},...kids)=>{const n=doc.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,String(v));for(const c of kids)if(c)n.append(c);return n;};
  const rows=table=>Object.values(tables[table]||{}).filter(r=>r.systemId===s.id),cx=450,cy=215,tilt=.34;
  const svg=sv('svg',{class:'system-orbits',viewBox:'0 0 900 430',role:'group','aria-label':s.name+'轨道图'});
  const label=(x,y,text,cls)=>{const t=sv('text',{x,y,'text-anchor':'middle',class:cls});t.textContent=text;return t;};
  const hit=(g,item)=>{g.setAttribute('tabindex','0');g.setAttribute('role','button');g.setAttribute('aria-label',item.name+(item.kind?'，'+item.kind:''));g.addEventListener('click',()=>select(item));g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select(item);}});};
  const deco=sv('g',{'aria-hidden':'true'});svg.append(deco);
  for(const r of [130,250,370])deco.append(sv('ellipse',{cx,cy,rx:r+40,ry:(r+40)*tilt,fill:'none',stroke:'#d8b46a','stroke-width':.4,opacity:.12}));
  deco.append(sv('path',{d:`M${cx-430} ${cy}H${cx+430}M${cx} 18V412`,stroke:'#d8b46a','stroke-width':.4,'stroke-dasharray':'2 6',opacity:.25}));
  const planets=rows('planets'),n=planets.length,inner=n>4?95:n>2?120:160,step=n>1?Math.min(95,(415-inner)/(n-1)):0,where=new Map(),orbits=sv('g',{class:'orb-paths','aria-hidden':'true'}),layer=sv('g');svg.append(orbits,layer);
  // 恒星
  const star=sv('g',{class:'orb-star'},sv('circle',{cx,cy,r:46,fill:'#ffda87',opacity:.08}),sv('circle',{cx,cy,r:30,fill:'#ffda87',opacity:.14,class:'pulse'}),sv('circle',{cx,cy,r:15,fill:'#fff0c6'}),
    sv('path',{d:`M${cx} ${cy-34}L${cx+3} ${cy-3}L${cx+34} ${cy}L${cx+3} ${cy+3}L${cx} ${cy+34}L${cx-3} ${cy+3}L${cx-34} ${cy}L${cx-3} ${cy-3}Z`,fill:'#fff6dc',opacity:.85}),label(cx,cy+56,s.name,'orb-name'));
  hit(star,{...s,kind:'恒星'});layer.append(star);
  planets.forEach((p,i)=>{
    const rx=inner+i*step,ry=rx*tilt,a=((i*137+28)%360)*Math.PI/180,x=cx+Math.cos(a)*rx,y=cy+Math.sin(a)*ry,tint=(ORBIT_TINT.find(([re])=>re.test(p.planetType||''))||[0,'#8fdc7a'])[1],size=p.habitability==='盖亚'?11:8.5;
    orbits.append(sv('ellipse',{cx,cy,rx,ry,fill:'none',stroke:'#d8b46a','stroke-width':1,opacity:.45,class:'orb-path'}));where.set(p.id,{x,y});
    const g=sv('g',{class:'orb-obj orb-planet'},sv('circle',{cx:x,cy:y,r:size+9,class:'orb-ring',fill:'none',stroke:'#f6dea2','stroke-width':1,'stroke-dasharray':'3 3'}),sv('circle',{cx:x,cy:y,r:size+4,fill:tint,opacity:.18}),sv('circle',{cx:x,cy:y,r:size,fill:tint,stroke:'#07060b','stroke-width':1.2}),sv('path',{d:`M${x-size*.7} ${y-size*.2}A${size} ${size*.42} 0 0 0 ${x+size*.7} ${y-size*.2}`,fill:'none',stroke:'#fff',opacity:.35}),label(x,y+size+17,p.name,'orb-name'));
    hit(g,{...p,table:'planets'});layer.append(g);
  });
  const extra=[...rows('orbitals'),...rows('places'),...rows('ships').filter(x=>!['入库','收束','摧毁'].includes(x.status)),...rows('creatures')],near=new Map();
  extra.forEach((o,i)=>{
    const host=where.get(o.planetId),k=near.get(o.planetId||'')||0;near.set(o.planetId||'',k+1);
    let x,y;if(host){const a=-Math.PI/2+k*1.25;x=host.x+Math.cos(a)*30;y=host.y+Math.sin(a)*22;orbits.append(sv('line',{x1:host.x,y1:host.y,x2:x,y2:y,stroke:'#d8b46a','stroke-width':.6,opacity:.4}));}
    else{const rx=Math.min(430,inner+n*step+28+(k%2)*16),a=((k*71+200)%360)*Math.PI/180;x=cx+Math.cos(a)*rx;y=cy+Math.sin(a)*rx*tilt;}
    const creature=!!tables.creatures?.[o.id],ship=!!tables.ships?.[o.id],moon=o.kind==='卫星',color=creature?'#ff7ad9':ship?'#f6dea2':moon?'#c3b79f':'#6fd3d9';
    const mark=moon?sv('circle',{cx:x,cy:y,r:4,fill:color}):creature?sv('circle',{cx:x,cy:y,r:5,fill:'none',stroke:color,'stroke-width':1.4}):ship?sv('path',{d:`M${x} ${y-6}L${x+5} ${y+5}L${x} ${y+2}L${x-5} ${y+5}Z`,fill:color}):sv('rect',{x:x-4,y:y-4,width:8,height:8,transform:`rotate(45 ${x} ${y})`,fill:'none',stroke:color,'stroke-width':1.3});
    const g=sv('g',{class:'orb-obj orb-minor'},sv('circle',{cx:x,cy:y,r:12,fill:'transparent'}),sv('circle',{cx:x,cy:y,r:10,class:'orb-ring',fill:'none',stroke:color,'stroke-width':.8}),mark,label(x,y-10,o.name,'orb-minor-name'));
    hit(g,o);layer.append(g);
  });
  return svg;
}

// Symmetrical mechanical plates, drawn separately so grade changes alter the silhouette.
export function hangarModel(sv,level,armor=false){
  const colors=['#dce8ef','#f3cc63','#bd9aeb','#60778e','#ec776c','#f7d88c'], metal=armor?'#d8eafb':colors[level];
  const g=sv('svg',{viewBox:'0 0 320 345',class:'hangar-model',role:'img','aria-label':armor?'斗铠全身结构':'机甲全身结构'}),part=(parent,d,fill,stroke='#7095ab')=>parent.append(sv('path',{d,fill,stroke,'stroke-width':1.2,'stroke-linejoin':'round'}));
  for(const r of [83,119,147])g.append(sv('circle',{cx:160,cy:174,r,fill:'none',stroke:'#71c9f324','stroke-dasharray':r===119?'3 6':'none'}));
  for(const sign of [1,-1]){
    const side=sv('g',{transform:sign===1?'':'translate(320 0) scale(-1 1)'});g.append(side);
    if(armor||level>=2)for(let i=0;i<(armor?3:level);i++)part(side,`M124 ${106+i*8} L${57-i*8} ${42+i*21} L${69-i*6} ${79+i*20} L112 ${133+i*4}Z`,i%2?'#39556a':metal);
    part(side,'M151 93L130 87 110 97 106 126 123 142 145 127Z',metal);
    part(side,'M128 91L107 86 82 106 83 121 103 115 123 131Z','#3f5b71');
    part(side,'M130 86L112 78 82 95 74 116 108 107 121 114Z',metal);
    part(side,'M107 120L92 129 84 158 97 167 111 147Z','#41586b');
    part(side,'M92 146L79 153 67 188 74 206 94 182 99 155Z',metal);
    part(side,'M80 189L69 193 64 211 73 218 84 201Z','#293b50');
    part(side,'M153 162L130 150 119 175 121 198 147 211Z',metal);
    part(side,'M145 195L123 190 117 221 137 239 149 207Z','#425970');
    part(side,'M130 207L115 217 107 252 121 244 137 218Z',metal);
    part(side,'M127 232L111 240 104 280 106 302 120 299 135 255Z',metal);
    part(side,'M106 292L94 304 81 313 83 319 117 316 124 304Z','#566f80');
    part(side,'M124 111L148 119 149 128 128 119Z','#88e6ff');
    if(level>=3||armor)part(side,'M114 218L96 225 94 244 112 237Z','#adcad5');
    if(level>=4)part(side,'M84 147L62 129 56 183 65 211 76 179Z',metal);
    if(level===5)part(side,'M135 81L108 38 117 31 150 67Z','#f9dd8c');
  }
  part(g,'M130 103L159 96 190 103 182 132 164 157 143 145Z','#334b60');
  part(g,'M126 99L149 103 160 114 174 103 194 98 184 123 159 136 134 123Z',metal);
  part(g,'M152 119L160 112 168 119 160 132Z','#7bedff');part(g,'M145 138L160 146 177 137 172 165 159 180 148 164Z','#7993a0');
  part(g,'M147 56L160 44 174 54 177 78 162 93 147 83 141 68Z',metal);part(g,'M144 66L158 70 175 65 169 77 159 81 151 76Z','#193446');part(g,'M148 68L158 72 172 68 166 74 158 75Z','#8cf4ff');
  if(level>=1||armor)part(g,'M139 42L157 57 160 53 181 37 171 58 159 66 148 59Z',level===5?'#ffde85':metal);
  return g;
}
