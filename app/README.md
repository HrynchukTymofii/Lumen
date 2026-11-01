# App

Expo (React Native) + Expo Router + TypeScript + NativeWind (Tailwind classes).

```bash
npm install
cp .env.example .env.local   # point EXPO_PUBLIC_API_URL at the running website
npm start                    # then scan the QR code with Expo Go, or press a / i / w
```

Screens live in `app/` (file-based routing, `_layout.tsx` defines the navigator).
Add packages with `npx expo install <package>` so versions match the Expo SDK.

## Talking to the website

- `EXPO_PUBLIC_API_URL` is the website (`website/`); the API is under `/api`. On a real phone `localhost` is the
  phone itself, so use the computer's LAN IP (`http://192.168.x.x:3000`). Reload the app after changing it.
- Without `RESEND_API_KEY` the website prints the sign-in code in its console instead of emailing it.
- In development the website allows cross-origin API calls, so `npm run web` works too (the phone app needs no CORS).

## Login

- `context/AuthContext.tsx` keeps the token and the last known account in SecureStore (`localStorage` on web) and
  refreshes them from `GET /api/me`. `status` is `loading` / `signedOut` / `signedIn`; the root layout gates screens on
  it with `Stack.Protected`.
- `lib/api/client.ts` adds `Authorization: Bearer …`, saves the new token from the `x-refreshed-token` header, and signs
  out when the server rejects the current token (401).
- `lib/errorReporting.ts` sends crashes and caught errors to `POST /api/app/error` (`AppError` table).
- `lib/analytics.ts`: PostHog, off without `EXPO_PUBLIC_POSTHOG_KEY` and on web. Its event map copies
  `website/lib/analytics/events.ts`; keep them in sync.

## Onboarding

- Signed out: `(onboarding)/welcome` → `quiz/[step]` → `sign-in` (→ `email` → `email-code`). Signed in with quiz
  answers still waiting: `sample-prayer`. "Amen" sends the answers (`POST /api/me/onboarding`) and opens the app.
  The root layout picks the screen with `Stack.Protected` guards.
- Shared with the website (imported as `@website/...`, see `metro.config.js`): `website/funnels/options.ts` (answer
  options) and `website/lib/kit/art.ts` (landscape scenes). Those files must not import anything outside themselves.
- Colors are CSS variables in `global.css` (Olive palette, light + dark), used as Tailwind classes (`bg-bg`,
  `text-ink`, `bg-olive`…). Fonts: `font-display` (Outfit), `font-sans` / `font-sans-bold` (Manrope), `font-serif`
  (Literata, Scripture and prayers only).
- Sign in with Apple shows on iOS only. Google needs `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` / `_IOS_CLIENT_ID` and a
  development build; without them the button is hidden. Expo Go and web show email only.

## Main app

- Tabs (`app/(tabs)`): **Today · Bible · Discover · Companion · Me** (layouts follow the Hallow screens in `/assets`).
  `/` redirects to `/today`. Settings opens from Me (`app/settings.tsx`, sub-pages in
  `app/settings/`). Stacked over the tabs: `prayer/[slug]`, `player/[slug]`, `companion/[id]`,
  `bible/[book]/[chapter]`, `bible/notes`, `search`, `notifications`, `list/[key]`, `journal/[kind]`, `streak`,
  `paywall` (modal).
- Bible: one continuous reader (`components/bible/Reader.tsx`) that loads the next / previous chapter as you scroll,
  with a pinned "Book N ⌄" header (book picker) and a chapter bookmark. Highlights (4 colors), notes and bookmarks
  live on the device (`lib/bibleMarks.ts`).
- The person's library is synced to their account: favorites and recently played (`lib/userLibrary.ts`), intentions
  and reflections (`lib/journal.ts`), Bible highlights / notes / bookmarks (`lib/bibleMarks.ts`). The phone works
  from a local copy (AsyncStorage, `lib/localStore.ts`); changes queue in an outbox (`lib/syncQueue.ts`) sent to
  `POST /api/me/sync`, and `lib/sync.ts` pulls the account's copy on sign-in and when the app comes to the
  foreground. Sign-out clears it from the phone. Per phone only: downloads (audio files, `expo-file-system`) and the
  theme choice (`lib/themePref.ts`).
- Today's Trending shelf: `GET /api/library/trending` (most-prayed tracks, last 30 days); hidden under 3 tracks.
  The Streak screen's calendar uses `days` from `GET /api/journey`.
- Streak: `GET /api/today` returns the week; "Mark as prayed" and finishing a prayer in the player call
  `POST /api/today/prayed`. Missed days never reset anything; one grace day a week (`POST /api/today/grace`).
- Player: `expo-audio`, keeps playing with the screen locked.
- Reminders: scheduled on the phone with `expo-notifications` (`lib/notifications.ts`), not pushed from the server.
  The next 7 days are scheduled at the time in Settings (or behind the bell on Today) and today is skipped once prayed; Today
  re-schedules on load.
- Purchases: RevenueCat (`lib/purchases.ts`). Set `EXPO_PUBLIC_REVENUECAT_IOS_KEY` / `_ANDROID_KEY`. The RevenueCat
  user id is our user id; after a purchase the app calls `POST /api/me/sync-purchases`, and the website's
  `/api/webhooks/revenuecat` keeps it in step. Premium always comes from `GET /api/me`.
- `expo-audio`, `expo-notifications` and `react-native-purchases` are native: after installing, rebuild the
  development build (`npx expo run:android` / `run:ios`). Expo Go can't make real purchases.
