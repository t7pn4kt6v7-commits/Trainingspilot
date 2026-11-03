// Rückmeldungen (GitHub-Issues) auslesen und daraus ableiten, wo neue Übungen am dringendsten
// gebraucht werden. Reine Funktionen ohne Netzwerk - siehe test.mjs.

export const CATEGORY_LABELS = {
  aufwaermen: 'Aufwärmen', ballgewoehnung: 'Ballgewöhnung & Dribbling', passspiel: 'Passspiel',
  torschuss: 'Torschuss', bewegung: 'Bewegung ohne Ball & Taktik', zweikampf: 'Zweikämpfe gewinnen',
  spielaufbau: 'Passwege & Spielaufbau', koordination: 'Koordination & Beweglichkeit',
  torwart: 'Torwart-Grundlagen', kopfball: 'Kopfball & Luftduell', umschalten: 'Kontern nach Ballgewinn'
};

export const TIER_LABELS = {
  jung: 'G-Jugend (U6/U7, 4–6 Jahre)',
  mittel: 'F- und E-Jugend (U8–U11, 7–10 Jahre)',
  alt: 'D-Jugend (U12/U13, 11–12 Jahre)',
  c: 'C-Jugend (U14/U15, 13–14 Jahre)',
  b: 'B-Jugend (U16/U17, 15–16 Jahre)',
  a: 'A-Jugend (U18/U19, 17–18 Jahre)'
};

const MARKER_RE = /<!--\s*trainingspilot-feedback\s+(\{[\s\S]*?\})\s*-->/;
const ARTEN = ['feedback', 'zu-oft', 'neu'];

// Altersklassen-Auswahl der App (value -> tier), direkt aus index.html gelesen.
export function readAltersklassen(html) {
  const map = {};
  const re = /<option value="([^"]+)"[^>]*data-tier="([a-z]+)"/g;
  let m;
  while ((m = re.exec(html))) map[m[1]] = m[2];
  return map;
}

