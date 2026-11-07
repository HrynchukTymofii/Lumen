import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Light } from "@/components/kit";
import { requirePageUser } from "@/lib/auth/current";
import { getPremium } from "@/lib/entitlement";
import { generatorQuota } from "@/lib/prayers/personal";
import { Generator } from "./generator";

export const metadata: Metadata = { title: "Write my prayer" };

export default function NewPrayerPage() {
  return (
    <Suspense fallback={<Light size={56} state="thinking" />}>
      <NewPrayer />
    </Suspense>
  );
}

async function NewPrayer() {
  const user = await requirePageUser("/app/prayers/personal/new");
  const premium = Boolean(await getPremium(user.id));
  const quota = await generatorQuota(user, premium);
  return (
    <>
      <Link href="/app/prayers/personal" className="wa-back">
        ← My prayers
      </Link>
      <Generator premium={premium} left={Math.max(0, quota.limit - quota.used)} limit={quota.limit} per={quota.per} />
    </>
  );
}
