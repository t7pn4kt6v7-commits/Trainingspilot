#!/usr/bin/env python3
"""Schnitt: setzt Segmente, Kapitelkarten, Rahmen und Sprachspur zum fertigen Video zusammen.

  python3 tools/video/schnitt.py [--out <Ordner>]

Erwartet in <Ordner> (Standard: <tmp>/trainingspilot-video):
  seg_<szene>_<n>.mp4   von aufnahme.mjs        ov_<szene>.png, card_<n>.png   von rahmen.mjs
  <szene>.wav           Sprachspur je Szene     zeiten.json                    von stimme/*
Ergebnis: erklaervideo.mp4 (H.264/AAC, Kapitelmarken eingebettet) und kapitel.json (für den Player).
Braucht ffmpeg und ffprobe.
"""
import json, os, subprocess, sys, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(tempfile.gettempdir(), 'trainingspilot-video')
a = sys.argv[1:]
if '--out' in a: OUT = os.path.abspath(a[a.index('--out') + 1])
DB = json.load(open(os.path.join(HERE, 'drehbuch.json'), encoding='utf-8'))
os.chdir(OUT)
ZT = json.load(open('zeiten.json', encoding='utf-8'))

PHONE_Y = DB.get('layout', {}).get('phone_y', 240)
LEAD, X, CARD = 0.8, 0.4, 2.6          # Vorlauf vor dem ersten Satz, Überblendung, Dauer der Kapitelkarte
TITLES = {k['nr']: k['titel'] for k in DB['kapitel']}
FIRST = {}                              # erste Szene je Kapitel
for s in DB['szenen']: FIRST.setdefault(s['kapitel'], s['id'])
PART = {sid: nr for nr, sid in FIRST.items() if nr > 1}   # Karte vor der ersten Szene jedes Kapitels ab 2
CHAP = {sid: nr for nr, sid in FIRST.items()}
SUB = [s['id'] for s in DB['szenen'] if s['kapitel'] == 2]  # Unterpunkte: iPhone / Android

def run(args): subprocess.check_call(['ffmpeg', '-y', '-v', 'error'] + args)
def dur(f): return float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).decode())
def width(f): return int(subprocess.check_output(['ffprobe', '-v', 'error', '-select_streams', 'v', '-show_entries', 'stream=width', '-of', 'csv=p=0', f]).decode().strip().strip(','))
ENC = ['-r', '30', '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p', '-an']

clips = []  # (datei, ton oder None, szene)
for s in DB['szenen']:
    sid = s['id']
    if sid in PART:
        o = 'k_card%d.mp4' % PART[sid]
        run(['-loop', '1', '-framerate', '30', '-t', str(CARD), '-i', 'card_%d.png' % PART[sid]] + ENC + [o]); clips.append((o, None, sid))
    segs = sorted(f for f in os.listdir('.') if f.startswith('seg_%s_' % sid) and f.endswith('.mp4'))
    if not segs: sys.exit('Keine Aufnahme für Szene %s (seg_%s_*.mp4) – zuerst aufnahme.mjs ausführen.' % (sid, sid))
    for i, f in enumerate(segs):
        o = 'k_%s_%d.mp4' % (sid, i); ov = 'ov_%s.png' % sid
        # Figur: je Zustand eine Ebene (fig_<szene>_<n>.png), sichtbar ab ihrem Satz, springt von unten ein und wippt leicht
        figs = [] if i else sorted(f_ for f_ in os.listdir('.') if f_.startswith('fig_%s_' % sid) and f_.endswith('.png'))
        zust = ([{'satz': 0}] + s.get('folge', [])) if figs else []
        st = ZT.get(sid, {}).get('starts', [0.0] * 20)
        ins_, ch_ = ['-i', f], []
        cur = '[0]pad=1080:1920:140:%d:color=0x0B0F0C[b0]' % PHONE_Y if width(f) == 800 else '[0]null[b0]'
        ch_.append(cur); last = 'b0'; k = 1
        if os.path.exists(ov): ins_ += ['-i', ov]; ch_.append('[%s][%d:v]overlay[b1]' % (last, k)); last = 'b1'; k += 1
        for j, fg in enumerate(figs):
            t0 = max(0.0, LEAD + st[min(zust[j]['satz'], len(st) - 1)] - 0.15)
            t1 = (LEAD + st[min(zust[j + 1]['satz'], len(st) - 1)] - 0.15) if j + 1 < len(figs) else 9999
            y = "y='130*max(0,1-(t-%.2f)/0.28)+6*sin(t*6.5)'" % t0
            ins_ += ['-i', fg]; nxt = 'f%d' % j
            ch_.append("[%s][%d:v]overlay=0:%s:eval=frame:enable='between(t,%.2f,%.2f)'[%s]" % (last, k, y, t0, t1, nxt)); last = nxt; k += 1
        run(ins_ + ['-filter_complex', ';'.join(ch_), '-map', '[%s]' % last] + ENC + [o])
        wav = sid + '.wav'
        clips.append((o, wav if i == 0 and os.path.exists(wav) else None, sid))

