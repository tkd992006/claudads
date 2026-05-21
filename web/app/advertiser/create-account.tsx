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
    <main className="max-w-md mx-auto p-8 space-y-4">
      <h1 className="text-xl font-semibold">광고주 계정 생성</h1>
      <p className="text-sm text-neutral-400">
        광고주 등록은 시청자 계정과 별개입니다.
      </p>
      <form onSubmit={submit} className="space-y-3">
        <input
          required
          placeholder="회사/제품 이름"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full"
        />
        <button className="btn-primary w-full" disabled={busy}>
          {busy ? "생성 중..." : "생성"}
        </button>
      </form>
    </main>
  );
}
