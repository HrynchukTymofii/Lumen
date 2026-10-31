import type { Metadata } from "next";
import { Light } from "@/components/kit";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: "Companion" };

// Placeholder until the companion pipeline (SPEC §7) is built.
export default function CompanionPage() {
  return (
    <>
      <h1 className="wa-h1">Companion</h1>
      <div className="wa-card wa-empty wa-sec">
        <Light size={72} state="listening" />
        <p style={{ marginTop: 12 }}>
          Soon you&apos;ll be able to ask {SITE.name} about a passage, talk through what you&apos;re carrying and turn it into a
          prayer. Every verse it mentions will open the real Bible text.
        </p>
      </div>
    </>
  );
}
