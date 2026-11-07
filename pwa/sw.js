// Trainingspilot – Service Worker nur für die Installierbarkeit unter Android (Chrome).
// Er speichert NICHTS zwischen: jede Anfrage geht unverändert ans Netz. So bleiben
// Update-Prüfung und neue Übungen exakt wie ohne Service Worker.
self.addEventListener('install', function(){ self.skipWaiting(); });
self.addEventListener('activate', function(event){ event.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', function(event){
  if(event.request.method !== 'GET'){ return; }
  event.respondWith(fetch(event.request));
});