// Welche Kategorien die App je Altersstufe überhaupt anbietet: eine Kategorie zählt für eine
// Altersstufe, wenn mindestens eine ihrer Altersklassen sie nicht sperrt (data-gesperrt).
export function readRelevantCategories(html) {
  const byTier = {};
  const re = /<option value="[^"]+"[^>]*data-tier="([a-z]+)"[^>]*data-gesperrt="([^"]*)"/g;
  let m;
  while ((m = re.exec(html))) {
    const blocked = new Set(m[2].split(',').filter(Boolean));
    byTier[m[1]] = byTier[m[1]] || new Set();
    for (const c of Object.keys(CATEGORY_LABELS)) if (!blocked.has(c)) byTier[m[1]].add(c);
  }
  return byTier;
}

function labelToCategory(label) {
  if (!label) return null;
  const l = label.trim();
  if (CATEGORY_LABELS[l]) return l;
  return Object.keys(CATEGORY_LABELS).find((k) => CATEGORY_LABELS[k] === l) || null;
}

// Abschnitte eines per Issue-Formular erstellten Issues ("### Überschrift\n\nWert").
function formSections(body) {
  const out = {};
  const parts = body.split(/^###\s+/m).slice(1);
  for (const p of parts) {
    const nl = p.indexOf('\n');
    const head = (nl === -1 ? p : p.slice(0, nl)).trim();
    const val = (nl === -1 ? '' : p.slice(nl + 1)).trim();
    out[head] = val === '_No response_' ? '' : val;
  }
  return out;
}

// Liefert eine normalisierte Rückmeldung oder null (Issue gehört nicht zum Übungs-Feedback).
// Issue-Texte stammen von beliebigen GitHub-Nutzer*innen: Sie werden nur als Daten genutzt,
// gekürzt und dem Modell ausdrücklich als Zitat übergeben.
export function parseIssue(issue, altersklassen = {}) {
  if (!issue || issue.pull_request) return null;
  const body = String(issue.body || '');
  let meta = null;
  const m = body.match(MARKER_RE);
  if (m) {
    try { meta = JSON.parse(m[1]); } catch { meta = null; }
  }
  if (!meta) {
    const s = formSections(body);
    if (!('Art der Rückmeldung' in s)) return null;
    const artLabel = s['Art der Rückmeldung'];
    meta = {
      art: /zu oft/i.test(artLabel) ? 'zu-oft' : /neue/i.test(artLabel) ? 'neu' : 'feedback',
      altersklasse: s['Altersklasse'] || null,
      tier: altersklassen[s['Altersklasse']] || null,
      kategorie: labelToCategory(s['Kategorie']),
      uebung: s['Übung'] || null,
      bewertung: null,
      text: s['Rückmeldung'] || ''
    };
  }
  if (!ARTEN.includes(meta.art)) return null;
  const text = (meta.text !== undefined ? meta.text : body.replace(MARKER_RE, ''))
    .replace(/\r/g, '').trim().slice(0, 1500);
  return {
    number: issue.number,
    url: issue.html_url,
    art: meta.art,
    tier: typeof meta.tier === 'string' ? meta.tier : (altersklassen[meta.altersklasse] || null),
    kategorie: typeof meta.kategorie === 'string' && CATEGORY_LABELS[meta.kategorie] ? meta.kategorie : null,
    uebung: typeof meta.uebung === 'string' ? meta.uebung.slice(0, 200) : null,
    bewertung: meta.bewertung === 'up' || meta.bewertung === 'down' ? meta.bewertung : null,
    text
  };
}

// Wie viele Übungen die App für tier/kategorie tatsächlich zur Auswahl hat (F-/E-Jugend
// bekommt zusätzlich den G-Jugend-Pool, siehe getExercisePool in index.html).
export function effectivePoolSize(data, tier, cat) {
  const own = (data.tiers[tier] && data.tiers[tier][cat]) || [];
  if (tier !== 'mittel') return own.length;
  // wie getVariants/getExercisePool in index.html
  const titles = new Set(own.map((e) => e.title));
  for (const e of (data.tiers.jung && data.tiers.jung[cat]) || []) titles.add(e.title);
  return titles.size;
}

// Bewertet die Kombinationen aus Altersstufe + Kategorie und liefert die dringendsten zuerst.
// scope "bedarf": nur Kombinationen, die es in den Daten gibt und die Bedarf haben.
// scope "alle": jede Kombination, die die App anbietet (relevant aus readRelevantCategories),
// auch wenn es dafür noch keine eigenen Übungen gibt; bei Gleichstand zuerst die mit den
// wenigsten bisher vom Agenten ergänzten Übungen, damit mehrere Läufe alles abdecken.
// Kleine, stabile Hash-Funktion für eine wöchentlich wechselnde Reihenfolge bei Gleichstand.
function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

// seed (z. B. Kalenderwoche) mischt Gleichstände; pro Lauf kommen zuerst verschiedene
// Altersstufen dran, damit nicht alle neuen Übungen in einer Altersstufe landen.
export function planTargets(data, feedback, maxNew, seed = '', { scope = 'bedarf', relevant = null } = {}) {
  const targets = [];
  const pairs = [];
  if (scope === 'alle' && relevant) {
    for (const [tier, cats] of Object.entries(relevant)) for (const cat of cats) pairs.push([tier, cat]);
  } else {
    for (const [tier, cats] of Object.entries(data.tiers)) for (const cat of Object.keys(cats)) pairs.push([tier, cat]);
  }
  for (const [tier, cat] of pairs) {
    {
      const fb = feedback.filter((f) => f.tier === tier && f.kategorie === cat);
      const pool = effectivePoolSize(data, tier, cat);
      const zuOft = fb.filter((f) => f.art === 'zu-oft').length;
      const neu = fb.filter((f) => f.art === 'neu').length;
      const down = fb.filter((f) => f.bewertung === 'down').length;
      const other = fb.filter((f) => f.art === 'feedback').length;
      const score = 3 * Math.max(0, 4 - pool) + 4 * zuOft + 5 * neu + 2 * down + other + (scope === 'alle' ? 1 : 0);
      const agentAdded = (((data.tiers[tier] || {})[cat]) || []).filter((e) => e.origin === 'agent').length;
      if (score > 0) targets.push({ tier, cat, pool, score, agentAdded, feedback: fb });
    }
  }
  targets.sort((x, y) => y.score - x.score || x.agentAdded - y.agentAdded || x.pool - y.pool || hash(seed + x.tier + x.cat) - hash(seed + y.tier + y.cat));
  const chosen = [];
  const tiers = new Set();
  for (const t of targets) {
    if (chosen.length >= maxNew) break;
    if (!tiers.has(t.tier)) { chosen.push(t); tiers.add(t.tier); }
  }
  for (const t of targets) {
    if (chosen.length >= maxNew) break;
    if (!chosen.includes(t)) chosen.push(t);
  }
  return chosen.sort((x, y) => y.score - x.score);
}

// Übungen, die laut Rückmeldungen überarbeitet werden sollten (für den PR-Text - der Agent
// löscht oder ändert bestehende Übungen bewusst nicht selbst).
export function flaggedExercises(feedback) {
  const by = new Map();
  for (const f of feedback) {
    if (!f.uebung || !f.tier || !f.kategorie) continue;
    if (f.art !== 'zu-oft' && f.bewertung !== 'down') continue;
    const key = `${f.tier}/${f.kategorie}/${f.uebung}`;
    const e = by.get(key) || { tier: f.tier, kategorie: f.kategorie, uebung: f.uebung, zuOft: 0, down: 0, issues: [] };
    if (f.art === 'zu-oft') e.zuOft++;
    if (f.bewertung === 'down') e.down++;
    e.issues.push(f.number);
    by.set(key, e);
  }
  return [...by.values()].filter((e) => e.zuOft + e.down >= 2).sort((a, b) => (b.zuOft + b.down) - (a.zuOft + a.down));
}

// Feedback, das keiner vorhandenen Kombination zugeordnet werden konnte (fürs PR-Protokoll).
export function unassigned(data, feedback) {
  return feedback.filter((f) => !(f.tier && f.kategorie && data.tiers[f.tier] && data.tiers[f.tier][f.kategorie]));
}

export function slugify(title) {
  return title.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'uebung';
}
