import { prisma } from "@/lib/prisma";
import { signGet } from "@/lib/r2";
import ReviewButtons from "./review-buttons";

export default async function AdminAdsPage() {
  const pending = await prisma.ad.findMany({
    where: { status: "PENDING" },
    include: { advertiser: { include: { user: true } } },
    orderBy: { createdAt: "asc" },
  });

  const withUrls = await Promise.all(
    pending.map(async (ad) => ({
      ...ad,
      previewUrl: await signGet(ad.videoKey),
    })),
  );

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">광고 검수 큐</h1>
      {withUrls.length === 0 && (
        <p className="text-neutral-500 text-sm">검수 대기 없음.</p>
      )}
      <ul className="space-y-4">
        {withUrls.map((ad) => (
          <li key={ad.id} className="card grid md:grid-cols-2 gap-4">
            <video
              src={ad.previewUrl}
              controls
              className="w-full rounded bg-black"
            />
            <div className="space-y-2">
              <div className="font-semibold">{ad.title}</div>
              <div className="text-sm text-neutral-400">
                광고주: {ad.advertiser.name} (@{ad.advertiser.user.login})
              </div>
              <div className="text-sm">
                CPM ₩{ad.cpmCents.toLocaleString()} · 예산 ₩
                {ad.budgetCapCents.toLocaleString()} · {ad.durationSec}s
              </div>
              {ad.ctaLabel && (
                <div className="text-sm space-y-1">
                  <div>
                    CTA [{ad.ctaType}]: {ad.ctaLabel}
                    {ad.ctaType === "LINK" && ad.ctaUrl && <> → {ad.ctaUrl}</>}
                  </div>
                  {ad.ctaType === "PROMPT_INJECTION" && ad.ctaPrompt && (
                    <pre className="whitespace-pre-wrap text-xs opacity-80 bg-black/40 p-2 rounded">
                      {ad.ctaPrompt}
                    </pre>
                  )}
                </div>
              )}
              <ReviewButtons adId={ad.id} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
