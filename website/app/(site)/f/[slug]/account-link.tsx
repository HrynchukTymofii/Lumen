"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

// "I already have an account" in the quiz header, only for visitors who aren't signed in (the page itself is static,
// so the browser asks). Someone signed in who is answering the quiz (?account=1) doesn't need it.
export function AccountLink() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  useEffect(() => {
    fetch("/api/me", { cache: "no-store" })
      .then((r) => setSignedIn(r.ok))
      .catch(() => setSignedIn(false));
  }, []);
  if (signedIn !== false) return null;
  return (
    <Link href="/app/login" className="fn-signin">
      I already have an account
    </Link>
  );
}
