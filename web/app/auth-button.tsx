"use client";

import { signIn, signOut, useSession } from "next-auth/react";

export default function AuthButton() {
  const { data, status } = useSession();

  if (status === "loading") {
    return <span className="text-xs text-neutral-500">…</span>;
  }

  if (!data) {
    return (
      <button
        onClick={() => signIn("github")}
        className="text-xs text-neutral-300 hover:text-white underline-offset-2 hover:underline"
      >
        로그인
      </button>
    );
  }

  const login = (data.user?.name as string | undefined) ?? "user";
  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="text-neutral-400">@{login}</span>
      <button
        onClick={() => signOut({ callbackUrl: "/" })}
        className="text-neutral-300 hover:text-white underline-offset-2 hover:underline"
      >
        로그아웃
      </button>
    </div>
  );
}
