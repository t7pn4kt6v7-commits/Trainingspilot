# Dateien für „Als App installieren“ (Android)

Diese Dateien veröffentlicht `pages.yml` neben der `index.html`, also in die Produktivumgebung
(`/`) und in die Testumgebung (`/test/`). In der Testumgebung erhält das Manifest automatisch
den Namen „Trainingspilot TEST“, damit beide Apps auf dem Handy unterscheidbar sind.

- `manifest.webmanifest`: Name, Farben und Symbole der installierten App
- `icon-*.png`: App-Symbole, erzeugt aus dem Vereinswappen (180 px, daher leicht weich skaliert)
- `share-preview.png`: Vorschaubild (1200 × 630) für Link-Vorschauen, z. B. in WhatsApp (`og:image` in `index.html`).
  WhatsApp merkt sich Vorschauen; nach einer Änderung hilft ein Link mit Zusatz, z. B. `…/Trainingspilot/?v=2`.
- `sw.js`: Service Worker ohne Zwischenspeicher. Chrome verlangt für den Installieren-Knopf einen
  Service Worker mit `fetch`-Handler; dieser reicht jede Anfrage unverändert ans Netz weiter.

Zurücknehmen: `<link rel="manifest">` und die Registrierung in `index.html` entfernen. Ein bereits
registrierter Service Worker bleibt harmlos (er speichert nichts), kann aber mit
`navigator.serviceWorker.getRegistrations()` und `unregister()` entfernt werden.
