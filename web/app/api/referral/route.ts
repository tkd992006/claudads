import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { appendTokenLedger } from "@/lib/services/ledger";

const REFERRAL_BONUS_MICRO = 5_000_000n;

export async function POST(req: Request) {
  const { userId } = await requireUser();
  const { inviterLogin } = (await req.json().catch(() => ({}))) as {
    inviterLogin?: string;
  };
  if (!inviterLogin)
    return NextResponse.json({ error: "inviterLogin required" }, { status: 400 });

  const inviter = await prisma.user.findFirst({ where: { login: inviterLogin } });
  if (!inviter || inviter.id === userId)
    return NextResponse.json({ error: "invalid inviter" }, { status: 400 });

  const existing = await prisma.referral.findUnique({ where: { inviteeId: userId } });
  if (existing) return NextResponse.json({ error: "already referred" }, { status: 409 });

  await prisma.$transaction(async (tx) => {
    await tx.referral.create({
      data: { inviterId: inviter.id, inviteeId: userId, granted: true },
    });
    await tx.user.update({ where: { id: userId }, data: { inviterId: inviter.id } });
    // C2: 레퍼럴 보너스 — inviter
    await appendTokenLedger(tx, {
      userId: inviter.id,
      deltaMicro: REFERRAL_BONUS_MICRO,
      reason: "REFERRAL",
      refId: userId,
    });
    // C2: 레퍼럴 보너스 — invitee
    await appendTokenLedger(tx, {
      userId,
      deltaMicro: REFERRAL_BONUS_MICRO,
      reason: "REFERRAL",
      refId: inviter.id,
    });
  });
  return NextResponse.json({ ok: true });
}
