# Copyright 2026 Anthropic PBC
# SPDX-License-Identifier: Apache-2.0

"""ACME retail example API: the mock retailer behind the shared storefront routes, the
merchant router under /api/merchant, and the retail-only routes below.

    uvicorn retail.api.main:app --app-dir examples --reload --port 8000

Memory here is file-backed (``data/.memory-store.json``, gitignored) and seeded once per
user, so what a shopper asks the store to remember, or to forget, survives a restart.

The agents run under the stored model override (``data/model-override.json``, editable
from the merchant portal's model-settings sheet); ``rebuild_agents`` applies it.
"""

from __future__ import annotations

from typing import Any

from fastapi import HTTPException
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from commerce_common.memory import InMemoryMemoryStore, JsonFileMemoryStore
from demo_common import (
    REPO_ROOT,
    CartAddRequest,
    MemorySeeder,
    build_storefront_host,
    get_locale,
    load_demo_env,
    set_locale,
    t,
)
from shopping_agent import ProductDetails
from shopping_agent_runtime import ShoppingAgent

from .agent_config import build_merchant_config, build_shopping_config
from .backend_settings import (
    ADAPTERS as BACKEND_ADAPTERS,
    BackendSwitch,
    clear_override as clear_backend_override,
    label_of as backend_label,
    load_override as load_backend_override,
    ping_connection,
    resolve_backend,
    save_override as save_backend_override,
)
from .merchant import build_retail_merchant_agent, create_merchant_router
from .mock_retail import DATA_DIR, MockRetail
from .model_settings import (
    build_client,
    clear_override,
    load_override,
    masked,
    merge_effort,
    save_override,
)
from .remote_backend import RemoteCatalogBackend
from .remote_demo import create_demo_remote_router
from .prompt_settings import (
    AGENTS as PROMPT_AGENTS,
    LAYERS as PROMPT_LAYERS,
    apply_override as apply_prompt_override,
    clear_override as clear_prompt_override,
    get_version_text,
    list_versions,
    load_override as load_prompt_override,
    record_version,
    render_layer as render_prompt_layer,
    save_override as save_prompt_override,
    status as prompt_status,
)

load_demo_env(DATA_DIR.parent)
PRODUCT_IMAGES = DATA_DIR.parent / "storefront-web" / "public" / "products"

# The storefront reads through a stable switch whose target resolve_backend swaps; the
# closures in build_storefront_host capture this one object, so a data-source change is
# a switch of its target plus an agent rebuild — no route re-wiring. The merchant side
# keeps reading the mock directly (P1: the merchant portal stays on local fixtures).
mock_backend = MockRetail()
backend = BackendSwitch(mock_backend)
MERCHANT_MEMORY = InMemoryMemoryStore()
# The live remote adapter while remote-catalog is active, else None; its breaker
# counters are what /api/backends reports.
active_remote: RemoteCatalogBackend | None = None


def _shopping_agent(override: dict[str, Any]) -> ShoppingAgent:
    """The shopping agent under a model override; the memory store instance is reused
    across rebuilds, so remembered facts survive."""
    config = build_shopping_config()
    updates: dict[str, Any] = {}
    if value := (override.get("model") or "").strip():
        updates["model"] = value
    if value := (override.get("memory_model") or "").strip():
        updates["memory_model"] = value
    if isinstance(override.get("thinking_effort"), str) and override["thinking_effort"].strip():
        updates["thinking_effort"] = merge_effort(override)
    if updates:
        config = config.model_copy(update=updates)
    return ShoppingAgent(
        backend=backend,
        skills_dir=REPO_ROOT / "shopping-agent" / "skills",
        config=config,
        memory_store=JsonFileMemoryStore(DATA_DIR / ".memory-store.json"),
        client=build_client(override, config.request_timeout_s),
    )


agent = _shopping_agent(load_override(DATA_DIR))


def product_detail(product: ProductDetails) -> dict:
    # Detail-panel enrichment only; the agent's tool results never carry it.
    return product.model_dump() | {
        "price_intelligence": backend.price_intelligence(product.product_id),
        "review_aspects": backend.review_aspects(product.product_id),
    }


