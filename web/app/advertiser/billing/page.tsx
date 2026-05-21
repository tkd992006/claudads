"use client";

import { useState } from "react";

export default function BillingPage() {
  const [amount, setAmount] = useState(100_000);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function charge() {
    setBusy(true);
    const res = await fetch("/api/advertiser/billing", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ amountCents: amount }),
    });
    setBusy(false);
    if (res.ok) {
      const j = await res.json();
      setMsg(`충전 완료. 잔액 ₩${j.account.balanceCents.toLocaleString()}`);
    } else {
      setMsg(`실패: ${res.status}`);
    }
  }

  return (
    <main className="max-w-md mx-auto p-8 space-y-4">
      <h1 className="text-xl font-semibold">예산 충전</h1>
      <p className="text-sm text-neutral-400">
        MVP 는 mock 충전입니다. PG 연동은 추후.
      </p>
      <input
        type="number"
        className="w-full"
        value={amount}
        onChange={(e) => setAmount(Number(e.target.value))}
      />
      <button className="btn-primary" onClick={charge} disabled={busy}>
        {busy ? "처리 중..." : "충전"}
      </button>
      {msg && <p className="text-sm">{msg}</p>}
    </main>
  );
}
