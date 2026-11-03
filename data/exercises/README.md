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

`"fn"` ist einer der Standard-Bausteine `diagramScatter`, `diagramCircle`, `diagramStations`, `diagramGame` oder `diagramParcours`. Die Optionen stehen bei der jeweiligen Funktion in `index.html`. Frei gezeichnete Skizzen (`{ "custom": "<id>" }`) liegen als Code in `CUSTOM_DIAGRAMS` in `index.html`. Sie sind Einzelfälle, neue Übungen nutzen die Standard-Bausteine.
