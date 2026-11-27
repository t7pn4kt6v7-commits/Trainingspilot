// Rahmen um die App-Aufnahme (Handy, Kopfzeile, Fortschritt), Fortschrittsleisten für Grafik-Szenen und Kapitelkarten, jeweils 1080×1920 PNG.
//
//   NODE_PATH=$(npm root -g) node tools/video/rahmen.mjs [--out <Ordner>]
//
// Liest die Kapitel und Szenen aus tools/video/drehbuch.json. Ergebnis: <out>/ov_<szene>.png (Rahmen bzw. Fortschritt) und <out>/card_<kapitel>.png.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const TOOL = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2); const oi = argv.indexOf('--out');
const OUT = path.resolve(oi >= 0 ? argv[oi + 1] : path.join(os.tmpdir(), 'trainingspilot-video')); fs.mkdirSync(OUT, { recursive: true });
const DB = JSON.parse(fs.readFileSync(TOOL + '/drehbuch.json', 'utf8'));
const NK = DB.kapitel.length, PARTS = DB.kapitel.map(k => k.titel), SUBS = DB.kapitel.map(k => k.unter || '');
const FONT = `<link href="https://fonts.googleapis.com/css2?family=Anton&family=Work+Sans:wght@500;700;800&display=swap" rel="stylesheet">`;
const SX = 140, SY = 350, SW = 800, SH = 1424, BZ = 14;
const rr = (x, y, w, h, r) => `M${x + r},${y}h${w - 2 * r}a${r},${r} 0 0 1 ${r},${r}v${h - 2 * r}a${r},${r} 0 0 1 -${r},${r}h-${w - 2 * r}a${r},${r} 0 0 1 -${r},-${r}v-${h - 2 * r}a${r},${r} 0 0 1 ${r},-${r}z`;
const prog = n => `<div class=pg>${DB.kapitel.filter(k => k.nr >= 2).map(k => k.nr).map(i => `<i class="${i < n ? 'd' : i === n ? 'c' : ''}"></i>`).join('')}</div>`;
const CSS = `*{box-sizing:border-box}html,body{margin:0;width:1080px;height:1920px;background:transparent;font-family:'Work Sans';color:#fff;overflow:hidden}
 svg{position:absolute;inset:0}
 .k{position:absolute;left:0;right:0;top:92px;text-align:center;color:#F2B134;font-weight:800;font-size:29px;letter-spacing:.2em;text-transform:uppercase}
 .h{position:absolute;left:70px;right:70px;top:146px;height:170px;display:flex;align-items:center;justify-content:center;text-align:center;font-weight:800;font-size:54px;line-height:1.16}
 .pg{position:absolute;left:${SX}px;width:${SW}px;top:1834px;display:flex;gap:14px}.pg i{flex:1;height:10px;border-radius:5px;background:rgba(255,255,255,.2)}.pg i.d{background:rgba(242,177,52,.55)}.pg i.c{background:#F2B134}`;
const BG = `<defs><radialGradient id=g cx=30% cy=15% r=110%><stop offset=0 stop-color=#24402d /><stop offset=.55 stop-color=#132118 /><stop offset=1 stop-color=#0B0F0C /></radialGradient></defs>`;
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  const shot = async (html, name, transparent) => { await p.setContent(`<!doctype html>${FONT}<style>${CSS}</style>${html}`); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(150); await p.screenshot({ path: `${OUT}/${name}.png`, omitBackground: !!transparent }); };
  for (const s of DB.szenen) {
    const n = s.kapitel; if (s.rahmen === 'keiner' || n < 2) continue;
    if (s.rahmen === 'fortschritt') { await shot(prog(n), 'ov_' + s.id, true); continue; }
    const outer = rr(SX - BZ, SY - BZ, SW + 2 * BZ, SH + 2 * BZ, 62), inner = rr(SX, SY, SW, SH, 48), full = 'M0,0h1080v1920h-1080z';
    await shot(`<svg viewBox="0 0 1080 1920">${BG}<path d="${full}${inner}" fill="url(#g)" fill-rule=evenodd />
      <path d="${rr(SX - BZ - 3, SY - BZ - 3, SW + 2 * BZ + 6, SH + 2 * BZ + 6, 65)}${inner}" fill="#3d4640" fill-rule=evenodd />
      <path d="${outer}${inner}" fill="#070908" fill-rule=evenodd /></svg>
      <div class=k>Kapitel ${n} von ${NK} · ${PARTS[n - 1]}</div><div class=h>${s.caption || ''}</div>${prog(n)}`, 'ov_' + s.id, true);
  }
  for (let n = 2; n <= NK; n++) {
    await shot(`<style>body{background:radial-gradient(120% 70% at 30% 20%,#3B7050,#2E5339 50%,#16281c)}
      .ck{position:absolute;left:0;right:0;top:700px;text-align:center;color:#F2B134;font-weight:800;letter-spacing:.22em;font-size:44px}
      .ct{position:absolute;left:70px;right:70px;top:800px;text-align:center;font-weight:800;font-size:112px;line-height:1.12}
      .cs{position:absolute;left:70px;right:70px;top:${(SUBS[n - 1] || '').length > 30 ? 1210 : 1090}px;text-align:center;font-weight:700;font-size:54px;color:#E9F1E4}</style>
      <div class=ck>KAPITEL ${n} VON ${NK}</div><div class=ct>${PARTS[n - 1]}</div><div class=cs>${SUBS[n - 1]}</div>${prog(n)}`, 'card_' + n);
  }
  await b.close(); console.log('Rahmen und Karten in ' + OUT);
})();
