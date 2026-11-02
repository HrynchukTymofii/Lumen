import { router } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Chips, Section } from "@/components/SettingsParts";
import { InkButton } from "@/components/ui/Button";
import { useColors } from "@/components/ui/theme";
import { useAuth } from "@/context/AuthContext";
import { errorMessage } from "@/lib/api/client";
import { SUPPORT_MESSAGE_MAX, SUPPORT_TOPICS, sendSupportRequest, type SupportTopic } from "@/lib/api/support";
import { SITE_URL, SUPPORT_EMAIL } from "@/lib/config";
import { reportError } from "@/lib/errorReporting";

// Contact & Support, from Settings: a short form that lands in the support inbox (POST /api/support),
// plus the help page and the email address for anyone who'd rather write directly.

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SupportSettings() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const c = useColors();
  const [email, setEmail] = useState(user?.email ?? "");
  const [topic, setTopic] = useState<SupportTopic | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const valid = EMAIL.test(email.trim()) && topic !== null && message.trim().length >= 10;

  const send = async () => {
    if (!valid || sending || !topic) return;
    setSending(true);
    setError(null);
    try {
      await sendSupportRequest({ email: email.trim(), name: user?.firstName || undefined, topic, message: message.trim() });
      setSent(true);
    } catch (err) {
      reportError(err);
      setError(errorMessage(err));
    } finally {
      setSending(false);
    }
  };

  const open = (url: string) => Linking.openURL(url).catch(reportError);
  const input = "rounded-2xl border-[1.5px] border-line2 bg-bg px-4 py-3.5 font-sans text-base text-ink";

  return (
    <View className="flex-1 bg-bg">
      <ScreenHeader title="Contact & Support" fallback="/settings" />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} keyboardShouldPersistTaps="handled">
          {sent ? (
            <Section>
              <Text className="font-display text-[24px] leading-8 text-ink">Thank you</Text>
              <Text className="mt-2 font-sans text-base leading-6 text-muted">
                We got your message and will reply to {email.trim()} within two working days.
              </Text>
              <View className="mt-5">
                <InkButton label="Done" onPress={() => (router.canGoBack() ? router.back() : router.replace("/settings"))} />
              </View>
            </Section>
          ) : (
            <>
              <Text className="mx-6 mt-1 font-sans text-base leading-6 text-muted">
                We’re a small team and read every message. We usually reply within two working days.
              </Text>

              <Section title="What’s it about?">
                <Chips options={[...SUPPORT_TOPICS]} value={topic} onChange={setTopic} />
              </Section>

              <Section title="Your message">
                <TextInput
                  value={message}
                  onChangeText={setMessage}
                  placeholder="Tell us what happened. If it’s about a payment, include the email you paid with."
                  placeholderTextColor={c.dim}
                  multiline
                  maxLength={SUPPORT_MESSAGE_MAX}
                  textAlignVertical="top"
                  className={`${input} min-h-36`}
                  accessibilityLabel="Your message"
                />
                <Text className="mb-2 mt-5 font-sans-bold text-sm text-ink">Where should we reply?</Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  placeholderTextColor={c.dim}
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect={false}
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  className={input}
                  accessibilityLabel="Your email"
                />
                {error && <Text className="mt-3 font-sans text-sm text-danger">{error}</Text>}
                <View className="mt-5">
                  <InkButton label="Send message" onPress={send} disabled={!valid} loading={sending} />
                </View>
              </Section>
            </>
          )}

          <View className="mx-6 mt-6 gap-3">
            <Pressable onPress={() => open(`${SITE_URL}/support`)} accessibilityRole="link" hitSlop={6}>
              <Text className="font-sans-bold text-sm text-olive-deep">Common questions</Text>
            </Pressable>
            <Pressable onPress={() => open(`mailto:${SUPPORT_EMAIL}`)} accessibilityRole="link" hitSlop={6}>
              <Text className="font-sans text-sm text-muted">
                Or email <Text className="font-sans-bold text-olive-deep">{SUPPORT_EMAIL}</Text>
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
