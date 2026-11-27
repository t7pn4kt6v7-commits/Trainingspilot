#!/usr/bin/env python3
"""Sprachspur mit der Thorsten-Stimme (Coqui-TTS, Modell tts_models/de/thorsten/vits, Sprachdaten CC0, kostenlos, lokal).

  python3 tools/video/stimme/tts_thorsten.py [--out <Ordner>] [--nur c1,c2] [--tempo 1.0] [--pause 0.45]

Jeder Satz wird einzeln gesprochen und mit Pausen zusammengesetzt; die Satzanfänge sind dadurch exakt bekannt
(keine Spracherkennung nötig). Schreibt <Ordner>/<szene>.wav und <Ordner>/zeiten.json wie die anderen Stimm-Werkzeuge.
Voraussetzung: Python-Umgebung mit `coqui-tts[languages]`, torch, torchaudio, torchcodec, six (siehe README). Ob die Stimme
gut klingt, beurteilt nur ein Mensch.
"""
import json, os, re, subprocess, sys, tempfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _asr import ff, dur
from TTS.api import TTS

HERE = os.path.dirname(os.path.abspath(__file__))
DB = json.load(open(os.path.join(HERE, '..', 'drehbuch.json'), encoding='utf-8'))
a = sys.argv[1:]
arg = lambda k, d=None: a[a.index(k) + 1] if k in a else d
OUT = os.path.abspath(arg('--out', os.path.join(tempfile.gettempdir(), 'trainingspilot-video')))
ONLY = arg('--nur', '').split(',') if '--nur' in a else []
TEMPO = float(arg('--tempo', '1.0')); PAUSE = float(arg('--pause', '0.45'))
os.makedirs(OUT, exist_ok=True); C = os.path.join(OUT, 'th'); os.makedirs(C, exist_ok=True)
# Aussprache: Wörter, die das Modell falsch liest
SPRICH = [('Home-Bildschirm', 'Hohm-Bildschirm'), ('DFB', 'Deh-Eff-Beh'), ('NFV', 'En-Eff-Vau'), ('iPhone', 'Ei-fohn'), ('Android', 'Ändroid'),
          ('Safari', 'Safari'), ('Chrome', 'Krohm'), ('WhatsApp', 'Wotsäpp'), ('App', 'Äpp'), ('„', ''), ('“', ''), (' – ', ', '), ('–', ',')]
def sprich(t):
    for x, y in SPRICH: t = t.replace(x, y)
    return t
tts = TTS('tts_models/de/thorsten/vits')
zeiten = {}; zp = os.path.join(OUT, 'zeiten.json')
if os.path.exists(zp): zeiten = json.load(open(zp, encoding='utf-8'))
for sc in DB['szenen']:
    if ONLY and sc['id'] not in ONLY: continue
    parts, starts, t = [], [], 0.0
    for k, satz in enumerate(sc['saetze']):
        raw = os.path.join(C, '%s_%d_raw.wav' % (sc['id'], k)); f = os.path.join(C, '%s_%d.wav' % (sc['id'], k))
        tts.tts_to_file(text=sprich(satz), file_path=raw)
        flt = 'highpass=f=70,' + ('atempo=%.3f,' % TEMPO if abs(TEMPO - 1) > 0.01 else '') + 'apad=pad_dur=%.2f' % PAUSE
        ff(['-i', raw, '-af', flt, '-ar', '44100', '-ac', '1', f])
        starts.append(round(t, 2)); parts.append(f); t += dur(f)
    ins, fl = [], []
    for i, p in enumerate(parts): ins += ['-i', p]
    fl = ''.join('[%d:a]' % i for i in range(len(parts))) + 'concat=n=%d:v=0:a=1[o]' % len(parts)
    out = os.path.join(OUT, sc['id'] + '.wav'); ff(ins + ['-filter_complex', fl, '-map', '[o]', '-ar', '44100', '-ac', '1', out])
    zeiten[sc['id']] = {'starts': starts, 'dauer': round(t - PAUSE, 2)}
    print(sc['id'], 'Sprechzeit', zeiten[sc['id']]['dauer'], flush=True)
json.dump(zeiten, open(zp, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('Summe Sprechzeit %.1f s' % sum(z['dauer'] for z in zeiten.values()))
