# AGENTS.md — 操作手册（给编码型 AI Agent）

> **读者**：Codex / Claude Code 等在本仓库工作的编码型 Agent。
> **分工**：本文件讲**怎么操作运行中的服务**（拓扑、启停、验证、配置端点、修改纪律）；
> 仓库布局与设计规则见 [CLAUDE.md](CLAUDE.md)，面向人类的说明见 [README.md](README.md)。
> 一句话：这是 Anthropic commerce-agents 的中文化发行版——双语运行时切换、模型接入解耦、
> 运行时配置三面板（模型 / 提示词 / 数据源，后两者见 [docs/接入系统标准化设计.md](docs/接入系统标准化设计.md)，均已实现）；本发行版相对上游英文项目的差异权威说明（新增模块 / 新增端点 / 上游 4 处最小改动 / 解耦 / 回退）见 [docs/本项目与上游差异说明.md](docs/本项目与上游差异说明.md)。

## 1. 服务拓扑与生命周期

上游默认端口（本仓库发布配置）：

| 服务 | 端口 | 启动 |
|---|---|---|
| demo API | 8000 | `python scripts/run_demo.py retail --all`（API+店面+商家门户一键） |
| 顾客店面 | 3000 | 同上；单独起：`next dev -p 3000`（在 `examples/retail/storefront-web`） |
| 商家门户 | 3100 | 同上；单独起：`next dev -p 3100`（在 `examples/retail/merchant-web`） |

- 单独起 API：`.venv/bin/uvicorn retail.api.main:app --app-dir examples --port 8000`（工作目录 = 仓库根）。
- 前台进程 Ctrl-C 即停；散进程清理：`lsof -nP -iTCP:<port> -sTCP:LISTEN` 找 PID 后 `kill`。
- Next dev 崩溃残留锁：删 `examples/retail/*/web/.next/dev` 后重启。
- npm 依赖装在 workspace 层：`cd examples && npm ci`（`node_modules` 在 `examples/`，不在各 web 目录）。
- **一键进程管理（A2 `agentctl`）**：`python scripts/agentctl.py start|stop|status|verify|snapshot|rollback` 封装了上面三件套的拉起 / 停止 / 健康检查与 git 快照回滚；端口可用 `AGENTCTL_API_PORT/STORE_PORT/MERCH_PORT` 覆盖。`start` 跳过已监听端口、`stop` 只杀本工具拉起的进程；**改码前先 `snapshot`（已自动排除工具自身路径），`rollback` 恢复**——等价于 §4 的 git 快照纪律，但更省事。

## 2. 验证流水线（改完必跑，按成本升序）

```bash
.venv/bin/python -m pytest examples/retail/api/tests -q        # ~4s，retail 全量（含契约测试）
.venv/bin/python -m pytest examples/demo_common/tests -q       # 共享层；若报 tmp 目录 EEXIST 见 §6
(cd examples/retail/merchant-web && npx tsc --noEmit)          # 前端类型（node_modules 解析到 examples 层）
(cd examples/retail/storefront-web && npx tsc --noEmit)
ruff check . && python scripts/check.py                        # lint + system.md 派生校验
```

- **locale 纪律**：retail 测试由 `conftest.py` 固定英文 locale；新增文案一律 `t("English", "中文")` 双语，**英文侧逐字节取自上游 git 历史（`git show fd4d592:<path>`），禁止回译**。
- 全链路手工验证：起服务后用 Playwright 截图 + console 错误监控（本地请求记得 `--noproxy` / `no_proxy=127.0.0.1`）。

## 3. 运行时配置端点（Agent 可直接 curl，无需改代码）

API 起来后（下例 `:8000`）：

```bash
# 模型面板：查看 / 覆盖（模型名、思考档位、base_url、api_key）/ 还原
curl -s localhost:8000/api/models
curl -s -X POST localhost:8000/api/models -H 'Content-Type: application/json' \
  -d '{"model":"gpt-5.5","thinking_effort":"low"}'
curl -s -X DELETE localhost:8000/api/models

# 提示词面板：6 层实时查看 / 静态提示词覆盖 / 还原
curl -s localhost:8000/api/prompts
curl -s "localhost:8000/api/prompts/content?agent=merchant&layer=static"
curl -s -X POST localhost:8000/api/prompts -H 'Content-Type: application/json' \
  -d '{"agent":"shopping","static_system":"新的系统提示词"}'
curl -s -X DELETE "localhost:8000/api/prompts?agent=shopping"   # 恢复上游默认

# 语言切换（重建 Agent，fixtures 重载；en | zh）
curl -s -X POST localhost:8000/api/locale -H 'Content-Type: application/json' -d '{"locale":"en"}'
```

- POST/DELETE 会**立即重建 Agent**——演示数据可随意试，但这是写操作：先 GET 确认现状，改完 GET 验证生效。
- 覆盖落盘在 `examples/retail/data/model-override.json` 与 `prompt-override.json`（均 gitignore，**不得提交**）。

## 4. 修改纪律（危险档规则）

1. **改任何文件前先 git 快照**（本仓库工作树可能携带未提交改动，快照是唯一可靠回滚点）：`git stash` 或 `git add -A && git commit -m wip`。
2. **上游资产最小侵入**：`shopping-agent/`、`merchant-agent/`、`commerce-common/` 的上游文件只在必要时改，且逐条登记 [NOTICE.md](NOTICE.md)；运行时机制（如 `_static_system` 每轮读取）是覆盖功能的地基，**不得重构**。
3. **双语完整性**：新增 UI 文案必须 `t(en, zh)` 成对出现；数据层改动注意 `load_localized_json` 的 `.en.json` 回退机制。
4. **改完按 §2 跑验证**，前端改动另跑 Playwright 冒烟（截图 + console 0 错误）。
5. 提交信息用中文一行式（`feat:`/`fix:`/`docs:` 前缀），推送失败按"HTTP/1.1 → 去代理 → 重试"顺序换通道。

