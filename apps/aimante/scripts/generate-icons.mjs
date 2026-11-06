// Génère les icônes PNG et les écrans de démarrage iPhone à partir de public/favicon.svg.
// Usage : pnpm icons (nécessite Playwright et Chromium, déjà présents dans l'environnement de dev).
import { createRequire } from "node:module";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pub = join(root, "public");
const svg = readFileSync(join(pub, "favicon.svg"), "utf8");
const svgUrl = "data:image/svg+xml;base64," + Buffer.from(svg).toString("base64");

const THEMES = {
  light: { bg: "#E6ECE9", ink: "#14302A", muted: "#5A6D67" },
  dark: { bg: "#0F1715", ink: "#E4EEEA", muted: "#94A69F" },
};

// Écrans iPhone courants : [largeur CSS, hauteur CSS, densité]
const DEVICES = [
  [440, 956, 3], [402, 874, 3], [430, 932, 3], [393, 852, 3], [428, 926, 3],
  [390, 844, 3], [375, 812, 3], [414, 896, 3], [414, 896, 2], [375, 667, 2], [320, 568, 2],
];

const browser = await chromium.launch();
async function shot(html, width, height, scale, out) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: scale });
  await page.setContent(`<!doctype html><html><body style="margin:0">${html}</body></html>`);
  await page.waitForLoadState("networkidle");
  mkdirSync(dirname(out), { recursive: true });
  await page.screenshot({ path: out, omitBackground: false });
  await page.close();
}

const square = (size, inner, bg) =>
  `<div style="width:${size}px;height:${size}px;background:${bg};display:grid;place-items:center">
     <img src="${svgUrl}" style="width:${inner}px;height:${inner}px;border-radius:0">
   </div>`;

// Icônes : carré plein, iOS et Android arrondissent eux-mêmes les coins.
const flat = svg.replace('rx="112"', 'rx="0"');
const flatUrl = "data:image/svg+xml;base64," + Buffer.from(flat).toString("base64");
const flatImg = (size) => `<img src="${flatUrl}" style="display:block;width:${size}px;height:${size}px">`;

await shot(flatImg(192), 192, 192, 1, join(pub, "icons/icon-192.png"));
await shot(flatImg(512), 512, 512, 1, join(pub, "icons/icon-512.png"));
await shot(flatImg(180), 180, 180, 1, join(pub, "apple-touch-icon.png"));
// Maskable : le dessin tient dans la zone sûre (80 % du carré).
await shot(square(512, 400, THEMES.light.bg), 512, 512, 1, join(pub, "icons/icon-maskable-512.png"));

const links = [];
for (const [w, h, s] of DEVICES) {
  for (const [name, t] of Object.entries(THEMES)) {
    const file = `splash/${name}-${w * s}x${h * s}.png`;
    const html = `<div style="width:${w}px;height:${h}px;background:${t.bg};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;font-family:system-ui,sans-serif">
      <img src="${svgUrl}" style="width:112px;height:112px">
      <div style="color:${t.ink};font-size:28px;font-weight:800;letter-spacing:-.01em">Aimanté</div></div>`;
    await shot(html, w, h, s, join(pub, file));
    links.push(
      `    <link rel="apple-touch-startup-image" href="./${file}" media="(prefers-color-scheme: ${name}) and (device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${s}) and (orientation: portrait)" />`,
    );
  }
}
await browser.close();

const indexPath = join(root, "index.html");
const index = readFileSync(indexPath, "utf8").replace(
  /( *)<!-- SPLASH -->[\s\S]*?(<!-- \/SPLASH -->|(?=\n))/,
  `    <!-- SPLASH -->\n${links.join("\n")}\n    <!-- /SPLASH -->`,
);
writeFileSync(indexPath, index);
console.log(`Icônes et ${links.length} écrans de démarrage générés.`);
