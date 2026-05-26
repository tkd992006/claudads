# Claude Ad Terminal — 백엔드 리팩터 & 정합성·보안 개선 제안서

## Context

이 프로젝트(**Claude Ad Terminal**)는 광고 노출-토큰 보상 플랫폼이다. Electron 데스크톱 앱이 Claude Code 터미널을 감싸고, Claude가 작업 중일 때 광고 영상을 띄운다. 시청자(개발자)는 토큰을 적립하고, 광고주는 CPM으로 과금된다. npm workspaces 모노레포(`web` = Next.js 15, `desktop` = Electron), Prisma + PostgreSQL.

코어 비즈니스 로직(`web/lib/ads.ts`)은 트랜잭션 원자성·동시성 보정·정수 통화 모델이 잘 설계되어 있다. **그러나** 그 코어를 둘러싼 API 레이어는 MVP 수준에서 멈춰 있다 — 응답 형식이 라우트마다 제각각이고, 인증·검증 보일러플레이트가 복제되어 있으며, 출금/광고주 도메인에는 서비스 레이어가 아예 없다. 또한 **출금 double-spend 레이스 컨디션**, **잔액 O(N) 재계산**, **광고주 원장 부재** 등 정합성 결함이 있다.

이 문서는 사용자가 선택한 두 영역 — **API/백엔드 리팩터** + **정합성·보안 수정** — 에 대한 상세 진단과 단계별 실행 제안서다. (툴링/CI, UI 컴포넌트는 이번 범위 제외.)

목표: 라우트 100개로 늘어나도 무너지지 않는, 일관되고 검증 가능하며 안전한 백엔드.

---

## 1. 현재 상태 진단

### 1-A. API/백엔드 구조 문제

| ID | 문제 | 위치 | 영향 |
|----|------|------|------|
| **A1** | 응답 envelope 5종 혼재 | 전 라우트 | 클라이언트가 단일 에러 핸들러를 못 만든다 |
| **A2** | 인증 보일러플레이트 복제 + `requireUser`가 raw `Response`를 throw | `lib/auth.ts:71-83`, 전 device 라우트 | route handler는 throw된 `Response`를 응답으로 쓰지 않음 → **401/403이 500으로 나갈 가능성**(검증 필요) |
| **A3** | 검증 방식 불일치 — Zod는 1개 라우트만 | `advertiser/ads/route.ts`만 Zod, 나머지 manual | 검증 누락·중복, 공유 스키마 없음 |
| **A4** | 비즈니스 로직이 라우트 핸들러에 인라인 | `withdrawals/route.ts`, `admin/withdrawals/[id]`, `billing`, `admin/ads/[id]` | 테스트·재사용 불가, `ads.ts`와 비대칭 |
| **A5** | BigInt 직렬화를 매번 수동 `.toString()` | `withdrawals` GET/POST, `admin/withdrawals/[id]`×2, `ads/balance` | 누락 시 "Do not know how to serialize a BigInt"로 500 |
| **A6** | 타입 캐스팅으로 세션 접근 | `lib/auth.ts` 전반 `(session as {...})` | 타입 안전성 상실, NextAuth module augmentation 미사용 |
| **A7** | 설정값(매직넘버)이 코드 전역에 산재 | `MIN_WITHDRAW_MICRO`, billing `100_000_000`, device TTL `10*60*1000`, `ads.ts` 상수들 | 튜닝·환경별 분리 불가 |

**A1 응답 형식 5종 상세:**
- `{ error: "msg" }` — 대부분 라우트
- `{ error: <Zod flatten()> }` — `advertiser/ads` (Zod 내부 구조 노출, `error`가 문자열 아닌 객체)
- `{ ok: false, reason: "..." }` — `ads/impression/[id]`, `ads/cta/[id]`가 `recordImpressionComplete`/`recordCta` 결과를 그대로 `NextResponse.json(result)` → **실패해도 HTTP 200**
- `{ status: "pending"|"ok"|"expired" }` — `device/poll`
- 베어 리소스 — `{ ad }`, `{ account }`, `{ ads: [] }`, `{ withdrawals: [...] }`

### 1-B. 정합성·보안 문제

