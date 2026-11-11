"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { post } from "../../_components/post";

// Sign in with Google (Google Identity Services) and Sign in with Apple (Apple JS, popup) on the web. Both hand
// back an ID token that /api/auth/google or /api/auth/apple verifies, the same routes the phone app uses; the
// reply sets the session cookie. Client ids: lib/auth/web-sign-in.ts.
//
// Google only draws its own button (an iframe we can't restyle), so we show our own pill in the site's style and lay
// Google's real button over it, stretched to the same size and invisible: the click still goes to Google.

type LoginReply = { user: { id: string }; isNew: boolean };

type GoogleId = {
  initialize: (o: { client_id: string; callback: (r: { credential: string }) => void; ux_mode?: string; auto_select?: boolean }) => void;
  renderButton: (el: HTMLElement, o: Record<string, unknown>) => void;
};
type AppleSignInReply = { authorization: { id_token: string; code: string }; user?: { name?: { firstName?: string } } };
type AppleId = {
  auth: { init: (o: Record<string, unknown>) => void; signIn: () => Promise<AppleSignInReply> };
};

declare global {
  interface Window {
    google?: { accounts: { id: GoogleId } };
    AppleID?: AppleId;
  }
}

export function SocialSignIn({
  google,
  apple,
  onSignedIn,
  onError,
}: {
  google: string | null;
  apple: string | null;
  onSignedIn: (reply: LoginReply) => void;
  onError: (message: string | null) => void;
}) {
  const googleBox = useRef<HTMLDivElement>(null);
  const [googleReady, setGoogleReady] = useState(false);
  const [appleReady, setAppleReady] = useState(false);
  const [busy, setBusy] = useState(false);

  // Callbacks change every render; the Google button is set up once
  const handlers = useRef({ onSignedIn, onError });
  useEffect(() => {
    handlers.current = { onSignedIn, onError };
  });

  useEffect(() => {
    if (!google || !googleReady || !googleBox.current || !window.google) return;
    window.google.accounts.id.initialize({
      client_id: google,
      callback: async ({ credential }) => {
        setBusy(true);
        handlers.current.onError(null);
        try {
          handlers.current.onSignedIn(await post<LoginReply>("/api/auth/google", { id_token: credential, platform: "web" }));
        } catch (err) {
          handlers.current.onError(err instanceof Error ? err.message : "Couldn't sign in with Google");
          setBusy(false);
        }
      },
    });
    const box = googleBox.current;
    window.google.accounts.id.renderButton(box, {
      type: "standard",
      theme: "outline",
      size: "large",
      shape: "pill",
      text: "continue_with",
      logo_alignment: "center",
      locale: "en",
      width: Math.min(box.offsetWidth || 360, 400), // Google's maximum
    });
    // Stretch Google's button over ours once it's drawn (and again when the card resizes)
    const fit = () => {
      const inner = box.firstElementChild as HTMLElement | null;
      const frame = box.querySelector("iframe");
      if (!inner || !frame || !frame.offsetWidth || !frame.offsetHeight) return false;
      // Google's frame is at most 400px wide, so shrink its wrapper to the frame, then scale both up to our pill
      inner.style.width = `${frame.offsetWidth}px`;
      inner.style.transformOrigin = "0 0";
      inner.style.transform = `scale(${box.offsetWidth / frame.offsetWidth}, ${box.offsetHeight / frame.offsetHeight})`;
      return true;
    };
    let tries = 0;
    const wait = window.setInterval(() => (fit() || ++tries > 40) && window.clearInterval(wait), 100);
    const ro = new ResizeObserver(() => fit());
    ro.observe(box);
    return () => {
      window.clearInterval(wait);
      ro.disconnect();
    };
  }, [google, googleReady]);

  useEffect(() => {
    if (!apple || !appleReady || !window.AppleID) return;
    window.AppleID.auth.init({
      clientId: apple,
      scope: "name email",
      redirectURI: `${window.location.origin}/app/login`,
      usePopup: true,
    });
  }, [apple, appleReady]);

  async function signInWithApple() {
    if (!window.AppleID) return;
    onError(null);
    let reply: AppleSignInReply;
    try {
      reply = await window.AppleID.auth.signIn();
    } catch (err) {
      // Closing the popup is not an error worth showing
      const code = (err as { error?: string })?.error;
      if (code !== "popup_closed_by_user" && code !== "user_cancelled_authorize") onError("Couldn't sign in with Apple");
      return;
    }
    setBusy(true);
    try {
      onSignedIn(
        await post<LoginReply>("/api/auth/apple", {
          id_token: reply.authorization.id_token,
          authorizationCode: reply.authorization.code,
          firstName: reply.user?.name?.firstName?.slice(0, 60),
          platform: "web",
        }),
      );
    } catch (err) {
      onError(err instanceof Error ? err.message : "Couldn't sign in with Apple");
      setBusy(false);
    }
  }

  if (!google && !apple) return null;

  return (
    <div className="social" aria-busy={busy}>
      {apple && (
        <>
          <Script
            src="https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js"
            strategy="afterInteractive"
            onReady={() => setAppleReady(true)}
          />
          <button type="button" className="apple-btn" onClick={signInWithApple} disabled={!appleReady || busy}>
            <svg width={17} height={20} viewBox="0 0 17 20" fill="currentColor" aria-hidden>
              <path d="M14.1 10.6c0-2.6 2.1-3.8 2.2-3.9-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.4-.9-1.7 0-3.3 1-4.2 2.6-1.8 3.1-.5 7.7 1.3 10.2.9 1.2 1.9 2.6 3.2 2.6 1.3-.1 1.8-.8 3.3-.8 1.6 0 2 .8 3.4.8 1.4 0 2.3-1.3 3.1-2.5 1-1.4 1.4-2.8 1.4-2.9 0 0-2.7-1-2.7-4.1zM11.5 3c.7-.9 1.2-2 1.1-3.2-1 0-2.3.7-3 1.6-.7.8-1.3 2-1.1 3.1 1.1.1 2.3-.6 3-1.5z" />
            </svg>
            Continue with Apple
          </button>
        </>
      )}
      {google && (
        <>
          <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" onReady={() => setGoogleReady(true)} />
          {/* Clicks pass through our face (pointer-events: none) to Google's frame, and never come back out of it; one
              only lands here when Google's button failed to load (blocked script, origin not allowed) */}
          <div
            className="google-wrap"
            onClick={() => {
              if (!googleBox.current?.querySelector("iframe")) onError("Google sign-in isn't available right now. Use your email instead.");
            }}
          >
            <span className="google-face" aria-hidden>
              <svg width={18} height={18} viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.6 13.2l7.9 6.2C12.4 13.6 17.7 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.3 5.7c4.3-3.9 7-9.7 7-17.1z" />
                <path fill="#FBBC05" d="M10.5 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.2C1 16.5 0 20.1 0 24s1 7.5 2.6 10.8l7.9-6.2z" />
                <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.3-5.7c-2.2 1.5-5 2.3-8.6 2.3-6.3 0-11.6-4.1-13.5-9.9l-7.9 6.2C6.6 42.6 14.6 48 24 48z" />
              </svg>
              Continue with Google
            </span>
            <div ref={googleBox} className="google-btn" />
          </div>
        </>
      )}
      <div className="or">
        <span>or</span>
      </div>
    </div>
  );
}
