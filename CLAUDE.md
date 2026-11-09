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
- Übungsdarstellung (seit v5.182): eigenes 3D-Bild (`diagram.scene`) und gegliederter Text
  (`aufbau`, `ablauf`, `regeln`, `leichter`, `schwerer`), Aufbau siehe `data/exercises/README.md`.
  Umgestellt: G-Jugend (`jung.json`), F-/E-Jugend (`mittel.json`). Die übrigen Altersstufen folgen paketweise.
  Nach dem Umstellen alle Bilder ansehen (Überdeckungen, abgeschnittene Beschriftungen).
- Die vereinfachte Oberfläche hängt am Schalter `UI_V2` in `index.html`; mit `UI_V2 = false`
  muss die alte Oberfläche unverändert funktionieren.
- Auf kleinen Handys prüfen (iPhone SE 320 px, iPhone 13 mini 375 px): keine abgeschnittenen
  Beschriftungen, kein waagerechtes Scrollen.

## Gestaltung (UI_V3, seit v5.177)
- Schalter `UI_V3` in `index.html` (nur zusammen mit `UI_V2`); `false` = Gestaltung von v5.176.
- **Symbole:** Linien-Symbole aus Lucide (ISC-Lizenz), eingebettet in `V3_ICONS`. Neue Knöpfe dürfen
  ein Emoji am Textanfang haben – `v3Decorate` ersetzt es über `V3_LEAD` durch das passende Symbol;
  neue Emojis dort eintragen. In `<option>`-Texten keine Emojis (dort sind keine Symbole möglich).
- **Schwerpunkte:** Symbol und Farbe je Kategorie in `V3_CAT` bzw. `--c-…` (CSS). Ein neuer
  Schwerpunkt braucht dort einen Eintrag.
- **Farben mit fester Rolle:** Orange nur für die Hauptaktion, Gelb für Auswahl/Hervorhebung,
  Grün für Flächen, Schwarz als Seitenhintergrund. Rundungen: 10 / 14 / 20 px und Pille.
- **Schrift:** Blockschrift (Anton) nur für „Trainingspilot“, sonst Work Sans in normaler Schreibung.
