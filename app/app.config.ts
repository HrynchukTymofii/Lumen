import type { ExpoConfig } from "expo/config";

// Google sign-in needs its iOS URL scheme at build time, and its plugin fails without one,
// so it is added only once the Google client ids exist (see .env.example).
const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.replace(/\.apps\.googleusercontent\.com$/, "");

const config: ExpoConfig = {
  name: "Holy Hush",
  slug: "prayer-companion",
  version: "1.1.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  scheme: "prayercompanion",
  userInterfaceStyle: "automatic",
  ios: {
    bundleIdentifier: "com.hrynchuk.biblecompanion",
    supportsTablet: true,
    usesAppleSignIn: true,
    // Only standard HTTPS, so App Store Connect stops asking about encryption on every build
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      // Required by App Store Connect (ITMS-90683): expo-file-system's code can read photo-library assets (ph://),
      // so the binary references the Photos API. Holy Hush never asks for photo access; this text would only show if it did.
      NSPhotoLibraryUsageDescription: "Holy Hush doesn’t use your photo library. If a future feature needs a picture from it, Holy Hush will ask you first and only open the picture you choose.",
    },
  },
  android: {
    package: "com.hrynchuk.biblecompanion",
    adaptiveIcon: {
      backgroundColor: "#1C1915",
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
    ["expo-notifications", { color: "#1C1915" }],
    // Speaking a message in the companion chat (hooks/useVoiceInput.ts)
    [
      "expo-speech-recognition",
      {
        microphonePermission: "Holy Hush uses the microphone so you can speak your messages instead of typing.",
        speechRecognitionPermission: "Holy Hush turns what you say into text for your message and doesn’t keep the audio.",
      },
    ],
    ...(googleIosClientId
      ? [["@react-native-google-signin/google-signin", { iosUrlScheme: `com.googleusercontent.apps.${googleIosClientId}` }] as [string, object]]
      : []),
  ],
  experiments: {
    typedRoutes: true,
  },
  owner: "hrynchuk",
  extra: {
    eas: { projectId: "a3254160-6fc2-4191-8340-fed5c0ed9e79" },
  },
};

export default config;
