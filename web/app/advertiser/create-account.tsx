"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreateAccount() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch("/api/advertiser/account", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setBusy(false);
    if (res.ok) router.refresh();
  }

  return (
    <main className="mx-auto flex max-w-md animate-fade-up flex-col px-6 py-20">
      <div className="card surface border border-white/[0.08] bg-base-200">
        <div className="card-body gap-4 p-6">
          <div className="grid h-11 w-11 place-items-center rounded-lg bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20">
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M3 11v2a1 1 0 0 0 1 1h2.5L11 18V6L6.5 10H4a1 1 0 0 0-1 1Z" />
              <path d="M15 8.5a4 4 0 0 1 0 7M11 6l8-3v18l-8-3" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-semibold">광고주 계정 생성</h1>
            <p className="mt-1 text-sm text-neutral-400">
              광고주 등록은 시청자 계정과 별개로 관리됩니다.
            </p>
          </div>
          <form onSubmit={submit} className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-500">
                회사 / 제품 이름
              </span>
              <input
                required
                placeholder="예: Acme Inc."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input input-bordered w-full"
              />
            </label>
            <button className="btn btn-primary w-full" disabled={busy}>
              {busy && <span className="loading loading-spinner loading-xs" />}
              {busy ? "생성 중" : "계정 생성"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
