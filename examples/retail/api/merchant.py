# Copyright 2026 Anthropic PBC
# SPDX-License-Identifier: Apache-2.0

"""The ACME retail merchant router: the shared portal routes over ``MockRetailMerchant``,
plus the KPI trends and insight cards the retail portal's home page shows.

The agent is held in the ``agents`` list the router closes over, so the model-settings
route can swap it in place; ``build_retail_merchant_agent`` is the (re)builder."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter

from commerce_common.memory import MemoryStore
from demo_common import REPO_ROOT, MerchantIdentity, build_merchant_router
from merchant_agent import MerchantAgentConfig
from merchant_agent_runtime import MerchantAgent

from .agent_config import build_merchant_config
from .mock_merchant import MockRetailMerchant
from .mock_retail import MockRetail
from .model_settings import build_client, merge_effort

IDENTITY = MerchantIdentity(merchant_id="acme-retail", operator="Avery")


def _apply_override(config: MerchantAgentConfig, override: dict[str, Any]) -> MerchantAgentConfig:
    """The config under a stored model override: names swap only when set."""
    updates: dict[str, Any] = {}
    if value := (override.get("merchant_model") or "").strip():
        updates["model"] = value
    if value := (override.get("memory_model") or "").strip():
        updates["memory_model"] = value
    if value := (override.get("analysis_model") or "").strip():
        updates["analysis_model"] = value
    if isinstance(override.get("thinking_effort"), str) and override["thinking_effort"].strip():
        updates["thinking_effort"] = merge_effort(override)
    return config.model_copy(update=updates) if updates else config


def build_retail_merchant_agent(
    storefront: MockRetail,
    backend: MockRetailMerchant,
    memory_store: MemoryStore,
    override: dict[str, Any] | None = None,
) -> MerchantAgent:
    """The merchant agent over ``backend`` under the stored override; the memory store
    is the caller's, so remembered facts survive a rebuild."""
    override = override or {}
    config = _apply_override(build_merchant_config(storefront.store_name), override)
    return MerchantAgent(
        backend=backend,
        skills_dir=REPO_ROOT / "merchant-agent" / "skills",
        config=config,
        memory_store=memory_store,
        client=build_client(override, config.request_timeout_s),
    )


def create_merchant_router(
    storefront: MockRetail, memory_store: MemoryStore, override: dict[str, Any] | None = None
) -> tuple[APIRouter, MockRetailMerchant, list[MerchantAgent]]:
    """``(router, merchant, agents)`` — the router to mount, the backend it serves, and
    the one-slot agent list the model-settings route swaps in place."""
    config = _apply_override(build_merchant_config(storefront.store_name), override or {})
    merchant = MockRetailMerchant(storefront, config, merchant_id=IDENTITY.merchant_id)
    agent = MerchantAgent(
        backend=merchant,
        skills_dir=REPO_ROOT / "merchant-agent" / "skills",
        config=config,
        memory_store=memory_store,
        client=build_client(override or {}, config.request_timeout_s),
    )
    agents: list[MerchantAgent] = [agent]
    router = build_merchant_router(
        storefront=storefront,
        backend=merchant,
        agent=agent,
        identity=IDENTITY,
        agent_slot=agents,
        example_dir="retail",
        overview_extras=lambda: {
            "trends": merchant.kpi_trends(),
            "trends_prior": merchant.kpi_trends(periods_back=1),
            "insights": merchant.home_insights(),
        },
    )
    return router, merchant, agents