| ID | 심각도 | 문제 | 위치 |
|----|--------|------|------|
| **C1** | **Critical** | 출금 double-spend 레이스 | `api/withdrawals/route.ts:39-57` |
| **C2** | High | `getBalanceMicro` 매 호출 O(N) 전체 원장 스캔, 캐시 없음 | `lib/ads.ts:381-387` |
| **C3** | High | 광고주 잔액(`balanceCents`) 직접 mutate, audit 원장 없음 | `lib/ads.ts`, `billing/route.ts` |
| **C4** | High | 출금 거절이 멱등하지 않음 → 중복 환불 | `api/admin/withdrawals/[id]/route.ts:15-34` |
| **C5** | Medium | `action` enum 미검증 + 존재하지 않는 id update 시 500 | `admin/ads/[id]`, `admin/withdrawals/[id]` |
| **C6** | Low | 업로드 `contentType` 화이트리스트 미흡 | `api/upload/sign/route.ts` |
| **C7** | Low | `getBalanceMicro` 결과가 음수 가능, 불변식 가드 없음 | `lib/ads.ts` |

**C1 — 출금 double-spend (가장 위험):**
`route.ts:40`의 `getBalanceMicro(userId)`는 `$transaction` 콜백 안에 있지만, **전역 `prisma` 클라이언트로** 읽는다(`tx` 아님). 게다가 잔액은 원장 합산값이라 잠글 row가 없다. Postgres 기본 격리수준(READ COMMITTED)에서 동시 출금 2건이 같은 잔액을 읽고 둘 다 체크를 통과 → 둘 다 ledger insert → **잔액 초과 인출**. `ads.ts`가 예산 차감에서 쓴 조건부 `updateMany` 패턴이 여기엔 적용 안 되어 있다.

**C4 — 출금 거절 비멱등:**
`admin/withdrawals/[id]/route.ts:19` 가드가 `w.status === "PAID"`뿐. 이미 `REJECTED`인 출금을 다시 거절하면 `ADJUSTMENT` 환불 ledger가 **한 번 더** 쌓여 사용자에게 이중 적립.

**C5 — 관리자 라우트:**
`admin/ads/[id]/route.ts`는 `prisma.ad.update`를 존재 확인 없이 호출 → 없는 id면 예외 → 스택 포함 500(404여야 함). `action`은 자유 문자열로 받아 분기.

(참고 — `ads.ts:296-305`의 EXHAUSTED 재확인은 `after.spentCents`에 이미 `cost`가 반영된 뒤 다시 `+ cost`를 더해 비교하므로 광고를 1회 일찍 소진 처리한다. 경제적 영향은 미미해 이번 범위에서는 nit으로만 기록.)

---

## 2. 제안 아키텍처

라우트는 **얇은 어댑터**, 도메인 로직은 **서비스 레이어**, 횡단 관심사(인증·검증·에러·직렬화)는 **공통 핸들러 래퍼**로 분리한다.

```
web/lib/
  api/
    handler.ts      ← route() 래퍼: 인증 + Zod 검증 + 에러→응답 + BigInt-safe JSON
    errors.ts       ← ApiError 클래스 + 표준 에러 코드
    response.ts     ← { data } / { error } envelope, jsonSafe() BigInt 직렬화
  schemas/
    withdrawal.ts   ← Zod 스키마 (도메인별)
    ad.ts
    advertiser.ts
    device.ts
    admin.ts
  services/
    withdrawals.ts  ← requestWithdrawal / list / approve / markPaid / reject
    advertiser.ts   ← getOrCreateAccount / chargeAccount / createAd / listAds
    admin.ts        ← approveAd / rejectAd (존재 확인 포함)
    ledger.ts       ← appendTokenLedger / appendAdvertiserLedger (원장+캐시 단일 진입점)
  ads.ts            ← 기존 노출/광고선택 서비스 유지, ledger 쓰기만 ledger.ts 경유
  config.ts         ← 전 튜닝값 단일 정의 (MIN_WITHDRAW_MICRO, billing cap, device TTL ...)
web/types/
  next-auth.d.ts    ← Session/JWT module augmentation (캐스팅 제거)
```

### 2-1. `route()` 핸들러 래퍼 (A1·A2·A3·A5 동시 해결)

```ts
// web/lib/api/handler.ts (스케치)
export function route<B>(opts: {
  auth: "none" | "session" | "admin" | "bearer";
  body?: ZodType<B>;
  handler: (ctx: {
    actor: { userId: string; role?: string } | null;
    body: B;
    params: Record<string, string>;
    req: Request;
  }) => Promise<unknown>;
}) {
  return async (req: Request, rc: { params?: Promise<Record<string,string>> }) => {
    try {
      const actor  = await resolveAuth(opts.auth, req);        // 실패 시 ApiError(401/403)
      const params = (await rc.params) ?? {};
      const body   = opts.body ? parseOrThrow(opts.body, req)  // 실패 시 ApiError(400)
                               : (undefined as B);
      const data   = await opts.handler({ actor, body, params, req });
      return NextResponse.json({ data: jsonSafe(data) });      // BigInt 재귀 .toString()
    } catch (e) {
      if (e instanceof ApiError)
        return NextResponse.json(
          { error: { code: e.code, message: e.message, details: e.details } },
          { status: e.status });
      console.error("[api] unhandled", e);
      return NextResponse.json(
        { error: { code: "INTERNAL", message: "internal error" } }, { status: 500 });
    }
  };
}
```

