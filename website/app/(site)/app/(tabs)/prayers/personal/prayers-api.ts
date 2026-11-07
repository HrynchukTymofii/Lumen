// Personal prayers on the web: the same API the phone app uses (app/lib/api/prayers.ts), signed in by the session
// cookie. Buying tokens happens only in the app; the web can spend them.

export type AudioPrice = { tokens: number; free: boolean; tooLong: boolean };

export type PersonalPrayer = {
  id: string;
  source: "generator" | "companion" | "manual";
  title: string;
  text: string;
  words: number;
  refs: { ref: string; text: string }[];
  audio: { url: string; durationSec: number | null; lines: { text: string; t: number | null }[]; stale: boolean } | null;
  audioPrice: AudioPrice;
};

export type Allowance = {
  premium: boolean;
  generated: { used: number; limit: number; per: "month" | "day"; resetsOn: string };
  tokens: number;
  freeAudioLeft: boolean;
};

export type CrisisResource = { label: string; href: string; note: string };

export class PrayerError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public data?: Record<string, unknown>,
  ) {
    super(message);
  }
}

export const WORDS_PER_TOKEN = 200;
export const MAX_AUDIO_WORDS = 1600;
export const countWords = (text: string) => (text.trim().match(/\S+/g) ?? []).length;
export const tokensFor = (words: number) => Math.max(1, Math.ceil(words / WORDS_PER_TOKEN));

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api/prayers${path}`, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  } catch {
    throw new PrayerError("No connection. Check your internet and try again.", 0);
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new PrayerError(data.error ?? "Something went wrong. Please try again.", res.status, data.code, data);
  return data as T;
}

export const getAllowance = () => call<Allowance>("/personal/allowance");

export const generatePrayer = (need: string, length: "short" | "medium" | "long") =>
  call<PersonalPrayer | { crisis: true; resources: CrisisResource[] }>("/personal", { method: "POST", body: JSON.stringify({ need, length }) });

export const savePrayerFromMessage = (messageId: string) =>
  call<PersonalPrayer>("/personal/from-message", { method: "POST", body: JSON.stringify({ messageId }) });

export const editPrayer = (id: string, change: { title?: string; text?: string }) =>
  call<PersonalPrayer>(`/personal/${id}`, { method: "PATCH", body: JSON.stringify(change) });

export const deletePrayer = (id: string) => call<void>(`/personal/${id}`, { method: "DELETE" });

export const recordPrayer = (id: string, expectedTokens: number) =>
  call<PersonalPrayer>(`/personal/${id}/audio`, { method: "POST", body: JSON.stringify({ expectedTokens }) });

export const paragraphsOf = (text: string) =>
  text
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s*\n\s*/g, " ").trim())
    .filter(Boolean);
