import { router } from "expo-router";
import { memo, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { FlatList, Pressable, Share, Text, View, type ListViewToken } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Light } from "@/components/Light";
import { NoteDrawer } from "@/components/NoteDrawer";
import { RichText } from "@/components/RichText";
import { LineButton } from "@/components/ui/Button";
import {
  BackIcon,
  BookmarkIcon,
  ChatIcon,
  CheckIcon,
  ChevronDownIcon,
  CloseIcon,
  CopyIcon,
  MenuIcon,
  NoteIcon,
  SearchIcon,
  ShareIcon,
} from "@/components/ui/icons";
import { highlightColor, useColors, type Colors } from "@/components/ui/theme";
import { useAuth } from "@/context/AuthContext";
import { getChapter } from "@/lib/api/bible";
import { createConversation } from "@/lib/api/chat";
import { errorMessage } from "@/lib/api/client";
import type { BibleChapter, Translation } from "@/lib/api/types";
import {
  HIGHLIGHT_COLORS,
  markKey,
  setLastRead,
  toggleBookmark,
  updateMark,
  useBookmarks,
  useMarks,
  type Mark,
} from "@/lib/bibleMarks";
import { reportError } from "@/lib/errorReporting";
import { BookPicker } from "./BookPicker";

// The Bible reader (SPEC §10.1), used by the Bible tab and by /bible/[book]/[chapter]. One long scroll: reaching the
// end of a chapter loads the next one, scrolling above the first loads the one before. The header stays pinned and
// names the chapter on screen ("Genesis 2 ⌄"), which opens the book picker; the bookmark saves that chapter.
// Tapping a verse selects it and opens a sheet: highlight colors, Note (a full drawer), Copy, Share, Ask.

export interface Loc {
  osis: string;
  chapter: number;
}

