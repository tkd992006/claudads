import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import AdminNav from "./nav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 빈 session 객체 방어 — userId 가 있어야 로그인된 것으로 간주.
  const s = await auth();
  if (!(s as { userId?: string } | null)?.userId) {
    redirect("/api/auth/signin?callbackUrl=/admin");
  }
  if ((s as { role?: string }).role !== "ADMIN") {
    return (
      <main className="mx-auto max-w-md px-6 py-24">
        <div className="card surface border border-white/[0.08] bg-base-200">
          <div className="card-body items-center gap-2 p-8 text-center">
            <h1 className="text-lg font-semibold">관리자 전용</h1>
            <p className="text-sm text-neutral-500">
              이 페이지에 접근할 권한이 없습니다.
            </p>
          </div>
        </div>
      </main>
    );
  }
  return (
    <main className="mx-auto max-w-5xl animate-fade-up space-y-6 px-6 py-10">
      <div className="space-y-1">
        <p className="text-sm text-neutral-500">관리자</p>
        <h1 className="text-2xl font-semibold">운영 콘솔</h1>
      </div>
      <AdminNav />
      {children}
    </main>
  );
}
