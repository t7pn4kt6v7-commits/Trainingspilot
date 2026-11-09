#!/usr/bin/env node
// Werkzeug für die Übungsbibliothek des Trainingspiloten (nur Node.js, keine Abhängigkeiten).
//
//   node tools/exercises.mjs check   Prüft data/exercises/*.json (Pflichtfelder, doppelte
//                                    Titel/IDs, Formeln, jede Übung für 1-40 Kinder und 1-4
//                                    Trainer*innen durchgerechnet) und ob der in index.html
//                                    eingebettete Block aktuell ist.
//   node tools/exercises.mjs build   Bettet data/exercises/*.json in index.html ein
//                                    (<script id="exercise-data">). Danach "check" ausführen.
//
// Quelle der Wahrheit sind die JSON-Dateien. index.html enthält eine eingebettete Kopie,
// damit die App weiterhin als einzelne Datei (offline, per WhatsApp geteilt) funktioniert.

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const HTML = path.join(ROOT, 'index.html');
export const DATA_DIR = path.join(ROOT, 'data', 'exercises');

// Reihenfolge der Altersstufen im eingebetteten Block (wie vor v5.161 im Code).
export const TIER_ORDER = ['jung', 'alt', 'mittel', 'c', 'b', 'a'];
export const CATEGORIES = ['aufwaermen', 'ballgewoehnung', 'passspiel', 'torschuss', 'bewegung', 'zweikampf',
  'spielaufbau', 'koordination', 'torwart', 'kopfball', 'umschalten'];
const TEXT_FIELDS = ['title', 'goal', 'desc', 'coachTip', 'materials', 'dims'];
// added (JJJJ-MM-TT) + origin ("agent"): von tools/agent vorgeschlagene Übungen. Die App zeigt
// Übungen mit "added" in den ersten 60 Tagen als 🆕 und schlägt sie etwas häufiger vor.
// sources: Internetseiten, die der Agent als Anregung genutzt hat (nur zur Nachvollziehbarkeit
// bei der Freigabe; die App zeigt sie nicht an).
// v5.182: gegliederter Text. aufbau/ablauf/regeln = Listen kurzer Sätze, leichter/schwerer = je ein Satz.
// Mit "ablauf" ist "desc" (Fließtext) nicht mehr nötig. Erlaubtes HTML in diesen Feldern: nur <b>…</b>.
const DETAIL_LISTS = ['aufbau', 'ablauf', 'regeln'];
const DETAIL_TEXTS = ['leichter', 'schwerer'];
const ALLOWED_FIELDS = new Set(['id', ...TEXT_FIELDS, 'diagram', 'custom', 'added', 'origin', 'sources', ...DETAIL_LISTS, ...DETAIL_TEXTS]);
const SCENE_ITEM_TYPES = new Set(['p', 'cone', 'ball', 'goal', 'ladder', 'hoop', 'bench', 'pole']);
const SCENE_MOVE_TYPES = new Set(['pass', 'dribble', 'run']);
function onlyBoldTags(t) { return !/<(?!\/?b>)/.test(t); }

const DATA_START = '<!-- EXERCISE_DATA_START (generiert von tools/exercises.mjs build - nicht von Hand bearbeiten) -->';
const DATA_END = '<!-- EXERCISE_DATA_END -->';
const ENGINE_START = '// EXERCISE_ENGINE_START';
const ENGINE_END = '// EXERCISE_ENGINE_END';

export function loadData() {
  const files = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith('.json'));
  const byTier = {};
  for (const f of files) {
    const json = JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), 'utf8'));
    if (json.tier + '.json' !== f) throw new Error(`${f}: Feld "tier" (${json.tier}) passt nicht zum Dateinamen`);
    byTier[json.tier] = json.categories;
  }
  const tiers = {};
  for (const t of TIER_ORDER) if (byTier[t]) tiers[t] = byTier[t];
  for (const t of Object.keys(byTier)) if (!tiers[t]) tiers[t] = byTier[t];
  return { tiers };
}

