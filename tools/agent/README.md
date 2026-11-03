# Übungs-Agent

Der Agent ergänzt die Übungsbibliothek auf Knopfdruck um neue Übungen. Damit geht er die häufigste Kritik der Trainer*innen an, dass sich Übungen zu oft wiederholen. **Nichts geht ungeprüft live:** Jeder Vorschlag kommt als Pull Request, den jemand aus dem Trainerteam freigibt.

## Kosten: Standardmäßig keine

- **Kein Zeitplan.** Der Workflow startet nur, wenn ihn jemand unter *Actions → Übungs-Agent → Run workflow* von Hand auslöst.
- **Standard ist ein kostenloser Probelauf.** Ohne Haken bei „Kostenpflichtige API-Aufrufe erlauben“ liest der Agent nur die Issues und zeigt in der Zusammenfassung, welche Bereiche drankämen. Er ruft die Claude API nicht auf und ändert nichts.
- **Doppelte Sicherung.** Kostenpflichtige Aufrufe brauchen *beide*: den Haken beim Start (bzw. `ALLOW_API_COSTS=1` lokal) **und** ein hinterlegtes `ANTHROPIC_API_KEY`. Ohne Secret kann nie etwas abgerechnet werden.
- **GitHub Actions** sind für öffentliche Repositories kostenlos.

## Internet-Recherche und Umfang

- **Umfang „alle“ (Standard):** Der Agent arbeitet alle Kombinationen aus Altersstufe und Kategorie ab, die die App anbietet. Das sind 63; gesperrte wie Kopfball in der G-Jugend fehlen. Für die F-/E-Jugend legt er dabei auch eigene Übungen in Kategorien an, die bisher nur den G-Jugend-Pool nutzen. Pro Lauf übernimmt er `max_new` Kombinationen: zuerst die mit Rückmeldungen oder kleinem Pool, dann die mit den wenigsten bisher ergänzten Übungen. Mehrere Läufe decken so nach und nach alles ab.
- **Umfang „bedarf“:** nur Bereiche mit Rückmeldungen oder weniger als 4 Übungen.
- **Internet-Recherche (Standard: an):** Vor jeder Übung sucht Claude im Internet nach passenden Übungsideen. Dafür nutzt er die serverseitige Websuche und den Seitenabruf der Claude API, mit Vorrang für DFB, Landesverbände, fussball.de und Trainerausbildung. Das Ergebnis ist eine kurze Ideenliste mit Quellen.
- **Aus der Recherche wird eine eigene Übung.** Claude übernimmt die Spielidee, formuliert aber alles selbst neu und passt es an die Regeln der Bibliothek an: Alter, Sicherheit, vorhandenes Material, Formeln. Wörtliche Übernahmen sind ausgeschlossen, damit keine fremden Texte im Repository landen.
- **Quellen:** Sie stehen im Pull Request und im Feld `sources` der Übung; die App zeigt sie nicht an. Übernommen werden nur Adressen, die tatsächlich in der Recherche vorkamen, erfundene Links verwirft der Agent.
- **Webinhalte sind nicht vertrauenswürdig.** Sie gelangen nur als gekennzeichnete Zitate zu Claude. Die Ausgabe bleibt auf das feste Schema beschränkt und wird geprüft; ein Mensch gibt frei.

## Ablauf

```
Trainer*in in der App            GitHub                         Übungs-Agent (GitHub Action)
─────────────────────            ──────                         ────────────────────────────
💬 Feedback senden        ──▶   Issue (vorausgefüllt)   ──▶   1. offene Issues lesen
🔁 Kommt zu oft dran      ──▶   Issue                         2. dringendste Bereiche wählen
💡 Neue Übung vorschlagen ──▶   Issue                         3. Internet-Recherche, dann je Bereich 1 eigene Übung mit Claude
                                                                4. automatisch prüfen (Formeln, Skizze, Duplikate)
                                 Pull Request          ◀──     5. data/exercises + index.html, PR-Text
Trainerteam prüft & merged ──▶  App zeigt 🆕 Übung
```

**Welche Bereiche kommen dran?** Jede Kombination aus Altersstufe und Kategorie bekommt Punkte:

| Grund | Punkte |
|---|---|
| Je Vorschlag „neue Übung“ | 5 |
| Je „kommt zu oft dran“ | 4 |
| Je 👎 | 2 |
| Je sonstige Rückmeldung | 1 |
| Kleiner Pool (unter 4 Übungen) | 3 je fehlende Übung |

Die Bereiche mit den meisten Punkten bekommen je eine neue Übung, höchstens `MAX_NEW` (Standard: 4).

**Wohin die Vorschläge gehen:** Gibt es den Branch `test`, öffnet der Agent seinen Pull Request gegen `test`. Die Übungen landen also zuerst in der Testumgebung, siehe `UMGEBUNGEN.md`.

**Was der Agent nicht tut:** Er ändert oder löscht keine bestehenden Übungen. Übungen mit wiederholter Kritik listet er nur im PR-Text auf. Solange ein Agent-PR offen ist, startet er keinen neuen Lauf.

