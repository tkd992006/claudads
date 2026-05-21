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
    <main className="max-w-3xl mx-auto p-8 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">내 대시보드</h1>
        <div className="text-3xl font-mono mt-2">
          {balance.toString()} <span className="text-base text-neutral-500">µ</span>
        </div>
      </header>

      <section className="card space-y-3">
        <h2 className="font-semibold">출금 신청</h2>
        <WithdrawForm balance={balance.toString()} />
        <ul className="text-sm divide-y divide-neutral-800">
          {withdrawals.map((w) => (
            <li key={w.id} className="py-2 flex justify-between">
              <span className="font-mono">{w.amountMicro.toString()} µ</span>
              <span className="text-neutral-400">{w.status}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h2 className="font-semibold mb-2">최근 적립</h2>
        <ul className="text-sm divide-y divide-neutral-800">
          {recent.map((r) => (
            <li key={r.id} className="py-1.5 flex justify-between">
              <span>{r.reason}</span>
              <span className="font-mono">
                {r.deltaMicro > 0n ? "+" : ""}
                {r.deltaMicro.toString()} µ
              </span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
