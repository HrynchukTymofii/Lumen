import { Pressable, Text, View } from "react-native";
import { Scene } from "./Scene";
import { CheckIcon } from "./ui/icons";
import { useColors } from "./ui/theme";

// A quiz answer: a small landscape thumbnail instead of an emoji (design/app.html), label and optional hint.
export function OptionCard({
  label,
  hint,
  scene,
  seed,
  selected,
  onPress,
}: {
  label: string;
  hint?: string;
  scene: string;
  seed: number;
  selected: boolean;
  onPress: () => void;
}) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      className={`flex-row items-center gap-3.5 rounded-[22px] border-[1.5px] bg-card p-2 pr-4 active:opacity-80 ${selected ? "border-ink" : "border-line"}`}
    >
      <View className="h-14 w-14 overflow-hidden rounded-2xl">
        <Scene name={scene} options={{ noBigTrees: true, seed }} />
      </View>
      <View className="flex-1">
        <Text className="font-sans-bold text-[15px] text-ink">{label}</Text>
        {hint && <Text className="mt-0.5 font-sans text-[13px] text-muted">{hint}</Text>}
      </View>
      <View className={`h-6 w-6 items-center justify-center rounded-full border-[1.5px] ${selected ? "border-ink bg-ink" : "border-line2"}`}>
        {selected && <CheckIcon size={14} color={c.bg} />}
      </View>
    </Pressable>
  );
}
