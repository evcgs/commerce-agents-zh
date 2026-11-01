# Copyright 2026 Anthropic PBC
# SPDX-License-Identifier: Apache-2.0
# commerce-agents-zh: A3 FastMCP 工具封装（设计稿 v1.1 第 4.4/4.5/6 节）。
#
# 把 demo API 的三个配置面（模型 / 提示词 / 数据源）的只读 + 配置写端点，
# 以及聚合健康检查，包装成结构化 MCP 工具，供 WorkBuddy 等平台型 Agent 通过
# 工具发现 + schema + 权限确认流来操作，而不是给 shell。
#
# 第一批范围（设计文档未决问题 6）：只读 + 配置写端点，不含日志 / 进程管理
# （第二批，见 README 的 TODO）。
#
# 注意：
#   - 调本地 API 一律走 httpx.AsyncClient(trust_env=False)，否则 127.0.0.1 会被
#     系统代理劫持（见 AGENTS.md 已知坑）。
#   - 非 2xx 一律返回带 "error" 字段的 dict，不让异常冒泡导致工具崩溃。

from __future__ import annotations

import asyncio
import os
import subprocess
import sys
from collections import deque
from pathlib import Path
from typing import Any

import httpx
from fastmcp import FastMCP

# 默认指向作者环境变体的 API 端口 :8001（AGENTS.md §5）；可被环境变量覆盖。
BASE_URL = os.environ.get("MCP_API_BASE", "http://127.0.0.1:8001").rstrip("/")

mcp = FastMCP("commerce-agents-config")

# 仓库根（与 agentctl.py 中 REPO_ROOT 同义）；进程管理工具据此子进程调用
# scripts/agentctl.py，不在此处重写任何进程逻辑（单一权威在 A2）。
REPO_ROOT = Path(__file__).resolve().parents[1]
AGENTCTL = REPO_ROOT / "scripts" / "agentctl.py"
BOOTSTRAP = REPO_ROOT / "scripts" / "bootstrap.sh"

# 日志归位目录与文件命名，对齐 AGENTS.md §1 / agentctl.py（logs/、.agentctl.pids）。
LOGS_DIR = REPO_ROOT / "logs"
VALID_LOG_SERVICES = ("api", "storefront", "merchant")


# ---------------------------------------------------------------------------
# 内部 HTTP 辅助
# ---------------------------------------------------------------------------


async def _request(
    method: str,
    path: str,
    *,
    params: dict[str, Any] | None = None,
    json_body: dict[str, Any] | None = None,
    timeout: float = 10.0,
) -> dict[str, Any]:
    """对本地 demo API 发一次请求，返回结构化 dict。

    - 2xx：返回解析出的 JSON（API 本身已返回结构化 dict）。
    - 非 2xx：返回 {"error": <信息>, "status_code": <int>}。
    - 网络 / JSON 解析失败：返回 {"error": <信息>}（不抛异常）。

    trust_env=False 是硬性要求：本机 127.0.0.1 不能被代理拦截。
    """
    url = f"{BASE_URL}{path}"
    try:
        async with httpx.AsyncClient(trust_env=False, timeout=timeout) as client:
            response = await client.request(
                method, url, params=params, json=json_body
            )
    except Exception as exc:  # 连接失败、超时等
        return {"error": f"request failed: {type(exc).__name__}: {exc}", "url": url}

    if response.status_code >= 400:
        detail = ""
        try:
            detail = response.json().get("detail", "") if response.content else ""
        except Exception:
            detail = response.text[:300]
        return {
            "error": f"{method} {path} -> HTTP {response.status_code}: {detail}",
            "status_code": response.status_code,
        }

    try:
        return response.json()
    except Exception as exc:
        return {
            "error": f"invalid JSON response: {exc}",
            "status_code": response.status_code,
            "text": response.text[:300],
        }


