import { prisma } from "./prisma";
import type { Ad } from "@prisma/client";

// 시청자가 가져가는 보상 (광고 1회 시청). cpmCents 의 60%를 시청자 몫.
// 단위는 micro = 1/1_000_000 KRW 가상 토큰. 잔액 = sum(deltaMicro).
export function viewerRewardMicro(ad: Ad): bigint {
  const cpmMicro = BigInt(ad.cpmCents) * 10_000n; // cents -> micro of KRW (assume 1 cent = 0.01 KRW; we just keep an internal scale)
  // 1 impression = cpm / 1000. viewer share = 60%.
  return (cpmMicro * 60n) / 100n / 1000n;
}

export function ctaBonusMicro(ad: Ad): bigint {
  // CTA 클릭 추가 보너스 = impression 보상의 3배
  return viewerRewardMicro(ad) * 3n;
}

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

  const eligible: Ad[] = [];
  for (const ad of candidates) {
    if (ad.spentCents >= ad.budgetCapCents) continue;
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

export async function recordImpressionComplete(
  impressionId: string,
  userId: string,
) {
  return prisma.$transaction(async (tx) => {
    const imp = await tx.impression.findUnique({
      where: { id: impressionId },
      include: { ad: true },
    });
    if (!imp || imp.userId !== userId) return { ok: false as const, reason: "not_found" };
    if (imp.completedAt) return { ok: false as const, reason: "already" };

    const elapsedSec = (Date.now() - imp.startedAt.getTime()) / 1000;
    // 너무 빨리 끝났으면 안 본 것. 90% 임계치(버퍼링/네트워크 슬랙 10%).
    if (elapsedSec < imp.ad.durationSec * 0.9) {
      return { ok: false as const, reason: "too_short" };
    }
    if (elapsedSec > imp.ad.durationSec * 3 + 5) {
      return { ok: false as const, reason: "expired" };
    }

    const reward = viewerRewardMicro(imp.ad);
    const newSpent = imp.ad.spentCents + Math.ceil(imp.ad.cpmCents / 1000);
    const exhausted = newSpent >= imp.ad.budgetCapCents;

    await tx.impression.update({
      where: { id: impressionId },
      data: { completedAt: new Date() },
    });
    await tx.ad.update({
      where: { id: imp.adId },
      data: {
        spentCents: newSpent,
        impressionsCount: { increment: 1 },
        ...(exhausted ? { status: "EXHAUSTED" } : {}),
      },
    });
    await tx.tokenLedger.create({
      data: {
        userId,
        deltaMicro: reward,
        reason: "IMPRESSION",
        refId: impressionId,
      },
    });
    return { ok: true as const, reward };
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

    const bonus = ctaBonusMicro(imp.ad);
    await tx.impression.update({
      where: { id: impressionId },
      data: { ctaClickedAt: new Date() },
    });
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
