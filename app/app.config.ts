import type { ExpoConfig } from "expo/config";

// Google sign-in needs its iOS URL scheme at build time, and its plugin fails without one,
// so it is added only once the Google client ids exist (see .env.example).
const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.replace(/\.apps\.googleusercontent\.com$/, "");

const config: ExpoConfig = {
  name: "Lumen",
  slug: "prayer-companion",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  scheme: "prayercompanion",
  userInterfaceStyle: "automatic",
  ios: {
    bundleIdentifier: "com.hrynchuk.biblecompanion",
    supportsTablet: true,
    usesAppleSignIn: true,
  },
  android: {
    package: "com.hrynchuk.biblecompanion",
    adaptiveIcon: {
      backgroundColor: "#E6F4FE",
      foregroundImage: "./assets/android-icon-foreground.png",
      backgroundImage: "./assets/android-icon-background.png",
      monochromeImage: "./assets/android-icon-monochrome.png",
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/favicon.png",
  },
  plugins: [
    "expo-router",
    "expo-font",
    "expo-secure-store",
    "expo-localization",
    "expo-splash-screen",
    "expo-apple-authentication",
    // Guided prayers keep playing with the screen locked
    ["expo-audio", { enableBackgroundPlayback: true }],
    // Daily reminders are scheduled on the phone (lib/notifications.ts)
    ["expo-notifications", { color: "#5F7334" }],
    ...(googleIosClientId
      ? [["@react-native-google-signin/google-signin", { iosUrlScheme: `com.googleusercontent.apps.${googleIosClientId}` }] as [string, object]]
      : []),
  ],
  experiments: {
    typedRoutes: true,
  },
};

export default config;
