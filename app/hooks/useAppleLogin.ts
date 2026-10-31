import * as AppleAuthentication from "expo-apple-authentication";
import { useEffect, useState } from "react";
import { Platform } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { signInWithAppleToken } from "@/lib/api/auth";
import { errorMessage } from "@/lib/api/client";
import { reportError } from "@/lib/errorReporting";

// Sign in with Apple (adapted from PDR_pl hooks/useAppleLogin.ts). iOS only; the route guards move on after signIn.
export function useAppleLogin() {
  const { signIn } = useAuth();
  const [available, setAvailable] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (Platform.OS !== "ios") return;
    AppleAuthentication.isAvailableAsync().then(setAvailable, () => setAvailable(false));
  }, []);

  const login = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
      });
      if (!credential.identityToken) throw new Error("Apple returned no identity token");
      // Apple sends the name only on the very first sign-in
      await signIn(await signInWithAppleToken(credential.identityToken, credential.fullName?.givenName ?? undefined));
    } catch (err) {
      if ((err as { code?: string }).code === "ERR_REQUEST_CANCELED") return; // closed the Apple sheet
      reportError(err);
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return { available, login, loading, error };
}
