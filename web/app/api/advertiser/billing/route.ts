import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { appendAdvertiserLedger } from "@/lib/services/ledger";

// MVP: mock 충전. Stripe 연결 자리만.
export async function POST(req: Request) {
  const { userId } = await requireUser();
  const { amountCents } = (await req.json().catch(() => ({}))) as {
    amountCents?: number;
  };
  if (!amountCents || amountCents <= 0 || amountCents > 100_000_000)
    return NextResponse.json({ error: "invalid amount" }, { status: 400 });

  const acc = await prisma.advertiserAccount.findUnique({ where: { userId } });
  if (!acc) return NextResponse.json({ error: "no advertiser" }, { status: 403 });

  // C3: 충전 원장 기록 + balanceCents 동기화 (단일 트랜잭션)
  const updated = await prisma.$transaction(async (tx) => {
    await appendAdvertiserLedger(tx, {
      advertiserId: acc.id,
      deltaCents: amountCents,
      reason: "CHARGE",
    });
    return tx.advertiserAccount.findUnique({ where: { id: acc.id } });
  });
  return NextResponse.json({ account: updated, mock: true });
}
