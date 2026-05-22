import { prisma } from "./prisma";
import type { Ad } from "@prisma/client";

// ─── 통화 모델 ──────────────────────────────────────────────────────────────
// 시청자 보상은 micro(1/1_000_000 KRW 가상토큰), 광고주 과금은 cent 단위다.
// 환산은 1 cent = 10_000 micro.
//
// 핵심 규칙: 광고주는 언제나 "시청자가 가져갈 돈 × 1.25" 를 과금당한다.
//   → 시청자 몫 = 1/1.25 = 80%, 플랫폼 마진 = 20%.
// 과금(cent)을 정수 anchor 로 잡고 시청자 보상 = 과금 × 8_000 micro 로 두면,
// 과금 micro(= 과금 × 10_000) ÷ 보상 micro = 10_000/8_000 = 1.25 가 반올림 없이
// 정확히 성립한다. (그래서 보상을 먼저 구하고 과금을 나누지 않고, 그 반대로 한다.)
const VIEWER_MICRO_PER_COST_CENT = 8_000n;

// 광고주 과금(cent) → 시청자 보상(micro). 1.25 배 규칙의 단일 정의점.
export function viewerRewardForCost(costCents: number): bigint {
  return BigInt(Math.max(0, Math.floor(costCents))) * VIEWER_MICRO_PER_COST_CENT;
}

// 동시 시청 보정 계수. 한 유저가 N 개 세션에서 광고를 동시에 봐도 집중·광고
// 효과가 N 배는 아니므로 1 view 당 (2N-1)/N² 로 sub-linear 하게 깎는다.
// N 개 합계 = N×(2N-1)/N² = 2-1/N. N=1→1, N=2→합계 1.5x, N→∞→2x 수렴.
// 시청자 보상뿐 아니라 광고주 과금도 이 계수로 깎인다 — N 배 노출에 N 배를
// 물리면 어뷰징 표면이 너무 커지기 때문.
export function concurrencyFactor(concurrentN: number): number {
  const n = Math.max(1, Math.floor(concurrentN));
  return (2 * n - 1) / (n * n);
}

// 광고 1회 노출에 광고주가 낼 cent. CPM/1000(노출 1회분)을 동시시청 보정과
// 시청 비율로 깎고 올림. cpmCents ≥ 1 이므로 결과는 항상 ≥ 1 cent.
export function impressionCostCents(
  cpmCents: number,
  concurrentN: number,
  watchedFraction: number,
): number {
  const raw =
    (cpmCents / 1000) * concurrencyFactor(concurrentN) * watchedFraction;
  return Math.ceil(raw);
}

// CTA 클릭 시 광고주 과금 = 노출 기본 과금(N=1·full)의 3배.
export function ctaCostCents(cpmCents: number): number {
  return 3 * Math.ceil(cpmCents / 1000);
}

// 동시성 N 을 셀 때, imp 시작 시각 기준 이만큼 이전까지 시작된 impression 을
// "겹친 것" 으로 본다. 버려진(미완료) impression 이 오래 N 을 부풀리지 않도록 제한.
const CONCURRENCY_WINDOW_MS = 5 * 60 * 1000;

// 유저별 적립 백스톱. 이 시간창 안에서 IMPRESSION 적립이 이 횟수 이상이면 거절.
const RATE_WINDOW_MS = 60 * 60 * 1000;
const MAX_IMPRESSIONS_PER_WINDOW = 300;

// 광고가 끝까지 재생되지 않고 (작업 종료/입력 대기 등으로) 중단돼도 적립은
// 한다. 단 2단계: 90% 이상 봤으면 full(100%), 그 미만이면 본 양에 관계없이
// flat 50%. 1초 미만은 노출로 치지 않는다. 본 만큼 비례하지 않는 이유는
// 정확한 시청 시간을 노린 어뷰징(85%만 보고 빠지기 등)을 없애기 위함.
const MIN_WATCH_SEC = 1;
const FULL_CREDIT_FRACTION = 0.9;
const PARTIAL_CREDIT_FRACTION = 0.5;

