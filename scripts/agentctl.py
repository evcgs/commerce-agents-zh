#!/usr/bin/env python3
# Copyright 2026 Anthropic PBC
# SPDX-License-Identifier: Apache-2.0

"""A2 agentctl — 进程管理 CLI（设计稿 v1.1 §4.4 / §4.5）。

A2 是 commerce-agents 中文化发行版的“Agent 操作平面”：用一条命令拉起 / 停止 /
查看零售三件套（本机变体 API :8001、店面 :4001、商家端 :4101），并对 Agent 改码前
的后悔药——git 快照 / 回滚——提供前置与恢复命令。

    python scripts/agentctl.py start          # 拉起三服务，日志归位 logs/，PID 记入 pidfile
    python scripts/agentctl.py stop           # 按 pidfile 优雅停止（SIGTERM→SIGKILL），幂等
    python scripts/agentctl.py status         # 端口监听 / 进程存活 / 三健康端点 ok|fail
    python scripts/agentctl.py verify         # 轻量三端点健康检查（不依赖 .venv / node_modules）
    python scripts/agentctl.py snapshot       # 改码前：git stash push -u -m agentctl-snapshot-<时间戳>
    python scripts/agentctl.py rollback [id]  # 回滚：git stash pop（无 id）或 git stash apply <id>

端口可被环境变量覆盖：AGENTCTL_API_PORT（默认 8001）、AGENTCTL_STORE_PORT（4001）、
AGENTCTL_MERCH_PORT（4101）。NEXT_PUBLIC_API_URL 默认 http://127.0.0.1:8001（见 AGENTS.md）。

所有本机 127.0.0.1 探测与健康 curl 都绕过系统代理（AGENTS.md §6：代理会劫持 loopback），
做法是对 urllib 显式注入空 ProxyHandler，等价于 trust_env=False。
"""

from __future__ import annotations

import argparse
import json
import os
import signal
import socket
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import quote
from urllib.request import ProxyHandler, Request, build_opener, urlopen

REPO_ROOT = Path(__file__).resolve().parents[1]
EXAMPLES_DIR = REPO_ROOT / "examples"
NEXT = EXAMPLES_DIR / "node_modules" / ".bin" / "next"
DATA_DIR = EXAMPLES_DIR / "retail" / "data"
LOGS_DIR = REPO_ROOT / "logs"
PIDFILE = DATA_DIR / ".agentctl.pids"

# 默认端口（AGENTS.md §5 作者环境变体）。
DEFAULT_API_PORT = int(os.environ.get("AGENTCTL_API_PORT", "8001"))
DEFAULT_STORE_PORT = int(os.environ.get("AGENTCTL_STORE_PORT", "4001"))
DEFAULT_MERCH_PORT = int(os.environ.get("AGENTCTL_MERCH_PORT", "4101"))

# 健康端点（设计稿指定）：API /api/backends，两个前端 /。
API_HEALTH = "/api/backends"
WEB_HEALTH = "/"

# 优雅停止时限：先 SIGTERM，超时再 SIGKILL。
STOP_TERM_TIMEOUT_S = 10

GREEN, RED, YELLOW, DIM, RESET = (
    "\033[32m",
    "\033[31m",
    "\033[33m",
    "\033[2m",
    "\033[0m",
)

_VERBOSE = False


def log(message: str = "") -> None:
    print(message)


def info(message: str) -> None:
    print(f"{DIM}# {message}{RESET}")


def ok(message: str) -> None:
    print(f"{GREEN}✓{RESET} {message}")


def warn(message: str) -> None:
    print(f"{YELLOW}! {message}{RESET}")


def fail(message: str) -> None:
    print(f"{RED}✗{RESET} {message}")


# ---------------------------------------------------------------------------
# 代理无关的 HTTP / 端口探测
# ---------------------------------------------------------------------------


