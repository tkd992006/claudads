import { NextResponse } from "next/server";
import { userFromBearer } from "@/lib/desktopAuth";
import {
  selectAdForUser,
  selectFallbackAdForUser,
  recordImpressionStart,
  serveRateLimited,
  cleanupGhostImpressions,
} from "@/lib/ads";
import { promptInjectionEnabled } from "@/lib/features";
import { signGet } from "@/lib/r2";
import crypto from "node:crypto";

export async function POST(req: Request) {
  const user = await userFromBearer(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { deviceId } = (await req.json().catch(() => ({}))) as {
    deviceId?: string;
  };
  if (!deviceId) return NextResponse.json({ error: "deviceId required" }, { status: 400 });

  // serve 스팸 백스톱 — 정상 유저는 닿지 않고 스크립트 폭주만 거른다.
  if (await serveRateLimited(user.id))
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  // 버려진 impression 기회적 청소 (serve 의 일부에서만 — cron 대용).
  if (Math.random() < 0.03) await cleanupGhostImpressions();

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
  // PROMPT_INJECTION 광고가 플래그 OFF 상태에서 만들어졌더라도, 플래그가
  // 꺼져 있으면 prompt 를 내보내지 않는다. ctaUrl 있으면 LINK 로, 없으면 cta 없음.
  const piEnabled = promptInjectionEnabled();
  return NextResponse.json({
    impressionId: imp.id,
    isFallback,
    ad: {
      id: ad.id,
      title: ad.title,
      videoUrl,
      durationSec: ad.durationSec,
      cta: ad.ctaLabel
        ? ad.ctaType === "PROMPT_INJECTION" && ad.ctaPrompt && piEnabled
          ? { type: "PROMPT_INJECTION" as const, label: ad.ctaLabel, prompt: ad.ctaPrompt }
          : ad.ctaUrl
            ? { type: "LINK" as const, label: ad.ctaLabel, url: ad.ctaUrl }
            : null
        : null,
    },
  });
}