// 공통 1차/2차 필터: 승인/스케줄/예산/일캡. 24h dedup 여부는 옵션.
async function fetchEligibleAds(
  userId: string,
  opts: { dedup24h: boolean },
): Promise<Ad[]> {
  const now = new Date();
  const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const todayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );

  const candidates = await prisma.ad.findMany({
    where: {
      status: "APPROVED",
      AND: [
        { OR: [{ scheduleStart: null }, { scheduleStart: { lte: now } }] },
        { OR: [{ scheduleEnd: null }, { scheduleEnd: { gte: now } }] },
      ],
      ...(opts.dedup24h
        ? { impressions: { none: { userId, startedAt: { gte: since } } } }
        : {}),
    },
  });

  // 광고주 계정 잔액: 노출 1회분(full cost)도 못 댈 광고주의 광고는 후보에서
  // 뺀다. 런타임 atomic 차감이 정합성을 보장하므로 이 필터는 "헛봄"(시청자가
  // 봤는데 광고주가 못 내는 노출)을 줄이는 용도. 상태를 안 건드리므로 광고주가
  // 충전하면 별도 작업 없이 자동으로 다시 후보가 된다.
  const accounts = await prisma.advertiserAccount.findMany({
    where: { id: { in: [...new Set(candidates.map((a) => a.advertiserId))] } },
    select: { id: true, balanceCents: true },
  });
  const balanceById = new Map(accounts.map((a) => [a.id, a.balanceCents]));

  const eligible: Ad[] = [];
  for (const ad of candidates) {
    if (ad.spentCents >= ad.budgetCapCents) continue;
    if ((balanceById.get(ad.advertiserId) ?? 0) < Math.ceil(ad.cpmCents / 1000))
      continue;
    if (ad.dailyCapImpressions != null) {
      const todayCount = await prisma.impression.count({
        where: { adId: ad.id, startedAt: { gte: todayStart } },
      });
      if (todayCount >= ad.dailyCapImpressions) continue;
    }
    eligible.push(ad);
  }
  return eligible;
}

function weightedPick(eligible: Ad[], weights: number[]): Ad | null {
  if (eligible.length === 0) return null;
  const total = weights.reduce((s, w) => s + w, 0);
  if (total <= 0) return eligible[Math.floor(Math.random() * eligible.length)];
  let r = Math.random() * total;
  for (let i = 0; i < eligible.length; i++) {
    r -= weights[i];
    if (r <= 0) return eligible[i];
  }
  return eligible[eligible.length - 1];
}

export async function selectAdForUser(userId: string): Promise<Ad | null> {
  const eligible = await fetchEligibleAds(userId, { dedup24h: true });
  if (eligible.length === 0) return null;

  // 가중치: 잔여예산 + 약간의 jitter
  const weights = eligible.map((a) => {
    const remaining = Math.max(1, a.budgetCapCents - a.spentCents);
    return remaining * (0.5 + Math.random());
  });
  return weightedPick(eligible, weights);
}

