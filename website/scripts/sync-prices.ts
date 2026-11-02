// npm run prices:sync — local App Store prices for the website, from the App Store Connect API.
// Reads the yearly and monthly subscriptions (and the yearly intro offer) for every country and writes
// lib/prices.json, keyed by 2-letter country code. Run it after changing prices in App Store Connect, then commit.
// The website falls back to the US prices in lib/site.ts for anything missing, so a failed sync is never fatal:
// on any error this script exits without touching the file.
//
// Needs in website/.env: ASC_ISSUER_ID, and the key in secrets/AuthKey_<KEY_ID>.p8 (ASC_KEY_ID / ASC_KEY_PATH
// override the defaults). The key only needs read access (App Manager).
import "dotenv/config";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import countries from "i18n-iso-countries";
import { importPKCS8, SignJWT } from "jose";

const APP_ID = process.env.ASC_APP_ID ?? "6829436290";
const API = "https://api.appstoreconnect.apple.com";
const OUT = path.join(__dirname, "..", "lib", "prices.json");

type Resource = { id: string; type: string; attributes?: Record<string, unknown>; relationships?: Record<string, { data?: { id: string; type: string } | null }> };
type Page = { data: Resource[]; included?: Resource[]; links?: { next?: string } };

function fail(message: string): never {
  console.error(`\n✖ ${message}\nlib/prices.json was not changed.`);
  process.exit(1);
}

function keyFile() {
  if (process.env.ASC_KEY_PATH && !process.env.ASC_KEY_PATH.includes("XXXX")) return path.resolve(process.env.ASC_KEY_PATH);
  const dir = path.join(__dirname, "..", "secrets");
  const found = (() => {
    try {
      return readdirSync(dir).filter((f) => /^AuthKey_\w+\.p8$/.test(f));
    } catch {
      return [];
    }
  })();
  if (found.length !== 1) fail(`Put exactly one AuthKey_<KEY_ID>.p8 in website/secrets/ (found ${found.length}), or set ASC_KEY_PATH.`);
  return path.join(dir, found[0]);
}

async function token() {
  const issuer = process.env.ASC_ISSUER_ID;
  if (!issuer) fail("Set ASC_ISSUER_ID in website/.env (App Store Connect → Users and Access → Integrations → Team Keys, above the list).");
  const file = keyFile();
  const kid = process.env.ASC_KEY_ID || path.basename(file).match(/^AuthKey_(\w+)\.p8$/)?.[1];
  if (!kid) fail("Set ASC_KEY_ID in website/.env.");
  const key = await importPKCS8(readFileSync(file, "utf8"), "ES256");
  return new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid, typ: "JWT" })
    .setIssuer(issuer)
    .setIssuedAt()
    .setExpirationTime("15m")
    .setAudience("appstoreconnect-v1")
    .sign(key);
}

let jwt = "";
async function get(url: string): Promise<Page> {
  const res = await fetch(url.startsWith("http") ? url : API + url, { headers: { Authorization: `Bearer ${jwt}` } });
  if (!res.ok) fail(`App Store Connect ${res.status} for ${url}\n${(await res.text()).slice(0, 500)}`);
  return res.json() as Promise<Page>;
}

/** Every page of a list, data and included merged. */
async function all(url: string) {
  const data: Resource[] = [];
  const included = new Map<string, Resource>();
  for (let next: string | undefined = url; next; ) {
    const page = await get(next);
    data.push(...page.data);
    for (const r of page.included ?? []) included.set(`${r.type}:${r.id}`, r);
    next = page.links?.next;
  }
  return { data, included };
}

const today = new Date().toISOString().slice(0, 10);
const rel = (r: Resource, name: string) => r.relationships?.[name]?.data ?? null;
const attr = <T>(r: Resource | undefined, name: string) => r?.attributes?.[name] as T | undefined;

/** territory (3-letter) → { currency, price } for the price in effect today */
async function currentPrices(subscriptionId: string) {
  const { data, included } = await all(`/v1/subscriptions/${subscriptionId}/prices?include=subscriptionPricePoint,territory&limit=200`);
  const best = new Map<string, { start: string; currency: string; price: string }>();
  for (const p of data) {
    const start = attr<string | null>(p, "startDate") ?? "0000-00-00";
    if (start > today) continue; // scheduled for later
    const territory = rel(p, "territory");
    const point = rel(p, "subscriptionPricePoint");
    if (!territory || !point) continue;
    const currency = attr<string>(included.get(`territories:${territory.id}`), "currency");
    const price = attr<string>(included.get(`subscriptionPricePoints:${point.id}`), "customerPrice");
    if (!currency || !price) continue;
    const prev = best.get(territory.id);
    if (!prev || start > prev.start) best.set(territory.id, { start, currency, price });
  }
  return best;
}

