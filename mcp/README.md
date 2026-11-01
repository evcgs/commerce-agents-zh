# commerce-agents-config — A3 FastMCP 工具服务器

> 对应设计文档 `docs/接入系统标准化设计.md` 第 4.4（A3）/ 4.5 / 6 节（未决问题 6）；本发行版相对上游的**差异权威说明**（新增模块 / 新增端点 / 上游核心 4 处最小改动 / 解耦机制 / 零配置诚实说明）见 `docs/本项目与上游差异说明.md`。
> 这是给 **WorkBuddy 等平台型 Agent** 用的 MCP 服务器：平台型 Agent 不给 shell，
> 只给「工具发现 + schema + 权限确认流」。本服务器把 demo API 三个配置面
> （模型 / 提示词 / 数据源）的只读 + 配置写端点，以及聚合健康检查，封装成结构化
> 工具，对应设计文档里「MCP 工具」这一操作面（与 Web 面板、AGENTS.md 共享同一个
> REST 底座，权限模型不做第二套）。

## 范围与权限分级（设计文档 §4.5 / 未决问题 6）

- **第一批（本文件）**：只读（GET）+ 配置写（POST/DELETE）+ 聚合健康检查。
  写操作会立即重建 Agent，属「配置写」档——经 MCP 平台确认流执行。
- **第二批（本文件，已实现）**：日志读取 + 进程管理。日志读取属只读档（只回日志
  尾部、不落盘）；进程管理（`start_services` / `stop_services` / `service_status`）
  委派给 `scripts/agentctl.py`（A2），本服务器**不在 MCP 内重写任何进程逻辑**，与
  agentctl 单一权威一致。启停经 MCP 平台确认流执行，符合平台型 Agent 的权限分级。

> 安全边界：demo API 无鉴权、绑定 127.0.0.1 是唯一防线。本服务器**绝不**将端口
> 暴露到公网；所有写操作与人的面板走同一批端点，权限不双轨。

## 工具清单（共 17 个：第一批 11 + 第二批 4 + 第三批 2）

### 模型面 `/api/models`
| 工具 | 用途 | 端点 |
|---|---|---|
| `get_models()` | 读当前模型配置（默认值/覆盖/生效值/locale） | GET |
| `set_model(model?, merchant_model?, memory_model?, analysis_model?, thinking_effort?, base_url?, api_key?)` | 覆盖模型配置并重建 Agent（写） | POST |

### 提示词面 `/api/prompts`
| 工具 | 用途 | 端点 |
|---|---|---|
| `get_prompts()` | 读提示词概览（各层字符数/覆盖态） | GET |
| `get_prompt_content(agent, layer)` | 读某 Agent 某层实时渲染文本 | GET /content |
| `override_prompt(agent, layer, content)` | 覆盖静态系统提示词并重建 Agent（写；仅 `static` 层） | POST |
| `reset_prompt()` | 清空全部提示词覆盖并重建（写） | DELETE |

### 数据源面 `/api/backends`
| 工具 | 用途 | 端点 |
|---|---|---|
| `get_backends()` | 读连接器状态（active/注册表/熔断计数） | GET |
| `set_backend(active, connection?)` | 切换适配器并保存连接参数、重建（写） | POST |
| `reset_backend()` | 清空数据源覆盖、恢复内置演示数据（写） | DELETE |
| `ping_backend(base_url, api_key="", timeout_s=5)` | 对连接发起健康检查（不落盘/不切换） | POST /ping |

### 聚合
| 工具 | 用途 | 端点 |
|---|---|---|
| `health_check()` | 对 models/prompts/backends 各 GET 一次，汇总健康 | — |

### 日志面 `logs/`（第二批）
| 工具 | 用途 | 来源 |
|---|---|---|
| `get_logs(service="api", lines=50)` | 读某服务日志尾部（api / storefront / merchant），返回最后 `lines` 行；文件不存在返回 `{"error": "no log for <service>"}` | `logs/{service}.log` |

返回结构：`{"service", "lines", "content", "truncated": bool}`。`content` 为末尾
`lines` 行以 `\n` 连接；`truncated` 在文件总行数 > `lines` 时为 `True`（说明只回了尾部）。
日志可能很大，本工具**只读取尾部**（逐行迭代、内存仅保留 `lines` 行），不会爆内存。

