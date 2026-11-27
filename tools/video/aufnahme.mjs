// Aufnahme der Szenen des Erklärvideos (Playwright, eigener Screencast in voller Auflösung).
//
//   NODE_PATH=$(npm root -g) node tools/video/aufnahme.mjs [c1 c4 …] [--out <Ordner>]
//
// Liest tools/video/drehbuch.json und <out>/zeiten.json (Satzzeiten der Sprachspur, siehe stimme/), startet die App
// über einen lokalen Server und nimmt jede Szene als <out>/seg_<id>_<n>.mp4 auf (App-Szenen 800×1424, Grafik-Szenen 1080×1920).
// Jede Szene ist unten als Funktion „Choreografie“ geschrieben: Sie wartet auf Satzanfänge (clock.sentence(k)) und
// führt dazu die Bedienung vor. Ändert sich die App, die Selektoren in drehbuch.json („ui“) und hier anpassen.
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import cp from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const TOOL = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(TOOL, '..', '..');
const argv = process.argv.slice(2); let OUTARG = null; const want = [];
for (let i = 0; i < argv.length; i++) { if (argv[i] === '--out') OUTARG = argv[++i]; else want.push(argv[i]); }
const DIR = path.resolve(OUTARG || path.join(os.tmpdir(), 'trainingspilot-video')); fs.mkdirSync(DIR, { recursive: true });
const DB = JSON.parse(fs.readFileSync(TOOL + '/drehbuch.json', 'utf8'));
let ZT = {}; try { ZT = JSON.parse(fs.readFileSync(DIR + '/zeiten.json', 'utf8')); } catch { console.error('Keine zeiten.json in ' + DIR + ' – zuerst Sprachspur erzeugen bzw. ausrichten (tools/video/stimme).'); process.exit(1); }
const SC = Object.fromEntries(DB.szenen.map(s => [s.id, Object.assign({}, s, ZT[s.id] || {})]));
const STAGE_IDS = DB.szenen.filter(s => s.typ !== 'app').map(s => s.id);
// App über lokalen Server ausliefern (wie GitHub Pages)
const MIME = { '.html': 'text/html; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.js': 'text/javascript' };
const server = http.createServer((q, r) => { let f = decodeURIComponent(q.url.split('?')[0].split('#')[0]); if (f.endsWith('/')) f += 'index.html'; f = path.join(ROOT, path.normalize(f).replace(/^(\.\.[/\\])+/, '')); if (!fs.existsSync(f)) f = path.join(ROOT, 'pwa', path.basename(f)); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
await new Promise(res => server.listen(0, '127.0.0.1', res));
const APP = `http://127.0.0.1:${server.address().port}/index.html`;
const LEAD = 0.8, PAD = 0.8, CARD = 1.4;
const EXTRA = { c8: 1.6 };
const total = id => LEAD + SC[id].dauer + PAD + (EXTRA[id] || 0);
const sleep = ms => new Promise(r => setTimeout(r, ms));

const FONT = `<link href="https://fonts.googleapis.com/css2?family=Anton&family=Work+Sans:wght@500;700;800&display=swap" rel="stylesheet">`;
const OVERLAY_CSS = `
.plan-footer,.club-logo{visibility:hidden!important}
#vc{position:fixed;left:12px;right:12px;bottom:14px;z-index:2147483000;background:rgba(14,26,18,.93);color:#fff;border:1.5px solid #F2B134;border-radius:16px;padding:12px 14px;font:700 17px/1.25 'Work Sans',sans-serif;text-align:center;opacity:0;transform:translateY(10px);transition:opacity .4s,transform .4s;pointer-events:none}
#vc.on{opacity:1;transform:none}
@keyframes vrp{0%,100%{box-shadow:0 0 0 4px #F2B134,0 0 0 11px rgba(242,177,52,.3),0 0 0 100vmax rgba(8,14,10,.5)}50%{box-shadow:0 0 0 4px #F2B134,0 0 0 20px rgba(242,177,52,.07),0 0 0 100vmax rgba(8,14,10,.5)}}
#vf{position:fixed;left:0;top:0;width:46px;height:46px;margin:-23px 0 0 -23px;border-radius:50%;background:rgba(255,255,255,.55);border:3px solid #fff;box-shadow:0 2px 10px rgba(0,0,0,.45);z-index:2147483001;pointer-events:none;transition:transform .6s cubic-bezier(.3,.7,.2,1),opacity .3s;opacity:0}
#vf.tap{animation:vtap .4s}
@keyframes vtap{50%{transform:var(--t) scale(.72)}}
#vd{position:fixed;z-index:2147482999;background:#fff;color:#1c241e;border-radius:14px;box-shadow:0 14px 34px rgba(0,0,0,.5);font:600 15px 'Work Sans',sans-serif;overflow:hidden;opacity:0;transform:translateY(-6px);transition:all .35s}
#vd.on{opacity:1;transform:none}
#vd .g{background:#f1f4ee;color:#5f6b61;font:700 11px 'Work Sans';letter-spacing:.1em;padding:7px 14px;text-transform:uppercase}
#vd .o{padding:10px 14px;border-top:1px solid #eef0ec}
#vd .o.sel{background:#dff3e2;color:#1d5c2c}
`;

async function newCtx(browser, name, opt = {}) {
  const dir = DIR + '/raw/' + name; fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const emu = opt.stage ? { w: 400, h: 711, scale: 2.7, vw: 1080, vh: 1920 } : { w: 400, h: 712, scale: 2, vw: 800, vh: 1424 };
  const ctx = await browser.newContext({ viewport: { width: emu.vw, height: emu.vh }, deviceScaleFactor: 1, hasTouch: true });
  ctx._emu = emu;
  await ctx.addInitScript(() => { navigator.share = async o => { window.__sh = o; }; });
  return { ctx, dir };
}

// Eigene Aufnahme: Chromium-Screencast in voller Gerätepixel-Größe (800x1424). Playwrights recordVideo setzt die
// Seite bei deviceScaleFactor 2 nur als Viertel oben links in ein graues Bild.
async function attachRec(p, dir) {
  const cdp = await p.context().newCDPSession(p); const frames = []; const fdir = dir + '/frames_' + Math.random().toString(36).slice(2, 7);
  fs.mkdirSync(fdir, { recursive: true }); let n = 0;
  cdp.on('Page.screencastFrame', async e => { const t = Date.now(); fs.writeFileSync(`${fdir}/${String(n).padStart(5, '0')}.jpg`, Buffer.from(e.data, 'base64')); frames.push({ t, f: `${fdir}/${String(n).padStart(5, '0')}.jpg` }); n++; await cdp.send('Page.screencastFrameAck', { sessionId: e.sessionId }).catch(() => {}); });
  const emu = p.context()._emu;
  // Scharfe Aufnahme: Seite 400 px breit rechnen, aber vergrößert in ein großes Fenster zeichnen
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: emu.w, height: emu.h, deviceScaleFactor: 1, mobile: true, scale: emu.scale });
  await cdp.send('Emulation.setVisibleSize', { width: emu.vw, height: emu.vh });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: 1200, maxHeight: 2200, everyNthFrame: 1 });
  p._born = Date.now(); p._ev = []; const orig = p.close.bind(p);
  p.close = async () => {
    const end = Date.now(); await cdp.send('Page.stopScreencast').catch(() => {}); await sleep(200);
    let list = ''; frames.forEach((fr, i) => { const nxt = i + 1 < frames.length ? frames[i + 1].t : end; list += `file '${fr.f}'\nduration ${Math.max(0.02, (nxt - fr.t) / 1000).toFixed(3)}\n`; });
    list += `file '${frames[frames.length - 1].f}'\n`;
    fs.writeFileSync(fdir + '/list.txt', list);
    // Startzeit des ersten Frames relativ zu _born
    p._firstFrameDelay = (frames[0].t - p._born) / 1000;
    p._mp4 = fdir + '/rec.mp4';
    cp.execSync(`ffmpeg -y -v error -f concat -safe 0 -i ${fdir}/list.txt -vf "fps=30,format=yuv420p" -c:v libx264 -crf 12 -preset veryfast ${p._mp4}`);
    return orig();
  };
  return p;
}
const mkPage = async (ctx, dir) => attachRec(await ctx.newPage(), dir);

