#!/usr/bin/env bash
# 将 retail 垂直端口从本发行版的实际端口（API 8001 / 店面 4001 / 商家门户 4101）
# 还原为上游默认端口（API 8000 / 店面 3000 / 商家门户 3100）。
#
# ⚠️ 仅当你的机器上 8000 / 3000 / 3100 空闲时才运行本脚本；
#    否则会抢占你已有的其他服务端口，不建议执行。
#
# 安全：编辑前自动备份 run_demo.py（带时间戳），编辑失败可随时 cp 备份还原。
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET="$REPO_ROOT/scripts/run_demo.py"

if [[ ! -f "$TARGET" ]]; then
  echo "未找到 $TARGET" >&2
  exit 1
fi

# 锚定 retail 专属端口块（"web_port": 4001 仅 retail 出现，确保不会误改 travel 等）。
OLD_BLOCK='        "api_port": 8001,
        "web_port": 4001,'
NEW_BLOCK='        "api_port": 8000,
        "web_port": 3000,'

if ! grep -qF '"web_port": 4001,' "$TARGET"; then
  echo "retail 端口已是上游默认（未找到 \"web_port\": 4001,），无需还原。" >&2
  exit 0
fi

BAK="$TARGET.bak.$(date +%Y%m%d%H%M%S)"
cp "$TARGET" "$BAK"

python3 - "$TARGET" <<PY
import sys
path = sys.argv[1]
old = '        "api_port": 8001,\n        "web_port": 4001,'
new = '        "api_port": 8000,\n        "web_port": 3000,'
text = open(path, encoding="utf-8").read()
if old not in text:
    raise SystemExit("retail 端口块未找到，可能已还原或非预期状态；未做任何修改。")
text = text.replace(old, new, 1)
open(path, "w", encoding="utf-8").write(text)
print("已还原 retail 端口为上游默认：API 8000 / 店面 3000 / 商家门户 3100")
PY

echo "备份文件: $BAK"
echo "⚠️ 若 8000/3000/3100 已被占用，请勿运行本脚本以免抢占现有服务。"
echo "   如需撤销，执行: cp \"$BAK\" \"$TARGET\""
