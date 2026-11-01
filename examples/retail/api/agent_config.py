# Copyright 2026 Anthropic PBC
# SPDX-License-Identifier: Apache-2.0

"""The ACME retail deployment's two agent configs; the only place this example reads
deployment knobs from the environment."""

from __future__ import annotations

import os

from demo_common import host_approval_default, t
from merchant_agent import MerchantAgentConfig
from shopping_agent import ShoppingAgentConfig


def build_shopping_config() -> ShoppingAgentConfig:
    return ShoppingAgentConfig(
        brand_name="ACME",
        # commerce-agents-zh: 助手名用「购物助手」而非「ACME 助手」，避免与 brand_name
        # 拼接成「ACME 的 ACME 助手」这样的重复；英文侧保持上游原词 byte-identical。
        assistant_name=t("ACME Assistant", "购物助手"),
        brand_voice=t(
            "professional, warm, and brief",
            "专业、温和且简洁；始终用简体中文回答，包括工具调用标签与建议卡片。",
        ),
    )


def build_merchant_config(store_name: str) -> MerchantAgentConfig:
    return MerchantAgentConfig(
        brand_name=store_name,
        # commerce-agents-zh: 商家端助手名与语气本地化（英文侧保持上游原词）。
        assistant_name=t("the merchant assistant", "商家运营助手"),
        brand_voice=t("plain and specific, numbers first", "平实而具体，数字优先。"),
        require_host_approval=host_approval_default(),
        approval_surface=t(
            "the Approve button on the change preview card",
            "变更预览卡上的「通过」按钮",
        ),
        # This deployment runs the run_analysis delegate over MockRetailMerchant's
        # read-only SQL view of the fixtures. MERCHANT_ANALYSIS_CODE_EXECUTION=1 adds the
        # code-execution sandbox (first-party API only); MERCHANT_ANALYSIS_MODEL overrides
        # the delegate's model, which otherwise inherits the main one.
        enable_analysis=True,
        analysis_use_code_execution=os.environ.get("MERCHANT_ANALYSIS_CODE_EXECUTION", "0") == "1",
        analysis_model=os.environ.get("MERCHANT_ANALYSIS_MODEL") or None,
    )
