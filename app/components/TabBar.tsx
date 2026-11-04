import type { Tabs } from "expo-router";
import type { ComponentProps } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "./ui/theme";

type BottomTabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>["tabBar"]>>[0];

// The floating tab bar from the Holy Hush Home design: an ink pill (cream in dark mode) with icons, the open tab
// a lighter pill with its label next to the icon.
export function TabBar({ state, descriptors, emitter, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const c = useColors();
  return (
    <View style={{ backgroundColor: c.bg, paddingHorizontal: 16, paddingTop: 6, paddingBottom: Math.max(insets.bottom, 12) }}>
      <View className="h-[60px] flex-row items-center justify-between rounded-full bg-ink px-2">
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const focused = state.index === index;
          const label = typeof options.title === "string" ? options.title : route.name;
          const onPress = () => {
            const event = emitter.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigateToTab(route.key);
          };
          const icon = options.tabBarIcon?.({ focused, color: focused ? c.ink : c.bg, size: 22 });
          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              onLongPress={() => emitter.emit({ type: "tabLongPress", target: route.key })}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={label}
              hitSlop={4}
              className={`h-11 flex-row items-center justify-center gap-2 rounded-full active:opacity-75 ${focused ? "bg-bg px-4" : "w-12"}`}
            >
              {icon}
              {focused && <Text className="font-sans-semibold text-[15px] text-ink">{label}</Text>}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
