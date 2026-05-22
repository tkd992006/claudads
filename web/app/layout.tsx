import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import Providers from "./providers";
import AuthButton from "./auth-button";

export const metadata: Metadata = {
  title: "Claude Ad Terminal",
  description: "터미널이 일하는 시간, 가만 두지 마세요.",
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
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
                </span>
                <span className="text-sm font-semibold tracking-tight text-neutral-100 transition-colors group-hover:text-white">
                  Claude Ad Terminal
                </span>
              </Link>
              <AuthButton />
            </div>
          </header>

          <div className="flex-1">{children}</div>

          <footer className="border-t border-white/[0.06] py-6">
            <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-6 text-xs text-neutral-600">
              <span>© 2026 Claude Ad Terminal</span>
              <span>터미널이 일하는 시간, 가만 두지 마세요.</span>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