# Überblendungen
ins, fl, starts = [], [], []; t = 0.0; prev = '[0:v]'
for i, (f, _a, _s) in enumerate(clips):
    ins += ['-i', f]; d = dur(f); starts.append(t - X if i else 0.0)
    if i == 0: t = d
    else:
        out = '[v%d]' % i; fl.append('%s[%d:v]xfade=transition=fade:duration=%.2f:offset=%.3f%s' % (prev, i, X, t - X, out)); prev = out; t = t - X + d
total = t

ch = {}; sub = {}
for (f, a_, sid), st in zip(clips, starts):
    if sid in CHAP and CHAP[sid] not in ch: ch[CHAP[sid]] = st
    if sid in SUB and sid not in sub: sub[sid] = st
json.dump({'dauer': round(total, 2),
           'kapitel': [{'nr': n, 'titel': TITLES[n], 'start': round(ch[n], 2)} for n in sorted(ch)],
           'unter': {'iphone': round(sub[SUB[0]], 2), 'android': round(sub[SUB[-1]], 2)}},
          open('kapitel.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
meta = ';FFMETADATA1\n'; ks = sorted(ch)
for j, n in enumerate(ks):
    e = ch[ks[j + 1]] if j + 1 < len(ks) else total
    meta += '[CHAPTER]\nTIMEBASE=1/1000\nSTART=%d\nEND=%d\ntitle=%s\n' % (ch[n] * 1000, e * 1000, TITLES[n])
open('kapitel.ffmeta', 'w', encoding='utf-8').write(meta)

fl.append('%sfade=t=in:st=0:d=0.5,fade=t=out:st=%.2f:d=0.6,format=yuv420p[vo]' % (prev, total - 0.6))
run(ins + ['-filter_complex', ';'.join(fl), '-map', '[vo]', '-c:v', 'libx264', '-preset', 'medium', '-crf', '23', '-r', '30', 'nur_bild.mp4'])

ains, afl, n = [], [], 0
for (f, a_, sid), st in zip(clips, starts):
    if not a_: continue
    ains += ['-i', a_]; ms = int((st + LEAD) * 1000)
    afl.append('[%d:a]aresample=44100,adelay=%d|%d[a%d]' % (n, ms, ms, n)); n += 1
if n == 0: sys.exit('Keine Sprachspur (<szene>.wav) gefunden.')
afl.append(''.join('[a%d]' % i for i in range(n)) + 'amix=inputs=%d:normalize=0,apad=whole_dur=%.3f,loudnorm=I=-16:TP=-1.5[o]' % (n, total))
run(ains + ['-filter_complex', ';'.join(afl), '-map', '[o]', '-ac', '1', '-ar', '44100', '-c:a', 'aac', '-b:a', '128k', '-t', '%.3f' % total, 'ton.m4a'])
run(['-i', 'nur_bild.mp4', '-i', 'ton.m4a', '-i', 'kapitel.ffmeta', '-map', '0:v', '-map', '1:a', '-map_metadata', '2', '-c', 'copy', '-movflags', '+faststart', 'erklaervideo.mp4'])
d = dur('erklaervideo.mp4')
print('Länge %.1f s = %d:%02d, Größe %.1f MB  (Grenze laut Drehbuch: %d s)' % (d, d // 60, d % 60, os.path.getsize('erklaervideo.mp4') / 1e6, DB['stand']['laenge_max_sekunden']))
if d > DB['stand']['laenge_max_sekunden']: print('ACHTUNG: länger als erlaubt – Sprechtext kürzen.'); sys.exit(2)
