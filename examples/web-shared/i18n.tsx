// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0
// Localization layer added by commerce-agents-zh: bilingual copy ("English original,
// Chinese translation") so the top-bar language toggle can restore the upstream English
// interface verbatim. The English side of every pair is byte-identical to the upstream
// repository (git fd4d592), never re-translated.

"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "zh" | "en";

const COOKIE_KEY = "commerce-demo-lang";
// The same base the app's own api.ts uses, so the toggle reaches the API process itself.
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/** The active language, module-level so plain `.ts` helpers can call `t()` without a hook. */
let current: Lang = "zh";

// Adopt the saved preference while the modules load (client only): module-level copy
// (error strings, label maps) then evaluates under the right language, and a reload
// after a toggle re-evaluates everything. The server reads the same cookie through the
// layout's `initialLang` prop, so server and client render identically.
if (typeof document !== "undefined") {
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_KEY}=(zh|en)\\b`));
  if (match) current = match[1] as Lang;
}

/** The active language; `"zh"` when neither cookie nor client has spoken. */
export function lang(): Lang {
  return current;
}

/**
 * Bilingual copy: the first argument is the upstream English original, the second the
 * Chinese translation. Works in any component or plain function: it reads the module-level
 * language, which the layout seeds from the cookie before the first render.
 */
export function t(en: string, zh: string): string {
  return current === "zh" ? zh : en;
}

const LanguageContext = createContext<Lang>("zh");

/**
 * Mounts once near the app root. ``initialLang`` comes from the server (the layout reads
 * the language cookie there), so hydration matches; the client adopts it immediately.
 */
export function LanguageProvider({ initialLang = "zh", children }: { initialLang?: Lang; children: ReactNode }) {
  const [state, setState] = useState<Lang>(initialLang);

  useEffect(() => {
    current = state;
    document.documentElement.lang = state === "zh" ? "zh-CN" : "en";
    // Keep the backend in step on every load: the API process may have restarted, or a
    // second browser may hold a different preference. Idempotent — a matching locale is a no-op.
    void fetch(`${API_URL}/api/locale`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: state }),
    }).catch(() => undefined);
  }, [state]);

  return <LanguageContext.Provider value={state}>{children}</LanguageContext.Provider>;
}

/** The active language for components that prefer a hook over the plain `lang()`. */
export function useLang(): Lang {
  return useContext(LanguageContext);
}

/** Switch language: persist it as a cookie, tell the API (which reloads its catalog and
 * agent), reload the page so every module-level constant re-evaluates. */
export function switchLang(next: Lang): void {
  current = next;
  document.cookie = `${COOKIE_KEY}=${next}; path=/; max-age=31536000; samesite=lax`;
  fetch(`${API_URL}/api/locale`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ locale: next }),
  })
    .catch(() => undefined)
    .finally(() => window.location.reload());
}