// Fallback: 24h dedup 을 푼 채로 같은 풀을 다시 보지만, 이 유저에게 가장
// 최근에 보여준 광고일수록 가중치를 깎아 회전을 강제. 신선도(시간) × 잔여예산
// × 약한 jitter 의 곱으로 weighted random.
//
// 신선도: 마지막 노출 이후 경과 분(min) 을 24h 로 클램프한 뒤 +1
//   - 방금 본 광고 → 1 (낮음)
//   - 24h 전에 본 광고 → 1441 (높음)
//   - 한 번도 안 본 광고 → 1441 (최대치) — fallback 풀에선 거의 없는 케이스지만
//     광고가 새로 들어온 직후 primary 가 다른 이유로 실패한 경우를 대비.
export async function selectFallbackAdForUser(
  userId: string,
): Promise<Ad | null> {
  const eligible = await fetchEligibleAds(userId, { dedup24h: false });
  if (eligible.length === 0) return null;

  const recent = await prisma.impression.groupBy({
    by: ["adId"],
    where: { userId, adId: { in: eligible.map((a) => a.id) } },
    _max: { startedAt: true },
  });
  const lastShown = new Map<string, Date | null>(
    recent.map((r) => [r.adId, r._max.startedAt ?? null]),
  );

  const now = Date.now();
  const DAY_MIN = 24 * 60;
  const weights = eligible.map((a) => {
    const last = lastShown.get(a.id) ?? null;
    const minsSince = last
      ? Math.min(DAY_MIN, (now - last.getTime()) / 60_000)
      : DAY_MIN;
    const freshness = minsSince + 1; // 1 ~ 1441
    const remaining = Math.max(1, a.budgetCapCents - a.spentCents);
    const jitter = 0.7 + Math.random() * 0.6; // 0.7 ~ 1.3
    return freshness * remaining * jitter;
  });
  return weightedPick(eligible, weights);
}

export async function recordImpressionStart(args: {
  adId: string;
  userId: string;
  deviceId: string;
  ipHash: string;
}) {
  const imp = await prisma.impression.create({ data: args });
  return imp;
}

// serve 스팸 백스톱. 짧은 창 안에 이 횟수 이상 serve 하면 거절한다. 정상
// 유저(빠른 에이전트 루프·멀티 인스턴스 포함)는 절대 닿지 않는 높은 임계값으로,
// 초당 수십~수백 회로 dedup 풀을 오염시키는 스크립트 스팸만 잡는 용도다.
const SERVE_BURST_WINDOW_MS = 60 * 1000;
const SERVE_BURST_MAX = 40;

export async function serveRateLimited(userId: string): Promise<boolean> {
  const recent = await prisma.impression.count({
    where: {
      userId,
      startedAt: { gte: new Date(Date.now() - SERVE_BURST_WINDOW_MS) },
    },
  });
  return recent >= SERVE_BURST_MAX;
}

// 24h 넘게 미완료로 남은 impression 은 버려진 것이다 — 24h dedup 풀과 DB 를
// 더럽히므로 정리한다. >24h 행은 dedup·동시성 계산 어디에도 안 쓰이고 완료
// 시도해도 expired 로 걸리므로 삭제는 안전하다. cron 인프라 없이 serve 시
// 낮은 확률로 기회적 청소한다.
export async function cleanupGhostImpressions(): Promise<number> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const res = await prisma.impression.deleteMany({
    where: { completedAt: null, startedAt: { lt: cutoff } },
  });
  return res.count;
}

