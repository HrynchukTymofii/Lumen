import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Linking, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Light } from "@/components/Light";
import { InkButton } from "@/components/ui/Button";
import { CheckIcon, CloseIcon } from "@/components/ui/icons";
import { useColors } from "@/components/ui/theme";
import { useAuth } from "@/context/AuthContext";
import { track, type Placement } from "@/lib/analytics";
import { errorMessage } from "@/lib/api/client";
import { SITE_URL } from "@/lib/config";
import { reportError } from "@/lib/errorReporting";
import { NOT_ACTIVATED, buy, getPlans, purchasesEnabled, restore, type Intro, type PeriodUnit, type Plan } from "@/lib/purchases";

// In-app paywall (SPEC §10.2), opened as a modal. Prices and intro offers come from the store through RevenueCat
// (offering "default": $rc_annual, $rc_monthly). An intro offer (a lower first month, or a free trial) is shown only
// to people who can get it (lib/purchases.ts). Close is always visible.
// Feature lists: same copy as website/lib/plans.ts.

const PREMIUM_FEATURES = [
  "200 companion messages a week",
  "Personal daily prayer, text and audio",
  "Full guided prayer library with audio",
  "Prayer journal and history",
  "7-day and 30-day prayer paths",
];

const close = () => (router.canGoBack() ? router.back() : router.replace("/today"));

const PLAN_NAME: Record<string, string> = { ANNUAL: "Yearly", MONTHLY: "Monthly", WEEKLY: "Weekly" };
const PERIOD: Record<string, string> = { ANNUAL: "year", MONTHLY: "month", WEEKLY: "week" };

/** "month", "3 months", "7 days" */
function span(unit: PeriodUnit, count: number) {
  const word = unit.toLowerCase();
  return count === 1 ? word : `${count} ${word}s`;
}

/** "$2.99 for the first month" / "Free for the first 7 days" */
function introLine(intro: Intro) {
  return intro.free ? `Free for the first ${span(intro.unit, intro.count)}` : `${intro.price} for the first ${span(intro.unit, intro.count)}`;
}

const CANCEL_WHERE = Platform.OS === "android" ? "in Google Play → Subscriptions" : "in Settings → your name → Subscriptions";

