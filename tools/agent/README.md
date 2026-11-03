# Übungs-Agent

Der Agent ergänzt die Übungsbibliothek jede Woche um neue Übungen. Damit geht er die häufigste Kritik der Trainer*innen an, dass sich Übungen zu oft wiederholen. **Nichts geht ungeprüft live:** Jeder Vorschlag kommt als Pull Request, den jemand aus dem Trainerteam freigibt.

## Ablauf (montags 04:17 UTC)

```
Trainer*in in der App            GitHub                         Übungs-Agent (GitHub Action)
─────────────────────            ──────                         ────────────────────────────
💬 Feedback senden        ──▶   Issue (vorausgefüllt)   ──▶   1. offene Issues lesen
🔁 Kommt zu oft dran      ──▶   Issue                         2. dringendste Bereiche wählen
💡 Neue Übung vorschlagen ──▶   Issue                         3. je Bereich 1 Übung mit Claude
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

**Was der Agent nicht tut:** Er ändert oder löscht keine bestehenden Übungen. Übungen mit wiederholter Kritik listet er nur im PR-Text auf. Solange ein Agent-PR offen ist, startet er keinen neuen Lauf.

**Neue Übungen in der App:** Sie tragen 60 Tage lang das Abzeichen „🆕 Neu im Trainingspilot“ und werden in dieser Zeit doppelt so oft vorgeschlagen.

## Einrichtung (einmalig)

1. **API-Schlüssel:** Unter https://console.anthropic.com einen API-Schlüssel erstellen. Ihn im Repository unter *Settings → Secrets and variables → Actions → New repository secret* als `ANTHROPIC_API_KEY` speichern.
2. **Pull Requests durch Actions erlauben:** *Settings → Actions → General → Workflow permissions* auf „Read and write permissions“ stellen und „Allow GitHub Actions to create and approve pull requests“ anhaken.
3. **Erster Test:** *Actions → Übungs-Agent → Run workflow* mit „Probelauf“ starten. Der Lauf zeigt, welche Bereiche drankämen, ohne API-Kosten und ohne PR. Danach einmal ohne Probelauf starten.

**Rückmeldungen ohne GitHub-Konto:** Trainer*innen brauchen ein kostenloses GitHub-Konto, um Issues zu öffnen. Ohne Konto bleibt in der App der Link „Per E-Mail senden“. Solche Mails liest der Agent nicht; wer sie bekommt, kann sie über das Formular *Issues → New issue → Rückmeldung zu einer Übung* übertragen.

## Kosten

Ein Lauf macht bis zu `MAX_NEW` Anfragen an Claude Opus 5.5, bei einem ungültigen Ergebnis je eine Korrekturrunde. Das sind grob 10.000 bis 20.000 Eingabe- und bis zu 16.000 Ausgabe-Token pro Übung. Bei vier Übungen pro Woche liegen die Kosten im Bereich weniger Euro im Monat. Die tatsächlichen Werte stehen in der Anthropic-Console unter *Usage*.

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
DRY_RUN=1 GITHUB_REPOSITORY=t7pn4kt6v7-commits/Trainingspilot node tools/agent/run.mjs
ANTHROPIC_API_KEY=… GITHUB_REPOSITORY=… MAX_NEW=1 node tools/agent/run.mjs
```

| Variable | Bedeutung |
|---|---|
| `MAX_NEW` | Höchstzahl neuer Übungen (Standard 4) |
| `DRY_RUN=1` | Nur planen, keine API-Aufrufe |
| `AGENT_MODEL` | Modell (Standard `claude-opus-5-5`) |
| `AGENT_SUMMARY_FILE` | Wohin der PR-Text geschrieben wird |

**Hinweis:** Pull Requests, die der Workflow mit dem Standard-Token öffnet, lösen keine weiteren Workflows aus. Die Prüfung `node tools/exercises.mjs check` läuft deshalb im Agent-Lauf selbst, bevor der PR geöffnet wird.
