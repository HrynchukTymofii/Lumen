import { SignJWT, importPKCS8 } from "jose";

// Sign in with Apple tokens, so deleting an account also revokes it at Apple (App Store guideline 5.1.1(v)).
// At sign-in the app sends Apple's one-time authorization code; it is swapped here for a refresh token, kept on
// the user, and revoked when the account is deleted. Needs a Sign in with Apple key (developer.apple.com →
// Keys): APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY (the .p8 contents, newlines as \n), plus APPLE_CLIENT_ID
// (the app's bundle id). Without them sign-in still works, and nothing is revoked.

const APPLE = "https://appleid.apple.com";

function config() {
  const { APPLE_TEAM_ID: teamId, APPLE_KEY_ID: keyId, APPLE_PRIVATE_KEY: privateKey, APPLE_CLIENT_ID: clientId } = process.env;
  return teamId && keyId && privateKey && clientId ? { teamId, keyId, privateKey, clientId } : null;
}

async function clientSecret(c: NonNullable<ReturnType<typeof config>>) {
  const key = await importPKCS8(c.privateKey.replace(/\\n/g, "\n"), "ES256");
  return new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: c.keyId })
    .setIssuer(c.teamId)
    .setSubject(c.clientId)
    .setAudience(APPLE)
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(key);
}

async function post(path: string, params: Record<string, string>) {
  return fetch(`${APPLE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
  });
}

/** Swaps the authorization code from a sign-in for a refresh token. Null when not configured or Apple refuses. */
export async function appleRefreshToken(code: string): Promise<string | null> {
  const c = config();
  if (!c) return null;
  const res = await post("/auth/token", {
    client_id: c.clientId,
    client_secret: await clientSecret(c),
    code,
    grant_type: "authorization_code",
  });
  if (!res.ok) throw new Error(`Apple token exchange: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as { refresh_token?: string };
  return data.refresh_token ?? null;
}

/** Revokes the app's access to the person's Apple ID (their Apple ID settings stop listing the app). */
export async function revokeAppleToken(refreshToken: string) {
  const c = config();
  if (!c) return;
  const res = await post("/auth/revoke", {
    client_id: c.clientId,
    client_secret: await clientSecret(c),
    token: refreshToken,
    token_type_hint: "refresh_token",
  });
  if (!res.ok) throw new Error(`Apple revoke: ${res.status} ${await res.text()}`);
}
