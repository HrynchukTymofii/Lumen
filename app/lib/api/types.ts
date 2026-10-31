// Response shapes of the website API (website/lib/auth/users.ts publicUser, app/api/me/route.ts).

export type Denomination = "catholic" | "protestant" | "orthodox" | "not_sure" | "exploring";
export type Translation = "WEB" | "KJV" | "DRA";

export interface User {
  id: string;
  email: string;
  firstName: string | null;
  denomination: Denomination | null;
  translation: Translation;
  aiEnabled: boolean;
  weeklyGoal: number;
}

export type Premium =
  | { active: false }
  | {
      active: true;
      source: "stripe" | "app_store" | "play_store";
      productId: string;
      status: string;
      currentPeriodEnd: string | null;
    };

export interface LoginResponse {
  token: string;
  user: User;
  isNew: boolean;
}

export interface MeResponse {
  user: User;
  premium: Premium;
}

export type ProfilePatch = Partial<Pick<User, "firstName" | "denomination" | "translation" | "aiEnabled" | "weeklyGoal">> & {
  timezone?: string;
};

// Quiz answers, same shape as the web funnel (website/funnels/types.ts Answers)
export interface Answers {
  struggles?: string[];
  burden?: number;
  denomination?: string;
  prayerFrequency?: string;
  obstacles?: string[];
  aiComfort?: string;
  firstName?: string;
  prayerTime?: string;
}

export interface Citation {
  ref: string;
  text: string;
}

export interface SamplePrayer {
  title: string;
  text: string;
  citations: Citation[];
  source: "ai" | "template";
}
