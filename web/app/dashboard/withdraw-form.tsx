"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function WithdrawForm({ balance }: { balance: string }) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [destination, setDestination] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/withdrawals", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ amountMicro: amount, destination }),
    });
    setBusy(false);
    if (res.ok) {
      setMsg({ ok: true, text: "요청됨. 관리자 검토 후 지급됩니다." });
      setAmount("");
      router.refresh();
    } else {
      setMsg({
        ok: false,
        text: `실패: ${(await res.json()).error ?? res.status}`,
      });
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-500">
            출금 단위 (µ)
          </span>
          <input
            className="input input-bordered input-sm w-full font-mono"
            inputMode="numeric"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-500">
            지급 계좌 / 이메일
          </span>
          <input
            className="input input-bordered input-sm w-full"
            placeholder="계좌번호 또는 이메일"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            required
          />
        </label>
      </div>
      <div className="flex items-center gap-3">
        <button className="btn btn-primary btn-sm" disabled={busy}>
          {busy && <span className="loading loading-spinner loading-xs" />}
          {busy ? "신청 중" : "출금 신청"}
        </button>
        <span className="text-xs text-neutral-500">
          사용 가능 <span className="font-mono text-neutral-400">{balance}</span> µ
        </span>
      </div>
      {msg && (
        <p
          className={`text-sm ${
            msg.ok ? "text-emerald-400" : "text-red-400"
          }`}
        >
          {msg.text}
        </p>
      )}
    </form>
  );
}
