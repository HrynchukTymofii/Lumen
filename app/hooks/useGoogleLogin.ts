import { useState } from "react";
import { Platform } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { signInWithGoogleToken } from "@/lib/api/auth";
import { errorMessage } from "@/lib/api/client";
import { GOOGLE_IOS_CLIENT_ID, GOOGLE_WEB_CLIENT_ID } from "@/lib/config";
import { reportError } from "@/lib/errorReporting";

type GoogleModule = typeof import("@react-native-google-signin/google-signin");

// The native module exists only in development and store builds (not Expo Go, not web), and the button
// needs the client ids, so Google sign-in is optional: without it the button is hidden.
function loadGoogle(): GoogleModule | null {
  if (Platform.OS === "web" || !GOOGLE_WEB_CLIENT_ID) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const google: GoogleModule = require("@react-native-google-signin/google-signin");
    google.GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID, iosClientId: GOOGLE_IOS_CLIENT_ID || undefined });
    return google;
  } catch {
    return null;
  }
}

const google = loadGoogle();

// Google sign-in (adapted from PDR_pl hooks/useGoogleLogin.ts). The route guards move on after signIn.
export function useGoogleLogin() {
  const { signIn } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = async () => {
    if (!google || loading) return;
    const { GoogleSignin, isErrorWithCode, isSuccessResponse, statusCodes } = google;
    setLoading(true);
    setError(null);
    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      if (!isSuccessResponse(response)) return; // closed the Google sheet
      const { idToken } = response.data;
      if (!idToken) throw new Error("Google returned no id token");
      await signIn(await signInWithGoogleToken(idToken));
    } catch (err) {
      if (isErrorWithCode(err)) {
        if (err.code === statusCodes.IN_PROGRESS) return;
        if (err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
          setError("Google sign-in needs Google Play services on this phone.");
          return;
        }
      }
      reportError(err);
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return { available: Boolean(google), login, loading, error };
}
