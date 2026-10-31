import { Link, Stack } from "expo-router";
import { Text, View } from "react-native";

export default function NotFound() {
  return (
    <>
      <Stack.Screen options={{ title: "Not found" }} />
      <View className="flex-1 items-center justify-center bg-stone-50 px-6 dark:bg-stone-950">
        <Text className="text-xl text-stone-900 dark:text-stone-100">This screen does not exist.</Text>
        <Link href="/" className="mt-4 text-amber-700 dark:text-amber-400">
          Go to home
        </Link>
      </View>
    </>
  );
}
