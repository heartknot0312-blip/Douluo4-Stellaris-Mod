import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
const out = 'outputs';
const workshopVersion = 9;
const source = fs.readFileSync('work/workshop/entry.js', 'utf8');
const stop = source.indexOf('// entry/src/bridge.js');
if (stop < 0) throw new Error('无法识别原卡工坊模块边界');
const prefix = source.slice(0, stop);
const exported = '\nglobalThis.__workshopModules = { parts:m_shared_parts, flags:m_shared_codeflags, core:m_entry_src_core, host:m_entry_src_host, store:m_entry_src_store, ui:m_entry_src_ui };\n})();';
const sandbox = { crypto: crypto.webcrypto, TextEncoder, TextDecoder, console, setTimeout, clearTimeout };
vm.runInNewContext(prefix + exported, sandbox);
const modules = sandbox.__workshopModules;
const load = name => JSON.parse(fs.readFileSync(`${out}/${name}`, 'utf8'));
const digest = x => crypto.createHash('sha256').update(x).digest('hex');
const hash = (kind, data) => digest(modules.parts.hashInput(kind, modules.parts.normalizePart(kind, data)));
const backend = load('dl4-space-backend.helper.json');
const compat = load('douluo-zod-space-compat.helper.json');
const original = JSON.parse(fs.readFileSync('work/card-inspection/decoded/original-zod.json', 'utf8'));
const book = load('dl4-space-rules.worldbook.json');
const regex = load('dl4-space-hide.regex.json');
const parts = [];
function add(kind, raw, op = 'add', target = null) {
  const data = modules.parts.normalizePart(kind, raw);
  parts.push({ id: parts.length + 1, kind, op, name: modules.parts.partName(kind, data), target, hash: hash(kind, data), data, code: modules.flags.analyzeCode(kind, data) });
}
function addEntry(e) {
  add('entry', { name: e.comment, enabled: true, content: e.content, strategy: { type: e.constant?'constant':'selective', keys: e.key }, position: { type: 'before_character_definition', role: 'system', depth: 4, order: e.order }, probability: 100, recursion: { prevent_incoming: true, prevent_outgoing: true } });
}
const [rules, generation, gray] = Object.values(book.entries);
addEntry(rules);
addEntry(generation);
add('regex', { id: regex.id, script_name: regex.scriptName, enabled: true, find_regex: regex.findRegex, replace_string: regex.replaceString, trim_strings: [], source: { ai_output: true }, destination: { display: true, prompt: false }, run_on_edit: true, min_depth: null, max_depth: null });
add('script', compat, 'replace', { key: original.id, alt: original.name, name: original.name, hash: hash('script', original) });
add('script', backend);
addEntry(gray);
for(const row of Object.values(book.entries).slice(3))addEntry(row);
const payload = { work: { id: 'dl4spacebackend01', title: '斗四星际战争与探索·星海导航', version: workshopVersion, author: { id: 'local', name: '本地制作' }, wbMode: 'separate', bookName: '斗四星际战争与探索' }, parts, images: {} };
fs.writeFileSync(`${out}/斗四星际MOD-工坊作品包.json`, JSON.stringify(payload, null, 2));
// 工坊上传编辑器接受角色卡JSON并拆解其中的世界书、正则、脚本。仅含本作品组件，无原卡人物/剧情。
const upload = { spec: 'chara_card_v2', spec_version: '2.0', data: { name: payload.work.title, description: '', personality: '', scenario: '', first_mes: '', mes_example: '', creator_notes: '仅供工坊上传编辑器提取部件，不是完整角色卡。ZOD为替换原版，其余为新添。', system_prompt: '', post_history_instructions: '', alternate_greetings: [], tags: ['斗四', '星际'], creator: '本地制作', character_version: '1.0.0', extensions: { tavern_helper: { scripts: [compat, backend], variables: {} }, regex_scripts: [regex] }, character_book: { name: payload.work.bookName, entries: Object.values(book.entries).map(e => ({ id: e.uid, keys: e.key,  secondary_keys: [], comment: e.comment, content: e.content, constant: e.constant, enabled: true, insertion_order: e.order, position: 'before_char', extensions: { position: 0, exclude_recursion: true, prevent_recursion: true } })) } } };
fs.writeFileSync(`${out}/斗四星际MOD-工坊上传.json`, JSON.stringify(upload, null, 2));
const footer = `
// 本地安装入口：原工坊安装/备份/卸载内核原样复用，不连接或伪装工坊网站。
const DL4_PACKAGE = ${JSON.stringify(payload)};
const localTv = m_entry_src_host.createTavern(window);
let localOverlay = null;
const localCore = m_entry_src_core.createCore({tv: localTv, confirm: spec => {
  localOverlay ??= m_entry_src_ui.createOverlay(localTv.win, {siteOrigin: '本地星际MOD', onClose: () => {}});
  return localOverlay.confirm(spec);
}});
let installing = false;
async function installDL4Space() {
  if (installing) return;
  installing = true;
  try {
    if (localTv.missing.length) throw new Error('缺少酒馆接口：'+localTv.missing.join('、'));
    const pre = await localCore.preflight({work: DL4_PACKAGE.work, parts: DL4_PACKAGE.parts});
    if (!pre.isTarget) throw new Error('请先打开斗罗宇宙角色卡');
    if (Object.values(pre.parts).some(p => p.state === 'missing')) throw new Error('原卡替换目标缺失，请使用匹配的斗罗宇宙版本');
    const result = await localCore.importWork({payload: DL4_PACKAGE, selected: DL4_PACKAGE.parts.map(p => p.id)});
    if (result.failed?.length || result.problems?.length) throw new Error('安装未全部完成：'+JSON.stringify({failed:result.failed,problems:result.problems}));
    localTv.win.toastr?.success('星际世界书、正则、后端和ZOD兼容已一起装好；可在创意工坊导入记录中卸载。请重新进入聊天。','斗四星际MOD');
  } catch (e) { if (e.code !== 'cancelled') { console.error('[斗四星际MOD安装]',e); localTv.win.toastr?.error(e.message,'斗四星际MOD'); } }
  finally { localOverlay?.destroy(); localOverlay = null; installing = false; }
}
const trigger = localTv.api('getButtonEvent')?.('安装星际MOD');
const stopInstall = trigger ? localTv.api('eventOn')?.(trigger, installDL4Space) : null;
// 已装好则不在每次刷新时反复弹框，仍可用按钮显式重装。
localCore.preflight({work:DL4_PACKAGE.work,parts:DL4_PACKAGE.parts}).then(pre => {
  const getVars=localTv.api('getVariables'), updateVars=localTv.api('updateVariablesWith');
  const marker='dl4InstallerPrompted';
  const seen=getVars({type:'script'})[marker];
  if((!pre.record || pre.record.version<DL4_PACKAGE.work.version) && seen!==DL4_PACKAGE.work.version) {updateVars(v=>({...v,[marker]:DL4_PACKAGE.work.version}),{type:'script'});installDL4Space();}
}).catch(e=>localTv.win.toastr?.error(e.message,'斗四星际MOD'));
window.addEventListener('pagehide',()=>{stopInstall?.stop?.();localOverlay?.destroy();},{once:true});
})();
`;
const installer = { type: 'script', enabled: true, id: '5fde31f2-1843-41e6-a26e-84b7b8ae0905', name: '斗四星际MOD·工坊一键安装', content: prefix + footer,
  info: '启用一次后通过原工坊安装器自动备份并装入6个部件，含L-星门事件链与灰风世界书。装好后可停用此安装脚本，在原工坊导入记录中管理MOD。', button: { enabled: true, buttons: [{ name: '安装星际MOD', visible: true }] }, data: {}, export_with: { data: true, button: true } };
