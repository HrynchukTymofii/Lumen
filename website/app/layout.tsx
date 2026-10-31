import type { Metadata } from "next";
import { Geist_Mono, Literata, Manrope, Outfit } from "next/font/google";
import { SITE } from "@/lib/site";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "latin-ext"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin", "latin-ext"],
});

// Bible text and prayers
const literata = Literata({
  variable: "--font-literata",
  subsets: ["latin", "latin-ext"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: `${SITE.name}: daily prayer, made for you`, template: `%s · ${SITE.name}` },
  description:
    "A short daily prayer written for what you're carrying, guided audio prayers, and a companion that answers with real Bible verses.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} ${outfit.variable} ${literata.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
