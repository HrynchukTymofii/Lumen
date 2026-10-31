import { Tabs } from "expo-router";
import { ChatIcon, JourneyIcon, PrayersIcon, SunIcon } from "@/components/ui/icons";
import { useColors } from "@/components/ui/theme";

// Signed-in app: Today · Prayers · Companion · Journey (SPEC §10.1). Settings opens from Journey.
// Each screen draws its own header, so the navigator's is off.
export default function TabsLayout() {
  const c = useColors();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.oliveDeep,
        tabBarInactiveTintColor: c.muted,
        tabBarStyle: { backgroundColor: c.card, borderTopColor: c.line },
        tabBarLabelStyle: { fontFamily: "Manrope_600SemiBold", fontSize: 11 },
        sceneStyle: { backgroundColor: c.bg },
      }}
    >
      <Tabs.Screen name="today" options={{ title: "Today", tabBarIcon: ({ color }) => <SunIcon color={color} /> }} />
      <Tabs.Screen name="prayers" options={{ title: "Prayers", tabBarIcon: ({ color }) => <PrayersIcon color={color} /> }} />
      <Tabs.Screen name="companion" options={{ title: "Companion", tabBarIcon: ({ color }) => <ChatIcon color={color} /> }} />
      <Tabs.Screen name="journey" options={{ title: "Journey", tabBarIcon: ({ color }) => <JourneyIcon color={color} /> }} />
    </Tabs>
  );
}
