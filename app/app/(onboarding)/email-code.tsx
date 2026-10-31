import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { IconButton } from "@/components/ui/Button";
import { BackIcon } from "@/components/ui/icons";
import { useColors } from "@/components/ui/theme";
import { useAuth } from "@/context/AuthContext";
import { startEmailLogin, verifyEmailCode } from "@/lib/api/auth";
import { errorMessage } from "@/lib/api/client";

// Email sign-in, step 2: the 6-digit code. The same email also has a link, which opens the app signed in (step 4).
export default function EmailCode() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const { signIn } = useAuth();
  const c = useColors();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);

  const verify = async (value: string) => {
    if (!email || value.length !== 6 || busy) return;
    setBusy(true);
    setError(null);
    try {
      // Signing in flips the route guards, which leave this screen on their own
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
    <SafeAreaView className="flex-1 bg-bg">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1 px-6">
        <View className="pt-2">
          <IconButton onPress={() => router.back()} label="Back">
            <BackIcon size={18} color={c.ink} />
          </IconButton>
        </View>

        <Text className="mt-8 font-display text-[30px] leading-[36px] text-ink">Check your email</Text>
        <Text className="mt-2 font-sans text-base leading-6 text-muted">
          Enter the code we sent to <Text className="font-sans-bold text-ink">{email}</Text>, or tap the link in the email.
        </Text>

        <TextInput
          value={code}
          onChangeText={onChange}
          placeholder="000000"
          placeholderTextColor={c.dim}
          keyboardType="number-pad"
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          maxLength={6}
          autoFocus
          editable={!busy}
          className="mt-8 rounded-2xl border-[1.5px] border-line2 bg-card px-4 py-4 text-center font-display text-3xl tracking-[10px] text-ink"
        />

        {busy && <ActivityIndicator className="mt-4" color={c.muted} />}
        {error && <Text className="mt-3 font-sans text-sm text-danger">{error}</Text>}

        <View className="mt-8 flex-row justify-between">
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Text className="font-sans text-base text-muted">Change email</Text>
          </Pressable>
          <Pressable onPress={resend} disabled={resent} hitSlop={8}>
            <Text className="font-sans-bold text-base text-olive-deep">{resent ? "New code sent" : "Send a new code"}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
