"use client";

import { useState } from "react";
import Link from "next/link";

const PRESETS = [50_000, 100_000, 300_000, 500_000];

export default function BillingPage() {
  const [amount, setAmount] = useState(100_000);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function charge() {
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/advertiser/billing", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ amountCents: amount }),
    });
    setBusy(false);
    if (res.ok) {
      const j = await res.json();
      setMsg({
        ok: true,
        text: `충전 완료 · 잔액 ₩${j.account.balanceCents.toLocaleString()}`,
      });
    } else {
      setMsg({ ok: false, text: `실패: ${res.status}` });
    }
  }

  return (
    <main className="mx-auto max-w-md animate-fade-up px-6 py-16">
      <Link
        href="/advertiser"
        className="link link-hover mb-4 inline-flex items-center gap-1 text-sm text-neutral-500"
      >
        ← 광고주 콘솔
      </Link>
      <div className="card surface border border-white/[0.08] bg-base-200">
        <div className="card-body gap-4 p-6">
          <div>
            <h1 className="text-xl font-semibold">예산 충전</h1>
            <p className="mt-1 text-sm text-neutral-500">
              MVP 는 mock 충전입니다. PG 연동은 추후 지원됩니다.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {PRESETS.map((p) => (
              <button
                type="button"
                key={p}
                onClick={() => setAmount(p)}
                className={`btn btn-sm font-mono ${
                  amount === p ? "btn-primary" : "btn-ghost border-white/10"
                }`}
              >
                ₩{p.toLocaleString()}
              </button>
            ))}
          </div>

          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-500">
              충전 금액 (원)
            </span>
            <input
              type="number"
              className="input input-bordered w-full font-mono"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
          </label>

          <button
            className="btn btn-primary w-full"
            onClick={charge}
            disabled={busy}
          >
            {busy && <span className="loading loading-spinner loading-xs" />}
            {busy ? "처리 중" : `₩${amount.toLocaleString()} 충전`}
          </button>

          {msg && (
            <p
              className={`text-sm ${
                msg.ok ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {msg.text}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
