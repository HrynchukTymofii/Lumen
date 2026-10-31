import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";

// Signed-in home for now. The tabs (Today, Prayers, Journey, Settings) replace it in step 3.
export default function Home() {
  const { user, premium, signOut } = useAuth();

  return (
    <SafeAreaView className="flex-1 bg-stone-50 dark:bg-stone-950">
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-center font-serif text-4xl text-stone-900 dark:text-stone-100">
          {user?.firstName ? `Welcome, ${user.firstName}` : "Welcome"}
        </Text>
        <Text className="mt-4 text-center text-base text-stone-600 dark:text-stone-400">Signed in as {user?.email}</Text>
        <Text className="mt-1 text-center text-base text-stone-600 dark:text-stone-400">
          {premium.active ? "Premium" : "Free plan"}
        </Text>

        <Pressable onPress={signOut} className="mt-10 rounded-full border border-stone-300 px-6 py-3 dark:border-stone-700">
          <Text className="text-base text-stone-900 dark:text-stone-100">Sign out</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
