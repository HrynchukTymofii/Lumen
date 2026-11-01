import { useRef, useState, type ComponentRef } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BoldIcon, ListIcon, QuoteIcon, TrashIcon } from "./ui/icons";
import { useColors } from "./ui/theme";

// A tall drawer for writing: Bible notes, intentions and reflections. Optional title, then the body with a small
// formatting bar. Formatting is plain-text markup (**bold**, "• " bullets, "> " quotes) that RichText draws, so
// notes stay readable anywhere they're copied to.

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
  const { height } = useWindowDimensions();
  const c = useColors();
  const [title, setTitle] = useState(initialTitle);
  const [body, setBody] = useState(initialBody);
  // The cursor is tracked, and only set on the input right after a formatting change (a controlled selection
  // makes the cursor jump while typing on Android)
  const selRef = useRef<Selection>({ start: initialBody.length, end: initialBody.length });
  const [forced, setForced] = useState<Selection | undefined>();
  const setSel = (s: Selection) => {
    selRef.current = s;
    setForced(s);
  };
  const input = useRef<ComponentRef<typeof TextInput>>(null);

  // Wraps the selection in ** (or inserts an empty pair to type into)
  const bold = () => {
    const sel = selRef.current;
    const picked = body.slice(sel.start, sel.end);
    const next = `${body.slice(0, sel.start)}**${picked}**${body.slice(sel.end)}`;
    setBody(next);
    const cursor = picked ? sel.end + 4 : sel.start + 2;
    setSel({ start: cursor, end: cursor });
    input.current?.focus();
  };

  // Adds or removes a line prefix on every line the selection touches
  const prefix = (mark: string) => {
    const sel = selRef.current;
    const lineStart = body.lastIndexOf("\n", sel.start - 1) + 1;
    const nextBreak = body.indexOf("\n", sel.end);
    const lineEnd = nextBreak === -1 ? body.length : nextBreak;
    const lines = body.slice(lineStart, lineEnd).split("\n");
    const allMarked = lines.every((l) => l.startsWith(mark));
    const changed = lines.map((l) => (allMarked ? l.slice(mark.length) : l.startsWith(mark) ? l : mark + l)).join("\n");
    const next = body.slice(0, lineStart) + changed + body.slice(lineEnd);
    setBody(next);
    const cursor = lineStart + changed.length;
    setSel({ start: cursor, end: cursor });
    input.current?.focus();
  };

  // A new line inside a list or quote carries the marker on
  const onChangeText = (text: string) => {
    const sel = selRef.current;
    if (text.length === body.length + 1 && text[sel.start] === "\n") {
      const lineStart = body.lastIndexOf("\n", sel.start - 1) + 1;
      const line = body.slice(lineStart, sel.start);
      const mark = line.startsWith("• ") ? "• " : line.startsWith("> ") ? "> " : null;
      if (mark && line.length > mark.length) {
        const next = `${text.slice(0, sel.start + 1)}${mark}${text.slice(sel.start + 1)}`;
        setBody(next);
        const cursor = sel.start + 1 + mark.length;
        setSel({ start: cursor, end: cursor });
        return;
      }
    }
    setBody(text);
  };

  const save = () => onSave({ title, body });

  return (
    <Modal transparent animationType="slide" onRequestClose={save} statusBarTranslucent navigationBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1 justify-end">
        <Pressable onPress={save} className="absolute inset-0 bg-black/40" accessibilityLabel="Save and close" />
        <View className="rounded-t-[28px] bg-card" style={{ height: height - insets.top - 12, paddingBottom: insets.bottom + 8 }}>
          <View className="mt-2.5 h-1 w-10 self-center rounded-full bg-line" />
          <View className="flex-row items-center justify-between px-5 pt-3">
            <Pressable onPress={onClose} accessibilityRole="button" hitSlop={8}>
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
              onChangeText={onChangeText}
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

          <View className="flex-row items-center gap-1 border-t border-line px-3 pt-2">
            <Tool label="Bold" onPress={bold}>
              <BoldIcon color={c.ink} />
            </Tool>
            <Tool label="Bulleted list" onPress={() => prefix("• ")}>
              <ListIcon color={c.ink} />
            </Tool>
            <Tool label="Quote" onPress={() => prefix("> ")}>
              <QuoteIcon color={c.ink} />
            </Tool>
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
