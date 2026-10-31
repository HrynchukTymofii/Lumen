import { Suspense } from "react";
import { TrackList } from "./track-list";

export default function TracksPage() {
  return (
    <Suspense>
      <TrackList />
    </Suspense>
  );
}
