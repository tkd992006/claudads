"use client";
import { useEffect } from "react";
import { signIn } from "next-auth/react";

export default function AutoSignIn({ callbackUrl }: { callbackUrl: string }) {
  useEffect(() => {
    signIn("github", { callbackUrl });
  }, [callbackUrl]);
  return (
    <main className="mx-auto max-w-md animate-fade-in px-6 py-24">
      <div className="card surface border border-white/[0.08] bg-base-200">
        <div className="card-body items-center gap-4 p-10 text-center">
          <span className="loading loading-spinner loading-lg text-emerald-400" />
          <p className="text-sm text-neutral-400">GitHub 로 이동 중...</p>
        </div>
      </div>
    </main>
  );
}
