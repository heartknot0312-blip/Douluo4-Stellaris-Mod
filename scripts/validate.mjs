import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
const files = fs.readdirSync('test').filter(p => p.endsWith('.test.mjs')).map(p => `test/${p}`);
const test = spawnSync(process.execPath, ['--test', '--test-reporter=spec', ...files], { encoding: 'utf8' });
fs.mkdirSync('outputs', { recursive: true });
fs.writeFileSync('outputs/test-results.txt', test.stdout + test.stderr);
const verify = spawnSync(process.execPath, ['scripts/verify.mjs'], { encoding: 'utf8' });
let artifacts; try { artifacts = JSON.parse(verify.stdout); } catch { artifacts = { error: verify.stderr }; }
const number = name => Number((test.stdout.match(new RegExp(`(?:ℹ\\s*)?${name} (\\d+)`)) || [])[1] || 0);
const report = { version: '1.0.0', date: new Date().toISOString().slice(0, 10), checks: { automated: { status: test.status === 0 ? 'pass' : 'fail', tests: number('tests'), pass: number('pass'), fail: number('fail'), skipped: number('skipped') }, artifacts },
  sourceCard: JSON.parse(fs.readFileSync('outputs/manifest.json')).provenance,
  hostEvidence: JSON.parse(fs.readFileSync('docs/runtime-evidence.json')), realSillyTavern:artifacts.hostRuntime==='passed-isolated-installed-host'?JSON.parse(fs.readFileSync('work/v7-runtime/probe.json')):'not-executed', modelAdherence: 'not-executed', actualInstallationModified: false };
fs.writeFileSync('outputs/validation-report.json', JSON.stringify(report, null, 2) + '\n');
fs.copyFileSync('README.md', 'outputs/使用说明.md');
fs.copyFileSync('docs/runtime-acceptance.md', 'outputs/真实酒馆验收.md');
console.log(JSON.stringify(report.checks, null, 2));
if (test.status !== 0 || verify.status !== 0) process.exitCode = 1;
