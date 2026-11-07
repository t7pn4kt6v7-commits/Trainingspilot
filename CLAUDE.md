# Trainingspilot – Hinweise für die Weiterentwicklung

## Bei jeder neuen Funktion oder Änderung für Nutzer*innen
1. **„Über Trainingspilot & Funktionen“** (`#about-panel` in `index.html`) inhaltlich anpassen:
   neue Funktionen als Zeile ergänzen, überholte Zeilen ändern oder entfernen.
   Die Zahl der Übungen wird automatisch beim Laden gezählt (`fillAboutCounts`) – keine
   Zahlen fest in den Text schreiben.
2. **Version erhöhen**: `APP_VERSION`, `<title>`, Versions-Badge und Kopfkommentar `Version:`.
3. **Changelog** im Kopfkommentar und **`USER_CHANGELOG`** (erscheint im Update-Hinweis) ergänzen.

## Abläufe
- Änderungen gehen per Pull Request gegen `test` (Testumgebung `/test/`), erst nach Freigabe
  per PR `test` → `main` (Produktivumgebung). Details: `UMGEBUNGEN.md`.
- Übungen liegen in `data/exercises/*.json`; nach Änderungen `node tools/exercises.mjs build`
  und `node tools/exercises.mjs check`.
- Die vereinfachte Oberfläche hängt am Schalter `UI_V2` in `index.html`; mit `UI_V2 = false`
  muss die alte Oberfläche unverändert funktionieren.
- Auf kleinen Handys prüfen (iPhone SE 320 px, iPhone 13 mini 375 px): keine abgeschnittenen
  Beschriftungen, kein waagerechtes Scrollen.