const addOverlay = async p => {
  await p.addStyleTag({ content: OVERLAY_CSS });
  await p.evaluate(() => { for (const id of ['vc', 'vf', 'vd']) { const d = document.createElement('div'); d.id = id; document.body.appendChild(d); } });
};
const caption = async () => {}; // Beschriftung steht im Rahmen um das Handy, nicht mehr über der App
async function tap(p, sel, opt = {}) {
  const el = typeof sel === 'string' ? p.locator(sel).first() : sel;
  const h = await el.elementHandle({ timeout: 5000 }); if (!h) return;
  const rect = () => h.evaluate(e => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; });
  let box = await rect();
  if (box.y < 70 || box.y + box.height > 712 - 70) { const y = await p.evaluate(b => scrollY + b.y - 300, box); await scrollTo(p, y); await sleep(250); box = await rect(); }
  const x = box.x + (opt.dx != null ? opt.dx : box.width / 2), y = box.y + (opt.dy != null ? opt.dy : Math.min(box.height / 2, 40));
  await p.evaluate(b => { let r = document.getElementById('vr'); if (!r) { r = document.createElement('div'); r.id = 'vr'; document.body.appendChild(r); } r.style.cssText = `position:fixed;left:${b.x - 5}px;top:${b.y - 5}px;width:${b.width + 10}px;height:${b.height + 10}px;border-radius:14px;box-shadow:0 0 0 4px #F2B134,0 0 0 11px rgba(242,177,52,.3),0 0 0 100vmax rgba(8,14,10,.5);animation:vrp 1s ease-in-out infinite;z-index:2147482998;pointer-events:none;opacity:0;transition:opacity .3s`; requestAnimationFrame(() => { r.style.opacity = 1; }); }, box);
  await p.evaluate(([x, y]) => { const f = document.getElementById('vf'); clearTimeout(window.__vfT); f.style.opacity = 1; f.style.setProperty('--t', `translate(${x}px,${y}px)`); f.style.transform = `translate(${x}px,${y}px)`; }, [x, y]);
  if (p._ev) p._ev.push({ t: Date.now() + (opt.wait || 550), x, y });
  await sleep(opt.wait || 550);
  await p.evaluate(() => { const f = document.getElementById('vf'); f.classList.remove('tap'); void f.offsetWidth; f.classList.add('tap'); });
  if (!opt.noClick) await h.evaluate(e => e.click());
  await sleep(250); await p.evaluate(() => { const r = document.getElementById('vr'); if (r) r.style.opacity = 0; window.__vfT = setTimeout(() => { document.getElementById('vf').style.opacity = 0; }, 900); });
  await sleep(Math.max(100, (opt.after || 500) - 250));
}
const scrollTo = async (p, y) => { await p.evaluate(y => new Promise(res => { const vf = document.getElementById('vf'); if (vf) vf.style.opacity = 0; const y0 = scrollY, max = document.documentElement.scrollHeight - innerHeight, y1 = Math.max(0, Math.min(max, y)), d = Math.min(1200, Math.max(500, Math.abs(y1 - y0) * 1.1)), t0 = performance.now(); const st = t => { const k = Math.min(1, (t - t0) / d), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; scrollTo(0, y0 + (y1 - y0) * e); k < 1 ? requestAnimationFrame(st) : res(); }; requestAnimationFrame(st); }), y); };
const scrollToEl = async (p, sel, off = 20) => { const y = await p.evaluate(([s, o]) => { const e = document.querySelector(s); return e ? e.getBoundingClientRect().top + scrollY - o : 0; }, [sel, off]); await scrollTo(p, y); };
const jc = (p, sel) => p.$eval(sel, e => e.click());
const hideFinger = p => p.evaluate(() => { document.getElementById('vf').style.opacity = 0; });
async function freshApp(p, chips = []) {
  await p.goto(APP); await p.waitForTimeout(1300);
  await p.$$eval('.chip input', (els, chips) => els.forEach(x => { if (chips.includes(x.value) && !x.checked) x.click(); }), chips);
}
async function makePlan(p, chips = ['passspiel', 'zweikampf']) { await freshApp(p, chips); await p.$eval('#generate-btn', x => x.click()); await p.waitForTimeout(1800); }
// Zeitgeber: Szene beginnt bei Marke t0; Satz k beginnt LEAD + starts[k] danach
function clock(id) { const t0 = Date.now(); return { t0, T: () => (Date.now() - t0) / 1000, until: async s => { while ((Date.now() - t0) / 1000 < s) await sleep(80); }, sentence: async k => { while ((Date.now() - t0) / 1000 < LEAD + SC[id].starts[k]) await sleep(80); }, end: async () => { while ((Date.now() - t0) / 1000 < total(id)) await sleep(80); } }; }
async function fauxSelect(p, selector, chosenIdx) {
  await p.evaluate(([sel, ci]) => {
    const s = document.querySelector(sel); const r = s.getBoundingClientRect(); const d = document.getElementById('vd');
    let html = ''; let n = 0;
    [...s.children].forEach(ch => {
      if (ch.tagName === 'OPTGROUP') { if (n > 7) return; html += '<div class="g">' + ch.label + '</div>'; [...ch.children].slice(0, 4).forEach(o => { html += '<div class="o' + (n === ci ? ' sel' : '') + '" data-i="' + n + '">' + o.textContent.replace(/\s*🆕|\s*👥/g, '') + '</div>'; n++; }); }
    });
    d.innerHTML = html; d.style.left = r.left + 'px'; d.style.width = Math.max(r.width, 262) + 'px';
    d.style.top = (r.bottom + 6) + 'px'; d.style.maxHeight = (innerHeight - r.bottom - 22) + 'px'; d.classList.add('on');
  }, [selector, chosenIdx]);
}
const hideFaux = p => p.evaluate(() => document.getElementById('vd').classList.remove('on'));
const selectFaux = (p, i) => p.evaluate(i => { document.querySelectorAll('#vd .o').forEach(o => o.classList.toggle('sel', +o.dataset.i === i)); }, i);

