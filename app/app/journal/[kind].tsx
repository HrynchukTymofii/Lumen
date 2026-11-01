import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Light } from "@/components/Light";
import { NoteDrawer } from "@/components/NoteDrawer";
import { RichText } from "@/components/RichText";
import { ScreenHeader } from "@/components/ScreenHeader";
import { PlusIcon } from "@/components/ui/icons";
import { useColors } from "@/components/ui/theme";
import { deleteEntry, JOURNAL_LABELS, saveEntry, useJournal, type JournalEntry, type JournalKind } from "@/lib/journal";

// Intentions or Reflections: every entry, newest edit first, each opening in the note drawer.
// ?new=1 opens a blank one straight away; ?edit=<id> opens that entry.
export default function JournalScreen() {
  const params = useLocalSearchParams<{ kind: string; new?: string; edit?: string }>();
  const kind: JournalKind = params.kind === "reflection" ? "reflection" : "intention";
  const labels = JOURNAL_LABELS[kind];
  const insets = useSafeAreaInsets();
  const c = useColors();
  const entries = useJournal(kind);
  // null: drawer closed; "new": a blank entry; an entry: editing it; undefined: whatever ?edit= points at
  // (derived, since it may arrive before the saved entries have been read)
  const [chosen, setOpen] = useState<JournalEntry | "new" | null | undefined>(params.new === "1" ? "new" : undefined);
  const open = chosen === undefined ? (entries.find((e) => e.id === params.edit) ?? null) : chosen;

  const editing = open && open !== "new" ? open : null;

  return (
    <View className="flex-1 bg-bg">
      <ScreenHeader
        title={labels.plural}
        fallback="/me"
        right={
          <Pressable
            onPress={() => setOpen("new")}
            accessibilityRole="button"
            accessibilityLabel={`Add ${labels.single.toLowerCase()}`}
            hitSlop={8}
            className="h-10 w-10 items-center justify-center rounded-full bg-card active:opacity-70"
          >
            <PlusIcon size={18} color={c.ink} />
          </Pressable>
        }
      />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 32, gap: 12 }}>
        {!entries.length && (
          <View className="mt-10 items-center px-6">
            <Light size={64} />
            <Text className="mt-4 text-center font-sans text-base leading-6 text-muted">{labels.empty}</Text>
            <Pressable onPress={() => setOpen("new")} accessibilityRole="button" className="mt-5 flex-row items-center gap-2 rounded-full bg-ink px-5 py-3 active:opacity-80">
              <PlusIcon size={16} color={c.bg} />
              <Text className="font-sans-bold text-base text-bg">Add {labels.single.toLowerCase()}</Text>
            </Pressable>
          </View>
        )}
        {entries.map((e) => (
          <Pressable key={e.id} onPress={() => setOpen(e)} accessibilityRole="button" className="rounded-[24px] bg-card px-5 py-4 active:opacity-80">
            <View className="flex-row items-baseline gap-2">
              <Text className="flex-1 font-sans-bold text-base text-ink" numberOfLines={1}>
                {e.title || labels.single}
              </Text>
              <Text className="font-sans text-xs text-muted">{new Date(e.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</Text>
            </View>
            {e.body ? (
              <View className="mt-1.5">
                <RichText text={e.body} lines={4} className="font-sans text-[15px] leading-6 text-ink/85" />
              </View>
            ) : null}
          </Pressable>
        ))}
      </ScrollView>

      {open && (
        <NoteDrawer
          key={editing?.id ?? "new"}
          heading={editing ? labels.single : `New ${labels.single.toLowerCase()}`}
          withTitle
          titleHint={labels.titleHint}
          bodyHint={labels.bodyHint}
          initialTitle={editing?.title}
          initialBody={editing?.body}
          onClose={() => setOpen(null)}
          onSave={({ title, body }) => {
            saveEntry({ id: editing?.id, kind, title, body });
            setOpen(null);
          }}
          onDelete={
            editing
              ? () => {
                  deleteEntry(editing.id);
                  setOpen(null);
                }
              : undefined
          }
        />
      )}
    </View>
  );
}
