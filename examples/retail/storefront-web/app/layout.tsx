// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Instrument_Sans } from "next/font/google";
import { LanguageProvider, type Lang } from "web-shared";
import "./globals.css";

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ACME",
  description: "ACME 助手陪你逛遍 ACME 商城。",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // The language cookie on the server, so SSR and the client's first render agree.
  const saved = (await cookies()).get("commerce-demo-lang")?.value;
  const initialLang: Lang = saved === "en" ? "en" : "zh";
  return (
    <html lang={initialLang === "en" ? "en" : "zh-CN"} className={instrumentSans.variable}>
      <body>
        <LanguageProvider initialLang={initialLang}>{children}</LanguageProvider>
      </body>
    </html>
  );
}
