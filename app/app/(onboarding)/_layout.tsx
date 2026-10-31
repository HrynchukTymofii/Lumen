import { Stack } from "expo-router";

// Signed-out screens. Welcome, quiz and sample prayer come here next (SPEC §10.1).
export default function OnboardingLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
