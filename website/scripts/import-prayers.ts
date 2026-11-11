// Imports ready-written prayers from a JSON file, voices each one with ElevenLabs and saves it as a library track.
//   npm run prayers:import -- --dry-run                 check the file, show what would happen (no ElevenLabs, no writes)
//   npm run prayers:import                              import + voice, tracks land in "Needs review"
//   npm run prayers:import -- --publish                 …and publish them (marked reviewed by the first ADMIN_EMAILS)
//   npm run prayers:import -- --file ../assets/other.json --voice EkK5I93UQWFDigLMpZcX
//   npm run prayers:import -- --file ../assets/quiz_prayers.json --free --minutes 1 --funnel --append
//     --free: not premium · --minutes: force 1/3/5 · --append: library order after the existing prayers
//     --funnel: also a copy in the "funnel" category (slug funnel-<slug>), tagged with the entry's "tag" (quiz answer)
// One prayer at a time, in file order. Safe to re-run: a prayer whose text is unchanged and already voiced is skipped.
import "dotenv/config";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { bumpContentVersion, nearestLength, trackInputSchema, type Variant } from "@/lib/content";
import { audioKey, putAudio, r2Configured } from "@/lib/r2";
import { speakLines, ttsConfigured } from "@/lib/tts";

function arg(name: string, fallback: string) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}
const flag = (name: string) => process.argv.includes(`--${name}`);

const FILE = resolve(arg("file", "../assets/prayers_data.json"));
const VOICE_ID = arg("voice", "EkK5I93UQWFDigLMpZcX"); // "Matthew" in lib/voices.ts
const DRY = flag("dry-run");
const PUBLISH = flag("publish");
const FREE = flag("free"); // not premium
const FUNNEL = flag("funnel"); // also a quiz copy per prayer (needs "tag")
const APPEND = flag("append"); // library order continues after the existing prayers
const FORCE_MINUTES = process.argv.includes("--minutes") ? Number(arg("minutes", "")) : undefined;
if (FORCE_MINUTES !== undefined && ![1, 3, 5].includes(FORCE_MINUTES)) throw new Error("--minutes must be 1, 3 or 5");
const REVIEWER = (process.env.ADMIN_EMAILS ?? "").split(",")[0]?.trim();

const csv = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

const entrySchema = z.object({
  title: z.string(),
  slug: z.string(),
  subtitle: z.string(),
  category: z.string(),
  scene: z.string(),
  tags: z.string(),
  scripture: z.string(),
  order: z.number().int(),
  duration_minutes: z.number().int(),
  kjv_verse: z.string().optional(), // no field for it on a track yet
  tag: z.string().optional(), // quiz answer value (funnels/options.ts), used with --funnel
  script: z.string().min(1),
});

// Each paragraph of the script becomes one line (the player splits long lines into phrases itself)
function scriptToLines(script: string): Variant["lines"] {
  return script
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s*\n\s*/g, " ").trim())
    .filter(Boolean)
    .map((text, i) => (i === 0 ? { t: null, text } : { t: null, text, p: true }));
}

const sameText = (a: Variant["lines"], b: Variant["lines"]) =>
  a.length === b.length && a.every((l, i) => l.text === b[i].text);

