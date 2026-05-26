import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

const VALID_ACTIONS = ["approve", "reject"] as const;
type AdAction = (typeof VALID_ACTIONS)[number];

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireAdmin();
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { action?: unknown };

  // C5: action 런타임 enum 검증
  if (!VALID_ACTIONS.includes(body.action as AdAction))
    return NextResponse.json(
      { error: "invalid_action", detail: `action must be one of: ${VALID_ACTIONS.join(", ")}` },
      { status: 400 },
    );
  const action = body.action as AdAction;

  // C5: 존재 확인 먼저 (없으면 500 대신 404)
  const existing = await prisma.ad.findUnique({ where: { id } });
  if (!existing)
    return NextResponse.json({ error: "not_found" }, { status: 404 });

  const ad = await prisma.ad.update({
    where: { id },
    data: { status: action === "approve" ? "APPROVED" : "REJECTED" },
  });
  return NextResponse.json({ ad });
}

