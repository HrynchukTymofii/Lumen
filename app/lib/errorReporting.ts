import AsyncStorage from "@react-native-async-storage/async-storage";
import { isAxiosError } from "axios";
import Constants from "expo-constants";
import * as Device from "expo-device";
import { Platform } from "react-native";
import api from "@/lib/api/client";

// Crash and error reports to POST /api/app/error (copied from PDR_pl lib/errorReporting.ts).
// The API client adds the login token when there is one.

const PENDING_KEY = "pendingErrorReports";
const MAX_PENDING = 20;

type ReportType = "crash" | "error";

interface ErrorReport {
  type: ReportType;
  message: string;
  stack?: string;
  isFatal?: boolean;
  page?: string;
  platform: string;
  osVersion?: string;
  deviceModel?: string;
  appVersion?: string;
}

// Current screen path, kept up to date from the root layout
let currentPage: string | undefined;

export function setCurrentPage(page: string) {
  currentPage = page;
}

function buildReport(error: unknown, type: ReportType, isFatal?: boolean): ErrorReport {
  const err = error instanceof Error ? error : new Error(String(error));
  return {
    type,
    message: err.message || String(error),
    stack: err.stack,
    isFatal,
    page: currentPage,
    platform: Platform.OS,
    osVersion: Platform.Version?.toString(),
    deviceModel: Device.modelName ?? undefined,
    appVersion: Constants.expoConfig?.version,
  };
}

async function sendReport(report: ErrorReport) {
  await api.post("/app/error", report);
}

async function savePending(report: ErrorReport) {
  try {
    const json = await AsyncStorage.getItem(PENDING_KEY);
    const pending: ErrorReport[] = json ? JSON.parse(json) : [];
    pending.push(report);
    await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(pending.slice(-MAX_PENDING)));
  } catch {
    // Nothing else we can do
  }
}

// No response = offline; server errors are dropped so they don't pile up
const isOffline = (err: unknown) => isAxiosError(err) && !err.response;

/** Report a caught error. Saved and sent later if the device is offline. */
export async function reportError(error: unknown) {
  if (__DEV__) console.warn("[reportError]", error);
  const report = buildReport(error, "error", false);
  try {
    await sendReport(report);
  } catch (err) {
    if (isOffline(err)) await savePending(report);
  }
}

/** Send reports saved while offline or right before a crash. Call on app start. */
export async function flushPendingErrors() {
  try {
    const json = await AsyncStorage.getItem(PENDING_KEY);
    if (!json) return;
    const pending: ErrorReport[] = JSON.parse(json);
    const remaining: ErrorReport[] = [];

    for (const report of pending) {
      try {
        await sendReport(report);
      } catch (err) {
        if (isOffline(err)) remaining.push(report);
      }
    }

    await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(remaining));
  } catch {
    // Try again next start
  }
}

let initialized = false;

/** Catch uncaught JS errors (including render crashes). Call once at app start. Native only. */
export function initErrorReporting() {
  if (initialized || typeof ErrorUtils === "undefined") return;
  initialized = true;

  const defaultHandler = ErrorUtils.getGlobalHandler();

  ErrorUtils.setGlobalHandler((error, isFatal) => {
    if (isFatal) {
      // The app is about to die, so there is no time for a request:
      // save it and send on the next start, then let the crash continue
      const report = buildReport(error, "crash", true);
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        defaultHandler(error, isFatal);
      };
      setTimeout(finish, 1000); // don't hang if storage is slow
      savePending(report).finally(finish);
    } else {
      reportError(error);
      defaultHandler(error, isFatal);
    }
  });
}
