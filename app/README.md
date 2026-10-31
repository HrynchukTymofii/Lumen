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
