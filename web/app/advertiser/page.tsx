import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import CreateAccount from "./create-account";

export default async function AdvertiserHome() {
  const s = await auth();
  if (!s) redirect("/api/auth/signin?callbackUrl=/advertiser");
  const userId = (s as { userId?: string }).userId!;

  const acc = await prisma.advertiserAccount.findUnique({
    where: { userId },
    include: { ads: { orderBy: { createdAt: "desc" } } },
  });

  if (!acc) return <CreateAccount />;

  return (
    <main className="mx-auto max-w-5xl animate-fade-up space-y-6 px-6 py-12">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm text-neutral-500">광고주 콘솔</p>
          <h1 className="text-2xl font-semibold">{acc.name}</h1>
        </div>
        <div className="surface flex items-center gap-5 rounded-xl border border-white/[0.08] bg-base-200 px-5 py-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-neutral-500">
              잔액
            </p>
            <p className="font-mono text-xl font-semibold">
              ₩{acc.balanceCents.toLocaleString()}
            </p>
          </div>
          <Link
            href="/advertiser/billing"
            className="btn btn-ghost btn-sm border-white/10"
          >
            충전
          </Link>
        </div>
      </header>

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-neutral-400">
          내 광고{" "}
          <span className="text-neutral-600">({acc.ads.length})</span>
        </h2>
        <Link href="/advertiser/ads/new" className="btn btn-primary btn-sm">
          + 새 광고 등록
        </Link>
      </div>

      <div className="surface overflow-x-auto rounded-xl border border-white/[0.08] bg-base-200">
        <table className="table">
          <thead>
            <tr className="border-white/[0.07] text-xs uppercase tracking-wide text-neutral-500">
              <th>제목</th>
              <th className="text-right">CPM</th>
              <th className="text-right">예산</th>
              <th className="text-right">소진</th>
              <th className="text-right">노출</th>
              <th className="text-right">상태</th>
            </tr>
          </thead>
          <tbody>
            {acc.ads.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="py-14 text-center text-sm text-neutral-600"
                >
                  등록된 광고가 없습니다. 첫 광고를 등록해 보세요.
                </td>
              </tr>
            )}
            {acc.ads.map((ad) => (
              <tr
                key={ad.id}
                className="border-white/[0.05] transition-colors hover:bg-white/[0.02]"
              >
                <td className="font-medium text-neutral-100">{ad.title}</td>
                <td className="text-right font-mono text-neutral-300">
                  ₩{ad.cpmCents.toLocaleString()}
                </td>
                <td className="text-right font-mono text-neutral-300">
                  ₩{ad.budgetCapCents.toLocaleString()}
                </td>
                <td className="text-right font-mono text-neutral-500">
                  ₩{ad.spentCents.toLocaleString()}
                </td>
                <td className="text-right font-mono text-neutral-300">
                  {ad.impressionsCount.toLocaleString()}
                </td>
                <td className="text-right">
                  <StatusBadge status={ad.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    PENDING: { cls: "badge-warning", label: "검수 대기" },
    APPROVED: { cls: "badge-success", label: "노출 중" },
    PAUSED: { cls: "badge-ghost", label: "일시정지" },
    REJECTED: { cls: "badge-error", label: "반려" },
    EXHAUSTED: { cls: "badge-neutral", label: "예산 소진" },
  };
  const m = map[status] ?? { cls: "", label: status };
  return (
    <span className={`badge badge-sm badge-outline ${m.cls}`}>{m.label}</span>
  );
}
