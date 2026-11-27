// Figur „Coach“ (Karikatur einer älteren Trainerlegende mit Schiebermütze und Trillerpfeife; der Spruch auf dem Shirt
// steht auch auf der Bande im Titelbild der App). Liefert SVG-Text; Schriften (Anton, Work Sans) lädt die einbettende Seite.
// Posen: zeigen · karte · winken. Vorschau: node tools/video/figur.mjs [datei.png]  (braucht Playwright)
const SK = '#f7dfc4', INK = '#1d1d1b', SW = 3.4, BODY = '#3d4a40';
const ln = `stroke="${INK}" stroke-width="${SW}" stroke-linecap="round" stroke-linejoin="round"`;
const hand = (x, y, extra = '') => `<circle cx="${x}" cy="${y}" r="13" fill="${SK}" ${ln}/>${extra}`;
const arm = {
  zeigen: `<path d="M172 218 C206 210 240 186 264 156" fill="none" stroke="${BODY}" stroke-width="22" stroke-linecap="round"/><path d="M172 218 C206 210 240 186 264 156" fill="none" ${ln} stroke-width="1" opacity="0"/>${hand(268, 150, `<path d="M276 142 L292 128" ${ln} fill="none" stroke-width="6"/>`)}`,
  karte: `<path d="M172 218 C214 224 246 190 248 148" fill="none" stroke="${BODY}" stroke-width="22" stroke-linecap="round"/>${hand(248, 138)}<rect x="238" y="92" width="20" height="32" rx="3" fill="#F2B134" ${ln} transform="rotate(8 248 108)"/>`,
  winken: `<path d="M172 218 C210 212 240 188 244 146" fill="none" stroke="${BODY}" stroke-width="22" stroke-linecap="round"/>${hand(246, 136, `<path d="M236 124 L230 108 M246 122 L246 104 M256 124 L262 108" ${ln} fill="none" stroke-width="5"/>`)}`,
};
// Stil angelehnt an Loriots Zeichnungen: Federstrich, Knollennase, Punktaugen, Körper wie ein Sack, dünne Beine, große Schuhe.
// Vorbild für Kleidung und Miene: Foto eines älteren Trainers mit Hahnentritt-Schiebermütze, Wollmantel und Schal, schweren Lidern,
// spitzem Mund und abstehenden Ohren.
export const figurSvg = (pose) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 420" width="300" height="420">
  <defs><pattern id="hz" width="12" height="12" patternUnits="userSpaceOnUse"><rect width="12" height="12" fill="#a9a59c"/><rect width="6" height="6" fill="#3b3a38"/><rect x="6" y="6" width="6" height="6" fill="#3b3a38"/><path d="M6 0 L12 6 M0 6 L6 12" stroke="#6a665f" stroke-width="1.6"/></pattern></defs>
  <ellipse cx="117" cy="410" rx="74" ry="7" fill="rgba(0,0,0,.28)"/>
  <!-- Beine und Schuhe -->
  <path d="M96 340 L92 390 M138 340 L142 390" ${ln} fill="none" stroke-width="7"/>
  <path d="M70 394 C70 382 100 380 104 392 C106 400 72 404 70 394Z M130 392 C134 380 166 382 164 394 C162 404 128 402 130 392Z" fill="#242321" ${ln}/>
  <!-- Mantel (offen) mit Hemd und Spruch -->
  <path d="M58 204 C86 188 148 188 176 204 C194 250 194 308 184 346 C146 358 92 358 50 346 C40 308 40 250 58 204Z" fill="#59574f" ${ln}/>
  <path d="M96 196 L138 196 L146 350 L88 350 Z" fill="${BODY}" ${ln} stroke-width="2.6"/>
  <path d="M96 196 L84 250 L96 258 M138 196 L150 250 L138 258" fill="none" ${ln} stroke-width="2.6"/>
  <g fill="#3f3d38" opacity=".55"><circle cx="64" cy="250" r="1.6"/><circle cx="72" cy="290" r="1.6"/><circle cx="60" cy="318" r="1.6"/><circle cx="170" cy="260" r="1.6"/><circle cx="176" cy="300" r="1.6"/><circle cx="166" cy="330" r="1.6"/><circle cx="76" cy="230" r="1.6"/></g>
  <text x="117" y="272" text-anchor="middle" font-family="Anton, Impact, sans-serif" font-size="15" fill="#F2B134" letter-spacing=".3">KEIN</text>
  <text x="117" y="289" text-anchor="middle" font-family="Anton, Impact, sans-serif" font-size="15" fill="#F2B134" letter-spacing=".3">FIRLEFANZ.</text>
  <text x="117" y="307" text-anchor="middle" font-family="Work Sans, Arial, sans-serif" font-weight="800" font-size="8.5" fill="#fff">Einfach gutes</text>
  <text x="117" y="318" text-anchor="middle" font-family="Work Sans, Arial, sans-serif" font-weight="800" font-size="8.5" fill="#fff">Training.</text>
  <!-- Schal -->
  <path d="M68 196 C84 214 150 214 166 196 C170 210 160 222 140 226 L128 244 L106 244 L100 226 C80 222 64 212 68 196Z" fill="#7d6a58" ${ln}/>
  <path d="M107 232 L127 232" stroke="${INK}" stroke-width="2"/>
  <!-- linker Arm hängt, rote Karte -->
  <path d="M62 218 C42 250 40 280 48 304" fill="none" stroke="#59574f" stroke-width="22" stroke-linecap="round"/>
  ${hand(50, 312)}<rect x="36" y="280" width="18" height="28" rx="3" fill="#d9362c" ${ln} transform="rotate(-10 45 294)"/>
  ${arm[pose]}
  <!-- Kopf: breite Kinnpartie, abstehende Ohren -->
  <path d="M48 112 C34 102 30 138 46 148 C52 150 56 140 56 128Z M186 112 C200 102 204 138 188 148 C182 150 178 140 178 128Z" fill="${SK}" ${ln}/>
  <path d="M60 100 C56 150 66 186 96 192 C108 196 126 196 138 192 C168 186 178 150 174 100 C168 60 66 60 60 100Z" fill="${SK}" ${ln}/>
  <path d="M76 176 C90 190 144 190 158 176" fill="none" ${ln} stroke-width="2"/>
  <!-- Hahnentritt-Mütze -->
  <path d="M58 104 C54 68 84 48 118 50 C152 50 182 70 176 104 C150 90 84 90 58 104Z" fill="url(#hz)" ${ln}/>
  <path d="M58 104 C44 108 26 116 22 108 C32 98 50 94 64 98" fill="url(#hz)" ${ln}/>
  <circle cx="118" cy="47" r="5" fill="#3b3a38" ${ln}/>
  <!-- schwere Lider, hängende Brauen -->
  <path d="M80 112 C90 108 102 108 110 112 M126 112 C134 108 146 108 156 112" fill="none" ${ln} stroke-width="5.5"/>
  <path d="M88 124 L108 124 M128 124 L148 124" ${ln} fill="none" stroke-width="3"/>
  <circle cx="98" cy="128" r="3.4" fill="${INK}"/><circle cx="138" cy="128" r="3.4" fill="${INK}"/>
  <path d="M86 136 Q98 144 110 136 M126 136 Q138 144 150 136" fill="none" ${ln} stroke-width="2"/>
  <!-- Knollennase -->
  <circle cx="117" cy="152" r="24" fill="#eaa98a" ${ln}/>
  <path d="M106 144 Q110 138 116 140" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".55"/>
  <!-- spitzer Mund mit Pfeife, Falten -->
  <path d="M92 178 C100 184 108 184 112 180 M122 180 C128 184 136 184 142 178" fill="none" ${ln} stroke-width="3"/>
  <rect x="106" y="173" width="34" height="13" rx="6.5" fill="#e6e6e6" ${ln} stroke-width="2.6"/><circle cx="132" cy="179.5" r="2.6" fill="${INK}"/>
  <path d="M74 150 C70 164 74 178 84 186 M160 150 C164 164 160 178 150 186" fill="none" ${ln} stroke-width="2"/>
</svg>`;
export const POSEN = Object.keys(arm);
if (import.meta.url === `file://${process.argv[1]}`) {
  const { createRequire } = await import('node:module'); const { chromium } = createRequire(import.meta.url)('playwright');
  const html = `<link href="https://fonts.googleapis.com/css2?family=Anton&family=Work+Sans:wght@800&display=swap" rel="stylesheet"><body style="margin:0;background:#1f4a2c;display:flex;gap:10px;padding:16px">${POSEN.map(p => figurSvg(p)).join('')}</body>`;
  const br = await chromium.launch(); const pg = await br.newPage({ viewport: { width: 980, height: 450 }, deviceScaleFactor: 2 });
  await pg.setContent(html); await pg.waitForTimeout(800); await pg.screenshot({ path: process.argv[2] || 'figur.png' }); await br.close();
}
