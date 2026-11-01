import { useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import { BibleReader } from "@/components/bible/Reader";

// A passage opened from elsewhere (verse chips in the companion, the notes list, search): the same continuous
// reader with a back button. `?v=6-7` tints the verses it points at.
export default function ChapterScreen() {
  const params = useLocalSearchParams<{ book: string; chapter: string; v?: string }>();
  const [from, to] = (params.v ?? "").split("-").map(Number);
  const start = useMemo(() => ({ osis: params.book, chapter: Number(params.chapter) || 1 }), [params.book, params.chapter]);
  return <BibleReader start={start} pointed={from ? { from, to: to || from } : undefined} />;
}
