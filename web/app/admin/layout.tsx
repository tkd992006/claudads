import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const s = await auth();
  if (!s) redirect("/api/auth/signin?callbackUrl=/admin");
  if ((s as { role?: string }).role !== "ADMIN") {
    return (
      <main className="p-8">
        <h1 className="text-xl">관리자 전용</h1>
      </main>
    );
  }
  return (
    <main className="max-w-5xl mx-auto p-6 space-y-6">
      <nav className="flex gap-4 border-b border-neutral-800 pb-3 text-sm">
        <Link href="/admin/ads">광고 검수</Link>
        <Link href="/admin/withdrawals">출금</Link>
        <Link href="/admin/users">유저</Link>
      </nav>
      {children}
    </main>
  );
}