host = build_storefront_host(
    title="ACME Retail demo API",
    example_root=DATA_DIR.parent,
    backend=backend,
    agent=agent,
    memory_seeder=MemorySeeder(
        DATA_DIR / "memory-seed.json", marker=DATA_DIR / ".memory-seeded.json"
    ),
    product_detail=product_detail,
)
app = host.app
merchant_router, merchant_backend, merchant_agents = create_merchant_router(
    mock_backend, MERCHANT_MEMORY, load_override(DATA_DIR)
)
app.include_router(merchant_router, prefix="/api/merchant")
# The built-in stand-in for a third-party system the remote-catalog adapter points at
# (an independent, heterogeneous fixture set with fault injection).
app.include_router(create_demo_remote_router())
# Apply the stored data-source choice before first use (mock-local when none).
_resolved, _ = resolve_backend(backend, load_backend_override(DATA_DIR), DATA_DIR)
active_remote = _resolved if isinstance(_resolved, RemoteCatalogBackend) else None
# The merchant portal shows the storefront's listing photos, so the API serves them to both apps.
app.mount("/products", StaticFiles(directory=PRODUCT_IMAGES, check_dir=False), name="products")


def _apply_prompt_overrides() -> None:
    """Put the stored static-system overrides back on the freshly built agents."""
    stored = load_prompt_override(DATA_DIR)
    apply_prompt_override(host.agent, "shopping", stored)
    apply_prompt_override(merchant_agents[0], "merchant", stored)


_apply_prompt_overrides()


def rebuild_agents() -> dict[str, Any]:
    """Rebuild the data source and both agents under the stored overrides and the
    active locale — the one place the /api/locale, /api/models, and /api/backends
    routes apply a run-time change. Model, prompts, and data source share this entry."""
    global active_remote
    override = load_override(DATA_DIR)
    resolved, _ = resolve_backend(backend, load_backend_override(DATA_DIR), DATA_DIR)
    active_remote = resolved if isinstance(resolved, RemoteCatalogBackend) else None
    host.agent = _shopping_agent(override)
    merchant_agents[0] = build_retail_merchant_agent(
        mock_backend, merchant_backend, MERCHANT_MEMORY, override
    )
    _apply_prompt_overrides()
    return override


def _model_status() -> dict[str, Any]:
    """What the models settings sheet shows: the defaults, the stored override (key
    masked), and the values the agents actually run with."""
    override = load_override(DATA_DIR)
    shown = {key: value for key, value in override.items() if key != "api_key"}
    if override.get("api_key"):
        shown["api_key"] = masked(override["api_key"])
    return {
        "defaults": {
            "model": build_shopping_config().model,
            "merchant_model": build_merchant_config(backend.store_name).model,
            "memory_model": build_shopping_config().memory_model,
            "thinking_effort": build_shopping_config().thinking_effort,
        },
        "override": shown,
        "effective": {
            "model": host.agent.config.model,
            "merchant_model": merchant_agents[0].config.model,
            "memory_model": merchant_agents[0].config.memory_model,
            "thinking_effort": merchant_agents[0].config.thinking_effort,
            "base_url": (override.get("base_url") or "").strip() or None,
        },
        "locale": get_locale(),
    }


@app.post("/api/cart/add")
async def cart_add(request: CartAddRequest, record: host.CurrentSession) -> dict:
    return await host.direct_add(
        record,
        request,
        note=t(
            "Customer tapped the add-to-cart button on {title} ({product_id}), quantity {quantity}.",
            "顾客点击了 {title}（{product_id}）的加购按钮，数量 {quantity}。",
        ),
    )


class LocaleRequest(BaseModel):
    locale: str


@app.post("/api/locale")
async def set_demo_locale(request: LocaleRequest) -> dict:
    """The language toggle's endpoint: flip the process locale, re-read every fixture
    under it, and rebuild the agents (brand voice, extraction templates). The memory
    stores are reused, so what the shoppers and operators saved survives the switch;
    a no-op when the locale already matches."""
    previous = get_locale()
    set_locale(request.locale)
    if get_locale() != previous:
        backend.reload()
        merchant_backend.reload()
        rebuild_agents()
    return {"locale": get_locale()}


