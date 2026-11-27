#!/usr/bin/env node
// Aktualitätsprüfung des Erklärvideos: Passt das Drehbuch noch zur App? (Inhalt) und läuft die Werkzeugkette? (Technik)
//
//   node tools/video/pruefung.mjs [--technik] [--report <datei.md>]
//
// Inhalt (immer):
//   1. App-Version: Stand des Videos (drehbuch.json → stand.app_version) gegen APP_VERSION; listet die Änderungen seitdem.
//   2. Bedienelemente: jede Kennung in `ui` (#id, .klasse) muss in index.html vorkommen – sonst bricht die Aufnahme.
//   3. Beschriftungen: jeder im Sprechtext in „…“ genannte Knopf muss in index.html stehen (außer `extern`: iOS/Android).
//   4. Funktionsliste: Zeilen in „Über Trainingspilot & Funktionen“ gegen `funktionen` – neue Zeilen, offene Punkte,
//      Zeilen, die es nicht mehr gibt.
// Technik (--technik): ffmpeg/ffprobe (mit rubberband, xfade, loudnorm), Node, Playwright + Chromium, Python,
//   optional die Sprach-Umgebung.
// Ausgang: 1 nur bei kaputten Kennungen/Beschriftungen/Technik – sonst 0. Veraltete Inhalte sind Hinweise, keine Fehler
// (das Video darf der Version hinterherhinken, solange nichts Gezeigtes bricht).
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '../..');
const require = createRequire(import.meta.url);
const argv = process.argv.slice(2);
const technik = argv.includes('--technik');
const reportFile = argv.includes('--report') ? argv[argv.indexOf('--report') + 1] : null;
const DB = JSON.parse(fs.readFileSync(path.join(HERE, 'drehbuch.json'), 'utf8'));
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

const fehler = [], hinweise = [], ok = [];
const norm = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/ß/g, 'ss').replace(/[^a-z0-9\- ]+/g, ' ').replace(/\b(\d{3})\d*\b/g, '#').replace(/\s+/g, ' ').trim();
const vnum = v => v.split('.').map(Number);
const neuer = (a, b) => { const [x, y] = [vnum(a), vnum(b)]; return x[0] !== y[0] ? x[0] > y[0] : x[1] > y[1]; };

// 1. Version
const appV = (html.match(/var APP_VERSION = '([0-9.]+)';/) || [])[1];
const stand = DB.stand.app_version;
if (!appV) fehler.push('APP_VERSION in index.html nicht gefunden.');
else if (appV === stand) ok.push(`Video-Stand = App-Version (v${appV}).`);
else {
  const log = [...html.slice(html.indexOf('Changelog (letzte Versionen):')).matchAll(/^ {2}v([0-9]+\.[0-9]+) - (.*)$/gm)]
    .filter(m => neuer(m[1], stand)).slice(0, 25).map(m => `v${m[1]}: ${m[2].slice(0, 160)}`);
  hinweise.push(`Das Video zeigt v${stand}, die App ist v${appV}. Änderungen seitdem (im Kopf-Changelog) auf Sicht­bares prüfen:\n` + log.map(l => '    ' + l).join('\n'));
}

// 2. Kennungen
const ids = new Set(), kennungen = [];
for (const s of DB.szenen) for (const u of s.ui || []) kennungen.push([s.id, u]);
for (const [sid, u] of kennungen) {
  const name = u.slice(1), ende = name.endsWith('-');
  const pat = ende ? name : name;
  const dyn = name.replace(/[^-]*$/, ''); // Kennung wird im Code zusammengesetzt: 'v2-tip-btn-' + key
  const gefunden = u[0] === '#' ? (html.includes(pat) || (dyn && html.includes(`'${dyn}' +`))) : new RegExp(`['"\\s.]${pat.replace(/[-]/g, '\\-')}`).test(html);
  if (!gefunden) fehler.push(`Szene ${sid}: Bedienelement „${u}“ steht nicht mehr in index.html – Aufnahme würde brechen.`);
}
if (!fehler.length) ok.push(`${kennungen.length} Bedienelemente der Aufnahme sind in index.html vorhanden.`);

// 3. Beschriftungen
const extern = new Set((DB.extern || []).map(s => s.toLowerCase()));
const plain = html.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').toLowerCase();
let nBes = 0;
for (const s of DB.szenen) for (const satz of s.saetze) for (const m of satz.matchAll(/„([^“]+)“/g)) {
  const b = m[1].replace(/[.,!?]+$/, ''); nBes++;
  if (extern.has(b.toLowerCase())) continue;
  if (!plain.includes(b.toLowerCase()) && !html.toLowerCase().includes(b.toLowerCase()))
    fehler.push(`Szene ${s.id}: Beschriftung „${b}“ im Sprechtext kommt in index.html nicht vor (umbenannt?).`);
}
ok.push(`${nBes} Beschriftungen im Sprechtext geprüft.`);

