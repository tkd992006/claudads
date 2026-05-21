import { prisma } from "@/lib/prisma";
import BanToggle from "./ban-toggle";

export default async function AdminUsersPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">유저</h1>
      <ul className="space-y-2">
        {users.map((u) => (
          <li key={u.id} className="card flex justify-between items-center">
            <div className="text-sm">
              @{u.login} · {u.role}
              {u.banned && (
                <span className="ml-2 text-red-400">banned</span>
              )}
            </div>
            <BanToggle id={u.id} banned={u.banned} />
          </li>
        ))}
      </ul>
    </div>
  );
}
