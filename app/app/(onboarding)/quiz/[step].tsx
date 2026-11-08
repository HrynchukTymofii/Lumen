import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { AccessibilityInfo, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";
import { Light } from "@/components/Light";
import { OptionCard } from "@/components/OptionCard";
import { Scene } from "@/components/Scene";
import { IconButton, InkButton } from "@/components/ui/Button";
import { BackIcon, CheckIcon } from "@/components/ui/icons";
import { useColors } from "@/components/ui/theme";
import { track } from "@/lib/analytics";
import type { Answers } from "@/lib/api/types";
import { getPendingOnboarding, savePendingOnboarding } from "@/lib/onboarding";
import { QUIZ, quizIndex, quizValue, sceneFor, type QuizStep } from "@/lib/quiz";

// One quiz step per screen (/quiz/carrying, /quiz/burden…), drawn like the web funnel's steps
// (website/app/(site)/f/[slug]/funnel.tsx). Answers wait on the phone until sign-in.
export default function QuizScreen() {
  const { step: stepId } = useLocalSearchParams<{ step: string }>();
  const index = quizIndex(stepId);
  const step = QUIZ[index];
  const [answers, setAnswers] = useState<Answers | null>(null);

  // Coming back to a step shows what was picked before; earlier answers word some steps
  useEffect(() => {
    getPendingOnboarding().then((p) => setAnswers(p?.answers ?? {}));
  }, [step]);

  const next = async (patch: Answers, answer?: unknown) => {
    await savePendingOnboarding({ answers: patch });
    track("quiz_step_completed", {
      funnel_slug: "app",
      step_id: step.id,
      answer: "sensitive" in step && step.sensitive ? "hidden" : Array.isArray(answer) ? answer.map(String) : String(answer ?? ""),
    });
    const following = QUIZ[index + 1];
    if (following) router.push({ pathname: "/quiz/[step]", params: { step: following.id } });
    else router.push("/sign-in");
  };

  if (!answers) return <View className="flex-1 bg-bg" />;
  // A fresh object per step, so a step's own state starts from its saved answer
  return <StepView key={step.id} step={step} index={index} answers={answers} onNext={next} />;
}

type StepProps = { step: QuizStep; index: number; answers: Answers; onNext: (patch: Answers, answer?: unknown) => void };

function StepView({ step, index, answers, onNext }: StepProps) {
  switch (step.type) {
    case "single":
      return (
        <Question index={index} title={step.title} subtitle={step.subtitle}>
          <SingleOptions step={step} answers={answers} onNext={onNext} />
        </Question>
      );
    case "multi":
      return <MultiStep step={step} index={index} answers={answers} onNext={onNext} />;
    case "scale":
      return <ScaleStep step={step} index={index} answers={answers} onNext={onNext} />;
    case "text":
      return <TextStep step={step} index={index} answers={answers} onNext={onNext} />;
    case "fact":
      return <InsightCard scene={step.scene} title={step.title} body={`${step.stat ? `${step.stat}\n\n` : ""}${step.body}`} onNext={() => onNext({})} />;
    case "insight": {
      const title = step.named && answers.firstName ? `${answers.firstName}, ${step.title[0].toLowerCase()}${step.title.slice(1)}` : step.title;
      return <InsightCard scene={step.scene} title={title} body={step.body} verse={step.verse} onNext={() => onNext({})} />;
    }
    case "obstacle-insight": {
      // "I don't know what to say" wins when picked, else the first obstacle picked (the web's rule)
      const picked = (answers.obstacles ?? []).filter((o) => step.insights[o]);
      const [title, body] = step.insights[picked.includes(step.prefer) ? step.prefer : (picked[0] ?? step.prefer)];
      return <InsightCard scene={step.scene} title={title} body={body} onNext={() => onNext({})} />;
    }
    case "loading":
      return <LoadingStep step={step} answers={answers} onNext={onNext} />;
  }
}

// ───────── Questions ─────────

function Question({ index, title, subtitle, footer, children }: { index: number; title: string; subtitle?: string; footer?: ReactNode; children: ReactNode }) {
  const c = useColors();
  return (
    <SafeAreaView className="flex-1 bg-bg">
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View className="flex-row items-center gap-3 px-6 pt-2">
          <IconButton onPress={() => router.back()} label="Back">
            <BackIcon size={18} color={c.ink} />
          </IconButton>
          <View className="h-1.5 flex-1 overflow-hidden rounded-full bg-line2">
            <View className="h-full rounded-full bg-olive-deep" style={{ width: `${((index + 1) / QUIZ.length) * 100}%` }} />
          </View>
        </View>

        <ScrollView contentContainerClassName="px-6 pb-6" keyboardShouldPersistTaps="handled">
          <Text className="mt-6 font-display text-[28px] leading-[34px] text-ink">{title}</Text>
          {subtitle ? <Text className="mt-2 font-sans text-[15px] leading-[22px] text-muted">{subtitle}</Text> : null}
          <View className="mt-6">{children}</View>
        </ScrollView>

        {footer && <View className="border-t border-line px-6 pb-2 pt-4">{footer}</View>}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// One tap answers and moves on, as on the web; the pick shows for a moment first
function SingleOptions({ step, answers, onNext }: { step: Extract<QuizStep, { type: "single" }>; answers: Answers; onNext: StepProps["onNext"] }) {
  const [picked, setPicked] = useState(quizValue(answers, step.answerKey)[0]);
  const pick = (value: string) => {
    setPicked(value);
    setTimeout(() => onNext({ [step.answerKey]: value }, value), 180);
  };
  return (
    <View className="gap-2.5">
      {step.options.map((o, i) => (
        <OptionCard key={o.value} label={o.label} hint={o.hint} scene={sceneFor(o.value, i)} seed={i} selected={picked === o.value} onPress={() => pick(o.value)} />
      ))}
    </View>
  );
}

function MultiStep({ step, index, answers, onNext }: { step: Extract<QuizStep, { type: "multi" }>; index: number; answers: Answers; onNext: StepProps["onNext"] }) {
  // Worded after an earlier answer ("What keeps you from praying every day?")
  const earlier = step.follows ? answers[step.follows.answerKey] : undefined;
  const variant = step.follows && typeof earlier === "string" ? step.follows.variants[earlier] : undefined;
  const title = variant?.title ?? step.title;
  const subtitle = variant ? variant.subtitle : step.subtitle;
  const options = [...step.options, ...(variant?.extra ?? [])];
  const exclusive = new Set(options.filter((o) => o.exclusive).map((o) => o.value));
  // Only what's on screen counts (an earlier pick may belong to options this wording doesn't offer)
  const [picked, setPicked] = useState(() => quizValue(answers, step.answerKey).filter((v) => options.some((o) => o.value === v)));
  const max = step.maxSelect ?? options.length;
  const toggle = (v: string) =>
    setPicked((p) => {
      if (p.includes(v)) return p.filter((x) => x !== v);
      if (exclusive.has(v)) return [v];
      const rest = p.filter((x) => !exclusive.has(x));
      return rest.length >= max ? [...rest.slice(1), v] : [...rest, v];
    });

  return (
    <Question
      index={index}
      title={title}
      subtitle={subtitle}
      footer={<InkButton label="Continue" onPress={() => onNext({ [step.answerKey]: picked }, picked)} disabled={!picked.length} />}
    >
      <View className="gap-2.5">
        {options.map((o, i) => (
          <OptionCard key={o.value} label={o.label} hint={o.hint} scene={sceneFor(o.value, i)} seed={i} selected={picked.includes(o.value)} onPress={() => toggle(o.value)} />
        ))}
      </View>
    </Question>
  );
}

function ScaleStep({ step, index, answers, onNext }: { step: Extract<QuizStep, { type: "scale" }>; index: number; answers: Answers; onNext: StepProps["onNext"] }) {
  const [picked, setPicked] = useState(answers.burden);
  const pick = (n: number) => {
    setPicked(n);
    setTimeout(() => onNext({ burden: n }, n), 180);
  };
  return (
    <Question index={index} title={step.title} subtitle={step.statement}>
      <View className="flex-row justify-between gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable
            key={n}
            onPress={() => pick(n)}
            accessibilityRole="radio"
            accessibilityState={{ checked: picked === n }}
            accessibilityLabel={`${n} of 5`}
            className={`aspect-square flex-1 items-center justify-center rounded-full border-[1.5px] active:opacity-80 ${picked === n ? "border-ink bg-ink" : "border-line bg-card"}`}
          >
            <Text className={`font-display text-[22px] ${picked === n ? "text-bg" : "text-ink"}`}>{n}</Text>
          </Pressable>
        ))}
      </View>
      <View className="mt-3 flex-row justify-between">
        <Text className="font-sans text-sm text-muted">{step.low}</Text>
        <Text className="font-sans text-sm text-muted">{step.high}</Text>
      </View>
    </Question>
  );
}