export function embeddedBlock(data) {
  // "</" escapen, damit ein Text wie "</script>" den Block nicht vorzeitig beendet.
  const json = JSON.stringify(data).replace(/<\//g, '<\\/');
  return `${DATA_START}\n<script type="application/json" id="exercise-data">${json}</script>\n${DATA_END}`;
}

function between(text, start, end, label) {
  const a = text.indexOf(start);
  const b = text.indexOf(end);
  if (a === -1 || b === -1 || b < a) throw new Error(`Markierung für ${label} in index.html nicht gefunden`);
  // inner beginnt erst in der Zeile nach der Start-Markierung (dort darf noch ein Kommentar stehen).
  return { a, b: b + end.length, inner: text.slice(text.indexOf('\n', a) + 1, b) };
}

export function validate(data, html = fs.readFileSync(HTML, 'utf8')) {
  const errors = [];
  const warnings = [];
  const err = (where, msg) => errors.push(`${where}: ${msg}`);

  for (const [tier, cats] of Object.entries(data.tiers)) {
    if (!TIER_ORDER.includes(tier)) err(tier, 'unbekannte Altersstufe');
    const ids = new Set();
    for (const [cat, list] of Object.entries(cats)) {
      if (!CATEGORIES.includes(cat)) err(`${tier}/${cat}`, 'unbekannte Kategorie');
      if (!Array.isArray(list) || !list.length) { err(`${tier}/${cat}`, 'leere Kategorie'); continue; }
      const titles = new Set();
      list.forEach((ex, i) => {
        const where = `${tier}/${cat}/${ex && ex.title ? ex.title : '#' + i}`;
        for (const f of Object.keys(ex)) if (!ALLOWED_FIELDS.has(f)) err(where, `unbekanntes Feld "${f}"`);
        const structured = Array.isArray(ex.ablauf);
        for (const f of ['id', ...TEXT_FIELDS]) {
          if (f === 'desc' && structured && !('desc' in ex)) continue;
          if (typeof ex[f] !== 'string' || !ex[f].trim()) err(where, `Pflichtfeld "${f}" fehlt oder ist leer`);
        }
        for (const f of DETAIL_LISTS) {
          if (!(f in ex)) continue;
          if (!Array.isArray(ex[f]) || !ex[f].every((t) => typeof t === 'string' && t.trim() && onlyBoldTags(t))) err(where, `"${f}" muss eine Liste von Texten sein (nur <b> erlaubt)`);
        }
        if (structured && !ex.ablauf.length) err(where, '"ablauf" ist leer');
        for (const f of DETAIL_TEXTS) {
          if (f in ex && (typeof ex[f] !== 'string' || !onlyBoldTags(ex[f]))) err(where, `"${f}" muss ein Text sein (nur <b> erlaubt)`);
        }
        const sc = ex.diagram && ex.diagram.scene;
        if (sc) {
          if (typeof sc.w !== 'number' || typeof sc.l !== 'number') err(where, 'Szene braucht w und l in Metern');
          for (const it of sc.items || []) if (!SCENE_ITEM_TYPES.has(it.t) || typeof it.x !== 'number' || typeof it.y !== 'number') err(where, `Szene: ungültiges Objekt ${JSON.stringify(it)}`);
          const steps = [];
          for (const m of sc.moves || []) {
            if (!SCENE_MOVE_TYPES.has(m.t) || !Array.isArray(m.from) || !Array.isArray(m.to)) err(where, `Szene: ungültiger Weg ${JSON.stringify(m)}`);
            if (m.step) steps.push(m.step);
          }
          for (const it of sc.items || []) if (it.step) steps.push(it.step);
          // Jede Nummer im Bild muss es auch im Text geben (und umgekehrt), sonst passen Bild und Ablauf nicht zusammen.
          if (structured) {
            const want = ex.ablauf.map((_, i) => i + 1).join(',');
            const got = [...new Set(steps)].sort((a, b) => a - b).join(',');
            if (want !== got) err(where, `Schritte im Bild (${got || 'keine'}) passen nicht zum Ablauf (${want})`);
          }
        }
        if (typeof ex.id === 'string' && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(ex.id)) err(where, `id "${ex.id}" nur a-z, 0-9 und Bindestriche`);
        if (ids.has(ex.id)) err(where, `id "${ex.id}" in dieser Altersstufe doppelt`);
        ids.add(ex.id);
        // Bewertungen werden pro Titel gespeichert - doppelte Titel würden sich vermischen.
        if (titles.has(ex.title)) err(where, 'Titel in dieser Kategorie doppelt');
        titles.add(ex.title);
        if (typeof ex.goal === 'string' && !ex.goal.startsWith('Ziel: ')) warnings.push(`${where}: goal beginnt nicht mit "Ziel: "`);
        if (!ex.diagram || typeof ex.diagram !== 'object') err(where, 'diagram fehlt');
        if ('custom' in ex && ex.custom !== true) err(where, '"custom" nur als true angeben (oder weglassen)');
        if ('added' in ex && !/^\d{4}-\d{2}-\d{2}$/.test(ex.added)) err(where, '"added" im Format JJJJ-MM-TT angeben');
        if ('origin' in ex && ex.origin !== 'agent') err(where, '"origin" ist nur als "agent" vorgesehen');
        if ('sources' in ex && (!Array.isArray(ex.sources) || ex.sources.length > 5 || !ex.sources.every((u) => typeof u === 'string' && /^https:\/\/[^\s"<>]+$/.test(u)))) {
          err(where, '"sources" muss eine Liste von höchstens 5 https-Adressen sein');
        }
      });
    }
  }
  if (errors.length) return { errors, warnings };

  // Formeln mit genau der Engine aus index.html durchrechnen.
  const engine = between(html, ENGINE_START, ENGINE_END, 'Übungs-Engine').inner;
  const ctx = { console: { error: (...a) => errors.push('Engine: ' + a.join(' ')) }, DATA: data };
  vm.createContext(ctx);
  vm.runInContext(engine + '\n;this.hydrate = hydrateExercise; this.setT = setTrainerCount;', ctx);
  for (const [tier, cats] of Object.entries(data.tiers)) {
    for (const [cat, list] of Object.entries(cats)) {
      for (const ex of list) {
        const where = `${tier}/${cat}/${ex.title}`;
        let h;
        try { h = ctx.hydrate(ex); } catch (e) { err(where, e.message); continue; }
        try {
          for (let t = 1; t <= 4; t++) {
            ctx.setT(t);
            for (let k = 1; k <= 40; k++) {
              for (const f of ['materials', 'dims']) {
                const v = h[f](k);
                if (typeof v !== 'string' || /NaN|undefined|Infinity|\[object/.test(v)) throw new Error(`${f} ergibt "${v}" bei ${k} Kindern/${t} Trainer*innen`);
              }
              const svg = h.diagram(k);
              if (typeof svg !== 'string' || !svg.startsWith('<svg') || /NaN|undefined/.test(svg)) throw new Error(`Skizze ungültig bei ${k} Kindern/${t} Trainer*innen`);
            }
          }
        } catch (e) { err(where, e.message); }
      }
    }
  }
  return { errors, warnings };
}

// Schreibt eine Altersstufe zurück (gleiches Format wie die übrigen Dateien).
export function saveTier(tier, categories) {
  fs.writeFileSync(path.join(DATA_DIR, tier + '.json'), JSON.stringify({ tier, categories }, null, 2) + '\n');
}

// Bettet die Daten in index.html ein. Gibt die Zahl der Übungen zurück.
export function build(data = loadData()) {
  let html = fs.readFileSync(HTML, 'utf8');
  const { a, b } = between(html, DATA_START, DATA_END, 'Übungsdaten');
  html = html.slice(0, a) + embeddedBlock(data) + html.slice(b);
  fs.writeFileSync(HTML, html);
  return Object.values(data.tiers).reduce((s, c) => s + Object.values(c).reduce((x, l) => x + l.length, 0), 0);
}

// Vollständige Prüfung inkl. Aktualität des eingebetteten Blocks.
export function check(data = loadData()) {
  const html = fs.readFileSync(HTML, 'utf8');
  const { errors, warnings } = validate(data, html);
  const { a, b } = between(html, DATA_START, DATA_END, 'Übungsdaten');
  if (html.slice(a, b) !== embeddedBlock(data)) {
    errors.push('index.html ist nicht aktuell - bitte "node tools/exercises.mjs build" ausführen und mit committen');
  }
  return { errors, warnings };
}

function main() {
  const cmd = process.argv[2];
  if (cmd === 'build') {
    console.log(`index.html aktualisiert: ${build()} Übungen eingebettet.`);
    return;
  }
  if (cmd === 'check') {
    const { errors, warnings } = check();
    warnings.forEach((w) => console.log('Hinweis: ' + w));
    if (errors.length) {
      errors.forEach((e) => console.error('FEHLER: ' + e));
      process.exit(1);
    }
    console.log('Übungsbibliothek OK.');
    return;
  }
  console.error('Aufruf: node tools/exercises.mjs <check|build>');
  process.exit(2);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main();
