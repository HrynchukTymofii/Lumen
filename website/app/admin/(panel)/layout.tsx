import { Suspense } from "react";
import type { Metadata } from "next";
import { AdminNav } from "./nav";

export const metadata: Metadata = { title: "Admin · Lumen", robots: { index: false } };

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="flex flex-1 flex-col bg-page text-ink">
      <Suspense fallback={<div className="h-[61px] border-b border-line bg-bg" />}>
        <AdminNav />
      </Suspense>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
