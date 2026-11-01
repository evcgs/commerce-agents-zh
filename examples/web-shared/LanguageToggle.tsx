// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0
// Localization layer added by commerce-agents-zh: the top-bar language toggle.

"use client";

import { useLang, switchLang, t } from "./i18n";

/**
 * The language item in the app bar: a two-way pill, Chinese on one side, English on the
 * other. Choosing a language persists it, reloads the backend's catalog and copy, and
 * reloads the page — the running language never changes in place.
 */
export function LanguageToggle() {
  const active = useLang();
  const base =
    "grid h-[26px] min-w-[30px] place-items-center rounded-full px-1.5 text-[12px] font-semibold transition-colors";
  return (
    <div
      role="group"
      aria-label={t("Language", "语言")}
      title={t("Switch language (reloads the demo)", "切换语言（将重载演示）")}
      className="flex items-center gap-0.5 rounded-full border border-(--line) bg-(--well) p-[3px]"
    >
      <button
        type="button"
        onClick={() => active !== "zh" && switchLang("zh")}
        aria-pressed={active === "zh"}
        className={`${base} ${active === "zh" ? "bg-(--surface) text-(--ink) shadow-sm" : "text-(--ink-soft) hover:text-(--ink)"}`}
      >
        中
      </button>
      <button
        type="button"
        onClick={() => active !== "en" && switchLang("en")}
        aria-pressed={active === "en"}
        className={`${base} ${active === "en" ? "bg-(--surface) text-(--ink) shadow-sm" : "text-(--ink-soft) hover:text-(--ink)"}`}
      >
        EN
      </button>
    </div>
  );
}
