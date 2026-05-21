import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const admins = (process.env.ADMIN_GITHUB_LOGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  for (const login of admins) {
    await prisma.user.updateMany({
      where: { login },
      data: { role: "ADMIN" },
    });
    console.log(`promoted ${login} to ADMIN if exists`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
