#!/usr/bin/env node
// Rendert Übungen als Bild (Titel, 3D-Bild, nummerierter Ablauf, Material), um sie vor dem Ausliefern anzusehen:
// Überdeckungen, abgeschnittene Beschriftungen, passen die Nummern im Bild zum Ablauf?
//
//   node tools/uebungsbilder.mjs <id>[,<id>...]            bestimmte Übungen (alle Altersstufen werden durchsucht)
//   node tools/uebungsbilder.mjs --datei mittel [--kategorie aufwaermen]
//   Optionen: --kinder 14 (für Formeln, Standard 14) · --out <Ordner> (Standard: <tmp>/trainingspilot-bilder)
//
// Braucht Playwright mit Chromium (in Claude-Code-Cloud-Sitzungen vorinstalliert, dort mit
// NODE_PATH=$(npm root -g) aufrufen). Nur Übungen im Bildformat "scene" werden gezeichnet.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch {
  console.error('Playwright nicht gefunden. Aufruf z. B.: NODE_PATH=$(npm root -g) node tools/uebungsbilder.mjs …'); process.exit(1);
}

const argv = process.argv.slice(2), opt = { ids: [], kinder: 14, out: path.join(os.tmpdir(), 'trainingspilot-bilder') };
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--datei') opt.datei = argv[++i];
  else if (a === '--kategorie') opt.kat = argv[++i];
  else if (a === '--kinder') opt.kinder = Number(argv[++i]);
  else if (a === '--out') opt.out = argv[++i];
  else opt.ids.push(...a.split(',').filter(Boolean));
}
if (!opt.ids.length && !opt.datei) { console.error('Bitte Übungs-IDs oder --datei angeben (Details im Kopf dieser Datei).'); process.exit(1); }

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const a = html.indexOf('// EXERCISE_ENGINE_START'), b = html.indexOf('// EXERCISE_ENGINE_END');
const eng = new Function(html.slice(a, b) + ';return { diagramScene: typeof diagramScene === "function" ? diagramScene : null, compileTemplate: typeof compileTemplate === "function" ? compileTemplate : null };')();
if (!eng.diagramScene) { console.error('diagramScene im Übungs-Code von index.html nicht gefunden.'); process.exit(1); }

const dir = path.join(ROOT, 'data/exercises');
const found = [];
for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.json'))) {
  const tier = f.replace('.json', '');
  if (opt.datei && opt.datei !== tier) continue;
  const d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  for (const [kat, list] of Object.entries(d.categories || {})) {
    if (opt.kat && opt.kat !== kat) continue;
    for (const ex of list) if (!opt.ids.length || opt.ids.includes(ex.id)) found.push({ tier, kat, ex });
  }
}
if (!found.length) { console.error('Keine passende Übung gefunden.'); process.exit(1); }

// Formeln in Texten mit dem Formel-Rechner der App auflösen (k = --kinder)
const fill = t => { if (!t) return ''; try { return eng.compileTemplate(t)(opt.kinder); } catch (e) { return String(t) + ' [Formelfehler: ' + e.message + ']'; } };
const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])).replace(/&lt;(\/?)b&gt;/g, '<$1b>');

fs.mkdirSync(opt.out, { recursive: true });
const br = await chromium.launch();
const pg = await br.newPage({ viewport: { width: 440, height: 800 }, deviceScaleFactor: 2 });
let n = 0;
for (const { tier, kat, ex } of found) {
  const sc = ex.diagram && ex.diagram.scene;
  if (!sc) { console.log(`übersprungen (kein scene-Bild): ${tier}/${kat}/${ex.id}`); continue; }
  const list = (k, ord) => (ex[k] || []).length ? `<${ord ? 'ol' : 'ul'}>${ex[k].map(x => `<li>${esc(x)}</li>`).join('')}</${ord ? 'ol' : 'ul'}>` : '';
  const page = `<!doctype html><meta charset="utf-8"><body style="margin:0;background:#fff;font:14px/1.4 system-ui,sans-serif;width:440px">
    <div id="x" style="padding:12px"><div style="font-size:11px;color:#667;letter-spacing:.06em;text-transform:uppercase">${tier} · ${kat} · ${ex.id}</div>
    <h3 style="margin:2px 0 8px">${esc(ex.title)}</h3>
    <div style="background:#2E5339;border-radius:12px;overflow:hidden">${eng.diagramScene(sc)}</div>
    <div style="font-size:12px;color:#444;margin:6px 0">${esc(fill(ex.dims))} · ${esc(fill(ex.materials))}</div>
    <b style="font-size:12px">Aufbau</b>${list('aufbau')}<b style="font-size:12px">Ablauf</b>${list('ablauf', true)}${list('regeln')}
    <div style="font-size:12px"><b>Leichter:</b> ${esc(ex.leichter || '–')}<br><b>Schwerer:</b> ${esc(ex.schwerer || '–')}</div></div>`;
  await pg.setContent(page); await pg.waitForTimeout(150);
  const file = path.join(opt.out, `${tier}-${ex.id}.png`);
  await (await pg.$('#x')).screenshot({ path: file }); n++;
  console.log(file);
}
await br.close();
console.log(`${n} Bild(er) gespeichert in ${opt.out}`);
