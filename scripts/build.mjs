import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { VERSION, CONFIG, TABLES, COMMON, GENERATION_ROUTES } from '../src/schema.mjs';
import { GRAY_LORE_PROMPT } from '../src/gray-content.mjs';
import './build-gray-media.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'outputs');
const work = path.join(root, 'work', 'card-inspection');
fs.mkdirSync(out, { recursive: true });
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const json = (p, x) => fs.writeFileSync(p, JSON.stringify(x, null, 2) + '\n', 'utf8');
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const schemaText = '\n【完整字段合同】\n公共字段：' + JSON.stringify(COMMON) + '\n表字段：' + JSON.stringify(TABLES) + '\n类型：ref:表名为必填外键；ref?:可省略或null；refs:为外键数组；enum:为指定枚举；positive为大于0。';
const instruction = read('prompts/protocol.md') + schemaText + '\n【按类型细化路线】\n' + JSON.stringify(GENERATION_ROUTES) + '\n【作者配置】\n' + JSON.stringify(CONFIG);
fs.writeFileSync(path.join(root, 'src/instruction.generated.mjs'), `// 由 scripts/build.mjs 生成\nexport const INSTRUCTION = ${JSON.stringify(instruction)};\n`);
fs.writeFileSync(path.join(root,'src/atlas-style.generated.mjs'),`// 由 scripts/build.mjs 生成\nexport const UI_CSS = ${JSON.stringify(read('src/atlas.css')+'\n'+read('src/flightdeck.css')+'\n'+read('src/command.css'))};\n`);

const art=Array.from({length:12},(_,i)=>'data:image/webp;base64,'+fs.readFileSync(path.join(root,'assets/hangar',i+'.webp')).toString('base64'));
// 界面字体：assets/fonts 下的 OFL 子集（scripts/subset-fonts.py 生成），运行时经宿主文档 FontFace 注册，不访问网络。
const fontFiles=[['DL4 Serif',900,'dl4-serif-900.woff2'],['DL4 Serif',600,'dl4-serif-600.woff2'],['DL4 Latin',600,'dl4-latin-600.woff2'],['DL4 Latin SC',600,'dl4-latin-sc-600.woff2']];
fs.writeFileSync(path.join(root,'src/fonts.generated.mjs'),'// 由 scripts/build.mjs 生成\nexport const UI_FONTS='+JSON.stringify(fontFiles.map(([family,weight,file])=>({family,weight,data:fs.readFileSync(path.join(root,'assets/fonts',file)).toString('base64')})))+';\n');
fs.writeFileSync(path.join(root,'src/hangar.generated.mjs'),'export const HANGAR_ART='+JSON.stringify(art)+';\n');
const files = ['src/schema.mjs', 'src/command.mjs', 'src/console-view.mjs','src/flightdeck.mjs','src/desk-panels.mjs','src/survey-globe.mjs','src/hangar.generated.mjs', 'src/content.mjs', 'src/gray-content.mjs', 'src/gray-media.generated.mjs', 'src/l-gate.mjs', 'src/public-atlas.mjs','src/engine.mjs', 'src/host.mjs', 'src/instruction.generated.mjs', 'src/ui-model.mjs', 'src/fonts.generated.mjs', 'src/atlas-style.generated.mjs', 'src/atlas.mjs', 'src/browser-entry.mjs'];
const bundle = '(() => {\n"use strict";\n' + files.map(p => read(p).replace(/^import .*;\s*$/gm, '').replace(/^export /gm, '')).join('\n') + '\n})();\n';
fs.writeFileSync(path.join(out, 'dl4-space-backend.js'), bundle);
const helper = { type: 'script', enabled: true, name: '斗四星际后端', id: 'a8f9a915-a3d2-4a12-80ac-ce51ae468510', content: bundle,
  info: '星海导航悬浮窗、模块化设计、装备与图鉴，及角色卡内世界生成、规则校验、分支重放与舰船结算。宿主基线：ST1.19.0/酒馆助手4.11.3。须同时导入世界书规则并替换斗罗ZOD兼容组件；无额外模型或网络请求。', button: { enabled: false, buttons: [] }, data: {}, export_with: { data: true, button: true } };
json(path.join(out, 'dl4-space-backend.helper.json'), helper);

