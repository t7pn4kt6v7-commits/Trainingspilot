#!/usr/bin/env node
// Versionspflege für index.html – damit Version, Changelog und Update-Hinweis immer zusammenpassen.
//
//   node tools/release.mjs status                 zeigt alle Versionsstellen und die Neuigkeiten-Liste
//   node tools/release.mjs check                  prüft (auch in GitHub Actions): Fehler -> Exit-Code 1
//   node tools/release.mjs bump [--version 5.213] --log "Text für den Kopf-Changelog" [--neu "Punkt"]...
//
// bump setzt die Version an allen vier Stellen (APP_VERSION, <title>, Versions-Badge, Kopfkommentar
// "Version:"), trägt den Text oben in den Kopf-Changelog ein und stellt jeden --neu-Punkt an den Anfang
// von USER_CHANGELOG. Die Liste bleibt bei höchstens 6 Punkten; die ältesten fallen heraus (Grund: ältere,
// noch geöffnete Apps zeigen die *ganze* Liste im Update-Fenster, siehe CLAUDE.md und v5.197).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILE = path.join(ROOT, 'index.html');
const MAX_NEU = 6;

const PLACES = [
  { name: 'APP_VERSION', re: /var APP_VERSION = '([0-9]+\.[0-9]+)';/, fmt: v => `var APP_VERSION = '${v}';` },
  { name: '<title>', re: /<title>Trainingspilot v([0-9]+\.[0-9]+) /, fmt: v => `<title>Trainingspilot v${v} ` },
  { name: 'Versions-Badge', re: /aria-label="Nach Updates suchen">v([0-9]+\.[0-9]+)</, fmt: v => `aria-label="Nach Updates suchen">v${v}<` },
  { name: 'Kopfkommentar', re: /\n  Version: ([0-9]+\.[0-9]+) /, fmt: v => `\n  Version: ${v} ` },
];
const LOG_HEAD = '  Changelog (letzte Versionen):\n';
const NEU_START = '  // USER_CHANGELOG_START\n', NEU_END = '  // USER_CHANGELOG_END';

function read() { return fs.readFileSync(FILE, 'utf8'); }
function versions(s) { return PLACES.map(p => ({ name: p.name, v: (s.match(p.re) || [])[1] || null })); }
function topLog(s) {
  const i = s.indexOf(LOG_HEAD); if (i < 0) return null;
  const m = s.slice(i + LOG_HEAD.length).match(/^  v([0-9]+\.[0-9]+) - /); return m ? m[1] : null;
}
function neuList(s) {
  const a = s.indexOf(NEU_START), b = s.indexOf(NEU_END);
  if (a < 0 || b < a) return null;
  return s.slice(a + NEU_START.length, b).split('\n').filter(l => l.trim()).map(l => l.replace(/^\s*\/\/ - /, ''));
}
function nextVersion(v) { const [maj, min] = v.split('.'); return `${maj}.${String(Number(min) + 1).padStart(min.length, '0')}`; }
function wrap(text, first, cont, width = 112) {
  const words = text.trim().split(/\s+/), lines = []; let cur = first;
  for (const w of words) {
    const pre = lines.length ? cont : first;
    if (cur.length > pre.length && (cur + ' ' + w).length > width) { lines.push(cur); cur = cont + w; }
    else cur = cur.length > pre.length ? cur + ' ' + w : cur + w;
  }
  lines.push(cur); return lines.join('\n') + '\n';
}

