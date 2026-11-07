import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Light } from "@/components/kit";
import { HttpError } from "@/lib/admin-auth";
import { requirePageUser } from "@/lib/auth/current";
import { getPremium } from "@/lib/entitlement";
import { freeAudioLeft, ownPrayer, prayerDetail } from "@/lib/prayers/personal";
import type { PersonalPrayer } from "../prayers-api";
import { PrayerView } from "./prayer-view";

export const metadata: Metadata = { title: "My prayer" };

export default function PersonalPrayerPage(props: PageProps<"/app/prayers/personal/[id]">) {
  return (
    <Suspense fallback={<Light size={56} state="thinking" />}>
      <Loader {...props} />
    </Suspense>
  );
}

async function Loader({ params }: PageProps<"/app/prayers/personal/[id]">) {
  const { id } = await params;
  const user = await requirePageUser(`/app/prayers/personal/${id}`);
  const premium = Boolean(await getPremium(user.id));
  const prayer = await ownPrayer(user.id, id).catch((err) => {
    if (err instanceof HttpError && err.status === 404) notFound();
    throw err;
  });
  const detail = (await prayerDetail(prayer, await freeAudioLeft(user, premium))) as unknown as PersonalPrayer;
  return (
    <>
      <Link href="/app/prayers/personal" className="wa-back">
        ← My prayers
      </Link>
      <PrayerView key={`${detail.id}-${user.prayerTokens}`} initial={detail} premium={premium} tokens={user.prayerTokens} />
    </>
  );
}
