import { useState } from "react";
import { View } from "react-native";
import { BibleReader } from "@/components/bible/Reader";
import { Light } from "@/components/Light";
import { useLastRead } from "@/lib/bibleMarks";

// Bible tab (SPEC §10.1): opens straight into the text where reading stopped (Genesis 1 the first time).
// Books, notes and search are in the reader's header.
export default function BibleTab() {
  const last = useLastRead();
  // Only where reading starts: the reader saves the chapter on screen as it scrolls, and passing that back in
  // would start a fresh scroll (reload) every time a new chapter comes into view
  const [opened, setOpened] = useState<typeof last>(undefined);
  if (opened === undefined && last !== undefined) setOpened(last);
  if (opened === undefined) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <Light size={56} state="thinking" />
      </View>
    );
  }
  return <BibleReader tab start={opened ? { osis: opened.osis, chapter: opened.chapter } : { osis: "Gen", chapter: 1 }} />;
}
