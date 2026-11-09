# Übungsbibliothek

Hier liegen alle Übungen des Trainingspiloten als Daten, eine Datei je Altersstufe:

| Datei | Altersstufe |
|---|---|
| `jung.json` | G-Jugend (U6/U7) |
| `mittel.json` | F- und E-Jugend (U8–U11). Kategorien, die hier fehlen, kommen aus `jung.json`. Zusätzlich ergänzt die App jede Kategorie um die G-Jugend-Übungen. |
| `alt.json` | D-Jugend (U12/U13) |
| `c.json`, `b.json`, `a.json` | C-, B- und A-Jugend |

Die App liest diese Dateien **nicht** direkt. Eine Kopie ist in `index.html` eingebettet, damit die App als einzelne Datei funktioniert (offline, per WhatsApp geteilt).

## Ablauf bei Änderungen

```bash
# 1. JSON-Datei bearbeiten
# 2. In index.html einbetten
node tools/exercises.mjs build
# 3. Prüfen (läuft auch automatisch bei jedem Push/Pull Request)
node tools/exercises.mjs check
# 4. JSON-Datei UND index.html committen
```

Wird `index.html` von Hand oder anderswo bearbeitet, darf der Block zwischen `EXERCISE_DATA_START` und `EXERCISE_DATA_END` nicht angefasst werden. Er wird bei jedem `build` überschrieben.

## Aufbau einer Übung

```json
{
  "id": "dribbel-zoo",
  "title": "Dribbel-Zoo",
  "goal": "Ziel: Ballkontrolle, jedes Kind mit eigenem Ball in Bewegung",
  "desc": "Ablauf in ganzen Sätzen …",
  "coachTip": "Ein konkreter Tipp für die Trainer*in.",
  "materials": "{k} Bälle · {min(6, ceil(k/3))} Hütchen",
  "dims": "{fieldDims(10, 0.5, k)}",
  "diagram": {
    "fn": "diagramScatter",
    "args": ["=min(k, 16)", { "withBall": true, "cones": "=min(6, ceil(k/3))", "caption": "Freies Dribbeln zwischen Hütchen" }]
  }
}
```

| Feld | Bedeutung |
|---|---|
| `id` | Eindeutig je Altersstufe, nur `a-z`, `0-9`, `-`. Bleibt dauerhaft gleich. |
| `title` | Eindeutig je Kategorie. **Nicht umbenennen**, denn Bewertungen (👍/👎) und der Wiederholungsschutz hängen am Titel. |
| `goal` | Beginnt mit `Ziel: `. |
| `desc`, `coachTip` | Freitext. |
| `materials` | Textvorlage. Mehrere Gegenstände mit ` · ` trennen und jeden mit einer Menge beginnen, damit die Materialübersicht sie zusammenfassen kann. |
| `dims` | Textvorlage für Feldgröße oder Stationen. |
| `diagram` | Skizze, siehe unten. |
| `custom` | Optional `true`: Übung wurde von einer Trainer*in vorgeschlagen (Badge 👥). |
| `aufbau`, `ablauf`, `regeln` | Gegliederter Text (seit v5.182, Listen kurzer Sätze). `ablauf` sind die nummerierten Schritte, die Nummern müssen zu den Schritten im Bild passen. Mit `ablauf` entfällt `desc`. Nur `<b>…</b>` als Auszeichnung (z. B. für Rollen **A**, **V**). Keine Feldgrößen hineinschreiben, die stehen schon in `dims`. |
| `leichter`, `schwerer` | Je ein Satz, wie die Übung leichter bzw. schwerer wird. |

### Formeln

In Textvorlagen steht eine Formel in `{…}`. In Skizzen-Argumenten ist jeder String, der mit `=` beginnt, eine Formel. Alles andere wird wörtlich übernommen. `k` ist die Zahl der Kinder.

Erlaubt sind Zahlen, `'Text'`, `k`, `+ - * / %`, Vergleiche (`=== !== > < >= <=`), `a ? b : c`, Klammern, `.a`/`.b` (z. B. `teamSplit(k).a`) und diese Funktionen:

| Funktion | Ergebnis |
|---|---|
| `ceil`, `floor`, `round`, `min`, `max`, `abs`, `clamp(v, min, max)` | Rechnen |
| `parallelFields(k, kinderProFeld)` | Anzahl paralleler Felder (berücksichtigt die Trainerzahl) |
| `stationCount(k)` | Anzahl Stationen (1–4) |
| `stationLabel(n)`, `fieldLabel(n)` | „3 Stationen“, „2 Felder“ |
| `fieldDims(minSeite, proKind, k)`, `fieldWidthMeters(…)` | „ca. 18 × 13 m“ bzw. Meter |
| `pylonCountForBoundary(breite)` | Pilonen für die Feldmarkierung |
| `teamSplit(k)` | `{ a, b }` Teamgrößen |

Beliebiger JavaScript-Code ist bewusst nicht möglich.

### Skizzen

**Seit v5.182 (empfohlen): eigenes Bild in 3D-Perspektive** mit `{ "scene": { … } }`. Koordinaten in Metern, `x` = Länge (Spielrichtung links → rechts), `y` = Tiefe (vorne → hinten):

```json
{ "scene": { "w": 15, "l": 8, "caption": "A = Angreifer*in · V = Verteidiger*in",
  "lines": [{ "x1": 5, "y1": 8, "x2": 5, "y2": 0, "dash": true, "label": "1 Punkt" }],
  "zones": [{ "x": 0, "y": 0, "w": 3, "h": 8, "label": "ZONE" }],
  "items": [{ "t": "p", "x": 1, "y": 4, "team": "b", "label": "A" }, { "t": "ball", "x": 1.6, "y": 3.8 },
            { "t": "cone", "x": 5, "y": 0 }, { "t": "goal", "x": 15, "y": 4, "dir": "w" }],
  "moves": [{ "t": "dribble", "from": [1.8, 3.8], "to": [8, 2], "step": 1 }] } }
```

Figuren `p` (`team`: `b` blau, `r` rot, `y` Torhüter*in, `t` Trainer*in, `w` neutral; optional `label`, `say` = Sprechblase, `step`, `arms`, `tail`), `cone` (`tall`, `fallen`, `color`), `ball` (`z` = Höhe), `goal` (`dir` = Richtung der Öffnung `n`/`s`/`e`/`w`, optional `w`/`h`/`d` in Metern für Kleinfeldtore), `ladder` (`len`). Wege `moves`: `pass` (gerade), `dribble` (Wellenlinie), `run` (gestrichelt, ohne Ball); optional `step` (gelbe Nummer), `at` (Position der Nummer 0–1), `bend`, `arc` (Flugbahn). Weitere Optionen: `noField`, `objScale`, `margin`. Wichtig beim Zeichnen: Figuren vorne verdecken Dinge dahinter – Trainer*innen an den hinteren Rand stellen.

Ältere Übungen nutzen noch die Standard-Bausteine: `"fn"` ist einer der Standard-Bausteine `diagramScatter`, `diagramCircle`, `diagramStations`, `diagramGame` oder `diagramParcours`. Die Optionen stehen bei der jeweiligen Funktion in `index.html`. Frei gezeichnete Skizzen (`{ "custom": "<id>" }`) liegen als Code in `CUSTOM_DIAGRAMS` in `index.html`. Sie sind Einzelfälle, neue Übungen nutzen die Standard-Bausteine.
