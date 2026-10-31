import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";

// Signed-in home for now. The tabs (Today, Prayers, Journey, Settings) replace it in step 3.
export default function Home() {
  const { user, premium, signOut } = useAuth();

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-center font-display text-4xl text-ink">
          {user?.firstName ? `Welcome, ${user.firstName}` : "Welcome"}
        </Text>
        <Text className="mt-4 text-center font-sans text-base text-muted">Signed in as {user?.email}</Text>
        <Text className="mt-1 text-center font-sans text-base text-muted">
          {premium.active ? "Premium" : "Free plan"}
        </Text>

        <Pressable onPress={signOut} className="mt-10 rounded-full border-[1.5px] border-line2 px-6 py-3">
          <Text className="font-sans-bold text-base text-ink">Sign out</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
