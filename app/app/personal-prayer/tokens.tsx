import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import type { PurchasesPackage } from "react-native-purchases";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Light } from "@/components/Light";
import { IconButton, InkButton } from "@/components/ui/Button";
import { CloseIcon } from "@/components/ui/icons";
import { useColors } from "@/components/ui/theme";
import { openPaywall } from "@/lib/account";
import { track } from "@/lib/analytics";
import { errorMessage } from "@/lib/api/client";
import { getAllowance, type Allowance } from "@/lib/api/prayers";
import { reportError } from "@/lib/errorReporting";
import { buyTokens, getTokenPacks, purchasesEnabled } from "@/lib/purchases";

// Prayer token packs (consumables): 5 or 15 tokens, 1 token per 200 words of audio. Sold to Premium members only;
// tokens never expire and keep working if Premium ends. needed: how many the prayer the person came from needs.

const TOKENS: Record<string, number> = { lumen_prayer_tokens_5: 5, lumen_prayer_tokens_15: 15 };
const tokensIn = (pkg: PurchasesPackage) => TOKENS[pkg.product.identifier.split(":")[0]] ?? 0;

export default function TokensSheet() {
  const { needed } = useLocalSearchParams<{ needed?: string }>();
  const insets = useSafeAreaInsets();
  const c = useColors();
  const [allowance, setAllowance] = useState<Allowance | null>(null);
  // Without purchases (web, a build without keys) there's nothing to load
  const [packs, setPacks] = useState<PurchasesPackage[] | null>(purchasesEnabled ? null : []);
  const [selected, setSelected] = useState(1);
  const [buying, setBuying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    track("tokens_sheet_shown", { placement: needed ? "prayer" : "my_prayers" });
    getAllowance().then(setAllowance, reportError);
    if (!purchasesEnabled) return;
    getTokenPacks().then(
      (list) => {
        setPacks(list);
        setSelected(list.length > 1 ? 1 : 0);
      },
      (err) => {
        reportError(err);
        setError(errorMessage(err));
        setPacks([]);
      },
    );
    // Once per opening
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pkg = packs?.[selected];
  const purchase = async () => {
    if (!pkg) return;
    setBuying(true);
    setError(null);
    const product_id = pkg.product.identifier;
    track("checkout_started", { product_id, placement: "prayer" });
    try {
      const balance = await buyTokens(pkg);
      if (balance === null) {
        track("purchase_cancelled", { product_id, placement: "prayer" });
        return;
      }
      setAllowance((a) => (a ? { ...a, tokens: balance } : a));
      if (!needed || balance >= Number(needed)) router.back();
    } catch (err) {
      track("purchase_failed", { product_id, placement: "prayer" });
      reportError(err);
      setError(errorMessage(err));
    } finally {
      setBuying(false);
    }
  };

  const count = pkg ? tokensIn(pkg) : 0;

  return (
    <View className="flex-1 bg-bg">
      <View className="flex-row justify-end px-4 pt-3">
        <IconButton label="Close" onPress={() => router.back()}>
          <CloseIcon color={c.ink} />
        </IconButton>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 24 }}>
        <View className="items-center">
          <Light size={72} />
          <Text className="mt-4 text-center font-display text-[28px] leading-9 text-ink">Prayer tokens</Text>
          <Text className="mt-2 text-center font-sans text-base leading-6 text-muted">
            Hear your own prayers read aloud. 1 token covers up to 200 words. Tokens never expire.
          </Text>
          {allowance && (
            <Text className="mt-3 font-sans-bold text-base text-ink">
              You have {allowance.tokens} {allowance.tokens === 1 ? "token" : "tokens"}
              {needed ? ` · this prayer needs ${needed}` : ""}
            </Text>
          )}
        </View>

        {allowance?.premium === false ? (
          <View className="mt-8 gap-3">
            <Text className="text-center font-sans text-base leading-6 text-muted">Audio prayers and tokens come with Premium.</Text>
            <InkButton label="See Premium" onPress={() => openPaywall("prayer")} />
          </View>
        ) : !purchasesEnabled ? (
          <Text className="mt-8 text-center font-sans text-base text-muted">Purchases aren’t available in this build.</Text>
        ) : !packs ? (
          <View className="mt-10 items-center">
            <Light size={40} state="thinking" />
          </View>
        ) : !packs.length ? (
          <Text className="mt-8 text-center font-sans text-base text-muted">{error ?? "Token packs aren’t available right now. Please try again later."}</Text>
        ) : (
          <>
            <View className="mt-6 gap-3">
              {packs.map((p, i) => {
                const on = i === selected;
                const n = tokensIn(p);
                return (
                  <Pressable
                    key={p.identifier}
                    onPress={() => setSelected(i)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}
                    className={`flex-row items-center rounded-3xl border-2 px-5 py-4 ${on ? "border-ink bg-card" : "border-line"}`}
                  >
                    <View className="flex-1">
                      <Text className="font-sans-bold text-lg text-ink">{n ? `${n} tokens` : p.product.title}</Text>
                      <Text className="font-sans text-sm text-muted">{n ? `up to ${(n * 200).toLocaleString()} words of audio` : p.product.description}</Text>
                    </View>
                    <Text className="font-sans-bold text-lg text-ink">{p.product.priceString}</Text>
                  </Pressable>
                );
              })}
            </View>
            {error && <Text className="mt-4 text-center font-sans text-[15px] text-danger">{error}</Text>}
            <View className="mt-6">
              <InkButton label={count ? `Buy ${count} tokens` : "Buy"} onPress={purchase} loading={buying} disabled={!pkg} />
            </View>
            <Text className="mt-3 text-center font-sans text-xs leading-5 text-muted">
              One-time purchase. Tokens stay on your account and work in the app and on the website.
            </Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}
