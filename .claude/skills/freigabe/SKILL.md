---
name: freigabe
description: Fester Ablauf, um eine Änderung am Trainingspilot fertigzustellen und auszuliefern – Version und Neuigkeiten setzen, prüfen, Pull Request in die Testumgebung, und nach ausdrücklicher Freigabe des Nutzers nach Produktiv. Verwenden, sobald eine Änderung für Nutzer*innen fertig ist oder der Nutzer „Freigabe für Prod“ erteilt.
---

# Freigabe-Ablauf Trainingspilot

Zwei Teile: **A** bringt eine fertige Änderung in die Testumgebung, **B** bringt den Stand von `test` nach Produktiv.
B nur, wenn der Nutzer es ausdrücklich freigibt („Freigabe für Prod“, „bring es nach Prod“ o. ä.). Eine Freigabe gilt
nur für den Stand, den er gesehen hat.

Feste Vorgabe des Nutzers: Nichts ausführen, was Kosten verursacht.

## A · Änderung in die Testumgebung

1. **Nur bei Änderungen für Nutzer*innen** (alles in `index.html`, was man in der App sieht oder merkt):
   - `#about-panel` („Über Trainingspilot & Funktionen“) inhaltlich prüfen: neue Funktion als Zeile ergänzen,
     Überholtes ändern oder löschen. Keine Übungszahlen fest eintragen.
   - Version, Kopf-Changelog und Neuigkeiten in einem Schritt setzen:
     ```
     node tools/release.mjs bump --log "Was sich technisch ändert (für Entwickler)" --neu "Kurzer Punkt für Nutzer*innen"
     ```
     `--neu` darf mehrfach vorkommen, wichtigster Punkt zuerst. Kurz und verständlich, ohne Technikbegriffe.
     Kleine Korrekturen ohne spürbaren Nutzen bekommen kein `--neu`. Das Skript hält die Liste bei höchstens 6 Punkten.
   - Reine Werkzeug-, Dokumentations- oder Workflow-Änderungen bekommen **keine** neue Version.
2. **Prüfen** (alles muss grün sein):
   - `node tools/release.mjs check`
   - bei Übungsänderungen: `node tools/exercises.mjs build` und `node tools/exercises.mjs check`, neue Bilder ansehen
   - bei Änderungen an der Oberfläche: Agent `mobil-pruefer` (oder direkt
     `NODE_PATH=$(npm root -g) node tools/mobilpruefung.mjs` und die Fotos ansehen) – iPhone SE, iPhone 13 mini,
     iPad und die alte Oberfläche (`UI_V2 = false`). Befunde vor dem Pull Request beheben.
3. **Ausliefern in Test:** auf dem Arbeitsbranch committen und pushen, Pull Request **gegen `test`** öffnen
   (Titel mit Version, z. B. „v5.213: …“). Checks abwarten (nicht mit `sleep` pollen, sondern Monitor), dann
   **squash** mergen. Steht der Arbeitsbranch hinter `test`, vorher `git rebase origin/test`.
4. **Melden:** Version und Testadresse https://t7pn4kt6v7-commits.github.io/Trainingspilot/test/ nennen, sagen was
   zu prüfen ist, und nach der Freigabe für Produktiv fragen. Die Veröffentlichung dauert 1–2 Minuten.

## B · Freigabe nach Produktiv (nur nach ausdrücklicher Freigabe)

1. Vorher kurz prüfen, ob Testfunktionen nicht mitgehen dürfen (z. B. „Signal testen“ ist nur für die Testumgebung).
2. Pull Request **`test` → `main`** öffnen, Checks abwarten, mit **merge** (nicht squash) zusammenführen.
3. Nach 1–2 Minuten bestätigen, dass Produktiv die neue Version zeigt
   (https://t7pn4kt6v7-commits.github.io/Trainingspilot/ bzw. das Prozesshaus `haus.html`), und dem Nutzer melden.
   Handys zeigen beim nächsten Öffnen den Update-Hinweis mit den Neuigkeiten.

## Sonderfall: dringender Fehler in Produktiv

Kleine Korrektur per Pull Request direkt gegen `main`, danach `main` → `test` zurückführen (siehe `UMGEBUNGEN.md`).

## Typische Fehler, die dieser Ablauf verhindert

- Version nur an einer Stelle erhöht (Update-Hinweis erscheint nicht oder falsch) – `release.mjs check` läuft
  auch in GitHub Actions und blockiert die Veröffentlichung.
- Zu lange Neuigkeiten-Liste: Ältere, noch geöffnete Apps zeigen sie ganz an; mit über 30 Punkten war das
  Update-Fenster nicht mehr scrollbar und die App unbenutzbar (v5.197).
- Änderung direkt nach Produktiv ohne Test oder ohne Freigabe.
