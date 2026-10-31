import { Link, Stack } from "expo-router";
import { Text, View } from "react-native";

export default function NotFound() {
  return (
    <>
      <Stack.Screen options={{ title: "Not found" }} />
      <View className="flex-1 items-center justify-center bg-bg px-6">
        <Text className="font-display text-xl text-ink">This screen does not exist.</Text>
        <Link href="/" className="mt-4 font-sans-bold text-olive-deep">
          Go to home
        </Link>
      </View>
    </>
  );
}
