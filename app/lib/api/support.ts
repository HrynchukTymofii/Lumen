import * as Application from "expo-application";
import { Platform } from "react-native";
import api from "./client";

// The Contact & Support form (website/app/api/support/route.ts). Works signed in or not; the server
// emails the support inbox with Reply-To set to `email`. Keys match website/lib/support.ts.

export const SUPPORT_TOPICS = [
  { value: "account", label: "Account & sign-in" },
  { value: "subscription", label: "Subscription & billing" },
  { value: "bug", label: "Something isn't working" },
  { value: "feedback", label: "Ideas & feedback" },
  { value: "other", label: "Something else" },
] as const;

export type SupportTopic = (typeof SUPPORT_TOPICS)[number]["value"];

export const SUPPORT_MESSAGE_MAX = 5000;

export async function sendSupportRequest(request: { email: string; name?: string; topic: SupportTopic; message: string }) {
  await api.post("/support", {
    ...request,
    platform: Platform.OS === "android" ? "android" : Platform.OS === "web" ? "web" : "ios",
    appVersion: [Application.nativeApplicationVersion, Application.nativeBuildVersion && `(${Application.nativeBuildVersion})`].filter(Boolean).join(" ") || null,
  });
}
