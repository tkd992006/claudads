import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getBalanceMicro } from "@/lib/ads";
import { attachReferral } from "@/lib/services/referral";
import WithdrawForm from "./withdraw-form";
import ReferralSection from "./referral-section";

export default async function DashboardPage() {
  const s = await auth();
  if (!s) redirect("/api/auth/signin?callbackUrl=/dashboard");
  const userId = (s as { userId?: string }).userId!;

  // 레퍼럴 자동 attach: 미들웨어가 박아둔 `ref` 쿠키를 읽어 한 번만 시도하고
  // 쿠키를 비운다. 이미 inviterId 가 있거나 self/invalid 인 경우엔 헬퍼가
  // 멱등하게 거절하므로 결과와 무관하게 안전.
  const cookieStore = await cookies();
  const refCookie = cookieStore.get("ref")?.value;
  if (refCookie) {
    const me = await prisma.user.findUnique({
      where: { id: userId },
      select: { inviterId: true, login: true },
    });
    if (me && !me.inviterId && me.login !== refCookie) {
      await prisma.$transaction((tx) => attachReferral(tx, userId, refCookie));
    }
    cookieStore.delete("ref");
  }

  const [me, balance, withdrawals, recent, inviteesCount, commissionAgg] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          login: true,
          inviterId: true,
          referralEndsAt: true,
        },
      }),
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
      prisma.referral.count({ where: { inviterId: userId } }),
      // 내가 받은 모든 REFERRAL_COMMISSION 합계. 초대받은 본인 보너스도 같은
      // reason 으로 기록되므로 "추천으로 추가 적립된 총량"의 의미.
      prisma.tokenLedger.aggregate({
        where: { userId, reason: "REFERRAL_COMMISSION" },
        _sum: { deltaMicro: true },
      }),
    ]);

  // 내 추천인 login — 위 select 에서 자기-참조 relation 이 없어 ID 만 가져왔으므로
  // 별도로 한 번 더 조회. 보통은 null 이라 추가 round-trip 비용도 0.
  const inviter = me?.inviterId
    ? await prisma.user.findUnique({
        where: { id: me.inviterId },
        select: { login: true },
      })
    : null;

  // origin: 추천 링크에 박아 줄 https://... — Next 의 server headers 에서 host 를
  // 그대로 가져온다. 로컬은 http, 운영은 https.
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");
  const origin = `${proto}://${host}`;

  const remainingMs = me?.referralEndsAt
    ? me.referralEndsAt.getTime() - Date.now()
    : null;

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

      {/* Referral */}
      <ReferralSection
        myLogin={me?.login ?? ""}
        inviter={inviter}
        remainingMs={remainingMs}
        inviteesCount={inviteesCount}
        commissionMicro={(commissionAgg._sum.deltaMicro ?? 0n).toString()}
        origin={origin}
      />

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
