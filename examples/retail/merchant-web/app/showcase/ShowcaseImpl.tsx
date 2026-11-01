// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

"use client";

// The page body, imported with ssr:false from page.tsx: the language lives in a
// cookie the client reads at module load, and rendering client-side keeps every
// module-level bilingual constant and the server's HTML on the same page.

/** Renders lib/showcase-fixtures.ts; no API needed. */

import { useState } from "react";
import GenerativeBlock from "@/components/generative";
import { SHOWCASE } from "@/lib/showcase-fixtures";
import { t } from "web-shared";

const SECTIONS = Object.keys(SHOWCASE) as (keyof typeof SHOWCASE)[];

export default function ShowcasePage() {
  const [prefill, setPrefill] = useState<string | null>(null);
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-(--ink-soft)">
        {t("ACME component showcase (fixture data)", "ACME 组件演示（示例数据）")}
      </p>
      {SECTIONS.map((name) => (
        <section key={name} className="mt-10">
          <h2 className="mb-3 font-mono text-sm text-(--ink-soft)">{name}</h2>
          <div data-component={name}>
            <GenerativeBlock block={{ component: name, payload: SHOWCASE[name] }} status="final" onPrefill={setPrefill} />
          </div>
        </section>
      ))}
      {prefill ? (
        <section className="mt-10 rounded-xl border border-(--line) bg-(--well)/40 p-4">
          <h2 className="text-sm font-semibold text-(--ink)">{t("Composer prefill", "输入框预填内容")}</h2>
          <p className="mt-1 text-[13px] text-(--ink-soft)">{prefill}</p>
        </section>
      ) : null}
    </main>
  );
}
