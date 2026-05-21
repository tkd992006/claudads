"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function WithdrawForm({ balance }: { balance: string }) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [destination, setDestination] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

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
      setMsg("요청됨. 관리자 검토 후 지급됩니다.");
      setAmount("");
      router.refresh();
    } else {
      setMsg(`실패: ${(await res.json()).error ?? res.status}`);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      <div className="text-xs text-neutral-500">잔액 {balance} µ</div>
      <input
        className="w-full"
        placeholder="출금 단위 (micro)"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        required
      />
      <input
        className="w-full"
        placeholder="지급 계좌/이메일"
        value={destination}
        onChange={(e) => setDestination(e.target.value)}
        required
      />
      <button className="btn-primary" disabled={busy}>
        {busy ? "..." : "출금 신청"}
      </button>
      {msg && <p className="text-sm text-neutral-400">{msg}</p>}
    </form>
  );
}