class ModelSettingsRequest(BaseModel):
    """A partial update; an absent or blank field keeps what is stored. ``thinking_effort``
    takes ``off`` (the configs' default), ``low``…``max``; ``api_key`` is write-only."""

    model: str | None = None
    merchant_model: str | None = None
    memory_model: str | None = None
    analysis_model: str | None = None
    thinking_effort: str | None = None
    base_url: str | None = None
    api_key: str | None = None


@app.get("/api/models")
async def get_model_settings() -> dict:
    return _model_status()


@app.post("/api/models")
async def set_model_settings(request: ModelSettingsRequest) -> dict:
    """Store the given fields and rebuild both agents under them. The upstream defaults
    in the config files are never touched — clearing the override restores them."""
    override = load_override(DATA_DIR)
    for key, value in request.model_dump().items():
        if value is None:
            continue
        if key == "api_key":
            if value.strip():
                override[key] = value.strip()
        elif str(value).strip():
            override[key] = str(value).strip()
        else:
            override.pop(key, None)  # a blank non-key field clears back to the default
    save_override(DATA_DIR, override)
    rebuild_agents()
    return _model_status()


@app.delete("/api/models")
async def reset_model_settings() -> dict:
    """Drop the stored override and rebuild under the config files' defaults."""
    clear_override(DATA_DIR)
    rebuild_agents()
    return _model_status()


# ---- Prompt sheet (/api/prompts) -----------------------------------------------------


def _prompt_agent(kind: str) -> Any:
    if kind == "shopping":
        return host.agent
    if kind == "merchant":
        return merchant_agents[0]
    raise HTTPException(status_code=404, detail=f"unknown agent: {kind}")


@app.get("/api/prompts")
async def get_prompt_overview() -> dict:
    """The prompt sheet's overview: per agent, each layer's size and override state."""
    return prompt_status(
        {kind: _prompt_agent(kind) for kind in PROMPT_AGENTS},
        load_prompt_override(DATA_DIR),
    )


@app.get("/api/prompts/content")
async def get_prompt_content(agent: str, layer: str) -> dict:
    """One layer's rendered text, from the live agents — the same bytes a request
    would send under the active locale, model settings, and overrides."""
    if agent not in PROMPT_AGENTS or layer not in PROMPT_LAYERS.get(agent, ()):
        raise HTTPException(status_code=404, detail=f"unknown prompt layer: {agent}/{layer}")
    text = render_prompt_layer(_prompt_agent(agent), agent, layer)
    override = load_prompt_override(DATA_DIR)
    return {
        "agent": agent,
        "layer": layer,
        "content": text,
        "overridden": layer == "static" and bool(override.get(f"{agent}_static")),
    }


class PromptOverrideRequest(BaseModel):
    """Replace one agent's static system prompt. A blank string clears back to the
    prompt upstream builds; the override persists in ``data/prompt-override.json``
    and is re-applied by every rebuild (including locale switches). ``note`` is an
    optional label recorded in the version history (see ``/api/prompts/versions``)."""

    agent: str
    static_system: str | None = None
    note: str | None = None


@app.post("/api/prompts")
async def set_prompt_override(request: PromptOverrideRequest) -> dict:
    """Store the given static prompt and rebuild both agents under it."""
    if request.agent not in PROMPT_AGENTS:
        raise HTTPException(status_code=404, detail=f"unknown agent: {request.agent}")
    stored = load_prompt_override(DATA_DIR)
    key = f"{request.agent}_static"
    prev_text = stored.get(key, "")
    new_text = (request.static_system.strip() + "\n") if (request.static_system or "").strip() else ""
    if new_text:
        stored[key] = new_text
    else:
        stored.pop(key, None)
    save_prompt_override(DATA_DIR, stored)
    record_version(DATA_DIR, request.agent, new_text, prev_text, request.note or "")
    rebuild_agents()
    return await get_prompt_overview()


@app.delete("/api/prompts")
async def reset_prompt_overrides(agent: str | None = None) -> dict:
    """Drop the stored prompt override (one agent's, or all of them) and rebuild."""
    if agent is not None and agent not in PROMPT_AGENTS:
        raise HTTPException(status_code=404, detail=f"unknown agent: {agent}")
    clear_prompt_override(DATA_DIR, agent)
    rebuild_agents()
    return await get_prompt_overview()


