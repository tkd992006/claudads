import { prisma } from "@/lib/prisma";
import BanToggle from "./ban-toggle";

export default async function AdminUsersPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">
        유저 <span className="text-neutral-600">({users.length})</span>
      </h2>
      <div className="surface divide-y divide-white/[0.05] overflow-hidden rounded-xl border border-white/[0.08] bg-base-200">
        {users.map((u) => (
          <div
            key={u.id}
            className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-white/[0.02]"
          >
            <div className="flex items-center gap-3">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-emerald-500/10 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-500/20">
                {u.login.slice(0, 2).toUpperCase()}
              </span>
              <div>
                <p className="text-sm font-medium text-neutral-100">
                  @{u.login}
                </p>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <span className="text-xs uppercase tracking-wide text-neutral-500">
                    {u.role}
                  </span>
                  {u.banned && (
                    <span className="badge badge-error badge-outline badge-xs">
                      banned
                    </span>
                  )}
                </div>
              </div>
            </div>
            <BanToggle id={u.id} banned={u.banned} />
          </div>
        ))}
      </div>
    </div>
  );
}