export async function recordImpressionComplete(
  impressionId: string,
  userId: string,
  playedSec?: number,
) {
  return prisma.$transaction(async (tx) => {
    const imp = await tx.impression.findUnique({
      where: { id: impressionId },
      include: { ad: true },
    });
    if (!imp || imp.userId !== userId)
      return { ok: false as const, reason: "not_found" };
    if (imp.completedAt) return { ok: false as const, reason: "already" };

    // elapsed 는 서버가 기록한 startedAt 기준 — 클라이언트가 위조 불가.
    const elapsedSec = (Date.now() - imp.startedAt.getTime()) / 1000;
    if (elapsedSec > imp.ad.durationSec * 3 + 5) {
      return { ok: false as const, reason: "expired" };
    }

    // 재생 증명: playedSec 은 클라이언트가 보고한 영상 최대 재생 지점(초)이다.
    // 그대로 믿지 않고 서버 벽시계 elapsedSec 로 상한을 씌운다 —
    //   · 부풀려 보내도 elapsedSec 를 못 넘으므로 이득 없음(playbackRate 빨리감기 무력화)
    //   · 영상이 아예 재생되지 않았으면(차단·로드 실패) playedSec≈0 → watchedSec≈0 → 적립 0
    // watchedSec 가 "신뢰 가능한, 실제로 본 시간" 의 하한이다.
    const playhead = Number.isFinite(playedSec) ? Math.max(0, playedSec!) : 0;
    const watchedSec = Math.min(playhead, elapsedSec);
    if (watchedSec < MIN_WATCH_SEC) {
      return { ok: false as const, reason: "too_short" };
    }
    // 90% 이상은 버퍼링 슬랙을 흡수해 full(1.0)로 인정하고, 그 미만은 본 양에
    // 관계없이 flat 50%. 보상·과금 둘 다 이 비율로 스케일된다.
    const rawFraction = watchedSec / imp.ad.durationSec;
    const watchedFraction =
      rawFraction >= FULL_CREDIT_FRACTION ? 1 : PARTIAL_CREDIT_FRACTION;

    // 적립 백스톱: 어뷰징(다중 세션 대량 적립) 방지용 절대 상한.
    const recentRewards = await tx.tokenLedger.count({
      where: {
        userId,
        reason: "IMPRESSION",
        createdAt: { gte: new Date(Date.now() - RATE_WINDOW_MS) },
      },
    });
    if (recentRewards >= MAX_IMPRESSIONS_PER_WINDOW) {
      return { ok: false as const, reason: "rate_limited" };
    }

    // 원자적 claim: completedAt 이 NULL 인 행만 갱신. 같은 impression 에 대한
    // 동시 요청 중 정확히 하나만 count===1 을 받고 나머지는 "already" — 중복 적립 차단.
    const claimed = await tx.impression.updateMany({
      where: { id: impressionId, completedAt: null },
      data: { completedAt: new Date() },
    });
    if (claimed.count === 0) return { ok: false as const, reason: "already" };

    // 동시 시청 수 N: 이 impression 의 재생 구간과 겹친 같은 유저의 impression
    // (미완료이거나 imp 시작 이후 완료된 것). self 도 포함되어 N>=1. 시청자
    // 보상과 광고주 과금 모두 이 N 으로 sub-linear 하게 깎인다.
    const concurrentN = await tx.impression.count({
      where: {
        userId,
        startedAt: {
          gte: new Date(imp.startedAt.getTime() - CONCURRENCY_WINDOW_MS),
        },
        OR: [{ completedAt: null }, { completedAt: { gt: imp.startedAt } }],
      },
    });

    // 광고주 과금(cent) — 동시시청 보정·시청비율이 모두 반영된 최종값.
    // 시청자 보상 = 과금 × 8_000 micro 이므로 "과금 = 보상 × 1.25" 가 정확히 성립.
    const cost = impressionCostCents(
      imp.ad.cpmCents,
      concurrentN,
      watchedFraction,
    );
    const reward = viewerRewardForCost(cost);

    // 원자적 조건부 예산 차감: 예산이 남는 경우에만 증가. 동시 완료가
    // budgetCap 을 넘겨 광고주에게 과금되는 것을 막는다(여기서 "나머지는 거절").
    const spent = await tx.ad.updateMany({
      where: { id: imp.adId, spentCents: { lte: imp.ad.budgetCapCents - cost } },
      data: {
        spentCents: { increment: cost },
        impressionsCount: { increment: 1 },
      },
    });
    if (spent.count === 0) {
      await tx.ad.update({
        where: { id: imp.adId },
        data: { status: "EXHAUSTED" },
      });
      return { ok: false as const, reason: "ad_exhausted" };
    }

    // 광고주 계정 잔액(AdvertiserAccount.balanceCents)에서도 같은 cost 를
    // 원자적으로 차감한다. 광고별 cap(spentCents)과 달리 이건 광고주가 실제로
    // 충전한 돈이다. 잔액이 모자라면 방금 올린 spentCents/impressionsCount 를
    // 같은 트랜잭션 안에서 되돌려 노출을 "없던 일"로 만든다 — 시청자는 보상을
    // 못 받고(헛봄), 플랫폼이 비용을 떠안지 않는다.
    const paid = await tx.advertiserAccount.updateMany({
      where: { id: imp.ad.advertiserId, balanceCents: { gte: cost } },
      data: { balanceCents: { decrement: cost } },
    });
    if (paid.count === 0) {
      await tx.ad.update({
        where: { id: imp.adId },
        data: {
          spentCents: { decrement: cost },
          impressionsCount: { decrement: 1 },
        },
      });
      return { ok: false as const, reason: "advertiser_insufficient_funds" };
    }

    const after = await tx.ad.findUnique({
      where: { id: imp.adId },
      select: { spentCents: true, budgetCapCents: true },
    });
    if (after && after.spentCents + cost > after.budgetCapCents) {
      await tx.ad.update({
        where: { id: imp.adId },
        data: { status: "EXHAUSTED" },
      });
    }

    await tx.tokenLedger.create({
      data: {
        userId,
        deltaMicro: reward,
        reason: "IMPRESSION",
        refId: impressionId,
      },
    });
    return { ok: true as const, reward, concurrentN, watchedFraction };
  });
}

