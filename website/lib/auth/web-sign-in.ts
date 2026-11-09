// Client ids for Sign in with Apple / Google on the website (/app/login). Both are public values.
//
// Google: the OAuth "Web application" client the app also uses (EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID); it is already
// one of the audiences in GOOGLE_CLIENT_ID. Its "Authorized JavaScript origins" in Google Cloud must list the
// site's origin (https://holyhush.fibipals.com, and http://localhost:3000 for development).
//
// Apple: the web needs a Services ID (developer.apple.com → Identifiers → Services IDs, e.g.
// com.hrynchuk.biblecompanion.web) with Sign in with Apple turned on, the site's domain and the return URL
// https://holyhush.fibipals.com/app/login. Set it as APPLE_SERVICES_ID; until then the Apple button stays hidden.

const GOOGLE_WEB_CLIENT_ID = "37818192832-jsjmqa569qeevte7jse45vm2to2geasr.apps.googleusercontent.com";

export function webSignInConfig() {
  return {
    google: process.env.GOOGLE_WEB_CLIENT_ID || GOOGLE_WEB_CLIENT_ID,
    apple: process.env.APPLE_SERVICES_ID || null,
  };
}
