import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useColors } from "./theme";

// Holy Hush controls, as on the website (.lp-btn): a plain ink pill (primary), a soft surface pill (secondary),
// and an ink pill sized to its label ("Pray", "Amen").

type ButtonProps = { label: string; onPress: () => void; disabled?: boolean; loading?: boolean; icon?: ReactNode };

export function InkButton({ label, onPress, disabled, loading, icon }: ButtonProps) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      className={`h-14 w-full flex-row items-center justify-center gap-2.5 rounded-full bg-ink px-7 active:scale-[0.98] ${disabled ? "opacity-30" : ""}`}
    >
      {loading ? <ActivityIndicator color={c.bg} /> : <Text className="font-sans-semibold text-[17px] text-bg">{label}</Text>}
      {!loading && icon !== undefined && <View>{icon}</View>}
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
      className={`h-14 w-full flex-row items-center justify-center gap-2.5 rounded-full bg-card active:opacity-80 ${disabled ? "opacity-40" : ""}`}
    >
      {loading ? <ActivityIndicator color={c.ink} /> : icon}
      <Text className="font-sans-semibold text-[17px] text-ink">{label}</Text>
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
      className={`h-[52px] min-w-[170px] items-center justify-center rounded-full bg-ink px-8 active:scale-[0.97] ${disabled ? "opacity-40" : ""}`}
    >
      {loading ? <ActivityIndicator color={c.bg} /> : <Text className="font-sans-semibold text-[17px] text-bg">{label}</Text>}
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