라우트는 이렇게 줄어든다:

```ts
// web/app/api/withdrawals/route.ts (리팩터 후)
export const POST = route({
  auth: "session",
  body: withdrawalCreateSchema,
  handler: ({ actor, body }) =>
    requestWithdrawal(actor!.userId, body.amountMicro, body.destination,
                      actor!.role === "ADMIN"),
});
```

**표준 응답 계약:**
- 성공 → `200 { data: <payload> }` (BigInt 자동 문자열화)
- 실패 → `4xx/5xx { error: { code, message, details? } }`

이 계약으로 `ads/impression`·`ads/cta`의 "HTTP 200 + `{ok:false}`" 문제도 해소된다. 서비스가 `ApiError`를 throw하면 래퍼가 올바른 상태코드로 변환한다.

### 2-2. `ApiError` + 표준 코드 (errors.ts)

```ts
export class ApiError extends Error {
  constructor(
    public code: string,     // "INSUFFICIENT" | "BELOW_MINIMUM" | "NOT_FOUND" | ...
    public status: number,   // 400 | 401 | 403 | 404 | 409 | 429 | 500
    message: string,
    public details?: unknown,
  ) { super(message); }
}
```

`recordImpressionComplete`/`recordCta`의 `{ok:false, reason}` 판별 유니온은 `ApiError`로 치환하거나, 래퍼가 reason→status 매핑을 적용한다. (어느 쪽이든 desktop 클라이언트 동기 수정 필요 — §4 참조.)

### 2-3. NextAuth module augmentation (A6)

```ts
// web/types/next-auth.d.ts
declare module "next-auth" {
  interface Session { userId: string; role: "VIEWER" | "ADMIN"; banned: boolean; }
}
declare module "next-auth/jwt" {
  interface JWT { userId?: string; role?: string; banned?: boolean; githubId?: string; }
}
```

`lib/auth.ts`의 `(session as {...})` 캐스팅 전부 제거. `requireUser`/`requireAdmin`은 **서버 컴포넌트 전용**(redirect)으로 남기고, **라우트 핸들러는 `route({auth})` 래퍼가 인증을 전담** → 라우트에서 `requireUser` 직접 호출 제거 → A2의 "throw Response" 위험 자체가 사라진다.

---

## 3. 정합성·보안 수정 상세

### C1 — 출금 double-spend (잔액 컬럼 + 조건부 차감)

근본 해결은 **잔액을 materialized 컬럼으로** 두고, `ads.ts`의 예산 차감과 동일한 조건부 `updateMany`로 인출하는 것:

```ts
// services/withdrawals.ts
export async function requestWithdrawal(userId, amountMicro, destination, isAdmin) {
  if (amountMicro <= 0n) throw new ApiError("BAD_AMOUNT", 400, "amount must be positive");
  if (!isAdmin && amountMicro < config.MIN_WITHDRAW_MICRO)
    throw new ApiError("BELOW_MINIMUM", 400, "below minimum");
  return prisma.$transaction(async (tx) => {
    const dec = await tx.user.updateMany({                  // 잔액 충분할 때만 성공
      where: { id: userId, balanceMicro: { gte: amountMicro } },
      data:  { balanceMicro: { decrement: amountMicro } },
    });
    if (dec.count === 0) throw new ApiError("INSUFFICIENT", 400, "insufficient balance");
    const w = await tx.withdrawal.create({ data: { userId, amountMicro, destination } });
    await tx.tokenLedger.create({
      data: { userId, deltaMicro: -amountMicro, reason: "WITHDRAWAL", refId: w.id } });
    return w;
  });
}
```

조건부 `updateMany`에는 check-then-act 간극이 없다 → 레이스 제거.

**중간 옵션(스키마 변경 전 긴급 패치 필요 시):** 트랜잭션 첫 줄에서 Postgres advisory lock —
`SELECT pg_advisory_xact_lock(hashtextextended($userId, 0))` — 으로 사용자별 직렬화. 스키마 변경 없이 C1만 즉시 차단 가능. 단 최종 형태는 위 잔액 컬럼 방식 권장.

