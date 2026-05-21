import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

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

  const u = await prisma.advertiserAccount.update({
    where: { id: acc.id },
    data: { balanceCents: { increment: amountCents } },
  });
  return NextResponse.json({ account: u, mock: true });
}
