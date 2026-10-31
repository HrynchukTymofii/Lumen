import axios, { isAxiosError } from "axios";
import { SITE_URL } from "@/lib/config";

// One axios instance for the website API (adapted from PDR_pl lib/axios.ts). AuthContext owns the token
// and hands it over with setApiToken; the interceptors attach it and report back what the server says.

const api = axios.create({
  baseURL: `${SITE_URL}/api`,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

let token: string | null = null;
let onRefreshed: (token: string) => void = () => {};
let onUnauthorized: () => void = () => {};

export function setApiToken(value: string | null) {
  token = value;
}

export function setAuthHandlers(handlers: { onRefreshed: (token: string) => void; onUnauthorized: () => void }) {
  onRefreshed = handlers.onRefreshed;
  onUnauthorized = handlers.onUnauthorized;
}

api.interceptors.request.use((config) => {
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => {
    // The server swaps tokens older than a day, so an active user never reaches the 60-day expiry
    const fresh = res.headers["x-refreshed-token"];
    if (typeof fresh === "string" && fresh && token) onRefreshed(fresh);
    return res;
  },
  (err) => {
    // Sign out only if the rejected token is still the current one (not a request from before a new login)
    const sent = err?.config?.headers?.Authorization;
    if (isAxiosError(err) && err.response?.status === 401 && token && sent === `Bearer ${token}`) onUnauthorized();
    return Promise.reject(err);
  },
);

// The server's { error } message, or a plain one when the request never got an answer
export function errorMessage(err: unknown): string {
  if (isAxiosError(err)) {
    const message = (err.response?.data as { error?: unknown } | undefined)?.error;
    if (typeof message === "string") return message;
    if (!err.response) return "No connection. Check your internet and try again.";
  }
  return "Something went wrong. Please try again.";
}

export default api;
