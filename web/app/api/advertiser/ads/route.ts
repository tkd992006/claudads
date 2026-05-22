import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { promptInjectionEnabled } from "@/lib/features";
import { z } from "zod";

const adCreate = z
  .object({
    title: z.string().min(1).max(120),
    videoKey: z.string().min(1),
    durationSec: z.number().int().positive().max(120),
    ctaLabel: z.string().optional(),
    ctaUrl: z.string().url().optional(),
    ctaType: z.enum(["LINK", "PROMPT_INJECTION"]).default("LINK"),
    ctaPrompt: z.string().min(1).max(500).optional(),
    cpmCents: z.number().int().positive(),
    budgetCapCents: z.number().int().positive(),
    dailyCapImpressions: z.number().int().positive().optional(),
    scheduleStart: z.string().datetime().optional(),
    scheduleEnd: z.string().datetime().optional(),
  })
  .refine(
    (d) => d.ctaType !== "PROMPT_INJECTION" || (d.ctaLabel && d.ctaPrompt),
    { message: "PROMPT_INJECTION CTA requires ctaLabel and ctaPrompt", path: ["ctaPrompt"] },
  );

export async function GET() {
  const { userId } = await requireUser();
  const acc = await prisma.advertiserAccount.findUnique({ where: { userId } });
  if (!acc) return NextResponse.json({ ads: [] });
  const ads = await prisma.ad.findMany({
    where: { advertiserId: acc.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ ads });
}

export async function POST(req: Request) {
  const { userId } = await requireUser();
  const acc = await prisma.advertiserAccount.findUnique({ where: { userId } });
  if (!acc) return NextResponse.json({ error: "no advertiser" }, { status: 403 });

  const body = adCreate.safeParse(await req.json().catch(() => ({})));
  if (!body.success)
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });

  // PROMPT_INJECTION CTA 는 방어가 완성되기 전까지 피처 플래그로 OFF.
  if (body.data.ctaType === "PROMPT_INJECTION" && !promptInjectionEnabled())
    return NextResponse.json(
      { error: "PROMPT_INJECTION CTA is currently disabled" },
      { status: 400 },
    );

  const ad = await prisma.ad.create({
    data: {
      advertiserId: acc.id,
      title: body.data.title,
      videoKey: body.data.videoKey,
      durationSec: body.data.durationSec,
      ctaLabel: body.data.ctaLabel ?? null,
      ctaUrl: body.data.ctaType === "PROMPT_INJECTION" ? null : (body.data.ctaUrl ?? null),
      ctaType: body.data.ctaType,
      ctaPrompt: body.data.ctaType === "PROMPT_INJECTION" ? (body.data.ctaPrompt ?? null) : null,
      cpmCents: body.data.cpmCents,
      budgetCapCents: body.data.budgetCapCents,
      dailyCapImpressions: body.data.dailyCapImpressions ?? null,
      scheduleStart: body.data.scheduleStart ? new Date(body.data.scheduleStart) : null,
      scheduleEnd: body.data.scheduleEnd ? new Date(body.data.scheduleEnd) : null,
      status: "PENDING",
    },
  });
  return NextResponse.json({ ad });
}
