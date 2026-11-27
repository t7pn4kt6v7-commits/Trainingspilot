#!/usr/bin/env node
// Mobil-Prüfung: klickt die wichtigsten Ansichten der App auf kleinen Handys und dem iPad durch, sucht nach
// waagerechtem Scrollen, über den Rand ragenden Elementen, abgeschnittenen Beschriftungen und Skriptfehlern,
// und speichert zu jeder Ansicht ein Bildschirmfoto zum Ansehen.
//
//   NODE_PATH=$(npm root -g) node tools/mobilpruefung.mjs [--url <Adresse>] [--geraete se,mini,ipad] [--out <Ordner>]
//
// Standard: lokale index.html, alle drei Geräte, Fotos nach <tmp>/trainingspilot-mobil. Zusätzlich wird geprüft,
// ob die alte Oberfläche (UI_V2 = false) noch startet und einen Plan erstellt. Exit-Code 1, wenn etwas auffällt.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
let pw;
try { pw = require('playwright'); } catch {
  console.error('Playwright nicht gefunden. Aufruf z. B.: NODE_PATH=$(npm root -g) node tools/mobilpruefung.mjs'); process.exit(1);
}
const { chromium, devices } = pw;

const argv = process.argv.slice(2), opt = { url: null, geraete: ['se', 'mini', 'ipad'], out: path.join(os.tmpdir(), 'trainingspilot-mobil') };
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--url') opt.url = argv[++i];
  else if (argv[i] === '--geraete') opt.geraete = argv[++i].split(',');
  else if (argv[i] === '--out') opt.out = argv[++i];
  else { console.error('Unbekannte Angabe: ' + argv[i]); process.exit(1); }
}
// Ohne --url: Projektordner über einen kleinen lokalen Server ausliefern (wie GitHub Pages, damit z. B. die
// Update-Prüfung der App nicht an file:// scheitert)
let server = null;
if (!opt.url) {
  const TYP = { '.html': 'text/html; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.js': 'text/javascript', '.webmanifest': 'application/manifest+json' };
  server = http.createServer((q, r) => {
    let f = decodeURIComponent(q.url.split('?')[0].split('#')[0]); if (f.endsWith('/')) f += 'index.html';
    f = path.join(ROOT, path.normalize(f).replace(/^(\.\.[/\\])+/, ''));
    if (!fs.existsSync(f)) f = path.join(ROOT, 'pwa', path.basename(f)); // pages.yml legt pwa/* neben index.html
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'Content-Type': TYP[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
  });
  await new Promise(res => server.listen(0, '127.0.0.1', res));
  opt.url = `http://127.0.0.1:${server.address().port}/index.html`;
}
const lokal = !!server;
const iphoneUA = devices['iPhone 13 Mini'].userAgent;
const GERAETE = {
  se: { name: 'iPhone SE (320 px)', ctx: { viewport: { width: 320, height: 568 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: iphoneUA } },
  mini: { name: 'iPhone 13 mini (375 px)', ctx: devices['iPhone 13 Mini'] },
  ipad: { name: 'iPad (810 px)', ctx: devices['iPad (gen 7)'] },
};

// Prüfung im Browser: liefert eine Liste von Auffälligkeiten
function pruefe() {
  const W = document.documentElement.clientWidth, out = [], seen = new Set();
  const name = el => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '');
  const text = el => (el.innerText || el.value || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 50);
  const vis = el => { const s = getComputedStyle(el); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const ownText = el => [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) || /^(BUTTON|INPUT|SELECT|TEXTAREA)$/.test(el.tagName);
  const add = (art, el, info) => { const k = art + name(el); if (seen.has(k) || out.length >= 15) return; seen.add(k); out.push({ art, wo: name(el), info }); };
  if (document.documentElement.scrollWidth > W + 1) out.push({ art: 'waagerechtes Scrollen', wo: 'Seite', info: document.documentElement.scrollWidth + ' px breit statt ' + W + ' px' });
  for (const el of document.querySelectorAll('body *')) {
    if (!ownText(el) || !vis(el) || el.closest('[aria-hidden="true"]')) continue;
    const s = getComputedStyle(el), r = el.getBoundingClientRect();
    // 1. Text im eigenen Kasten abgeschnitten (ohne bewusstes „…“)
    if (el.scrollWidth > el.clientWidth + 2 && s.overflowX !== 'visible' && s.textOverflow !== 'ellipsis' && !/^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName)) add('Beschriftung abgeschnitten', el, text(el));
    // 2. Ragt über den sichtbaren Bereich (Bildschirm oder Kasten mit overflow:hidden); Scroll-Bereiche sind gewollt
    let L = 0, R = W, scroller = false;
    for (let p = el.parentElement; p && p !== document.documentElement; p = p.parentElement) {
      const ox = getComputedStyle(p).overflowX;
      if (ox === 'auto' || ox === 'scroll') { scroller = true; break; }
      if (ox === 'hidden' || ox === 'clip') { const pr = p.getBoundingClientRect(); L = Math.max(L, pr.left); R = Math.min(R, pr.right); }
    }
    if (!scroller && s.position !== 'fixed' && (r.right > R + 1 || r.left < L - 1)) add('ragt über den Rand / abgeschnitten', el, text(el));
  }
  return out;
}

const SCHRITTE = [
  { id: 'start', titel: 'Startseite', ganz: true, tu: async () => {} },
  { id: 'plan', titel: 'Plan erstellt', ganz: true, tu: async p => {
      await p.$$eval('.chip input', els => els.forEach(x => { if (['passspiel', 'zweikampf'].includes(x.value) && !x.checked) x.click(); }));
      await p.$eval('#generate-btn', x => x.click()); await p.waitForTimeout(1800); } },
  { id: 'uebung', titel: 'Übung geöffnet', tu: async p => {
      const s = '#phase-card-2 .v2-sum'; if (!(await p.$(s))) return 'nicht gefunden';
      await p.$eval(s, x => x.click()); await p.waitForTimeout(500);
      await p.$eval('#phase-card-2', x => x.scrollIntoView({ block: 'start' })); await p.waitForTimeout(300); } },
  { id: 'wechseln', titel: 'Übung ändern (Wechseln/Auslassen)', tu: async p => {
      const s = '#phase-card-2 .card-quick-row'; if (!(await p.$(s))) return 'nicht gefunden';
      await p.$eval(s, x => x.scrollIntoView({ block: 'center' })); await p.waitForTimeout(300); } },
  { id: 'material', titel: 'Material', tu: async p => {
      if (!(await p.$('#v2-material-btn'))) return 'nicht gefunden';
      await p.$eval('#v2-material-btn', x => { x.scrollIntoView({ block: 'start' }); x.click(); }); await p.waitForTimeout(600); } },
  { id: 'zeiten', titel: 'Zeiten anpassen', tu: async p => {
      if (!(await p.$('#v2-times-btn'))) return 'nicht gefunden';
      await p.$eval('#v2-times-btn', x => x.click()); await p.waitForTimeout(700); },
    danach: async p => { if (await p.$('#v2-times-done')) { await p.$eval('#v2-times-done', x => x.click()); await p.waitForTimeout(400); } } },
  { id: 'training', titel: 'Training gestartet', tu: async p => {
      if (!(await p.$('#quick-start-btn'))) return 'nicht gefunden';
      await p.$eval('#quick-start-btn', x => { x.scrollIntoView({ block: 'center' }); x.click(); }); await p.waitForTimeout(1200);
      await p.evaluate(() => { const w = document.getElementById('tmv2-weiter-btn'); if (w) w.scrollIntoView({ block: 'end' }); }); await p.waitForTimeout(300); } },
  { id: 'ort', titel: 'Dauer und Ort (Halle gewählt)', tu: async p => {
      await p.reload(); await p.waitForTimeout(1500);
      if (!(await p.$('#v2-ort-halle'))) return 'nicht gefunden';
      await p.$eval('#v2-ort-halle', x => { x.scrollIntoView({ block: 'center' }); x.click(); }); await p.waitForTimeout(300); } },
  { id: 'halle', titel: 'Plan in der Halle', tu: async p => {
      await p.$$eval('.chip input', els => els.forEach(x => { if (['passspiel', 'zweikampf'].includes(x.value) && !x.checked) x.click(); }));
      await p.$eval('#generate-btn', x => x.click()); await p.waitForTimeout(1800);
      await p.$eval('.v2-head', x => x.scrollIntoView({ block: 'start' })).catch(() => {}); await p.waitForTimeout(200); } },
];

fs.mkdirSync(opt.out, { recursive: true });
const br = await chromium.launch();
const bericht = []; let fehler = 0;

for (const g of opt.geraete) {
  const dev = GERAETE[g]; if (!dev) { console.error('Unbekanntes Gerät: ' + g); continue; }
  const ctx = await br.newContext({ ...dev.ctx }); const p = await ctx.newPage();
  const jsFehler = [];
  p.on('pageerror', e => jsFehler.push(e.message.split('\n')[0]));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::/.test(m.text())) jsFehler.push(m.text().slice(0, 160)); });
  p.on('response', r => { if (r.status() >= 400 && !/favicon/.test(r.url())) jsFehler.push(`Datei fehlt (${r.status()}): ${r.url().replace(/^https?:\/\/[^/]+/, '')}`); });
  await p.goto(opt.url); await p.waitForTimeout(1500);
  for (const s of SCHRITTE) {
    let hinweis;
    try { hinweis = await s.tu(p); } catch (e) { hinweis = 'Schritt fehlgeschlagen: ' + e.message.split('\n')[0]; }
    const funde = hinweis ? [{ art: 'Ansicht nicht erreichbar', wo: s.id, info: hinweis }] : await p.evaluate(pruefe);
    const foto = path.join(opt.out, `${g}-${s.id}.png`);
    await p.screenshot({ path: foto, fullPage: !!s.ganz });
    bericht.push({ geraet: dev.name, ansicht: s.titel, foto, funde }); fehler += funde.length;
    if (s.danach) await s.danach(p).catch(() => {});
  }
  if (jsFehler.length) { bericht.push({ geraet: dev.name, ansicht: 'Skriptfehler', foto: '', funde: [...new Set(jsFehler)].map(t => ({ art: 'Skriptfehler', wo: 'Konsole', info: t })) }); fehler += jsFehler.length; }
  await ctx.close();
}

