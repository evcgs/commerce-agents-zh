# Copyright: 本脚本导出 commerce-agents 运行时实际生效的全套提示词
# 用法: .venv/bin/python scripts/export_prompts.py [输出目录]
"""Export every prompt that actually reaches the model, fully rendered:
static system prompt, tool definitions, skills, dynamic context sample,
and the memory extraction template, for both roles."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
import sys

from shopping_agent import ShoppingAgentConfig
from shopping_agent.prompt import build_static_system, build_dynamic_context
from shopping_agent.tools.registry import build_tools as build_shop_tools
from shopping_agent.memory import shopping_extraction_prompt
from commerce_common.skills import SkillRegistry
from merchant_agent import MerchantAgentConfig
from merchant_agent.prompt import build_static_system as build_merchant_static
from merchant_agent.tools.registry import build_tools as build_merchant_tools
from merchant_agent.memory import merchant_extraction_prompt
from merchant_agent.analysis import build_analysis_system_prompt

REPO = Path(__file__).resolve().parents[1]


def tool_block(tools: list[dict]) -> str:
    out = []
    for t in tools:
        out.append(f"## {t['name']}\n\n{t['description']}\n\n```json\n"
                   + json.dumps(t.get("input_schema", {}), ensure_ascii=False, indent=1)
                   + "\n```")
    return "\n\n---\n\n".join(out)


def skills_block(reg: SkillRegistry) -> str:
    out = []
    for name in reg.names:
        md = reg.get_instructions(name)
        out.append(f"# 技能: {name}\n\n{md}")
    return "\n\n---\n\n".join(out)


def main() -> None:
    out_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else REPO / "prompt-export"
    out_dir.mkdir(parents=True, exist_ok=True)

    # ---- Shopping agent -------------------------------------------------
    shop_cfg = ShoppingAgentConfig(
        brand_name="ACME",
        assistant_name="ACME Assistant",
        brand_voice="professional, warm, and brief. Always respond in Simplified Chinese (简体中文), including tool call labels and suggestion chips.",
    )
    shop_skills = SkillRegistry.from_dir(REPO / "shopping-agent" / "skills")
    shop_static = build_static_system(shop_cfg, shop_skills)
    shop_dynamic = build_dynamic_context(
        preferences=None,
        memory_facts=[],
        cart=None,
        page=None,
        now=datetime.now(timezone.utc),
    )
    shop_tools = build_shop_tools(shop_cfg, shop_skills.names)

    doc = ["# Shopping Agent 全套提示词（运行时实际生效版）",
           "",
           "> 由 scripts/export_prompts.py 于运行环境导出；含静态系统提示词、"
           "工具定义、全部技能、动态上下文样例、记忆提取模板。",
           "",
           "## 目录",
           "1. 静态系统提示词（缓存半区，每次请求字节一致）",
           "2. 动态会话上下文（缓存断点之后，每请求变化）",
           "3. 工具定义（JSON Schema + 描述，即提示词的一部分）",
           "4. 全部技能 SKILL.md（load_skill 按需注入全文）",
           "5. 记忆提取提示词（后台异步提取用，渲染后成品）",
           "",
           "---",
           "",
           "# 1. 静态系统提示词",
           "",
           "```",
           shop_static,
           "```",
           "",
           "---",
           "",
           "# 2. 动态会话上下文（样例：空购物车 + 当前时间）",
           "",
           "```",
           shop_dynamic,
           "```",
           "",
           "---",
           "",
           "# 3. 工具定义（" + str(len(shop_tools)) + " 个）",
           "",
           tool_block(shop_tools),
           "",
           "---",
           "",
           "# 4. 技能全文（" + str(len(shop_skills.names)) + " 个）",
           "",
           skills_block(shop_skills),
           "",
           "---",
           "",
           "# 5. 记忆提取提示词（角色渲染后，后台异步提取实际收到的全文）",
           "",
           "```",
           shopping_extraction_prompt(),
           "```",
           ""]
    (out_dir / "shopping-agent-prompts.md").write_text("\n".join(doc), encoding="utf-8")

    # ---- Merchant agent --------------------------------------------------
    m_cfg = MerchantAgentConfig(brand_name="ACME")
    m_skills = SkillRegistry.from_dir(REPO / "merchant-agent" / "skills")
    m_static = build_merchant_static(m_cfg, m_skills)
    m_tools = build_merchant_tools(m_cfg, m_skills.names)

    doc = ["# Merchant Agent 全套提示词（运行时实际生效版）",
           "",
           "## 目录",
           "1. 静态系统提示词",
           "2. 工具定义",
           "3. 全部技能",
           "4. 记忆提取提示词（角色渲染后）",
           "5. 分析子代理（delegate）系统提示词",
           "",
           "---",
           "",
           "# 1. 静态系统提示词",
           "",
           "```",
           m_static,
           "```",
           "",
           "---",
           "",
           "# 2. 工具定义（" + str(len(m_tools)) + " 个）",
           "",
           tool_block(m_tools),
           "",
           "---",
           "",
           "# 3. 技能全文（" + str(len(m_skills.names)) + " 个）",
           "",
           skills_block(m_skills),
           "",
           "---",
           "",
           "# 4. 记忆提取提示词（角色渲染后）",
           "",
           "```",
           merchant_extraction_prompt(),
           "```",
           "",
           "---",
           "",
           "# 5. 分析子代理（delegate）系统提示词",
           "",
           "run_analysis 工具内部运行的独立模型循环：收到一个问题，只读数据、计算、提交"
           "一个经过校验的 AnalysisResult。这是本系统里唯一的\"子 Agent\"。",
           "",
           "```",
           build_analysis_system_prompt(m_cfg),
           "```",
           ""]
    (out_dir / "merchant-agent-prompts.md").write_text("\n".join(doc), encoding="utf-8")

    print(f"导出完成 -> {out_dir}")
    print(f"  shopping-agent-prompts.md: 静态提示词 {len(shop_static)} 字符, "
          f"{len(shop_tools)} 工具, {len(shop_skills.names)} 技能")
    print(f"  merchant-agent-prompts.md: 静态提示词 {len(m_static)} 字符, "
          f"{len(m_tools)} 工具, {len(m_skills.names)} 技能")


if __name__ == "__main__":
    main()