def _only_set(body: dict[str, Any]) -> dict[str, Any]:
    """丢弃值为 None / 空字符串的键，仅保留真正要下发的字段。

    三个 settings 端点的写操作都是「部分更新」语义：空白字段 = 保留已存值或
    清空回默认，因此只下发非空的键即可。
    """
    return {k: v for k, v in body.items() if v is not None and v != ""}


# ---------------------------------------------------------------------------
# 模型面（/api/models）
# ---------------------------------------------------------------------------


@mcp.tool()
async def get_models() -> dict[str, Any]:
    """读取当前模型配置：默认值、已存覆盖（api_key 已打码）、实际生效值、locale。

    对应 GET /api/models。只读，无副作用。
    """
    return await _request("GET", "/api/models")


@mcp.tool()
async def set_model(
    model: str | None = None,
    merchant_model: str | None = None,
    memory_model: str | None = None,
    analysis_model: str | None = None,
    thinking_effort: str | None = None,
    base_url: str | None = None,
    api_key: str | None = None,
) -> dict[str, Any]:
    """覆盖模型配置并立即重建两个 Agent。对应 POST /api/models（写操作）。

    参数全部可选；只下发非空的字段（部分更新）。字段含义：
      - model: 购物 Agent 用的模型名
      - merchant_model: 商家 Agent 用的模型名
      - memory_model: 记忆抽取用的模型名
      - analysis_model: 商家分析分支用的模型名
      - thinking_effort: 思考档位，off|low|medium|high|xhigh|max，空白 = 关闭
      - base_url: 自定义端点；空白 = 用 SDK 默认链
      - api_key: 自定义端点密钥（仅写不回显；空白 = 保留已存值）

    注意：POST 会立即重建 Agent（写操作）。先用 get_models() 确认现状，改完再
    get_models() 验证生效。返回结构同 get_models()；失败返回带 error 的 dict。
    """
    body = _only_set(
        {
            "model": model,
            "merchant_model": merchant_model,
            "memory_model": memory_model,
            "analysis_model": analysis_model,
            "thinking_effort": thinking_effort,
            "base_url": base_url,
            "api_key": api_key,
        }
    )
    return await _request("POST", "/api/models", json_body=body)


# ---------------------------------------------------------------------------
# 提示词面（/api/prompts）
# ---------------------------------------------------------------------------


@mcp.tool()
async def get_prompts() -> dict[str, Any]:
    """读取提示词概览：每个 Agent 的逐层（static/dynamic/tools/skills/memory/
    analysis）字符数与是否被覆盖。对应 GET /api/prompts。只读，无副作用。
    """
    return await _request("GET", "/api/prompts")


@mcp.tool()
async def get_prompt_content(agent: str, layer: str) -> dict[str, Any]:
    """读取某 Agent 某一层的实时渲染文本（按当前 locale / 模型 / 覆盖渲染）。

    对应 GET /api/prompts/content?agent=<agent>&layer=<layer>。只读。
      - agent: "shopping" 或 "merchant"
      - layer: shopping 可选 static/dynamic/tools/skills/memory；
               merchant 额外可选 analysis

    返回 {"agent","layer","content","overridden"}；非法组合返回带 error 的 dict。
    """
    return await _request(
        "GET", "/api/prompts/content", params={"agent": agent, "layer": layer}
    )


@mcp.tool()
async def override_prompt(agent: str, layer: str, content: str) -> dict[str, Any]:
    """覆盖某 Agent 的系统提示词并立即重建两个 Agent。对应 POST /api/prompts（写操作）。

    demo API 只支持覆盖「static（静态系统提示词）」这一层；agent 取 "shopping"
    或 "merchant"。其它 layer 在后端无对应入口，本工具会直接返回带 error 的 dict，
    不会静默忽略。
      - agent: "shopping" 或 "merchant"
      - layer: 必须是 "static"
      - content: 新的静态系统提示词（空白字符串 = 清空覆盖、回退上游默认）

    写操作会立即重建 Agent。返回结构同 get_prompts()；失败返回带 error 的 dict。
    """
    if layer != "static":
        return {
            "error": (
                f"layer '{layer}' 不可覆盖：后端仅支持覆盖 'static' 层"
            )
        }
    body = {"agent": agent, "static_system": content}
    return await _request("POST", "/api/prompts", json_body=body)


