import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, Text, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { startEmailLogin } from "@/lib/api/auth";
import { errorMessage } from "@/lib/api/client";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Email sign-in. Apple and Google buttons join this screen with the onboarding (step 2).
export default function SignIn() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = EMAIL.test(email.trim());

  const send = async () => {
    if (!valid || sending) return;
    setSending(true);
    setError(null);
    try {
      const address = email.trim().toLowerCase();
      await startEmailLogin(address);
      router.push({ pathname: "/email-code", params: { email: address } });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-stone-50 dark:bg-stone-950">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1 justify-center px-6">
        <Text className="font-serif text-3xl text-stone-900 dark:text-stone-100">Sign in</Text>
        <Text className="mt-2 text-base text-stone-600 dark:text-stone-400">
          We’ll email you a 6-digit code. No password needed.
        </Text>

        <TextInput
          value={email}
          onChangeText={setEmail}
          onSubmitEditing={send}
          placeholder="you@example.com"
          placeholderTextColor="#a8a29e"
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
          returnKeyType="send"
          className="mt-8 rounded-2xl border border-stone-300 bg-white px-4 py-4 text-base text-stone-900 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
        />

        {error && <Text className="mt-3 text-sm text-red-700 dark:text-red-400">{error}</Text>}

        <Pressable
          onPress={send}
          disabled={!valid || sending}
          className={`mt-6 items-center rounded-full py-4 ${valid ? "bg-stone-900 dark:bg-stone-100" : "bg-stone-300 dark:bg-stone-800"}`}
        >
          {sending ? (
            <ActivityIndicator color="#a8a29e" />
          ) : (
            <Text className="text-base font-semibold text-white dark:text-stone-900">Email me a code</Text>
          )}
        </Pressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