def http_status(url: str, timeout: float = 5) -> int | None:
    """返回 HTTP 状态码；连接拒绝 / 超时返回 None。

    4xx/5xx 也返回真实状态码（便于 verify 区分“拒绝连接”与“500”）。
    显式注入空 ProxyHandler，绕过 http_proxy / https_proxy 对 127.0.0.1 的劫持。
    """
    opener = build_opener(ProxyHandler({}))
    try:
        with opener.open(Request(url, method="GET"), timeout=timeout) as resp:
            return resp.status
    except HTTPError as error:
        return error.code
    except Exception:
        return None


def endpoint_ok(url: str, timeout: float = 5) -> bool:
    return http_status(url, timeout) == 200


def api_base(args: argparse.Namespace) -> str:
    """配置面子命令用的 API base：默认 8001，可用 --api-port 覆盖。"""
    api_port = args.api_port or DEFAULT_API_PORT
    return f"http://127.0.0.1:{api_port}"


def api_request(method: str, url: str, body: dict | None = None, timeout: float = 10) -> dict:
    """配置面专用 HTTP：自建空 ProxyHandler，绕过系统代理对 127.0.0.1 的劫持。

    成功（2xx）返回解析后的 JSON（空响应返回 ``{}``）。非 2xx 打印 error / detail
    字段并以退出码 1 终止（不向上抛，由 main 的 SystemExit 处理）。
    """
    opener = build_opener(ProxyHandler({}))
    data = (
        json.dumps(body, ensure_ascii=False).encode("utf-8") if body is not None else None
    )
    req = Request(url, data=data, method=method)
    if data is not None:
        req.add_header("Content-Type", "application/json")
    try:
        with opener.open(req, timeout=timeout) as resp:
            raw = resp.read().decode("utf-8", "replace")
            return json.loads(raw) if raw else {}
    except HTTPError as error:
        raw = error.read().decode("utf-8", "replace")
        try:
            payload = json.loads(raw)
            msg = payload.get("error") or payload.get("detail") or raw
        except Exception:
            msg = raw or str(error)
        fail(f"{method} {url} → HTTP {error.code}: {msg}")
        raise SystemExit(1)
    except Exception as error:
        fail(f"{method} {url} 请求失败：{error}")
        raise SystemExit(1)


def api_print(data: dict) -> None:
    """统一打印 JSON 响应（中文不转义、缩进 2）。"""
    print(json.dumps(data, ensure_ascii=False, indent=2))


def port_in_use(port: int, host: str = "127.0.0.1") -> bool:
    """socket 直连判断端口是否有人监听（不区分所属进程）。"""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.settimeout(0.5)
        return sock.connect_ex((host, port)) == 0


def pid_for_listening_port(port: int) -> int | None:
    """尽力用 lsof 反查监听该端口的 PID（无 lsof 或查不到时返回 None）。"""
    if not shutil_which("lsof"):
        return None
    try:
        result = subprocess.run(
            ["lsof", "-nP", f"-iTCP:{port}", "-sTCP:LISTEN"],
            capture_output=True,
            text=True,
            timeout=5,
        )
    except Exception:
        return None
    for line in result.stdout.splitlines()[1:]:
        parts = line.split()
        if len(parts) >= 2 and parts[1].isdigit():
            return int(parts[1])
    return None


def process_alive(pid: int) -> bool:
    if pid is None:
        return False
    try:
        os.kill(pid, 0)
    except ProcessLookupError:
        return False
    except PermissionError:
        return True
    return True


def shutil_which(name: str) -> str | None:
    from shutil import which

    return which(name)


# ---------------------------------------------------------------------------
# 子进程拉起
# ---------------------------------------------------------------------------


def next_command() -> list[str]:
    """优先用 workspace 内 next 二进制，缺失则回退 PATH 上的 next（需 npm ci 已装）。"""
    if NEXT.exists():
        return [str(NEXT)]
    return ["next"]


