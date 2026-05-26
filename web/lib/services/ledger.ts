/**
 * ledger.ts — 원장 쓰기 단일 진입점 (C2/C3)
 *
 * 모든 tokenLedger·advertiserLedger 쓰기는 반드시 이 헬퍼를 경유한다.
 * - appendTokenLedger     : 시청자 토큰 원장 기록 + user.balanceMicro 동기화 (C2)
 * - appendAdvertiserLedger: 광고주 과금 원장 기록 + balanceCents 동기화   (C3)
 *
 * 두 함수 모두 Prisma interactive transaction(tx) 안에서 호출해야 한다.
 */

import type { Prisma, LedgerReason, AdvLedgerReason } from "@prisma/client";

type Tx = Prisma.TransactionClient;

// ── 시청자 토큰 원장 ─────────────────────────────────────────────────────────

interface TokenLedgerEntry {
  userId: string;
  deltaMicro: bigint;
  reason: LedgerReason;
  refId?: string;
}

/**
 * tokenLedger에 row를 추가하고, user.balanceMicro를 같은 트랜잭션 안에서
 * 동일한 delta만큼 증감한다.
 *
 * balanceMicro는 항상 SUM(ledger.deltaMicro)와 일치해야 한다.
 * 이 헬퍼를 거치지 않으면 두 값이 어긋날 수 있으므로, 직접 tokenLedger.create를
 * 호출하지 말 것.
 */
export async function appendTokenLedger(tx: Tx, entry: TokenLedgerEntry) {
  await tx.tokenLedger.create({ data: entry });
  await tx.user.update({
    where: { id: entry.userId },
    data: { balanceMicro: { increment: entry.deltaMicro } },
  });
}

// ── 광고주 과금 원장 ─────────────────────────────────────────────────────────

interface AdvLedgerEntry {
  advertiserId: string;
  deltaCents: number; // 양수 = 충전, 음수 = 과금
  reason: AdvLedgerReason;
  refId?: string;
}

/**
 * advertiserLedger에 row를 추가하고, advertiserAccount.balanceCents를 같은
 * 트랜잭션 안에서 동일한 delta만큼 증감한다.
 *
 * 과금(deltaCents < 0)은 잔액이 충분할 때만 조건부 updateMany로 원자적으로
 * 차감한다 — check-then-act 간극이 없어 동시 과금으로 잔액이 음수가 되지 않는다.
 * 잔액이 모자라면 원장도 잔액도 건드리지 않고 false를 반환하므로, 호출자는
 * false를 보고 자기 쪽 변경(예: ad.spentCents)을 같은 트랜잭션에서 롤백해야 한다.
 * 충전(deltaCents >= 0)은 항상 성공하며 true를 반환한다.
 */
export async function appendAdvertiserLedger(
  tx: Tx,
  entry: AdvLedgerEntry,
): Promise<boolean> {
  if (entry.deltaCents < 0) {
    const res = await tx.advertiserAccount.updateMany({
      where: {
        id: entry.advertiserId,
        balanceCents: { gte: -entry.deltaCents },
      },
      data: { balanceCents: { increment: entry.deltaCents } },
    });
    if (res.count === 0) return false;
  } else {
    await tx.advertiserAccount.update({
      where: { id: entry.advertiserId },
      data: { balanceCents: { increment: entry.deltaCents } },
    });
  }
  await tx.advertiserLedger.create({ data: entry });
  return true;
}
