import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { issueToken } from "@/lib/desktopAuth";

export async function POST(req: Request) {
  const { deviceCode } = (await req.json().catch(() => ({}))) as {
    deviceCode?: string;
  };
  if (!deviceCode)
    return NextResponse.json({ error: "deviceCode required" }, { status: 400 });

  const sess = await prisma.deviceSession.findUnique({ where: { deviceCode } });
  if (!sess) return NextResponse.json({ status: "not_found" }, { status: 404 });
  if (sess.expiresAt < new Date())
    return NextResponse.json({ status: "expired" }, { status: 410 });
  if (!sess.userId) return NextResponse.json({ status: "pending" });
  if (sess.token) {
    // Already exchanged; do not return token twice.
    return NextResponse.json({ status: "consumed" }, { status: 410 });
  }
  const token = await issueToken(sess.userId, sess.deviceCode);
  return NextResponse.json({ status: "ok", token });
}
