import { struggle } from "./struggle";
import type { FunnelConfig } from "./types";

export const funnels: Record<string, FunnelConfig> = { struggle };

// The quiz for someone signed in who hasn't answered it yet (a new Google/Apple/email sign-in, or an app account
// that skipped the quiz). ?account=1 lets a signed-in visitor through proxy.ts; the email step then only asks for
// consent, since the account already has the email.
export const MAIN_FUNNEL = "struggle";
export const ONBOARDING_URL = `/f/${MAIN_FUNNEL}?account=1`;
