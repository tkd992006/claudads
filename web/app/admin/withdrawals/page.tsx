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
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">출금 요청</h2>
        <span className="badge badge-outline badge-warning">
          {list.length} 대기
        </span>
      </div>

      {list.length === 0 && (
        <p className="rounded-xl border border-dashed border-white/[0.08] py-14 text-center text-sm text-neutral-600">
          대기 중인 출금 요청이 없습니다.
        </p>
      )}

      <ul className="space-y-3">
        {list.map((w) => (
          <li
            key={w.id}
            className="surface flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/[0.08] bg-base-200 p-4"
          >
            <div className="space-y-1">
              <p className="font-mono text-lg font-semibold">
                {w.amountMicro.toString()}{" "}
                <span className="text-sm text-neutral-500">µ</span>
              </p>
              <p className="text-sm text-neutral-500">
                @{w.user.login} · {w.destination}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`badge badge-sm badge-outline ${
                  w.status === "APPROVED" ? "badge-info" : "badge-warning"
                }`}
              >
                {w.status}
              </span>
              <WithdrawalRow id={w.id} status={w.status} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
