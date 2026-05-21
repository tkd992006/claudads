import { NextResponse } from "next/server";
import { userFromBearer } from "@/lib/desktopAuth";
import { recordImpressionComplete } from "@/lib/ads";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await userFromBearer(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const result = await recordImpressionComplete(id, user.id);
  return NextResponse.json(result);
}
