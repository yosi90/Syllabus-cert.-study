import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const dist = join(process.cwd(), "dist");
const requiredFiles = ["index.html", "manifest.webmanifest", "sw.js", "favicon.png"];
for (const file of requiredFiles) {
  if (!existsSync(join(dist, file))) throw new Error(`Missing production PWA file: ${file}`);
}

const manifest = JSON.parse(readFileSync(join(dist, "manifest.webmanifest"), "utf8")) as {
  name?: string;
  short_name?: string;
  start_url?: string;
  scope?: string;
  display?: string;
  theme_color?: string;
  icons?: Array<{ src: string; sizes: string; purpose?: string }>;
};

if (!manifest.name || !manifest.short_name || manifest.display !== "standalone") {
  throw new Error("Manifest is missing its installable app identity or standalone display mode.");
}
if (manifest.start_url !== "./" || manifest.scope !== "./" || !manifest.theme_color) {
  throw new Error("Manifest start URL, scope or theme color is invalid.");
}

const requiredIcons = new Map([
  ["icons/icon-192.png", "192x192"],
  ["icons/icon-512.png", "512x512"],
  ["icons/icon-maskable-512.png", "512x512"],
]);
for (const [src, sizes] of requiredIcons) {
  const icon = manifest.icons?.find((item) => item.src === src && item.sizes === sizes);
  if (!icon || !existsSync(join(dist, src))) throw new Error(`Missing manifest icon: ${src}`);
  const png = readFileSync(join(dist, src));
  const dimensions = `${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`;
  if (dimensions !== sizes) throw new Error(`Icon ${src} declares ${sizes} but contains ${dimensions}.`);
}
if (!manifest.icons?.some((icon) => icon.purpose === "maskable")) {
  throw new Error("Manifest does not include a maskable icon.");
}

const serviceWorker = readFileSync(join(dist, "sw.js"), "utf8");
if (!serviceWorker.includes("SKIP_WAITING")) throw new Error("Service worker does not support prompted updates.");
for (const asset of ["index.html", "manifest.webmanifest", "favicon.png", ...requiredIcons.keys()]) {
  if (!serviceWorker.includes(asset)) throw new Error(`Service worker does not precache ${asset}`);
}

const visualAssets = readdirSync(join(dist, "question-assets")).filter((file) => file.endsWith(".png"));
if (visualAssets.length !== 23) throw new Error(`Expected 23 question assets, found ${visualAssets.length}.`);
for (const asset of visualAssets) {
  if (!serviceWorker.includes(`question-assets/${asset}`)) {
    throw new Error(`Service worker does not precache question-assets/${asset}`);
  }
}

console.log(`PWA validation passed: ${manifest.name}, ${manifest.icons?.length ?? 0} icons, ${visualAssets.length} question assets cached.`);
