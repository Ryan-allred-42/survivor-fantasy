/**
 * Download Survivor Season 50 cast headshots from the Survivor Fandom wiki
 * and save them to public/players/
 *
 * Usage:
 *   node scripts/download-player-images.mjs
 *
 * Images are saved as /public/players/[slug].jpg
 * These are automatically served by Next.js at /players/[slug].jpg
 */

import fs from "fs";
import path from "path";
import https from "https";
import http from "http";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, "..", "public", "players");

// Fandom wiki image URLs for each cast member.
// Format: [slug, wiki-image-url]
// These use the Survivor Fandom wiki (survivor.fandom.com) headshot URLs.
// If a URL is wrong/outdated, replace it with any direct .jpg/.png URL.
// All URLs sourced directly from survivor.fandom.com Season 50 infobox images
const PLAYERS = [
  // CILA (orange)
  ["joe-hunter",                  "https://static.wikia.nocookie.net/survivor/images/3/3e/S50_Joe_Hunter.jpg"],
  ["savannah-louie",              "https://static.wikia.nocookie.net/survivor/images/9/91/S50_Savannah_Louie.jpg"],
  ["christian-hubicki",           "https://static.wikia.nocookie.net/survivor/images/8/89/S50_Christian_Hubicki.jpg"],
  ["cirie-fields",                "https://static.wikia.nocookie.net/survivor/images/5/5c/S50_Cirie_Fields.jpg"],
  ["ozzy-lusth",                  "https://static.wikia.nocookie.net/survivor/images/f/f6/S50_Ozzy_Lusth.jpg"],
  ["emily-flippen",               "https://static.wikia.nocookie.net/survivor/images/3/33/S50_Emily_Flippen.jpg"],
  ["rick-devens",                 "https://static.wikia.nocookie.net/survivor/images/4/47/S50_Rick_Devens.jpg"],
  ["jenna-lewis-dougherty",       "https://static.wikia.nocookie.net/survivor/images/e/e4/S50_Jenna_Lewis-Dougherty.jpg"],

  // KALO (teal)
  ["jonathan-young",              "https://static.wikia.nocookie.net/survivor/images/2/2c/S50_Jonathan_Young.jpg"],
  ["dee-valladares",              "https://static.wikia.nocookie.net/survivor/images/2/2b/S50_Dee_Valladares.jpg"],
  ["mike-white",                  "https://static.wikia.nocookie.net/survivor/images/a/ad/S50_Mike_White.jpg"],
  ["kamilla-karthigesu",          "https://static.wikia.nocookie.net/survivor/images/e/e9/S50_Kamilla_Karthigesu.jpg"],
  ["charlie-davis",               "https://static.wikia.nocookie.net/survivor/images/8/84/S50_Charlie_Davis.jpg"],
  ["tiffany-ervin",               "https://static.wikia.nocookie.net/survivor/images/e/e0/S50_Tiffany_Nicole_Ervin.jpg"],
  ["benjamin-coach-wade",         "https://static.wikia.nocookie.net/survivor/images/a/a8/S50_Coach_Wade.jpg"],
  ["chrissy-hofbeck",             "https://static.wikia.nocookie.net/survivor/images/b/b3/S50_Chrissy_Hofbeck.jpg"],

  // VATU (magenta)
  ["colby-donaldson",             "https://static.wikia.nocookie.net/survivor/images/8/82/S50_Colby_Donaldson.jpg"],
  ["genevieve-mushaluk",          "https://static.wikia.nocookie.net/survivor/images/8/82/S50_Genevieve_Mushaluk.jpg"],
  ["rizo-velovic",                "https://static.wikia.nocookie.net/survivor/images/8/8b/S50_Rizo_Velovic.jpg"],
  ["angelina-keeley",             "https://static.wikia.nocookie.net/survivor/images/0/00/S50_Angelina_Keeley.jpg"],
  ["q-burdette",                  "https://static.wikia.nocookie.net/survivor/images/f/f9/S50_Q_Burdette.jpg"],
  ["stephenie-lagrossa-kendrick", "https://static.wikia.nocookie.net/survivor/images/f/f5/S50_Stephenie_LaGrossa_Kendrick.jpg"],
  ["kyle-fraser",                 "https://static.wikia.nocookie.net/survivor/images/d/db/S50_Kyle_Fraser.jpg"],
  ["aubry-bracco",                "https://static.wikia.nocookie.net/survivor/images/7/73/S50_Aubry_Bracco.jpg"],
];

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const client = url.startsWith("https") ? https : http;
    const request = client.get(url, (response) => {
      // Follow up to 3 redirects
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        file.close();
        fs.unlink(dest, () => {});
        return download(response.headers.location, dest).then(resolve).catch(reject);
      }
      if (response.statusCode !== 200) {
        file.close();
        fs.unlink(dest, () => {});
        reject(new Error(`HTTP ${response.statusCode} for ${url}`));
        return;
      }
      response.pipe(file);
      file.on("finish", () => file.close(resolve));
    });
    request.on("error", (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function main() {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log(`Downloading ${PLAYERS.length} player images to public/players/\n`);

  const results = { ok: [], failed: [] };

  for (const [slug, url] of PLAYERS) {
    const ext = url.includes(".png") ? "png" : "jpg";
    const dest = path.join(OUTPUT_DIR, `${slug}.${ext}`);

    // Skip if already downloaded
    if (fs.existsSync(dest)) {
      console.log(`  skip  ${slug}.${ext} (already exists)`);
      results.ok.push(slug);
      continue;
    }

    try {
      await download(url, dest);
      console.log(`  ✓     ${slug}.${ext}`);
      results.ok.push(slug);
    } catch (err) {
      console.log(`  ✗     ${slug} — ${err.message}`);
      results.failed.push(slug);
    }
  }

  console.log(`\nDone: ${results.ok.length} succeeded, ${results.failed.length} failed`);

  if (results.failed.length > 0) {
    console.log("\nFailed players (add images manually to public/players/):");
    results.failed.forEach((s) => console.log(`  ${s}.jpg`));
    console.log("\nTip: right-click any headshot on survivor.fandom.com and 'Copy image address'");
    console.log("     then update the URL in PLAYERS array above and re-run the script.");
  }
}

main().catch(console.error);
