# syntax=docker/dockerfile:1.7
#
# Web production image — Next.js 15 standalone output.
# Build context = repo root (Railway 의 Root Directory = / , Dockerfile = web/Dockerfile).
#
# 3-stage:
#   deps    : npm ci (electron 바이너리 다운로드는 건너뜀)
#   builder : prisma generate + next build → .next/standalone
#   runner  : standalone bundle + static + public + prisma CLI(마이그레이션용)
#

ARG NODE_VERSION=20

# ─── deps ────────────────────────────────────────────────────────────────
FROM node:${NODE_VERSION}-slim AS deps
WORKDIR /app

# Prisma 가 OpenSSL 을 동적 로딩한다. slim 에 빠져있으니 명시 설치.
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# workspaces 가 desktop 도 들고 있어서 desktop/package.json 도 함께 카피해야
# npm ci 가 lockfile 무결성 검증을 통과한다.
COPY package.json package-lock.json ./
COPY web/package.json web/package.json
COPY desktop/package.json desktop/package.json
COPY prisma/schema.prisma prisma/schema.prisma

# --ignore-scripts 로 desktop 의 native postinstall (node-pty gyp compile,
# electron 바이너리 다운로드) 을 통째로 스킵한다. web 이미지엔 둘 다 필요 없음.
# Prisma 엔진은 builder 의 `prisma generate` 단계에서 알아서 받아온다.
RUN npm ci --ignore-scripts --no-audit --no-fund

# ─── builder ─────────────────────────────────────────────────────────────
FROM deps AS builder
WORKDIR /app

# 빌드에 필요한 소스 전부. .dockerignore 가 desktop/src, .next, node_modules 등 컷.
COPY . .

RUN npx prisma generate --schema prisma/schema.prisma
RUN npm -w web run build

# ─── runner ──────────────────────────────────────────────────────────────
FROM node:${NODE_VERSION}-slim AS runner
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    NEXT_TELEMETRY_DISABLED=1

RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates tini \
 && rm -rf /var/lib/apt/lists/* \
 && groupadd -r app && useradd -r -g app -d /app app

# Standalone bundle : server.js + 트레이스된 최소 node_modules.
# outputFileTracingRoot 가 모노레포 루트라서 구조는:
#   .next/standalone/
#     ├── node_modules/...
#     ├── package.json
#     └── web/
#         ├── server.js
#         └── .next/server/...
COPY --from=builder --chown=app:app /app/web/.next/standalone ./

# 정적 자산 — standalone 이 자동으로 안 옮겨주는 두 디렉토리.
COPY --from=builder --chown=app:app /app/web/.next/static ./web/.next/static
COPY --from=builder --chown=app:app /app/web/public ./web/public

# Prisma CLI + 엔진 + 스키마 — Railway pre-deploy 가 `prisma migrate deploy`
# 를 같은 이미지에서 돌리려면 필요.
COPY --from=builder --chown=app:app /app/prisma ./prisma
COPY --from=builder --chown=app:app /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder --chown=app:app /app/node_modules/@prisma ./node_modules/@prisma

USER app
EXPOSE 3000

# tini = PID 1 좀비 reaper. Next 서버가 SIGTERM 을 깔끔히 처리하게.
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "web/server.js"]
