import { SignJWT, importPKCS8 } from "jose";

// Sign in with Apple tokens, so deleting an account also revokes it at Apple (App Store guideline 5.1.1(v)).
// At sign-in the app sends Apple's one-time authorization code; it is swapped here for a refresh token, kept on
// the user, and revoked when the account is deleted. Needs a Sign in with Apple key (developer.apple.com →
// Keys): APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY (the .p8 contents, newlines as \n), plus APPLE_CLIENT_ID
// (the app's bundle id). Without them sign-in still works, and nothing is revoked. Sign-ins on the website use the
// Services ID (APPLE_SERVICES_ID) as the client id instead, so the exchange and the revoke take the one that issued
// the token.

const APPLE = "https://appleid.apple.com";

function config() {
  const { APPLE_TEAM_ID: teamId, APPLE_KEY_ID: keyId, APPLE_PRIVATE_KEY: privateKey, APPLE_CLIENT_ID: clientId } = process.env;
  return teamId && keyId && privateKey && clientId ? { teamId, keyId, privateKey, clientId } : null;
}

/** The client ids Apple tokens can be issued to: the app's bundle id, then the website's Services ID */
export function appleClientIds() {
  return [process.env.APPLE_CLIENT_ID, process.env.APPLE_SERVICES_ID].filter((id): id is string => Boolean(id));
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
export async function appleRefreshToken(code: string, clientId?: string): Promise<string | null> {
  const base = config();
  if (!base) return null;
  const c = { ...base, clientId: clientId ?? base.clientId };
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
  const base = config();
  if (!base) return;
  // The token came from the app or the website; Apple only accepts the revoke from the client id that got it
  let last = "";
  for (const clientId of appleClientIds()) {
    const c = { ...base, clientId };
    const res = await post("/auth/revoke", {
      client_id: c.clientId,
      client_secret: await clientSecret(c),
      token: refreshToken,
      token_type_hint: "refresh_token",
    });
    if (res.ok) return;
    last = `${res.status} ${await res.text()}`;
  }
  throw new Error(`Apple revoke: ${last}`);
}
