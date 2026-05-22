"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin/ads", label: "광고 검수" },
  { href: "/admin/withdrawals", label: "출금" },
  { href: "/admin/users", label: "유저" },
];

export default function AdminNav() {
  const path = usePathname();
  return (
    <nav className="flex gap-1 rounded-lg border border-white/[0.08] bg-base-200 p-1">
      {TABS.map((t) => {
        const active = path === t.href || path.startsWith(t.href + "/");
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`flex-1 rounded-md px-3 py-1.5 text-center text-sm font-medium transition-colors ${
              active
                ? "bg-emerald-500/15 text-emerald-300"
                : "text-neutral-400 hover:bg-white/[0.04] hover:text-neutral-200"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
