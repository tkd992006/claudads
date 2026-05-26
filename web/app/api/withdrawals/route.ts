import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { getBalanceMicro } from "@/lib/ads";
import { appendTokenLedger } from "@/lib/services/ledger";

const MIN_WITHDRAW_MICRO = 1_000_000n; // 출금 최소 1.0 단위

// pg_advisory_xact_lock 네임스페이스(classid). 출금 임계구역 전용 키 공간.
const WITHDRAW_LOCK_NS = 0x7704;

export async function GET() {
  const { userId } = await requireUser();
  const rows = await prisma.withdrawal.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({
    withdrawals: rows.map((w) => ({
      ...w,
      amountMicro: w.amountMicro.toString(),
    })),
  });
}

export async function POST(req: Request) {
  const { userId, role } = await requireUser();
  const { amountMicro, destination } = (await req.json().catch(() => ({}))) as {
    amountMicro?: string;
    destination?: string;
  };
  if (!amountMicro || !destination)
    return NextResponse.json({ error: "amount + destination" }, { status: 400 });
  let amount: bigint;
  try {
    amount = BigInt(amountMicro);
  } catch {
    return NextResponse.json({ error: "bad amount" }, { status: 400 });
  }
  if (amount <= 0n)
    return NextResponse.json({ error: "bad amount" }, { status: 400 });
  if (role !== "ADMIN" && amount < MIN_WITHDRAW_MICRO)
    return NextResponse.json({ error: "below minimum" }, { status: 400 });

  return prisma.$transaction(async (tx) => {
    // C1: 같은 유저의 출금을 advisory lock 으로 직렬화한다.
    // 잔액은 원장 합산값이라 잠글 row 가 없어 조건부 UPDATE 를 못 쓴다.
    // 이 락이 없으면 READ COMMITTED 에서 동시 출금 2건이 같은 잔액을 읽고
    // 둘 다 통과해 잔액을 초과 인출한다(write skew). 락은 트랜잭션 종료 시 해제된다.
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(${WITHDRAW_LOCK_NS}::int4, hashtext(${userId}))`;
    const bal = await getBalanceMicro(userId);
    if (bal < amount)
      return NextResponse.json({ error: "insufficient" }, { status: 400 });
    const w = await tx.withdrawal.create({
      data: { userId, amountMicro: amount, destination },
    });
    await appendTokenLedger(tx, {
      userId,
      deltaMicro: -amount,
      reason: "WITHDRAWAL",
      refId: w.id,
    });
    return NextResponse.json({
      withdrawal: { ...w, amountMicro: w.amountMicro.toString() },
    });
  });
}