export async function recordCta(impressionId: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    const imp = await tx.impression.findUnique({
      where: { id: impressionId },
      include: { ad: true },
    });
    if (!imp || imp.userId !== userId)
      return { ok: false as const, reason: "not_found" };
    if (imp.ctaClickedAt) return { ok: false as const, reason: "already" };

    // 원자적 claim: 동시 요청 중 하나만 보너스 적립.
    const claimed = await tx.impression.updateMany({
      where: { id: impressionId, ctaClickedAt: null },
      data: { ctaClickedAt: new Date() },
    });
    if (claimed.count === 0) return { ok: false as const, reason: "already" };

    // CTA 클릭 과금 = 노출 기본 과금의 3배. 시청자 보너스도 viewerRewardForCost
    // 로 같은 cost 에서 산출되어 "과금 = 보너스 × 1.25" 가 그대로 성립한다.
    // 광고별 cap 과 광고주 계정 잔액 둘 다에서 원자적으로 차감하고, 어느 한
    // 쪽이라도 모자라면 보너스를 적립하지 않는다(시청자 헛클릭, 플랫폼 부담 없음).
    const ctaCost = ctaCostCents(imp.ad.cpmCents);
    const bonus = viewerRewardForCost(ctaCost);

    const spent = await tx.ad.updateMany({
      where: {
        id: imp.adId,
        spentCents: { lte: imp.ad.budgetCapCents - ctaCost },
      },
      data: { spentCents: { increment: ctaCost } },
    });
    if (spent.count === 0) {
      // 남은 광고별 예산이 CTA 비용을 못 댄다. 이 광고는 impression 은 아직
      // 노출할 수 있으므로 EXHAUSTED 로 죽이지 않고 보너스만 건너뛴다.
      return { ok: false as const, reason: "ad_budget_too_low" };
    }

    // 광고주 계정 잔액 원자적 차감. 모자라면 위 spentCents 증가를 되돌린다.
    const paid = await tx.advertiserAccount.updateMany({
      where: { id: imp.ad.advertiserId, balanceCents: { gte: ctaCost } },
      data: { balanceCents: { decrement: ctaCost } },
    });
    if (paid.count === 0) {
      await tx.ad.update({
        where: { id: imp.adId },
        data: { spentCents: { decrement: ctaCost } },
      });
      return { ok: false as const, reason: "advertiser_insufficient_funds" };
    }

    await tx.tokenLedger.create({
      data: {
        userId,
        deltaMicro: bonus,
        reason: "CTA",
        refId: impressionId,
      },
    });
    return { ok: true as const, bonus, ctaUrl: imp.ad.ctaUrl };
  });
}

export async function getBalanceMicro(userId: string): Promise<bigint> {
  const rows = await prisma.tokenLedger.findMany({
    where: { userId },
    select: { deltaMicro: true },
  });
  return rows.reduce((s, r) => s + r.deltaMicro, 0n);
}
