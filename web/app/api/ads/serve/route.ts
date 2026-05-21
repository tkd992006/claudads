import { NextResponse } from "next/server";
import { userFromBearer } from "@/lib/desktopAuth";
import {
  selectAdForUser,
  selectFallbackAdForUser,
  recordImpressionStart,
} from "@/lib/ads";
import { signGet } from "@/lib/r2";
import crypto from "node:crypto";

export async function POST(req: Request) {
  const user = await userFromBearer(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { deviceId } = (await req.json().catch(() => ({}))) as {
    deviceId?: string;
  };
  if (!deviceId) return NextResponse.json({ error: "deviceId required" }, { status: 400 });

  let ad = await selectAdForUser(user.id);
  let isFallback = false;
  if (!ad) {
    ad = await selectFallbackAdForUser(user.id);
    isFallback = !!ad;
  }
  if (!ad) return NextResponse.json({ ad: null });

  const ip = req.headers.get("x-forwarded-for") ?? "";
  const ipHash = crypto.createHash("sha256").update(ip + user.id).digest("hex");

  const imp = await recordImpressionStart({
    adId: ad.id,
    userId: user.id,
    deviceId,
    ipHash,
  });

  const videoUrl = await signGet(ad.videoKey);
  return NextResponse.json({
    impressionId: imp.id,
    isFallback,
    ad: {
      id: ad.id,
      title: ad.title,
      videoUrl,
      durationSec: ad.durationSec,
      cta: ad.ctaLabel
        ? ad.ctaType === "PROMPT_INJECTION" && ad.ctaPrompt
          ? { type: "PROMPT_INJECTION" as const, label: ad.ctaLabel, prompt: ad.ctaPrompt }
          : ad.ctaUrl
            ? { type: "LINK" as const, label: ad.ctaLabel, url: ad.ctaUrl }
            : null
        : null,
    },
  });
}
