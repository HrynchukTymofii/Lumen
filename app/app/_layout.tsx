import {
  HankenGrotesk_500Medium,
  HankenGrotesk_600SemiBold,
  HankenGrotesk_700Bold,
} from "@expo-google-fonts/hanken-grotesk";
import { Literata_400Regular } from "@expo-google-fonts/literata";
import { useFonts } from "expo-font";
import * as Notifications from "expo-notifications";
import { router, Stack, usePathname, type Href } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { Platform } from "react-native";
import { RatingPrompt } from "@/components/RatingPrompt";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { trackScreen } from "@/lib/analytics";
import {
  flushPendingErrors,
  initErrorReporting,
  setCurrentPage,
} from "@/lib/errorReporting";
import { useApplyTheme } from "@/lib/themePref";
import "../global.css";

SplashScreen.preventAutoHideAsync().catch(() => {});
initErrorReporting();
flushPendingErrors();

function RootNavigator() {
  const { status, onboarded, guest } = useAuth();
  const pathname = usePathname();
  useApplyTheme();
  // Hanken Grotesk (titles and UI, as on the website), Literata (Scripture and prayers)
  const [fontsLoaded, fontError] = useFonts({
    HankenGrotesk_500Medium,
    HankenGrotesk_600SemiBold,
    HankenGrotesk_700Bold,
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

  // Tapping a reminder opens where it points (lib/notifications.ts sets data.url), once the app is open
  // Platform never changes while the app runs, so the hook order is stable (notifications don't exist on web)
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const response = Platform.OS === "web" ? null : Notifications.useLastNotificationResponse();
  const tapped = response?.notification.request.content.data?.url;
  useEffect(() => {
    if (ready && typeof tapped === "string" && tapped.startsWith("/")) router.push(tapped as Href);
  }, [ready, tapped]);

  // Guards are only evaluated once we know whether there is a saved login
  if (!ready) return null;
  const signedIn = status === "signedIn";
  // The app: signed in and onboarded, or trying it without an account (lib/account.ts)
  const inApp = signedIn ? onboarded : guest;
  // Where each guard sends someone who isn't allowed in
  const home = inApp ? "/" : signedIn ? "/sample-prayer" : "/welcome";

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={inApp} redirectTo={home}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="prayer/[slug]" />
          <Stack.Screen
            name="player/[slug]"
            options={{
              presentation: "fullScreenModal",
              animation: "slide_from_bottom",
            }}
          />
          <Stack.Screen name="companion/[id]" />
          <Stack.Screen name="bible/[book]/[chapter]" />
          <Stack.Screen name="bible/notes" />
          <Stack.Screen name="search" options={{ animation: "fade" }} />
          <Stack.Screen name="notifications" />
          <Stack.Screen name="list/[key]" />
          <Stack.Screen name="journal/[kind]" />
          <Stack.Screen name="streak" />
          <Stack.Screen name="plans" />
          <Stack.Screen name="plans/[id]" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="settings/profile" />
          <Stack.Screen name="settings/general" />
          <Stack.Screen name="settings/subscription" />
          <Stack.Screen name="settings/legal" />
          <Stack.Screen name="settings/support" />
          <Stack.Screen name="personal-prayer/index" />
          <Stack.Screen name="personal-prayer/new" />
          <Stack.Screen name="personal-prayer/[id]" />
          <Stack.Screen name="personal-prayer/tokens" options={{ presentation: "modal" }} />
        </Stack.Protected>
        {/* Onboarding after sign-in: the first prayer, then the 7-day path, then the paywall */}
        <Stack.Protected guard={signedIn && !onboarded} redirectTo={home}>
          <Stack.Screen name="sample-prayer" />
          <Stack.Screen name="onboarding-path" />
        </Stack.Protected>
        {/* A subscription belongs to the account: in the app, and as onboarding's last step */}
        <Stack.Protected guard={signedIn} redirectTo={home}>
          <Stack.Screen name="paywall" options={{ presentation: "modal" }} />
        </Stack.Protected>
        {/* Also open to someone trying the app, to sign in from inside it */}
        <Stack.Protected guard={!signedIn} redirectTo={home}>
          <Stack.Screen name="(onboarding)" />
        </Stack.Protected>
      </Stack>
      {signedIn && onboarded && <RatingPrompt />}
    </>
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