async function main() {
  if (!DRY && !ttsConfigured()) throw new Error("Set ELEVENLABS_API_KEY in website/.env first.");
  if (!DRY && !r2Configured()) throw new Error("Set the R2_* values in website/.env first.");
  if (PUBLISH && !REVIEWER) throw new Error("--publish needs ADMIN_EMAILS in website/.env (used as the reviewer).");

  const entries = z.array(entrySchema).parse(JSON.parse(readFileSync(FILE, "utf8")));
  console.log(`${entries.length} prayer(s) in ${FILE}${DRY ? "  (dry run)" : ""}\n`);

  if (FUNNEL) {
    const untagged = entries.filter((e) => !e.tag).map((e) => e.slug);
    if (untagged.length) throw new Error(`--funnel needs a "tag" (quiz answer) on every prayer; missing on: ${untagged.join(", ")}`);
  }
  // --append: library copies go after everything already in the library (ignoring this file's own prayers)
  const base = APPEND
    ? ((
        await prisma.audioTrack.aggregate({
          _max: { order: true },
          where: { category: { not: "funnel" }, slug: { notIn: entries.map((e) => e.slug) } },
        })
      )._max.order ?? 0)
    : 0;

  let voiced = 0, skipped = 0, failed = 0, chars = 0, touchedPublished = false;

  for (const [i, e] of entries.entries()) {
    const label = `[${i + 1}/${entries.length}] ${e.title}`;
    try {
      const lines = scriptToLines(e.script);
      // One text per prayer; its length is the nearest of 1/3/5 to the real audio, unless --minutes says otherwise
      const guess = FORCE_MINUTES ?? nearestLength(e.duration_minutes * 60);
      const meta = trackInputSchema.parse({
        slug: e.slug,
        title: e.title,
        subtitle: e.subtitle,
        category: e.category,
        tags: csv(e.tags).slice(0, 10),
        scene: e.scene,
        scriptureRefs: csv(e.scripture).slice(0, 8),
        order: base + e.order,
        isPremium: !FREE,
        source: "human",
        variants: [{ minutes: guess, url: null, durationSec: null, lines }],
      });

      const existing = await prisma.audioTrack.findUnique({ where: { slug: e.slug } });
      // Raw, not readVariants: older imports stored 2- or 4-min variants, which the schema now rejects
      const stored = (Array.isArray(existing?.variants) ? existing.variants : []) as unknown as Variant[];
      const old = stored.find((v) => v.url && v.durationSec && Array.isArray(v.lines) && sameText(v.lines, lines));
      const minutes = (FORCE_MINUTES ?? (old ? nearestLength(old.durationSec!) : guess)) as Variant["minutes"];
      const libFresh = Boolean(
        old && stored.length === 1 && old.minutes === minutes && existing!.isPremium === meta.isPremium && existing!.order === meta.order,
      );

      const funnelSlug = `funnel-${e.slug}`;
      const funnelExisting = FUNNEL ? await prisma.audioTrack.findUnique({ where: { slug: funnelSlug } }) : null;
      const funnelVariant = (funnelExisting?.variants as unknown as Variant[] | undefined)?.[0];
      const funnelFresh = !FUNNEL || Boolean(old && funnelVariant?.url === old.url && funnelVariant.minutes === minutes);

      if (existing?.status === "published" && !old) {
        console.log(`  ! ${label}: already published with different text; unpublish it in /admin to re-import`);
        skipped++;
        continue;
      }
      if (libFresh && funnelFresh && !PUBLISH) {
        console.log(`  = ${label}: already imported, skipped`);
        skipped++;
        continue;
      }

      const textChars = lines.reduce((n, l) => n + l.text.length + 2, 0);
      if (DRY) {
        const what = old ? `keep its audio, ${minutes} min` : `voice ${lines.length} paragraphs (~${textChars} chars)`;
        const funnel = FUNNEL ? ` + quiz copy "${funnelSlug}" tagged ${e.tag}` : "";
        console.log(`  ~ ${label}: would ${existing ? "update" : "create"}, ${what}, order ${meta.order}${funnel}`);
        chars += old ? 0 : textChars;
        continue;
      }

      let variant: Variant;
      if (old) {
        variant = { ...old, minutes };
      } else {
        const spoken = await speakLines(lines, VOICE_ID);
        const m = (FORCE_MINUTES ?? nearestLength(spoken.durationSec)) as Variant["minutes"];
        const url = await putAudio(audioKey(e.slug, m, spoken.audio), spoken.audio);
        variant = { minutes: m, url, durationSec: spoken.durationSec, lines: spoken.lines };
        chars += textChars;
      }
      if (existing?.status === "published" || funnelExisting?.status === "published") touchedPublished = true;

      const publish = PUBLISH ? { status: "published" as const, reviewedBy: REVIEWER } : {};
      const data = { ...meta, variants: [variant], ...publish };
      const track = existing
        ? await prisma.audioTrack.update({ where: { id: existing.id }, data })
        : await prisma.audioTrack.create({ data: { ...data, status: PUBLISH ? "published" : "review" } });

      // The quiz copy: same audio, category "funnel", tagged with the quiz answer it belongs to
      if (FUNNEL) {
        const quiz = { ...data, slug: funnelSlug, category: "funnel", tags: [e.tag!], order: e.order };
        if (funnelExisting) await prisma.audioTrack.update({ where: { id: funnelExisting.id }, data: quiz });
        else await prisma.audioTrack.create({ data: { ...quiz, status: PUBLISH ? "published" : "review" } });
      }

      voiced++;
      console.log(`  ✓ ${label}: ${variant.durationSec}s audio → ${variant.minutes} min, ${track.status}${FUNNEL ? ` + quiz (${e.tag})` : ""}`);
    } catch (err) {
      failed++;
      console.error(`  ✗ ${label}: ${err instanceof Error ? err.message : err}`);
    }
  }

  if (!DRY && voiced && (PUBLISH || touchedPublished)) await bumpContentVersion(); // apps refetch the library
  console.log(
    `\nDone. ${DRY ? "Would voice" : "Imported"} ${DRY ? "" : `${voiced}, `}~${chars} characters sent to ElevenLabs` +
      `${DRY ? "" : `, ${skipped} skipped, ${failed} failed`}.` +
      (DRY || PUBLISH ? "" : "\nThey're in /admin under “Needs review”: listen, press “Mark reviewed”, then Publish."),
  );
  if (failed) process.exitCode = 1;
}

main().finally(() => prisma.$disconnect());
