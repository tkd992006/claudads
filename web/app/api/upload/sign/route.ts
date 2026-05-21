import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { signPut } from "@/lib/r2";
import { prisma } from "@/lib/prisma";
import { ulid } from "ulid";

export async function POST(req: Request) {
  const { userId } = await requireUser();
  const adv = await prisma.advertiserAccount.findUnique({
    where: { userId },
  });
  if (!adv) return NextResponse.json({ error: "no advertiser account" }, { status: 403 });

  const { contentType } = (await req.json().catch(() => ({}))) as {
    contentType?: string;
  };
  const ct = contentType ?? "video/mp4";
  const ext = ct.includes("webm") ? "webm" : "mp4";
  const key = `ads/${adv.id}/${ulid()}.${ext}`;
  const url = await signPut(key, ct);
  return NextResponse.json({ url, key });
}
