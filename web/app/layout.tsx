import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import Providers from "./providers";
import AuthButton from "./auth-button";

export const metadata: Metadata = {
  title: "ClaudeShift — 클로드 코드에게 야간근무를 시키세요",
  description:
    "Claude 가 busy 인 동안 터미널 위로 짧은 광고가 흐르고, 흘러간 시간이 야근비로 적립되는 데스크탑 앱.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" data-theme="terminal">
      <body className="flex min-h-screen flex-col">
        <Providers>
          <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-base-100/70 backdrop-blur-xl">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
              <Link href="/" className="group flex items-center gap-2.5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-60" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-400" />
                </span>
                <span className="text-sm font-semibold tracking-tight text-neutral-100 transition-colors group-hover:text-white">
                  Claude<span className="text-amber-300">Shift</span>
                </span>
              </Link>
              <AuthButton />
            </div>
          </header>

          <div className="flex-1">{children}</div>

          <footer className="border-t border-white/[0.06] py-6">
            <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-6 text-xs text-neutral-600">
              <span>© 2026 ClaudeShift</span>
              <span className="font-mono uppercase tracking-[0.2em] text-neutral-500">
                put claude on the night shift
              </span>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
