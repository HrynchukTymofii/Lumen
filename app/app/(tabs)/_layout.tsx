import { Tabs } from "expo-router";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BookIcon, ChatIcon, CompassIcon, HomeIcon, PersonIcon } from "@/components/ui/icons";
import { useColors } from "@/components/ui/theme";

// Signed-in app: Today · Bible · Discover · Companion · Me (reworked after the Hallow screens in /assets).
// Settings opens from Me.
// Each screen draws its own header, so the navigator's is off.
export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const c = useColors();
  // The bar sits above the phone's own navigation bar / home indicator, never under it
  const bottom = Math.max(insets.bottom, 10);
  // The page colour behind the bar, so its rounded corners don't show the lighter screen underneath
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: c.oliveDeep,
          tabBarInactiveTintColor: c.muted,
          // A card with rounded top corners lifted off the page by a soft shadow
          tabBarStyle: {
            backgroundColor: c.card,
            borderTopWidth: 0,
            borderTopLeftRadius: 26,
            borderTopRightRadius: 26,
            // Items sit high in the bar, with extra room above the phone's navigation bar
            height: 58 + bottom + 8,
            paddingTop: 4,
            paddingBottom: bottom + 8,
            shadowColor: "#000",
            shadowOpacity: 0.08,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: -4 },
            elevation: 16,
          },
          tabBarItemStyle: { paddingVertical: 2 },
          tabBarLabelStyle: {
            fontFamily: "Manrope_600SemiBold",
            fontSize: 11,
            marginTop: 2,
          },
          sceneStyle: { backgroundColor: c.bg },
        }}
      >
        <Tabs.Screen
          name="today"
          options={{
            title: "Today",
            tabBarIcon: ({ color }) => <HomeIcon color={color} />,
          }}
        />
        <Tabs.Screen
          name="bible"
          options={{
            title: "Bible",
            tabBarIcon: ({ color }) => <BookIcon size={22} color={color} />,
          }}
        />
        <Tabs.Screen
          name="discover"
          options={{
            title: "Discover",
            tabBarIcon: ({ color }) => <CompassIcon color={color} />,
          }}
        />
        <Tabs.Screen
          name="companion"
          options={{
            title: "Companion",
            tabBarIcon: ({ color }) => <ChatIcon color={color} />,
          }}
        />
        <Tabs.Screen
          name="me"
          options={{
            title: "Me",
            tabBarIcon: ({ color }) => <PersonIcon color={color} />,
          }}
        />
      </Tabs>
    </View>
  );
}
