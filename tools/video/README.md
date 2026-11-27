# Erklärvideo – Werkstatt

Das Erklärvideo für neue Trainer*innen entsteht **vollständig aus Daten und Skripten**: Wird die App oder der Text
geändert, lässt sich das Video neu erzeugen, statt es neu zu produzieren. Betreut vom Agenten `video-produzent`
(`.claude/agents/video-produzent.md`, Skill `/erklaervideo`).

## Dateien

| Datei | Aufgabe |
|---|---|
| `drehbuch.json` | Einzige Quelle: Kapitel, Szenen, Sprechtext (`saetze`), benutzte Bedienelemente (`ui`), Abgleich mit „Über Trainingspilot“ (`funktionen`), Stand (`stand.app_version`) |
| `pruefung.mjs` | **Aktualität**: Passt das Drehbuch zur App? (`--technik`: läuft die Werkzeugkette?) |
| `stimme/ausrichten.py` | Menschliche Aufnahme den Sätzen zuordnen → `<szene>.wav` + `zeiten.json` (**bevorzugt**) |
| `stimme/tts_chatterbox.py` | Notlösung: kostenlose KI-Stimme (Chatterbox), gleiche Ausgabe |
| `rahmen.mjs` | Handy-Rahmen, Kopfzeile, Fortschritt, Kapitelkarten als PNG |
| `aufnahme.mjs` | Spielt die echte App (aktuelle `index.html`) in Chromium durch und nimmt jede Szene passend zur Sprachspur auf |
| `schnitt.py` | Überblendungen, Ton, Lautstärke, Kapitelmarken → `erklaervideo.mp4` + `kapitel.json` |

Alles schreibt nach `--out <Ordner>` (Standard: `<tmp>/trainingspilot-video`), nichts davon gehört ins Repository –
außer dem fertigen Video, wenn es freigegeben ist.

## Ablauf (Neuerstellung)

```bash
node tools/video/pruefung.mjs --technik          # 1. Was ist veraltet? Läuft die Technik?
# 2. drehbuch.json anpassen (Text, Szenen, Stand), Länge im Blick: höchstens 180 s
python3 tools/video/stimme/ausrichten.py aufnahme.wav --out $OUT    # 3a. Mensch spricht ein (--text gibt den Text aus)
#   oder: python3 tools/video/stimme/tts_chatterbox.py --out $OUT   # 3b. KI-Stimme (nur Entwurf)
NODE_PATH=$(npm root -g) node tools/video/rahmen.mjs  --out $OUT    # 4.
NODE_PATH=$(npm root -g) node tools/video/aufnahme.mjs --out $OUT   # 5. dauert etwa so lang wie das Video
python3 tools/video/schnitt.py --out $OUT                           # 6. → $OUT/erklaervideo.mp4
```

Danach **Standbilder ansehen** (je Szene eines, Stichworte: abgeschnittene Beschriftungen, falscher Zustand der App,
Abdunkel-Ring auf dem richtigen Knopf) und das Video **vom Nutzer anhören/ansehen lassen**. Erst dann
`stand.app_version` im Drehbuch auf die gezeigte Version setzen.

## Voraussetzungen

- ffmpeg/ffprobe (mit `rubberband`, `xfade`, `loudnorm`), Node ≥ 18, Python 3, Playwright mit Chromium
  (in Claude-Code-Cloud-Sitzungen vorinstalliert, dort `NODE_PATH=$(npm root -g)`).
- Spracherkennung (für `stimme/*`): eigene Python-Umgebung, **nicht** im Repository:
  `python3 -m venv /tmp/fw && /tmp/fw/bin/pip install faster-whisper numpy` (Modell „small“, lädt beim ersten Lauf von
  Hugging Face; `HF_HUB_DISABLE_XET=1` setzen, sonst hängt der Download). Ausführen mit `/tmp/fw/bin/python`.
- Nur für die KI-Stimme zusätzlich: `chatterbox-tts torch torchaudio "setuptools<81"` (sonst ist der Wasserzeichen-
  Baustein `None`). Umgebungsvariable für die Temperatur heißt `TEMPR`, nicht `TEMP`.
- `VIDEO_PYTHON=/tmp/fw/bin/python` setzen, damit `pruefung.mjs --technik` die Sprach-Umgebung mitprüft.
- Alles kostenlos. Nichts hier darf Geld kosten (Vorgabe des Nutzers) – keine bezahlten Stimmen oder Dienste.

## Qualitätsmaßstab (Erkenntnisse aus den Entwürfen bis Nov. 2026)

- **Stimme entscheidet.** KI-Stimmen (Piper, Chatterbox) klingen monoton oder nuscheln einzelne Wörter; Chatterbox hängt
  an kurze Sätze Kauderwelsch an. Deshalb Blöcke ≥ 14 Wörter, Spracherkennung als Gegenprobe, Abschneiden an der letzten
  erkannten Wortgrenze. Ein Erkennungswert sagt aber **nichts über Klang**: Das beurteilt nur ein Mensch. Der
  aussichtsreichste Weg ist ein menschlicher Sprecher (`ausrichten.py`); das Bild wird an die Aufnahme angepasst.
- **Bild folgt Ton:** Jede Handlung der App beginnt, wenn der Satz dazu beginnt (`clock.sentence(k)`).
- **Hervorheben durch Abdunkeln** um das Tipp-Ziel (Ring), nicht durch Zoom – Zoom schneidet App-Ränder ab.
- **Kapitel** mit Karten und Kapitelmarken, jedes einzeln ansehbar; App-Einrichtung (größte Hürde) ausführlich,
  zuerst iPhone, dann Android.
- **Neutral** (ohne Vereinsbezug), **höchstens 3 Minuten**, DFB/NFV am Anfang nennen, Aufhänger statt Begrüßungsfloskel,
  Atempausen zwischen den Blöcken.
- Gezeigte Daten sind Beispieldaten ohne echte Namen.
