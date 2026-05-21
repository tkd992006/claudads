"use client";

import { useState } from "react";
import { signIn, useSession } from "next-auth/react";

export default function DevicePage() {
  const { data: session } = useSession();
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    const res = await fetch("/api/device/bind", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userCode: code.trim().toUpperCase() }),
    });
    if (res.ok) setStatus("연결됨. 데스크탑 앱으로 돌아가 주세요.");
    else setStatus(`실패: ${(await res.json()).error ?? res.status}`);
  }

  if (!session) {
    return (
      <main className="max-w-md mx-auto p-8 space-y-4">
        <h1 className="text-xl font-semibold">데스크탑 앱 연결</h1>
        <p className="text-neutral-400 text-sm">
          먼저 GitHub 로그인이 필요합니다.
        </p>
        <button className="btn-primary" onClick={() => signIn("github")}>
          GitHub 로 로그인
        </button>
      </main>
    );
  }

  return (
    <main className="max-w-md mx-auto p-8 space-y-4">
      <h1 className="text-xl font-semibold">데스크탑 앱 연결</h1>
      <p className="text-neutral-400 text-sm">
        데스크탑 앱 화면에 표시된 코드를 입력하세요.
      </p>
      <form onSubmit={submit} className="space-y-3">
        <input
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="ABCD-EFGH"
          className="w-full text-lg tracking-widest uppercase"
        />
        <button className="btn-primary w-full" type="submit">
          연결
        </button>
      </form>
      {status && <p className="text-sm text-neutral-400">{status}</p>}
    </main>
  );
}
