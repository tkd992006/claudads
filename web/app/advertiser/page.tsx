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
    <main className="max-w-5xl mx-auto p-8 space-y-6">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-semibold">{acc.name}</h1>
          <p className="text-sm text-neutral-400">광고주 콘솔</p>
        </div>
        <div className="text-right space-y-1">
          <div className="text-sm text-neutral-400">잔액</div>
          <div className="text-xl font-semibold">
            ₩{acc.balanceCents.toLocaleString()}
          </div>
          <Link className="text-sm underline" href="/advertiser/billing">
            충전하기
          </Link>
        </div>
      </header>

      <div className="flex justify-end">
        <Link className="btn-primary" href="/advertiser/ads/new">
          + 새 광고 등록
        </Link>
      </div>

      <section className="card overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="bg-neutral-800 text-neutral-400">
            <tr>
              <th className="text-left p-3">제목</th>
              <th className="text-right p-3">CPM</th>
              <th className="text-right p-3">예산</th>
              <th className="text-right p-3">소진</th>
              <th className="text-right p-3">노출</th>
              <th className="text-right p-3">상태</th>
            </tr>
          </thead>
          <tbody>
            {acc.ads.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-neutral-500">
                  등록된 광고가 없습니다.
                </td>
              </tr>
            )}
            {acc.ads.map((ad) => (
              <tr key={ad.id} className="border-t border-neutral-800">
                <td className="p-3">{ad.title}</td>
                <td className="p-3 text-right">
                  ₩{ad.cpmCents.toLocaleString()}
                </td>
                <td className="p-3 text-right">
                  ₩{ad.budgetCapCents.toLocaleString()}
                </td>
                <td className="p-3 text-right">
                  ₩{ad.spentCents.toLocaleString()}
                </td>
                <td className="p-3 text-right">
                  {ad.impressionsCount.toLocaleString()}
                </td>
                <td className="p-3 text-right">
                  <StatusBadge status={ad.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color: Record<string, string> = {
    PENDING: "bg-yellow-900 text-yellow-200",
    APPROVED: "bg-emerald-900 text-emerald-200",
    PAUSED: "bg-neutral-700 text-neutral-200",
    REJECTED: "bg-red-900 text-red-200",
    EXHAUSTED: "bg-neutral-800 text-neutral-400",
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs ${color[status] ?? ""}`}>
      {status}
    </span>
  );
}
