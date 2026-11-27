---
name: erklaervideo
description: Ablauf, um das Erklärvideo des Trainingspilot auf den neuesten Stand zu bringen – Aktualität prüfen, Drehbuch anpassen, Sprachspur, Aufnahme, Schnitt, Ansehen, Abnahme durch den Nutzer. Verwenden bei „Erklärvideo aktualisieren/neu machen“, nach Änderungen an der Oberfläche oder wenn die Aktion „Video-Aktualität“ Hinweise meldet.
---

# Erklärvideo aktualisieren

Die Arbeit macht der Agent `video-produzent` (`.claude/agents/video-produzent.md`); Werkzeuge und Qualitätsmaßstab stehen in
`tools/video/README.md`. Dieser Skill ist der Rahmen für die Hauptsitzung.

1. **Lage klären:** `node tools/video/pruefung.mjs --technik` (`NODE_PATH=$(npm root -g)`). Fehler müssen weg, Hinweise bewerten.
2. **Agent `video-produzent` beauftragen** mit dem konkreten Ziel (z. B. „Halle ins Video aufnehmen“, „Video auf v5.230 bringen“).
   Er ändert nur `tools/video/` (Drehbuch, Choreografie, README), erzeugt das Video in einem Ordner außerhalb des
   Repositorys und prüft jede Szene als Bild.
3. **Nutzer abnehmen lassen:** Video (mp4) mit `SendUserFile` schicken. Klang und Gesamteindruck beurteilt nur der Nutzer.
   Hat er einen Sprecher/eine Sprecherin, geht die Aufnahme durch `stimme/ausrichten.py`. Nie behaupten, die Stimme sei gut.
4. **Erst nach Zusage:** `stand.app_version` im Drehbuch setzen, Änderungen per Pull Request nach `test` (Ablauf `/freigabe`).
   Das Einbinden in die App (Player, Link, Dateigröße) ist ein eigener Auftrag und braucht die Zusage des Nutzers.
5. Das Video gehört nur dann ins Repository, wenn der Nutzer es freigegeben hat; Zwischenstände bleiben im Scratchpad.