export function BibleReader({ start, pointed, tab }: { start: Loc; pointed?: { from: number; to: number }; tab?: boolean }) {
  const { user } = useAuth();
  const translation: Translation = user?.translation ?? "WEB";
  const insets = useSafeAreaInsets();
  const c = useColors();
  const marks = useMarks();
  const bookmarks = useBookmarks();
  const list = useRef<FlatList<BibleChapter>>(null);

  const [origin, setOrigin] = useState<Loc>(start);
  // A new starting point from the parent (the route's params, the tab's last-read place) starts a fresh scroll
  const [prevStart, setPrevStart] = useState<Loc>(start);
  if (prevStart.osis !== start.osis || prevStart.chapter !== start.chapter) {
    setPrevStart(start);
    setOrigin(start);
  }
  // The loaded chapters belong to one starting point and translation; a new one shows the spinner until it loads
  const originKey = `${translation}:${origin.osis}.${origin.chapter}`;
  const [loaded, setLoaded] = useState<{ key: string; chapters: BibleChapter[]; error: string | null }>({ key: "", chapters: [], error: null });
  const chapters = loaded.key === originKey ? loaded.chapters : [];
  const error = loaded.key === originKey ? loaded.error : null;
  const setChapters = (change: (all: BibleChapter[]) => BibleChapter[]) =>
    setLoaded((l) => (l.key === originKey ? { ...l, chapters: change(l.chapters) } : l));
  const [currentRaw, setCurrent] = useState<BibleChapter | null>(null);
  const current = currentRaw && chapters.includes(currentRaw) ? currentRaw : (chapters[0] ?? null);
  const [picking, setPicking] = useState(false);
  const [selected, setSelectedRaw] = useState<{ osis: string; chapter: number; v: number } | null>(null);
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [asking, setAsking] = useState(false);
  const busy = useRef({ prev: false, next: false });

  const setSelected = (s: typeof selected) => {
    setSelectedRaw(s);
    setCopied(false);
  };
  // Tapping the selected verse again deselects it
  const toggleVerse = useCallback((osis: string, chapter: number, v: number) => {
    setSelectedRaw((s) => (s && s.osis === osis && s.chapter === chapter && s.v === v ? null : { osis, chapter, v }));
    setCopied(false);
  }, []);

  // State is only set in the promise callbacks, after the request
  const loadOrigin = useCallback(() => {
    busy.current = { prev: false, next: false };
    return getChapter(translation, origin.osis, origin.chapter).then(
      (ch) => {
        setLoaded({ key: `${translation}:${origin.osis}.${origin.chapter}`, chapters: [ch], error: null });
        setCurrent(ch);
        setSelectedRaw(null);
      },
      (err) => setLoaded({ key: `${translation}:${origin.osis}.${origin.chapter}`, chapters: [], error: errorMessage(err) }),
    );
  }, [translation, origin]);

  useEffect(() => {
    loadOrigin();
  }, [loadOrigin]);

  useEffect(() => {
    if (current) setLastRead({ osis: current.book.osis, book: current.book.name, chapter: current.chapter });
  }, [current]);

  const loadNext = () => {
    const last = chapters[chapters.length - 1];
    if (!last?.next || busy.current.next) return;
    busy.current.next = true;
    getChapter(translation, last.next.osis, last.next.chapter)
      .then((ch) => setChapters((all) => (all.some((x) => x.book.osis === ch.book.osis && x.chapter === ch.chapter) ? all : [...all, ch])))
      .catch(reportError)
      .finally(() => (busy.current.next = false));
  };

  const loadPrev = () => {
    const first = chapters[0];
    if (!first?.prev || busy.current.prev) return;
    busy.current.prev = true;
    getChapter(translation, first.prev.osis, first.prev.chapter)
      .then((ch) => setChapters((all) => (all.some((x) => x.book.osis === ch.book.osis && x.chapter === ch.chapter) ? all : [ch, ...all])))
      .catch(reportError)
      .finally(() => (busy.current.prev = false));
  };

  // The header names the topmost chapter on screen
  const onViewable = useCallback(({ viewableItems }: { viewableItems: ListViewToken[] }) => {
    const top = viewableItems.filter((v) => v.isViewable).sort((a, b) => (a.index ?? 0) - (b.index ?? 0))[0];
    const item = top?.item as BibleChapter | undefined;
    if (item) setCurrent((prev) => (prev && prev.book.osis === item.book.osis && prev.chapter === item.chapter ? prev : item));
  }, []);

  const selectedChapter = selected ? chapters.find((ch) => ch.book.osis === selected.osis && ch.chapter === selected.chapter) : undefined;
  const verse = selectedChapter?.verses.find((v) => v.v === selected?.v);
  const mark = selected ? marks[markKey(selected.osis, selected.chapter, selected.v)] : undefined;
  const ref = selectedChapter && verse ? `${selectedChapter.book.name} ${selectedChapter.chapter}:${verse.v}` : "";
  const verseInfo =
    selectedChapter && verse
      ? { osis: selectedChapter.book.osis, book: selectedChapter.book.name, chapter: selectedChapter.chapter, v: verse.v, text: verse.text, translation }
      : null;
  const quoted = verse ? `“${verse.text.trim()}” ${ref} (${translation})` : "";

  async function copy() {
    try {
      // Loaded on demand: a build made before expo-clipboard was added falls back to the share sheet
      const Clipboard = await import("expo-clipboard");
      await Clipboard.setStringAsync(quoted);
      setCopied(true);
    } catch {
      Share.share({ message: quoted }).catch(reportError);
    }
  }

  async function ask() {
    setAsking(true);
    try {
      const id = await createConversation();
      setSelected(null);
      router.push({ pathname: "/companion/[id]", params: { id, prompt: `Help me understand ${ref}: ${quoted}`, send: "1" } });
    } catch (err) {
      reportError(err);
    } finally {
      setAsking(false);
    }
  }

  const bookmarked = current ? bookmarks.some((b) => b.osis === current.book.osis && b.chapter === current.chapter) : false;
  const title = current ? `${current.book.name} ${current.chapter}` : "";

  return (
    <View className="flex-1 bg-bg">
      {/* Pinned header */}
      <View className="bg-bg px-5 pb-2" style={{ paddingTop: insets.top + (tab ? 12 : 8) }}>
        {tab ? (
          <View className="flex-row items-center justify-between">
            <Text className="font-display text-[30px] leading-9 text-ink">Bible</Text>
            <View className="flex-row gap-2.5">
              <RoundButton label="Search" onPress={() => router.push("/search")}>
                <SearchIcon size={20} color={c.ink} />
              </RoundButton>
              <RoundButton label="Notes, highlights and bookmarks" onPress={() => router.push("/bible/notes")}>
                <MenuIcon size={20} color={c.ink} />
              </RoundButton>
            </View>
          </View>
        ) : null}
        <View className={`flex-row items-center ${tab ? "mt-3" : ""}`}>
          {!tab && (
            <View className="mr-3">
              <RoundButton label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace("/bible"))}>
                <BackIcon size={18} color={c.ink} />
              </RoundButton>
            </View>
          )}
          <Pressable
            onPress={() => setPicking(true)}
            accessibilityRole="button"
            accessibilityLabel={`${title}, choose a book and chapter`}
            hitSlop={6}
            className="flex-1 flex-row items-center gap-1.5 active:opacity-70"
          >
            <Text className="font-sans-bold text-[20px] text-ink" numberOfLines={1}>
              {title || " "}
            </Text>
            {current && <ChevronDownIcon size={18} color={c.ink} />}
          </Pressable>
          {current && (
            <Pressable
              onPress={() => toggleBookmark({ osis: current.book.osis, book: current.book.name, chapter: current.chapter })}
              accessibilityRole="button"
              accessibilityLabel={bookmarked ? "Remove bookmark" : "Bookmark this chapter"}
              accessibilityState={{ selected: bookmarked }}
              hitSlop={10}
              className="active:opacity-70"
            >
              <BookmarkIcon size={24} color={bookmarked ? c.oliveDeep : c.ink} filled={bookmarked} />
            </Pressable>
          )}
        </View>
      </View>

      {!chapters.length ? (
        error ? (
          <View className="mx-5 mt-4 gap-3">
            <Text className="font-sans text-base text-muted">{error}</Text>
            <LineButton label="Try again" onPress={loadOrigin} />
          </View>
        ) : (
          <View className="mt-16 items-center">
            <Light size={56} state="thinking" />
          </View>
        )
      ) : (
        <FlatList
          ref={list}
          data={chapters}
          keyExtractor={(ch) => `${ch.book.osis}.${ch.chapter}`}
          renderItem={({ item }) => (
            <ChapterBlock
              chapter={item}
              marks={marks}
              colors={c}
              selectedV={selected && selected.osis === item.book.osis && selected.chapter === item.chapter ? selected.v : null}
              pointed={item.book.osis === origin.osis && item.chapter === origin.chapter ? pointed : undefined}
              onVerse={toggleVerse}
            />
          )}
          onEndReached={loadNext}
          onEndReachedThreshold={1.5}
          onStartReached={loadPrev}
          onStartReachedThreshold={0.5}
          // Prepending the previous chapter keeps the text on screen where it is
          maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
          onViewableItemsChanged={onViewable}
          viewabilityConfig={{ itemVisiblePercentThreshold: 1, minimumViewTime: 50 }}
          contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: insets.bottom + (selected ? 260 : 40) }}
          ListFooterComponent={
            chapters[chapters.length - 1]?.next ? (
              <View className="items-center py-8">
                <Light size={36} state="thinking" />
              </View>
            ) : (
              <Text className="py-10 text-center font-sans text-sm text-muted">The end</Text>
            )
          }
          windowSize={7}
          initialNumToRender={1}
        />
      )}

      {verseInfo && (
        <View
          className="absolute bottom-0 left-0 right-0 rounded-t-[28px] bg-card px-6 pt-3"
          style={{ paddingBottom: insets.bottom + 16, shadowColor: "#000", shadowOpacity: 0.14, shadowRadius: 18, elevation: 14 }}
        >
          <View className="mb-3 h-1 w-10 self-center rounded-full bg-line" />
          <View className="flex-row items-center">
            <View className="w-10" />
            <Text className="flex-1 text-center font-sans-bold text-lg text-ink">{ref}</Text>
            <Pressable onPress={() => setSelected(null)} accessibilityRole="button" accessibilityLabel="Close" hitSlop={8} className="h-10 w-10 items-center justify-center rounded-full bg-bg">
              <CloseIcon size={16} color={c.ink} />
            </Pressable>
          </View>

          {/* Highlight colors: tap one to highlight, tap it again to remove */}
          <View className="mt-4 flex-row items-center justify-center gap-4">
            {HIGHLIGHT_COLORS.map((color) => {
              const on = Boolean(mark?.highlight) && (mark?.color ?? "yellow") === color;
              return (
                <Pressable
                  key={color}
                  onPress={() => updateMark(verseInfo, on ? { highlight: false } : { highlight: true, color })}
                  accessibilityRole="button"
                  accessibilityLabel={on ? `Remove ${color} highlight` : `Highlight ${color}`}
                  accessibilityState={{ selected: on }}
                  className="h-11 w-11 items-center justify-center rounded-full"
                  style={{ backgroundColor: highlightColor(c, color), borderWidth: on ? 2.5 : 0, borderColor: c.ink }}
                >
                  {on && <CheckIcon size={16} color={c.onPastel} />}
                </Pressable>
              );
            })}
          </View>

          {mark?.note ? (
            <Pressable onPress={() => setEditing(true)} accessibilityRole="button" className="mt-4 rounded-2xl bg-bg px-4 py-3">
              <RichText text={mark.note} lines={3} />
            </Pressable>
          ) : null}

          <View className="mt-4 flex-row justify-center gap-4">
            <Action label={mark?.note ? "Edit note" : "Note"} onPress={() => setEditing(true)}>
              <NoteIcon color={c.ink} />
            </Action>
            <Action label={copied ? "Copied" : "Copy"} onPress={copy}>
              {copied ? <CheckIcon size={22} color={c.oliveDeep} /> : <CopyIcon color={c.ink} />}
            </Action>
            <Action label="Share" onPress={() => Share.share({ message: quoted }).catch(reportError)}>
              <ShareIcon color={c.ink} />
            </Action>
            {user?.aiEnabled && (
              <Action label={asking ? "Opening…" : "Ask"} onPress={ask}>
                <ChatIcon color={c.ink} />
              </Action>
            )}
          </View>
        </View>
      )}

      {verseInfo && editing && (
        <NoteDrawer
          heading={ref}
          context={verseInfo.text}
          bodyHint="What is this verse saying to you?"
          initialBody={mark?.note ?? ""}
          onClose={() => setEditing(false)}
          onSave={({ body }) => {
            updateMark(verseInfo, { note: body });
            setEditing(false);
          }}
          onDelete={
            mark?.note
              ? () => {
                  updateMark(verseInfo, { note: "" });
                  setEditing(false);
                }
              : undefined
          }
        />
      )}

      {picking && (
        <BookPicker
          translation={translation}
          current={current ? { osis: current.book.osis, chapter: current.chapter } : undefined}
          onClose={() => setPicking(false)}
          onPick={(osis, chapter) => {
            setPicking(false);
            setOrigin({ osis, chapter });
          }}
        />
      )}
    </View>
  );
}

