import Link from "next/link";
import { Wordmark } from "@/components/kit";
import { SITE } from "@/lib/site";

const START = "/f/struggle";

// Top bar of the public site (inside a .hh page). On the landing the links scroll; elsewhere they go back to the
// landing sections.
export function SiteNav({ landing = false }: { landing?: boolean }) {
  const at = (hash: string) => (landing ? hash : `/${hash}`);
  return (
    <nav className="lp-nav">
      <Link href="/" className="lp-brand" aria-label={`${SITE.name} home`}>
        <Wordmark />
      </Link>
      <span className="lp-links">
        <a href={at("#how")}>How it works</a>
        <a href={at("#library")}>Prayers</a>
        <a href={at("#pricing")}>Pricing</a>
        <a href={at("#faq")}>FAQ</a>
      </span>
      <Link href={START} className="lp-btn sm">
        Get started
      </Link>
    </nav>
  );
}

// Footer of the public site: tagline, link columns and the big wordmark
export function SiteFooter({ landing = false }: { landing?: boolean }) {
  const at = (hash: string) => (landing ? hash : `/${hash}`);
  return (
    <footer className="lp-foot">
      <div className="top">
        <div className="tagline">
          <p>
            A short prayer for what
            <br />
            you are carrying.
          </p>
          <Link href={START} className="lp-btn sm">
            Get started
          </Link>
        </div>
        <nav className="cols" aria-label="Footer">
          <div>
            <b>Product</b>
            <a href={at("#how")}>How it works</a>
            <a href={at("#library")}>Prayers</a>
            <a href={at("#pricing")}>Pricing</a>
            <a href={at("#faq")}>FAQ</a>
          </div>
          <div>
            <b>Company</b>
            <Link href="/app">Sign in</Link>
            <Link href="/support">Support</Link>
            <a href={`mailto:${SITE.contactEmail}`}>Contact</a>
          </div>
          <div>
            <b>Legal</b>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/delete-account">Delete account</Link>
          </div>
        </nav>
      </div>
      <div className="bar">
        <span>
          © {SITE.legalUpdated.slice(-4)} {SITE.name}
        </span>
      </div>
      <Wordmark className="wordmark" />
    </footer>
  );
}
