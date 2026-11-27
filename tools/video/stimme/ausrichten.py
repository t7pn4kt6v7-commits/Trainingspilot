#!/usr/bin/env python3
"""Menschliche Aufnahme den Sätzen des Drehbuchs zuordnen (der aussichtsreichste Weg zu guter Qualität).

  python3 tools/video/stimme/ausrichten.py <aufnahme.(wav|m4a|mp3)> [--out <Ordner>] [--pause 0.8]

Die Sprecher*in liest den Text aus drehbuch.json (Szene für Szene, Sätze in Reihenfolge, Pause zwischen Szenen)
am Stück ein. Das Skript erkennt die Wörter samt Zeiten, ordnet sie dem Sollwort-Text zu, schneidet je Szene
eine Datei <Ordner>/<szene>.wav (mit kurzem Vor-/Nachlauf) und schreibt <Ordner>/zeiten.json wie tts_chatterbox.py.
Wird eine Szene nicht ausreichend erkannt (< 70 % der Wörter), bricht es mit der Szene ab – dann diese neu einsprechen.
Der Sprechtext darf sich vorher ändern (drehbuch.json bearbeiten, Text neu ausgeben mit --text).
"""
import json, os, sys, tempfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _asr import ff, dur, lade_asr, transcribe, align, satzwoerter

HERE = os.path.dirname(os.path.abspath(__file__))
DB = json.load(open(os.path.join(HERE, '..', 'drehbuch.json'), encoding='utf-8'))
a = sys.argv[1:]
if '--text' in a:
    for s in DB['szenen']:
        print('## %s (Kapitel %d)' % (s['id'], s['kapitel'])); print('\n'.join(s['saetze'])); print()
    sys.exit(0)
if not a or a[0].startswith('--'): sys.exit(__doc__)
SRC = os.path.abspath(a[0])
OUT = os.path.abspath(a[a.index('--out') + 1]) if '--out' in a else os.path.join(tempfile.gettempdir(), 'trainingspilot-video')
os.makedirs(OUT, exist_ok=True)
VOR, NACH = 0.12, 0.25

# alle Sollwörter der Reihe nach, mit Szene und Satz
words, who = [], []
for sc in DB['szenen']:
    w, rel = satzwoerter(sc['saetze'])
    words += w; who += [(sc['id'], r) for r in rel]
A = transcribe(lade_asr(), SRC)
mp = align(words, A)
print('Erkannt: %d von %d Wörtern (%.0f %%)' % (len(mp), len(words), 100 * len(mp) / len(words)))

zeiten = {}
for sc in DB['szenen']:
    idx = [i for i, (s, _) in enumerate(who) if s == sc['id']]; hit = [i for i in idx if i in mp]
    if len(hit) < 0.7 * len(idx): sys.exit('Szene %s: nur %d von %d Wörtern erkannt – bitte neu einsprechen.' % (sc['id'], len(hit), len(idx)))
    t0 = max(0.0, A[mp[hit[0]]][1] - VOR); t1 = A[mp[hit[-1]]][2] + NACH
    out = os.path.join(OUT, sc['id'] + '.wav')
    ff(['-ss', '%.3f' % t0, '-t', '%.3f' % (t1 - t0), '-i', SRC, '-af', 'highpass=f=70,afade=t=out:st=%.3f:d=0.1' % (t1 - t0 - 0.1), '-ar', '44100', '-ac', '1', out])
    st = {}
    for i in hit:
        k = who[i][1]
        if k not in st: st[k] = round(A[mp[i]][1] - t0, 2)
    last = 0.0; starts = []
    for k in range(len(sc['saetze'])):
        starts.append(st.get(k, round(last + 1.0, 2))); last = starts[-1]
    zeiten[sc['id']] = {'starts': starts, 'dauer': round(t1 - t0, 2)}
    print(sc['id'], 'Sprechzeit', zeiten[sc['id']]['dauer'], 'Erkennung %.0f %%' % (100 * len(hit) / len(idx)))
json.dump(zeiten, open(os.path.join(OUT, 'zeiten.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('Summe Sprechzeit %.1f s – zeiten.json geschrieben.' % sum(z['dauer'] for z in zeiten.values()))