// One chapter: its title, then the verses as one flowing paragraph with quiet numbers
const ChapterBlock = memo(function ChapterBlock({
  chapter,
  marks,
  colors: c,
  selectedV,
  pointed,
  onVerse,
}: {
  chapter: BibleChapter;
  marks: Record<string, Mark>;
  colors: Colors;
  selectedV: number | null;
  pointed?: { from: number; to: number };
  onVerse: (osis: string, chapter: number, v: number) => void;
}) {
  return (
    <View className="pb-6 pt-4">
      <Text className="font-display text-[30px] leading-10 text-ink">
        {chapter.book.name} {chapter.chapter}
      </Text>
      <Text className="mb-4 font-sans text-xs uppercase tracking-[1.5px] text-muted">{chapter.translation}</Text>
      <Text className="font-serif text-[19px] leading-[34px] text-ink">
        {chapter.verses.map((v) => {
          const m = marks[markKey(chapter.book.osis, chapter.chapter, v.v)];
          const isSelected = selectedV === v.v;
          const isPointed = Boolean(pointed) && v.v >= pointed!.from && v.v <= pointed!.to;
          const tint = m?.highlight ? highlightColor(c, m.color) : isPointed ? c.butter : null;
          return (
            <Text
              key={v.v}
              onPress={() => onVerse(chapter.book.osis, chapter.chapter, v.v)}
              suppressHighlighting
              // Plain styles, not classes: nested Text spans on Android only reliably take these.
              // Android also draws no dotted underlines, so a selected verse gets a tint as well.
              style={[
                tint ? { backgroundColor: tint, color: c.onPastel } : null,
                isSelected && {
                  backgroundColor: tint ?? c.select,
                  textDecorationLine: "underline",
                  textDecorationStyle: "dotted",
                  textDecorationColor: c.oliveDeep,
                },
              ]}
            >
              <Text className="font-sans text-[11px]" style={{ color: tint ? c.onPastel : c.dim }}>
                {v.v}
                {" "}
              </Text>
              {v.text}
              {m?.note ? (
                <View style={{ paddingLeft: 4, transform: [{ translateY: 2 }] }}>
                  <NoteIcon size={14} color={c.oliveDeep} />
                </View>
              ) : null}{" "}
            </Text>
          );
        })}
      </Text>
    </View>
  );
});

function RoundButton({ label, onPress, children }: { label: string; onPress: () => void; children: ReactNode }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={6} className="h-11 w-11 items-center justify-center rounded-full bg-card active:opacity-70">
      {children}
    </Pressable>
  );
}

function Action({ label, onPress, children }: { label: string; onPress: () => void; children: ReactNode }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} className="w-16 items-center gap-1.5 active:opacity-70">
      <View className="h-14 w-14 items-center justify-center rounded-full bg-bg">{children}</View>
      <Text className="font-sans-bold text-xs text-ink" numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}