function problems(s) {
  const out = [];
  const vs = versions(s), v0 = vs[0].v;
  for (const x of vs) {
    if (!x.v) out.push(`${x.name}: keine Version gefunden`);
    else if (x.v !== v0) out.push(`${x.name} zeigt ${x.v}, APP_VERSION ist ${v0}`);
  }
  const top = topLog(s);
  if (!top) out.push('Kopf-Changelog: kein Eintrag unter "Changelog (letzte Versionen):" gefunden');
  else if (v0 && top !== v0) out.push(`Kopf-Changelog: oberster Eintrag ist v${top}, die App ist v${v0} (Eintrag fehlt)`);
  const neu = neuList(s);
  if (!neu) out.push('USER_CHANGELOG: Markierungen USER_CHANGELOG_START/END nicht gefunden');
  else {
    if (!neu.length) out.push('USER_CHANGELOG: Liste ist leer');
    if (neu.length > MAX_NEU) out.push(`USER_CHANGELOG: ${neu.length} Punkte, höchstens ${MAX_NEU} erlaubt (sonst ist das Update-Fenster in älteren Apps nicht scrollbar)`);
  }
  return { out, vs, top, neu };
}

function args(argv) {
  const o = { neu: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--version') o.version = argv[++i];
    else if (a === '--log') o.log = argv[++i];
    else if (a === '--neu') o.neu.push(argv[++i]);
    else throw new Error('Unbekannte Angabe: ' + a);
  }
  return o;
}

const [cmd = 'status', ...rest] = process.argv.slice(2);
const s = read();

if (cmd === 'status' || cmd === 'check') {
  const { out, vs, top, neu } = problems(s);
  if (cmd === 'status') {
    for (const x of vs) console.log(`${x.name.padEnd(15)} ${x.v || '–'}`);
    console.log(`${'Kopf-Changelog'.padEnd(15)} oben: v${top || '–'}`);
    console.log(`Neuigkeiten (${neu ? neu.length : 0}/${MAX_NEU}):`);
    (neu || []).forEach(n => console.log('  - ' + n));
  }
  if (out.length) { out.forEach(p => console.error('FEHLER ' + p)); process.exit(1); }
  console.log(cmd === 'check' ? `Versionsangaben OK (v${vs[0].v}).` : 'Alles stimmig.');
} else if (cmd === 'bump') {
  const o = args(rest);
  const cur = versions(s)[0].v;
  if (!cur) { console.error('APP_VERSION nicht gefunden'); process.exit(1); }
  if (!o.log) { console.error('Bitte mit --log "…" beschreiben, was sich ändert (Kopf-Changelog).'); process.exit(1); }
  const v = o.version || nextVersion(cur);
  if (!/^[0-9]+\.[0-9]+$/.test(v)) { console.error('Version bitte im Format 5.213'); process.exit(1); }
  let t = s;
  for (const p of PLACES) t = t.replace(p.re, p.fmt(v));
  const i = t.indexOf(LOG_HEAD);
  t = t.slice(0, i + LOG_HEAD.length) + wrap(o.log, `  v${v} - `, '         ') + t.slice(i + LOG_HEAD.length);
  let removed = [];
  if (o.neu.length) {
    const list = [...o.neu, ...(neuList(t) || [])];
    removed = list.slice(MAX_NEU); const keep = list.slice(0, MAX_NEU);
    const a = t.indexOf(NEU_START), b = t.indexOf(NEU_END);
    t = t.slice(0, a + NEU_START.length) + keep.map(n => `  // - ${n}\n`).join('') + t.slice(b);
  }
  fs.writeFileSync(FILE, t);
  console.log(`Version ${cur} -> ${v} an allen ${PLACES.length} Stellen gesetzt, Kopf-Changelog ergänzt.`);
  if (o.neu.length) console.log(`Neuigkeiten: ${o.neu.length} neu oben eingetragen` + (removed.length ? `, entfernt (älteste): ${removed.map(r => '„' + r + '“').join(', ')}` : '') + '.');
  const { out } = problems(t);
  if (out.length) { out.forEach(p => console.error('FEHLER ' + p)); process.exit(1); }
  console.log('Nicht vergessen: „Über Trainingspilot & Funktionen“ (#about-panel) inhaltlich prüfen.');
} else {
  console.error('Befehle: status | check | bump  (Details im Kopf dieser Datei)'); process.exit(1);
}