### 进程管理（第二批，委派 agentctl）
| 工具 | 用途 | 委派命令 |
|---|---|---|
| `start_services()` | 拉起零售三件套（API :8001 / 店面 :4001 / 商家端 :4101），幂等（端口已监听则跳过 reused） | `python scripts/agentctl.py start` |
| `stop_services()` | 按 pidfile 优雅停止（SIGTERM→SIGKILL），幂等 | `python scripts/agentctl.py stop` |
| `service_status()` | 查各服务端口监听 / 进程存活 / 健康状态 | `python scripts/agentctl.py status` |

三者均返回 `{"ok": bool, "returncode", "output": stdout+stderr}`（超时 / 异常也走该
结构化返回，不抛异常）。进程管理逻辑**完全在 `scripts/agentctl.py`**，本服务器只作
子进程委派，不做第二套实现。

### Agent-native 安装（第三批，委派 bootstrap.sh）
| 工具 | 用途 | 委派命令 |
|---|---|---|
| `bootstrap_install()` | 一键安装依赖（建 venv / 装 Python 依赖 / 装前端依赖 / 落 .env）；写操作，走权限确认流；幂等 | `bash scripts/bootstrap.sh` |
| `check_install()` | 校验安装态（只读）：venv / Python 依赖 / 前端依赖 / .env / key 是否就绪，返回 `ready` 与缺失项 `notes` | 本地文件探测 |

`bootstrap_install()` 返回 `{"ok", "returncode", "output"}`（超时 600s 也走结构化返回）。
`check_install()` 返回 `{"venv", "python_deps", "node_deps", "env_file", "env_has_key",
"ready", "notes"}`，不跑任何安装命令、只探测现状。两者与 `scripts/bootstrap.sh` 同源，
保证与 A1/A2 同一套权威；写操作（bootstrap_install）经 MCP 平台确认流执行。

> 自举安装提示词（可直接复制给 Codex / Claude Code / WorkBuddy / Cloud 的整段话）见
> [docs/Agent-安装提示词.md](../docs/Agent-安装提示词.md)。默认语言为中文（一份代码
> 中英文都在，运行时 `DEMO_LOCALE` 开关，无需安装时选语言）。

所有工具返回**结构化 dict**：成功时返回 API 原样 JSON 或子进程输出；非 2xx、文件缺失、
子进程失败或网络失败时返回带 `error` 字段的 dict（不会把异常抛给调用方导致工具崩溃）。

## 请求/响应字段对齐

字段形状严格对齐 `examples/retail/api/` 下的三个 settings 模块，未做任何偏离：

- `set_model` 的字段 = `model_settings.ModelSettingsRequest`
  （model / merchant_model / memory_model / analysis_model / thinking_effort /
  base_url / api_key，全部可选、部分更新；空白键不下发）。
- `override_prompt` 的 `agent` + `static_system` = `prompt_settings.PromptOverrideRequest`
  （注意：后端只支持覆盖 `static` 层，`layer != "static"` 会直接返回 error）。
- `set_backend` 的 `active` + `connection{ base_url, api_key, timeout_s }` =
  `backend_settings.BackendSettingsRequest`（`api_key` 留空则不传该键，保留已存密钥）。
- `ping_backend` 的 `base_url` / `api_key` / `timeout_s` = `BackendPingRequest`，
  返回 `{ok, latency_ms, error}`（对齐 `ping_connection`）。

## 运行依赖

```bash
pip install fastmcp        # 或：uv pip install fastmcp
```

当前仓库环境**尚未安装 `fastmcp`**；未安装时无法实际拉起本服务器（但 `server.py`
语法不依赖它，可用 `ast.parse` 做静态检查）。请先安装再注册使用。

> httpx 由 anthropic 依赖间接带来，无需单独安装。

## 注册到 WorkBuddy（~/.workbuddy/mcp.json）

**不要**直接手写覆盖 `~/.workbuddy/mcp.json`（会扰动当前会话 / 丢失其它已注册服务）。
用下面的片段 + 安全合并命令。

### 要写入的精确 JSON 片段（mcpServers 下新增一项）

```json
{
  "commerce-agents-config": {
    "command": "python3",
    "args": ["/Users/pandonglin/WorkBuddy/commerce-agents-zh/mcp/server.py"],
    "env": {
      "MCP_API_BASE": "http://127.0.0.1:8001"
    }
  }
}
```

> 若用 `uv` 管理环境，可改为：
> `"command": "uv"`, `"args": ["run", "--directory", "/Users/pandonglin/WorkBuddy/commerce-agents-zh", "python", "mcp/server.py"]`
> （`--directory` 让 uv 在仓库根解析依赖；仍带 `MCP_API_BASE` env）。
>
> `MCP_API_BASE` 默认 `http://127.0.0.1:8001`（作者环境变体，见 AGENTS.md §5）；
> 用发布默认端口时改为 `http://127.0.0.1:8000`。

