import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { prisma } from "./prisma";

const adminLogins = (process.env.ADMIN_GITHUB_LOGINS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ profile }) {
      if (!profile?.id) return false;
      const githubId = String(profile.id);
      const login = (profile as { login?: string }).login ?? "unknown";
      const isAdmin = adminLogins.includes(login);

      await prisma.user.upsert({
        where: { githubId },
        create: {
          githubId,
          login,
          email: profile.email ?? null,
          avatarUrl: (profile as { avatar_url?: string }).avatar_url ?? null,
          role: isAdmin ? "ADMIN" : "VIEWER",
        },
        update: {
          login,
          email: profile.email ?? undefined,
          avatarUrl:
            (profile as { avatar_url?: string }).avatar_url ?? undefined,
          ...(isAdmin ? { role: "ADMIN" as const } : {}),
        },
      });
      return true;
    },
    async jwt({ token, profile }) {
      if (profile?.id) token.githubId = String(profile.id);
      if (token.githubId && !token.userId) {
        const u = await prisma.user.findUnique({
          where: { githubId: String(token.githubId) },
          select: { id: true, role: true, banned: true },
        });
        if (u) {
          token.userId = u.id;
          token.role = u.role;
          token.banned = u.banned;
        }
      }
      return token;
    },
    async session({ session, token }) {
      (session as { userId?: string }).userId = token.userId as string;
      (session as { role?: string }).role = token.role as string;
      (session as { banned?: boolean }).banned = token.banned as boolean;
      return session;
    },
  },
});

export async function requireUser() {
  const s = await auth();
  const userId = (s as { userId?: string } | null)?.userId;
  if (!userId) throw new Response("Unauthorized", { status: 401 });
  return { userId, role: (s as { role?: string }).role ?? "VIEWER" };
}

export async function requireAdmin() {
  const u = await requireUser();
  if (u.role !== "ADMIN") throw new Response("Forbidden", { status: 403 });
  return u;
}
