import api from "./client";
import type { Journey, Streak, Today } from "./types";

// Today tab and the soft streak (website/app/api/today/*, website/app/api/journey)

export async function getToday() {
  const { data } = await api.get<Today>("/today");
  return data;
}

// Idempotent per day. prayerId: the library track, when the player finished it
export async function markPrayed(prayerId?: string) {
  const { data } = await api.post<{ streak: Streak }>("/today/prayed", prayerId ? { prayerId } : {});
  return data.streak;
}

// Fills yesterday with this week's grace day
export async function applyGrace() {
  const { data } = await api.post<{ streak: Streak }>("/today/grace");
  return data.streak;
}

export async function getJourney() {
  const { data } = await api.get<Journey>("/journey");
  return data;
}
