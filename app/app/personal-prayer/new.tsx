import { router } from "expo-router";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CrisisCard } from "@/components/CrisisCard";
import { Light } from "@/components/Light";
import { ScreenHeader } from "@/components/ScreenHeader";
import { InkButton, LineButton } from "@/components/ui/Button";
import { useColors } from "@/components/ui/theme";
import { openPaywall } from "@/lib/account";
import { generatePrayer, getAllowance, prayerError, type Allowance, type PrayerLength } from "@/lib/api/prayers";
import type { CrisisResource } from "@/lib/api/types";
import { reportError } from "@/lib/errorReporting";

// The prayer generator: the person says what they're carrying, picks a length, and a prayer is written for it and
// saved to My prayers. Free: 5 a month. Premium: 10 a day.

const MAX = 600;

const STARTERS: { label: string; text: string }[] = [
  { label: "Anxiety", text: "I can't stop worrying about " },
  { label: "Grief", text: "I'm grieving " },
  { label: "Family", text: "I'm struggling with my family because " },
  { label: "Work", text: "Work has been hard lately: " },
  { label: "Health", text: "I'm worried about my health (or someone's): " },
  { label: "Gratitude", text: "I want to thank God for " },
];

const LENGTHS: { key: PrayerLength; label: string; note: string }[] = [
  { key: "short", label: "Short", note: "about 1 min" },
  { key: "medium", label: "Medium", note: "about 2–3 min" },
  { key: "long", label: "Long", note: "about 5 min" },
];

export default function NewPrayerScreen() {
  const insets = useSafeAreaInsets();
  const c = useColors();
  const [need, setNeed] = useState("");
  const [length, setLength] = useState<PrayerLength>("short");
  const [allowance, setAllowance] = useState<Allowance | null>(null);
  const [writing, setWriting] = useState(false);
  const [error, setError] = useState<{ message: string; upgrade?: boolean } | null>(null);
  const [crisis, setCrisis] = useState<CrisisResource[] | null>(null);

  useEffect(() => {
    getAllowance().then(setAllowance, reportError);
  }, []);

  const left = allowance ? Math.max(0, allowance.generated.limit - allowance.generated.used) : null;
  const used = left === 0;

  const write = async () => {
    setWriting(true);
    setError(null);
    setCrisis(null);
    try {
      const result = await generatePrayer(need.trim(), length);
      if ("crisis" in result) {
        setCrisis(result.resources);
        return;
      }
      router.replace({ pathname: "/personal-prayer/[id]", params: { id: result.id } });
    } catch (err) {
      const e = prayerError(err);
      if (e.status >= 500 || e.status === 0) reportError(err);
      setError({ message: e.message, upgrade: e.code === "limit" && allowance?.premium === false });
      if (e.code === "limit") getAllowance().then(setAllowance, () => {});
    } finally {
      setWriting(false);
    }
  };

  return (
    <View className="flex-1 bg-bg">
      <ScreenHeader title="Write my prayer" fallback="/personal-prayer" />
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 32 }} keyboardShouldPersistTaps="handled">
          {writing ? (
            <View className="mt-16 items-center">
              <Light size={96} state="thinking" />
              <Text className="mt-6 font-display text-2xl text-ink">Writing your prayer…</Text>
              <Text className="mt-2 text-center font-sans text-base text-muted">Choosing words and verses for what you’re carrying.</Text>
            </View>
          ) : (
            <>
              <Text className="mt-2 font-display text-[28px] leading-[34px] text-ink">What’s on your heart?</Text>
              <Text className="mt-1.5 font-sans text-base leading-6 text-muted">
                Tell us what you’re going through, in your own words. We’ll write a prayer for it and keep it in My prayers.
              </Text>

              <View className="mt-5 flex-row flex-wrap gap-2">
                {STARTERS.map((s) => (
                  <Pressable
                    key={s.label}
                    onPress={() => setNeed((n) => (n.trim() ? n : s.text))}
                    accessibilityRole="button"
                    className="rounded-full border-[1.5px] border-line px-4 py-2 active:opacity-70"
                  >
                    <Text className="font-sans-bold text-sm text-ink">{s.label}</Text>
                  </Pressable>
                ))}
              </View>

              <TextInput
                value={need}
                onChangeText={(t) => setNeed(t.slice(0, MAX))}
                placeholder="For example: my mother is in the hospital and I’m scared…"
                placeholderTextColor={c.dim}
                multiline
                textAlignVertical="top"
                className="mt-4 min-h-[150px] rounded-3xl bg-card px-5 py-4 font-sans text-base leading-6 text-ink"
                accessibilityLabel="What's on your heart"
              />
              <Text className="mt-1.5 self-end font-sans text-xs text-muted">
                {need.length}/{MAX}
              </Text>

              <Text className="mt-3 font-sans-bold text-sm text-muted">Length</Text>
              <View className="mt-2 flex-row gap-2">
                {LENGTHS.map((l) => {
                  const on = l.key === length;
                  return (
                    <Pressable
                      key={l.key}
                      onPress={() => setLength(l.key)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: on }}
                      className={`flex-1 items-center rounded-2xl border-[1.5px] px-2 py-3 ${on ? "border-ink bg-card" : "border-line"}`}
                    >
                      <Text className="font-sans-bold text-[15px] text-ink">{l.label}</Text>
                      <Text className="font-sans text-xs text-muted">{l.note}</Text>
                    </Pressable>
                  );
                })}
              </View>

              {crisis && (
                <View className="mt-5 gap-3">
                  <Text className="font-sans text-base leading-6 text-ink">
                    It sounds like you’re carrying something very heavy right now. Please reach out to someone who can be with you.
                  </Text>
                  <CrisisCard resources={crisis} />
                </View>
              )}
              {error && <Text className="mt-4 font-sans text-[15px] leading-6 text-danger">{error.message}</Text>}

              <View className="mt-6 gap-3">
                {error?.upgrade || (used && allowance?.premium === false) ? (
                  <InkButton label="Get Premium for more prayers" onPress={() => openPaywall("prayer")} />
                ) : (
                  <InkButton label="Write my prayer" onPress={write} disabled={need.trim().length < 10 || used} />
                )}
                {left !== null && (
                  <Text className="text-center font-sans text-sm text-muted">
                    {used
                      ? allowance!.premium
                        ? "You’ve written 10 prayers today. More tomorrow."
                        : "You’ve used this month’s 5 prayers."
                      : `${left} of ${allowance!.generated.limit} left ${allowance!.generated.per === "day" ? "today" : "this month"}`}
                  </Text>
                )}
                {crisis && <LineButton label="Back" onPress={() => router.back()} />}
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
