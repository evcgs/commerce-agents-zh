# Copyright 2026 Anthropic PBC
# SPDX-License-Identifier: Apache-2.0
# commerce-agents-zh: run-time data-source settings for the demo API, the third settings
# module beside model_settings and prompt_settings. The adapter registry lists what a
# deployment can serve reads from; a host switches and configures it from the connector
# sheet, and the choice persists in ``data/backend-override.json`` (gitignored — it can
# carry a key). ``resolve_backend`` is the one place a run-time change goes through.

"""Backend settings the demo API runs with: the adapter registry, the stored
override, and the resolution that puts one of them behind the storefront."""

from __future__ import annotations

import json
import time
from pathlib import Path
from typing import Any, Callable

import httpx

from demo_common.locale import t

from .remote_backend import RemoteCatalogBackend

OVERRIDE_FILE = "backend-override.json"

# The adapter registry: the one extension point. Adopting a new system = implementing a
# ``StorefrontBackend`` adapter and registering one line here; the connector sheet picks
# it up automatically. ``factory`` is ``(mock, conn) -> StorefrontBackend`` where ``mock``
# is the built-in MockRetail (every current adapter keeps it as its write path or
# fallback) and ``conn`` the stored connection fields.
ADAPTERS: dict[str, dict[str, Any]] = {
    "mock-local": {
        "label": ("Built-in demo data", "内置演示数据"),
        "fields": (),
        "factory": lambda mock, conn: mock,
    },
    "remote-catalog": {
        "label": ("Remote catalog (read-only)", "远端商品源（只读）"),
        "fields": ("base_url", "api_key", "timeout_s"),
        "factory": lambda mock, conn: RemoteCatalogBackend(mock, conn),
    },
    # 将来：'erp-xxx'、'oms-yyy' —— 部署方实现适配器后在这里登记一行
}


class BackendSwitch:
    """The stable storefront object the host, the agents, and every route closure hold.

    ``build_storefront_host`` captures the backend object it is given inside its route
    closures, so switching data sources at run time cannot swap that object — it swaps
    what this one forwards to. Attribute access follows the active adapter; the mock is
    kept reachable for resolution and for locale switches (only the mock owns fixtures).
    """

    def __init__(self, mock: Any) -> None:
        self._mock = mock
        self._target: Any = mock

    @property
    def mock(self) -> Any:
        return self._mock

    @property
    def target(self) -> Any:
        return self._target

    def activate(self, target: Any) -> None:
        self._target = target

    def reload(self) -> None:
        """The locale switch's fixture reload; the remote adapters hold no fixtures."""
        self._mock.reload()

    def __getattr__(self, name: str) -> Any:
        return getattr(self._target, name)


# ---- The stored override -------------------------------------------------------------


def load_override(data_dir: Path) -> dict[str, Any]:
    """The stored override, or ``{}`` when none is saved or the file is unreadable."""
    try:
        data = json.loads((data_dir / OVERRIDE_FILE).read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}
    return data if isinstance(data, dict) else {}


def save_override(data_dir: Path, override: dict[str, Any]) -> None:
    """Persist ``{"active": ..., "connections": {adapter: {field: value}}}`` as is; the
    caller merges (an api_key the sheet leaves blank keeps the one already stored)."""
    (data_dir / OVERRIDE_FILE).write_text(
        json.dumps(override, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )


def clear_override(data_dir: Path) -> None:
    (data_dir / OVERRIDE_FILE).unlink(missing_ok=True)


# ---- Resolution ----------------------------------------------------------------------


def resolve_backend(
    storefront: BackendSwitch, override: dict[str, Any], data_dir: Path
) -> tuple[Any, dict[str, Any]]:
    """Build the data source the override asks for and put it behind the switch.

    Returns ``(backend, info)``. No override or ``active: mock-local`` resolves to the
    built-in MockRetail — the default behaviour, byte for byte what the demo always did.
    A remote adapter that cannot even be constructed falls back to the mock with
    ``degraded`` set, so a bad override file can never take the demo down.
    """
    del data_dir  # kept in the signature so the three settings modules read alike
    active = str(override.get("active") or "mock-local")
    info = {"active": "mock-local", "degraded": False, "fallback_active": False}
    if active == "mock-local" or active not in ADAPTERS:
        storefront.activate(storefront.mock)
        return storefront.mock, info
    conn = dict((override.get("connections") or {}).get(active) or {})
    try:
        backend = ADAPTERS[active]["factory"](storefront.mock, conn)
    except Exception:
        storefront.activate(storefront.mock)
        return storefront.mock, {"active": "mock-local", "degraded": True, "fallback_active": True}
    storefront.activate(backend)
    return backend, {"active": active, "degraded": False, "fallback_active": False}


# ---- Health check --------------------------------------------------------------------


async def ping_connection(conn: dict[str, Any]) -> dict[str, Any]:
    """One health check against a connection's ``{base_url}/health`` (the API key goes
    in the ``X-API-Key`` header, never the URL). Nothing is stored or switched."""
    base_url = str(conn.get("base_url") or "").strip().rstrip("/")
    started = time.monotonic()
    if not base_url:
        return {"ok": False, "latency_ms": 0, "error": "base_url is required"}
    try:
        timeout_s = float(conn.get("timeout_s") or 5.0)
    except (TypeError, ValueError):
        timeout_s = 5.0
    headers = {"X-API-Key": conn["api_key"]} if conn.get("api_key") else {}
    try:
        async with httpx.AsyncClient(timeout=timeout_s) as client:
            response = await client.get(f"{base_url}/health", headers=headers)
            response.raise_for_status()
    except Exception as error:
        latency_ms = int((time.monotonic() - started) * 1000)
        return {"ok": False, "latency_ms": latency_ms, "error": str(error)[:200]}
    return {"ok": True, "latency_ms": int((time.monotonic() - started) * 1000), "error": None}


def label_of(adapter_id: str) -> str:
    """The adapter's label under the active locale."""
    return t(*ADAPTERS[adapter_id]["label"])
