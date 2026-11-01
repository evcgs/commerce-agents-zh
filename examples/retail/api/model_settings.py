# Copyright 2026 Anthropic PBC
# SPDX-License-Identifier: Apache-2.0
# commerce-agents-zh: run-time model settings for the demo API. The upstream defaults
# stay where they are (each role's config.py); a host can override the model names,
# the thinking effort, and the API endpoint from the merchant portal, and the settings
# persist in ``data/model-override.json`` (gitignored — it can carry a key).

"""Model settings the demo API runs with: what the config files default to, what a
stored override changes, and the client the override builds. ``/api/models`` reads and
writes it; rebuilding the agents applies it."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from anthropic import AsyncAnthropic

OVERRIDE_FILE = "model-override.json"

# The fields an override can set. Empty strings clear back to the default.
FIELDS = (
    "model",
    "merchant_model",
    "memory_model",
    "analysis_model",
    "thinking_effort",
    "base_url",
    "api_key",
)


def load_override(data_dir: Path) -> dict[str, Any]:
    """The stored override, or ``{}`` when none is saved or the file is unreadable."""
    try:
        return json.loads((data_dir / OVERRIDE_FILE).read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}


def save_override(data_dir: Path, override: dict[str, Any]) -> None:
    """Persist the override (only the known fields; a missing key file field keeps the
    one already stored, so the portal never has to echo it back)."""
    clean = {key: value for key, value in override.items() if key in FIELDS and value}
    (data_dir / OVERRIDE_FILE).write_text(
        json.dumps(clean, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )


def clear_override(data_dir: Path) -> None:
    (data_dir / OVERRIDE_FILE).unlink(missing_ok=True)


def masked(key: str | None) -> str | None:
    """A key for display: the first few and last four characters, never the middle."""
    if not key:
        return None
    if len(key) <= 12:
        return "****"
    return f"{key[:5]}…{key[-4:]}"


def build_client(override: dict[str, Any], timeout_s: float) -> AsyncAnthropic | None:
    """A client for the override's endpoint, or ``None`` to use the SDK's own
    environment chain (``ANTHROPIC_API_KEY`` / ``ANTHROPIC_BASE_URL``)."""
    base_url = (override.get("base_url") or "").strip()
    api_key = (override.get("api_key") or "").strip()
    if not base_url and not api_key:
        return None
    kwargs: dict[str, Any] = {"timeout": timeout_s}
    if base_url:
        kwargs["base_url"] = base_url
    if api_key:
        kwargs["api_key"] = api_key
    return AsyncAnthropic(**kwargs)


def merge_effort(override: dict[str, Any]) -> str | None:
    """The thinking effort an override asks for, or ``None`` when it sets none — the
    configs then keep their own default (thinking disabled in this deployment)."""
    value = (override.get("thinking_effort") or "").strip().lower()
    return value if value in {"low", "medium", "high", "xhigh", "max"} else None
