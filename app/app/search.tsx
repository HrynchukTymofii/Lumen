import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TrackRow } from "@/components/TrackCard";
import { BackIcon, BookIcon, ChatIcon, ChevronIcon, CloseIcon, SearchIcon } from "@/components/ui/icons";
import { useColors } from "@/components/ui/theme";
import { useAuth } from "@/context/AuthContext";
import { getBooks } from "@/lib/api/bible";
import { createConversation } from "@/lib/api/chat";
import { cachedLibrary, getLibrary } from "@/lib/api/library";
import type { BibleBook, Library } from "@/lib/api/types";
import { reportError } from "@/lib/errorReporting";
import { categoryTitle } from "@/lib/play";

// Search, from Home, Discover and the Bible: prayers (title, subtitle, tags, category), Bible books ("john 3"
// opens John 3), and "Ask the companion" with whatever was typed. Empty, it suggests popular searches.

const POPULAR = ["Morning", "Peace", "Sleep", "Psalms", "Grief", "Family", "Anxiety", "Gratitude"];

function norm(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}

export default function SearchScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const c = useColors();
  const [q, setQ] = useState("");
  const [library, setLibrary] = useState<Library | null>(cachedLibrary);
  const [books, setBooks] = useState<BibleBook[]>([]);

  useEffect(() => {
    if (!library) getLibrary().then(setLibrary, reportError);
    getBooks(user?.translation ?? "WEB").then(setBooks, reportError);
  }, [library, user?.translation]);

  const query = norm(q);
  const prayers = useMemo(() => {
    if (!query) return [];
    return (library?.tracks ?? []).filter((t) =>
      [t.title, t.subtitle ?? "", t.category, categoryTitle(t.category), ...t.tags, ...t.scriptureRefs].some((f) => norm(f).includes(query)),
    );
  }, [library, query]);

  // "john", "1 john 3", "ps 23": a book and maybe a chapter
  const passages = useMemo(() => {
    if (!query) return [];
    const m = /^(.*?)\s*(\d+)?$/.exec(query);
    const name = m?.[1] ?? query;
    const chapter = m?.[2] ? Number(m[2]) : undefined;
    if (!name) return [];
    return books
      .filter((b) => norm(b.name).startsWith(name) || norm(b.osis) === name.replace(/\s/g, ""))
      .slice(0, 4)
      .map((b) => ({ book: b, chapter: chapter && chapter <= b.chapters ? chapter : 1 }));
  }, [books, query]);

  const ask = async () => {
    try {
      const id = await createConversation();
      router.push({ pathname: "/companion/[id]", params: { id, prompt: q.trim(), send: "1" } });
    } catch (err) {
      reportError(err);
    }
  };

  return (
    <View className="flex-1 bg-bg" style={{ paddingTop: insets.top + 8 }}>
      <View className="flex-row items-center gap-3 px-4 pb-3">
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/discover"))}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={8}
          className="h-12 w-12 items-center justify-center rounded-full bg-card active:opacity-70"
        >
          <BackIcon color={c.ink} />
        </Pressable>
        <View className="h-12 flex-1 flex-row items-center gap-2 rounded-full bg-card pl-4 pr-2">
          <SearchIcon size={18} color={c.muted} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Prayers, topics, Bible books…"
            placeholderTextColor={c.dim}
            autoFocus
            returnKeyType="search"
            autoCorrect={false}
            className="flex-1 font-sans text-base text-ink"
          />
          {q ? (
            <Pressable onPress={() => setQ("")} accessibilityRole="button" accessibilityLabel="Clear" hitSlop={8} className="h-8 w-8 items-center justify-center">
              <CloseIcon size={15} color={c.muted} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
        {!query ? (
          <View className="px-5">
            <Text className="mb-1 mt-3 font-sans-bold text-lg text-ink">Popular searches</Text>
            {POPULAR.map((p) => (
              <Pressable key={p} onPress={() => setQ(p)} accessibilityRole="button" className="flex-row items-center border-b border-line py-4 active:opacity-70">
                <Text className="flex-1 font-sans text-[17px] text-ink">{p}</Text>
                <ChevronIcon color={c.ink} />
              </Pressable>
            ))}
          </View>
        ) : (
          <>
            {passages.length > 0 && (
              <View className="px-5">
                <Text className="mb-1 mt-2 font-sans-bold text-xs uppercase tracking-[2px] text-muted">Bible</Text>
                {passages.map(({ book, chapter }) => (
                  <Pressable
                    key={book.osis}
                    onPress={() => router.push({ pathname: "/bible/[book]/[chapter]", params: { book: book.osis, chapter: String(chapter) } })}
                    accessibilityRole="button"
                    className="flex-row items-center gap-3 border-b border-line py-3.5 active:opacity-70"
                  >
                    <BookIcon size={18} color={c.oliveDeep} />
                    <Text className="flex-1 font-sans-bold text-base text-ink">
                      {book.name} {chapter}
                    </Text>
                    <ChevronIcon color={c.muted} />
                  </Pressable>
                ))}
              </View>
            )}

            <View className="mt-4 px-5">
              <Text className="mb-1 font-sans-bold text-xs uppercase tracking-[2px] text-muted">Prayers</Text>
              {prayers.length ? (
                prayers.map((t, i) => <TrackRow key={t.id} track={t} seed={i + 3} />)
              ) : (
                <Text className="py-3 font-sans text-base text-muted">No prayers match “{q.trim()}”.</Text>
              )}
            </View>

            {user?.aiEnabled && (
              <Pressable onPress={ask} accessibilityRole="button" className="mx-4 mt-5 flex-row items-center gap-3 rounded-[22px] bg-lav px-5 py-4 active:opacity-80">
                <ChatIcon size={20} color={c.onPastel} />
                <Text className="flex-1 font-sans-bold text-base text-on-pastel" numberOfLines={2}>
                  Ask the companion: “{q.trim()}”
                </Text>
                <ChevronIcon color={c.onPastel} />
              </Pressable>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}
