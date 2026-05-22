"use client";

import { useState } from "react";
import { signIn, useSession } from "next-auth/react";

export default function DevicePage() {
  const { data: session } = useSession();
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(
    null,
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    const res = await fetch("/api/device/bind", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userCode: code.trim().toUpperCase() }),
    });
    if (res.ok) {
      setStatus({ ok: true, text: "연결됨. 데스크탑 앱으로 돌아가 주세요." });
    } else {
      setStatus({
        ok: false,
        text: `실패: ${(await res.json()).error ?? res.status}`,
      });
    }
  }

  if (!session) {
    return (
      <main className="mx-auto max-w-md animate-fade-up px-6 py-20">
        <div className="card surface border border-white/[0.08] bg-base-200">
          <div className="card-body items-center gap-4 p-8 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20">
              <MonitorIcon />
            </div>
            <div>
              <h1 className="text-xl font-semibold">데스크탑 앱 연결</h1>
              <p className="mt-1 text-sm text-neutral-400">
                먼저 GitHub 로그인이 필요합니다.
              </p>
            </div>
            <button
              className="btn btn-primary w-full"
              onClick={() => signIn("github")}
            >
              GitHub 로 로그인
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md animate-fade-up px-6 py-20">
      <div className="card surface border border-white/[0.08] bg-base-200">
        <div className="card-body gap-5 p-8">
          <div className="text-center">
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20">
              <MonitorIcon />
            </div>
            <h1 className="text-xl font-semibold">데스크탑 앱 연결</h1>
            <p className="mt-1 text-sm text-neutral-400">
              데스크탑 앱 화면에 표시된 코드를 입력하세요.
            </p>
          </div>
          <form onSubmit={submit} className="space-y-3">
            <input
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="ABCD-EFGH"
              className="input input-bordered input-lg w-full text-center font-mono text-2xl uppercase tracking-[0.3em] placeholder:tracking-[0.2em]"
            />
            <button className="btn btn-primary w-full" type="submit">
              연결
            </button>
          </form>
          {status && (
            <p
              className={`text-center text-sm ${
                status.ok ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {status.text}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}

function MonitorIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  );
}
