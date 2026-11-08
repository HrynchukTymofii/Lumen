import { useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { VOICES, type VoiceId } from "@/lib/api/prayers";
import { InkButton } from "./ui/Button";
import { CheckIcon, PlayIcon } from "./ui/icons";
import { useColors } from "./ui/theme";
import { VoiceMark } from "./VoiceMark";

// The drawer that opens from "Listen": pick who reads the prayer, then confirm. `current` is the voice it's
// already recorded in (choosing it again would buy the same recording), so it can't be confirmed.

export function VoiceSheet({
  initial,
  current,
  price,
  onClose,
  onConfirm,
}: {
  initial: VoiceId;
  current?: VoiceId;
  price: string; // "1 token", "free this month"
  onClose: () => void;
  onConfirm: (voice: VoiceId) => void;
}) {
  const insets = useSafeAreaInsets();
  const c = useColors();
  const [voice, setVoice] = useState<VoiceId>(initial === current ? (VOICES.find((v) => v.id !== current)?.id ?? initial) : initial);
  const name = VOICES.find((v) => v.id === voice)?.name ?? "";

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <View className="flex-1 justify-end">
        <Pressable onPress={onClose} className="absolute inset-0 bg-black/40" accessibilityLabel="Close" />
        <View className="rounded-t-[28px] bg-card px-5" style={{ paddingBottom: insets.bottom + 16 }}>
          <View className="mt-2.5 h-1 w-10 self-center rounded-full bg-line" />
          <Text className="mt-5 font-display text-[24px] leading-8 text-ink">Choose a voice</Text>
          <Text className="mt-1 font-sans text-[15px] text-muted">Who should read your prayer?</Text>

          <View className="mt-5 gap-2.5" accessibilityRole="radiogroup">
            {VOICES.map((v) => {
              const on = v.id === voice;
              const recorded = v.id === current;
              return (
                <Pressable
                  key={v.id}
                  onPress={() => setVoice(v.id)}
                  disabled={recorded}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on, disabled: recorded }}
                  className={`flex-row items-center gap-3.5 rounded-[22px] border-2 px-3 py-2.5 active:opacity-80 ${on ? "border-ink bg-bg" : "border-transparent bg-bg"} ${recorded ? "opacity-50" : ""}`}
                >
                  <VoiceMark voice={v.id} size={48} />
                  <Text className="flex-1 font-sans-bold text-[17px] text-ink">{v.name}</Text>
                  {recorded ? (
                    <Text className="mr-1 font-sans text-sm text-muted">Current</Text>
                  ) : (
                    <View className={`mr-1 h-6 w-6 items-center justify-center rounded-full ${on ? "bg-ink" : "border-2 border-line"}`}>
                      {on && <CheckIcon size={13} color={c.bg} />}
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>

          <View className="mt-6">
            <InkButton label={`Listen with ${name} · ${price}`} onPress={() => onConfirm(voice)} icon={<PlayIcon size={16} color={c.bg} />} />
          </View>
        </View>
      </View>
    </Modal>
  );
}
