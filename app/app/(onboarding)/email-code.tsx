import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { startEmailLogin, verifyEmailCode } from "@/lib/api/auth";
import { errorMessage } from "@/lib/api/client";

// 6-digit code from the sign-in email. The same email also has a link, which opens the app signed in (step 4).
export default function EmailCode() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const { signIn } = useAuth();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);

  const verify = async (value: string) => {
    if (!email || value.length !== 6 || busy) return;
    setBusy(true);
    setError(null);
    try {
      // Signing in flips the route guards, which leaves this screen on its own
      await signIn(await verifyEmailCode(email, value));
    } catch (err) {
      setError(errorMessage(err));
      setCode("");
      setBusy(false);
    }
  };

  const onChange = (text: string) => {
    const digits = text.replace(/\D/g, "").slice(0, 6);
    setCode(digits);
    if (digits.length === 6) verify(digits);
  };

  const resend = async () => {
    if (!email) return;
    setError(null);
    try {
      await startEmailLogin(email);
      setResent(true);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-stone-50 dark:bg-stone-950">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1 justify-center px-6">
        <Text className="font-serif text-3xl text-stone-900 dark:text-stone-100">Check your email</Text>
        <Text className="mt-2 text-base text-stone-600 dark:text-stone-400">
          Enter the code we sent to <Text className="font-semibold text-stone-900 dark:text-stone-100">{email}</Text>.
        </Text>

        <TextInput
          value={code}
          onChangeText={onChange}
          placeholder="000000"
          placeholderTextColor="#d6d3d1"
          keyboardType="number-pad"
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          maxLength={6}
          autoFocus
          editable={!busy}
          className="mt-8 rounded-2xl border border-stone-300 bg-white px-4 py-4 text-center font-mono text-3xl tracking-[8px] text-stone-900 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
        />

        {busy && <ActivityIndicator className="mt-4" color="#a8a29e" />}
        {error && <Text className="mt-3 text-sm text-red-700 dark:text-red-400">{error}</Text>}

        <View className="mt-8 flex-row justify-between">
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Text className="text-base text-stone-600 dark:text-stone-400">Change email</Text>
          </Pressable>
          <Pressable onPress={resend} disabled={resent} hitSlop={8}>
            <Text className="text-base font-semibold text-stone-900 dark:text-stone-100">
              {resent ? "New code sent" : "Send a new code"}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
