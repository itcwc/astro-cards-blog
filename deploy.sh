#!/usr/bin/env bash
# =========================================================================
# 通用静态博客部署脚本（可由 WebHook / CI 调用）
# 流程：git pull（仅快进） -> 安装依赖 -> 构建静态产物到 dist/
# 服务器只需【只读】GitHub deploy key（只 pull，绝不 push）
# -------------------------------------------------------------------------
# 可观测性说明：
#   - 所有输出（含 stderr）同时写到调用方日志 和 本地文件 $LOGFILE
#   - 不做静默退出（不用 set -e），每步手动检查并显式打印 FATAL，避免"只看到一行"
#   - git pull 带超时 + BatchMode，避免无 TTY 时卡死在输入密码/确认主机
#   - 非交互 shell 不加载 .bashrc，所以 pnpm 用 type -P 自己定位（拿到真实路径，
#     避免取到 shell 函数名导致 timeout: failed to run command 'pnpm'）
# =========================================================================

# —— 日志：同时输出到调用方（stdout）和本地文件 ——
LOGFILE="${LOGFILE:-/tmp/deploy.log}"
mkdir -p "$(dirname "$LOGFILE")"
exec > >(tee -a "$LOGFILE") 2>&1

set -uo pipefail

# ↓↓↓ 按你的服务器实际路径修改 ↓↓↓
DEPLOY_DIR="${DEPLOY_DIR:-/www/wwwroot/your-site}"
BRANCH="${BRANCH:-main}"
# ↑↑↑ 按你的服务器实际路径修改 ↑↑↑

log(){ echo "[deploy] $(date '+%F %T') $*"; }

# git 走 SSH 时的兜底参数：自动接受未知主机、禁止交互（无密钥/错密钥立即失败而非卡死）
export GIT_SSH_COMMAND="ssh -o StrictHostKeyChecking=accept-new -o BatchMode=yes -o ConnectTimeout=15"

# —— 定位 pnpm ——
# 关键坑：pnpm 在交互终端里常是 .bashrc 定义的 shell 函数/别名；脚本的非交互 shell 既加载不了
# .bashrc，又会让 `command -v pnpm` 返回字面量 "pnpm"（函数名），导致 timeout 报
# "failed to run command 'pnpm'"。所以必须用 `type -P` 取【真实可执行文件路径】，忽略函数/别名。
# 先尽量复用登录环境（部分系统 pnpm 路径写在 /etc/profile 或 ~/.profile 而非 .bashrc）。
for f in /etc/profile "$HOME/.bash_profile" "$HOME/.bash_login" "$HOME/.profile"; do
  [ -f "$f" ] && . "$f" >/dev/null 2>&1
done

PNPM="$(type -P pnpm 2>/dev/null)"
# 若仍未取到真实文件路径（返回空或只是函数名），按常见安装位置兜底查找
if [ -z "$PNPM" ] || [ ! -x "$PNPM" ]; then
  for d in "$HOME/.local/share/pnpm" "$HOME/.npm-global/bin" "$HOME/.npm/bin" \
           "$HOME/.nvm/versions/node"/*/bin /www/server/nodejs/*/bin \
           /usr/local/bin /usr/bin /opt/*/bin; do
    if [ -x "$d/pnpm" ]; then PNPM="$d/pnpm"; export PATH="$d:$PATH"; break; fi
  done
fi
# 兜底：通过 npm 全局前缀定位（pnpm 由 npm i -g 安装时落在此处）
if [ -z "$PNPM" ] || [ ! -x "$PNPM" ]; then
  npm_bin="$(npm bin -g 2>/dev/null)"
  [ -x "$npm_bin/pnpm" ] && PNPM="$npm_bin/pnpm" && export PATH="$npm_bin:$PATH"
fi
if [ -z "$PNPM" ] || [ ! -x "$PNPM" ]; then
  log "FATAL: 找不到 pnpm 可执行文件。请运行 'which pnpm' 把绝对路径填到脚本顶部 PNPM= 处，或确认已安装 pnpm。"
  exit 1
fi
export PNPM
log "using pnpm: $PNPM"

log "=== deploy start ==="
log "DEPLOY_DIR=$DEPLOY_DIR  BRANCH=$BRANCH"

cd "$DEPLOY_DIR" || { log "FATAL: 无法进入 $DEPLOY_DIR（请确认宝塔站点目录与该路径一致）"; exit 1; }

# —— 预检：GitHub SSH 连通性（最先暴露鉴权问题，仅作信息提示，不阻断）——
log "预检：测试 GitHub SSH 连通性 ..."
if ssh -o StrictHostKeyChecking=accept-new -o BatchMode=yes -o ConnectTimeout=15 -T git@github.com 2>&1 \
   | grep -qi "authenticated"; then
  log "预检：GitHub SSH 鉴权 OK"
else
  log "预检：GitHub SSH 鉴权未通过（上方应有权限/主机相关报错）。"
  log "      → 请在该服务器生成 deploy key 并加入 GitHub 仓库 Deploy Keys（只读）："
  log "        ssh-keygen -t ed25519 -N '' -f ~/.ssh/id_ed25519_deploy"
  log "        cat ~/.ssh/id_ed25519_deploy.pub   # 复制到 GitHub → Settings → Deploy keys"
fi

# —— 拉取（带超时，避免无 TTY 时卡死）——
log "pull $BRANCH ..."
if ! timeout 120 git pull --ff-only origin "$BRANCH" 2>&1; then
  log "FATAL: git pull 失败（鉴权失败 / 分支分叉非快进 / 网络超时）。详见上方输出与 $LOGFILE"
  exit 1
fi
log "pull done"

# —— 安装依赖 ——
log "install (frozen lockfile) ..."
if ! timeout 600 "$PNPM" install --frozen-lockfile --config.minimum-release-age=0 2>&1; then
  log "FATAL: pnpm install 失败。详见 $LOGFILE"
  exit 1
fi

# —— 构建（失败自动回滚到上一可用版本）——
# 备份当前可用版本
if [ -d dist ]; then rm -rf dist.bak && mv dist dist.bak; fi

log "build -> dist/ ..."
if ! timeout 900 "$PNPM" build 2>&1; then
  if [ -d dist.bak ]; then rm -rf dist && mv dist.bak dist; log "build 失败，已回滚到上一可用版本"; fi
  log "FATAL: pnpm build 失败。详见 $LOGFILE"
  exit 1
fi

rm -rf dist.bak
log "=== deploy done: $(date '+%F %T') ==="
log "完整日志已保存到 $LOGFILE"
