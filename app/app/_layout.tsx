import { Literata_400Regular } from "@expo-google-fonts/literata";
import { Manrope_500Medium, Manrope_600SemiBold, Manrope_800ExtraBold } from "@expo-google-fonts/manrope";
import { Outfit_600SemiBold } from "@expo-google-fonts/outfit";
import { useFonts } from "expo-font";
import { Stack, usePathname } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { trackScreen } from "@/lib/analytics";
import { flushPendingErrors, initErrorReporting, setCurrentPage } from "@/lib/errorReporting";
import "../global.css";

SplashScreen.preventAutoHideAsync().catch(() => {});
initErrorReporting();
flushPendingErrors();

function RootNavigator() {
  const { status, onboarded } = useAuth();
  const pathname = usePathname();
  // Outfit (titles), Manrope (UI), Literata (Scripture and prayers), SPEC §3
  const [fontsLoaded, fontError] = useFonts({
    Outfit_600SemiBold,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_800ExtraBold,
    Literata_400Regular,
  });
  const ready = status !== "loading" && (fontsLoaded || Boolean(fontError));

  useEffect(() => {
    setCurrentPage(pathname);
    trackScreen(pathname);
  }, [pathname]);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  // Guards are only evaluated once we know whether there is a saved login
  if (!ready) return null;
  const signedIn = status === "signedIn";
  // Where each guard sends someone who isn't allowed in
  const home = !signedIn ? "/welcome" : onboarded ? "/" : "/sample-prayer";

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={signedIn && onboarded} redirectTo={home}>
        <Stack.Screen name="index" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && !onboarded} redirectTo={home}>
        <Stack.Screen name="sample-prayer" />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn} redirectTo={home}>
        <Stack.Screen name="(onboarding)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
      <StatusBar style="auto" />
    </AuthProvider>
  );
}