function TextStep({ step, index, answers, onNext }: { step: Extract<QuizStep, { type: "text" }>; index: number; answers: Answers; onNext: StepProps["onNext"] }) {
  const c = useColors();
  const [text, setText] = useState(answers.firstName ?? "");
  const done = () => onNext({ firstName: text.trim() || undefined }, text.trim() ? "given" : "skipped");
  return (
    <Question index={index} title={step.title} subtitle={step.subtitle} footer={<InkButton label={text.trim() ? "Continue" : "Skip"} onPress={done} />}>
      <TextInput
        value={text}
        onChangeText={(t) => setText(t.slice(0, 40))}
        placeholder={step.placeholder}
        placeholderTextColor={c.dim}
        autoComplete="given-name"
        textContentType="givenName"
        autoCapitalize="words"
        autoFocus
        returnKeyType="done"
        onSubmitEditing={done}
        className="rounded-[22px] border-[1.5px] border-line bg-card px-5 py-4 font-sans text-[18px] text-ink"
      />
    </Question>
  );
}

// ───────── Insight screens ─────────

function InsightCard({ scene, title, body, verse, onNext }: { scene: string; title: string; body: string; verse?: { ref: string; text: string }; onNext: () => void }) {
  const insets = useSafeAreaInsets();
  const c = useColors();
  return (
    <View className="flex-1 bg-bg">
      <View className="absolute inset-0">
        <Scene name={scene} />
      </View>
      <View className="absolute left-6" style={{ top: insets.top + 8 }}>
        <IconButton onPress={() => router.back()} label="Back">
          <BackIcon size={18} color={c.ink} />
        </IconButton>
      </View>
      <View className="flex-1 justify-end px-4" style={{ paddingBottom: insets.bottom + 12 }}>
        <View className="items-center rounded-[28px] bg-card px-6 pb-6 pt-5">
          <Light size={64} />
          <Text className="mt-2 text-center font-display text-[26px] leading-8 text-ink">{title}</Text>
          <Text className="mt-2 text-center font-sans text-base leading-6 text-muted">{body}</Text>
          {verse && (
            <View className="mt-4 w-full border-l-[3px] border-olive pl-3">
              <Text className="font-serif text-[16px] leading-6 text-ink">{verse.text}</Text>
              <Text className="mt-1 font-sans-bold text-sm text-olive-deep">{verse.ref}</Text>
            </View>
          )}
          <View className="mt-6 w-full">
            <InkButton label="Continue" onPress={onNext} />
          </View>
        </View>
      </View>
    </View>
  );
}

