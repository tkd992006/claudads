import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { getBalanceMicro } from "@/lib/ads";

const MIN_WITHDRAW_MICRO = 1_000_000n; // 출금 최소 1.0 단위

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
    const bal = await getBalanceMicro(userId);
    if (bal < amount)
      return NextResponse.json({ error: "insufficient" }, { status: 400 });
    const w = await tx.withdrawal.create({
      data: { userId, amountMicro: amount, destination },
    });
    await tx.tokenLedger.create({
      data: {
        userId,
        deltaMicro: -amount,
        reason: "WITHDRAWAL",
        refId: w.id,
      },
    });
    return NextResponse.json({
      withdrawal: { ...w, amountMicro: w.amountMicro.toString() },
    });
  });
}
