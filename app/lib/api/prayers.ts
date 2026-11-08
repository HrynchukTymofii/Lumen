import { isAxiosError } from "axios";
import api from "./client";
import type { CrisisResource } from "./types";

// Personal prayers (website/app/api/prayers/*): written by the generator, saved from the companion, or edited by
// hand. Listening costs prayer tokens by length (1 per 200 words); Premium gets one short audio prayer a month free.

export type PrayerLength = "short" | "medium" | "long";
export type PrayerSource = "generator" | "companion" | "manual";

export interface PersonalPrayerSummary {
  id: string;
  source: PrayerSource;
  title: string;
  words: number;
  hasAudio: boolean;
  createdAt: string;
  updatedAt: string;
}

// The voices a prayer can be read in. Only the name is shown. Keep in step with website/lib/voices.ts.
export const VOICES = [
  { id: "grace", name: "Grace" },
  { id: "ruth", name: "Ruth" },
  { id: "matthew", name: "Matthew" },
  { id: "john", name: "John" },
] as const;
export type VoiceId = (typeof VOICES)[number]["id"];
export const DEFAULT_VOICE: VoiceId = "grace";
export const voiceName = (id: string) => VOICES.find((v) => v.id === id)?.name ?? "";
/** A voice we know, else the default. */
export const knownVoice = (id: unknown): VoiceId => VOICES.find((v) => v.id === id)?.id ?? DEFAULT_VOICE;

// A recording's voice is one of ours, or null: recorded before voices could be chosen (the original voice)
function withVoice<T extends PersonalPrayer>(p: T): T {
  return p.audio ? { ...p, audio: { ...p.audio, voice: VOICES.find((v) => v.id === p.audio!.voice)?.id ?? null } } : p;
}

export interface AudioPrice {
  tokens: number;
  free: boolean;
  tooLong: boolean;
}

export interface PersonalPrayer extends PersonalPrayerSummary {
  text: string;
  refs: { ref: string; text: string }[];
  audio: { url: string; durationSec: number | null; lines: { text: string; t: number | null }[]; voice: VoiceId | null; stale: boolean } | null;
  audioPrice: AudioPrice;
}

export interface Allowance {
  premium: boolean;
  generated: { used: number; limit: number; per: "month" | "day"; resetsOn: string };
  tokens: number;
  freeAudioLeft: boolean;
}

export const WORDS_PER_TOKEN = 200;
export const MAX_AUDIO_WORDS = 1600;
export const countWords = (text: string) => (text.trim().match(/\S+/g) ?? []).length;
export const tokensFor = (words: number) => Math.max(1, Math.ceil(words / WORDS_PER_TOKEN));

/** A failed request's code and message: limit, paywall, no_tokens, price_changed, too_long, … */
export function prayerError(err: unknown): { status: number; code?: string; message: string; data?: Record<string, unknown> } {
  if (isAxiosError(err) && err.response) {
    const data = err.response.data as { error?: string; code?: string } & Record<string, unknown>;
    return { status: err.response.status, code: data?.code, message: data?.error ?? "Something went wrong. Please try again.", data };
  }
  return { status: 0, message: isAxiosError(err) ? "No connection. Check your internet and try again." : "Something went wrong. Please try again." };
}

export async function getAllowance() {
  const { data } = await api.get<Allowance>("/prayers/personal/allowance");
  return data;
}

export async function listPrayers() {
  const { data } = await api.get<{ prayers: PersonalPrayerSummary[] }>("/prayers/personal");
  return data.prayers;
}

export async function getPrayer(id: string) {
  const { data } = await api.get<PersonalPrayer>(`/prayers/personal/${id}`);
  return withVoice(data);
}

/** The new prayer, or a crisis answer (no prayer: the person is shown who to reach) */
export async function generatePrayer(need: string, length: PrayerLength) {
  const { data } = await api.post<PersonalPrayer | { crisis: true; resources: CrisisResource[] }>("/prayers/personal", { need, length }, { timeout: 60_000 });
  return "crisis" in data ? data : withVoice(data);
}

export async function savePrayerFromMessage(messageId: string) {
  const { data } = await api.post<PersonalPrayer>("/prayers/personal/from-message", { messageId });
  return withVoice(data);
}

export async function editPrayer(id: string, change: { title?: string; text?: string }) {
  const { data } = await api.patch<PersonalPrayer>(`/prayers/personal/${id}`, change);
  return withVoice(data);
}

export async function deletePrayer(id: string) {
  await api.delete(`/prayers/personal/${id}`);
}

/** Records the prayer as it reads now, in `voice`, and charges `expectedTokens` (0 for the free one). */
export async function recordPrayer(id: string, expectedTokens: number, voice: VoiceId) {
  const { data } = await api.post<PersonalPrayer>(`/prayers/personal/${id}/audio`, { expectedTokens, voice }, { timeout: 70_000 });
  return withVoice(data);
}
