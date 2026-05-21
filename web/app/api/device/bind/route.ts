import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function POST(req: Request) {
  const { userId } = await requireUser();
  const { userCode } = (await req.json().catch(() => ({}))) as {
    userCode?: string;
  };
  if (!userCode)
    return NextResponse.json({ error: "userCode required" }, { status: 400 });
  const normalized = userCode.toUpperCase();
  const sess = await prisma.deviceSession.findUnique({
    where: { userCode: normalized },
  });
  if (!sess || sess.expiresAt < new Date())
    return NextResponse.json({ error: "invalid or expired" }, { status: 404 });
  if (sess.userId)
    return NextResponse.json({ error: "already bound" }, { status: 409 });
  await prisma.deviceSession.update({
    where: { id: sess.id },
    data: { userId },
  });
  return NextResponse.json({ ok: true });
}
