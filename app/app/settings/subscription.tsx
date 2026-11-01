import { router } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Section } from "@/components/SettingsParts";
import { InkButton } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { errorMessage } from "@/lib/api/client";
import { reportError } from "@/lib/errorReporting";
import { purchasesEnabled, restore } from "@/lib/purchases";

// Subscription: what plan this account is on, the way into the paywall, and restoring store purchases
const PREMIUM_SOURCE = { stripe: "on the web", app_store: "in the App Store", play: "in Google Play" };

export default function SubscriptionSettings() {
  const { premium, refresh } = useAuth();
  const insets = useSafeAreaInsets();
  const [error, setError] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);

  const restorePurchases = async () => {
    setRestoring(true);
    setError(null);
    try {
      const active = await restore();
      await refresh();
      Alert.alert(active ? "Purchases restored" : "Nothing to restore", active ? "Premium is active on this account." : "We didn’t find a subscription for this Apple or Google account.");
    } catch (err) {
      reportError(err);
      setError(errorMessage(err));
    } finally {
      setRestoring(false);
    }
  };

  return (
    <View className="flex-1 bg-bg">
      <ScreenHeader title={premium.active ? "Subscription" : "Subscribe"} fallback="/settings" />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        {error && <Text className="mx-5 mt-1 font-sans text-sm text-danger">{error}</Text>}
        <Section>
          {premium.active ? (
            <>
              <Text className="font-display text-[22px] leading-7 text-ink">Premium</Text>
              <Text className="mt-1 font-sans text-sm leading-5 text-muted">
                Bought {PREMIUM_SOURCE[premium.source]}
                {premium.currentPeriodEnd
                  ? ` · until ${new Date(premium.currentPeriodEnd).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`
                  : ""}
              </Text>
              {premium.source !== "stripe" && (
                <Text className="mt-2 font-sans text-sm leading-5 text-muted">
                  Manage or cancel it in your phone’s settings ({premium.source === "play" ? "Google Play → Subscriptions" : "Apple ID → Subscriptions"}).
                </Text>
              )}
            </>
          ) : (
            <>
              <Text className="font-display text-[22px] leading-7 text-ink">Free plan</Text>
              <Text className="mt-1 font-sans text-sm leading-5 text-muted">
                Bible, verse of the day and a daily prayer, forever. Premium unlocks every guided prayer and unlimited companion conversations.
              </Text>
              <View className="mt-5">
                <InkButton label="Try Premium free" onPress={() => router.push("/paywall")} />
              </View>
            </>
          )}
        </Section>
        {purchasesEnabled && (
          <Pressable onPress={restorePurchases} disabled={restoring} accessibilityRole="button" className="mt-4 items-center py-2 active:opacity-70">
            <Text className="font-sans-bold text-sm text-olive-deep">{restoring ? "Restoring…" : "Restore purchases"}</Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}
