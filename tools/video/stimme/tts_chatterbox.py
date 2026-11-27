#!/usr/bin/env python3
"""Synthetische Sprachspur (Chatterbox, kostenlos, läuft lokal auf der CPU).

  HF_HUB_DISABLE_XET=1 python3 tools/video/stimme/tts_chatterbox.py [--out <Ordner>] [--nur c1,c2]

Liest die Sätze aus drehbuch.json, schreibt <Ordner>/<szene>.wav und <Ordner>/zeiten.json
({szene: {starts: [Sekunden je Satzanfang], dauer}}). Jeder Textblock (>= 14 Wörter) wird mit mehreren
Zufallswerten erzeugt, per Spracherkennung geprüft (Chatterbox hängt manchmal Kauderwelsch an oder nuschelt)
und an der letzten erkannten Wortgrenze beschnitten. Zu hastiges Sprechen wird auf 0,37 s/Wort gedehnt.

Voraussetzung: Python-Umgebung mit chatterbox-tts, torch, torchaudio, faster-whisper, numpy, setuptools<81
(siehe README). Stimme „D“: EXA 0.7, CFG 0.3, TEMPR 0.8 (Umgebungsvariablen; nicht TEMP – das ist ein Systemname).
ACHTUNG: Ob eine Stimme gut klingt, kann nur ein Mensch beurteilen – Erkennungswerte sind nur ein Hilfsmaß.
"""
import hashlib, json, os, sys, tempfile, time
os.environ.setdefault('HF_HUB_DISABLE_XET', '1')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _asr import ff, dur, norm, lade_asr, transcribe, align, satzwoerter
import torch, torchaudio as ta
from chatterbox.mtl_tts import ChatterboxMultilingualTTS

HERE = os.path.dirname(os.path.abspath(__file__))
DB = json.load(open(os.path.join(HERE, '..', 'drehbuch.json'), encoding='utf-8'))
a = sys.argv[1:]
OUT = os.path.abspath(a[a.index('--out') + 1]) if '--out' in a else os.path.join(tempfile.gettempdir(), 'trainingspilot-video')
ONLY = a[a.index('--nur') + 1].split(',') if '--nur' in a else []
os.makedirs(OUT, exist_ok=True); C = os.path.join(OUT, 'cb'); os.makedirs(C, exist_ok=True)

TARGET = 0.37; GAP_CHUNK = 0.5; GAPS = {'c2': 0.8, 'c3': 0.8, 'c4': 0.8, 'c8': 1.0, 'c9': 0.9}
EXA = float(os.environ.get('EXA', '0.7')); CFG = float(os.environ.get('CFG', '0.3')); TEMPR = float(os.environ.get('TEMPR', '0.8'))
SEEDS = [7, 11, 23, 41, 53, 67]
tts = ChatterboxMultilingualTTS.from_pretrained(device='cpu'); asr = lade_asr()

def tts_text(t): return t.replace('Home-Bildschirm', 'Hohm-Bildschirm').replace('DFB', 'Deh-Eff-Beh').replace('NFV', 'En-Eff-Vau').replace('„', '').replace('“', '').replace(' – ', ', ').replace('–', ',')
def chunks(sents):
    out, cur = [], []
    for i, s in enumerate(sents):
        cur.append(i)
        if sum(len(sents[j].split()) for j in cur) >= 14 or len(cur) == 3: out.append(cur); cur = []
    if cur:
        if out and sum(len(sents[j].split()) for j in cur) < 8: out[-1] += cur
        else: out.append(cur)
    return out

