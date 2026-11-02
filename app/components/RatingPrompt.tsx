import { useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { sendRating } from "@/lib/api/me";
import { reportError } from "@/lib/errorReporting";
import { askStoreReview, closeRating, usePendingRating, type Moment } from "@/lib/review";
import { Light } from "./Light";
import { InkButton } from "./ui/Button";
import { StarIcon } from "./ui/icons";
import { useColors } from "./ui/theme";

// "How is Lumen helping you?" (lib/review.ts decides when). The stars are saved to the account; 4–5 then open the
// store's review prompt, 1–3 ask what could be better.

const QUESTION: Record<Moment, string> = {
  companion: "How is your Bible companion helping you?",
  prayer: "How was this time of prayer?",
};

export function RatingPrompt() {
  const moment = usePendingRating();
  if (!moment) return null;
  // Keyed so each ask starts empty
  return <Card key={moment} moment={moment} />;
}

function Card({ moment }: { moment: Moment }) {
  const insets = useSafeAreaInsets();
  const c = useColors();
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [thanked, setThanked] = useState(false);

  const rate = (n: number) => {
    setStars(n);
    if (n < 4) return;
    sendRating({ stars: n, moment }).catch(reportError);
    closeRating();
    // Once the card has slid away
    setTimeout(askStoreReview, 500);
  };

  const send = async () => {
    setSending(true);
    try {
      await sendRating({ stars, moment, comment: comment.trim() || undefined });
    } catch (err) {
      reportError(err);
    }
    setThanked(true);
    setTimeout(closeRating, 1600);
  };

  return (
    <Modal transparent animationType="slide" onRequestClose={closeRating} statusBarTranslucent navigationBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1 justify-end">
        <Pressable onPress={closeRating} className="absolute inset-0 bg-black/40" accessibilityLabel="Not now" />
        <View className="items-center rounded-t-[28px] bg-card px-6 pt-6" style={{ paddingBottom: insets.bottom + 20 }}>
          <Light size={56} state={thanked ? "speaking" : "idle"} />
          {thanked ? (
            <Text className="mt-4 mb-6 text-center font-display text-2xl text-ink">Thank you. It helps us make Lumen better.</Text>
          ) : (
            <>
              <Text className="mt-4 text-center font-display text-2xl leading-8 text-ink">{QUESTION[moment]}</Text>
              <View className="mt-5 flex-row gap-3">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Pressable
                    key={n}
                    onPress={() => rate(n)}
                    accessibilityRole="button"
                    accessibilityLabel={`${n} star${n > 1 ? "s" : ""}`}
                    accessibilityState={{ selected: n <= stars }}
                    hitSlop={4}
                  >
                    <StarIcon size={38} color={n <= stars ? c.oliveDeep : c.dim} filled={n <= stars} />
                  </Pressable>
                ))}
              </View>
              {stars > 0 && stars < 4 && (
                <>
                  <TextInput
                    value={comment}
                    onChangeText={setComment}
                    placeholder="What could be better? (optional)"
                    placeholderTextColor={c.dim}
                    multiline
                    maxLength={1000}
                    className="mt-5 max-h-32 min-h-20 w-full rounded-2xl bg-bg px-4 py-3 font-sans text-base text-ink"
                    textAlignVertical="top"
                  />
                  <View className="mt-4 w-full">
                    <InkButton label="Send" onPress={send} loading={sending} disabled={sending} />
                  </View>
                </>
              )}
              <Pressable onPress={closeRating} accessibilityRole="button" hitSlop={8} className="mt-4">
                <Text className="font-sans-bold text-sm text-muted">Not now</Text>
              </Pressable>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
