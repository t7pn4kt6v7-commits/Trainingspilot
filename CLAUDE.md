# Trainingspilot – Hinweise für die Weiterentwicklung

## Bei jeder neuen Funktion oder Änderung für Nutzer*innen
1. **„Über Trainingspilot & Funktionen“** (`#about-panel` in `index.html`) inhaltlich anpassen:
   neue Funktionen als Zeile ergänzen, überholte Zeilen ändern oder entfernen.
   Die Zahl der Übungen wird automatisch beim Laden gezählt (`fillAboutCounts`) – keine
   Zahlen fest in den Text schreiben.
2. **Version erhöhen**: `APP_VERSION`, `<title>`, Versions-Badge und Kopfkommentar `Version:`.
3. **Changelog** im Kopfkommentar und **`USER_CHANGELOG`** (erscheint im Update-Hinweis) ergänzen.
   Punkt 2 und 3 in einem Schritt: `node tools/release.mjs bump --log "…" --neu "…"`; den ganzen Ablauf bis
   Test und Produktiv beschreibt der Skill `/freigabe` (`.claude/skills/freigabe/SKILL.md`).
   `node tools/release.mjs check` läuft auch in GitHub Actions und blockiert unstimmige Versionen.
   `USER_CHANGELOG` höchstens 4–6 kurze Punkte, die wichtigsten zuerst, Älteres löschen: Bereits geöffnete Apps
   älterer Versionen lesen die *ganze* Liste aus der Live-Seite und zeigen sie im Update-Fenster (v5.197: unscrollbar, App unbenutzbar).

## Abläufe
- Änderungen gehen per Pull Request gegen `test` (Testumgebung `/test/`), erst nach Freigabe
  per PR `test` → `main` (Produktivumgebung). Details: `UMGEBUNGEN.md`.
- Übungen liegen in `data/exercises/*.json`; nach Änderungen `node tools/exercises.mjs build`
  und `node tools/exercises.mjs check`.
- Übungsdarstellung (seit v5.182): eigenes 3D-Bild (`diagram.scene`) und gegliederter Text
  (`aufbau`, `ablauf`, `regeln`, `leichter`, `schwerer`), Aufbau siehe `data/exercises/README.md`.
  Alle Übungen sind umgestellt; neue Übungen bitte direkt in diesem Format anlegen.
  Begrüßung/Abschluss (`sceneSitzkreis`) und Abschlussspiel (`sceneGameFormat`) nutzen ebenfalls den 3D-Zeichner.
  Nach dem Umstellen alle Bilder ansehen (Überdeckungen, abgeschnittene Beschriftungen).
  Neue oder überarbeitete Übungen über den Agenten `uebungs-autor` (`.claude/agents/uebungs-autor.md`);
  Prüfbilder: `NODE_PATH=$(npm root -g) node tools/uebungsbilder.mjs <id>,<id>`.
- Die vereinfachte Oberfläche hängt am Schalter `UI_V2` in `index.html`; mit `UI_V2 = false`
  muss die alte Oberfläche unverändert funktionieren.
- **Prozesshaus** (`haus.html`, …/Trainingspilot/haus.html): Überblick über Systeme, Abläufe und Konten mit Links.
  Kommen Systeme, Workflows, Konten oder Bereiche hinzu oder fallen weg, dort mitpflegen.
- **Übungskatalog** (`uebungen.html`, …/Trainingspilot/uebungen.html bzw. /test/uebungen.html): alle Übungen mit Bild, Aufbau, Ablauf und
  Material zum Durchgehen, Filter Altersstufe, Schwerpunkt, Halle, neu. Liest `index.html` derselben Umgebung, muss also nicht gepflegt werden.
  Zum Prüfen neuer Übungen durch Menschen (Link im Prozesshaus).
- Auf kleinen Handys prüfen (iPhone SE 320 px, iPhone 13 mini 375 px) und auf dem iPad: keine abgeschnittenen
  Beschriftungen, kein waagerechtes Scrollen. Dafür gibt es den Agenten `mobil-pruefer` bzw.
  `NODE_PATH=$(npm root -g) node tools/mobilpruefung.mjs` (Bericht und Fotos je Gerät und Ansicht).
  Dieselbe Prüfung läuft bei jedem Pull Request als GitHub Action „Mobil-Prüfung“ (Fotos als Download).

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

## Zurückgestellte Ideen (bewusst nicht umgesetzt, Stand v5.212)
Der aktuelle Stand reicht dem Nutzer. Nur auf ausdrücklichen Wunsch wieder aufgreifen.
- **Eigene Adresse statt `t7pn4kt6v7-commits.github.io`:** Die Adresse steht auch auf der WhatsApp-Vorschaukarte
  und wirkt für Erstnutzer wenig vertrauenswürdig. Wege: kostenlose GitHub-Organisation mit eigenem Namen
  (z. B. `trainingspilot.github.io`) oder gekaufte Domain (ca. 10–15 € im Jahr; der Verein hat keine eigene).
  Folgen: Die App zieht um, alte Links und Home-Bildschirm-Symbole müssen neu eingerichtet werden (an der alten
  Adresse Hinweis mit Weiterleitung vorsehen); `og:image`/`og:url` in `index.html` und `plan.html` anpassen.
- **Echter Kurzlink (`…/p/abc123`):** Geht nur mit einem kleinen Speicher/Server (z. B. kostenloses Konto bei
  Cloudflare). Abgelehnt, solange nichts Kosten oder Betriebsaufwand verursachen soll. Ohne Server bleibt der
  Plan im Link (rund 200 Zeichen, `encodeShareLink`).
- **Karte je Plan:** Datum/Dauer auf der Vorschaukarte gehen ohne Server nicht. Grob möglich wäre eine eigene
  Einstiegsseite je Altersklasse.
- **Kein Begleittext beim Teilen:** Mit Text zeigt WhatsApp unter der Karte den ganzen Link (v5.208 → v5.209
  zurückgenommen). Nicht wieder einbauen.
- **Erklärvideo für neue Trainer*innen (zurückgestellt im Nov. 2026):** Mehrere Entwürfe gebaut, Qualität reichte dem
  Nutzer nicht für die App. Vorgaben: neutral (ohne Vereinsbezug), höchstens 3 Minuten, kostenlos, erst iPhone, dann
  Android; App-Einrichtung ausführlich (größte Hürde); DFB/NFV am Anfang nennen; Kapitel zum Überspringen.
  Erkenntnisse: Kostenlose KI-Stimmen (Piper, Chatterbox) klingen monoton oder nuscheln einzelne Wörter,
  Chatterbox hängt an kurze Sätze Kauderwelsch an. Zoom schneidet App-Ränder ab, Abdunkeln um das Tipp-Ziel
  wirkt besser. Aussichtsreichster Weg beim Wiederaufgreifen: Text von einem Menschen einsprechen lassen und das
  Bild an die Aufnahme anpassen. Kapitel-Seite (`video.html`, Sprungmarken, Direktlinks wie `#teilen`) war
  fertig und getestet, wurde wieder entfernt (Stand im Git-Verlauf, Commit 494637b).