def make(idx, sents, name):
    sub = [sents[k] for k in idx]; words, rel = satzwoerter(sub); sid = [idx[r] for r in rel]
    text = tts_text(' '.join(sub)); best = None
    for seed in SEEDS:
        h = hashlib.md5(('%.2f|%.2f|%.2f|%d|%s' % (EXA, CFG, TEMPR, seed, text)).encode()).hexdigest()[:12]; raw = '%s/%s.wav' % (C, h)
        if not os.path.exists(raw):
            torch.manual_seed(seed)
            w = tts.generate(text, language_id='de', exaggeration=EXA, cfg_weight=CFG, temperature=TEMPR); ta.save(raw, w, tts.sr)
        A = transcribe(asr, raw); mp = align(words, A); rec = len(mp) / len(words)
        if len(mp) < 2: score = -1; first = last = None
        else:
            lj, fj = max(mp), min(mp); first = A[mp[fj]][1]
            for k in range(min(2, fj)):
                pj = mp[fj] - 1 - k
                if pj >= 0 and first - A[pj][2] < 0.35: first = A[pj][1]
                else: break
            last = A[mp[lj]][2]
            for k in range(min(2, len(words) - 1 - lj)):
                nj = mp[lj] + 1 + k
                if nj < len(A) and A[nj][1] - last < 0.35: last = A[nj][2]
                else: break
            per = (last - first) / len(words); score = rec - (0 if 0.30 <= per <= 0.62 else 0.25)
            gaps = [A[mp[i + 1]][1] - A[mp[i]][2] for i in range(len(words) - 1) if i in mp and i + 1 in mp and mp[i + 1] == mp[i] + 1]
            if gaps and max(gaps) > 0.9: score -= 0.15           # lange Pause mitten im Text
            score -= min(0.4, 0.08 * max(0, len(A) - len(mp) - 1))  # angehängtes Kauderwelsch
        print('   %s seed %d  erkannt %.0f%%  Wert %.2f' % (name, seed, 100 * rec, score), flush=True)
        if best is None or score > best[0]: best = (score, raw, A, mp, first, last)
        if score >= 0.95: break
    score, raw, A, mp, first, last = best
    if first is None: raise SystemExit('Block %s: nichts Brauchbares erkannt – Text prüfen.' % name)
    out = raw[:-4] + '_cut.wav'; t0 = max(0, first - 0.06); t1 = last + 0.16
    per = (last - first) / len(words); tempo = min(1.0, max(0.78, per / TARGET)) if per < TARGET else 1.0
    flt = 'highpass=f=70,' + ('rubberband=tempo=%.3f:transients=smooth,' % tempo if tempo < 0.999 else '') + 'afade=t=out:st=%.3f:d=0.1' % max(0, (t1 - t0) / tempo - 0.1)
    ff(['-ss', '%.3f' % t0, '-t', '%.3f' % (t1 - t0), '-i', raw, '-af', flt, '-ar', '44100', '-ac', '1', out])
    st = {}
    for i, k in enumerate(sid):
        if i in mp and k not in st: st[k] = max(0.0, A[mp[i]][1] - t0) / tempo
    return out, st, score

zeiten = {}; zp = os.path.join(OUT, 'zeiten.json')
if os.path.exists(zp): zeiten = json.load(open(zp, encoding='utf-8'))
report = []
for sc in DB['szenen']:
    if ONLY and sc['id'] not in ONLY: continue
    sents = sc['saetze']; GC = GAPS.get(sc['id'], GAP_CHUNK); parts, starts, t = [], {}, 0.0
    for ci, idx in enumerate(chunks(sents)):
        f, st, s = make(idx, sents, '%s/%d' % (sc['id'], ci)); report.append((sc['id'], ci, round(s, 2)))
        for k in idx: starts[k] = t + st[k] if k in st else None
        if starts[idx[0]] is None: starts[idx[0]] = t
        parts.append(f); t += dur(f) + GC
    last = 0.0
    for k in range(len(sents)):
        if starts.get(k) is None: starts[k] = last + 1.0   # nicht erkannter Satzanfang: schätzen
        last = starts[k]
    ins, fl = [], []
    for i, p in enumerate(parts): ins += ['-i', p]; fl.append('[%d:a]apad=pad_dur=%.2f[x%d]' % (i, GC, i))
    fl.append(''.join('[x%d]' % i for i in range(len(parts))) + 'concat=n=%d:v=0:a=1[o]' % len(parts))
    out = '%s/%s.wav' % (OUT, sc['id']); ff(ins + ['-filter_complex', ';'.join(fl), '-map', '[o]', '-ar', '44100', '-ac', '1', out])
    zeiten[sc['id']] = {'starts': [round(starts[k], 2) for k in range(len(sents))], 'dauer': round(dur(out) - GC, 2)}
    print(sc['id'], 'Sprechzeit', zeiten[sc['id']]['dauer'], flush=True)
json.dump(zeiten, open(zp, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('Summe Sprechzeit %.1f s | schwache Blöcke (Wert < 0.8): %s' % (sum(z['dauer'] for z in zeiten.values()), [r for r in report if r[2] < 0.8]))
