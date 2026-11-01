# Claude Commerce Agents（原项目中文版 README）

> 本文档是 [anthropics/commerce-agents](https://github.com/anthropics/commerce-agents) 官方英文 README 的完整中文翻译，用于帮助中文读者理解**原项目**的定位与使用场景。译文由 commerce-agents-zh 汉化项目提供；如与英文原文有出入，以[英文原文](../README-UPSTREAM.md)为准。

两个构建在 Claude 之上的商业 Agent：一个是嵌入商家 App 服务**顾客**的**购物 Agent（shopping agent）**，另一个是商家**员工**运营后台使用的**商户 Agent（merchant agent）**。每个 Agent 只定义一次（提示词、技能、工具契约、门控），即可运行在 Messages API、Claude Agent SDK 与 Managed Agents 三条路径上；四个可运行的垂直示例在同一套库之上展示这两种角色。

> [!NOTE]
> 本项目中所有公司、品牌、产品与人物均为虚构；唯一的公司是 ACME。任何操作都不会真正下单、扣款或改动线上在售商品：`checkout` 只渲染购物车交由宿主完成支付，商户端的每一次写入都要先暂存、等人批准后才生效。业务规则、授权与合规由实际部署方负责。

## 快速开始：运行演示

需要 Python 3.11+ 与 Node 22。克隆、安装、填入密钥、运行一个垂直示例：

```bash
git clone https://github.com/anthropics/commerce-agents.git && cd commerce-agents
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt       # 七个包及其锁定的依赖
cp .env.example .env                  # 填入 ANTHROPIC_API_KEY
(cd examples && npm ci)               # 八个 Web 应用共享一个 workspace
python scripts/run_demo.py retail     # API :8000 + 店面 :3000
```

`--merchant` 启动商户门户（而非店面），`--all` 两者都启动。四个垂直示例为 `retail`（:3000，门户 :3100）、`travel`（:3001、:3101）、`telecom`（:3002、:3102）、`entertainment`（:3003、:3103）；每个示例的 README 都列出了两个界面上值得一试的提示词。

## 快速开始：构建你自己的 Agent

Claude Code 插件可以基于这些包、对接你的系统脚手架生成一个 Agent，或评审你已有的 Agent。按上述方式克隆仓库后（插件会把它当作参考实现读取）：

```bash
claude plugin marketplace add anthropics/commerce-agents
claude plugin install commerce-builder@claude-commerce-agents
claude
/scaffold-commerce-agent a shopping assistant for our store
```

该命令会询问你的技术栈、回放方案、然后生成项目；`/add-commerce-flow` 与 `/author-commerce-evals` 在此基础上继续，`/review-commerce-agent` 则从**已存在**的 Agent 开始（见 [`plugins/commerce-builder/`](../plugins/commerce-builder/)）。当请求与命令描述匹配时每个命令也会自动运行，因此点名调用并非必需。

## 两个 Agent

**购物 Agent** 负责搜索、比较、规划、加购物车、回答订单与政策问题，并记住顾客告诉它的事项。它的五个业务流程就是 [`shopping-agent/skills/`](../shopping-agent/skills/) 中的技能；部署方在自己的商品、购物车、订单与政策系统之上实现 [`StorefrontBackend`](../shopping-agent/core/shopping_agent/backend.py) 接口。

**商户 Agent** 负责解读经营表现、维护在售商品、处理库存与订单告警、定价与促销、起草营销活动；每一次写入都是一个暂存的变更，经由宿主的审批界面生效。它的五个业务流程就是 [`merchant-agent/skills/`](../merchant-agent/skills/) 中的技能；部署方在自己的分析、商品、库存、定价与营销系统之上实现 [`MerchantBackend`](../merchant-agent/core/merchant_agent/backend.py) 接口。

## 仓库结构

| 目录 | 内容 | pip 包名 / `import` 名 |
|---|---|---|
| [`commerce-common/`](../commerce-common/) | 两种角色共享的部分：配置、围栏（fencing）、记忆、技能、接地（grounding）、呈现、执行器框架、事件 | `commerce-common`，`commerce_common` |
| [`shopping-agent/core/`](../shopping-agent/core/) | 购物类型、`StorefrontBackend`、提示词、工具契约、门控、执行器 | `shopping-agent-core`，`shopping_agent` |
| [`shopping-agent/runtime-messages-api/`](../shopping-agent/runtime-messages-api/) | `ShoppingAgent`：跑在 Messages API 上的回合循环 | `shopping-agent-runtime`，`shopping_agent_runtime` |
| [`shopping-agent/runtime-agent-sdk/`](../shopping-agent/runtime-agent-sdk/) | 跑在 Agent SDK 上的购物 Agent，带控制台 | `shopping-agent-sdk`，`shopping_agent_sdk` |
| [`shopping-agent/managed-agents/`](../shopping-agent/managed-agents/) | Managed Agents 的 manifest 与店面 MCP 服务器 | — |
| [`merchant-agent/core/`](../merchant-agent/core/) | 商户类型、`MerchantBackend`、提示词、工具契约、变更护栏、门控、执行器 | `merchant-agent-core`，`merchant_agent` |
| [`merchant-agent/runtime-messages-api/`](../merchant-agent/runtime-messages-api/) | `MerchantAgent` 与跑在 Messages API 上的分析子代理 | `merchant-agent-runtime`，`merchant_agent_runtime` |
| [`merchant-agent/runtime-agent-sdk/`](../merchant-agent/runtime-agent-sdk/) | 跑在 Agent SDK 上的商户 Agent，带审批控制台 | `merchant-agent-sdk`，`merchant_agent_sdk` |
| [`merchant-agent/managed-agents/`](../merchant-agent/managed-agents/) | Managed Agents 的 manifest、商户 MCP 服务器、定时摘要 | — |
| [`examples/`](../examples/) | 四个垂直示例、共享宿主代码（`demo_common/`）、共享 Web 代码（`web-shared/`） | — |
| [`plugins/commerce-builder/`](../plugins/commerce-builder/) | Claude Code 插件 | — |
| [`docs/`](../docs/) | `safety.md`（被强制执行的规则）、`backends.md`（对接你的系统）、`deployment.md`（其他平台） | — |
| [`tests/`](../tests/) | 跨包测试套件；每个包也有自己的 `tests/` | — |
| [`scripts/`](../scripts/) | `install.sh`、`run_demo.py`、`smoke_chat.py`、`screenshot_tour.py`、`check.py`、`deploy_managed_agent.sh`、`verify_all.py` | — |

## 运行 Agent 的三种方式

**Messages API。** 参考实现循环；示例就是围绕它的宿主应用：

```python
from pathlib import Path

from shopping_agent import ShoppingAgentConfig
from shopping_agent_runtime import ShoppingAgent

agent = ShoppingAgent(backend=your_backend, skills_dir=Path("shopping-agent/skills"),
                      config=ShoppingAgentConfig(brand_name="Your Store"))
async for event in agent.stream_turn(messages, session, state):
    ...   # text_delta, tool_call, ui, cart_update（商户端是 change_update）, turn_complete
await agent.update_memory(messages, session)   # 记忆提取；仅此路径支持
```

示例宿主通过 `X-Session-Id` 请求头携带会话 id。

**Agent SDK。** 相同的提示词、技能与工具，由 SDK 运行循环；宿主预取接地读取，回合结束后不再有后台任务：

```bash
python shopping-agent/runtime-agent-sdk/main.py --once "a two-person tent under $250"
python merchant-agent/runtime-agent-sdk/main.py          # 用 y/N 批准暂存变更
```

**Managed Agents。** 托管形态的 Agent，使用相同的技能与契约，调用你的 MCP 服务器：

```bash
scripts/deploy_managed_agent.sh shopping-agent/managed-agents/shopping-agent   # 或 merchant-agent/...；--live 实际部署
```

## 安全性

围栏（fencing）、溯源门控（provenance gates）、上限（caps）、记忆校验与商户审批门控都在**工具调用内部**执行，三条路径全部生效；接地（grounding）、分析预算与记忆提取是运行时特性。[`docs/safety.md`](../docs/safety.md) 逐条列出每个规则及其所在模块、覆盖路径，以及部署方应优先补充什么；示例未做鉴权，MCP 服务器只绑定回环地址。

## 垂直示例

| 示例 | 店面 | 商户门户 |
|---|---|---|
| [`examples/retail/`](../examples/retail/) ACME 零售 | 基于内置组件的搜索、比较、规划、购物车、结账、记忆 | 摘要、暂存的补货与商品修复、跑在 SQL 视图上的分析子代理 |
| [`examples/travel/`](../examples/travel/) ACME 旅行 | 按日期绑定的库存与 `present_itinerary` 呈现扩展 | 入住率日历与日期窗口调价 |
| [`examples/telecom/`](../examples/telecom/) ACME 通信 | 账户上下文、套餐矩阵、服务端生成的费用披露 | 套餐结构、声明受影响线路的调价、受保护的监管费用 |
| [`examples/entertainment/`](../examples/entertainment/) ACME 票务 | 限时锁定、候补、转让、场馆图、全口径费用披露 | 活动节奏、释放锁定带来真实容量的增补、保费用的调价 |

每个示例的 README 都有 `Try` 一节：`scripts/smoke_chat.py` 跑的回合，以及单条提示词与"好答案应该做到什么"。

## 验证

```bash
ruff check . && ruff format --check . && pytest && python scripts/check.py
python scripts/verify_all.py                        # 上一行加上部署演练与 Web 构建
python scripts/smoke_chat.py --vertical travel      # 一段真实对话；需要密钥
```

`requirements-dev.txt` 增加 pytest 与 ruff。CI 基于它在两个 Python 版本上安装、构建八个 Web 应用，并检查包名在公共索引上保持未注册状态（锁定文件从目录安装这些包、绝不从索引安装）。要确认提示词缓存生效，可读 `turn_complete` 里的 `cache_read_input_tokens`，或各模型调用在运行时 logger 上打出的那一行：第二回合为零说明前缀变了。

## 部署到其他平台

运行时接受任意 `anthropic` 客户端作为 `client=`，SDK 运行时从 CLI 环境取平台；[`docs/deployment.md`](../docs/deployment.md) 覆盖 GCP Vertex AI、AWS Bedrock、Microsoft Foundry 与网关。

## MCP 连接器

仓库不内置任何连接器；两个 Agent 都通过 backend 接口触达你的系统。凡是官方连接器作为事实数据源的地方，它就是集成目标：分析数仓（Snowflake、BigQuery、Databricks、Amplitude）、财务（Stripe、Square、PayPal、QuickBooks）、交付（Slack、Google Drive、Gmail）。电商平台自己的商品/购物车/结账 MCP 服务器在 backend 方法内由服务端调用；在 Managed Agents 上，manifest 会把它挂在本角色的服务器旁边，而溯源门控仍在每一次写入之前。

## 打造你自己的

- **Backend 方法。** 每个方法都用宿主为会话持有的凭证在服务端调用你的服务；模型只读结果。步骤有固定顺序的流程，其顺序由 backend 强制。
- **阅读 backend 指南。** [`docs/backends.md`](../docs/backends.md) 依次讲解身份与凭证、有序流程、结账、带选项的商品，以及你的平台给不出的数字。
- **同一套接口覆盖其他业务形态。** 在 marketplace 上，卖家是一个搜索维度，商户 Agent 代表会话指定的运营方行事。有账户价或合同价时，报价取会话账户的价格。没有自己的结账时，关掉购物车，或交给报价单、采购单、托管结账 URL。
- **结账是交接。** 结账卡片链接到你自己的结账路由，或平台的托管结账 URL（marketplace 上每个卖家一个）。backend 返回 URL、宿主渲染；模型永远看不到它。
- **从小做起。** 购物试点先实现搜索与商品详情、其余打桩；打桩的方法返回不可用结果、不改一个提示词字节。商户试点实现八个读方法、让写入拒绝；摘要与指标就能在没有写路径的情况下运行。
- **没有的系统就关掉。** 业务完全没有的系统（导购页没有购物车、没有订单跟踪）是 `enable_*` 开关关掉，三条路径上它的工具、提示词行、接地规则一并移除；依赖它的流程收进 `skills/_staged/`。商户 config 对商品编辑、库存、定价、营销有同样的开关。
- **加你自己的。** 一个流程就是任一 `skills/` 下带 `SKILL.md` 的目录。领域 UI 是一个 `PresentationExtension`（四个垂直示例共内置七个）。两个 config 上的 `brand_name`、`assistant_name`、`brand_voice` 设定身份。

## 许可证

Copyright 2026 Anthropic PBC. Licensed under the [Apache License 2.0](../LICENSE).
本项目是参考实现；不做维护，不接受贡献。
