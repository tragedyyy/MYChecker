#!/usr/bin/env bash
# Установка MYChecker (Ubuntu/Debian). Запускать из папки репозитория: bash install.sh
set -euo pipefail

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
info() { echo -e "${GREEN}[+]${NC} $*"; }
warn() { echo -e "${YELLOW}[!]${NC} $*"; }
die()  { echo -e "${RED}[x]${NC} $*" >&2; exit 1; }

cd "$(dirname "$0")"

# 1. bun
if ! command -v bun >/dev/null 2>&1; then
  warn "bun не найден — устанавливаю"
  command -v curl >/dev/null 2>&1 || die "нужен curl: sudo apt-get install -y curl"
  curl -fsSL https://bun.sh/install | bash
  export BUN_INSTALL="$HOME/.bun"
  export PATH="$BUN_INSTALL/bin:$PATH"
fi
command -v bun >/dev/null 2>&1 || die "bun не установился — перезайдите в шелл и повторите"
info "bun $(bun --version)"

# 2. зависимости
info "устанавливаю зависимости (пара минут)"
bun install

# 3. регистрация команды
if bun link >/dev/null 2>&1; then
  info "команда mychecker зарегистрирована (обычно ~/.bun/bin)"
else
  warn "bun link не сработал — запускайте через 'bun mychecker.ts'"
fi

# 4. проверка
if bun mychecker.ts --help >/dev/null 2>&1; then
  info "проверка пройдена: инструмент запускается"
else
  die "инструмент не запускается — смотрите вывод выше"
fi

cat <<'EOF'

Готово. Примеры:

  mychecker "ваша мнемоника" --paths
  mychecker "ваша мнемоника" --check
  mychecker --init-config

Если команда mychecker не найдена, добавьте в ~/.bashrc:

  export PATH="$HOME/.bun/bin:$PATH"
EOF