## 5. 作者环境变体（本仓库作者的机器；其他环境跳过本节）

- **双目录结构**：工作副本（`.venv`、跑服务/测试，上游 shallow clone + 未提交改动）与发布仓库
  （`commerce-agents-zh`，commit/push 的地方）是两个目录。改动流程：**先改发布仓库 → cp 同步到工作副本 → 验证 → 回发布仓库提交推送**。
- 演示端口变体：API `:8001`、店面 `:4001`、商家门户 `:4101`（`NEXT_PUBLIC_API_URL` 需指向对应 API）。
- 工作副本执行 pytest 若被环境 sitecustomize 干扰（tmp 目录 mkdir 竞争），用 `env -u PYTHONPATH` 重跑。

## 6. 已知坑速查

| 症状 | 原因与解法 |
|---|---|
| 改了 API 代码不生效 | uvicorn 未带 `--reload`，重启进程 |
| curl 本机端口报 502/upstream refused | 系统代理劫持了 127.0.0.1：`export no_proxy=127.0.0.1,localhost` |
| pytest demo_common 大量 EEXIST 错 | 环境注入的 sitecustomize 干扰 tmp 目录：`env -u PYTHONPATH` 重跑 |
| Next dev 起不来 / 端口占用 | 清 `.next/dev` 锁目录 + `lsof` 杀残留进程 |
| 页面 hydration mismatch | 页面主体必须走 `ssr:false` 薄壳（`page.tsx` → `PageImpl`），别在服务端读语言 cookie |
| showcase/契约测试 JSONDecodeError | fixtures 里的 `t("en","zh")` 由 `demo_common/tests/fixtures.py` 的解析器处理，别绕过它 |

## 7. Agent 接入面（A1 本文件 / A2 agentctl / A3 MCP）

本项目对三类 Agent 提供三种操作面（设计稿 v1.1 第 4 章），共享同一个 `settings` 模块 + REST 底座：

| 形态 | 受众 | 怎么用 |
|---|---|---|
| **A1 本文件 AGENTS.md** | 编码型 Agent（Codex / Claude Code，能跑 shell） | 读本文档即可起服务、跑验证、改配置 |
| **A2 `scripts/agentctl.py`** | 所有可执行命令的 Agent | 进程管理（start/stop/status/verify/snapshot/rollback）+ 直接用 CLI 调三配置面（见下） |
| **A3 `mcp/` FastMCP 服务器** | 平台型 Agent（WorkBuddy，只给工具不给 shell） | 把三面板 + 健康检查包装成结构化工具，天然带权限确认流 |

- **A3 启用**：`pip install fastmcp` 后 `python mcp/server.py`（或 uv run）；base URL 用 `MCP_API_BASE` 覆盖（默认 `http://127.0.0.1:8001`）。
  注册到 `~/.workbuddy/mcp.json` 的精确片段与合并命令见 [mcp/README.md](mcp/README.md)（**不要自动改** `~/.workbuddy/mcp.json`，避免扰动当前会话；在 WorkBuddy 连接器页点 Trust 启用）。
- **A2 配置子命令（给 shell 型 Agent 的双覆盖）**：`agentctl models get|set|reset`、`agentctl prompts list|get|override|reset`、`agentctl backends get|set|reset|ping`——内部走代理无关的 urllib 调 API 配置端点，字段对齐三份 `*_settings.py`；`--api-port` 可覆盖端口（默认 8001）。与 A3 MCP 形成 CLI + 工具双通道。
- **A3 工具（共 15 个）**：
  - 第一批（设计稿未决问题 6，只读 + 配置写）：`get_models`/`set_model`、`get_prompts`/`get_prompt_content`/`override_prompt`/`reset_prompt`、`get_backends`/`set_backend`/`reset_backend`/`ping_backend`、`health_check`。
  - 第二批（日志 + 进程管理）：`get_logs(service, lines)`（读 `logs/<service>.log` 尾部）、`start_services()` / `stop_services()`（委派 `agentctl start`/`stop`，进程管理单一权威在 A2）、`service_status()`（委派 `agentctl status`）。
- 写操作（set_*/override_*/reset_*）即时重建 Agent，依赖平台确认流；调用前先 GET 确认现状。端口绝不暴露公网（仅绑 127.0.0.1）。

## 8. 相关文档

- [docs/本项目与上游差异说明.md](docs/本项目与上游差异说明.md) — 本发行版相对上游英文项目的**差异权威说明**：新增模块表、新增端点表、上游核心 4 处改动（§3.1）、解耦机制、零配置诚实说明、回退。改码前想确认「某能力是上游自带还是要我们新增的」「改动是否可逆」，先查此文档。
- [docs/接入系统标准化设计.md](docs/接入系统标准化设计.md) — 数据源连接器 + Agent 接入面设计稿（§7 的 A1/A2/A3 即出自此稿第 4 章）。
- [mcp/README.md](mcp/README.md) — A3 MCP 服务器（15 工具）清单与注册，与本文 A1 共享 REST 底座、A2 `agentctl` 为进程管理单一权威。
- [README.md](README.md) — 中文版总说明与功能展示。
- [NOTICE.md](NOTICE.md) — 逐文件修改权威清单。
