#!/usr/bin/env bash
# Copyright 2026 Anthropic PBC
# SPDX-License-Identifier: Apache-2.0
#
# commerce-agents-zh: 一键安装引导脚本（Agent-native 安装的核心）。
#
# 把「克隆之后人要手动敲的一串命令」收敛成一条：建 venv、装 Python 依赖（清华源，
# 失败回退官方源）、装前端依赖（npmmirror，失败回退官方源）、落 .env。可重复运行
# （幂等）。语言是运行时开关，不在此处装——默认中文（DEMO_LOCALE 留空即 zh）。
#
#   bash scripts/bootstrap.sh            # 装依赖 + 落 .env（不自动起服务）
#   bash scripts/bootstrap.sh --start    # 装完直接拉起零售三件套（需先有 key）
#
# 设计目标：让 Codex / Claude Code / WorkBuddy / Cloud 这类 Agent 拿到本脚本路径即可
# 自动完成环境搭建，用户无需逐条敲命令。等价于把安装提示词（docs/Agent-安装提示词.md）
# 交给 Agent 执行。
set -euo pipefail

cd "$(dirname "$0")/.."

PYTHON="${PYTHON:-python3}"
PIP_MIRROR="https://pypi.tuna.tsinghua.edu.cn/simple"
NPM_MIRROR="https://registry.npmmirror.com"

echo "==> [commerce-agents-zh] bootstrap 开始（默认语言：中文 zh）"

# 0) 前置检查 -------------------------------------------------------------------
if ! command -v "$PYTHON" >/dev/null 2>&1; then
  echo "ERROR: 未找到 python3，请先安装 Python 3.11+" >&2
  exit 1
fi
if ! "$PYTHON" -c 'import sys; sys.exit(0 if sys.version_info >= (3, 11) else 1)'; then
  echo "ERROR: 需要 Python >= 3.11，当前 $("$PYTHON" -V 2>&1)" >&2
  exit 1
fi
if ! command -v npm >/dev/null 2>&1; then
  echo "ERROR: 未找到 npm，请先安装 Node 22" >&2
  exit 1
fi

# 1) 虚拟环境（幂等）-----------------------------------------------------------
if [ ! -d .venv ]; then
  echo "==> 创建虚拟环境 .venv"
  "$PYTHON" -m venv .venv
else
  echo "==> .venv 已存在，跳过创建"
fi
# shellcheck disable=SC1091
source .venv/bin/activate

# 2) Python 依赖（清华源优先，失败回退官方源）----------------------------------
echo "==> pip install -r requirements.txt（优先清华源）"
if pip install -i "$PIP_MIRROR" -r requirements.txt; then
  echo "    OK: 清华源安装成功"
else
  echo "    WARN: 清华源失败，回退官方源"
  pip install -r requirements.txt
fi

# 3) 前端依赖（npmmirror 优先，失败回退官方源）--------------------------------
echo "==> npm install（examples 工作区，优先 npmmirror）"
(
  cd examples
  if npm ci --registry="$NPM_MIRROR" 2>/dev/null; then
    echo "    OK: npmmirror ci 成功"
  elif npm install --registry="$NPM_MIRROR" 2>/dev/null; then
    echo "    OK: npmmirror install 成功"
  else
    echo "    WARN: npmmirror 失败，回退官方源"
    npm install
  fi
)

# 4) .env（幂等）--------------------------------------------------------------
if [ ! -f .env ]; then
  cp .env.example .env
  echo "==> 已生成 .env（请填入 ANTHROPIC_API_KEY）"
else
  echo "==> .env 已存在，保留不覆盖"
fi

# 5) 语言默认值说明 -----------------------------------------------------------
echo "==> 语言：默认中文。切英文在 .env 设 DEMO_LOCALE=en 即可（运行时开关，非安装项）"

echo ""
echo "==> 安装完成。"
if [ "${1:-}" = "--start" ]; then
  if [ -z "${ANTHROPIC_API_KEY:-}" ] && ! grep -q 'ANTHROPIC_API_KEY=.\+' .env 2>/dev/null; then
    echo "    注意：尚未配置 ANTHROPIC_API_KEY，服务可能起不来。请先在 .env 填入 key 再启动。"
  fi
  echo "==> 拉起零售三件套（API / 店面 / 商家端）"
  python scripts/run_demo.py retail --all
else
  echo "    下一步："
  echo "      1) 在 .env 填入你的 key：echo 'ANTHROPIC_API_KEY=sk-...' >> .env"
  echo "      2) 启动：python scripts/run_demo.py retail --all"
  echo "      3) 打开终端输出的店面 / 商家端 / API 地址（默认零售 API :8001、店面 :4001、商家端 :4101）"
  echo ""
  echo "    给 Agent 自动装？把 docs/Agent-安装提示词.md 的内容直接发给 Codex / Claude Code /"
  echo "    WorkBuddy / Cloud，或让 WorkBuddy 经 MCP 调 bootstrap_install 工具。"
fi
