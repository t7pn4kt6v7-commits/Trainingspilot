"""Gemeinsame Hilfen: Spracherkennung (faster-whisper) und Abgleich Sprechtext <-> Erkanntes."""
import re, subprocess, difflib, numpy as np

def ff(args): subprocess.check_call(['ffmpeg', '-y', '-v', 'error'] + args)
def dur(f): return float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).decode())
def norm(w): return re.sub(r'[^a-zäöüß0-9]', '', w.lower())

def lade_asr():
    from faster_whisper import WhisperModel
    return WhisperModel('small', device='cpu', compute_type='int8')

def transcribe(asr, f, start=None, ende=None):
    """Wörter mit Zeiten [(wort, start, ende)]. Audio wird als numpy übergeben (faster-whisper + av sind sonst inkompatibel)."""
    cmd = ['ffmpeg', '-v', 'error']
    if start is not None: cmd += ['-ss', '%.3f' % start]
    if ende is not None: cmd += ['-t', '%.3f' % (ende - (start or 0))]
    a = np.frombuffer(subprocess.check_output(cmd + ['-i', f, '-ar', '16000', '-ac', '1', '-f', 'f32le', '-']), dtype=np.float32)
    seg, _ = asr.transcribe(a, language='de', word_timestamps=True, beam_size=5)
    off = start or 0.0
    return [(norm(w.word), w.start + off, w.end + off) for sg in seg for w in sg.words if norm(w.word)]

def align(S, A):
    """Ordnet Sollwörter S den erkannten Wörtern A zu (Needleman-Wunsch, Ähnlichkeit >= 0.75). Rückgabe {i_soll: j_erkannt}."""
    n, m = len(S), len(A); sc = lambda s, a: difflib.SequenceMatcher(None, s, a).ratio()
    M = np.zeros((n + 1, m + 1)); B = np.zeros((n + 1, m + 1), dtype=int)
    for i in range(1, n + 1): M[i][0] = -0.6 * i; B[i][0] = 1
    for j in range(1, m + 1): M[0][j] = -0.2 * j; B[0][j] = 2
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            r = sc(S[i - 1], A[j - 1][0]); d = M[i - 1][j - 1] + (2 * r if r >= 0.75 else -1.2)
            u = M[i - 1][j] - 0.6; l = M[i][j - 1] - 0.2
            M[i][j] = max(d, u, l); B[i][j] = 0 if M[i][j] == d else (1 if M[i][j] == u else 2)
    i, j = n, m; mp = {}
    while i > 0 or j > 0:
        b = B[i][j]
        if i > 0 and j > 0 and b == 0:
            if sc(S[i - 1], A[j - 1][0]) >= 0.75: mp[i - 1] = j - 1
            i -= 1; j -= 1
        elif i > 0 and (j == 0 or b == 1): i -= 1
        else: j -= 1
    return mp

def satzwoerter(sents):
    """Sollwörter (normalisiert) und zugehöriger Satzindex je Wort."""
    words, sid = [], []
    for k, s in enumerate(sents):
        for w in s.split():
            if norm(w): words.append(norm(w)); sid.append(k)
    return words, sid
