import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { appendTokenLedger } from "@/lib/services/ledger";

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
      // C4: REQUESTED 또는 APPROVED 상태에서만 거절 가능.
      // REJECTED/PAID 상태에서 재거절하면 환불이 이중으로 쌓이므로 차단.
      if (!w || !["REQUESTED", "APPROVED"].includes(w.status))
        return NextResponse.json(
          { error: "invalid_state", detail: "can only reject REQUESTED or APPROVED withdrawals" },
          { status: 409 },
        );
      await tx.withdrawal.update({
        where: { id },
        data: { status: "REJECTED" },
      });
      // C2: 환불 원장 기록 + user.balanceMicro 복원
      await appendTokenLedger(tx, {
        userId: w.userId,
        deltaMicro: w.amountMicro,
        reason: "ADJUSTMENT",
        refId: w.id,
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