@app.get("/api/prompts/versions")
async def get_prompt_versions(agent: str) -> dict:
    """List the saved static-prompt versions for an agent (oldest first, each with its
    index) so the portal can preview, diff, or roll back to any of them."""
    if agent not in PROMPT_AGENTS:
        raise HTTPException(status_code=404, detail=f"unknown agent: {agent}")
    return {"agent": agent, "versions": list_versions(DATA_DIR, agent)}


class PromptRestoreVersionRequest(BaseModel):
    """Roll an agent's static prompt back to a saved version (by its index)."""

    agent: str
    index: int


@app.post("/api/prompts/restore-version")
async def restore_prompt_version(request: PromptRestoreVersionRequest) -> dict:
    """Set the static prompt override to a previously saved version and rebuild.

    Restoring does not append a new version entry — the chosen version stays the source
    of truth, so the history reads as a clean timeline of intentional edits."""
    if request.agent not in PROMPT_AGENTS:
        raise HTTPException(status_code=404, detail=f"unknown agent: {request.agent}")
    text = get_version_text(DATA_DIR, request.agent, request.index)
    if text is None:
        raise HTTPException(status_code=404, detail=f"no version {request.index} for {request.agent}")
    stored = load_prompt_override(DATA_DIR)
    key = f"{request.agent}_static"
    if text:
        stored[key] = text
    else:
        stored.pop(key, None)
    save_prompt_override(DATA_DIR, stored)
    rebuild_agents()
    return await get_prompt_overview()


# ---- Connector sheet (/api/backends) -------------------------------------------------


def _backends_status() -> dict[str, Any]:
    """What the connector sheet shows: the active adapter, the registry with each
    adapter's connection fields and live state, and the breaker counters."""
    override = load_backend_override(DATA_DIR)
    active = str(override.get("active") or "mock-local")
    remote = active_remote if active == "remote-catalog" else None
    degraded = bool(remote and remote.degraded)
    fallback = bool(remote and remote.fallback_active)
    return {
        "active": active,
        "adapters": [
            {
                "id": adapter_id,
                "label": backend_label(adapter_id),
                "fields": list(spec["fields"]),
                "connected": adapter_id == active and not fallback,
                "degraded": adapter_id == active and degraded,
            }
            for adapter_id, spec in BACKEND_ADAPTERS.items()
        ],
        "health": {
            "reads": remote.reads if remote else 0,
            "failures": remote.failures if remote else 0,
            "degraded": degraded,
            "fallback_active": fallback,
        },
    }


@app.get("/api/backends")
async def get_backends() -> dict:
    return _backends_status()


class BackendSettingsRequest(BaseModel):
    """A data-source switch plus its connection fields. ``api_key`` is write-only: a
    blank or absent key keeps the one already stored, like the model sheet's."""

    active: str
    connection: dict[str, Any] | None = None


@app.post("/api/backends")
async def set_backend(request: BackendSettingsRequest) -> dict:
    """Store the active adapter and its connection fields, then rebuild the data source
    and both agents under them. Clearing the override restores the built-in demo data."""
    if request.active not in BACKEND_ADAPTERS:
        raise HTTPException(status_code=404, detail=f"unknown adapter: {request.active}")
    stored = load_backend_override(DATA_DIR)
    connections = dict(stored.get("connections") or {})
    if request.connection:
        fields = BACKEND_ADAPTERS[request.active]["fields"]
        conn = dict(connections.get(request.active) or {})
        for key in fields:
            value = request.connection.get(key)
            if key == "api_key":
                if isinstance(value, str) and value.strip():
                    conn[key] = value.strip()
            elif value not in (None, ""):
                conn[key] = value
        connections[request.active] = conn
    save_backend_override(DATA_DIR, {"active": request.active, "connections": connections})
    rebuild_agents()
    return _backends_status()


@app.delete("/api/backends")
async def reset_backend() -> dict:
    """Drop the stored override and rebuild on the built-in demo data."""
    clear_backend_override(DATA_DIR)
    rebuild_agents()
    return _backends_status()


class BackendPingRequest(BaseModel):
    """One connection to health-check; nothing here is stored or switched."""

    base_url: str = ""
    api_key: str = ""
    timeout_s: float = 5.0


@app.post("/api/backends/ping")
async def ping_backend(request: BackendPingRequest) -> dict:
    return await ping_connection(request.model_dump())