### C2 — 잔액 O(N) → O(1)

Prisma 스키마에 `User.balanceMicro BigInt @default(0)` 추가. 모든 원장 쓰기를 `ledger.ts`의 단일 헬퍼로 일원화:

```ts
// services/ledger.ts
export async function appendTokenLedger(tx, e: {
  userId: string; deltaMicro: bigint; reason: LedgerReason; refId?: string;
}) {
  await tx.tokenLedger.create({ data: e });
  await tx.user.update({
    where: { id: e.userId }, data: { balanceMicro: { increment: e.deltaMicro } } });
}
```

`ads.ts`의 `tokenLedger.create` 2곳(impression·CTA), 출금, 출금거절 환불 모두 이 헬퍼 경유. `getBalanceMicro`는 컬럼 1회 read로 단축. 마이그레이션 시 기존 사용자 백필: `balanceMicro = SUM(deltaMicro)`.

### C3 — 광고주 audit 원장

`TokenLedger`를 미러링한 `AdvertiserLedger` 모델 신설:

```prisma
model AdvertiserLedger {
  id           String   @id @default(cuid())
  advertiserId String
  deltaCents   Int
  reason       AdvLedgerReason   // CHARGE | IMPRESSION | CTA | REFUND | ADJUSTMENT
  refId        String?
  createdAt    DateTime @default(now())
  advertiser   AdvertiserAccount @relation(fields: [advertiserId], references: [id])
  @@index([advertiserId, createdAt])
}
```

`billing`(CHARGE), `ads.ts` impression/CTA 차감을 `appendAdvertiserLedger`로 일원화 → 광고주 과금 내역 audit·분쟁 대응·정산 가능. 백필: 광고주별 현재 `balanceCents`를 단일 `ADJUSTMENT` row로 시드.

### C4 — 출금 거절 멱등화

`services/withdrawals.ts`의 `rejectWithdrawal`에서 상태 가드를 강화: `REQUESTED` 또는 `APPROVED`에서만 거절 허용, 그 외(`REJECTED`/`PAID`)는 `ApiError("INVALID_STATE", 409)`. 환불 `ADJUSTMENT`는 정확히 1회만.

### C5 — 관리자 라우트 견고화

`admin.ts` 서비스의 `approveAd`/`rejectAd`가 먼저 `findUnique` → 없으면 `ApiError("NOT_FOUND", 404)`. `action`은 `schemas/admin.ts`의 `z.enum([...])`로 검증(잘못된 값 → 400).

### C6 — 업로드 contentType 화이트리스트

`schemas/...`에서 `contentType: z.enum(["video/mp4","video/webm"])`로 제한. `signPut`에 검증된 값만 전달.

### C7 — 음수 잔액 불변식

C1/C2 적용 후 출금은 조건부 차감으로 음수가 구조적으로 불가능. 추가로 `balanceMicro`와 `SUM(tokenLedger.deltaMicro)`가 일치하는지 검증하는 **reconciliation 테스트/스크립트**를 둬 회귀 방어.

---

## 4. 영향 범위 — desktop 클라이언트 연동

응답 envelope 표준화는 desktop 앱이 소비하는 엔드포인트(`/ads/serve`, `/ads/impression/[id]`, `/ads/cta/[id]`, `/ads/balance`, `/device/poll`)에 영향. **`web`만 바꾸면 desktop이 깨진다.** 동기 수정 대상:
- `desktop/src/main/apiClient.ts` — 응답 파싱을 `res.data` / `res.error.code` 기준으로
- `desktop/src/renderer/AdOverlay.tsx` — impression/CTA 결과 처리
- `desktop/src/renderer/BalanceBar.tsx` — `data.balanceMicro`

범위는 "API/백엔드"지만 계약 변경의 필연적 연동이므로 같은 Phase에서 함께 처리한다.

---

## 5. 단계별 실행 로드맵

### Phase 0 — 스키마 변경 없는 즉시 수정 (~0.5일)
- **C4** 출금 거절 멱등화 (상태 가드)
- **C5** 관리자 라우트: enum 검증 + 존재 확인(404)
- **C6** 업로드 contentType 화이트리스트
- **C1 긴급 차단**(선택): advisory lock 적용 — Phase 3에서 잔액 컬럼 방식으로 대체
- 변경: `api/admin/withdrawals/[id]/route.ts`, `api/admin/ads/[id]/route.ts`, `api/upload/sign/route.ts`, `api/withdrawals/route.ts`

