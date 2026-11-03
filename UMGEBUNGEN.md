# Test- und Produktivumgebung

| Umgebung | Branch | Adresse | Wer nutzt sie |
|---|---|---|---|
| **Produktiv** | `main` | https://t7pn4kt6v7-commits.github.io/Trainingspilot/ | alle Trainer*innen |
| **Test** | `test` | https://t7pn4kt6v7-commits.github.io/Trainingspilot/test/ | wer neue Versionen ausprobiert |

Die Testversion erkennt man am roten Balken **„TESTUMGEBUNG“** oben und an „[TEST]“ im Titel. Ihre gespeicherten Pläne, Bewertungen und Verläufe sind von der echten App getrennt. Auf demselben Handy kann man also beide nutzen, ohne dass Testdaten in der echten App auftauchen.

## Ablauf

```
Änderung (Claude, Übungs-Agent, Hand)
        │  Pull Request gegen test
        ▼
   Branch test ──► automatische Prüfung ──► Testumgebung …/Trainingspilot/test/
        │                                    (beliebig oft ausprobieren)
        │  wenn alles passt: ein Pull Request test → main („Gesamtpaket“)
        ▼
   Branch main ──► automatische Prüfung ──► Produktiv …/Trainingspilot/
```

1. **Alle Änderungen gehen zuerst nach `test`.** Pull Requests werden gegen `test` geöffnet, nicht gegen `main`. Das gilt auch für den Übungs-Agenten.
2. **Testen** unter …/Trainingspilot/test/, auf dem Handy und gern vom ganzen Trainerteam.
3. **Freigeben:** Wenn das Gesamtpaket passt, einen Pull Request von `test` nach `main` öffnen und zusammenführen. Danach ist alles produktiv, und die Handys zeigen beim nächsten Öffnen den Update-Hinweis.

Veröffentlicht wird nur, was die automatische Prüfung (`node tools/exercises.mjs check` und Agent-Tests) bestanden hat. Das erledigt der Workflow `.github/workflows/pages.yml`.

## Einmalige Einrichtung

1. **Pages auf GitHub Actions umstellen:** *Settings → Pages → Build and deployment → Source* auf **„GitHub Actions“** stellen. Bis dahin veröffentlicht GitHub `main` wie bisher automatisch, und der neue Workflow schlägt fehl.
2. **Branch `test` anlegen:** Er wird einmal aus `main` erstellt (`git push origin main:test`). Claude kann das übernehmen.
3. **Empfohlen: `main` schützen.** Unter *Settings → Branches → Add branch protection rule* für `main` „Require a pull request before merging“ aktivieren. Dann kann niemand versehentlich direkt auf `main` hochladen, etwa per „Add file → Upload files“.

## Hinweise

- **Testversion neu veröffentlichen:** Steht nach dem Anlegen von `test` noch keine Testversion online, unter *Actions → Veröffentlichen (Produktiv + Test) → Run workflow* einmal von Hand starten.
- **Fehler in der Testversion:** Schlägt die Prüfung für `test` fehl, bleibt die zuletzt veröffentlichte Testversion stehen. Produktiv ist davon nicht betroffen.
- **Dringender Fehler in Produktiv:** Eine kleine Korrektur darf ausnahmsweise per Pull Request direkt gegen `main` gehen. Danach `main` in `test` übernehmen (Pull Request `main` → `test`), damit beide wieder gleich sind.