const commandBook=read('prompts/command.md');const chapters=commandBook.split(/\n(?=(?:合成人女王／queen|虫妈／brood|肃正大小姐／sentinel|泡泡／bubbles)。)/);const companionKeys=[['合成人女王','塞塔娜','记忆备份'],['虫妈','失群母体','索林原虫'],['肃正大小姐','幽灵信号','审计人格'],['泡泡','太空变形虫幼体','随航生态伙伴']];
const entries = [
  ['斗四星际·世界硬规则', read('prompts/world-rules.md'), 0],
  ['斗四星际·自主细化协议', read('prompts/generation.md')+'\n\n'+chapters[0], 1],
  ['灰风·斗四人物档案', read('prompts/gray-worldbook.md')+'\n\n'+GRAY_LORE_PROMPT, 2, ['灰风','小灰','纳-迪-沙','灰之风暴','灰风·誓约']],
  ...companionKeys.map((keys,i)=>[keys[0]+'·相遇与同行',chapters[i+1].split('\n来源线索')[0],3+i,keys]),
].map(([comment, content, uid, key = []]) => ({ uid, key, keysecondary: [], comment, content, constant: uid<3, selective: true, order: 110 + uid, position: 0, disable: false, excludeRecursion: true, preventRecursion: true, probability: 100, useProbability: true, displayIndex: uid }));
json(path.join(out, 'dl4-space-rules.worldbook.json'), { entries: Object.fromEntries(entries.map(e => [e.uid, e])) });

const regex = { id: '68b03b08-497b-4f43-8be8-f4f1233ab301', scriptName: '斗四星际·隐藏后端事务显示', findRegex: '/<DL4Space>[\\s\\S]*?<\\/DL4Space>/g', replaceString: '<!-- DL4Space display hidden -->', trimStrings: [], placement: [2], disabled: false, markdownOnly: true, promptOnly: false, runOnEdit: true, substituteRegex: 0, minDepth: null, maxDepth: null };
json(path.join(out, 'dl4-space-hide.regex.json'), regex);