def build_services(api_port: int, store_port: int, merch_port: int) -> list[dict]:
    api_url = os.environ.get("NEXT_PUBLIC_API_URL") or f"http://127.0.0.1:{api_port}"
    api_cmd = [
        sys.executable,
        "-m",
        "uvicorn",
        "retail.api.main:app",
        "--app-dir",
        str(EXAMPLES_DIR),
        "--port",
        str(api_port),
    ]
    web_env = {**os.environ, "NEXT_PUBLIC_API_URL": api_url}

    def web_cmd(port: int) -> list[str]:
        return [*next_command(), "dev", "--port", str(port)]

    return [
        {
            "name": "api",
            "label": "API (retail)",
            "port": api_port,
            "log": LOGS_DIR / "api.log",
            "health": f"http://127.0.0.1:{api_port}{API_HEALTH}",
            "cmd": api_cmd,
            "cwd": REPO_ROOT,
            "env": os.environ.copy(),
            "start_timeout": 90,
        },
        {
            "name": "storefront",
            "label": "店面 (storefront-web)",
            "port": store_port,
            "log": LOGS_DIR / "storefront.log",
            "health": f"http://127.0.0.1:{store_port}{WEB_HEALTH}",
            "cmd": web_cmd(store_port),
            "cwd": EXAMPLES_DIR / "retail" / "storefront-web",
            "env": web_env,
            "start_timeout": 180,
        },
        {
            "name": "merchant",
            "label": "商家端 (merchant-web)",
            "port": merch_port,
            "log": LOGS_DIR / "merchant.log",
            "health": f"http://127.0.0.1:{merch_port}{WEB_HEALTH}",
            "cmd": web_cmd(merch_port),
            "cwd": EXAMPLES_DIR / "retail" / "merchant-web",
            "env": web_env,
            "start_timeout": 180,
        },
    ]


# 在 WorkBuddy 等沙箱里运行时，这些环境变量会让 node 把所有文件读写经一个
# 已失效的 broker 套接字转发，导致 Next.js 启动即 500（connect refused）。子进程
# 启动时剥掉它们，让 node 用真实文件系统；正常终端下这些变量本就为空，无副作用。
_CHILD_UNSAFE_ENV = {
    "NODE_OPTIONS",
    "CODEBUDDY_BROKERED_FS_HOOK_ENABLED",
    "CODEBUDDY_SANDBOX_BROKER_IPC_ADDRESS",
    "TOYBOX_SANDBOX_SOCK",
    "CODEBUDDY_DOCUMENT_IPC_ADDRESS",
}


def _clean_child_env(env: dict[str, str]) -> dict[str, str]:
    return {k: v for k, v in env.items() if k not in _CHILD_UNSAFE_ENV}


def spawn_service(svc: dict) -> dict:
    """拉起一个服务，返回写进 pidfile 的记录字典。已监听端口则跳过并标记 reused。"""
    port = svc["port"]
    if port_in_use(port):
        pid = pid_for_listening_port(port)
        info(f"{svc['label']} 端口 :{port} 已在监听 —— 跳过拉起（reused）")
        return {
            "name": svc["name"],
            "port": port,
            "pid": pid,
            "owned": False,
            "log": str(svc["log"]),
            "health": svc["health"],
            "reused": True,
        }

    LOGS_DIR.mkdir(parents=True, exist_ok=True)
    handle = open(svc["log"], "ab")
    try:
        proc = subprocess.Popen(
            svc["cmd"],
            cwd=svc["cwd"],
            env=_clean_child_env(svc["env"]),
            stdout=handle,
            stderr=handle,
            start_new_session=True,  # 独立进程组，stop 可整树回收
        )
    finally:
        handle.close()  # Popen 已 dup fd，父进程可关
    ok(f"{svc['label']} 已拉起 PID={proc.pid} → {svc['log']}")
    return {
        "name": svc["name"],
        "port": port,
        "pid": proc.pid,
        "owned": True,
        "log": str(svc["log"]),
        "health": svc["health"],
        "reused": False,
    }


def write_pidfile(records: list[dict]) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    PIDFILE.write_text(json.dumps(records, indent=2, ensure_ascii=False), encoding="utf-8")


def read_pidfile() -> list[dict]:
    if not PIDFILE.exists():
        return []
    try:
        data = json.loads(PIDFILE.read_text(encoding="utf-8"))
        return data if isinstance(data, list) else []
    except Exception:
        return []


