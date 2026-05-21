import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

async function loadOwn(userId: string, adId: string) {
  const ad = await prisma.ad.findUnique({
    where: { id: adId },
    include: { advertiser: true },
  });
  if (!ad || ad.advertiser.userId !== userId) return null;
  return ad;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await requireUser();
  const { id } = await params;
  const ad = await loadOwn(userId, id);
  if (!ad) return NextResponse.json({ error: "not found" }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as {
    action?: "pause" | "resume";
  };
  if (body.action === "pause" && ad.status === "APPROVED") {
    const u = await prisma.ad.update({ where: { id }, data: { status: "PAUSED" } });
    return NextResponse.json({ ad: u });
  }
  if (body.action === "resume" && ad.status === "PAUSED") {
    const u = await prisma.ad.update({ where: { id }, data: { status: "APPROVED" } });
    return NextResponse.json({ ad: u });
  }
  return NextResponse.json({ error: "invalid transition" }, { status: 400 });
}
