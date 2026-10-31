import { HttpError } from "@/lib/admin-auth";
import type { Variant } from "@/lib/content";

type Alignment = {
  characters: string[];
  character_start_times_seconds: number[];
  character_end_times_seconds: number[];
};

const LINE_GAP = "\n\n"; // a paragraph break gives the voice a short pause between lines

export function ttsConfigured() {
  return Boolean(process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_VOICE_ID);
}

// Speaks all lines of one variant and returns the MP3 plus a start time for every line,
// so the player can highlight the line being spoken.
export async function speakLines(lines: Variant["lines"]) {
  if (!ttsConfigured()) throw new HttpError(503, "ElevenLabs is not configured (ELEVENLABS_* in .env)");

  const text = lines.map((l) => l.text.trim()).join(LINE_GAP);
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVENLABS_VOICE_ID}/with-timestamps?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY!, "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.7, similarity_boost: 0.75, style: 0.1 },
      }),
    },
  );
  if (!res.ok) throw new HttpError(502, `ElevenLabs error ${res.status}: ${(await res.text()).slice(0, 200)}`);

  const data = (await res.json()) as { audio_base64: string; alignment: Alignment | null };
  const audio = Buffer.from(data.audio_base64, "base64");
  const a = data.alignment;
  const durationSec = a?.character_end_times_seconds.at(-1) ?? 0;

  // Character index where each line starts in `text`
  const starts: number[] = [];
  let offset = 0;
  for (const l of lines) {
    starts.push(offset);
    offset += l.text.trim().length + LINE_GAP.length;
  }

  const timed = lines.map((l, i) => {
    let t: number;
    if (a && a.characters.length === text.length) {
      t = a.character_start_times_seconds[starts[i]] ?? 0;
    } else {
      // Alignment didn't match the text 1:1; spread lines by character share instead
      t = durationSec * (starts[i] / text.length);
    }
    return { t: Math.round(t * 100) / 100, text: l.text };
  });

  return { audio, durationSec: Math.ceil(durationSec), lines: timed };
}