// 4. Funktionsliste
const a0 = html.indexOf('id="about-panel"'), a1 = html.indexOf('</ul>', a0);
const zeilen = [...html.slice(a0, a1).matchAll(/<li>([\s\S]*?)<\/li>/g)].map(m => norm(m[1].replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&'))).filter(Boolean);
const keys = Object.keys(DB.funktionen);
const sceneIds = new Set(DB.szenen.map(s => s.id));
for (const [k, v] of Object.entries(DB.funktionen)) for (const sid of v.szenen || []) if (!sceneIds.has(sid)) fehler.push(`funktionen „${k}“: Szene ${sid} gibt es nicht.`);
const gedeckt = new Set();
for (const z of zeilen) {
  const k = keys.find(k => z.startsWith(norm(k)));
  if (!k) { hinweise.push(`NEUE Funktion in „Über Trainingspilot“, nicht im Drehbuch: „${z.slice(0, 90)}…“ – zeigen (Szene ergänzen) oder in drehbuch.json → funktionen als „bewusst nicht“ eintragen.`); continue; }
  gedeckt.add(k); const f = DB.funktionen[k];
  if (f.status === 'offen') hinweise.push(`OFFEN: „${k}“ – ${f.notiz || 'noch nicht im Video'}`);
}
for (const k of keys) if (!gedeckt.has(k)) hinweise.push(`Zeile „${k}…“ steht nicht mehr (oder anders) in „Über Trainingspilot“ – Szenen ${(DB.funktionen[k].szenen || []).join(', ') || '–'} prüfen, Eintrag anpassen/entfernen.`);
ok.push(`${zeilen.length} Zeilen der Funktionsliste mit ${keys.length} Drehbuch-Einträgen abgeglichen.`);

// Technik
if (technik) {
  const v = (cmd, args) => { const r = spawnSync(cmd, args, { encoding: 'utf8' }); return r.error ? null : (r.stdout + r.stderr).trim(); };
  const ff = v('ffmpeg', ['-version']);
  if (!ff) fehler.push('ffmpeg fehlt (Schnitt, Ton).'); else {
    ok.push(ff.split('\n')[0]);
    const filt = v('ffmpeg', ['-hide_banner', '-filters']) || '';
    for (const f of ['xfade', 'rubberband', 'loudnorm', 'adelay', 'amix']) if (!new RegExp(`\\b${f}\\b`).test(filt)) fehler.push(`ffmpeg ohne Filter „${f}“ – Schnitt/Ton nicht möglich.`);
    if (!/libx264/.test(v('ffmpeg', ['-hide_banner', '-encoders']) || '')) fehler.push('ffmpeg ohne Encoder libx264.');
  }
  if (!v('ffprobe', ['-version'])) fehler.push('ffprobe fehlt.');
  ok.push('Node ' + process.version + (parseInt(process.versions.node) < 18 ? ' (zu alt, mind. 18)' : ''));
  if (parseInt(process.versions.node) < 18) fehler.push('Node zu alt (mind. 18).');
  const py = v('python3', ['--version']); if (!py) fehler.push('python3 fehlt (Schnitt).'); else ok.push(py);
  try {
    const { chromium } = require('playwright'); const br = await chromium.launch(); ok.push('Playwright + Chromium starten (' + br.version() + ').'); await br.close();
  } catch (e) { fehler.push('Playwright/Chromium nicht startbar (Aufruf mit NODE_PATH=$(npm root -g)?): ' + String(e.message).split('\n')[0]); }
  const venv = process.env.VIDEO_PYTHON;
  if (venv) {
    const r = spawnSync(venv, ['-c', 'import faster_whisper, numpy; print("faster-whisper", faster_whisper.__version__)'], { encoding: 'utf8' });
    r.status === 0 ? ok.push('Sprach-Umgebung (VIDEO_PYTHON): ' + r.stdout.trim()) : hinweise.push('VIDEO_PYTHON ohne faster-whisper – Ausrichten/Erzeugen der Sprachspur nicht möglich.');
  } else hinweise.push('VIDEO_PYTHON nicht gesetzt – Sprach-Umgebung (faster-whisper, optional chatterbox) nicht geprüft; Einrichtung siehe tools/video/README.md.');
}

const md = [`# Video-Aktualität (Drehbuch Stand v${stand}, App v${appV})`, '',
  fehler.length ? '## Fehler (blockieren)\n' + fehler.map(f => '- ' + f).join('\n') : '## Keine Fehler',
  hinweise.length ? '\n## Hinweise (Video überarbeiten?)\n' + hinweise.map(h => '- ' + h).join('\n') : '\n## Keine Hinweise – Video ist aktuell',
  '\n## In Ordnung\n' + ok.map(o => '- ' + o).join('\n'), ''].join('\n');
console.log(md);
if (reportFile) fs.writeFileSync(reportFile, md);
process.exit(fehler.length ? 1 : 0);
