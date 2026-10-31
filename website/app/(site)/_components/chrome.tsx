import Link from "next/link";
import { ArrowIcon, Light } from "@/components/kit";
import { SITE } from "@/lib/site";

export function SiteNav({ landing = false }: { landing?: boolean }) {
  // On the landing page the links scroll; elsewhere they go back to the landing sections
  const at = (hash: string) => (landing ? hash : `/${hash}`);
  return (
    <nav className="nav">
      <Link href="/" className="brand">
        <Light size={36} label={`${SITE.name} home`} />
        {SITE.name}
      </Link>
      <span className="nav-links">
        <a href={at("#how")}>How it works</a>
        <a href={at("#library")}>Prayers</a>
        <a href={at("#pricing")}>Pricing</a>
        <a href={at("#faq")}>FAQ</a>
        <Link href="/app">Sign in</Link>
      </span>
      <Link href="/f/struggle" className="btn-ink sm">
        Get started
        <span className="dot">
          <ArrowIcon />
        </span>
      </Link>
    </nav>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <span>
        © {SITE.legalUpdated.slice(-4)} {SITE.name}
      </span>
      <nav aria-label="Legal">
        <Link href="/app">Sign in</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
        <Link href="/support">Support</Link>
        <Link href="/delete-account">Delete account</Link>
      </nav>
    </footer>
  );
}