/** territory → intro price, only for a paid first-month offer running today */
async function introPrices(subscriptionId: string) {
  const { data, included } = await all(`/v1/subscriptions/${subscriptionId}/introductoryOffers?include=subscriptionPricePoint,territory&limit=200`);
  const out = new Map<string, string>();
  const skipped = new Set<string>();
  for (const o of data) {
    const start = attr<string | null>(o, "startDate") ?? "0000-00-00";
    const end = attr<string | null>(o, "endDate");
    if (start > today || (end && end < today)) continue;
    const mode = attr<string>(o, "offerMode");
    const duration = attr<string>(o, "duration");
    const periods = attr<number>(o, "numberOfPeriods") ?? 1;
    // The website says "for the first month", so only that shape is used
    if (mode === "FREE_TRIAL" || duration !== "ONE_MONTH" || periods !== 1) {
      skipped.add(`${mode} ${duration} ×${periods}`);
      continue;
    }
    const territory = rel(o, "territory");
    const point = rel(o, "subscriptionPricePoint");
    const price = point && attr<string>(included.get(`subscriptionPricePoints:${point.id}`), "customerPrice");
    if (territory && price) out.set(territory.id, price);
  }
  if (skipped.size) console.warn(`  Intro offers not shown on the website (not "first month"): ${[...skipped].join(", ")}`);
  return out;
}

async function main() {
  jwt = await token();

  const groups = await all(`/v1/apps/${APP_ID}/subscriptionGroups?include=subscriptions&limit=50&limit[subscriptions]=50`);
  const subs = [...groups.included.values()].filter((r) => r.type === "subscriptions");
  console.log(`Subscriptions in app ${APP_ID}:`);
  for (const s of subs) console.log(`  ${attr(s, "productId")}  ${attr(s, "subscriptionPeriod")}  ${attr(s, "state")}`);

  const pick = (period: string, envName: string) => {
    const wanted = process.env[envName];
    const matches = subs.filter((s) => (wanted ? attr(s, "productId") === wanted : attr(s, "subscriptionPeriod") === period));
    if (matches.length !== 1) fail(`Expected one ${period} subscription, found ${matches.length}. Set ${envName}=<productId> in .env to choose.`);
    return matches[0];
  };
  const yearly = pick("ONE_YEAR", "ASC_YEARLY_PRODUCT");
  const monthly = pick("ONE_MONTH", "ASC_MONTHLY_PRODUCT");

  console.log("Reading prices…");
  const [yearlyPrices, monthlyPrices, intro] = await Promise.all([currentPrices(yearly.id), currentPrices(monthly.id), introPrices(yearly.id)]);

  const territories: Record<string, { currency: string; yearly: string; monthly: string; yearlyIntro: string | null }> = {};
  const unmapped: string[] = [];
  for (const [territory, y] of yearlyPrices) {
    const m = monthlyPrices.get(territory);
    if (!m || m.currency !== y.currency) continue;
    const code = territory === "USA" ? "US" : countries.alpha3ToAlpha2(territory);
    if (!code) {
      unmapped.push(territory);
      continue;
    }
    territories[code] = { currency: y.currency, yearly: y.price, monthly: m.price, yearlyIntro: intro.get(territory) ?? null };
  }
  if (unmapped.length) console.warn(`  Skipped territories without a country code: ${unmapped.join(", ")}`);

  // Sanity checks before overwriting a working file
  const us = territories.US;
  if (!us) fail("No US prices came back; something is off.");
  if (Object.keys(territories).length < 10) fail(`Only ${Object.keys(territories).length} countries came back; expected ~175.`);

  const sorted = Object.fromEntries(Object.entries(territories).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(OUT, JSON.stringify({ updatedAt: new Date().toISOString(), territories: sorted }, null, 2) + "\n");
  console.log(`\n✔ ${Object.keys(sorted).length} countries written to lib/prices.json`);
  console.log(`  US: yearly ${us.yearly}, monthly ${us.monthly}, first month ${us.yearlyIntro ?? "(no intro offer)"}`);
  console.log("  Commit lib/prices.json and deploy to update the website.");
}

main().catch((err) => fail(err instanceof Error ? err.message : String(err)));
