#!/usr/bin/env bash
#
# Mac 빌드 → R2 업로드 → 공개 URL 출력까지 한 번에.
#
# 사용:
#   npm run ship:mac
#   또는 직접: ./scripts/ship-mac.sh
#
# 사전:
#   - desktop/.env.build       (APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, APPLE_TEAM_ID)
#   - .env / web/.env(.local)  (R2_* + R2_RELEASES_PUBLIC_BASE)
#
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f desktop/.env.build ]; then
  echo "❌ desktop/.env.build 가 없습니다. APPLE_* 환경변수 박아주세요." >&2
  exit 1
fi

echo "▶ [1/3] Apple 인증 env 로드"
# shellcheck disable=SC1091
source desktop/.env.build

echo "▶ [2/3] 빌드 + 서명 + 노타리제이션 (5–15분 소요)"
npm -w desktop run dist

# 빌드 산출물 자동 탐색 — release/ 아래 .dmg 중 가장 최근.
DMG=$(ls -t desktop/release/*.dmg 2>/dev/null | head -n1 || true)
if [ -z "$DMG" ]; then
  echo "❌ desktop/release/*.dmg 를 못 찾았어요. 빌드 로그 확인 필요." >&2
  exit 1
fi
echo "  → built: $DMG"

echo "▶ [3/3] R2 업로드"
URL=$(node scripts/upload-release.mjs "$DMG")

echo ""
echo "✓ 완료. 다운로드 URL:"
echo "  $URL"

# macOS 면 클립보드까지 — 마케팅 페이지에 붙여넣기 편하게.
if command -v pbcopy >/dev/null 2>&1; then
  printf "%s" "$URL" | pbcopy
  echo "  (클립보드에 복사됨)"
fi
