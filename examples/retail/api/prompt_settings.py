# Copyright 2026 Anthropic PBC
# SPDX-License-Identifier: Apache-2.0
# commerce-agents-zh: run-time prompt settings for the demo API. The prompts the
# agents actually run under stay where upstream builds them; this module renders the
# layers the merchant portal's prompt sheet shows (GET /api/prompts) and applies a
# stored static-system override (data/prompt-override.json, gitignored) after a
# (re)build — ``stream_turn`` reads ``_static_system`` on every request, so a plain
# attribute swap is the whole mechanism and no runtime file changes.

"""Prompt settings the demo API runs with: what each layer renders to at this
moment (under the active locale, config, and overrides), and the static-system
override the merchant portal's prompt sheet edits."""

from __future__ import annotations

import hashlib
import json
from datetime import datetime
from pathlib import Path
from typing import Any

from merchant_agent.analysis import build_analysis_system_prompt
from merchant_agent.memory import merchant_extraction_prompt
from merchant_agent.prompt import build_dynamic_context as build_merchant_dynamic
from merchant_agent.tools.registry import build_tools as build_merchant_tools
from shopping_agent.memory import shopping_extraction_prompt
from shopping_agent.prompt import build_dynamic_context as build_shop_dynamic
from shopping_agent.tools.registry import build_tools as build_shop_tools

OVERRIDE_FILE = "prompt-override.json"

AGENTS = ("shopping", "merchant")
# The layers each agent exposes. ``analysis`` is the merchant delegate only.
LAYERS: dict[str, tuple[str, ...]] = {
    "shopping": ("static", "dynamic", "tools", "skills", "memory"),
    "merchant": ("static", "dynamic", "tools", "skills", "memory", "analysis"),
}
OVERRIDE_KEY = {"shopping": "shopping_static", "merchant": "merchant_static"}


# ---- The stored override -------------------------------------------------------------


def load_override(data_dir: Path) -> dict[str, str]:
    """The stored static-system overrides, or ``{}`` when none is saved."""
    try:
        data = json.loads((data_dir / OVERRIDE_FILE).read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}
    return {k: v for k, v in data.items() if k in OVERRIDE_KEY.values() and isinstance(v, str)}


def save_override(data_dir: Path, override: dict[str, str]) -> None:
    (data_dir / OVERRIDE_FILE).write_text(
        json.dumps(override, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )


def clear_override(data_dir: Path, agent: str | None = None) -> None:
    """Drop one agent's override, or the whole file when no agent is given."""
    if agent is None:
        (data_dir / OVERRIDE_FILE).unlink(missing_ok=True)
        return
    override = load_override(data_dir)
    override.pop(OVERRIDE_KEY[agent], None)
    save_override(data_dir, override)


# ---- Version history (commerce-agents-zh) -------------------------------------------


VERSION_FILE = "prompt-versions.json"


def load_versions(data_dir: Path) -> dict[str, list[dict]]:
    """The stored prompt-version history, or ``{}`` when none is saved."""
    try:
        return json.loads((data_dir / VERSION_FILE).read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}


def record_version(
    data_dir: Path, agent: str, text: str, prev_text: str, note: str = ""
) -> None:
    """Append one version after an override save. ``text`` is the new static prompt
    (empty string means the agent was restored to upstream's build). ``prev_text`` is
    what this agent's override held before the save, used only for a short hash label."""
    versions = load_versions(data_dir)
    history = versions.setdefault(agent, [])
    prev_hash = hashlib.sha256((prev_text or "").encode("utf-8")).hexdigest()[:12]
    history.append(
        {
            "ts": datetime.now().strftime("%Y-%m-%dT%H:%M:%S"),
            "chars": len(text),
            "note": note or "",
            "prev_hash": prev_hash,
            "text": text,
        }
    )
    (data_dir / VERSION_FILE).write_text(
        json.dumps(versions, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )


def list_versions(data_dir: Path, agent: str) -> list[dict]:
    """Every saved version for an agent, oldest first, each carrying its index."""
    history = load_versions(data_dir).get(agent, [])
    return [
        {
            "index": i,
            "ts": v.get("ts", ""),
            "chars": v.get("chars", 0),
            "note": v.get("note", ""),
            "prev_hash": v.get("prev_hash", ""),
            "text": v.get("text", ""),
        }
        for i, v in enumerate(history)
    ]


def get_version_text(data_dir: Path, agent: str, index: int) -> str | None:
    """The stored text of one version, or ``None`` when the index is out of range."""
    history = load_versions(data_dir).get(agent, [])
    if 0 <= index < len(history):
        return history[index].get("text", "")
    return None


def apply_override(agent: Any, kind: str, override: dict[str, str]) -> bool:
    """Swap the agent's static system prompt in place; ``True`` when an override is
    now in effect. Called after every construction and ``rebuild_agents``."""
    text = (override.get(OVERRIDE_KEY[kind]) or "").strip()
    if text:
        agent._static_system = text
    return bool(text)


# ---- Layer rendering -----------------------------------------------------------------


def _tool_block(tools: list[dict]) -> str:
    out = []
    for tool in tools:
        out.append(
            f"## {tool['name']}\n\n{tool['description']}\n\n```json\n"
            + json.dumps(tool.get("input_schema", {}), ensure_ascii=False, indent=1)
            + "\n```"
        )
    return "\n\n---\n\n".join(out)


def _skills_block(skills: Any) -> str:
    out = []
    for name in skills.names:
        out.append(f"# 技能: {name}\n\n{skills.get_instructions(name)}")
    return "\n\n---\n\n".join(out)


def render_layer(agent: Any, kind: str, layer: str) -> str:
    """One layer, rendered from the live agent — so ``static`` is the bytes this very
    deployment sends (override applied) and everything else follows the active locale."""
    config = agent.config
    if layer == "static":
        return agent._static_system
    if layer == "dynamic":
        if kind == "shopping":
            return build_shop_dynamic(
                preferences=None, memory_facts=[], cart=None, page=None
            )
        return build_merchant_dynamic(merchant_context=None, memory_facts=[])
    if layer == "tools":
        tools = (
            build_shop_tools(config, agent.skills.names)
            if kind == "shopping"
            else build_merchant_tools(config, agent.skills.names)
        )
        return _tool_block(tools)
    if layer == "skills":
        return _skills_block(agent.skills)
    if layer == "memory":
        return (
            shopping_extraction_prompt() if kind == "shopping" else merchant_extraction_prompt()
        )
    if layer == "analysis":
        return build_analysis_system_prompt(config)
    raise ValueError(f"unknown layer: {layer}")


def status(agent_holder: dict[str, Any], override: dict[str, str]) -> dict[str, Any]:
    """What the prompt sheet's overview shows: per agent, each layer's size and
    whether an override is in effect. ``agent_holder`` maps kind -> live agent."""
    agents: dict[str, Any] = {}
    for kind, agent in agent_holder.items():
        layers = [
            {
                "name": layer,
                "chars": len(render_layer(agent, kind, layer)),
                "overridden": layer == "static" and bool(override.get(OVERRIDE_KEY[kind])),
            }
            for layer in LAYERS[kind]
        ]
        agents[kind] = {
            "layers": layers,
            "model": agent.config.model,
            "overridden": bool(override.get(OVERRIDE_KEY[kind])),
        }
    return {"agents": agents}
