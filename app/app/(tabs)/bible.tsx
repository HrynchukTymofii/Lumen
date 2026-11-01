import { View } from "react-native";
import { BibleReader } from "@/components/bible/Reader";
import { Light } from "@/components/Light";
import { useLastRead } from "@/lib/bibleMarks";

// Bible tab (SPEC §10.1): opens straight into the text where reading stopped (Genesis 1 the first time).
// Books, notes and search are in the reader's header.
export default function BibleTab() {
  const last = useLastRead();
  if (last === undefined) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <Light size={56} state="thinking" />
      </View>
    );
  }
  return <BibleReader tab start={last ? { osis: last.osis, chapter: last.chapter } : { osis: "Gen", chapter: 1 }} />;
}
