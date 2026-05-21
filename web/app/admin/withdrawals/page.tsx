import { prisma } from "@/lib/prisma";
import WithdrawalRow from "./row";

export default async function AdminWithdrawalsPage() {
  const list = await prisma.withdrawal.findMany({
    where: { status: { in: ["REQUESTED", "APPROVED"] } },
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">출금 요청</h1>
      {list.length === 0 && (
        <p className="text-neutral-500 text-sm">대기 중 출금 없음.</p>
      )}
      <ul className="space-y-3">
        {list.map((w) => (
          <li key={w.id} className="card flex justify-between items-center">
            <div>
              <div className="font-mono">{w.amountMicro.toString()} µ</div>
              <div className="text-sm text-neutral-400">
                @{w.user.login} · {w.destination} · {w.status}
              </div>
            </div>
            <WithdrawalRow id={w.id} status={w.status} />
          </li>
        ))}
      </ul>
    </div>
  );
}