@mcp.tool()
async def reset_prompt() -> dict[str, Any]:
    """清空全部已存的提示词覆盖（恢复上游默认）并重建 Agent。对应
    DELETE /api/prompts（写操作）。返回结构同 get_prompts()；失败返回带 error 的 dict。
    """
    return await _request("DELETE", "/api/prompts")


# ---------------------------------------------------------------------------
# 数据源面（/api/backends）
# ---------------------------------------------------------------------------


@mcp.tool()
async def get_backends() -> dict[str, Any]:
    """读取数据源连接器状态：当前 active 适配器、注册表（每个适配器的连接字段与
    实时连接/降级状态）、熔断计数。对应 GET /api/backends。只读，无副作用。
    """
    return await _request("GET", "/api/backends")


@mcp.tool()
async def set_backend(
    active: str, connection: dict[str, Any] | None = None
) -> dict[str, Any]:
    """切换数据源适配器并（可选）保存其连接参数，随后重建数据源与两个 Agent。
    对应 POST /api/backends（写操作）。

      - active: 注册表中的适配器 id，当前为 "mock-local"（内置演示数据）或
        "remote-catalog"（远端商品源，只读）
      - connection: 远端类适配器需要的连接字段 {"base_url","api_key","timeout_s"}；
        api_key 留空（或省略）则不传该键，保留已存的密钥；非远端适配器可传 None

    写操作会立即重建 Agent。返回结构同 get_backends()；失败返回带 error 的 dict。
    """
    conn = None
    if connection:
        conn = dict(connection)
        # 与后端一致：空白 api_key 不覆盖已存密钥，本工具直接不传该键。
        if not str(conn.get("api_key", "")).strip():
            conn.pop("api_key", None)
    body = {"active": active, "connection": conn}
    return await _request("POST", "/api/backends", json_body=body)


@mcp.tool()
async def reset_backend() -> dict[str, Any]:
    """清空数据源覆盖（恢复内置演示数据）并重建 Agent。对应 DELETE /api/backends
    （写操作）。返回结构同 get_backends()；失败返回带 error 的 dict。
    """
    return await _request("DELETE", "/api/backends")


@mcp.tool()
async def ping_backend(
    base_url: str, api_key: str = "", timeout_s: int = 5
) -> dict[str, Any]:
    """对某个连接配置发起健康检查（不落盘、不切换），供「测试连接」使用。
    对应 POST /api/backends/ping。

      - base_url: 远端根地址，会对其 {base_url}/health 发 GET
      - api_key: 可选，放入 X-API-Key 头；留空则不带
      - timeout_s: 超时秒数，默认 5

    返回 {"ok": bool, "latency_ms": int, "error": str|None}；网络失败返回
    {"ok": False, "latency_ms": 0, "error": ...}，不会抛异常。
    """
    body = {
        "base_url": base_url,
        "api_key": api_key,
        "timeout_s": float(timeout_s),
    }
    return await _request("POST", "/api/backends/ping", json_body=body)


# ---------------------------------------------------------------------------
# 聚合健康检查
# ---------------------------------------------------------------------------


@mcp.tool()
async def health_check() -> dict[str, Any]:
    """汇总三个配置服务的健康：对 /api/models、/api/prompts、/api/backends 各 GET
    一次，返回每个服务的 ok / status_code，以及整体 ok。

    这是只读探测，不包含数据面（店面/商家端）或进程存活检查——后者属于设计文档
    第二批（进程管理工具），不在本批范围。
    """
    services: dict[str, Any] = {}
    for name, path in (
        ("models", "/api/models"),
        ("prompts", "/api/prompts"),
        ("backends", "/api/backends"),
    ):
        result = await _request("GET", path, timeout=10.0)
        if "error" in result:
            services[name] = {
                "ok": False,
                "error": result["error"],
                "status_code": result.get("status_code"),
            }
        else:
            services[name] = {"ok": True, "status_code": 200}

    overall = all(v.get("ok") for v in services.values())
    return {"ok": overall, "base_url": BASE_URL, "services": services}


