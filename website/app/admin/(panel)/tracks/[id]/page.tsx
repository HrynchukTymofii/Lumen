import { Suspense } from "react";
import { TrackEditor } from "./track-editor";

export default function TrackPage({ params }: PageProps<"/admin/tracks/[id]">) {
  return (
    <Suspense fallback={<p className="text-muted">Loading…</p>}>
      <TrackEditor params={params} />
    </Suspense>
  );
}