const cardIndex = process.argv.indexOf('--card');
const cardPath = cardIndex >= 0 ? process.argv[cardIndex + 1] : null;
let provenance = { cardCompatibility: 'not-built', requiredCardSHA256: '96a9ddd5ebb1d00dd0fb577973298ace065b23e1d7384813c0be13ec528f10dd' };
if (cardPath) {
  const absolute = path.resolve(cardPath), original = fs.readFileSync(absolute), digest = sha(original);
  if (digest !== provenance.requiredCardSHA256) throw new Error('原卡哈希不同，停止自动兼容修改；请核对目标版本。');
  fs.mkdirSync(path.join(work, 'snapshot'), { recursive: true }); fs.mkdirSync(path.join(work, 'decoded'), { recursive: true });
  const snapshot = path.join(work, 'snapshot', 'original.png');
  if (!fs.existsSync(snapshot)) { fs.writeFileSync(snapshot, original); fs.chmodSync(snapshot, 0o444); }
  else if (sha(fs.readFileSync(snapshot)) !== digest) throw new Error('证据快照发生变化');
  if (original.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new Error('PNG签名错误');
  const crcTable = Array.from({ length: 256 }, (_, i) => { let c = i; for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = b => { let c = 0xffffffff; for (const x of b) c = crcTable[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const payloads = {}; let offset = 8, ended = false;
  while (offset < original.length) {
    const n = original.readUInt32BE(offset), type = original.toString('ascii', offset + 4, offset + 8);
    if (offset + n + 12 > original.length || crc(original.subarray(offset + 4, offset + n + 8)) !== original.readUInt32BE(offset + n + 8)) throw new Error('PNG边界/CRC错误');
    const data = original.subarray(offset + 8, offset + 8 + n);
    if (type === 'tEXt') { const z = data.indexOf(0), k = data.toString('ascii', 0, z); if (['chara', 'ccv3'].includes(k)) { if (payloads[k]) throw new Error('重复载荷关键字'); payloads[k] = JSON.parse(Buffer.from(data.subarray(z + 1).toString(), 'base64').toString('utf8')); } }
    offset += n + 12; if (type === 'IEND') { ended = true; break; }
  }
  if (!ended || !payloads.chara || (payloads.ccv3 && JSON.stringify(payloads.chara) !== JSON.stringify(payloads.ccv3))) throw new Error('PNG载荷缺失或不一致');
  const flatten = x => Array.isArray(x) ? x.flatMap(flatten) : x && typeof x === 'object' ? x.type === 'script' ? [x] : Object.values(x).flatMap(flatten) : [];
  const scripts = flatten(payloads.chara.data.extensions.tavern_helper.scripts);
  const zod = scripts.find(s => s.name === '斗罗ZOD'); if (!zod) throw new Error('找不到斗罗ZOD');
  json(path.join(work, 'decoded', 'original-zod.json'), zod);
  const marker = '  const Root = z.object({';
  if (zod.content.split(marker).length !== 2) throw new Error('原卡Root锚点不唯一');
  const patched = structuredClone(zod);
  patched.content = zod.content.replace(marker, marker + '\n    // DL4_SPACE_COMPAT_V1: 新增后端独占命名空间；原卡字段保持原校验。\n    星际: z.any().optional(),\n    星际待办: z.any().optional(),');
  const restored = patched.content.replace('\n    // DL4_SPACE_COMPAT_V1: 新增后端独占命名空间；原卡字段保持原校验。\n    星际: z.any().optional(),\n    星际待办: z.any().optional(),', '');
  if (restored !== zod.content) throw new Error('兼容修改超出声明范围');
  json(path.join(out, 'douluo-zod-space-compat.helper.json'), patched);
  provenance = { ...provenance, cardCompatibility: 'built', inputSHA256: digest, originalBytes: original.length,
    componentId: zod.id, sourcePointer: '/data/extensions/tavern_helper/scripts (script id selector)', sourceSHA256: sha(zod.content), outputSHA256: sha(patched.content), semanticRoundtripOutsideAddedField: true, inputUnchanged: sha(fs.readFileSync(absolute)) === digest };
  json(path.join(work, 'inspection-receipt.json'), provenance);
}
const model = { schemaVersion: 1, modelId: 'douluo4-space', modelVersion: VERSION, storage: { scope: 'message', root: 'stat_data.星际', strategy: 'multi-floor' },
  tables: Object.fromEntries(Object.entries(TABLES).map(([table, fields]) => [table, { primaryKey: 'id', fields: Object.fromEntries(Object.entries({ ...COMMON, ...fields }).map(([k, t]) => [k, { type: t.startsWith('refs:') || t === 'array' ? 'array' : ['object'].includes(t.replace('?', '')) ? 'object' : ['positive', 'number', 'finite'].includes(t.replace('?', '')) ? 'number' : t === 'boolean' ? 'boolean' : 'string', required: !t.includes('?') }])) }])) };
json(path.join(root, 'model.json'), model);
json(path.join(root, 'bindings.json'), { schemaVersion: 1, modelId: 'douluo4-space', bindings: Object.keys(TABLES).map(table => ({ id: `${table}-backend`, surface: 'script', table, field: 'id', access: 'read-write', owner: 'dl4-transaction-engine', refreshEvents: ['MESSAGE_UPDATED', 'MESSAGE_SWIPED', 'CHAT_CHANGED'] })) });
const artifactNames = ['dl4-space-backend.js', 'dl4-space-backend.helper.json', 'dl4-space-rules.worldbook.json', 'dl4-space-hide.regex.json', ...(cardPath ? ['douluo-zod-space-compat.helper.json'] : [])];
const componentArtifacts = artifactNames.filter(name => /\.(helper|regex)\.json$/.test(name)).map(name => {
  const value = JSON.parse(fs.readFileSync(path.join(out, name), 'utf8'));
  return { artifactName: name.replace(/\.(helper|regex)\.json$/, ''), kind: value.type === 'script' ? 'helper-script' : 'regex', relativePath: name, id: value.id, sha256: sha(fs.readFileSync(path.join(out, name))) };
});
json(path.join(out, 'component-update-manifest.json'), { schemaVersion: 1, deliveryMode: 'component', artifacts: componentArtifacts });
json(path.join(out, 'manifest.json'), { version: VERSION, delivery: 'rolecard-backend-components', storage: 'stat_data.星际', primaryUpdateMode: 'same-generation', externalRequests: false, hostBaseline: { sillyTavern: '1.19.0', tavernHelper: '4.11.3', promptTemplate: '1.17.9' }, provenance, artifacts: artifactNames.map(name => ({ path: name, sha256: sha(fs.readFileSync(path.join(out, name))) })), runtimeAcceptance: 'pending' });
console.log(JSON.stringify({ version: VERSION, artifacts: artifactNames, compatibility: provenance.cardCompatibility, bundleBytes: Buffer.byteLength(bundle) }, null, 2));
