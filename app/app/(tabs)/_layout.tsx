import { Tabs } from "expo-router";
import { TabBar } from "@/components/TabBar";
import { BibleIcon, ChatIcon, HomeIcon, PersonIcon, SparkleIcon } from "@/components/ui/icons";
import { useColors } from "@/components/ui/theme";

// Signed-in app: Home · Discover · Bible · Companion · Me, in the floating pill bar from the Holy Hush design.
// Settings opens from Me. Each screen draws its own header, so the navigator's is off.
export default function TabsLayout() {
  const c = useColors();
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: c.bg } }}>
      <Tabs.Screen name="today" options={{ title: "Home", tabBarIcon: ({ color }) => <HomeIcon size={21} color={color} /> }} />
      <Tabs.Screen name="discover" options={{ title: "Discover", tabBarIcon: ({ color }) => <SparkleIcon size={21} color={color} /> }} />
      <Tabs.Screen name="bible" options={{ title: "Bible", tabBarIcon: ({ color }) => <BibleIcon size={21} color={color} /> }} />
      <Tabs.Screen name="companion" options={{ title: "Companion", tabBarIcon: ({ color }) => <ChatIcon size={21} color={color} /> }} />
      <Tabs.Screen name="me" options={{ title: "Me", tabBarIcon: ({ color }) => <PersonIcon size={21} color={color} /> }} />
    </Tabs>
  );
}