new vm.Script(installer.content);
fs.writeFileSync(`${out}/斗四星际MOD-一键安装.script.json`, JSON.stringify(installer, null, 2));
fs.copyFileSync(`${out}/斗四星际MOD-一键安装.script.json`,`${out}/斗四星际MOD-v${payload.work.version}-一键安装.script.json`);
fs.writeFileSync('work/workshop/modules.cjs', prefix + exported);
fs.writeFileSync(`${out}/工坊包构建记录.json`, JSON.stringify({ packageId: payload.work.id, parts: parts.map(({data,...p})=>p), reusedWorkshopEntrySHA256: digest(source), runtimeRequestsToWorkshopSite: false, published: false, liveInstalled: false },null,2));
const manifest=load('manifest.json');manifest.delivery='rolecard-workshop-components-with-embedded-ui';manifest.frontendVersion=`${workshopVersion}.0.0`;manifest.workshopVersion=workshopVersion;
for(const name of [`斗四星际MOD-v${payload.work.version}-一键安装.script.json`,'斗四星际MOD-一键安装.script.json','斗四星际MOD-工坊作品包.json','斗四星际MOD-工坊上传.json'])manifest.artifacts.push({path:name,sha256:digest(fs.readFileSync(`${out}/${name}`))});
fs.writeFileSync(`${out}/manifest.json`,JSON.stringify(manifest,null,2));
console.log(JSON.stringify({parts:parts.length, installerBytes:Buffer.byteLength(installer.content), files:['斗四星际MOD-一键安装.script.json','斗四星际MOD-工坊作品包.json','斗四星际MOD-工坊上传.json']},null,2));
