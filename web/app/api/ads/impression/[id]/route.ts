import { NextResponse } from "next/server";
import { userFromBearer } from "@/lib/desktopAuth";
import { recordImpressionComplete } from "@/lib/ads";
import { jsonResponse } from "@/lib/json";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await userFromBearer(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { playedSec?: number };
  const result = await recordImpressionComplete(id, user.id, body.playedSec);
  return jsonResponse(result);
}
