"use client";

import { signIn, signOut, useSession } from "next-auth/react";

export default function AuthButton() {
  const { data, status } = useSession();

  if (status === "loading") {
    return <span className="h-7 w-20 animate-pulse rounded-md bg-white/5" />;
  }

  if (!data) {
    return (
      <button
        onClick={() => signIn("github")}
        className="btn btn-ghost btn-sm gap-2 border-white/10"
      >
        <GithubIcon />
        로그인
      </button>
    );
  }

  const login = (data.user?.name as string | undefined) ?? "user";
  return (
    <div className="flex items-center gap-3">
      <span className="flex items-center gap-2 text-xs text-neutral-400">
        <span className="grid h-6 w-6 place-items-center rounded-full bg-emerald-500/15 text-[10px] font-semibold text-emerald-300 ring-1 ring-emerald-500/20">
          {login.slice(0, 2).toUpperCase()}
        </span>
        <span className="hidden sm:inline">@{login}</span>
      </span>
      <button
        onClick={() => signOut({ callbackUrl: "/" })}
        className="btn btn-ghost btn-xs border-white/10"
      >
        로그아웃
      </button>
    </div>
  );
}

function GithubIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.1.68-.22.68-.49 0-.24-.01-.88-.01-1.72-2.78.62-3.37-1.37-3.37-1.37-.46-1.18-1.11-1.5-1.11-1.5-.91-.64.07-.62.07-.62 1 .07 1.53 1.05 1.53 1.05.89 1.57 2.34 1.12 2.91.85.09-.66.35-1.12.63-1.37-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.27 2.75 1.05a9.36 9.36 0 0 1 5 0c1.91-1.32 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.81-4.57 5.06.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.81 0 .27.18.6.69.49A10.02 10.02 0 0 0 22 12.25C22 6.58 17.52 2 12 2Z" />
    </svg>
  );
}
