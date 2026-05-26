/**
 * backfill-balance.ts
 *
 * C2/C3 스키마 추가(balanceMicro, AdvertiserLedger) 이후 최초 1회 실행.
 *
 * 1. 모든 기존 유저의 balanceMicro = SUM(tokenLedger.deltaMicro) 으로 설정
 * 2. 모든 기존 광고주의 AdvertiserLedger 합계를 balanceCents와 일치시킴
 *    (차액만큼 ADJUSTMENT row 추가, 이미 일치하면 건너뜀 — idempotent)
 *
 * 실행: npx ts-node --project tsconfig.json prisma/backfill-balance.ts
 * 또는: DATABASE_URL=... npx tsx prisma/backfill-balance.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== 백필 시작 ===\n");

  // ── 1. 유저 balanceMicro 백필 ─────────────────────────────────────────────
  console.log("[1/2] 유저 balanceMicro 백필...");

  const users = await prisma.user.findMany({ select: { id: true } });
  let userUpdated = 0;

  for (const { id } of users) {
    const agg = await prisma.tokenLedger.aggregate({
      where: { userId: id },
      _sum: { deltaMicro: true },
    });
    const sum = agg._sum.deltaMicro ?? 0n;

    await prisma.user.update({
      where: { id },
      data: { balanceMicro: sum },
    });
    userUpdated++;
  }

  console.log(`  → ${userUpdated}명 완료\n`);

  // ── 2. 광고주 AdvertiserLedger 씨드 ──────────────────────────────────────
  console.log("[2/2] 광고주 AdvertiserLedger 씨드...");

  const advertisers = await prisma.advertiserAccount.findMany({
    select: { id: true, balanceCents: true },
  });
  let advSeeded = 0;
  let advSkipped = 0;

  for (const { id, balanceCents } of advertisers) {
    // 원장 합계가 balanceCents와 일치하도록 차액만큼 ADJUSTMENT row를 넣는다.
    // 새 코드(appendAdvertiserLedger)가 일부 과금 row를 이미 남겼더라도 차액
    // (= 기존 충전 잔액)만 시드하므로 정확히 reconcile 된다. 이미 일치하면
    // (차액 0) 건너뛴다 → 재실행해도 안전(idempotent).
    const agg = await prisma.advertiserLedger.aggregate({
      where: { advertiserId: id },
      _sum: { deltaCents: true },
    });
    const diff = balanceCents - (agg._sum.deltaCents ?? 0);

    if (diff === 0) {
      advSkipped++;
      continue;
    }

    await prisma.advertiserLedger.create({
      data: {
        advertiserId: id,
        deltaCents: diff,
        reason: "ADJUSTMENT",
        refId: "backfill",
      },
    });
    advSeeded++;
  }

  console.log(`  → ${advSeeded}개 reconcile 완료, ${advSkipped}개 스킵(이미 일치)\n`);

  // ── 검증 ─────────────────────────────────────────────────────────────────
  console.log("=== 정합성 검증 ===");
  let mismatch = 0;

  for (const { id } of users) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: { balanceMicro: true },
    });
    const agg = await prisma.tokenLedger.aggregate({
      where: { userId: id },
      _sum: { deltaMicro: true },
    });
    const ledgerSum = agg._sum.deltaMicro ?? 0n;

    if (user?.balanceMicro !== ledgerSum) {
      console.error(
        `  ❌ 불일치 userId=${id}: column=${user?.balanceMicro}, ledger=${ledgerSum}`,
      );
      mismatch++;
    }
  }
  console.log(`  ✅ 유저 ${users.length}명 검사 완료`);

  for (const { id, balanceCents } of advertisers) {
    const agg = await prisma.advertiserLedger.aggregate({
      where: { advertiserId: id },
      _sum: { deltaCents: true },
    });
    const ledgerSum = agg._sum.deltaCents ?? 0;

    if (balanceCents !== ledgerSum) {
      console.error(
        `  ❌ 불일치 advertiserId=${id}: column=${balanceCents}, ledger=${ledgerSum}`,
      );
      mismatch++;
    }
  }
  console.log(`  ✅ 광고주 ${advertisers.length}곳 검사 완료\n`);

  if (mismatch === 0) {
    console.log("=== 백필 완료 — 모든 잔액 일치 ===");
  } else {
    console.error(`❌ ${mismatch}건 불일치 — 확인 필요`);
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