export default function Paywall() {
  const { refresh, premium } = useAuth();
  const insets = useSafeAreaInsets();
  const c = useColors();
  // An iOS modal is a sheet that already starts below the status bar; on Android it is full screen
  const top = Platform.OS === "ios" ? 0 : insets.top;
  const [plans, setPlans] = useState<Plan[] | null>(purchasesEnabled ? null : []);
  const [selected, setSelected] = useState(0);
  const [busy, setBusy] = useState<"buy" | "restore" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const placement = (useLocalSearchParams<{ placement?: Placement }>().placement ?? "settings") as Placement;

  useEffect(() => {
    track("paywall_viewed", { variant: "app", placement });
    // Once per opening
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!purchasesEnabled) return;
    getPlans().then(setPlans, (err) => {
      reportError(err);
      setError(errorMessage(err));
      setPlans([]);
    });
  }, []);

  // Bought (here or on another device): nothing left to sell
  useEffect(() => {
    if (premium.active) close();
  }, [premium.active]);

  const plan = plans?.[selected];
  const pkg = plan?.pkg;
  const intro = plan?.intro;
  const period = pkg ? PERIOD[pkg.packageType] : "";

  const purchase = async () => {
    if (!pkg) return;
    setBusy("buy");
    setError(null);
    const product_id = pkg.product.identifier;
    track("checkout_started", { product_id, placement });
    try {
      // Bought: the server reports the trial or subscription (RevenueCat webhook)
      if (await buy(pkg)) await refresh();
      else track("purchase_cancelled", { product_id, placement });
    } catch (err) {
      track("purchase_failed", { product_id, placement });
      reportError(err);
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const restorePurchases = async () => {
    setBusy("restore");
    setError(null);
    try {
      const found = await restore();
      track("purchases_restored", { found });
      if (!found) setError("We didn’t find a subscription for this Apple or Google account.");
      else if (!(await refresh())) setError(NOT_ACTIVATED);
    } catch (err) {
      reportError(err);
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <View className="flex-1 bg-bg">
      <ScrollView contentContainerStyle={{ paddingTop: top + 24, paddingBottom: insets.bottom + 24, paddingHorizontal: 20 }}>
        <View className="items-center">
          <Light size={90} />
          <Text className="mt-4 text-center font-display text-[30px] leading-9 text-ink">Pray with more of Holy Hush</Text>
        </View>

        <View className="mt-6 gap-3 rounded-[24px] bg-card px-5 py-5">
          {PREMIUM_FEATURES.map((f) => (
            <View key={f} className="flex-row items-center gap-3">
              <View className="h-6 w-6 items-center justify-center rounded-full bg-olive">
                <CheckIcon size={13} color={c.onPastel} />
              </View>
              <Text className="flex-1 font-sans text-base text-ink">{f}</Text>
            </View>
          ))}
        </View>

        {plans === null ? (
          <View className="mt-8 items-center">
            <Light size={48} state="thinking" />
          </View>
        ) : plans.length === 0 ? (
          <Text className="mt-6 text-center font-sans text-base leading-6 text-muted">
            {purchasesEnabled ? "Subscriptions can’t be loaded right now. Please try again later." : "Subscriptions aren’t available in this build yet."}
          </Text>
        ) : (
          <>
            <View className="mt-6 gap-3">
              {plans.map(({ pkg: p, intro: offer }, i) => {
                const on = i === selected;
                const yearly = p.packageType === "ANNUAL";
                return (
                  <Pressable
                    key={p.identifier}
                    onPress={() => {
                      setSelected(i);
                      track("plan_selected", { product_id: p.product.identifier });
                    }}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}
                    className={`flex-row items-center gap-3 rounded-[22px] border-2 px-5 py-4 ${on ? "border-ink bg-card" : "border-line2"}`}
                  >
                    <View className={`h-5 w-5 rounded-full border-2 ${on ? "border-ink bg-ink" : "border-line2"}`} />
                    <View className="flex-1">
                      <Text className="font-sans-bold text-base text-ink">{PLAN_NAME[p.packageType]}</Text>
                      <Text className="font-sans text-sm text-muted">
                        {offer
                          ? introLine(offer)
                          : yearly && p.product.pricePerMonthString
                            ? `${p.product.pricePerMonthString} a month, billed yearly`
                            : `Billed ${PERIOD[p.packageType]}ly`}
                      </Text>
                    </View>
                    <Text className="font-sans-bold text-base text-ink">
                      {p.product.priceString}
                      <Text className="font-sans text-sm text-muted">/{PERIOD[p.packageType]}</Text>
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View className="mt-6">
              <InkButton
                label={!intro ? "Subscribe" : intro.free ? "Start free trial" : `Start for ${intro.price}`}
                onPress={purchase}
                loading={busy === "buy"}
                disabled={busy !== null}
              />
            </View>
            {pkg && (
              <Text className="mt-3 text-center font-sans text-xs leading-5 text-muted">
                {intro ? `${introLine(intro)}, then ${pkg.product.priceString} per ${period}. ` : `${pkg.product.priceString} per ${period}. `}
                Renews automatically until cancelled. Cancel anytime {CANCEL_WHERE}, at least 24 hours before the renewal date.
              </Text>
            )}
          </>
        )}

        {error && <Text className="mt-4 text-center font-sans text-sm text-danger">{error}</Text>}

        <View className="mt-6 flex-row justify-center gap-6">
          {purchasesEnabled && (
            <Pressable onPress={restorePurchases} disabled={busy !== null} accessibilityRole="button" hitSlop={8}>
              <Text className="font-sans-bold text-sm text-muted">{busy === "restore" ? "Restoring…" : "Restore purchases"}</Text>
            </Pressable>
          )}
        </View>

        <Text className="mt-5 text-center font-sans text-xs text-muted">
          <Text className="underline" onPress={() => Linking.openURL(`${SITE_URL}/terms`)}>
            Terms of Service
          </Text>
          {"  ·  "}
          <Text className="underline" onPress={() => Linking.openURL(`${SITE_URL}/privacy`)}>
            Privacy Policy
          </Text>
        </Text>
      </ScrollView>

      <Pressable
        onPress={close}
        accessibilityRole="button"
        accessibilityLabel="Close"
        hitSlop={10}
        className="absolute h-10 w-10 items-center justify-center rounded-full bg-card"
        style={{ top: top + 14, right: 14 }}
      >
        <CloseIcon color={c.ink} />
      </Pressable>
    </View>
  );
}
