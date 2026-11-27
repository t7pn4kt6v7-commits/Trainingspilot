// Figur „Coach“ (Karikatur einer älteren Trainerlegende mit Schiebermütze und Trillerpfeife; der Spruch auf dem Shirt
// steht auch auf der Bande im Titelbild der App). Liefert SVG-Text; Schriften (Anton, Work Sans) lädt die einbettende Seite.
// Posen: zeigen · karte · winken. Vorschau: node tools/video/figur.mjs [datei.png]  (braucht Playwright)
const SK = '#f0c9a0', SK2 = '#e3ae80', DK = '#2a2f2b';
const arm = {
  zeigen: `<path d="M140 258 C190 232 232 205 268 168" stroke="${DK}" stroke-width="20" stroke-linecap="round" fill="none"/><circle cx="272" cy="164" r="13" fill="${SK}"/><path d="M280 158 L296 146" stroke="${SK}" stroke-width="7" stroke-linecap="round"/>`,
  karte: `<path d="M140 258 C206 244 262 214 264 158" stroke="${DK}" stroke-width="20" stroke-linecap="round" fill="none"/><circle cx="264" cy="150" r="13" fill="${SK}"/><rect x="255" y="106" width="18" height="30" rx="3" fill="#F2B134" transform="rotate(8 264 121)"/>`,
  winken: `<path d="M140 258 C196 240 244 214 254 170" stroke="${DK}" stroke-width="20" stroke-linecap="round" fill="none"/><circle cx="256" cy="160" r="14" fill="${SK}"/><path d="M247 148 L243 134 M255 146 L255 130 M263 148 L267 134" stroke="${SK}" stroke-width="6" stroke-linecap="round"/>`,
};
export const figurSvg = (pose) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 420" width="300" height="420">
  <ellipse cx="116" cy="410" rx="70" ry="8" fill="rgba(0,0,0,.28)"/>
  <!-- Körper (klein) -->
  <g transform="translate(117 262) scale(.62) translate(-117 -160)">
    <rect x="85" y="290" width="26" height="105" rx="10" fill="#1d211e"/><rect x="123" y="290" width="26" height="105" rx="10" fill="#1d211e"/>
    <ellipse cx="90" cy="397" rx="28" ry="11" fill="#111"/><ellipse cx="146" cy="397" rx="28" ry="11" fill="#111"/>
    <path d="M62 160 Q117 132 172 160 L184 300 Q117 322 50 300 Z" fill="${DK}"/>
    <path d="M96 150 L117 175 L138 150 Z" fill="${SK}"/>
    <text x="117" y="224" text-anchor="middle" font-family="Anton, Impact, sans-serif" font-size="21" fill="#F2B134" letter-spacing=".4">KEIN</text>
    <text x="117" y="248" text-anchor="middle" font-family="Anton, Impact, sans-serif" font-size="21" fill="#F2B134" letter-spacing=".4">FIRLEFANZ.</text>
    <text x="117" y="270" text-anchor="middle" font-family="Work Sans, Arial, sans-serif" font-weight="800" font-size="12" fill="#fff">Einfach gutes</text>
    <text x="117" y="286" text-anchor="middle" font-family="Work Sans, Arial, sans-serif" font-weight="800" font-size="12" fill="#fff">Training.</text>
    <path d="M66 164 C48 196 46 230 54 258" stroke="${DK}" stroke-width="24" stroke-linecap="round" fill="none"/>
    <circle cx="54" cy="266" r="14" fill="${SK}"/><rect x="40" y="238" width="18" height="26" rx="3" fill="#d9362c" transform="rotate(-8 49 251)"/>
  </g>
  ${arm[pose]}
  <!-- Kopf (riesig) -->
  <g transform="translate(117 246) scale(1.62) translate(-117 -160)">
    <!-- Ohren -->
    <ellipse cx="76" cy="108" rx="11" ry="17" fill="${SK2}"/><ellipse cx="158" cy="108" rx="11" ry="17" fill="${SK2}"/>
    <path d="M74 100 C72 108 74 114 78 118" stroke="#b9855b" stroke-width="2" fill="none"/><path d="M160 100 C162 108 160 114 156 118" stroke="#b9855b" stroke-width="2" fill="none"/>
    <!-- Gesicht mit Hängebacken -->
    <path d="M82 76 C70 112 70 148 98 164 C108 170 126 170 136 164 C164 148 164 112 152 76 C146 50 88 50 82 76Z" fill="${SK}"/>
    <path d="M84 120 C80 150 100 160 106 160" fill="${SK2}" opacity=".5"/><path d="M150 120 C154 150 134 160 128 160" fill="${SK2}" opacity=".5"/>
    <!-- graue Schläfen -->
    <path d="M83 92 C77 96 76 108 80 116" stroke="#d6d6d6" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M151 92 C157 96 158 108 154 116" stroke="#d6d6d6" stroke-width="7" fill="none" stroke-linecap="round"/>
    <!-- Mütze -->
    <path d="M74 84 C70 50 100 34 120 36 C148 36 166 54 160 84 C140 72 96 72 74 84Z" fill="#6b5b45"/>
    <path d="M74 84 C100 70 140 70 160 84 C150 92 88 92 74 84Z" fill="#54463a"/>
    <path d="M96 40 C108 46 130 46 142 40" stroke="#54463a" stroke-width="2.5" fill="none"/><circle cx="118" cy="34" r="4.5" fill="#54463a"/>
    <path d="M80 86 C66 92 52 98 50 90 C56 80 70 80 82 82Z" fill="#54463a"/>
    <!-- buschige Brauen, Augen, Tränensäcke -->
    <path d="M88 94 C98 86 106 86 112 90 L112 95 C104 93 96 94 88 98Z" fill="#8a8a8a"/><path d="M122 90 C128 86 136 86 146 94 L146 98 C138 94 130 93 122 95Z" fill="#8a8a8a"/>
    <ellipse cx="101" cy="104" rx="6.5" ry="7" fill="#fff"/><ellipse cx="133" cy="104" rx="6.5" ry="7" fill="#fff"/>
    <circle cx="103" cy="105" r="3.6" fill="#222"/><circle cx="135" cy="105" r="3.6" fill="#222"/>
    <path d="M92 113 Q101 121 110 113" stroke="#c0906a" stroke-width="2.6" fill="none"/><path d="M124 113 Q133 121 142 113" stroke="#c0906a" stroke-width="2.6" fill="none"/>
    <!-- große Nase -->
    <path d="M116 98 C108 124 100 132 108 138 C116 144 130 140 130 132 C126 130 124 124 122 98Z" fill="#e6b389" stroke="#c0906a" stroke-width="2.5" stroke-linejoin="round"/>
    <circle cx="112" cy="136" r="2" fill="#a56f4c"/><circle cx="124" cy="137" r="2" fill="#a56f4c"/>
    <!-- Falten, Mund, Pfeife -->
    <path d="M94 122 C88 138 92 150 102 156" stroke="#c9996f" stroke-width="2.8" fill="none"/><path d="M140 122 C146 138 142 150 132 156" stroke="#c9996f" stroke-width="2.8" fill="none"/>
    <path d="M100 150 Q112 156 126 149" stroke="#8a4b3c" stroke-width="4.5" fill="none" stroke-linecap="round"/>
    <rect x="120" y="145" width="27" height="10" rx="5" fill="#dcdcdc" stroke="#9a9a9a" stroke-width="1.4"/><circle cx="142" cy="150" r="2.2" fill="#555"/><rect x="130" y="140" width="10" height="6" rx="2" fill="#bdbdbd"/>
    <path d="M100 168 Q117 200 134 168" stroke="#bbb" stroke-width="2" fill="none"/>
  </g>
</svg>`;
export const POSEN = Object.keys(arm);
if (import.meta.url === `file://${process.argv[1]}`) {
  const { createRequire } = await import('node:module'); const { chromium } = createRequire(import.meta.url)('playwright');
  const html = `<link href="https://fonts.googleapis.com/css2?family=Anton&family=Work+Sans:wght@800&display=swap" rel="stylesheet"><body style="margin:0;background:#1f4a2c;display:flex;gap:10px;padding:16px">${POSEN.map(p => figurSvg(p)).join('')}</body>`;
  const br = await chromium.launch(); const pg = await br.newPage({ viewport: { width: 980, height: 450 }, deviceScaleFactor: 2 });
  await pg.setContent(html); await pg.waitForTimeout(800); await pg.screenshot({ path: process.argv[2] || 'figur.png' }); await br.close();
}
