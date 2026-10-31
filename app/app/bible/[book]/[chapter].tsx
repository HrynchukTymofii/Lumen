import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState, type ComponentRef } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Light } from "@/components/Light";
import { ScreenHeader } from "@/components/ScreenHeader";
import { LineButton } from "@/components/ui/Button";
import { ArrowIcon, BackIcon } from "@/components/ui/icons";
import { useColors } from "@/components/ui/theme";
import { useAuth } from "@/context/AuthContext";
import { getChapter } from "@/lib/api/bible";
import { errorMessage } from "@/lib/api/client";
import type { BibleChapter } from "@/lib/api/types";

// Chapter reader (SPEC §10.1): the chapter in the reader's translation, verse numbers inline, previous / next
// chapter across books. `?v=6-7` highlights verses (links from verse chips).

export default function ChapterScreen() {
  const params = useLocalSearchParams<{ book: string; chapter: string; v?: string }>();
  const { user } = useAuth();
  const translation = user?.translation ?? "WEB";
  const insets = useSafeAreaInsets();
  const c = useColors();
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const [data, setData] = useState<BibleChapter | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [from, to] = (params.v ?? "").split("-").map(Number);
  const highlighted = (v: number) => Boolean(from) && v >= from && v <= (to || from);

  // State is only set in the promise callbacks, after the request
  const load = useCallback(
    () =>
      getChapter(translation, params.book, Number(params.chapter)).then(
        (chapter) => {
          setData(chapter);
          setError(null);
          scroll.current?.scrollTo({ y: 0, animated: false });
        },
        (err) => setError(errorMessage(err)),
      ),
    [translation, params.book, params.chapter],
  );

  useEffect(() => {
    load();
  }, [load]);

  // Prev / next replace this screen, so Back still returns to the book list
  const go = (to: { osis: string; chapter: number }) =>
    router.replace({ pathname: "/bible/[book]/[chapter]", params: { book: to.osis, chapter: String(to.chapter) } });

  return (
    <View className="flex-1 bg-bg">
      <ScreenHeader title={data ? `${data.book.name} ${data.chapter}` : ""} fallback="/bible" />
      <ScrollView ref={scroll} contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: insets.bottom + 32 }}>
        {!data ? (
          error ? (
            <View className="mt-4 gap-3">
              <Text className="font-sans text-base text-muted">{error}</Text>
              <LineButton label="Try again" onPress={load} />
            </View>
          ) : (
            <View className="mt-10 items-center">
              <Light size={56} state="thinking" />
            </View>
          )
        ) : (
          <>
            <Text className="mt-2 font-display text-[34px] leading-10 text-ink">
              {data.book.name} {data.chapter}
            </Text>
            <Text className="mb-5 font-sans text-sm text-muted">{data.translation}</Text>
            <Text className="font-serif text-[18px] leading-[32px] text-ink">
              {data.verses.map((verse) => (
                <Text key={verse.v} className={highlighted(verse.v) ? "bg-butter text-on-pastel" : undefined}>
                  <Text className="font-sans-bold text-[12px] text-olive-deep">{verse.v} </Text>
                  {verse.text}{" "}
                </Text>
              ))}
            </Text>

            <View className="mt-10 flex-row gap-3">
              {data.prev && (
                <Pressable
                  onPress={() => go(data.prev!)}
                  accessibilityRole="button"
                  className="h-12 flex-1 flex-row items-center justify-center gap-2 rounded-full border-[1.5px] border-line2 active:opacity-70"
                >
                  <BackIcon size={16} color={c.ink} />
                  <Text className="font-sans-bold text-sm text-ink">Previous</Text>
                </Pressable>
              )}
              {data.next && (
                <Pressable
                  onPress={() => go(data.next!)}
                  accessibilityRole="button"
                  className="h-12 flex-1 flex-row items-center justify-center gap-2 rounded-full bg-ink active:opacity-80"
                >
                  <Text className="font-sans-bold text-sm text-bg">Next</Text>
                  <ArrowIcon size={16} color={c.bg} />
                </Pressable>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
