import { Linking, Pressable, Text, View } from "react-native";
import type { CrisisResource } from "@/lib/api/types";

// Call / text buttons for someone who may be in danger (the companion's crisis reply, the prayer generator)
export function CrisisCard({ resources }: { resources: CrisisResource[] }) {
  return (
    <View className="gap-2 rounded-2xl bg-rose px-4 py-4">
      <Text className="font-sans-bold text-[15px] text-on-pastel">You don’t have to go through this alone</Text>
      {resources.map((r) => (
        <Pressable
          key={r.href}
          onPress={() => Linking.openURL(r.href)}
          accessibilityRole="button"
          className="rounded-full bg-ink px-4 py-3 active:opacity-80"
        >
          <Text className="text-center font-sans-bold text-base text-bg">{r.label}</Text>
          <Text className="text-center font-sans text-xs text-bg/70">{r.note}</Text>
        </Pressable>
      ))}
    </View>
  );
}
