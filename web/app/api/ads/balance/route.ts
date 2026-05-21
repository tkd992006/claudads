import { NextResponse } from "next/server";
import { userFromBearer } from "@/lib/desktopAuth";
import { getBalanceMicro } from "@/lib/ads";

export async function GET(req: Request) {
  const user = await userFromBearer(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const balance = await getBalanceMicro(user.id);
  return NextResponse.json({ balanceMicro: balance.toString() });
}
