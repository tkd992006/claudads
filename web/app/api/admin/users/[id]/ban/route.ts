import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireAdmin();
  const { id } = await params;
  const { banned } = (await req.json().catch(() => ({}))) as { banned?: boolean };
  const u = await prisma.user.update({
    where: { id },
    data: { banned: !!banned },
  });
  return NextResponse.json({ user: u });
}
