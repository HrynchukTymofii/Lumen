import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { useEffect, useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { VOICES, type VoiceId } from "@/lib/api/prayers";
import { InkButton } from "./ui/Button";
import { CheckIcon, PauseIcon, PlayIcon } from "./ui/icons";
import { useColors } from "./ui/theme";
import { VoiceMark } from "./VoiceMark";

// A few seconds of each voice, shipped with the app (assets/voices), so trying one is instant and works offline
const SAMPLES: Record<VoiceId, number> = {
  grace: require("@/assets/voices/grace.mp3"),
  ruth: require("@/assets/voices/ruth.mp3"),
  matthew: require("@/assets/voices/matthew.mp3"),
  john: require("@/assets/voices/john.mp3"),
};

// The drawer that opens from "Listen": try the voices (a short sample each), pick who reads the prayer, then
// confirm. `current` is the voice it's already recorded in (choosing it again would buy the same recording), so it
// can be heard but not picked.

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

  // One player for the samples; trying a voice also picks it
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);
  const [trying, setTrying] = useState<VoiceId | null>(null);

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
  }, []);

  const tryVoice = (v: VoiceId) => {
    if (trying === v && status.playing) {
      player.pause();
      setTrying(null);
      return;
    }
    if (v !== current) setVoice(v);
    player.replace(SAMPLES[v]);
    player.play();
    setTrying(v);
  };

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <View className="flex-1 justify-end">
        <Pressable onPress={onClose} className="absolute inset-0 bg-black/40" accessibilityLabel="Close" />
        <View className="rounded-t-[28px] bg-card px-5" style={{ paddingBottom: insets.bottom + 16 }}>
          <View className="mt-2.5 h-1 w-10 self-center rounded-full bg-line" />
          <Text className="mt-5 font-display text-[24px] leading-8 text-ink">Choose a voice</Text>
          <Text className="mt-1 font-sans text-[15px] text-muted">Who should read your prayer? Tap play to hear each one.</Text>

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
                  <Pressable
                    onPress={() => tryVoice(v.id)}
                    accessibilityRole="button"
                    accessibilityLabel={trying === v.id && status.playing ? `Stop ${v.name}` : `Hear ${v.name}`}
                    hitSlop={6}
                    className="h-10 w-10 items-center justify-center rounded-full bg-card active:opacity-70"
                  >
                    {trying === v.id && status.playing ? (
                      <PauseIcon size={14} color={c.ink} />
                    ) : (
                      <PlayIcon size={14} color={c.ink} />
                    )}
                  </Pressable>
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
            <InkButton
              label={`Listen with ${name} · ${price}`}
              onPress={() => {
                player.pause();
                onConfirm(voice);
              }}
              icon={<PlayIcon size={16} color={c.bg} />}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}
