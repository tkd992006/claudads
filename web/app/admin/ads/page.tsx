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
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">광고 검수 큐</h2>
        <span className="badge badge-outline badge-warning">
          {withUrls.length} 대기
        </span>
      </div>

      {withUrls.length === 0 && (
        <p className="rounded-xl border border-dashed border-white/[0.08] py-14 text-center text-sm text-neutral-600">
          검수 대기 중인 광고가 없습니다.
        </p>
      )}

      <ul className="space-y-4">
        {withUrls.map((ad) => (
          <li
            key={ad.id}
            className="card surface border border-white/[0.08] bg-base-200"
          >
            <div className="card-body grid gap-5 p-5 md:grid-cols-2">
              <video
                src={ad.previewUrl}
                controls
                className="aspect-video w-full rounded-lg bg-black"
              />
              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold">{ad.title}</h3>
                  <p className="text-sm text-neutral-500">
                    {ad.advertiser.name} · @{ad.advertiser.user.login}
                  </p>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <span className="badge badge-ghost badge-sm font-mono">
                    CPM ₩{ad.cpmCents.toLocaleString()}
                  </span>
                  <span className="badge badge-ghost badge-sm font-mono">
                    예산 ₩{ad.budgetCapCents.toLocaleString()}
                  </span>
                  <span className="badge badge-ghost badge-sm font-mono">
                    {ad.durationSec}s
                  </span>
                </div>

                {ad.ctaLabel && (
                  <div className="space-y-1.5 rounded-lg border border-white/[0.06] bg-black/30 p-3 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="badge badge-xs badge-outline badge-info">
                        {ad.ctaType}
                      </span>
                      <span className="text-neutral-300">{ad.ctaLabel}</span>
                    </div>
                    {ad.ctaType === "LINK" && ad.ctaUrl && (
                      <p className="break-all text-xs text-emerald-400/80">
                        → {ad.ctaUrl}
                      </p>
                    )}
                    {ad.ctaType === "PROMPT_INJECTION" && ad.ctaPrompt && (
                      <pre className="whitespace-pre-wrap rounded bg-black/40 p-2 text-xs text-neutral-400">
                        {ad.ctaPrompt}
                      </pre>
                    )}
                  </div>
                )}

                <ReviewButtons adId={ad.id} />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
