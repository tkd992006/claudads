import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireAdmin();
  const { id } = await params;
  const { action } = (await req.json().catch(() => ({}))) as {
    action?: "approve" | "paid" | "reject";
  };

  if (action === "reject") {
    // 거절: 금액을 다시 적립 (REJECTED ledger entry)
    return prisma.$transaction(async (tx) => {
      const w = await tx.withdrawal.findUnique({ where: { id } });
      if (!w || w.status === "PAID")
        return NextResponse.json({ error: "invalid" }, { status: 400 });
      await tx.withdrawal.update({
        where: { id },
        data: { status: "REJECTED" },
      });
      await tx.tokenLedger.create({
        data: {
          userId: w.userId,
          deltaMicro: w.amountMicro,
          reason: "ADJUSTMENT",
          refId: w.id,
        },
      });
      return NextResponse.json({ ok: true });
    });
  }
  if (action === "approve") {
    const w = await prisma.withdrawal.update({
      where: { id },
      data: { status: "APPROVED" },
    });
    return NextResponse.json({
      withdrawal: { ...w, amountMicro: w.amountMicro.toString() },
    });
  }
  if (action === "paid") {
    const w = await prisma.withdrawal.update({
      where: { id },
      data: { status: "PAID", paidAt: new Date() },
    });
    return NextResponse.json({
      withdrawal: { ...w, amountMicro: w.amountMicro.toString() },
    });
  }
  return NextResponse.json({ error: "invalid" }, { status: 400 });
}
