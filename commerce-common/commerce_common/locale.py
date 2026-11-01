# Copyright 2026 Anthropic PBC
# SPDX-License-Identifier: Apache-2.0
# Localization layer added by commerce-agents-zh: a process-level locale with a
# bilingual-copy helper, so the web apps' language toggle can restore the upstream
# English runtime copy verbatim. The English side of every pair is byte-identical to
# the upstream repository, never re-translated.

"""The demo's active locale and the ``t(en, zh)`` helper the bilingual copy uses.

The locale is process-level state: ``DEMO_LOCALE`` seeds it at boot (default ``zh``),
and the ``/api/locale`` route the hosts mount flips it at run time, reloading whatever
the vertical had loaded per-locale (its catalog) and rebuilding the agents. Copy that
belongs to a turn already streamed stays in the language it was produced in.
"""

from __future__ import annotations

import os

Locale = str  # "zh" | "en"

_current: Locale = os.environ.get("DEMO_LOCALE", "zh").strip().lower() or "zh"


def normalize(value: str | None) -> Locale:
    """``zh`` or ``en``; anything else falls back to the current locale."""
    if (value or "").strip().lower() == "en":
        return "en"
    if (value or "").strip().lower() == "zh":
        return "zh"
    return _current


def get_locale() -> Locale:
    return _current


def set_locale(value: str | None) -> Locale:
    """Set the process locale (no reload here — the API route owns that)."""
    global _current
    _current = normalize(value)
    return _current


def t(en: str, zh: str) -> str:
    """Bilingual copy: the upstream English original first, the Chinese translation second."""
    return zh if _current == "zh" else en