const CARD_HTML = (num, titel) => `<!doctype html><meta name=viewport content="width=device-width,initial-scale=1">${FONT}<style>
 body{margin:0;height:100vh;background:radial-gradient(120% 70% at 30% 20%,#3B7050,#2E5339 50%,#16281c);color:#fff;font-family:'Work Sans';display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}
 .n{width:78px;height:78px;border-radius:50%;background:#F2B134;color:#1B2A1F;font:400 44px Anton;display:flex;align-items:center;justify-content:center;margin-bottom:22px}
 .t{font:800 30px/1.2 'Work Sans';padding:0 30px}</style><div class=n>${num}</div><div class=t>${titel}</div>`;

const scenes = {
  async c1(b) { // Willkommen
    const { ctx, dir } = await newCtx(b, 'c1', { stage: true }); const p = await mkPage(ctx, dir);
    const st = SC.c1.starts;
    await p.setContent(`<!doctype html><meta name=viewport content="width=device-width,initial-scale=1">${FONT}<style>
      body{margin:0;height:100vh;background:radial-gradient(120% 70% at 30% 20%,#3B7050,#2E5339 50%,#16281c);display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:'Work Sans';color:#fff;text-align:center;overflow:hidden}
      .l{position:absolute;inset:0;opacity:.14}.t{font:400 58px/1 Anton;letter-spacing:.02em;text-transform:uppercase;opacity:0;transform:translateY(14px)}
      .k{color:#F2B134;font-weight:700;letter-spacing:.2em;font-size:14px;margin-bottom:14px;opacity:0}.s{font-weight:700;font-size:21px;margin-top:18px;padding:0 30px;line-height:1.3;opacity:0}
      .c{display:flex;gap:8px;margin-top:26px;flex-wrap:wrap;justify-content:center;padding:0 24px;opacity:0}.c span{border:1.5px solid rgba(255,255,255,.3);background:rgba(255,255,255,.1);border-radius:999px;padding:8px 14px;font-weight:700;font-size:14px}.c .o{background:#E8622C;border-color:#E8622C}
      .d{margin-top:26px;opacity:0;font-weight:700;font-size:15px;color:#E9F1E4;border-top:1.5px solid rgba(242,177,52,.6);padding-top:16px;margin-inline:30px;line-height:1.4}.d b{color:#F2B134}
      .ch{position:absolute;left:34px;right:34px;top:470px;opacity:0;font-weight:700;font-size:17px;line-height:1.2;transition:opacity .9s}.ch div{display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.16)}.ch b{width:26px;height:26px;border-radius:50%;background:#F2B134;color:#1B2A1F;font:400 16px/26px Anton;text-align:center;flex:0 0 26px}
      .on{opacity:1!important;transform:none!important;transition:all .9s}</style>
      <svg class=l viewBox="0 0 400 712" fill=none stroke=#fff stroke-width=3 preserveAspectRatio=xMidYMid slice><circle cx=200 cy=356 r=110 /><line x1=0 y1=356 x2=400 y2=356 /><rect x=110 y=0 width=180 height=90 /><rect x=110 y=622 width=180 height=90 /></svg>
      <div class=k id=k>JUGENDFUSSBALL</div><div class=t id=t>Trainingspilot</div><div class=s id=s>Dein Trainingsplan in Sekunden</div><div class=c id=c><span class=o>Übungen in 3D</span><span>Signal im Training</span><span>Ohne Anmeldung</span></div><div class=d id=d>Orientiert an den Grundsätzen des <b>DFB</b><br>und den Vorgaben des <b>Niedersächsischen Fußballverbands</b></div>
      <div class=ch id=ch><div><b>1</b>Willkommen</div><div><b>2</b>App einrichten</div><div><b>3</b>Plan erstellen</div><div><b>4</b>Plan ansehen und anpassen</div><div><b>5</b>Plan teilen</div><div><b>6</b>Im Training</div></div>`);
    await p.evaluate(() => document.fonts.ready); const c = clock('c1');
    const on = id => p.evaluate(id => document.getElementById(id).classList.add('on'), id);
    await c.until(0.3); await on('k'); await on('t'); await c.sentence(1); await on('s'); await sleep(900); await on('c'); await c.sentence(2); await on('d'); await c.sentence(3);
    await p.evaluate(() => { for (const id of ['s', 'c', 'd']) document.getElementById(id).style.opacity = 0; document.getElementById('t').style.transform = 'translateY(-70px)'; document.getElementById('k').style.transform = 'translateY(-70px)'; document.getElementById('ch').style.opacity = 1; });
    await c.end(); await p.close(); await ctx.close();
    return seg(dir, p, c, 0);
  },

  async c2(b) { // App einrichten – iPhone (Grafik)
    const { ctx, dir } = await newCtx(b, 'c2', { stage: true }); const p = await mkPage(ctx, dir);
    await p.setContent(phoneHtml('ios')); await addOverlay(p);
    await p.evaluate(() => document.fonts.ready); const c = clock('c2');
    const st = n => p.evaluate(n => window.step(n), n);
    await c.until(0.3); await caption(p, SC.c2.caption); await st(0);
    await c.sentence(1); await st(1); await c.sentence(2); await st(2); await c.sentence(3); await st(3); await c.sentence(4); await st(4);
    await c.end(); await p.close(); await ctx.close();
    return seg(dir, p, c, 0);
  },

  async c3(b) { // App einrichten – Android (Grafik)
    const { ctx, dir } = await newCtx(b, 'c3', { stage: true }); const p = await mkPage(ctx, dir);
    await p.setContent(phoneHtml('android')); await addOverlay(p);
    await p.evaluate(() => document.fonts.ready); const c = clock('c3');
    const st = n => p.evaluate(n => window.step(n), n);
    await c.until(0.3); await caption(p, SC.c3.caption); await st(0);
    await c.sentence(1); await st(1); await c.sentence(2); await st(2); await c.sentence(3); await st(3); await c.sentence(4);
    await c.end(); await p.close(); await ctx.close();
    return seg(dir, p, c, 0);
  },

  async c4(b) { // Mannschaft und Zahlen
    const { ctx, dir } = await newCtx(b, 'c4'); const p = await mkPage(ctx, dir);
    await freshApp(p, []); await addOverlay(p);
    await scrollToEl(p, '#altersklasse', 150); await sleep(900);
    const c = clock('c4'); const mark = Date.now();
    await c.until(0.3); await caption(p, SC.c4.caption);
    await c.sentence(0); await tap(p, '#altersklasse', { after: 300 });
    await p.selectOption('#altersklasse', 'U6 (G-Jugend)'); await sleep(900);
    await c.sentence(1);
    await tap(p, '#dauer', { noClick: true, wait: 600, after: 600 });
    await p.selectOption('#altersklasse', 'U12 (D-Jugend)'); await sleep(1500);
    await p.selectOption('#altersklasse', 'U8 (F-Jugend)'); await sleep(700);
    await c.sentence(2);
    const plus = id => p.locator(id).locator('xpath=following-sibling::button').first();
    const minus = id => p.locator(id).locator('xpath=preceding-sibling::button').first();
    await tap(p, plus('#kinder')); await tap(p, plus('#kinder'), { wait: 450 }); await tap(p, minus('#trainer'));
    await c.sentence(3);
    await sleep(2200); await tap(p, '#v2-tip-btn-kinder', { after: 900 }); await sleep(1300);
    await tap(p, '#v2-tip-btn-trainer', { after: 900 });
    await c.end(); await p.close(); await ctx.close();
    return seg(dir, p, null, 0, mark);
  },

  async c5(b) { // Schwerpunkte und Plan erstellen
    const { ctx, dir } = await newCtx(b, 'c5'); const p = await mkPage(ctx, dir);
    await freshApp(p, []); await addOverlay(p);
    await scrollToEl(p, '#chips-list', 200); await sleep(900);
    const mark = Date.now(); const c = clock('c5');
    await c.until(0.3); await caption(p, SC.c5.caption);
    await c.sentence(0);
    await tap(p, '.chip:has(input[value="passspiel"])'); await tap(p, '.chip:has(input[value="zweikampf"])');
    await c.sentence(1);
    await scrollToEl(p, '#generate-btn', 300); await sleep(700);
    await tap(p, '#generate-btn', { after: 300 });
    await c.end(); await p.close(); await ctx.close();
    return seg(dir, p, null, 0, mark);
  },

  async c6(b) { // Plan ansehen
    const { ctx, dir } = await newCtx(b, 'c6'); const p = await mkPage(ctx, dir);
    await makePlan(p); await addOverlay(p); await scrollToEl(p, '.v2-head', 14); await sleep(700);
    const mark = Date.now(); const c = clock('c6');
    await c.until(0.3); await caption(p, SC.c6.caption);
    await c.sentence(0); await scrollToEl(p, '.v2-list', 60);
    await c.sentence(1); await tap(p, '#phase-card-2 .v2-sum', { after: 700 });
    await sleep(1100); await scrollToEl(p, '#phase-card-2 .diagram-wrap', 110); await sleep(2200); await hideFinger(p); await scrollToEl(p, '#phase-card-2 .ex-steps', 140);
    await c.sentence(2); await scrollToEl(p, '.v2-head', 14); await sleep(1100);
    await tap(p, '#v3-dfb-btn', { after: 600 });
    await c.end(); await p.close(); await ctx.close();
    return seg(dir, p, null, 0, mark);
  },

  async c7(b) { // Übung wechseln
    const { ctx, dir } = await newCtx(b, 'c7'); const p = await mkPage(ctx, dir);
    await makePlan(p); await addOverlay(p);
    await jc(p, '#phase-card-3 .v2-sum'); await sleep(400);
    await scrollToEl(p, '#phase-card-3 .card-quick-row', 190); await sleep(900);
    const mark = Date.now(); const c = clock('c7');
    await c.until(0.3); await caption(p, SC.c7.caption);
    await c.sentence(0);
    await tap(p, '#phase-card-3 .ex-select', { dx: 40, noClick: true, after: 300 });
    await fauxSelect(p, '#phase-card-3 .ex-select', 99); await sleep(1500);
    await selectFaux(p, 1); await sleep(900);
    const cur = await p.$eval('#phase-card-3 .v2-sum-title', t => t.firstChild.textContent.trim());
    const opt = await p.$eval('#phase-card-3 .ex-select', (s, cur) => [...s.options].find(o => o.value && o.value !== cur && o.dataset.category === s.options[1].dataset.category).value, cur);
    await hideFaux(p); await p.selectOption('#phase-card-3 .ex-select', opt); await sleep(1300);
    await c.sentence(1);
    await scrollToEl(p, '#phase-card-3 .card-quick-row', 300); await sleep(500);
    await tap(p, '#phase-card-3 .v2-skip-btn', { after: 1500 });
    await c.end(); await p.close(); await ctx.close();
    return seg(dir, p, null, 0, mark);
  },

  async c8(b) { // Material, Zeiten, Speichern
    const { ctx, dir } = await newCtx(b, 'c8'); const p = await mkPage(ctx, dir);
    await makePlan(p); await addOverlay(p); await scrollToEl(p, '.v2-head', 14); await sleep(700);
    const mark = Date.now(); const c = clock('c8');
    await c.until(0.3);
    await c.sentence(0); await tap(p, '#v2-material-btn', { wait: 500, after: 400 }); await scrollToEl(p, '#materials-grid', 260); await sleep(500);
    await tap(p, '#materials-grid .material-item >> nth=0', { wait: 450, after: 400 }); await tap(p, '#materials-grid .material-item >> nth=1', { wait: 450, after: 400 });
    await c.sentence(1); await scrollToEl(p, '#v2-times-btn', 420); await sleep(500);
    await tap(p, '#v2-times-btn', { wait: 600, after: 1200 }); await hideFinger(p);
    await sleep(1500); await tap(p, '#v2-times-done', { wait: 700, after: 600 });
    await c.sentence(2); await scrollToEl(p, '.v2-head', 14); await sleep(600);
    await tap(p, '#v2-save-quick-btn', { wait: 600, after: 900 });
    await sleep(900); await tap(p, '#save-plan-confirm-btn', { wait: 600, after: 700 });
    await c.end(); await p.close(); await ctx.close();
    return seg(dir, p, null, 0, mark);
  },

  async c9(b) { // Teilen und abstimmen
    const A = await newCtx(b, 'c9');
    const a1 = await mkPage(A.ctx, A.dir); await makePlan(a1);
    await jc(a1, '#v2-save-quick-btn'); await sleep(300); await jc(a1, '#save-plan-confirm-btn'); await sleep(1600);
    await a1.evaluate(() => { window.__sh = null; }); await addOverlay(a1); await scrollToEl(a1, '.v2-head', 14); await sleep(500);
    const mark1 = Date.now(); const c = clock('c9');
    await c.until(0.3); await caption(a1, SC.c9.caption);
    await c.sentence(0); await tap(a1, '#v3-share-btn', { after: 200 });
    const url1 = await a1.evaluate(() => window.__sh && window.__sh.url);
    await a1.evaluate(() => { const b = document.createElement('div'); b.style.cssText = 'position:fixed;right:14px;top:130px;z-index:2147482990;background:#005c4b;color:#e9edef;border-radius:12px 12px 2px 12px;padding:10px 14px;font:600 15px/1.3 sans-serif;box-shadow:0 6px 20px rgba(0,0,0,.4);opacity:0;transform:translateY(18px);transition:all .6s;max-width:230px'; b.innerHTML = 'Trainingsplan für Donnerstag<br><span style="color:#53bdeb;font-weight:400;font-size:13px">…/plan.html#p=dNcu…</span><div style="text-align:right;font-size:11px;color:#aebac1;margin-top:3px">12:41 ✓✓</div>'; document.body.appendChild(b); setTimeout(() => { b.style.opacity = 1; b.style.transform = 'none'; }, 50); });
    await c.sentence(1);
    // Mittrainer ändert und schickt zurück (nicht aufgenommen)
    const Bc = await b.newContext({ viewport: { width: 400, height: 712 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await Bc.addInitScript(() => { navigator.share = async o => { window.__sh = o; }; });
    const bb = await Bc.newPage(); await bb.goto(url1); await sleep(2800);
    const titles = await bb.$$eval('.v2-list .v2-sum-title', x => x.map(t => t.firstChild.textContent.trim()));
    await bb.click('#phase-card-3 .v2-sum'); await sleep(200);
    const opt = await bb.$eval('#phase-card-3 .ex-select', (s, cur) => [...s.options].find(o => o.value && o.value !== cur && o.dataset.category === s.options[1].dataset.category).value, titles[2]);
    await bb.selectOption('#phase-card-3 .ex-select', opt); await sleep(1500);
    await bb.click('#phase-card-4 .v2-sum'); await sleep(200); await bb.click('#phase-card-4 .v2-skip-btn'); await sleep(900);
    await bb.evaluate(() => { window.__sh = null; }); await bb.click('#vote-pending-btn'); await sleep(1000);
    const url2 = await bb.evaluate(() => window.__sh && window.__sh.url); await Bc.close();
    const split1 = LEAD + SC.c9.starts[2];
    const rest = total('c9') - split1;
    await a1.close();
    const a2 = await mkPage(A.ctx, A.dir); await a2.goto(url2); await sleep(3000); await addOverlay(a2);
    await a2.evaluate(() => { const e = document.getElementById('incoming-plan-banner'); if (e) e.scrollIntoView({ block: 'start' }); }); await sleep(600);
    const mark2 = Date.now(); const t1 = () => (Date.now() - mark2) / 1000;
    await caption(a2, SC.c9.caption); await sleep(1900);
    await tap(a2, '.rev-item >> nth=0 >> [data-dec="yes"]', { wait: 600, after: 600 }); await tap(a2, '.rev-item >> nth=1 >> [data-dec="no"]', { wait: 600, after: 600 });
    while (t1() < rest) await sleep(80);
    await a2.close(); await A.ctx.close();
    return [{ file: a1._mp4, start: (mark1 - a1._born) / 1000, dur: split1 + 0.35, ev: a1._ev, born: a1._born }, { file: a2._mp4, start: (mark2 - a2._born) / 1000, dur: rest, ev: a2._ev, born: a2._born }];
  },

  async c10(b) { // Training starten
    const { ctx, dir } = await newCtx(b, 'c10'); const p = await mkPage(ctx, dir);
    await makePlan(p); await addOverlay(p); await scrollToEl(p, '.v2-head', 14); await sleep(600);
    const mark = Date.now(); const c = clock('c10');
    await c.until(0.3); await caption(p, SC.c10.caption);
    await c.sentence(0); await tap(p, '#quick-start-btn', { after: 1500 }); await hideFinger(p);
    await c.sentence(1); await sleep(700); await scrollToEl(p, '#tmv2-setup', 260);
    await c.sentence(2); await scrollTo(p, 0); await sleep(1000); await tap(p, '#tmv2-weiter-btn', { after: 1500 });
    await c.end(); await p.close(); await ctx.close();
    return seg(dir, p, null, 0, mark);
  },

  async c11(b) { // Handy sperren (Grafik)
    const { ctx, dir } = await newCtx(b, 'c11', { stage: true }); const p = await mkPage(ctx, dir);
    await p.setContent(`<!doctype html><meta name=viewport content="width=device-width,initial-scale=1">${FONT}<style>
      body{margin:0;height:100vh;background:#0B0F0C;font-family:'Work Sans';color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden}
      h2{font-weight:800;font-size:24px;text-align:center;margin:0 20px 26px;line-height:1.25}h2 small{display:block;font-weight:800;font-size:11px;color:#F2B134;letter-spacing:.2em;margin-bottom:12px}
      .ph{width:190px;height:330px;border-radius:30px;border:4px solid #fff;background:linear-gradient(#244330,#16281c);position:relative;box-shadow:0 14px 40px rgba(0,0,0,.6)}
      .lock{position:absolute;top:26px;left:50%;transform:translateX(-50%);font-size:34px}.time{position:absolute;top:80px;width:100%;text-align:center;font-weight:800;font-size:44px}
      .n{position:absolute;left:12px;right:12px;top:170px;background:rgba(255,255,255,.16);border-radius:14px;padding:10px 12px;font-size:13px;line-height:1.3;transform:translateY(40px);opacity:0;transition:all .6s}
      .n b{display:block;font-size:14px}.bell{display:inline-block;font-size:15px;margin-right:5px}
      .on.n{opacity:1;transform:none}.on .bell{animation:ring 1.2s .5s 2}
      @keyframes ring{0%{transform:rotate(0)}20%{transform:rotate(-18deg)}40%{transform:rotate(18deg)}60%{transform:rotate(-12deg)}80%{transform:rotate(8deg)}100%{transform:rotate(0)}}</style>
      <h2><small>KAPITEL 6 VON 6 · IM TRAINING</small>Handy sperren und einstecken</h2><div class=ph><div class=lock>🔒</div><div class=time>12:10</div><div class=n id=n><b><span class=bell>🔔</span>Trainingspilot</b>Übung 3 ist gleich vorbei – nächste: Zupass-Kreis</div></div>`);
    await p.evaluate(() => document.fonts.ready); await p.addStyleTag({ content: OVERLAY_CSS }); await p.evaluate(() => { const d = document.createElement('div'); d.id = 'vc'; document.body.appendChild(d); });
    const c = clock('c11'); await c.until(0.4); await caption(p, SC.c11.caption);
    await c.sentence(1); await p.evaluate(() => { document.getElementById('n').classList.add('on'); });
    await c.end(); await p.close(); await ctx.close();
    return seg(dir, p, c, 0);
  },

  async c12(b) { // Abschluss
    const { ctx, dir } = await newCtx(b, 'c12', { stage: true }); const p = await mkPage(ctx, dir);
    await p.setContent(`<!doctype html><meta name=viewport content="width=device-width,initial-scale=1">${FONT}<style>
      body{margin:0;height:100vh;background:radial-gradient(120% 70% at 30% 20%,#3B7050,#2E5339 50%,#16281c);display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:'Work Sans';color:#fff;text-align:center;overflow:hidden}
      .t{font:400 46px/1 Anton;text-transform:uppercase;margin-bottom:28px}ul{list-style:none;padding:0;margin:0 0 30px;font-weight:700;font-size:22px;line-height:2}
      li,.h{opacity:0;transform:translateY(10px);transition:all .7s}.on{opacity:1!important;transform:none!important}
      .h{display:flex;flex-direction:column;align-items:center;gap:8px}.ic{width:74px;height:74px;border-radius:18px;background:#E8622C;display:flex;align-items:center;justify-content:center;font:400 40px Anton;box-shadow:0 8px 20px rgba(0,0,0,.4)}.h span{font-weight:700;font-size:14px;color:#C9D7C4}</style>
      <div class=t>Trainingspilot</div><ul><li id=l1>✓ Kostenlos</li><li id=l2>✓ Ohne Anmeldung</li><li id=l3>✓ Als App auf dem Handy</li></ul><div class=h id=h><div class=ic>T</div><span>Auf dem Home-Bildschirm</span></div>`);
    await p.evaluate(() => document.fonts.ready); const c = clock('c12'); const on = id => p.evaluate(id => document.getElementById(id).classList.add('on'), id);
    await c.sentence(0); await on('l1'); await sleep(1400); await on('l2'); await c.sentence(1); await on('l3'); await on('h'); await c.end();
    await p.close(); await ctx.close();
    return seg(dir, p, c, 0);
  }
};

// Segment (Video-Datei, Startversatz, Dauer)
function seg(dir, page, _c, _x, mark) {
  const f = null; const id = path.basename(dir);
  if (!mark && _c && _c.t0) mark = _c.t0;
  const start = mark ? (mark - page._born) / 1000 : 0.25;
  return [{ file: page._mp4, start, dur: total(id), ev: page._ev, born: page._born }];
}

function phoneHtml(kind) {
  const ios = kind === 'ios';
  const labels = ios ? ['In Safari öffnen', 'Teilen-Symbol antippen', '„Zum Home-Bildschirm“ wählen', '„Hinzufügen“ bestätigen', 'Ohne App-Symbol löscht Safari Pläne nach 7 Tagen'] : ['In Chrome öffnen', 'Drei Punkte antippen', '„App installieren“ wählen', 'Installieren bestätigen'];
  return `<!doctype html><meta name=viewport content="width=device-width,initial-scale=1">${FONT}<style>
  *{box-sizing:border-box}body{margin:0;height:100vh;background:#0B0F0C;font-family:'Work Sans';color:#fff;overflow:hidden;display:flex;flex-direction:column;align-items:center}
  .lab{margin-top:56px;height:64px;font-weight:800;font-size:22px;text-align:center;padding:0 22px;line-height:1.25}.lab small{display:block;font-weight:700;font-size:13px;color:#F2B134;letter-spacing:.12em;margin-bottom:4px}
  .ph{margin-top:14px;width:236px;height:440px;border-radius:34px;border:5px solid #fff;background:#fff;position:relative;overflow:hidden;box-shadow:0 14px 40px rgba(0,0,0,.6)}
  .page{position:absolute;inset:0;background:linear-gradient(#2E5339,#16281c);color:#fff;text-align:center}.page h3{margin:70px 0 6px;font:400 30px Anton;text-transform:uppercase}.page p{font-size:11px;margin:0;color:#C9D7C4}
  .bar{position:absolute;left:0;right:0;bottom:0;height:70px;background:rgba(248,248,250,.97);border-top:1px solid #d8d8dc;display:flex;align-items:flex-start;justify-content:space-around;padding-top:12px;color:#1b6ef3;font-size:22px}
  .bar span{position:relative;padding:4px 8px;border-radius:10px;transition:all .3s}.bar span.hl{background:rgba(242,177,52,.45);box-shadow:0 0 0 3px #F2B134;transform:scale(1.15)}
  .addr{position:absolute;left:14px;right:14px;top:24px;height:30px;background:#eef0f3;border-radius:10px;color:#444;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;transition:all .3s}.addr.hl{box-shadow:0 0 0 3px #F2B134}
  .sheet{position:absolute;left:0;right:0;bottom:0;background:#f2f2f6;border-radius:18px 18px 0 0;color:#111;padding:10px 12px 16px;transform:translateY(105%);transition:transform .5s;font-size:12px;font-weight:600}
  .sheet .r{background:#fff;border-radius:10px;padding:9px 10px;margin-bottom:6px;display:flex;justify-content:space-between;transition:all .3s}.sheet .r.hl{box-shadow:0 0 0 3px #F2B134;background:#fff8e6}
  .sheet.on{transform:none}
  .dlg{position:absolute;left:10px;right:10px;top:70px;background:#fff;border-radius:16px;color:#111;padding:12px;font-size:12px;font-weight:600;opacity:0;transform:scale(.92);transition:all .4s;box-shadow:0 10px 30px rgba(0,0,0,.35)}.dlg.on{opacity:1;transform:none}
  .dlg .ic{width:46px;height:46px;border-radius:11px;background:#E8622C;color:#fff;font:400 26px Anton;display:flex;align-items:center;justify-content:center;margin:6px auto}.dlg .b{display:flex;justify-content:space-between;margin-top:8px;color:#1b6ef3;font-weight:700}.dlg .b .hl{box-shadow:0 0 0 3px #F2B134;padding:2px 8px;border-radius:8px}
  .home{position:absolute;inset:0;background:linear-gradient(160deg,#3b5a8a,#1d2f55);opacity:0;transition:opacity .6s;padding:50px 16px;display:grid;grid-template-columns:repeat(4,1fr);gap:14px;align-content:start}.home.on{opacity:1}
  .home i{display:block;width:100%;aspect-ratio:1;border-radius:12px;background:rgba(255,255,255,.25)}.home i.app{background:#E8622C;color:#fff;font:400 24px/1 Anton;display:flex;align-items:center;justify-content:center;animation:pulse 1s 3}.home em{grid-column:1/-1;font-style:normal;font-size:11px;text-align:center;color:#fff;margin-top:6px;font-weight:700}
  @keyframes pulse{50%{transform:scale(1.18)}}
  [class~=hl]{animation:hlp 1s ease-in-out infinite}@keyframes hlp{50%{box-shadow:0 0 0 3px #F2B134,0 0 0 15px rgba(242,177,52,.1)}}
  .warn{position:absolute;left:16px;right:16px;bottom:34px;background:rgba(14,26,18,.93);border:1.5px solid #E8622C;border-radius:14px;padding:12px;font-weight:700;font-size:16px;text-align:center;opacity:0;transition:opacity .5s}.warn.on{opacity:1}
  .menu{position:absolute;right:8px;top:62px;width:170px;background:#fff;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.35);color:#111;font-size:12px;font-weight:600;opacity:0;transform:scale(.9);transform-origin:top right;transition:all .3s}.menu.on{opacity:1;transform:none}.menu div{padding:9px 12px}.menu .hl{background:#fff1c9;box-shadow:inset 0 0 0 3px #F2B134}
  .dots{position:absolute;right:12px;top:24px;font-size:20px;color:#333;font-weight:800;padding:0 6px;border-radius:8px}.dots.hl{box-shadow:0 0 0 3px #F2B134;background:rgba(242,177,52,.4)}
  </style>
  <div class=lab id=lab><small>${ios ? 'IPHONE · SAFARI' : 'ANDROID · CHROME'}</small><span id=lt>${labels[0]}</span></div>
  <div class=ph>
   <div class=page><h3>Trainingspilot</h3><p>Dein Trainingsplan in Sekunden</p></div>
   ${ios ? `<div class=addr id=addr>🔒 Trainingspilot</div><div class=bar id=bar><span>‹</span><span>›</span><span id=share>⬆︎</span><span>📖</span><span>⧉</span></div>
   <div class=sheet id=sheet><div class=r>Kopieren</div><div class=r>Zu Lesezeichen hinzufügen</div><div class="r" id=rowh>Zum Home-Bildschirm <span>＋</span></div><div class=r>Drucken</div></div>
   <div class=dlg id=dlg><div class=b><span>Abbrechen</span><span class=hl id=add>Hinzufügen</span></div><div style="text-align:center;margin-top:8px;font-size:13px;font-weight:700">Zum Home-Bildschirm</div><div class=ic>T</div><div style="text-align:center">Trainingspilot</div></div>` :
   `<div class=addr id=addr style="right:44px">🔒 Trainingspilot</div><div class=dots id=dots>⋮</div>
   <div class=menu id=menu><div>Neuer Tab</div><div>Verlauf</div><div>Downloads</div><div id=inst>App installieren</div><div>Einstellungen</div></div>
   <div class=dlg id=dlg><div style="text-align:center">App installieren?</div><div class=ic>T</div><div style="text-align:center">Trainingspilot</div><div class=b><span>Abbrechen</span><span class=hl id=add>Installieren</span></div></div>`}
   <div class=home id=home><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i class=app>T</i><i></i><i></i><i></i><em>Neues App-Symbol auf dem Home-Bildschirm</em></div>
  </div>
  <script>
  const L=${JSON.stringify(labels)}; const $=i=>document.getElementById(i); const setL=n=>{$('lt').textContent=L[n]||''};
  window.step=n=>{
   ${ios ? `
    if(n===0){ $('addr').classList.add('hl'); }
    if(n===1){ setL(1); $('addr').classList.remove('hl'); $('share').classList.add('hl'); }
    if(n===2){ setL(2); $('share').classList.remove('hl'); $('sheet').classList.add('on'); setTimeout(()=>$('rowh').classList.add('hl'),500); }
    if(n===3){ setL(3); $('sheet').classList.remove('on'); $('dlg').classList.add('on'); setTimeout(()=>{ $('dlg').classList.remove('on'); $('home').classList.add('on'); },1700); }
    if(n===4){ setL(4); $('lab').style.color='#F2B134'; }` : `
    if(n===0){ $('addr').classList.add('hl'); }
    if(n===1){ setL(1); $('addr').classList.remove('hl'); $('dots').classList.add('hl'); setTimeout(()=>$('menu').classList.add('on'),400); }
    if(n===2){ setL(2); $('dots').classList.remove('hl'); $('inst').classList.add('hl'); }
    if(n===3){ setL(3); $('menu').classList.remove('on'); $('dlg').classList.add('on'); setTimeout(()=>{ $('dlg').classList.remove('on'); $('home').classList.add('on'); },1600); }`}
  };
  </script>`;
}

(async () => {
  const browser = await chromium.launch({ args: ['--disable-gpu-vsync', '--disable-frame-rate-limit', '--run-all-compositor-stages-before-draw'] });
  const ids = want.length ? want : Object.keys(scenes);
  const out = {};
  for (const id of ids) {
    if (!scenes[id]) continue; console.log('Szene', id, '…');
    try { out[id] = await scenes[id](browser); } catch (e) { console.log('FEHLER', id, e.message.split('\n')[0]); out[id] = null; }
    (out[id] || []).forEach((sg, i) => {
      const o = DIR + '/seg_' + id + '_' + i + '.mp4';
      const ss = Math.max(0, sg.start + 0.05);
      cp.execSync(`ffmpeg -y -v error -ss ${ss.toFixed(2)} -t ${sg.dur.toFixed(2)} -i "${sg.file}" -vf "fps=30,format=yuv420p" -c:v libx264 -preset medium -crf 14 -an "${o}"`);
      console.log('  →', path.basename(o), sg.dur.toFixed(1) + 's');
    });
  }
  await browser.close(); server.close();
})();