### Phase 1 — API 인프라 레이어 (~1.5일)
- `lib/api/{errors,response,handler}.ts`, `lib/config.ts`, `lib/schemas/*`
- `types/next-auth.d.ts` augmentation, `lib/auth.ts` 캐스팅 제거
- 전 라우트를 `route()` 래퍼로 이전 (도메인 단위로: device → ads → advertiser → admin → withdrawals)
- 응답 envelope `{data}`/`{error}` 표준화 + **desktop 클라이언트 동기 수정**(§4)
- 변경: `web/app/api/**` 전체, `desktop/src/main/apiClient.ts`, `desktop/src/renderer/{AdOverlay,BalanceBar}.tsx`

### Phase 2 — 서비스 레이어 추출 (~1일)
- `lib/services/{withdrawals,advertiser,admin,ledger}.ts` 신설
- `withdrawals`·`billing`·`admin/ads`·`admin/withdrawals`·`advertiser/account`·`advertiser/ads` 라우트의 인라인 로직을 서비스로 이동 → 라우트는 5~10줄
- 변경: 위 라우트들 + 신규 `services/*`

### Phase 3 — 잔액·원장 정합성 (스키마 변경, ~1.5일)
- Prisma: `User.balanceMicro` 추가, `AdvertiserLedger` 모델 추가, `AdvLedgerReason` enum
- 백필: `balanceMicro = SUM(ledger)`, 광고주별 `ADJUSTMENT` 시드
- `ledger.ts` 헬퍼로 모든 원장 쓰기 일원화 (`ads.ts` 2곳 포함)
- **C1** 최종 수정(조건부 차감), **C2** `getBalanceMicro` O(1)화, **C3** 광고주 원장 가동
- reconciliation 테스트 추가
- 변경: `prisma/schema.prisma`, `lib/ads.ts`, `lib/services/*`, `prisma/seed.ts` 또는 백필 스크립트

권장 순서: Phase 0 → 1 → 2 → 3. Phase 0는 독립적이라 즉시 착수 가능. Phase 3는 스키마 변경(`prisma db push` + 백필)이 있어 마지막.

---

## 6. 핵심 변경 파일 요약

| 파일 | Phase | 작업 |
|------|-------|------|
| `web/lib/api/handler.ts` `errors.ts` `response.ts` | 1 | 신규 — 핸들러 인프라 |
| `web/lib/config.ts` | 1 | 신규 — 튜닝값 단일화 (A7) |
| `web/lib/schemas/*.ts` | 0–1 | 신규 — 도메인별 Zod 스키마 (A3) |
| `web/types/next-auth.d.ts` | 1 | 신규 — module augmentation (A6) |
| `web/lib/services/{withdrawals,advertiser,admin,ledger}.ts` | 2–3 | 신규 — 서비스 레이어 (A4) |
| `web/app/api/**` | 0–2 | 전 라우트 래퍼화·envelope 표준화 |
| `web/lib/auth.ts` | 1 | 캐스팅 제거 |
| `web/lib/ads.ts` | 3 | 원장 쓰기 `ledger.ts` 경유, `getBalanceMicro` O(1) |
| `prisma/schema.prisma` | 3 | `User.balanceMicro`, `AdvertiserLedger` |
| `desktop/src/main/apiClient.ts`, `renderer/{AdOverlay,BalanceBar}.tsx` | 1 | envelope 연동 |

---

## 7. 검증 방법

- **단위 테스트(Vitest, 기존 `web/lib/ads.test.ts` 확장):**
  - `requestWithdrawal` — 동시 2건 호출 시 정확히 1건만 성공(C1), 음수/최소금액/admin 우회
  - `rejectWithdrawal` — 이미 REJECTED 재거절 시 환불 0회(C4)
  - `appendTokenLedger` — `balanceMicro == SUM(ledger)` 불변식
  - reconciliation 스크립트 — 전 사용자 잔액 일치
- **수동 E2E (`scripts/dev.sh`로 web+DB 기동):**
  - 출금 신청 → 관리자 승인/거절/지급 흐름, 잔액 정확성
  - 광고주 충전 → 광고 노출 → `AdvertiserLedger` 기록 확인
  - desktop 앱(`scripts/dev.sh 1`)에서 광고 시청 → 적립 → 잔액바 갱신이 새 envelope로 정상 동작
- **회귀 가드:** 모든 API가 `{data}`/`{error}` 계약을 지키는지 — 잘못된 입력에 4xx + `error.code` 반환 확인.
