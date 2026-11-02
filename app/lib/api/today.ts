import { getCalendars } from "expo-localization";
import api from "./client";
import type { Journey, Streak, Today } from "./types";

// Today tab and the soft streak (website/app/api/today/*, website/app/api/journey)

// Without an account the server doesn't know the timezone, so the verse of the day follows the phone's
export async function getToday() {
  const { data } = await api.get<Today>("/today", { params: { tz: getCalendars()[0]?.timeZone ?? undefined } });
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
