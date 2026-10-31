import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Home() {
  return (
    <SafeAreaView className="flex-1 bg-stone-50 dark:bg-stone-950">
      <View className="flex-1 items-center justify-center px-6">
        <View className="rounded-full border border-amber-300 bg-amber-100 px-4 py-1 dark:border-amber-700 dark:bg-amber-950">
          <Text className="text-sm font-medium text-amber-800 dark:text-amber-300">
            In development
          </Text>
        </View>

        <Text className="mt-8 text-center font-serif text-4xl text-stone-900 dark:text-stone-100">
          Prayer Companion
        </Text>

        <Text className="mt-4 text-center text-base text-stone-600 dark:text-stone-400">
          An AI companion for prayer and Bible reading. We are building it right now.
        </Text>
      </View>
    </SafeAreaView>
  );
}