def poll_until_ready(records: list[dict], overall_timeout: float = 200) -> bool:
    """轮询各服务健康端点，直到全部 200 或超时。reused 服务也会探测。"""
    pending = {r["name"]: r for r in records}
    deadline = time.monotonic() + overall_timeout
    while pending and time.monotonic() < deadline:
        for name in list(pending):
            rec = pending[name]
            if endpoint_ok(rec["health"]):
                ok(f"{name} 健康端点就绪 ({rec['health']})")
                pending.pop(name)
        if pending:
            time.sleep(1.0)
    if pending:
        fail(f"以下服务在超时内未就绪：{', '.join(pending)}")
        return False
    return True


# ---------------------------------------------------------------------------
# 子命令实现
# ---------------------------------------------------------------------------


def cmd_start(args: argparse.Namespace) -> int:
    api_port = args.api_port or DEFAULT_API_PORT
    store_port = args.store_port or DEFAULT_STORE_PORT
    merch_port = args.merch_port or DEFAULT_MERCH_PORT

    services = build_services(api_port, store_port, merch_port)
    records: list[dict] = []
    for svc in services:
        records.append(spawn_service(svc))

    write_pidfile(records)
    info(f"pidfile 已写入 {PIDFILE}")

    if not poll_until_ready(records):
        warn("部分服务未就绪；可用 `agentctl status` 复查，或看 logs/ 下日志。")
        return 1
    ok("三服务全部就绪。")
    for rec in records:
        print(f"  {rec['name']:<12} http://127.0.0.1:{rec['port']}")
    return 0


def cmd_stop(args: argparse.Namespace) -> int:
    records = read_pidfile()
    if not records:
        info("无 pidfile / 无记录 —— 已是无进程状态，正常退出。")
        return 0

    for rec in records:
        pid = rec.get("pid")
        name = rec.get("name", "?")
        if not rec.get("owned", False):
            info(f"{name}: 非本工具拉起（reused），跳过停止。")
            continue
        if pid is None or not process_alive(pid):
            info(f"{name}: PID={pid} 已不在，跳过。")
            continue
        try:
            os.killpg(os.getpgid(pid), signal.SIGTERM)
        except (ProcessLookupError, PermissionError):
            try:
                os.kill(pid, signal.SIGTERM)
            except Exception:
                pass
        except Exception:
            try:
                os.kill(pid, signal.SIGTERM)
            except Exception:
                pass

    # 等优雅退出，超时再 SIGKILL。
    deadline = time.monotonic() + STOP_TERM_TIMEOUT_S
    alive = [r for r in records if r.get("owned") and r.get("pid") and process_alive(r["pid"])]
    while alive and time.monotonic() < deadline:
        time.sleep(0.5)
        alive = [r for r in alive if process_alive(r["pid"])]
    for rec in alive:
        pid = rec["pid"]
        warn(f"{rec['name']}: SIGTERM 超时，发送 SIGKILL (PID={pid})。")
        try:
            os.killpg(os.getpgid(pid), signal.SIGKILL)
        except Exception:
            try:
                os.kill(pid, signal.SIGKILL)
            except Exception:
                pass

    # 幂等：无论 pidfile 是否存在都清理。
    if PIDFILE.exists():
        PIDFILE.unlink()
    ok("已停止本工具拉起的服务并清理 pidfile。")
    return 0


def _status_rows(records: list[dict]) -> list[dict]:
    rows = []
    pidfile_present = PIDFILE.exists()
    for rec in records:
        port = rec["port"]
        listening = port_in_use(port)
        pid = rec.get("pid")
        alive = process_alive(pid) if rec.get("owned") else (listening if pid is None else False)
        healthy = endpoint_ok(rec["health"])
        rows.append(
            {
                "name": rec["name"],
                "port": port,
                "listening": listening,
                "pid": pid,
                "alive": alive,
                "healthy": healthy,
                "owned": rec.get("owned", False),
                "reused": rec.get("reused", False),
                "health": rec["health"],
                "log": rec.get("log"),
            }
        )
    return rows, pidfile_present


