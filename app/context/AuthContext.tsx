import AsyncStorage from "@react-native-async-storage/async-storage";
import { isAxiosError } from "axios";
import { getCalendars } from "expo-localization";
import { AppState } from "react-native";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { identifyUser, resetUser } from "@/lib/analytics";
import { setApiToken, setAuthHandlers } from "@/lib/api/client";
import { deleteMe, getMe, reportSeen, updateMe } from "@/lib/api/me";
import { submitOnboarding } from "@/lib/api/onboarding";
import type { LoginResponse, MeResponse, Premium, ProfilePatch, User } from "@/lib/api/types";
import { reportError } from "@/lib/errorReporting";
import { cancelReminders } from "@/lib/notifications";
import { clearPendingOnboarding, getPendingOnboarding } from "@/lib/onboarding";
import { identifyPurchases, resetPurchases } from "@/lib/purchases";
import { clearLocalLibrary, flushLibrary, syncLibrary } from "@/lib/sync";
import { deleteSecure, getSecure, setSecure } from "@/lib/storage";

// Adapted from PDR_pl context/AuthContext.tsx: the token and the last known account live in SecureStore,
// so the app opens signed in (and offline) right away, then refreshes the account from GET /api/me.

const TOKEN_KEY = "token";
const ACCOUNT_KEY = "account"; // { user, premium } from the last GET /api/me
// Set when someone closes the welcome screen to try the app without an account, so it reopens in the app
const GUEST_KEY = "browsingAsGuest";

type Status = "loading" | "signedOut" | "signedIn";

interface AuthContextType {
  status: Status;
  token: string | null;
  user: User | null;
  premium: Premium;
  // False while quiz answers from before the sign-in wait to be sent (the sample prayer screen is next)
  onboarded: boolean;
  // Signed out, but trying the app without an account (lib/account.ts)
  guest: boolean;
  continueAsGuest: () => Promise<void>;
  signIn: (res: LoginResponse) => Promise<void>;
  signOut: () => Promise<void>;
  // Re-reads the account and premium status (after a purchase, on returning to the app)
  refresh: () => Promise<void>;
  updateProfile: (patch: ProfilePatch) => Promise<User>;
  deleteAccount: () => Promise<void>;
  // Sends the quiz answers to the account and opens the app
  finishOnboarding: () => Promise<void>;
}

