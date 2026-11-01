# NOTICE

本仓库基于 Anthropic PBC 开源的 [commerce-agents](https://github.com/anthropics/commerce-agents)（Apache License 2.0）修改而来。

## 主要修改

1. **全面中文化（retail 垂直示例）**
   - 前端：`examples/web-shared/`（共享组件层）与 `examples/retail/storefront-web/`、`examples/retail/merchant-web/`（应用层）的界面文案
   - 数据：`examples/retail/data/` 下 catalog（87 个商品）、policies、orders、users、memory-seed 及 merchant_* 数据文件
   - 运行时文案：搜索结果头、门控（gates）错误信息、工具执行摘要、记忆提取提示词（强制输出简体中文）
   - 注意：travel / telecom / entertainment 三个垂直示例未做数据层汉化（共享组件层已中文）

2. **中英文运行时切换（i18n 双语层，本发行版核心新增）**
   - 新增 `examples/web-shared/i18n.tsx`（`t(en, zh)` 双语文案 + LanguageProvider + 语言 cookie）与 `examples/web-shared/LanguageToggle.tsx`（顶栏语言项）
   - 新增 `commerce-common/commerce_common/locale.py`（进程级 locale + Python 侧 `t(en, zh)`），`examples/demo_common/locale.py` 为其再导出
   - 新增 API 路由 `POST /api/locale`（`examples/retail/api/main.py`）：切换 locale 并原位重载 fixtures、重建 shopping agent
   - `MockRetail` / `MockRetailMerchant` 新增 `reload()`：按当前 locale 重读 catalog / orders / policies / merchant_* 数据
   - `examples/retail/data/` 新增 9 个上游英文原版数据文件（`*.en.json`，逐字节取自上游 git）；中文版保持为默认文件
   - 前端约 45 个 ts/tsx 文件的文案改为 `t()` 双语；英文侧逐字节取自上游 git（非回译）
   - 页面主体改为客户端渲染（`app/page.tsx` 薄壳 + `PageImpl` / `ShowcaseImpl`，`next/dynamic` ssr:false），保证双语模块级常量与 SSR 一致
   - `scripts/run_demo.py` 端口配置化基础上保持上游默认端口
   - 配套测试调整：retail 测试固定英文 locale（`conftest.py`）、共享契约测试的 showcase 解析器支持 `t()`（`examples/demo_common/tests/fixtures.py`）、`/api/locale` 加入公开路由白名单、若干常量改为函数以支持运行时切换

3. **模型接入增强**
   - 默认模型改为 gpt-5.5 的配置路径示例，支持通过 `ANTHROPIC_BASE_URL` 指向 OpenAI 兼容中转（Anthropic Messages 协议）
   - `thinking_effort` 默认置 None（兼容非 Anthropic 模型）
   - **商家门户新增模型配置入口**（运行时可配置）：查看当前生效模型、覆盖购物/商家/记忆/分析模型名与思考档位、配置 API 接入点与 Key；保存即重建两个 Agent 生效，「恢复默认」还原。覆盖存于 `data/model-override.json`（已 gitignore），上游 config.py 的默认值不动。新增 `GET/POST/DELETE /api/models`（`examples/retail/api/model_settings.py` + `main.py`）；`demo_common/merchant.py` 的 router 支持 `agent_slot` 在位替换 Agent
   - **商家门户新增提示词面板**（提示词可视 + 在线覆盖）：按 Agent × 6 层级实时查看运行时实际发给模型的提示词（从内存 Agent 现场渲染，跟随语言/模型/覆盖）；支持对静态系统提示词全文覆盖与一键还原，存于 `data/prompt-override.json`（已 gitignore），上游提示词构建代码零改动。新增 `GET /api/prompts`、`GET /api/prompts/content`、`POST/DELETE /api/prompts`（`examples/retail/api/prompt_settings.py` + `main.py`）、前端 `PromptViewerSheet.tsx` 与 `icons.tsx` 的 prompt 图标；`/api/prompts*` 加入公开路由白名单
   - **数据源连接器**（S1–S5 已实施）：装配点从 `MockRetail()` 硬编码改为 `BackendSwitch` 包装 + 适配器注册表（`examples/retail/api/backend_settings.py`）；`RemoteCatalogBackend`（`remote_backend.py`）实现 `StorefrontBackend`——商品/搜索/政策读路径转发远端 REST（异构字段宽容映射），写路径与其余方法委托本地 Mock，连续 3 次失败熔断降级、每 30s 半开探测恢复；`GET/POST/DELETE /api/backends`、`POST /api/backends/ping`；内置模拟第三方系统 `/api/demo-remote/*`（`remote_demo.py`，异构字段 + `?fail=1` 故障注入）；前端 `BackendConfigSheet.tsx` 与 `icons.tsx` 的 connector 图标；覆盖存于 `data/backend-override.json`（已 gitignore）；`/api/backends*` 加入白名单、`/api/demo-remote/*` 经 retail conftest 的 `extra_public_routes` 登记；`main.py` 的 `rebuild_agents()` 扩展为模型/提示词/数据源三模块共用的统一重建入口

4. **开发体验**
   - `next.config.ts` 增加 `allowedDevOrigins`（允许 127.0.0.1 访问 Next.js dev server）
   - `scripts/run_demo.py` 支持 `web_port` 独立配置（VERTICALS 内），端口可自定义
   - 新增 `scripts/export_prompts.py`：导出运行时实际生效的全套提示词（静态系统提示词 / 动态上下文 / 工具定义 / 技能全文 / 记忆提取模板 / 分析子代理提示词），产物见 `prompt-export/`
   - 新增 `scripts/agentctl.py`（A2）：`start/stop/status/verify/snapshot/rollback` 一条命令封装零售三件套（API / 店面 / 商家端）进程管理 + git 快照回滚；`logs/` 与 `data/.agentctl.pids` 已 gitignore；`snapshot` 自动排除工具自身路径，避免回滚时工具文件丢失。另新增 `models`/`prompts`/`backends` 三组配置子命令（`get|set|reset` / `list|get|override|reset` / `get|set|reset|ping`），内部走代理无关 urllib 调 API 配置端点，给 shell 型 Agent 与 MCP 形成双覆盖

5. **文档**
   - 新增 `docs/架构方法论.md`（可复用架构方法论萃取）
   - 新增 `docs/README-原项目-中文版.md`（上游英文 README 的完整中文翻译）
   - 新增 `AGENTS.md`（给编码型 AI Agent 的操作手册：服务拓扑/验证流水线/配置端点/修改纪律/agentctl 用法/MCP 启用说明）；`CLAUDE.md` 顶部增加指向 AGENTS.md 的一行指针，其余内容保持上游原样
   - 新增 `mcp/server.py` + `mcp/README.md`（A3）：FastMCP 把模型/提示词/数据源三面板 + 健康检查包装成 11 个结构化工具，供 WorkBuddy 等平台型 Agent 通过工具发现 + 权限确认流操作；第一批范围（只读 + 配置写端点，见设计稿未决问题 6），日志/进程管理留第二批 TODO；`mcp/README.md` 含 `~/.workbuddy/mcp.json` 精确注册片段
   - **A3 第二批已实现**：`mcp/server.py` 增至 15 个工具——新增 `get_logs`（读 `logs/<service>.log` 尾部）、`start_services`/`stop_services`（委派 `scripts/agentctl.py` start/stop，进程管理单一权威在 A2）、`service_status`（委派 agentctl status）；未决问题 6 两批均已落地
   - 本 README 为中文为主的双语说明

上游版权与许可信息见 [LICENSE](LICENSE)（保持原样，Apache License 2.0, Copyright 2026 Anthropic PBC）。