def cmd_status(args: argparse.Namespace) -> int:
    records = read_pidfile()
    if not records:
        warn("pidfile 不存在 —— 未通过本工具启动（或用 stop 清理过）。")
        # 仍尝试直接探端口，给出当前实际状态。
        for port in (args.api_port or DEFAULT_API_PORT,
                     args.store_port or DEFAULT_STORE_PORT,
                     args.merch_port or DEFAULT_MERCH_PORT):
            state = "listening" if port_in_use(port) else "free"
            print(f"  :{port:<5} {state}")
        return 0

    rows, pidfile_present = _status_rows(records)
    print(f"{'SERVICE':<12}{'PORT':<7}{'LISTEN':<8}{'PID':<8}{'ALIVE':<8}HEALTH")
    all_ok = True
    for r in rows:
        listen = "yes" if r["listening"] else "no"
        alive = "yes" if r["alive"] else "no"
        healthy = "ok" if r["healthy"] else "fail"
        pid = str(r["pid"]) if r["pid"] is not None else "-"
        if not (r["listening"] and r["healthy"]):
            all_ok = False
        print(
            f"{r['name']:<12}{r['port']:<7}{listen:<8}{pid:<8}{alive:<8}{healthy}"
        )
        print(f"{DIM}            health: {r['health']}{RESET}")
        if args.verbose:
            print(f"{DIM}            log: {r['log']}{RESET}")

    running = pidfile_present and all(
        (not r["owned"]) or (r["pid"] is not None and process_alive(r["pid"])) for r in rows
    )
    print()
    if running:
        ok("running（pidfile 存在且本工具拉起的进程均在）。")
    else:
        warn("not running / 部分不在（见上表）。")
    return 0 if all_ok else 1


def cmd_verify(args: argparse.Namespace) -> int:
    api_port = args.api_port or DEFAULT_API_PORT
    store_port = args.store_port or DEFAULT_STORE_PORT
    merch_port = args.merch_port or DEFAULT_MERCH_PORT
    targets = [
        ("api", f"http://127.0.0.1:{api_port}{API_HEALTH}"),
        ("storefront", f"http://127.0.0.1:{store_port}{WEB_HEALTH}"),
        ("merchant", f"http://127.0.0.1:{merch_port}{WEB_HEALTH}"),
    ]
    failures = []
    for name, url in targets:
        status = http_status(url, timeout=5)
        if status == 200:
            ok(f"{name}: 200 {url}")
        else:
            msg = f"{status}" if status is not None else "no-response"
            fail(f"{name}: {msg} {url}")
            failures.append(name)
    print()
    if failures:
        fail(f"FAILED: {', '.join(failures)} 未通过健康检查。")
        return 1
    ok("OK")
    return 0


