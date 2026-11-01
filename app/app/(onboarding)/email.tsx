import { router } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { IconButton, InkButton } from "@/components/ui/Button";
import { BackIcon } from "@/components/ui/icons";
import { useColors } from "@/components/ui/theme";
import { startEmailLogin } from "@/lib/api/auth";
import { errorMessage } from "@/lib/api/client";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Email sign-in, step 1: the server emails a 6-digit code and a sign-in link.
export default function Email() {
  const c = useColors();
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
    <SafeAreaView className="flex-1 bg-bg">
      <KeyboardAvoidingView behavior="padding" className="flex-1 px-6">
        <View className="pt-2">
          <IconButton onPress={() => router.back()} label="Back">
            <BackIcon size={18} color={c.ink} />
          </IconButton>
        </View>

        <Text className="mt-8 font-display text-[30px] leading-[36px] text-ink">Continue with email</Text>
        <Text className="mt-2 font-sans text-base leading-6 text-muted">We’ll email you a 6-digit code. No password needed.</Text>

        <TextInput
          value={email}
          onChangeText={setEmail}
          onSubmitEditing={send}
          placeholder="you@example.com"
          placeholderTextColor={c.dim}
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
          autoFocus
          keyboardType="email-address"
          textContentType="emailAddress"
          returnKeyType="send"
          className="mt-8 rounded-2xl border-[1.5px] border-line2 bg-card px-4 py-4 font-sans text-base text-ink"
        />
        {error && <Text className="mt-3 font-sans text-sm text-danger">{error}</Text>}

        <View className="mt-auto pb-4 pt-6">
          <InkButton label="Email me a code" onPress={send} disabled={!valid} loading={sending} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
