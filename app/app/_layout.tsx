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
  const { status } = useAuth();
  const pathname = usePathname();

  useEffect(() => {
    setCurrentPage(pathname);
    trackScreen(pathname);
  }, [pathname]);

  useEffect(() => {
    if (status !== "loading") SplashScreen.hideAsync().catch(() => {});
  }, [status]);

  // Guards are only evaluated once we know whether there is a saved login
  if (status === "loading") return null;
  const signedIn = status === "signedIn";

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={signedIn} redirectTo="/sign-in">
        <Stack.Screen name="index" />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn} redirectTo="/">
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
