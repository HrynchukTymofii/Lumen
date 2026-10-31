import * as AppleAuthentication from "expo-apple-authentication";
import { router } from "expo-router";
import { useColorScheme } from "nativewind";
import { useEffect, useState } from "react";
import { Linking, Pressable, Text, View } from "react-native";
import { ArtSheet } from "@/components/ArtSheet";
import { LineButton } from "@/components/ui/Button";
import { CheckIcon, GoogleIcon, MailIcon } from "@/components/ui/icons";
import { useColors } from "@/components/ui/theme";
import { useAppleLogin } from "@/hooks/useAppleLogin";
import { useGoogleLogin } from "@/hooks/useGoogleLogin";
import { SITE_URL } from "@/lib/config";
import { getPendingOnboarding, hasSensitiveAnswers, savePendingOnboarding } from "@/lib/onboarding";

// Apple / Google / email. After the quiz it saves the answers to the new account; from "I already have an
// account" it just signs in. Signing in flips the route guards, which move on from this screen.
export default function SignIn() {
  const c = useColors();
  const { colorScheme } = useColorScheme();
  const apple = useAppleLogin();
  const google = useGoogleLogin();
  const [fromQuiz, setFromQuiz] = useState(false);
  const [askConsent, setAskConsent] = useState(false);
  const [consent, setConsent] = useState(false);

  useEffect(() => {
    getPendingOnboarding().then((p) => {
      setFromQuiz(Boolean(p));
      setAskConsent(Boolean(p && hasSensitiveAnswers(p.answers)));
      setConsent(p?.sensitiveConsent ?? false);
    });
  }, []);

  // Faith and what someone carries are special-category data (GDPR art. 9): an explicit opt-in, never pre-ticked
  const toggleConsent = () => {
    const next = !consent;
    setConsent(next);
    savePendingOnboarding({ sensitiveConsent: next });
  };

  const error = apple.error ?? google.error;

  return (
    <ArtSheet scene="sky" artHeight={360} onBack={() => (router.canGoBack() ? router.back() : router.replace("/welcome"))}>
      <Text className="font-display text-[30px] leading-[36px] text-ink">{fromQuiz ? "Save your prayers" : "Welcome back"}</Text>
      <Text className="mt-2 font-sans text-base leading-6 text-muted">
        {fromQuiz ? "Your prayers, journal and week stay safe on any device." : "Sign in the way you did before."}
      </Text>

      {askConsent && (
        <Pressable onPress={toggleConsent} accessibilityRole="checkbox" accessibilityState={{ checked: consent }} className="mt-6 flex-row gap-3 rounded-2xl bg-sage p-4">
          <View className={`mt-0.5 h-6 w-6 items-center justify-center rounded-md border-[1.5px] border-on-pastel ${consent ? "bg-on-pastel" : ""}`}>
            {consent && <CheckIcon size={14} color="#F2E4B4" />}
          </View>
          <Text className="flex-1 font-sans text-sm leading-5 text-on-pastel">
            Keep my answers about my faith and what I’m carrying in my account, so my prayers stay personal. I can delete
            them any time.
          </Text>
        </Pressable>
      )}

      <View className="mt-auto gap-3 pt-8">
        {apple.available && (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
            buttonStyle={
              colorScheme === "dark"
                ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
            }
            cornerRadius={26}
            style={{ height: 52, width: "100%" }}
            onPress={apple.login}
          />
        )}
        {google.available && (
          <LineButton label="Continue with Google" onPress={google.login} loading={google.loading} icon={<GoogleIcon />} />
        )}
        <LineButton label="Continue with email" onPress={() => router.push("/email")} icon={<MailIcon color={c.ink} />} />

        {error && <Text className="text-center font-sans text-sm text-danger">{error}</Text>}

        <Text className="mt-1 text-center font-sans text-[13px] leading-5 text-muted">
          By continuing you agree to the{" "}
          <Text className="underline" onPress={() => Linking.openURL(`${SITE_URL}/terms`)}>
            Terms
          </Text>{" "}
          and{" "}
          <Text className="underline" onPress={() => Linking.openURL(`${SITE_URL}/privacy`)}>
            Privacy Policy
          </Text>
          .
        </Text>
      </View>
    </ArtSheet>
  );
}
