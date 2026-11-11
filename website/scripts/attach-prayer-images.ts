// Converts cover images to WebP, uploads them to R2 and sets them as the prayers' cover (imageUrl).
//   npm run prayers:images -- --dry-run      show which image goes to which prayer
//   npm run prayers:images                   convert, upload, attach
//   npm run prayers:images -- --dir ../assets/quiz-images --file ../assets/quiz_prayers.json
// Images are matched to prayers by order: the oldest file (by creation time) goes to the prayer with the lowest
// "order" in the JSON, and so on. The WebP copies are also saved next to the originals, in <dir>/webp/.
import "dotenv/config";
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import { bumpContentVersion } from "@/lib/content";
import { imageKey, putImage, r2Configured } from "@/lib/r2";

function arg(name: string, fallback: string) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}
const DIR = resolve(arg("dir", "../assets/images"));
const FILE = resolve(arg("file", "../assets/prayers_data.json"));
const DRY = process.argv.includes("--dry-run");
const WIDTH = 1600;
const QUALITY = 80;

async function main() {
  if (!DRY && !r2Configured()) throw new Error("Set the R2_* values in website/.env first.");

  const images = readdirSync(DIR)
    .filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
    .sort((a, b) => statSync(join(DIR, a)).birthtimeMs - statSync(join(DIR, b)).birthtimeMs);
  const prayers = (JSON.parse(readFileSync(FILE, "utf8")) as { slug: string; title: string; order: number }[]).sort(
    (a, b) => a.order - b.order,
  );
  if (images.length !== prayers.length) {
    throw new Error(`${images.length} images but ${prayers.length} prayers; they must match one to one.`);
  }

  const outDir = join(DIR, "webp");
  if (!DRY) mkdirSync(outDir, { recursive: true });
  let touchedPublished = false, failed = 0;

  for (const [i, p] of prayers.entries()) {
    const label = `[${i + 1}/${prayers.length}] ${p.title} ← ${images[i]}`;
    try {
      const track = await prisma.audioTrack.findUnique({ where: { slug: p.slug } });
      if (!track) throw new Error(`no track with slug "${p.slug}" (run prayers:import first)`);
      if (DRY) {
        console.log(`  ~ ${label}`);
        continue;
      }

      const webp = await sharp(join(DIR, images[i]))
        .rotate()
        .resize({ width: WIDTH, withoutEnlargement: true })
        .webp({ quality: QUALITY })
        .toBuffer();
      writeFileSync(join(outDir, `${String(p.order).padStart(2, "0")}-${p.slug}.webp`), webp);
      const url = await putImage(imageKey(p.slug, "image/webp"), webp, "image/webp");
      await prisma.audioTrack.update({ where: { id: track.id }, data: { imageUrl: url } });
      if (track.status === "published") touchedPublished = true;
      // The quiz copy made by prayers:import --funnel shares the cover
      await prisma.audioTrack.updateMany({ where: { slug: `funnel-${p.slug}` }, data: { imageUrl: url } });
      console.log(`  ✓ ${label}  ${Math.round(webp.length / 1024)} KB`);
    } catch (err) {
      failed++;
      console.error(`  ✗ ${label}: ${err instanceof Error ? err.message : err}`);
    }
  }

  if (touchedPublished) await bumpContentVersion(); // apps refetch the library
  console.log(DRY ? "\nDry run, nothing changed." : `\nDone. ${prayers.length - failed} attached, ${failed} failed. WebP copies in ${outDir}`);
  if (failed) process.exitCode = 1;
}

main().finally(() => prisma.$disconnect());
