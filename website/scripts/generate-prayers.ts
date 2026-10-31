// Writes draft prayers with Claude and saves them as drafts for review in /admin (SPEC §8.8, step 1).
//   npm run prayers:generate -- --category peace --count 5
// Nothing is published: every draft still needs a person to read it, voice it and press Publish.
import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { CATEGORIES, SCENES, trackInputSchema } from "@/lib/content";

const MODEL = "claude-sonnet-5-5";

function arg(name: string, fallback: string) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const category = arg("category", "peace") as (typeof CATEGORIES)[number];
const count = Math.min(Number(arg("count", "3")), 20);
if (!process.env.ANTHROPIC_API_KEY) {
  console.error("Set ANTHROPIC_API_KEY in website/.env first.");
  process.exit(1);
}
if (!CATEGORIES.includes(category)) {
  console.error(`--category must be one of: ${CATEGORIES.join(", ")}`);
  process.exit(1);
}

const SYSTEM = `You write short guided prayers for Lumen, a Christian prayer app used mostly by Protestant adults in the US.

Voice: warm, plain, unhurried. Second person to the listener only in the opening invitation; the prayer itself speaks to God ("Lord", "Father", "Jesus").
Every prayer is grounded in one or two Bible passages. Quote only the World English Bible (public domain), word for word, and give the reference.
Stay within what most Protestant, Catholic and Orthodox Christians share. No denominational doctrine, no prosperity promises, no promises of healing or specific outcomes, no politics.
Never give medical, legal or financial advice. For grief or anxiety, be gentle and honest; you may invite the listener to reach out to someone they trust.

Format: the prayer is a list of lines. Each line is one breath when read aloud: 6 to 22 words. The player shows one line at a time.
Lengths are spoken slowly with pauses (about 110 words per minute):
- 1 minute: 90 to 120 words
- 3 minutes: 300 to 360 words
- 5 minutes: 520 to 600 words
Each length is its own complete prayer (opening, Scripture, reflection, petition, closing "Amen."), not a cut of the longer one.`;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["title", "subtitle", "tags", "scene", "scriptureRefs", "variants"],
  properties: {
    title: { type: "string", description: "2 to 6 words, no quotes" },
    subtitle: { type: "string", description: "One short sentence for the library card" },
    tags: { type: "array", items: { type: "string" } },
    scene: { type: "string", enum: [...SCENES] },
    scriptureRefs: { type: "array", items: { type: "string" }, description: 'OSIS-style, e.g. "Phil.4.6-7"' },
    variants: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["minutes", "lines"],
        properties: {
          minutes: { type: "integer", enum: [1, 3, 5] },
          lines: { type: "array", items: { type: "string" } },
        },
      },
    },
  },
} as const;

type Draft = {
  title: string;
  subtitle: string;
  tags: string[];
  scene: string;
  scriptureRefs: string[];
  variants: { minutes: number; lines: string[] }[];
};

const client = new Anthropic();

async function writeOne(avoid: string[]): Promise<Draft> {
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 8000,
    system: SYSTEM,
    output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
    messages: [
      {
        role: "user",
        content: `Write one new "${category}" prayer with all three lengths (1, 3 and 5 minutes).
Pick the scene that fits the mood best.
Do not repeat these existing titles or their main passages:\n${avoid.map((t) => `- ${t}`).join("\n") || "- (none yet)"}`,
      },
    ],
  });
  if (message.stop_reason !== "end_turn") throw new Error(`Stopped early: ${message.stop_reason}`);
  const text = message.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") throw new Error("No text in the response");
  return JSON.parse(text.text) as Draft;
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);

async function uniqueSlug(base: string) {
  let slug = base;
  for (let n = 2; await prisma.audioTrack.findUnique({ where: { slug } }); n++) slug = `${base}-${n}`;
  return slug;
}

async function main() {
  const existing = await prisma.audioTrack.findMany({ where: { category }, select: { title: true } });
  const avoid = existing.map((t) => t.title);
  console.log(`Writing ${count} "${category}" prayer(s) with ${MODEL}…`);

  for (let i = 0; i < count; i++) {
    try {
      const draft = await writeOne(avoid);
      const data = trackInputSchema.parse({
        slug: await uniqueSlug(slugify(draft.title)),
        title: draft.title,
        subtitle: draft.subtitle,
        category,
        tags: draft.tags.slice(0, 10),
        scene: draft.scene,
        // TODO(bible import, SPEC §6.8): check each reference exists in the Bible tables
        scriptureRefs: draft.scriptureRefs.slice(0, 8),
        variants: draft.variants
          .filter((v) => [1, 3, 5].includes(v.minutes))
          .map((v) => ({ minutes: v.minutes, url: null, durationSec: null, lines: v.lines.map((text) => ({ t: null, text })) })),
        isPremium: true,
        source: "ai",
      });
      const track = await prisma.audioTrack.create({ data: { ...data, status: "review" } });
      avoid.push(track.title);
      const words = data.variants.map((v) => `${v.minutes}m ${v.lines.map((l) => l.text).join(" ").split(/\s+/).length}w`);
      console.log(`  ✓ ${track.title}  [${track.scene}]  ${words.join(" · ")}`);
    } catch (err) {
      console.error(`  ✗ prayer ${i + 1}: ${err instanceof Error ? err.message : err}`);
    }
  }
  console.log("Done. Review them at /admin (they're in the “Needs review” list).");
}

main().finally(() => prisma.$disconnect());