// ───────── "Making your path" ─────────

// One smooth sweep of ~6.5 s that surges and lingers (the web's curve), drawn as a golden halo around the Light.
// The optional question ("When would you like to pray?") pauses it at 45%.
const LOAD_MS = 6500;
const loadCurve = (t: number) => {
  const wave = t + (0.55 * Math.sin(5 * Math.PI * t)) / (5 * Math.PI);
  return wave < 0.5 ? 4 * wave ** 3 : 1 - (-2 * wave + 2) ** 3 / 2;
};
const HALO_R = 54;
const HALO_C = 2 * Math.PI * HALO_R;

function LoadingStep({ step, answers, onNext }: { step: Extract<QuizStep, { type: "loading" }>; answers: Answers; onNext: StepProps["onNext"] }) {
  const insets = useSafeAreaInsets();
  const c = useColors();
  const micro = step.micro;
  const [pct, setPct] = useState(0);
  const [choice, setChoice] = useState<string | undefined>(micro ? (answers[micro.answerKey] as string | undefined) : undefined);
  const asking = Boolean(micro) && !choice && pct >= 45;
  const elapsed = useRef(0); // ms of animation so far, kept across the question's pause
  const done = useRef(false);
  // The latest onNext, without restarting the animation when it changes
  const next = useRef(onNext);
  useEffect(() => {
    next.current = onNext;
  });

  useEffect(() => {
    let raf = 0;
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (cancelled || asking || done.current) return;
      if (reduce) elapsed.current = Math.max(elapsed.current, LOAD_MS * 0.6);
      let last = Date.now();
      const tick = () => {
        const now = Date.now();
        elapsed.current = Math.min(LOAD_MS, elapsed.current + (now - last));
        last = now;
        const p = loadCurve(elapsed.current / LOAD_MS) * 100;
        setPct(p);
        if (micro && !choice && p >= 45) return; // stop here; the question opens
        if (elapsed.current < LOAD_MS) raf = requestAnimationFrame(tick);
        else if (!done.current) {
          done.current = true;
          setTimeout(() => next.current(micro && choice ? { [micro.answerKey]: choice } : {}, choice), 450);
        }
      };
      raf = requestAnimationFrame(tick);
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [asking, choice, micro]);

  const shown = Math.floor((pct / 100) * step.messages.length);
  return (
    <View className="flex-1 items-center bg-bg px-8" style={{ paddingTop: insets.top + 70 }}>
      <View style={{ width: 200, height: 200 }} className="items-center justify-center">
        <Svg width={200} height={200} viewBox="0 0 120 120" style={{ position: "absolute" }}>
          <Defs>
            <LinearGradient id="halo-g" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#FFF1C9" />
              <Stop offset="0.5" stopColor="#F5C77E" />
              <Stop offset="1" stopColor="#F5AE6C" />
            </LinearGradient>
          </Defs>
          <Circle cx={60} cy={60} r={HALO_R} fill="none" stroke={c.line} strokeWidth={3} />
          <Circle
            cx={60}
            cy={60}
            r={HALO_R}
            fill="none"
            stroke="url(#halo-g)"
            strokeWidth={4}
            strokeLinecap="round"
            strokeDasharray={HALO_C}
            strokeDashoffset={HALO_C * (1 - pct / 100)}
            transform="rotate(-90 60 60)"
          />
        </Svg>
        <Light size={110} state="thinking" />
      </View>
      <Text className="mt-4 font-display text-[34px] text-ink">{Math.floor(pct)}%</Text>

      <View className="mt-6 w-full gap-3">
        {step.messages.map((m, i) => (
          <View key={m} className="flex-row items-center gap-3">
            <View className={`h-6 w-6 items-center justify-center rounded-full ${i < shown ? "bg-olive" : i === shown ? "border-2 border-olive" : "border-2 border-line"}`}>
              {i < shown && <CheckIcon size={12} color={c.onPastel} />}
            </View>
            <Text className={`font-sans text-base ${i <= shown ? "text-ink" : "text-dim"}`}>{m}</Text>
          </View>
        ))}
      </View>

      {asking && micro && (
        <View className="absolute inset-x-0 bottom-0 rounded-t-[28px] bg-card px-6 pt-6" style={{ paddingBottom: insets.bottom + 20 }} accessibilityViewIsModal>
          <Text className="font-display text-[22px] leading-7 text-ink">{micro.title}</Text>
          <View className="mt-4 flex-row gap-2">
            {micro.options.map((o) => (
              <Pressable
                key={o.value}
                onPress={() => setChoice(o.value)}
                accessibilityRole="button"
                className="flex-1 items-center rounded-full border-[1.5px] border-line bg-bg py-3.5 active:opacity-80"
              >
                <Text className="font-sans-bold text-[15px] text-ink">{o.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}
