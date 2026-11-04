import * as StoreReview from "expo-store-review";
import { useSyncExternalStore } from "react";
import { hasApiToken } from "./api/client";
import { createLocalStore } from "./localStore";
import { reportError } from "./errorReporting";

// When to ask how Holy Hush is helping: only after a good moment has ended (a prayer listened to the end, a companion
// chat of 3+ messages left), never during one, and at most every 90 days. Our card asks for stars
// (components/RatingPrompt.tsx): 4–5 go on to the store's own review prompt, 1–3 to a short "what could be
// better?" saved to the account (POST /api/me/rating). Apple and Google decide themselves whether their prompt
// actually appears (Apple: at most 3 times a year, never in TestFlight).

export type Moment = "prayer" | "companion";

const DAY = 24 * 60 * 60 * 1000;
const CARD_EVERY = 90 * DAY;

const asked = createLocalStore<{ card?: number }>("reviewAsked", {});

// The card waiting to be shown (RatingPrompt draws it)
let pending: Moment | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function usePendingRating() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => pending,
  );
}

export function closeRating() {
  pending = null;
  emit();
}

/** A good moment just ended: maybe ask how Holy Hush is helping (signed-in only: the answer is saved to the account) */
export async function reviewMoment(moment: Moment) {
  try {
    if (!hasApiToken()) return;
    await asked.ready();
    const { card } = asked.get();
    const now = Date.now();
    if (card && now - card < CARD_EVERY) return;
    asked.set((a) => ({ ...a, card: now }));
    // After the screen that just closed has slid away
    setTimeout(() => {
      pending = moment;
      emit();
    }, 700);
  } catch (err) {
    reportError(err);
  }
}

/** The store's own review prompt, for someone who just gave 4–5 stars */
export async function askStoreReview() {
  try {
    if (await StoreReview.hasAction()) await StoreReview.requestReview();
  } catch (err) {
    reportError(err);
  }
}
