"use client";
import { useEffect } from "react";
import { signIn } from "next-auth/react";

export default function AutoSignIn({ callbackUrl }: { callbackUrl: string }) {
  useEffect(() => {
    signIn("github", { callbackUrl });
  }, [callbackUrl]);
  return (
    <main className="max-w-md mx-auto p-10 text-center">
      <p className="text-neutral-400">GitHub 로 이동 중...</p>
    </main>
  );
}
