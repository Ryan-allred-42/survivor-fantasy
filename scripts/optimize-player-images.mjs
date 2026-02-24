/**
 * Resize and optimize player headshots to a reasonable web size.
 * Outputs 400×400 px JPEG at 80% quality.
 * Run: node scripts/optimize-player-images.mjs
 */

import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.join(__dirname, "..", "public", "players");

const files = fs.readdirSync(DIR).filter((f) => /\.(jpg|jpeg|png)$/i.test(f));

console.log(`Optimizing ${files.length} images in public/players/\n`);

let saved = 0;
for (const file of files) {
  const filePath = path.join(DIR, file);
  const originalSize = fs.statSync(filePath).size;

  const outName = file.replace(/\.(jpeg|png)$/i, ".jpg");
  const outPath = path.join(DIR, outName);
  const tmpPath = outPath + ".tmp";

  try {
    await sharp(filePath)
      .resize(400, 500, { fit: "cover", position: "top" })
      .jpeg({ quality: 82, mozjpeg: true })
      .toFile(tmpPath);

    // Replace original (handles in-place for .jpg and rename for .png)
    fs.renameSync(tmpPath, outPath);
    if (outName !== file) fs.unlinkSync(filePath); // remove old .png if renamed

    const newSize = fs.statSync(outPath).size;
    saved += originalSize - newSize;
    console.log(
      `  ✓  ${outName.padEnd(42)} ${(originalSize / 1024).toFixed(0).padStart(6)}kb → ${(newSize / 1024).toFixed(0).padStart(5)}kb`
    );
  } catch (err) {
    console.log(`  ✗  ${file} — ${err.message}`);
  }
}

console.log(`\nTotal saved: ${(saved / 1024 / 1024).toFixed(1)} MB`);