// Alte Oberfläche (UI_V2 = false) muss weiter funktionieren – nur bei lokaler Prüfung
if (lokal) {
  const src = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  if (src.includes('var UI_V2 = true;')) {
    const tmp = path.join(ROOT, '.mobilpruefung-ui-v1.html');
    fs.writeFileSync(tmp, src.replace('var UI_V2 = true;', 'var UI_V2 = false;'));
    const ctx = await br.newContext({ ...GERAETE.mini.ctx }); const p = await ctx.newPage(); const jsFehler = [];
    p.on('pageerror', e => jsFehler.push(e.message.split('\n')[0]));
    await p.goto(opt.url.replace('index.html', path.basename(tmp))); await p.waitForTimeout(1500);
    let funde = [];
    try {
      await SCHRITTE[1].tu(p);
      const hatPlan = await p.evaluate(() => !!document.querySelector('#result .phase, #result [id^="phase-card"]'));
      if (!hatPlan) funde.push({ art: 'Alte Oberfläche', wo: '#result', info: 'kein Plan erstellt' });
      funde.push(...(await p.evaluate(pruefe)));
    } catch (e) { funde.push({ art: 'Alte Oberfläche', wo: 'Plan erstellen', info: e.message.split('\n')[0] }); }
    funde.push(...jsFehler.map(t => ({ art: 'Skriptfehler', wo: 'Konsole', info: t })));
    const foto = path.join(opt.out, 'ui-v1-plan.png'); await p.screenshot({ path: foto, fullPage: true });
    bericht.push({ geraet: 'iPhone 13 mini, UI_V2 = false', ansicht: 'Alte Oberfläche: Plan erstellt', foto, funde }); fehler += funde.length;
    await ctx.close(); fs.rmSync(tmp, { force: true });
  }
}
await br.close();
if (server) server.close();

for (const b of bericht) {
  console.log(`${b.funde.length ? '✗' : '✓'} ${b.geraet} · ${b.ansicht}${b.foto ? '  → ' + b.foto : ''}`);
  for (const f of b.funde) console.log(`    - ${f.art}: ${f.wo}${f.info ? ' („' + f.info + '“)' : ''}`);
}
fs.writeFileSync(path.join(opt.out, 'bericht.json'), JSON.stringify(bericht, null, 1));
console.log(fehler ? `\n${fehler} Auffälligkeit(en). Fotos und bericht.json in ${opt.out}` : `\nKeine Auffälligkeiten. Fotos in ${opt.out} – trotzdem ansehen (Überdeckungen erkennt die Prüfung nicht).`);
process.exit(fehler ? 1 : 0);
