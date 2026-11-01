# Agent 安装提示词（自举安装）

本文件是 **commerce-agents-zh** 的「安装提示词」——你不用自己敲命令，把下面任一段
**原样复制**发给你的 Agent（Codex / Claude Code / WorkBuddy / Cloud），它就会自动把环境
搭好、把服务跑起来。

> 核心结论先说：本项目**语言是运行时开关，不是安装选项**。一份代码里中英文都在，
> **默认就是中文**，不需要在装的时候选「只装中文 / 只装英文」。只装中文完全能跑，
> 不依赖英文版。想切英文，运行时设 `DEMO_LOCALE=en` 即可。

---

## 通用默认安装提示词（推荐，所有 Agent 通用）

> 把下面的整段发给 Agent 即可。Agent 跑 shell 的能力越强，越不需要你干预。

```
请在当前机器上部署并启动 commerce-agents-zh（一个全中文的零售多 Agent 演示项目）。
按以下步骤执行，每步失败就停下来报告原因，不要静默跳过：

1. 克隆并进入目录：
   git clone https://github.com/evcgs/commerce-agents-zh.git && cd commerce-agents-zh

2. 运行一键安装脚本（自动建 venv、装 Python 依赖、装前端依赖、落 .env）：
   bash scripts/bootstrap.sh
   （脚本已内置国内镜像加速与失败回退，可重复运行。）

3. 配置模型 key：在仓库根目录的 .env 里填入
   ANTHROPIC_API_KEY=sk-你的key
   若用 OpenAI 兼容中转，还需 ANTHROPIC_BASE_URL=https://你的中转地址。

4. 启动零售三件套：
   python scripts/run_demo.py retail --all
   启动后终端会打印店面 / 商家端 / API 的本地地址，默认零售为
   API :8001、店面 :4001、商家端 :4101。

5. 验证：等 API 健康端点就绪（GET /api/health 返回 ok），并把店面地址告诉我。

默认语言为中文。不要做任何「只装中文 / 只装英文」的选择——一份代码同时包含中英文，
默认中文即可。我只要中文界面能正常对话导购、商家端能运营即可。
```

---

## 分 Agent 适配说明

### Codex / Claude Code（能跑 shell 的编码型 Agent）

直接用上面的「通用默认安装提示词」即可。这类 Agent 有完整 shell 权限，`bash scripts/bootstrap.sh`
和 `python scripts/run_demo.py` 都能直接跑。无需额外配置。

### WorkBuddy（平台型 Agent，给工具不给 shell）

两种用法任选其一：

- **A. 经 MCP 工具安装（推荐）**：先把 MCP 服务器挂上（见 mcp/README.md），然后让 Agent 调
  `bootstrap_install` 工具一键装依赖；装完用 `check_install` 确认；最后用 `start_services`
  拉起（前提是你已在 `.env` 配好 key）。这三个工具与 `scripts/bootstrap.sh` / `scripts/agentctl.py`
  是同一套逻辑，写操作走权限确认流。
- **B. 直接发上面的「通用默认安装提示词」**：WorkBuddy 在有 shell 权限时同样能跑
  `bash scripts/bootstrap.sh`。

> 启用 MCP：`pip install fastmcp` 后 `python mcp/server.py`，base URL 用 `MCP_API_BASE` 覆盖
> （默认 `http://127.0.0.1:8001`）。注册片段见 mcp/README.md。

### Cloud（云端 Agent，无本地 shell）

Cloud 类 Agent 通常没有直接文件系统/shell，请改用以下任一种：

- 在 **有 shell 的执行环境**（如 Cloud 提供的 sandbox / 容器）里粘贴上面的「通用默认安装提示词」，
  让它在 sandbox 内跑 `bootstrap.sh` 与 `run_demo.py`。
- 或把仓库交给本地 Agent（Codex / WorkBuddy）装好、跑通后，再由 Cloud 通过 MCP / HTTP 调用
  已启动的 `:8001` API（用 `MCP_API_BASE` 指向该地址）。

---

## 安装方式变革小结（为什么这样设计）

| 过去 | 现在（Agent-native） |
|---|---|
| 人逐条敲 `python -m venv` / `pip install` / `npm ci` | 一条 `bash scripts/bootstrap.sh` 或一段提示词交给 Agent |
| 中英文两套安装包、要选语言 | 一份代码，运行时开关，默认中文，无需选择 |
| 端口、依赖靠读 README 猜 | 脚本与 MCP 工具封装好，Agent 照规范调即可 |
| 启动要人盯着命令 | `run_demo.py --all` 或 MCP `start_services` 一条拉起 |

端口仅绑 `127.0.0.1`，不暴露公网。安装与 Agent 写操作共用同一套权限模型。
