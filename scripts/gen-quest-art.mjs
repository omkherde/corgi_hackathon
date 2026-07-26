import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const dataPath = join(root, "data", "quests.json");
const output = join(root, "public", "quests", "generated");
const quests = JSON.parse(readFileSync(dataPath, "utf8"));
mkdirSync(output, { recursive: true });

const palettes = [
  ["#caff43", "#17351f", "#f6efe3"],
  ["#ff735d", "#172a49", "#f8f1df"],
  ["#5f7cff", "#15251b", "#dce7ce"],
  ["#e8b86d", "#391f1d", "#f2e9d7"],
  ["#75bba7", "#15251b", "#fff7e8"],
];

const escape = (value) =>
  String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

for (const [index, quest] of quests.entries()) {
  const [accent, dark, light] = palettes[index % palettes.length];
  const seed = [...quest.id].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const sunX = 120 + (seed % 620);
  const hill = 270 + (seed % 90);
  const lines = Array.from({ length: 9 }, (_, line) => {
    const x = 60 + line * 95 + ((seed * (line + 3)) % 34);
    const height = 120 + ((seed * (line + 7)) % 250);
    return `<rect x="${x}" y="${560 - height}" width="${45 + (line % 3) * 17}" height="${height}" rx="4" fill="${line % 2 ? dark : accent}" opacity="${line % 2 ? ".86" : ".72"}"/>`;
  }).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="650" viewBox="0 0 900 650">
  <rect width="900" height="650" fill="${light}"/>
  <circle cx="${sunX}" cy="145" r="${70 + (seed % 35)}" fill="${accent}"/>
  <path d="M0 ${hill} Q180 ${hill - 110} 340 ${hill + 20} T900 ${hill - 35} V650 H0Z" fill="${dark}" opacity=".13"/>
  ${lines}
  <path d="M0 548 Q190 470 390 550 T900 515 V650 H0Z" fill="${dark}"/>
  <path d="M0 575 Q220 510 420 590 T900 548" fill="none" stroke="${accent}" stroke-width="12"/>
  <text x="52" y="72" fill="${dark}" font-family="Arial, sans-serif" font-size="18" font-weight="800" letter-spacing="4">${escape(quest.location.neighborhood.toUpperCase())}</text>
  <text x="52" y="615" fill="${light}" font-family="Georgia, serif" font-size="26">${escape(quest.location.name)}</text>
</svg>`;
  writeFileSync(join(output, `${quest.id}.svg`), svg);
  quest.location.address ||= `${quest.location.name}, ${quest.location.neighborhood}, San Francisco, CA`;
}

writeFileSync(dataPath, `${JSON.stringify(quests, null, 2)}\n`);
console.log(`Generated ${quests.length} original quest illustrations and added addresses.`);
