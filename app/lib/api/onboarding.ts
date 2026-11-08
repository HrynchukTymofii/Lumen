import api from "./client";
import type { Answers, SamplePrayer, User } from "./types";

// In-app onboarding (SPEC §10.1, Path B)

export async function submitOnboarding(answers: Answers, sensitiveConsent: boolean) {
  const { data } = await api.post<{ user: User }>("/me/onboarding", { answers, sensitiveConsent });
  return data.user;
}

// The same prayer the web funnel shows; the server falls back to a template when the AI is off or slow
export async function getSamplePrayer(answers: Answers) {
  const { data } = await api.post<SamplePrayer>("/funnel/sample-prayer", { answers }, { timeout: 20000 });
  return data;
}

// The funnel's recorded first prayer (admin library, category "funnel"), the same one the web funnel plays.
// null when none is published yet: the written prayer stands in.
export interface FunnelRecording {
  slug: string;
  title: string;
  scene: string;
  imageUrl: string | null;
  url: string;
  durationSec: number | null;
  lines: { t: number | null; text: string; p?: boolean }[];
}

export async function getFunnelRecording(struggles: string[] = []) {
  const { data } = await api.get<{ recording: FunnelRecording | null }>("/funnel/recording", { params: { s: struggles.join(",") } });
  return data.recording;
}
