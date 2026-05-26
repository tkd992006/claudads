/**
 * referral.ts — 추천 attach + 시청자 적립 시 커미션 분배
 *
 * 두 진입점:
 *  - attachReferral        : 가입 후 한 번, 추천인을 연결하고 양쪽에 가입 보너스
 *  - creditViewerEarning   : 시청자 EARN(IMPRESSION/CTA) 적립 + 활성 추천 관계가
 *                            있으면 양방향 5% 커미션을 같은 tx 에 분배
 *
 * 양쪽 다 caller 의 interactive transaction(tx) 안에서 호출해야 한다.
 * 커미션은 플랫폼 마진(20%)에서 나가므로 광고주 잔액은 건드리지 않는다.
 */

import type { Prisma, LedgerReason } from "@prisma/client";
import { appendTokenLedger } from "./ledger";

type Tx = Prisma.TransactionClient;

// ── 정책 상수 ──────────────────────────────────────────────────────────────
//
// 양방향 5%, 60일 이벤트. 양쪽이 같은 비율로 적립되며, 추천인은 추가 적립을
// 받고 초대받은 사람은 본인 적립의 5% 보너스를 받는다. 즉 1회 EARN 마다
// 시청자 보상의 +10% 가 플랫폼 마진에서 분배된다(invitee 0.05 + inviter 0.05).
// 플랫폼 마진은 광고주 과금의 20% 이므로 추천 관계 유저는 마진이 20% → 12%
// 로 줄어든다. launch 이벤트이므로 일단 받아들임.
const REFERRAL_COMMISSION_BPS = 500n; // 5% = 500 basis points
const REFERRAL_DURATION_MS = 60 * 24 * 60 * 60 * 1000; // 60일
const REFERRAL_SIGNUP_BONUS_MICRO = 5_000_000n;

// GitHub login 규격(영숫자 + hyphen, 최대 39자). 매뉴얼 입력·쿠키 모두 이 필터
// 를 통과해야 한다. 이미 미들웨어에서 한 번 거르지만, attach 경로가 둘이라
// 헬퍼 자체도 방어한다.
const GH_LOGIN_RE = /^[a-zA-Z0-9-]{1,39}$/;

export type AttachResult =
  | { ok: true; inviterId: string }
  | { ok: false; reason: "invalid_login" | "self" | "not_found" | "already" };

/**
 * 추천인을 연결한다. 이미 inviterId 가 있는 유저는 멱등하게 "already" 를 반환.
 * Referral.inviteeId @unique 가 race 조건을 막아주므로 동시 호출도 안전.
 *
 * 성공 시:
 *  - Referral row 생성 (granted=true)
 *  - User.inviterId, User.referralEndsAt(=now+60d) 갱신
 *  - 양쪽 각각 5 토큰 가입 보너스(REFERRAL)
 */
export async function attachReferral(
  tx: Tx,
  inviteeId: string,
  inviterLogin: string,
): Promise<AttachResult> {
  const login = inviterLogin.trim();
  if (!GH_LOGIN_RE.test(login)) return { ok: false, reason: "invalid_login" };

  // GitHub login 은 대소문자 무시. equals + mode:'insensitive' 로 매칭.
  const inviter = await tx.user.findFirst({
    where: { login: { equals: login, mode: "insensitive" } },
    select: { id: true },
  });
  if (!inviter) return { ok: false, reason: "not_found" };
  if (inviter.id === inviteeId) return { ok: false, reason: "self" };

  const existing = await tx.referral.findUnique({
    where: { inviteeId },
    select: { id: true },
  });
  if (existing) return { ok: false, reason: "already" };

  const endsAt = new Date(Date.now() + REFERRAL_DURATION_MS);

  await tx.referral.create({
    data: { inviterId: inviter.id, inviteeId, granted: true },
  });
  await tx.user.update({
    where: { id: inviteeId },
    data: { inviterId: inviter.id, referralEndsAt: endsAt },
  });

  // 가입 보너스 — 양쪽 5 토큰 (기존 정책 유지)
  await appendTokenLedger(tx, {
    userId: inviter.id,
    deltaMicro: REFERRAL_SIGNUP_BONUS_MICRO,
    reason: "REFERRAL",
    refId: inviteeId,
  });
  await appendTokenLedger(tx, {
    userId: inviteeId,
    deltaMicro: REFERRAL_SIGNUP_BONUS_MICRO,
    reason: "REFERRAL",
    refId: inviter.id,
  });

  return { ok: true, inviterId: inviter.id };
}

// ── 커미션 분배 ────────────────────────────────────────────────────────────

interface EarnEntry {
  userId: string;
  deltaMicro: bigint;
  reason: LedgerReason; // 보통 IMPRESSION 또는 CTA
  refId?: string;
}

/**
 * 시청자 적립 + (있다면) 양방향 5% 커미션을 같은 tx 안에서 모두 기록한다.
 * 적립 = 0 이면 커미션도 0(early return). 추천 관계가 만료됐거나 없으면 그냥
 * appendTokenLedger 한 번과 동등하다 — 호출자 입장에서 분기 필요 없음.
 *
 * 커미션은 시청자 보상의 5%, 정수 micro 로 floor. 1 micro 미만이면 분배 생략.
 * inviter.balanceMicro 와 invitee.balanceMicro 가 ledger SUM 과 어긋나지 않도록
 * 두 경로 모두 appendTokenLedger 를 거친다.
 */
export async function creditViewerEarning(tx: Tx, entry: EarnEntry) {
  await appendTokenLedger(tx, entry);
  if (entry.deltaMicro <= 0n) return;

  const u = await tx.user.findUnique({
    where: { id: entry.userId },
    select: { inviterId: true, referralEndsAt: true },
  });
  if (!u?.inviterId || !u.referralEndsAt) return;
  if (u.referralEndsAt.getTime() <= Date.now()) return;

  const commission = (entry.deltaMicro * REFERRAL_COMMISSION_BPS) / 10_000n;
  if (commission <= 0n) return;

  // 1) 추천인에게 커미션 — invitee 가 번 만큼의 5%
  await appendTokenLedger(tx, {
    userId: u.inviterId,
    deltaMicro: commission,
    reason: "REFERRAL_COMMISSION",
    refId: entry.refId,
  });
  // 2) 초대받은 본인에게도 동일한 보너스 — "초대받았더니 내 적립도 5% 늘었다"
  await appendTokenLedger(tx, {
    userId: entry.userId,
    deltaMicro: commission,
    reason: "REFERRAL_COMMISSION",
    refId: entry.refId,
  });
}
