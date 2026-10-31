import { Suspense } from "react";
import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Admin sign in · Lumen", robots: { index: false } };

export default function AdminLoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center bg-page px-4 py-16 text-ink">
      <div className="w-full max-w-sm rounded-3xl border border-line bg-card p-8">
        <p className="text-xs font-extrabold uppercase tracking-wider text-olive-deep">Lumen admin</p>
        <h1 className="mt-2 font-display text-3xl font-semibold">Sign in</h1>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
