import { createLocalStore } from "./localStore";

// Permission to send companion messages to third-party AI (App Review Guideline 5.1.2(i): disclose where personal data
// goes, including third-party AI, and get explicit permission first). Asked once per device before the first message
// (components/AiConsentSheet.tsx); turning the AI companion off in Settings stops all sharing.
// Bump the version if the providers or what is shared change, so everyone is asked again.
const VERSION = 1;

const store = createLocalStore<{ version: number; at: string } | null>("ai_consent", null);

export const useAiConsent = () => {
  const saved = store.use();
  return saved?.version === VERSION;
};

export async function hasAiConsent() {
  await store.ready();
  return store.get()?.version === VERSION;
}

export const giveAiConsent = () => store.set({ version: VERSION, at: new Date().toISOString() });
