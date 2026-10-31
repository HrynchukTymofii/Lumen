import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Answers } from "@/lib/api/types";

// Quiz answers picked before signing in (PDR_pl lib/onboarding.ts pattern). They are sent to the server after
// the sample prayer, then cleared. While they exist, a signed-in user hasn't finished onboarding.

const PENDING_KEY = "pendingOnboarding";

export interface PendingOnboarding {
  answers: Answers;
  // Consent to store faith and what they're carrying (asked on the sign-in screen)
  sensitiveConsent: boolean;
}

export async function getPendingOnboarding(): Promise<PendingOnboarding | null> {
  try {
    const json = await AsyncStorage.getItem(PENDING_KEY);
    return json ? JSON.parse(json) : null;
  } catch {
    return null;
  }
}

export async function savePendingOnboarding(patch: { answers?: Answers; sensitiveConsent?: boolean }) {
  const current = (await getPendingOnboarding()) ?? { answers: {}, sensitiveConsent: false };
  const next: PendingOnboarding = {
    answers: { ...current.answers, ...patch.answers },
    sensitiveConsent: patch.sensitiveConsent ?? current.sensitiveConsent,
  };
  await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(next));
  return next;
}

export async function clearPendingOnboarding() {
  await AsyncStorage.removeItem(PENDING_KEY);
}

// Answers the server only stores with consent (the funnel marks these steps `sensitive`)
export const hasSensitiveAnswers = (a: Answers) => Boolean(a.struggles?.length || a.denomination || a.burden);
