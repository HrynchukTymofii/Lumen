import { Suspense } from "react";
import { PathEditor } from "./path-editor";

export default function PathPage({ params }: PageProps<"/admin/paths/[id]">) {
  return (
    <Suspense fallback={<p className="text-muted">Loading…</p>}>
      <PathEditor params={params} />
    </Suspense>
  );
}
