import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getBalanceMicro } from "@/lib/ads";
import WithdrawForm from "./withdraw-form";

export default async function DashboardPage() {
  const s = await auth();
  if (!s) redirect("/api/auth/signin?callbackUrl=/dashboard");
  const userId = (s as { userId?: string }).userId!;

  const [balance, withdrawals, recent] = await Promise.all([
    getBalanceMicro(userId),
    prisma.withdrawal.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.tokenLedger.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  return (
    <main className="mx-auto max-w-3xl animate-fade-up space-y-6 px-6 py-12">
      <header className="space-y-1">
        <p className="text-sm text-neutral-500">시청자 대시보드</p>
        <h1 className="text-2xl font-semibold">적립 현황</h1>
      </header>

      {/* Balance hero */}
      <div className="surface relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-base-200 p-6">
        <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-emerald-500/15 blur-3xl" />
        <p className="relative text-xs font-medium uppercase tracking-[0.18em] text-emerald-400/80">
          현재 잔액
        </p>
        <div className="relative mt-3 flex items-baseline gap-2">
          <span className="font-mono text-5xl font-semibold tracking-tight">
            {balance.toString()}
          </span>
          <span className="text-lg text-neutral-500">µ</span>
        </div>
        <p className="relative mt-2 text-xs text-neutral-500">
          광고 노출마다 자동으로 적립됩니다.
        </p>
      </div>

      {/* Withdraw */}
      <section className="card surface border border-white/[0.08] bg-base-200">
        <div className="card-body gap-4 p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">출금 신청</h2>
            <span className="text-xs text-neutral-500">
              내역 {withdrawals.length}건
            </span>
          </div>
          <WithdrawForm balance={balance.toString()} />
          {withdrawals.length > 0 && (
            <ul className="divide-y divide-white/[0.06] overflow-hidden rounded-lg border border-white/[0.06]">
              {withdrawals.map((w) => (
                <li
                  key={w.id}
                  className="flex items-center justify-between px-3.5 py-2.5 text-sm"
                >
                  <span className="font-mono text-neutral-300">
                    {w.amountMicro.toString()} µ
                  </span>
                  <StatusBadge status={w.status} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Recent ledger */}
      <section className="card surface border border-white/[0.08] bg-base-200">
        <div className="card-body gap-3 p-5">
          <h2 className="font-semibold">최근 적립</h2>
          {recent.length === 0 ? (
            <p className="rounded-lg border border-dashed border-white/[0.08] py-8 text-center text-sm text-neutral-600">
              아직 적립 내역이 없습니다.
            </p>
          ) : (
            <ul className="divide-y divide-white/[0.06]">
              {recent.map((r) => {
                const positive = r.deltaMicro > 0n;
                return (
                  <li
                    key={r.id}
                    className="flex items-center justify-between py-2.5 text-sm"
                  >
                    <span className="text-neutral-400">{r.reason}</span>
                    <span
                      className={`font-mono font-medium ${
                        positive ? "text-emerald-400" : "text-neutral-400"
                      }`}
                    >
                      {positive ? "+" : ""}
                      {r.deltaMicro.toString()} µ
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    REQUESTED: "badge-warning",
    APPROVED: "badge-info",
    PAID: "badge-success",
    REJECTED: "badge-error",
  };
  return (
    <span className={`badge badge-sm badge-outline ${map[status] ?? ""}`}>
      {status}
    </span>
  );
}