### 安全合并命令（读取现有 mcp.json，合并后写回，不动其它项）

```bash
python3 - <<'PY'
import json, pathlib
p = pathlib.Path.home() / ".workbuddy" / "mcp.json"
data = json.loads(p.read_text(encoding="utf-8")) if p.exists() else {"mcpServers": {}}
data.setdefault("mcpServers", {})["commerce-agents-config"] = {
    "command": "python3",
    "args": ["/Users/pandonglin/WorkBuddy/commerce-agents-zh/mcp/server.py"],
    "env": {"MCP_API_BASE": "http://127.0.0.1:8001"},
}
p.parent.mkdir(parents=True, exist_ok=True)
p.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print("merged into", p)
PY
```

### 启用

合并后，到 WorkBuddy 的**连接器页**找到 `commerce-agents-config`，点 **Trust** 启用
（平台型 Agent 的权限确认流在此处落地）。之后工具即可被工具发现并调用。

## 第二批已交付（未决问题 6 第二批）

`get_logs` / `start_services` / `stop_services` / `service_status` 已实现，见上表。
设计稿原 TODO 的「日志来源 / 轮转策略」「与 agentctl 同源、避免双轨」均已落实：

### 依赖与前提
- **`get_logs`**：需 `logs/` 目录及对应 `{service}.log` 存在才有内容可读。日志由
  `scripts/agentctl.py start` 在拉起时归位写入（API / 店面 / 商家端各一份）；未启动
  过服务或 `logs/` 不存在时 `get_logs` 返回 `{"error": "no log for <service>"}`，不会崩溃。
- **进程管理工具**：委派 `scripts/agentctl.py`，与其单一权威。
  - 纯 API 验证：`start_services()` 只需 `uvicorn`（API :8001）；店面 / 商家端还需
    `node_modules`（先 `npm ci`）。若只验证配置面工具，等 API 健康端点就绪即可。
  - pidfile 位于 `examples/retail/data/.agentctl.pids`（agentctl 单一管理，MCP 不碰）。
  - `stop_services()` 幂等：无 pidfile / 进程已不在时正常退出并清理 pidfile；
    非本工具拉起（reused）的进程不会被停止。

### 不自动改 `mcp.json`
第二批工具与第一批**同属一个 server**（`commerce-agents-config`），无需新增
`mcpServers` 项。第一批给出的注册片段已覆盖本 server，沿用即可；不要重复写入或
覆盖 `~/.workbuddy/mcp.json`。

## 已知限制

- 端口必须绑 127.0.0.1，且本服务器以 `trust_env=False` 调用，规避系统代理劫持本机
  请求（见 AGENTS.md 已知坑）。若你的环境代理配置特殊，仍请确保 `no_proxy` 含
  127.0.0.1。
- 写操作（set_model / override_prompt / reset_prompt / set_backend / reset_backend）
  会立即重建 Agent，属演示环境写操作；调用前建议先 GET 确认现状。

## 相关文档

本文档是「Agent 接入面」之 A3 落地说明。更多背景与边界见：

- [docs/本项目与上游差异说明.md](../docs/本项目与上游差异说明.md) — 本发行版相对上游的**差异权威说明**：新增模块表、新增端点表、上游核心 4 处最小改动（§3.1）、解耦机制、零配置诚实说明、回退。本 MCP 服务器（15 个工具）列于其「新增模块」表的 Agent 接入面一行，属「套在 upstream 外的第四层」；调用前想确认某能力是新增还是上游自带，查此文档最权威。
- [docs/接入系统标准化设计.md](../docs/接入系统标准化设计.md) — 数据源连接器 + Agent 接入面设计稿（本文对应第 4.4 / 4.5 / 6 节）。
- [AGENTS.md](../AGENTS.md) — 编码型 Agent 操作手册（A1），与本文 A3 共享同一 REST 底座。
- [README.md](../README.md) — 中文版总说明与功能展示。
- [docs/Agent-安装提示词.md](../docs/Agent-安装提示词.md) — 自举安装提示词（可直接复制给 Codex / Claude Code / WorkBuddy / Cloud 的整段话），Agent-native 安装的用法与分 Agent 适配。
- [NOTICE.md](../NOTICE.md) — 逐文件修改权威清单。
