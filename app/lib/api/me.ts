import api from "./client";
import type { MeResponse, ProfilePatch, User } from "./types";

// The signed-in account (website/app/api/me/route.ts)

export async function getMe() {
  const { data } = await api.get<MeResponse>("/me");
  return data;
}

export async function updateMe(patch: ProfilePatch) {
  const { data } = await api.patch<{ user: User }>("/me", patch);
  return data.user;
}

// Cancels web subscriptions and deletes everything. App Store subscriptions are cancelled in iOS settings.
export async function deleteMe() {
  await api.delete("/me");
}
