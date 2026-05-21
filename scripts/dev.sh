#!/usr/bin/env bash
# 로컬 풀스택 부팅: postgres + prisma db push + web(:3000) + desktop electron.
# Ctrl+C 한 번이면 web/desktop 같이 죽음. 컨테이너는 계속 둠 (다음 부팅 빠르게).

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ ! -f .env ]; then
  echo "✗ .env 가 없습니다. .env.example 보고 채워주세요." >&2
  exit 1
fi
set -a; . ./.env; set +a

LOG_DIR="$ROOT/.dev-logs"
mkdir -p "$LOG_DIR"
WEB_LOG="$LOG_DIR/web.log"
DESKTOP_LOG="$LOG_DIR/desktop.log"

cleanup() {
  echo ""
  echo "▶ 종료 중..."
  [ -n "${WEB_PID:-}" ] && kill "$WEB_PID" 2>/dev/null || true
  [ -n "${DESKTOP_PID:-}" ] && kill "$DESKTOP_PID" 2>/dev/null || true
  wait 2>/dev/null || true
}
trap cleanup EXIT INT TERM

step() { printf "\n\033[1;36m▶ %s\033[0m\n" "$*"; }

step "1/5 postgres 컨테이너 시작"
docker compose up -d postgres >/dev/null

step "2/5 postgres 준비 대기"
for i in $(seq 1 30); do
  if docker compose exec -T postgres pg_isready -U postgres >/dev/null 2>&1; then
    echo "   ✓ ready"
    break
  fi
  sleep 1
  [ "$i" = "30" ] && { echo "✗ postgres 준비 안 됨"; exit 1; }
done

step "3/5 prisma db push (스키마 동기화)"
npx prisma db push --schema prisma/schema.prisma --skip-generate

step "4/5 web 서버 시작 (localhost:3000)"
# 3000 잡고 있는 잔재 프로세스 정리
if lsof -nP -iTCP:3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
  echo "   ⚠ 3000 사용 중 프로세스 종료"
  lsof -nP -iTCP:3000 -sTCP:LISTEN -t | xargs kill -9 2>/dev/null || true
  sleep 1
fi
( cd "$ROOT/web" && npm run dev > "$WEB_LOG" 2>&1 ) &
WEB_PID=$!
echo "   pid=$WEB_PID  로그: $WEB_LOG"

# Next dev 가 :3000 에 응답할 때까지 대기
for i in $(seq 1 60); do
  if curl -sf http://localhost:3000 >/dev/null 2>&1; then
    echo "   ✓ http://localhost:3000 ok"
    break
  fi
  if ! kill -0 "$WEB_PID" 2>/dev/null; then
    echo "✗ web 서버 죽음. 마지막 로그:"
    tail -40 "$WEB_LOG"
    exit 1
  fi
  sleep 1
  [ "$i" = "60" ] && { echo "✗ web 60초 안에 안 뜸. 로그 확인: $WEB_LOG"; exit 1; }
done

step "5/5 desktop electron 시작"
( cd "$ROOT/desktop" && npm run dev > "$DESKTOP_LOG" 2>&1 ) &
DESKTOP_PID=$!
echo "   pid=$DESKTOP_PID  로그: $DESKTOP_LOG"

cat <<EOF

────────────────────────────────────────────────────────
  웹      http://localhost:3000
  광고주  http://localhost:3000/advertiser
  관리자  http://localhost:3000/admin
  대시보드 http://localhost:3000/dashboard
  데스크탑 Electron 창이 곧 뜹니다

  로그: tail -f $WEB_LOG | tail -f $DESKTOP_LOG
  종료: Ctrl+C
────────────────────────────────────────────────────────
EOF

# 둘 중 하나라도 죽으면 같이 내려옴 (macOS bash 3.2 호환)
while kill -0 "$WEB_PID" 2>/dev/null && kill -0 "$DESKTOP_PID" 2>/dev/null; do
  sleep 1
done
