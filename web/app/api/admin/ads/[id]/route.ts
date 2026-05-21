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
    action?: "approve" | "reject";
  };
  if (action === "approve") {
    const ad = await prisma.ad.update({
      where: { id },
      data: { status: "APPROVED" },
    });
    return NextResponse.json({ ad });
  }
  if (action === "reject") {
    const ad = await prisma.ad.update({
      where: { id },
      data: { status: "REJECTED" },
    });
    return NextResponse.json({ ad });
  }
  return NextResponse.json({ error: "invalid" }, { status: 400 });
}