# ---------------------------------------------------------------------------
# 第二批：日志读取 + 进程管理（设计稿 v1.1 未决问题 6 第二批）
# ---------------------------------------------------------------------------
#
# 这些工具内部只是「读文件 / 跑 agentctl 子进程」，本身仍是无 shell 的结构化接口，
# 符合平台型 Agent 的权限确认流。进程管理全部委派 scripts/agentctl.py（A2），不在此
# 重写进程逻辑——保证与 agentctl 单一权威一致。


def _tail_lines(path: Path, n: int) -> tuple[list[str], int]:
    """读日志文件最后 n 行（内存只保留 n 行，避免超大日志爆内存）。

    返回 (tail_lines, total_lines)：tail_lines 末尾 n 行（已去掉行尾换行），
    total_lines 为文件总行数（用于判断是否被截断）。行迭代逐行进行，内存占用
    恒定在 O(n)，不会因日志很大而暴涨。
    """
    tail: deque[str] = deque(maxlen=n)
    total = 0
    with open(path, "r", encoding="utf-8", errors="replace") as fh:
        for line in fh:
            tail.append(line.rstrip("\n"))
            total += 1
    return list(tail), total


@mcp.tool()
async def get_logs(service: str = "api", lines: int = 50) -> dict[str, Any]:
    """读取某服务的日志尾部（只读，无副作用）。

    日志归位 logs/（AGENTS.md §1 / agentctl.py）：{REPO_ROOT}/logs/{service}.log。
      - service: 日志来源，api | storefront | merchant（默认 api）
      - lines: 返回末尾行数（默认 50，<=0 时按 1 处理）

    返回结构 {"service", "lines", "content", "truncated": bool}：
      - content: 末尾最多 lines 行，以 "\\n" 连接；文件为空则 content=""
      - truncated: 文件总行数 > lines 时为 True（说明只返回了尾部，前有截断）
    文件不存在返回 {"error": "no log for <service>"}；service 非法返回带 error 的 dict。

    注意：日志可能很大，本工具只读取尾部，不会把整个文件读进内存。
    """
    if service not in VALID_LOG_SERVICES:
        return {
            "error": (
                f"unknown service '{service}'; want one of {VALID_LOG_SERVICES}"
            )
        }
    if lines <= 0:
        lines = 1

    log_path = LOGS_DIR / f"{service}.log"
    if not log_path.exists():
        return {"error": f"no log for {service}"}

    tail, total = await asyncio.to_thread(_tail_lines, log_path, lines)
    return {
        "service": service,
        "lines": lines,
        "content": "\n".join(tail),
        "truncated": total > lines,
    }


async def _run_agentctl(subcommand: str, timeout: float = 240.0) -> dict[str, Any]:
    """同步子进程跑 agentctl 子命令，避免阻塞事件循环（包在 to_thread 里）。

    返回 {"ok": bool, "returncode", "output": stdout+stderr}；超时 / 异常也走
    结构化返回，不让异常冒泡导致工具崩溃。
    """
    try:
        proc = await asyncio.to_thread(
            subprocess.run,
            [sys.executable, str(AGENTCTL), subcommand],
            cwd=str(REPO_ROOT),
            capture_output=True,
            text=True,
            timeout=timeout,
        )
    except subprocess.TimeoutExpired as exc:
        return {
            "ok": False,
            "returncode": None,
            "output": f"agentctl {subcommand} 超时（>{exc.timeout}s）",
            "error": "timeout",
        }
    except Exception as exc:  # 子进程拉起失败等
        return {
            "ok": False,
            "returncode": None,
            "output": "",
            "error": f"{type(exc).__name__}: {exc}",
        }

    output = f"{proc.stdout or ''}{proc.stderr or ''}"
    return {"ok": proc.returncode == 0, "returncode": proc.returncode, "output": output}


