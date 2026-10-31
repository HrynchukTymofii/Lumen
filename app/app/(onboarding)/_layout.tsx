import { Stack } from "expo-router";

// Signed-out screens (SPEC §10.1, Path B): welcome → quiz → sign-in (→ email → code). The sample prayer
// comes after sign-in, outside this group.
export const unstable_settings = { anchor: "welcome" };

export default function OnboardingLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