**Neue Übungen in der App:** Sie tragen 60 Tage lang das Abzeichen „🆕 Neu im Trainingspilot“ und werden in dieser Zeit doppelt so oft vorgeschlagen.

## Einrichtung (einmalig)

Für den kostenlosen Probelauf ist nichts einzurichten: *Actions → Übungs-Agent → Run workflow*, ohne Haken.

Nur falls später doch Übungen erzeugt werden sollen (kostenpflichtig):

1. **API-Schlüssel:** Unter https://console.anthropic.com einen API-Schlüssel erstellen. Ihn im Repository unter *Settings → Secrets and variables → Actions → New repository secret* als `ANTHROPIC_API_KEY` speichern. In der Console lässt sich zusätzlich ein monatliches Ausgabelimit setzen.
2. **Pull Requests durch Actions erlauben:** *Settings → Actions → General → Workflow permissions* auf „Read and write permissions“ stellen und „Allow GitHub Actions to create and approve pull requests“ anhaken.
3. **Lauf starten** mit Haken bei „Kostenpflichtige API-Aufrufe erlauben“.

**Rückmeldungen ohne GitHub-Konto:** Trainer*innen brauchen ein kostenloses GitHub-Konto, um Issues zu öffnen. Ohne Konto bleibt in der App der Link „Per E-Mail senden“. Solche Mails liest der Agent nicht; wer sie bekommt, kann sie über das Formular *Issues → New issue → Rückmeldung zu einer Übung* übertragen.

## Kosten eines freigegebenen Laufs

Mit Internet-Recherche kommen pro Übung bis zu 5 Websuchen (10 $ je 1.000 Suchen) und das Lesen gefundener Seiten dazu. Das sind deutlich mehr Eingabe-Token, grob 0,50 bis 1 $ pro Übung. Alle 63 Kombinationen einmal abzuarbeiten kostet damit grob 30 bis 60 $. Am besten in Etappen, etwa 4 bis 8 pro Lauf, das bleibt auch beim Prüfen der Pull Requests übersichtlich.

Ohne Recherche gilt: Ein Lauf macht bis zu `MAX_NEW` Anfragen an Claude Opus 5.5, bei einem ungültigen Ergebnis je eine Korrekturrunde. Das sind grob 10.000 bis 20.000 Eingabe- und bis zu 16.000 Ausgabe-Token pro Übung. Ein Lauf mit vier Übungen kostet grob im Bereich von einem Euro. Die tatsächlichen Werte stehen in der Anthropic-Console unter *Usage*.

## Sicherheit

- **Issue-Texte sind nicht vertrauenswürdig.** Im öffentlichen Repository kann jede*r Issues öffnen. Der Agent gibt sie Claude nur als gekennzeichnete Zitate weiter, mit der Anweisung, sie als Daten zu behandeln.
- **Keine Code-Ausführung über Übungen.** Die Ausgabe ist auf ein festes Schema beschränkt. Formeln laufen durch die eingeschränkte Formelsprache der App, beliebiger Code ist nicht möglich.
- **Ein Mensch gibt frei.** Jeder Vorschlag geht als Pull Request durch die Prüfung im Trainerteam.
- **Sparsame Rechte.** Der Workflow darf Issues nur lesen. Er schreibt ausschließlich auf eigene `agent/…`-Branches.
- **Fallback bei Ablehnung:** Der Agent nutzt das serverseitige Fallback der Claude API (`fallbacks: "default"`). Lehnt das Modell eine Anfrage aus Richtliniengründen ab, versucht es automatisch ein anderes Modell.

## Lokal ausführen

```bash
npm ci --prefix tools/agent
node tools/agent/test.mjs                           # Tests ohne API-Aufrufe
GITHUB_REPOSITORY=t7pn4kt6v7-commits/Trainingspilot node tools/agent/run.mjs   # Probelauf, kostenlos
ALLOW_API_COSTS=1 ANTHROPIC_API_KEY=… GITHUB_REPOSITORY=… MAX_NEW=1 node tools/agent/run.mjs  # kostenpflichtig
```

| Variable | Bedeutung |
|---|---|
| `MAX_NEW` | Höchstzahl neuer Übungen (Standard 4) |
| `ALLOW_API_COSTS=1` | Kostenpflichtige API-Aufrufe erlauben (sonst immer Probelauf) |
| `UMFANG` | `alle` (alle Altersstufen und Kategorien) oder `bedarf` (Standard lokal: `bedarf`) |
| `RECHERCHE=0` | Internet-Recherche abschalten (Standard: an) |
| `DRY_RUN=1` | Erzwingt den Probelauf, auch mit Freigabe |
| `AGENT_MODEL` | Modell (Standard `claude-opus-5-5`) |
| `AGENT_SUMMARY_FILE` | Wohin der PR-Text geschrieben wird |

**Hinweis:** Pull Requests, die der Workflow mit dem Standard-Token öffnet, lösen keine weiteren Workflows aus. Die Prüfung `node tools/exercises.mjs check` läuft deshalb im Agent-Lauf selbst, bevor der PR geöffnet wird.
