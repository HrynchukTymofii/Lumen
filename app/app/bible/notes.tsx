import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RichText } from "@/components/RichText";
import { ScreenHeader } from "@/components/ScreenHeader";
import { BookmarkIcon, HighlightIcon, NoteIcon } from "@/components/ui/icons";
import { highlightColor, useColors } from "@/components/ui/theme";
import { toggleBookmark, useBookmarks, useMarks } from "@/lib/bibleMarks";

// Notes, highlights and bookmarks, newest first. Tapping one opens its chapter with the verse pointed out;
// editing and removing happen there, in the verse sheet.

type Filter = "all" | "notes" | "highlights" | "bookmarks";
const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "notes", label: "Notes" },
  { key: "highlights", label: "Highlights" },
  { key: "bookmarks", label: "Bookmarks" },
];

export default function NotesScreen() {
  const insets = useSafeAreaInsets();
  const c = useColors();
  const marks = useMarks();
  const bookmarks = useBookmarks();
  const [filter, setFilter] = useState<Filter>("all");
  const list = useMemo(
    () =>
      Object.values(marks)
        .filter((m) => (filter === "notes" ? Boolean(m.note) : filter === "highlights" ? m.highlight : filter === "all"))
        .sort((a, b) => b.updatedAt - a.updatedAt),
    [marks, filter],
  );
  const showBookmarks = filter === "all" || filter === "bookmarks";

  return (
    <View className="flex-1 bg-bg">
      <ScreenHeader title="Notes & highlights" fallback="/bible" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }} className="mb-3 max-h-12 flex-grow-0">
        {FILTERS.map((f) => {
          const on = f.key === filter;
          return (
            <Pressable
              key={f.key}
              onPress={() => setFilter(f.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              className={`rounded-full border-[1.5px] px-4 py-2 ${on ? "border-ink bg-ink" : "border-line2 bg-card"}`}
            >
              <Text className={`font-sans-bold text-sm ${on ? "text-bg" : "text-ink"}`}>{f.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 32, gap: 12 }}>
        {showBookmarks && bookmarks.length > 0 && (
          <View className="overflow-hidden rounded-[24px] bg-card">
            {bookmarks.map((b, i) => (
              <View key={`${b.osis}.${b.chapter}`} className={`flex-row items-center gap-3 px-5 py-3.5 ${i > 0 ? "border-t border-line" : ""}`}>
                <Pressable
                  onPress={() => router.push({ pathname: "/bible/[book]/[chapter]", params: { book: b.osis, chapter: String(b.chapter) } })}
                  accessibilityRole="button"
                  className="flex-1 flex-row items-center gap-3 active:opacity-70"
                >
                  <BookmarkIcon size={18} color={c.oliveDeep} filled />
                  <Text className="font-sans-bold text-base text-ink">
                    {b.book} {b.chapter}
                  </Text>
                </Pressable>
                <Pressable onPress={() => toggleBookmark(b)} accessibilityRole="button" hitSlop={8}>
                  <Text className="font-sans-bold text-sm text-muted">Remove</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}

        {!list.length && !(showBookmarks && bookmarks.length) && (
          <Text className="mt-6 px-2 text-center font-sans text-base leading-6 text-muted">
            {filter === "bookmarks"
              ? "Tap the bookmark at the top of the reader to save a chapter."
              : "Tap any verse while reading to highlight it or write a note. They’ll be collected here."}
          </Text>
        )}

        {list.map((m) => (
          <Pressable
            key={`${m.osis}.${m.chapter}.${m.v}`}
            onPress={() => router.push({ pathname: "/bible/[book]/[chapter]", params: { book: m.osis, chapter: String(m.chapter), v: String(m.v) } })}
            accessibilityRole="button"
            className="rounded-[24px] bg-card px-5 py-4 active:opacity-80"
          >
            <View className="flex-row items-center gap-2">
              <Text className="flex-1 font-sans-bold text-sm text-olive-deep">
                {m.book} {m.chapter}:{m.v}
              </Text>
              {m.highlight && <HighlightIcon size={16} color={c.muted} />}
              {Boolean(m.note) && <NoteIcon size={16} color={c.muted} />}
            </View>
            <Text
              className="mt-2 self-start font-serif text-[16px] leading-7"
              style={m.highlight ? { backgroundColor: highlightColor(c, m.color), color: c.onPastel } : { color: c.ink }}
              numberOfLines={m.note ? 2 : 4}
            >
              {m.text}
            </Text>
            {Boolean(m.note) && (
              <View className="mt-2">
                <RichText text={m.note} />
              </View>
            )}
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
