import { useRef, useState, type ComponentRef } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { Light } from "./Light";
import { MicIcon, TrashIcon } from "./ui/icons";
import { useColors } from "./ui/theme";

// A tall drawer for writing: Bible notes, intentions and reflections. Optional title, then the body, which can
// also be spoken. Plain text (RichText still draws markup in notes written before the formatting bar was removed).

type Selection = { start: number; end: number };

export function NoteDrawer({
  heading,
  context,
  withTitle,
  titleHint = "Title",
  bodyHint,
  initialTitle = "",
  initialBody = "",
  onClose,
  onSave,
  onDelete,
}: {
  heading: string;
  context?: string; // e.g. the verse being annotated
  withTitle?: boolean;
  titleHint?: string;
  bodyHint: string;
  initialTitle?: string;
  initialBody?: string;
  onClose: () => void;
  onSave: (value: { title: string; body: string }) => void;
  onDelete?: () => void;
}) {
  const insets = useSafeAreaInsets();
  const c = useColors();
  const [title, setTitle] = useState(initialTitle);
  const [body, setBody] = useState(initialBody);
  // The cursor is tracked, and only set on the input right after dictation (a controlled selection makes the
  // cursor jump while typing on Android)
  const selRef = useRef<Selection>({ start: initialBody.length, end: initialBody.length });
  const [forced, setForced] = useState<Selection | undefined>();
  const setSel = (s: Selection) => {
    selRef.current = s;
    setForced(s);
  };
  const input = useRef<ComponentRef<typeof TextInput>>(null);

  // Dictation goes in at the cursor; the words arrive as they're spoken, so each update replaces the last one
  const around = useRef({ before: "", after: "" });
  const voice = useVoiceInput((said) => {
    const { before, after } = around.current;
    const spaced = (before && !/\s$/.test(before) ? " " : "") + said;
    setBody(before + spaced + after);
    setSel({ start: before.length + spaced.length, end: before.length + spaced.length });
  });
  const toggleVoice = () => {
    if (voice.listening) return voice.stop();
    const sel = selRef.current;
    around.current = { before: body.slice(0, sel.start), after: body.slice(sel.end) };
    voice.start();
  };

  const save = () => {
    voice.cancel();
    onSave({ title, body });
  };
  const cancel = () => {
    voice.cancel();
    onClose();
  };

  return (
    <Modal transparent animationType="slide" onRequestClose={save} statusBarTranslucent navigationBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1 justify-end">
        <Pressable onPress={save} className="absolute inset-0 bg-black/40" accessibilityLabel="Save and close" />
        {/* Fills the space above the keyboard rather than a fixed height, so the keyboard never pushes its top
            (the verse, the cursor) off the screen */}
        <View className="flex-1 rounded-t-[28px] bg-card" style={{ marginTop: insets.top + 12, paddingBottom: insets.bottom + 8 }}>
          <View className="mt-2.5 h-1 w-10 self-center rounded-full bg-line" />
          <View className="flex-row items-center justify-between px-5 pt-3">
            <Pressable onPress={cancel} accessibilityRole="button" hitSlop={8}>
              <Text className="font-sans-bold text-base text-muted">Cancel</Text>
            </Pressable>
            <Text className="mx-3 flex-1 text-center font-sans-bold text-base text-ink" numberOfLines={1}>
              {heading}
            </Text>
            <Pressable onPress={save} accessibilityRole="button" hitSlop={8}>
              <Text className="font-sans-bold text-base text-olive-deep">Done</Text>
            </Pressable>
          </View>

          <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 16, flexGrow: 1 }} keyboardShouldPersistTaps="handled">
            {context ? (
              <Text className="mt-4 border-l-[3px] border-olive pl-3 font-serif text-[15px] leading-6 text-muted" numberOfLines={4}>
                {context}
              </Text>
            ) : null}
            {withTitle && (
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder={titleHint}
                placeholderTextColor={c.dim}
                maxLength={120}
                autoFocus={!initialTitle && !initialBody}
                returnKeyType="next"
                onSubmitEditing={() => input.current?.focus()}
                className="mt-4 font-display text-[24px] leading-8 text-ink"
              />
            )}
            <TextInput
              ref={input}
              value={body}
              onChangeText={setBody}
              selection={forced}
              onSelectionChange={(e) => {
                selRef.current = e.nativeEvent.selection;
                if (forced) setForced(undefined);
              }}
              placeholder={bodyHint}
              placeholderTextColor={c.dim}
              multiline
              autoFocus={!withTitle || Boolean(initialTitle)}
              maxLength={5000}
              textAlignVertical="top"
              scrollEnabled={false}
              className="mt-3 flex-1 font-sans text-[17px] leading-7 text-ink"
              style={{ minHeight: 220 }}
            />
          </ScrollView>

          {voice.error && <Text className="px-5 pb-1 font-sans text-sm text-danger">{voice.error}</Text>}
          <View className="flex-row items-center gap-1 border-t border-line px-3 pt-2">
            {voice.available && (
              <Tool label={voice.listening ? "Stop speaking" : "Speak"} onPress={toggleVoice}>
                {voice.listening ? <Light size={24} state="listening" /> : <MicIcon size={20} color={c.ink} />}
              </Tool>
            )}
            <View className="flex-1" />
            {onDelete && (
              <Tool label="Delete" onPress={onDelete}>
                <TrashIcon color={c.muted} />
              </Tool>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Tool({ label, onPress, children }: { label: string; onPress: () => void; children: React.ReactNode }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={4} className="h-11 w-11 items-center justify-center rounded-xl active:bg-line">
      {children}
    </Pressable>
  );
}