@mcp.tool()
async def start_services() -> dict[str, Any]:
    """拉起零售三件套（API :8001 / 店面 :4001 / 商家端 :4101）。

    委派给 scripts/agentctl.py start（A2 单一权威）：日志归位 logs/、PID 记入
    examples/retail/data/.agentctl.pids。已监听的端口会被跳过（reused），不会重复
    拉起；因此重复调用安全（幂等由 agentctl 保证）。

    返回 {"ok": bool, "returncode", "output": stdout+stderr}。output 含各服务就绪
    / 端口复用情况，便于排查。异常（含超时 240s）也走结构化返回，不抛异常。

    依赖：纯 API 验证只需 uvicorn；店面/商家端还需 node 依赖（npm ci）。若只需验证
    配置面工具，start 后等 API 健康端点就绪即可。
    """
    return await _run_agentctl("start", timeout=240.0)


@mcp.tool()
async def stop_services() -> dict[str, Any]:
    """停止本工具拉起的零售三件套（按 pidfile 优雅停止 SIGTERM→SIGKILL）。

    委派给 scripts/agentctl.py stop（A2 单一权威）。幂等：无 pidfile / 进程已不在
    时正常退出，并清理 pidfile。非本工具拉起（reused）的进程不会被停止。

    返回 {"ok": bool, "returncode", "output": stdout+stderr}。异常（含超时 240s）
    也走结构化返回，不抛异常。
    """
    return await _run_agentctl("stop", timeout=240.0)


@mcp.tool()
async def service_status() -> dict[str, Any]:
    """查看零售三件套的进程存活与端口监听状态。

    委派给 scripts/agentctl.py status（A2 单一权威），返回其 stdout/stderr。呈现
    每个服务的 LISTEN / PID / ALIVE / HEALTH。无 pidfile（未通过本工具启动或已 stop）
    时仍会直接探端口，给出当前实际状态。

    返回 {"ok": bool, "returncode", "output": stdout+stderr}。注意：status 在部分服务
    未就绪时返回非 0（见 agentctl 实现），此处 ok 直接映射 returncode==0，供参考。
    """
    return await _run_agentctl("status", timeout=60.0)


# ---------------------------------------------------------------------------
# 第三批：Agent-native 安装（bootstrap 工具，设计稿 Agent 接入面 A3 扩展）
# ---------------------------------------------------------------------------
#
# 平台型 Agent（WorkBuddy 等只给工具不给 shell）也能一键装依赖 / 校验安装态，
# 无需人逐条敲命令。底层仍然委托 scripts/bootstrap.sh 与本地文件探测，保证与 A1/A2
# 同一套权威，且写操作走权限确认流。


async def _run_shell(cmd: list[str], timeout: float = 600.0) -> dict[str, Any]:
    """同步子进程跑一条 shell 命令（包在 to_thread，避免阻塞事件循环）。

    返回 {"ok": bool, "returncode", "output": stdout+stderr}；超时 / 异常也走结构化
    返回，不让异常冒泡导致工具崩溃。
    """
    try:
        proc = await asyncio.to_thread(
            subprocess.run,
            cmd,
            cwd=str(REPO_ROOT),
            capture_output=True,
            text=True,
            timeout=timeout,
        )
    except subprocess.TimeoutExpired as exc:
        return {
            "ok": False,
            "returncode": None,
            "output": f"{' '.join(cmd)} 超时（>{exc.timeout}s）",
            "error": "timeout",
        }
    except Exception as exc:  # 命令拉起失败等
        return {
            "ok": False,
            "returncode": None,
            "output": "",
            "error": f"{type(exc).__name__}: {exc}",
        }

    output = f"{proc.stdout or ''}{proc.stderr or ''}"
    return {"ok": proc.returncode == 0, "returncode": proc.returncode, "output": output}


