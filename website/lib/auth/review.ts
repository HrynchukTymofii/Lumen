import { hashCode, sameHash } from "@/lib/admin-auth";
import { normalizeEmail } from "@/lib/auth/users";

// A fixed sign-in for App Store / Google Play review: the reviewer can't read our login emails, so one email
// (REVIEW_LOGIN_EMAIL) takes one fixed 6-digit code (REVIEW_LOGIN_CODE) and no email is sent to it.
// Both unset = off. Use an address nobody else owns, e.g. review@<your domain>.

export function isReviewEmail(email: string) {
  const review = process.env.REVIEW_LOGIN_EMAIL;
  return Boolean(review && /^\d{6}$/.test(process.env.REVIEW_LOGIN_CODE ?? "") && normalizeEmail(review) === email);
}

export function isReviewLogin(email: string, code: string) {
  return isReviewEmail(email) && sameHash(hashCode(process.env.REVIEW_LOGIN_CODE!), hashCode(code));
}
