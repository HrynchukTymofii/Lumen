import { Platform } from "react-native";
import api from "./client";
import type { LoginResponse } from "./types";

// Login routes (website/app/api/auth/*). Each one answers with { token, user, isNew }; AuthContext.signIn keeps it.

const platform = Platform.OS === "ios" || Platform.OS === "android" ? Platform.OS : "web";

// Emails a 6-digit code and a sign-in link. Always "ok", even for unknown emails.
export async function startEmailLogin(email: string) {
  await api.post("/auth/email/start", { email });
}

export async function verifyEmailCode(email: string, code: string) {
  const { data } = await api.post<LoginResponse>("/auth/email/verify", { email, code, platform });
  return data;
}

// One-time links: the link in the sign-in email and the web → app link from the success page
export async function exchangeLoginLink(token: string) {
  const { data } = await api.post<LoginResponse>("/auth/link/exchange", { token, platform });
  return data;
}

export async function signInWithAppleToken(idToken: string, firstName?: string) {
  const { data } = await api.post<LoginResponse>("/auth/apple", { id_token: idToken, firstName: firstName || undefined, platform });
  return data;
}

export async function signInWithGoogleToken(idToken: string) {
  const { data } = await api.post<LoginResponse>("/auth/google", { id_token: idToken, platform });
  return data;
}
