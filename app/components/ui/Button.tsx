import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { ArrowIcon } from "./icons";
import { useColors } from "./theme";

// Controls from SPEC §3: ink pill with a gold circle + arrow (primary), outline pill (secondary),
// olive pill ("Pray", "Amen").

type ButtonProps = { label: string; onPress: () => void; disabled?: boolean; loading?: boolean; icon?: ReactNode };

export function InkButton({ label, onPress, disabled, loading, icon }: ButtonProps) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      className={`h-14 w-full flex-row items-center justify-between rounded-full bg-ink pl-6 pr-1.5 active:scale-[0.98] ${disabled ? "opacity-30" : ""}`}
    >
      <Text className="font-sans-bold text-base text-bg">{label}</Text>
      <View className="h-11 w-11 items-center justify-center rounded-full bg-gold">
        {loading ? <ActivityIndicator color={c.onPastel} /> : (icon ?? <ArrowIcon color={c.onPastel} />)}
      </View>
    </Pressable>
  );
}

export function LineButton({ label, onPress, disabled, loading, icon }: ButtonProps) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      className={`h-[52px] w-full flex-row items-center justify-center gap-2.5 rounded-full border-[1.5px] border-line2 bg-card active:opacity-80 ${disabled ? "opacity-40" : ""}`}
    >
      {loading ? <ActivityIndicator color={c.ink} /> : icon}
      <Text className="font-sans-bold text-base text-ink">{label}</Text>
    </Pressable>
  );
}

export function OliveButton({ label, onPress, disabled, loading }: ButtonProps) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      className={`h-[52px] min-w-[170px] items-center justify-center rounded-full bg-olive px-8 active:scale-[0.97] ${disabled ? "opacity-40" : ""}`}
    >
      {loading ? <ActivityIndicator color={c.onPastel} /> : <Text className="font-sans-bold text-base text-on-pastel">{label}</Text>}
    </Pressable>
  );
}

export function IconButton({ onPress, label, children }: { onPress: () => void; label: string; children: ReactNode }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      className="h-10 w-10 items-center justify-center rounded-full bg-card active:opacity-70"
    >
      {children}
    </Pressable>
  );
}
