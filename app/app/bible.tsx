import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Light } from "@/components/Light";
import { ScreenHeader } from "@/components/ScreenHeader";
import { LineButton } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { getBooks } from "@/lib/api/bible";
import { errorMessage } from "@/lib/api/client";
import type { BibleBook } from "@/lib/api/types";

// Bible (SPEC §10.1): books by testament in the reader's translation (Settings → Bible). Tapping a book opens its
// chapter grid; tapping a chapter opens the reader.

const SECTIONS: { key: BibleBook["testament"]; title: string }[] = [
  { key: "OT", title: "Old Testament" },
  { key: "DC", title: "Deuterocanonical" },
  { key: "NT", title: "New Testament" },
];

export default function BibleBooks() {
  const { user } = useAuth();
  const translation = user?.translation ?? "WEB";
  const insets = useSafeAreaInsets();
  const [books, setBooks] = useState<BibleBook[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  // State is only set in the promise callbacks, after the request
  const load = useCallback(
    () =>
      getBooks(translation).then(
        (list) => {
          setBooks(list);
          setError(null);
        },
        (err) => setError(errorMessage(err)),
      ),
    [translation],
  );

  useEffect(() => {
    load();
  }, [load]);

  const byTestament = useMemo(() => SECTIONS.map((s) => ({ ...s, books: (books ?? []).filter((b) => b.testament === s.key) })), [books]);

  return (
    <View className="flex-1 bg-bg">
      <ScreenHeader title={`Bible · ${translation}`} fallback="/journey" />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
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
        ) : (
          byTestament
            .filter((s) => s.books.length)
            .map((section) => (
              <View key={section.key} className="mx-4 mt-3">
                <Text className="mb-2 px-1 font-sans-bold text-xs uppercase tracking-[2px] text-muted">{section.title}</Text>
                <View className="overflow-hidden rounded-[24px] bg-card">
                  {section.books.map((b, i) => (
                    <View key={b.id} className={i > 0 ? "border-t border-line" : ""}>
                      <Pressable
                        onPress={() => setOpen(open === b.osis ? null : b.osis)}
                        accessibilityRole="button"
                        accessibilityState={{ expanded: open === b.osis }}
                        className="flex-row items-center px-5 py-3.5 active:opacity-70"
                      >
                        <Text className="flex-1 font-sans-bold text-base text-ink">{b.name}</Text>
                        <Text className="font-sans text-sm text-muted">{b.chapters}</Text>
                      </Pressable>
                      {open === b.osis && (
                        <View className="flex-row flex-wrap gap-2 px-4 pb-4">
                          {Array.from({ length: b.chapters }, (_, n) => n + 1).map((n) => (
                            <Pressable
                              key={n}
                              onPress={() => router.push({ pathname: "/bible/[book]/[chapter]", params: { book: b.osis, chapter: String(n) } })}
                              accessibilityRole="button"
                              accessibilityLabel={`${b.name} ${n}`}
                              className="h-11 w-11 items-center justify-center rounded-xl bg-bg active:opacity-70"
                            >
                              <Text className="font-sans-bold text-sm text-ink">{n}</Text>
                            </Pressable>
                          ))}
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              </View>
            ))
        )}
      </ScrollView>
    </View>
  );
}
