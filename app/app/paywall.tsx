import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import type { PurchasesPackage } from "react-native-purchases";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Light } from "@/components/Light";
import { InkButton } from "@/components/ui/Button";
import { CheckIcon, CloseIcon } from "@/components/ui/icons";
import { useColors } from "@/components/ui/theme";
import { useAuth } from "@/context/AuthContext";
import { errorMessage } from "@/lib/api/client";
import { reportError } from "@/lib/errorReporting";
import { buy, getPackages, purchasesEnabled, restore } from "@/lib/purchases";

// In-app paywall (SPEC §10.2), opened as a modal. Prices and the trial come from the store through RevenueCat
// (offering "default": $rc_annual with a 7-day trial, $rc_monthly). Close is always visible.
// Feature lists: same copy as website/lib/plans.ts.

const PREMIUM_FEATURES = [
  "Unlimited companion chat",
  "Personal daily prayer, text and audio",
  "Full guided prayer library with audio",
  "Prayer journal and history",
  "7-day and 30-day prayer paths",
];

const close = () => (router.canGoBack() ? router.back() : router.replace("/today"));

export default function Paywall() {
  const { refresh, premium } = useAuth();
  const insets = useSafeAreaInsets();
  const c = useColors();
  const [packages, setPackages] = useState<PurchasesPackage[] | null>(purchasesEnabled ? null : []);
  const [selected, setSelected] = useState(0);
  const [busy, setBusy] = useState<"buy" | "restore" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!purchasesEnabled) return;
    getPackages().then(setPackages, (err) => {
      reportError(err);
      setError(errorMessage(err));
      setPackages([]);
    });
  }, []);

  // Bought (here or on another device): nothing left to sell
  useEffect(() => {
    if (premium.active) close();
  }, [premium.active]);

  const pkg = packages?.[selected];
  const trialDays = pkg?.product.introPrice?.price === 0 ? pkg.product.introPrice.periodNumberOfUnits : 0;

  const purchase = async () => {
    if (!pkg) return;
    setBusy("buy");
    setError(null);
    try {
      if (await buy(pkg)) await refresh();
    } catch (err) {
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
      if (await restore()) await refresh();
      else setError("We didn’t find a subscription for this Apple or Google account.");
    } catch (err) {
      reportError(err);
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <View className="flex-1 bg-bg">
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24, paddingHorizontal: 20 }}>
        <View className="items-center">
          <Light size={90} />
          <Text className="mt-4 text-center font-display text-[30px] leading-9 text-ink">Pray with more of Lumen</Text>
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

        {packages === null ? (
          <View className="mt-8 items-center">
            <Light size={48} state="thinking" />
          </View>
        ) : packages.length === 0 ? (
          <Text className="mt-6 text-center font-sans text-base leading-6 text-muted">
            {purchasesEnabled ? "Subscriptions can’t be loaded right now. Please try again later." : "Subscriptions aren’t available in this build yet."}
          </Text>
        ) : (
          <>
            <View className="mt-6 gap-3">
              {packages.map((p, i) => {
                const on = i === selected;
                const yearly = p.packageType === "ANNUAL";
                return (
                  <Pressable
                    key={p.identifier}
                    onPress={() => setSelected(i)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}
                    className={`flex-row items-center gap-3 rounded-[22px] border-2 px-5 py-4 ${on ? "border-ink bg-card" : "border-line2"}`}
                  >
                    <View className={`h-5 w-5 rounded-full border-2 ${on ? "border-ink bg-ink" : "border-line2"}`} />
                    <View className="flex-1">
                      <Text className="font-sans-bold text-base text-ink">{yearly ? "Yearly" : "Monthly"}</Text>
                      <Text className="font-sans text-sm text-muted">
                        {yearly && p.product.pricePerMonthString ? `${p.product.pricePerMonthString} a month` : "Cancel anytime"}
                      </Text>
                    </View>
                    <Text className="font-sans-bold text-base text-ink">{p.product.priceString}</Text>
                  </Pressable>
                );
              })}
            </View>

            <View className="mt-6">
              <InkButton label={trialDays ? `Start ${trialDays}-day free trial` : "Continue"} onPress={purchase} loading={busy === "buy"} disabled={busy !== null} />
            </View>
            {pkg && (
              <Text className="mt-3 text-center font-sans text-xs leading-5 text-muted">
                {trialDays
                  ? `Free for ${trialDays} days, then ${pkg.product.priceString} per ${pkg.packageType === "ANNUAL" ? "year" : "month"}. `
                  : `${pkg.product.priceString} per ${pkg.packageType === "ANNUAL" ? "year" : "month"}, renews automatically. `}
                Cancel anytime in your phone’s settings.
              </Text>
            )}
          </>
        )}

        {error && <Text className="mt-4 text-center font-sans text-sm text-danger">{error}</Text>}

        <View className="mt-6 flex-row justify-center gap-6">
          <Pressable onPress={close} accessibilityRole="button" hitSlop={8}>
            <Text className="font-sans-bold text-sm text-muted">Not now</Text>
          </Pressable>
          {purchasesEnabled && (
            <Pressable onPress={restorePurchases} disabled={busy !== null} accessibilityRole="button" hitSlop={8}>
              <Text className="font-sans-bold text-sm text-muted">{busy === "restore" ? "Restoring…" : "Restore purchases"}</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>

      <Pressable
        onPress={close}
        accessibilityRole="button"
        accessibilityLabel="Close"
        hitSlop={10}
        className="absolute h-10 w-10 items-center justify-center rounded-full bg-card"
        style={{ top: insets.top + 10, right: 16 }}
      >
        <CloseIcon color={c.ink} />
      </Pressable>
    </View>
  );
}