const FREE: Premium = { active: false };

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<Status>("loading");
  const [token, setTokenState] = useState<string | null>(null);
  const [account, setAccount] = useState<MeResponse | null>(null);
  const [onboarded, setOnboarded] = useState(true);
  const [guest, setGuest] = useState(false);
  // The token a running request belongs to, so a slow answer can't bring back a signed-out account
  const tokenRef = useRef<string | null>(null);

  const saveToken = useCallback(async (value: string | null) => {
    tokenRef.current = value;
    setApiToken(value);
    setTokenState(value);
    if (value) await setSecure(TOKEN_KEY, value);
    else await deleteSecure(TOKEN_KEY);
  }, []);

  const saveAccount = useCallback(async (value: MeResponse | null) => {
    setAccount(value);
    if (value) await setSecure(ACCOUNT_KEY, JSON.stringify(value));
    else await deleteSecure(ACCOUNT_KEY);
  }, []);

  const saveGuest = useCallback(async (value: boolean) => {
    setGuest(value);
    if (value) await AsyncStorage.setItem(GUEST_KEY, "1").catch(reportError);
    else await AsyncStorage.removeItem(GUEST_KEY).catch(reportError);
  }, []);

  const continueAsGuest = useCallback(() => saveGuest(true), [saveGuest]);

  // Signing out goes back to the welcome screen, not to trying the app
  const signOut = useCallback(async () => {
    // Changes still waiting to go up are sent while the token works, then this library leaves the phone
    await flushLibrary();
    await saveToken(null);
    clearLocalLibrary().catch(reportError);
    await saveAccount(null);
    await clearPendingOnboarding();
    resetUser();
    resetPurchases().catch(reportError);
    // The next person on this phone shouldn't get this person's reminders
    cancelReminders().catch(reportError);
    await saveGuest(false);
    setStatus("signedOut");
  }, [saveToken, saveAccount, saveGuest]);

  const refresh = useCallback(async () => {
    const sentWith = tokenRef.current;
    if (!sentWith) return;
    try {
      const me = await getMe();
      if (tokenRef.current !== sentWith) return;
      await saveAccount(me);
      identifyUser(me.user, me.premium.active);
    } catch (err) {
      // 401 already signed out (client interceptor); offline keeps the cached account
      if (isAxiosError(err) && (!err.response || err.response.status === 401)) return;
      reportError(err);
    }
  }, [saveAccount]);

  const signIn = useCallback(
    async (res: LoginResponse) => {
      await saveToken(res.token);
      await saveAccount({ user: res.user, premium: FREE });
      await saveGuest(false);
      identifyUser(res.user, false);
      setOnboarded(!(await getPendingOnboarding()));
      setStatus("signedIn");
      // Premium status isn't part of the login answer
      refresh();
    },
    [saveToken, saveAccount, saveGuest, refresh],
  );

  const updateProfile = useCallback(
    async (patch: ProfilePatch) => {
      const user = await updateMe(patch);
      await saveAccount({ user, premium: account?.premium ?? FREE });
      return user;
    },
    [saveAccount, account],
  );

  const finishOnboarding = useCallback(async () => {
    const pending = await getPendingOnboarding();
    if (pending) {
      const user = await submitOnboarding(pending.answers, pending.sensitiveConsent);
      await saveAccount({ user, premium: account?.premium ?? FREE });
      await clearPendingOnboarding();
    }
    setOnboarded(true);
  }, [saveAccount, account]);

  const deleteAccount = useCallback(async () => {
    await deleteMe();
    await signOut();
  }, [signOut]);

  // Once per launch per account: tie purchases to the account and keep the server's timezone in step with the
  // phone's, so the streak counts days at the person's own midnight
  const userId = account?.user.id;
  useEffect(() => {
    if (!userId) return;
    identifyPurchases(userId).catch(reportError);
    syncLibrary(userId);
    const timezone = getCalendars()[0]?.timeZone;
    if (timezone) updateMe({ timezone }).catch(() => {});
    reportSeen(true);
  }, [userId]);

  // Coming back to the app picks up library changes made on another phone or the web (and reports the
  // app version, at most every few hours)
  useEffect(() => {
    if (!userId) return;
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active") return;
      syncLibrary(userId);
      reportSeen();
    });
    return () => sub.remove();
  }, [userId]);

  // The API client reports refreshed and rejected tokens here
  useEffect(() => {
    setAuthHandlers({
      onRefreshed: (fresh) => {
        saveToken(fresh).catch(reportError);
      },
      onUnauthorized: () => {
        signOut().catch(reportError);
      },
    });
  }, [saveToken, signOut]);

  useEffect(() => {
    const load = async () => {
      const storedToken = await getSecure(TOKEN_KEY);
      const storedAccount = await getSecure(ACCOUNT_KEY);

      if (!storedToken) {
        if (storedAccount) await deleteSecure(ACCOUNT_KEY);
        setGuest((await AsyncStorage.getItem(GUEST_KEY).catch(() => null)) === "1");
        setStatus("signedOut");
        return;
      }
      tokenRef.current = storedToken;
      setApiToken(storedToken);
      setOnboarded(!(await getPendingOnboarding()));
      setTokenState(storedToken);

      let cached: MeResponse | null = null;
      try {
        cached = storedAccount ? JSON.parse(storedAccount) : null;
      } catch (err) {
        console.error("Failed to parse stored account", err);
      }

      if (cached) {
        setAccount(cached);
        identifyUser(cached.user, cached.premium.active);
        setStatus("signedIn");
        refresh();
      } else {
        // A token without an account (old install): ask the server before opening the app
        await refresh();
        setStatus(tokenRef.current ? "signedIn" : "signedOut");
      }
    };
    load().catch((err) => {
      reportError(err);
      setStatus("signedOut");
    });
    // Runs once on start; refresh is stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthContext.Provider
      value={{
        status,
        token,
        user: account?.user ?? null,
        premium: account?.premium ?? FREE,
        onboarded,
        guest,
        continueAsGuest,
        signIn,
        signOut,
        refresh,
        updateProfile,
        deleteAccount,
        finishOnboarding,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