def cmd_snapshot(args: argparse.Namespace) -> int:
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    message = f"agentctl-snapshot-{stamp}"
    # 先探是否有可快照的内容（含未跟踪），避免空仓误报失败。
    probe = subprocess.run(
        ["git", "-C", str(REPO_ROOT), "status", "--porcelain"],
        capture_output=True,
        text=True,
    )
    if probe.returncode != 0:
        fail(f"git status 失败：{probe.stderr.strip()}")
        return 1
    if not probe.stdout.strip():
        info("工作树干净、无未跟踪文件 —— 无需快照。")
        return 0
    # 排除工具自身路径（scripts/agentctl.py、mcp/）：否则连未跟踪的工具文件一起
    # 收进快照后，rollback 会因工具文件消失而无法运行。提交后这些文件转为已跟踪，
    # stash 仅收用户改动、工具仍在，rollback 可正常执行；此排除作为防御性兜底。
    result = subprocess.run(
        [
            "git", "-C", str(REPO_ROOT), "stash", "push", "-u", "-m", message,
            "--", ":!scripts/agentctl.py", ":!mcp/",
        ],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        err = (result.stderr or result.stdout).strip()
        # 排除后无剩余可存内容（例如只有工具自身文件未跟踪）属正常情况。
        if "No local changes to save" in err:
            info("排除工具自身路径后无可快照内容 —— 无需快照。")
            return 0
        fail(f"git stash 失败：{err}")
        return 1
    # 取刚生成 stash 的标识：message + commit 哈希。
    hash_result = subprocess.run(
        ["git", "-C", str(REPO_ROOT), "rev-parse", "stash@{0}"],
        capture_output=True,
        text=True,
    )
    stash_hash = hash_result.stdout.strip() if hash_result.returncode == 0 else "?"
    ok(f"已创建快照：{message}")
    print(f"  stash 标识: {message}")
    print(f"  commit:    {stash_hash}")
    print(f"  {DIM}回滚：python scripts/agentctl.py rollback [{stash_hash[:8]}]{RESET}")
    return 0


def cmd_rollback(args: argparse.Namespace) -> int:
    if args.stash_id:
        verb, target = "apply", args.stash_id
        result = subprocess.run(
            ["git", "-C", str(REPO_ROOT), "stash", "apply", args.stash_id],
            capture_output=True,
            text=True,
        )
    else:
        verb, target = "pop", "stash@{0}"
        result = subprocess.run(
            ["git", "-C", str(REPO_ROOT), "stash", "pop"],
            capture_output=True,
            text=True,
        )
    out = (result.stdout + result.stderr).strip()
    if result.returncode != 0:
        fail(f"git stash {verb} 失败：{out}")
        return 1
    ok(f"已回滚（stash {verb} {target}）。")
    if out:
        print(f"  {DIM}{out}{RESET}")
    return 0


# ---------------------------------------------------------------------------
# 配置面子命令：models / prompts / backends（A2 让 shell 型 Agent 也能调 API 配置端点）
# ---------------------------------------------------------------------------


def cmd_models(args: argparse.Namespace) -> int:
    base = api_base(args)
    if args.action == "get":
        api_print(api_request("GET", f"{base}/api/models"))
        return 0
    if args.action == "set":
        # 部分更新语义：仅下发显式传入且非空白的键（对齐 ModelSettingsRequest）。
        body: dict = {}
        for field, value in (
            ("model", args.model),
            ("merchant_model", args.merchant_model),
            ("memory_model", args.memory_model),
            ("analysis_model", args.analysis_model),
            ("thinking_effort", args.thinking_effort),
            ("base_url", args.base_url),
            ("api_key", args.api_key),
        ):
            if value is not None and str(value).strip():
                body[field] = value
        api_print(api_request("POST", f"{base}/api/models", body))
        return 0
    if args.action == "reset":
        api_print(api_request("DELETE", f"{base}/api/models"))
        return 0
    return 1


def cmd_prompts(args: argparse.Namespace) -> int:
    base = api_base(args)
    if args.action == "list":
        api_print(api_request("GET", f"{base}/api/prompts"))
        return 0
    if args.action == "get":
        url = (
            f"{base}/api/prompts/content"
            f"?agent={quote(args.agent)}&layer={quote(args.layer)}"
        )
        api_print(api_request("GET", url))
        return 0
    if args.action == "override":
        # 后端仅支持 static 层；非 static 直接报错提示，避免下发无效请求。
        if args.layer != "static":
            fail(f"后端仅支持 static 层的覆盖；当前 layer={args.layer!r}，请改用 --layer static。")
            return 1
        body = {"agent": args.agent, "static_system": args.content}
        api_print(api_request("POST", f"{base}/api/prompts", body))
        return 0
    if args.action == "reset":
        url = f"{base}/api/prompts?agent={quote(args.agent)}"
        api_print(api_request("DELETE", url))
        return 0
    return 1


def cmd_backends(args: argparse.Namespace) -> int:
    base = api_base(args)
    if args.action == "get":
        api_print(api_request("GET", f"{base}/api/backends"))
        return 0
    if args.action == "set":
        # connection 仅在至少一个字段显式传入时才下发；api_key/timeout_s 缺失则不出现该键。
        connection: dict = {}
        if args.base_url is not None and args.base_url.strip():
            connection["base_url"] = args.base_url.strip()
        if args.api_key is not None and args.api_key.strip():
            connection["api_key"] = args.api_key.strip()
        if args.timeout_s is not None:
            connection["timeout_s"] = args.timeout_s
        body: dict = {"active": args.active}
        if connection:
            body["connection"] = connection
        api_print(api_request("POST", f"{base}/api/backends", body))
        return 0
    if args.action == "reset":
        api_print(api_request("DELETE", f"{base}/api/backends"))
        return 0
    if args.action == "ping":
        body = {"base_url": args.base_url or ""}
        if args.api_key is not None:
            body["api_key"] = args.api_key
        if args.timeout_s is not None:
            body["timeout_s"] = args.timeout_s
        api_print(api_request("POST", f"{base}/api/backends/ping", body))
        return 0
    return 1


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="agentctl",
        description="A2 agentctl — commerce-agents-zh 进程管理 CLI（设计稿 v1.1 §4.4/§4.5）。",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    sub = parser.add_subparsers(dest="command", required=True)

    p_start = sub.add_parser("start", help="拉起三服务（API / 店面 / 商家端）")
    p_start.add_argument("--api-port", type=int, help="API 端口（默认 AGENTCTL_API_PORT=8001）")
    p_start.add_argument("--store-port", type=int, help="店面端口（默认 AGENTCTL_STORE_PORT=4001）")
    p_start.add_argument("--merch-port", type=int, help="商家端口（默认 AGENTCTL_MERCH_PORT=4101）")
    p_start.set_defaults(func=cmd_start)

    p_stop = sub.add_parser("stop", help="按 pidfile 优雅停止（SIGTERM→SIGKILL），幂等")
    p_stop.set_defaults(func=cmd_stop)

    p_status = sub.add_parser("status", help="端口监听 / 进程存活 / 三健康端点")
    p_status.add_argument("--api-port", type=int, help="API 端口")
    p_status.add_argument("--store-port", type=int, help="店面端口")
    p_status.add_argument("--merch-port", type=int, help="商家端口")
    p_status.add_argument("-v", "--verbose", action="store_true", help="额外打印日志路径")
    p_status.set_defaults(func=cmd_status)

    p_verify = sub.add_parser("verify", help="轻量三端点健康检查（不依赖 .venv/node_modules）")
    p_verify.add_argument("--api-port", type=int, help="API 端口")
    p_verify.add_argument("--store-port", type=int, help="店面端口")
    p_verify.add_argument("--merch-port", type=int, help="商家端口")
    p_verify.set_defaults(func=cmd_verify)

    p_snapshot = sub.add_parser("snapshot", help="改码前：git stash push -u 建快照")
    p_snapshot.set_defaults(func=cmd_snapshot)

    p_rollback = sub.add_parser("rollback", help="回滚：git stash pop / apply <id>")
    p_rollback.add_argument("stash_id", nargs="?", help="stash 标识（省略则 pop 最新）")
    p_rollback.set_defaults(func=cmd_rollback)

    # ---- 配置面：models / prompts / backends（A2 让 shell 型 Agent 也能调 API 配置端点）----
    def _add_api_port(parser: argparse.ArgumentParser) -> None:
        parser.add_argument(
            "--api-port", type=int, help="API 端口（默认 AGENTCTL_API_PORT=8001）"
        )

    # models 组
    p_models = sub.add_parser("models", help="模型配置端点 /api/models 的操作")
    models_sub = p_models.add_subparsers(dest="action", required=True)

    p_models_get = models_sub.add_parser("get", help="GET /api/models（查看当前模型配置）")
    p_models_get.set_defaults(func=cmd_models, action="get")
    _add_api_port(p_models_get)

    p_models_set = models_sub.add_parser("set", help="POST /api/models（部分更新模型配置）")
    p_models_set.add_argument("--model", help="主模型名")
    p_models_set.add_argument("--merchant-model", help="商家端模型名")
    p_models_set.add_argument("--memory-model", help="记忆模型名")
    p_models_set.add_argument("--analysis-model", help="分析委托模型名")
    p_models_set.add_argument("--thinking-effort", help="思考强度 off|low|medium|high|xhigh|max")
    p_models_set.add_argument("--base-url", help="自定义 API base URL")
    p_models_set.add_argument("--api-key", help="自定义 API key（write-only）")
    p_models_set.set_defaults(func=cmd_models, action="set")
    _add_api_port(p_models_set)

    p_models_reset = models_sub.add_parser("reset", help="DELETE /api/models（重置为默认）")
    p_models_reset.set_defaults(func=cmd_models, action="reset")
    _add_api_port(p_models_reset)

    # prompts 组
    p_prompts = sub.add_parser("prompts", help="提示词配置端点 /api/prompts 的操作")
    prompts_sub = p_prompts.add_subparsers(dest="action", required=True)

    p_prompts_list = prompts_sub.add_parser("list", help="GET /api/prompts（各 agent 各层概览）")
    p_prompts_list.set_defaults(func=cmd_prompts, action="list")
    _add_api_port(p_prompts_list)

    p_prompts_get = prompts_sub.add_parser(
        "get", help="GET /api/prompts/content?agent=X&layer=Y（查看某层渲染文本）"
    )
    p_prompts_get.add_argument("--agent", required=True, help="shopping | merchant")
    p_prompts_get.add_argument(
        "--layer", required=True, help="static|dynamic|tools|skills|memory|analysis"
    )
    p_prompts_get.set_defaults(func=cmd_prompts, action="get")
    _add_api_port(p_prompts_get)

    p_prompts_override = prompts_sub.add_parser(
        "override", help="POST /api/prompts（覆盖某 agent 的 static 系统提示词）"
    )
    p_prompts_override.add_argument("--agent", required=True, help="shopping | merchant")
    p_prompts_override.add_argument(
        "--layer", default="static", help="仅支持 static（默认 static）"
    )
    p_prompts_override.add_argument("--content", required=True, help="新的静态系统提示词文本")
    p_prompts_override.set_defaults(func=cmd_prompts, action="override")
    _add_api_port(p_prompts_override)

    p_prompts_reset = prompts_sub.add_parser(
        "reset", help="DELETE /api/prompts?agent=X（恢复某 agent 的上游默认提示词）"
    )
    p_prompts_reset.add_argument("--agent", required=True, help="shopping | merchant")
    p_prompts_reset.set_defaults(func=cmd_prompts, action="reset")
    _add_api_port(p_prompts_reset)

    # backends 组
    p_backends = sub.add_parser("backends", help="数据源配置端点 /api/backends 的操作")
    backends_sub = p_backends.add_subparsers(dest="action", required=True)

    p_backends_get = backends_sub.add_parser("get", help="GET /api/backends（查看当前数据源）")
    p_backends_get.set_defaults(func=cmd_backends, action="get")
    _add_api_port(p_backends_get)

    p_backends_set = backends_sub.add_parser(
        "set", help="POST /api/backends（切换并配置数据源适配器）"
    )
    p_backends_set.add_argument("--active", required=True, help="适配器 id（如 mock-local|remote-catalog）")
    p_backends_set.add_argument("--base-url", help="远端数据源 base URL")
    p_backends_set.add_argument("--api-key", help="远端数据源 API key（write-only）")
    p_backends_set.add_argument("--timeout-s", type=float, help="连接超时秒数")
    p_backends_set.set_defaults(func=cmd_backends, action="set")
    _add_api_port(p_backends_set)

    p_backends_reset = backends_sub.add_parser("reset", help="DELETE /api/backends（重置为内置演示数据）")
    p_backends_reset.set_defaults(func=cmd_backends, action="reset")
    _add_api_port(p_backends_reset)

    p_backends_ping = backends_sub.add_parser(
        "ping", help="POST /api/backends/ping（探活远端数据源，不落盘）"
    )
    p_backends_ping.add_argument("--base-url", required=True, help="待探活的 base URL")
    p_backends_ping.add_argument("--api-key", help="远端 API key（放入 X-API-Key 头）")
    p_backends_ping.add_argument("--timeout-s", type=float, help="连接超时秒数")
    p_backends_ping.set_defaults(func=cmd_backends, action="ping")
    _add_api_port(p_backends_ping)

    return parser


def main() -> int:
    args = build_parser().parse_args()
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
