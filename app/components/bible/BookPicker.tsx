import { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Light } from "@/components/Light";
import { LineButton } from "@/components/ui/Button";
import { CloseIcon, ShelfIcon } from "@/components/ui/icons";
import { useColors } from "@/components/ui/theme";
import { getBooks } from "@/lib/api/bible";
import { errorMessage } from "@/lib/api/client";
import type { BibleBook, Translation } from "@/lib/api/types";

// Book and chapter picker, opened from the reader's "Genesis 2 ⌄" title. Books by testament; tapping one shows
// its chapters; the book being read starts open. The shelf button next to the title lists just the book names, so a
// book far down (Revelation) is one tap away; picking one shows only that book and its chapters.

const SECTIONS: { key: BibleBook["testament"]; title: string }[] = [
  { key: "OT", title: "Old Testament" },
  { key: "DC", title: "Deuterocanonical" },
  { key: "NT", title: "New Testament" },
];

export function BookPicker({
  translation,
  current,
  onPick,
  onClose,
}: {
  translation: Translation;
  current?: { osis: string; chapter: number };
  onPick: (osis: string, chapter: number) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const c = useColors();
  const [books, setBooks] = useState<BibleBook[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(current?.osis ?? null);
  const [shelf, setShelf] = useState(false); // the names-only list
  const [only, setOnly] = useState<string | null>(null); // the one book shown, when picked from the shelf

  const load = () =>
    getBooks(translation).then(
      (list) => {
        setBooks(list);
        setError(null);
      },
      (err) => setError(errorMessage(err)),
    );

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [translation]);

  const sections = useMemo(
    () =>
      SECTIONS.map((s) => ({
        ...s,
        books: (books ?? []).filter(
          (b) => b.testament === s.key && (!only || b.osis === only),
        ),
      })),
    [books, only],
  );

  const pickBook = (osis: string) => {
    setOnly(osis);
    setOpen(osis);
    setShelf(false);
  };

  return (
    // iOS shows a page sheet that already starts below the status bar. Android has no page sheet and opens it full
    // screen, so there it draws behind the status bar on purpose and moves the content down by the bar's height.
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="pageSheet"
      statusBarTranslucent={Platform.OS === "android"}
      navigationBarTranslucent={Platform.OS === "android"}
    >
      <View
        className="flex-1 bg-bg"
        style={{ paddingTop: Platform.OS === "android" ? insets.top + 8 : 12 }}
      >
        <View className="flex-row items-center justify-between px-5 pb-3 pt-2">
          <View className="flex-row items-center gap-3">
            <Text className="font-display text-[26px] leading-8 text-ink">
              Books
            </Text>
            <Pressable
              onPress={() => setShelf(!shelf)}
              accessibilityRole="button"
              accessibilityLabel="Choose a book"
              accessibilityState={{ expanded: shelf }}
              hitSlop={8}
              className={`h-10 w-10 items-center justify-center rounded-full ${shelf ? "bg-ink" : "bg-card"}`}
            >
              <ShelfIcon size={20} color={shelf ? c.bg : c.ink} />
            </Pressable>
          </View>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close"
            hitSlop={8}
            className="h-10 w-10 items-center justify-center rounded-full bg-card"
          >
            <CloseIcon size={16} color={c.ink} />
          </Pressable>
        </View>
        <ScrollView
          contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        >
          {!books ? (
            error ? (
              <View className="mx-4 gap-3 rounded-[24px] bg-card p-6">
                <Text className="font-sans text-base text-muted">{error}</Text>
                <LineButton label="Try again" onPress={load} />
              </View>
            ) : (
              <View className="mt-10 items-center">
                <Light size={56} state="thinking" />
              </View>
            )
          ) : shelf ? (
            SECTIONS.map((section) => {
              const list = books.filter((b) => b.testament === section.key);
              if (!list.length) return null;
              return (
                <View key={section.key} className="mx-4 mt-4">
                  <Text className="mb-2 px-1 font-sans-bold text-xs uppercase tracking-[2px] text-muted">
                    {section.title}
                  </Text>
                  <View className="flex-row flex-wrap gap-2">
                    {list.map((b) => {
                      const on = b.osis === (only ?? current?.osis);
                      return (
                        <Pressable
                          key={b.id}
                          onPress={() => pickBook(b.osis)}
                          accessibilityRole="button"
                          className={`rounded-full px-4 py-2.5 active:opacity-70 ${on ? "bg-ink" : "bg-card"}`}
                        >
                          <Text
                            className={`font-sans-bold text-sm ${on ? "text-bg" : "text-ink"}`}
                          >
                            {b.name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              );
            })
          ) : (
            <>
              {sections
                .filter((s) => s.books.length)
                .map((section) => (
                  <View key={section.key} className="mx-4 mt-4">
                    <Text className="mb-2 px-1 font-sans-bold text-xs uppercase tracking-[2px] text-muted">
                      {section.title}
                    </Text>
                    <View className="overflow-hidden rounded-[24px] bg-card">
                      {section.books.map((b, i) => (
                        <View
                          key={b.id}
                          className={i > 0 ? "border-t border-line" : ""}
                        >
                          <Pressable
                            onPress={() =>
                              setOpen(open === b.osis ? null : b.osis)
                            }
                            accessibilityRole="button"
                            accessibilityState={{ expanded: open === b.osis }}
                            className="flex-row items-center px-5 py-3.5 active:opacity-70"
                          >
                            <Text
                              className={`flex-1 font-sans-bold text-base ${b.osis === current?.osis ? "text-olive-deep" : "text-ink"}`}
                            >
                              {b.name}
                            </Text>
                            <Text className="font-sans text-sm text-muted">
                              {b.chapters}
                            </Text>
                          </Pressable>
                          {open === b.osis && (
                            <View className="flex-row flex-wrap gap-2 px-4 pb-4">
                              {Array.from(
                                { length: b.chapters },
                                (_, n) => n + 1,
                              ).map((n) => {
                                const here =
                                  b.osis === current?.osis &&
                                  n === current.chapter;
                                return (
                                  <Pressable
                                    key={n}
                                    onPress={() => onPick(b.osis, n)}
                                    accessibilityRole="button"
                                    accessibilityLabel={`${b.name} ${n}`}
                                    className={`h-11 w-11 items-center justify-center rounded-xl active:opacity-70 ${here ? "bg-ink" : "bg-bg"}`}
                                  >
                                    <Text
                                      className={`font-sans-bold text-sm ${here ? "text-bg" : "text-ink"}`}
                                    >
                                      {n}
                                    </Text>
                                  </Pressable>
                                );
                              })}
                            </View>
                          )}
                        </View>
                      ))}
                    </View>
                  </View>
                ))}
              {only && (
                <View className="mx-4 mt-4">
                  <LineButton label="All books" onPress={() => setOnly(null)} />
                </View>
              )}
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}
