import { writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

async function search(offset) {
  const params = new URLSearchParams({
    action: "query",
    generator: "search",
    gsrsearch: "San Francisco filetype:bitmap",
    gsrnamespace: "6",
    gsrlimit: "50",
    gsroffset: String(offset),
    prop: "imageinfo",
    iiprop: "url|extmetadata",
    iiurlwidth: "1200",
    format: "json",
    origin: "*",
  });
  const response = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, {
    headers: { "User-Agent": "DetourHackathon/1.0 (github.com/omkherde/corgi_hackathon)" },
  });
  if (!response.ok) throw new Error(`Commons search failed: ${response.status}`);
  const data = await response.json();
  return Object.values(data.query?.pages ?? {});
}

const pages = [...await search(0), ...await search(50)]
  .filter((page) => page.imageinfo?.[0]?.thumburl)
  .slice(0, 80);

if (pages.length !== 80) throw new Error(`Expected 80 photographs, got ${pages.length}`);

const credits = {};
for (const [index, page] of pages.entries()) {
  const id = `q_${String(index + 1).padStart(3, "0")}`;
  const info = page.imageinfo[0];
  credits[id] = {
    title: page.title.replace(/^File:/, ""),
    source: info.descriptionurl,
    url: info.thumburl,
    license: info.extmetadata?.LicenseShortName?.value ?? "Wikimedia Commons",
    artist: String(info.extmetadata?.Artist?.value ?? "Wikimedia Commons").replace(/<[^>]*>/g, ""),
  };
}

writeFileSync(join(root, "data", "photo-credits.json"), `${JSON.stringify(credits, null, 2)}\n`);
console.log("Cataloged 80 distinct San Francisco photographs with attribution.");
