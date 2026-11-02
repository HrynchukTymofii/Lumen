import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Light } from "@/components/kit";
import { bookByOsis } from "@/lib/bible/books";
import { LAST_READ_COOKIE } from "./shared";

// Bible tab (SPEC §10.1): opens straight into the text where reading stopped (Genesis 1 the first time).
export default function BibleTab() {
  return (
    <Suspense fallback={<Light size={56} state="thinking" />}>
      <OpenLastRead />
    </Suspense>
  );
}

async function OpenLastRead(): Promise<null> {
  const last = (await cookies()).get(LAST_READ_COOKIE)?.value ?? "";
  const [osis, chapter] = last.split(".");
  const book = osis ? bookByOsis.get(osis.toLowerCase()) : undefined;
  const n = Number(chapter);
  redirect(book && Number.isInteger(n) && n > 0 ? `/app/bible/${book.osis}/${n}` : "/app/bible/Gen/1");
}
