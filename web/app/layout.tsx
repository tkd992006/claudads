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
    <html lang="ko">
      <body>
        <Providers>
          <header className="flex items-center justify-between px-6 py-3 border-b border-neutral-800">
            <Link href="/" className="text-sm font-semibold text-neutral-200">
              Claude Ad Terminal
            </Link>
            <AuthButton />
          </header>
          {children}
        </Providers>
      </body>
    </html>
  );
}