@mcp.tool()
async def bootstrap_install() -> dict[str, Any]:
    """一键安装项目依赖（Agent-native 安装入口）：建 venv、装 Python 依赖、装前端
    依赖、落 .env。委派给 scripts/bootstrap.sh（底层已含国内镜像加速与失败回退）。

    这是写操作（会改本地 .venv / node_modules / .env），平台型 Agent 触发时走权限确认流。
    不自动起服务——key 配好后由 start_services() 拉起。脚本幂等，可重复调用。

    返回 {"ok": bool, "returncode", "output": stdout+stderr}；output 含各步结果，便于排查。
    异常（含超时 600s）也走结构化返回，不抛异常。
    """
    if not BOOTSTRAP.exists():
        return {"ok": False, "returncode": None, "output": "", "error": "bootstrap.sh 不存在"}
    return await _run_shell(["bash", str(BOOTSTRAP)], timeout=600.0)


@mcp.tool()
async def check_install() -> dict[str, Any]:
    """校验安装态（只读，无副作用）：检查 venv、前端依赖、.env 是否就绪。

    返回结构化 dict：
      - venv: bool（.venv 是否存在）
      - python_deps: bool（.venv 内能否 import 关键包，如 fastapi / mcp）
      - node_deps: bool（examples/node_modules 是否存在）
      - env_file: bool（根 .env 是否存在）
      - env_has_key: bool（.env 是否含非空 ANTHROPIC_API_KEY）
      - ready: bool（上述全部满足，可起服务）
      - notes: 缺失项的提示列表

    不跑任何安装命令，只探测现状。
    """
    venv = (REPO_ROOT / ".venv").is_dir()
    node_deps = (REPO_ROOT / "examples" / "node_modules").is_dir()
    env_file = (REPO_ROOT / ".env").is_file()

    python_deps = False
    if venv:
        probe = (
            f"import importlib.util as u; "
            f"print('OK' if all(u.find_spec(m) for m in ['fastapi','mcp','uvicorn']) else 'MISSING')"
        )
        try:
            res = await asyncio.to_thread(
                subprocess.run,
                [str(REPO_ROOT / ".venv" / "bin" / "python"), "-c", probe],
                capture_output=True,
                text=True,
                timeout=30.0,
                cwd=str(REPO_ROOT),
            )
            python_deps = res.stdout.strip() == "OK"
        except Exception:
            python_deps = False

    env_has_key = False
    if env_file:
        try:
            for line in (REPO_ROOT / ".env").read_text(encoding="utf-8").splitlines():
                if line.startswith("ANTHROPIC_API_KEY=") and line.split("=", 1)[1].strip():
                    env_has_key = True
                    break
        except Exception:
            env_has_key = False

    notes: list[str] = []
    if not venv:
        notes.append("缺 .venv：运行 bootstrap_install() 或 bash scripts/bootstrap.sh")
    if venv and not python_deps:
        notes.append("Python 依赖未装全：重跑 bootstrap_install()")
    if not node_deps:
        notes.append("前端依赖未装：重跑 bootstrap_install()")
    if not env_file:
        notes.append("缺 .env：运行 bootstrap_install() 会落一份 .env.example 副本")
    if env_file and not env_has_key:
        notes.append(".env 尚未配置 ANTHROPIC_API_KEY，服务起不来")

    return {
        "venv": venv,
        "python_deps": python_deps,
        "node_deps": node_deps,
        "env_file": env_file,
        "env_has_key": env_has_key,
        "ready": bool(venv and python_deps and node_deps and env_file and env_has_key),
        "notes": notes,
    }


if __name__ == "__main__":
    # 以 stdio 传输启动，供 WorkBuddy 等通过 mcp.json 的 command 直接拉起。
    mcp.run(transport="stdio")
