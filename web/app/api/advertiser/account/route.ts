import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function GET() {
  const { userId } = await requireUser();
  const acc = await prisma.advertiserAccount.findUnique({ where: { userId } });
  return NextResponse.json({ account: acc });
}

export async function POST(req: Request) {
  const { userId } = await requireUser();
  const { name } = (await req.json().catch(() => ({}))) as { name?: string };
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
  const existing = await prisma.advertiserAccount.findUnique({
    where: { userId },
  });
  if (existing) return NextResponse.json({ account: existing });
  const acc = await prisma.advertiserAccount.create({
    data: { userId, name },
  });
  return NextResponse.json({ account: acc });
}
