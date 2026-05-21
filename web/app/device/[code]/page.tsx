import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AutoSignIn from "./auto-signin";

export default async function DeviceLink({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const normalized = code.toUpperCase();

  const sess = await auth();
  if (!sess) {
    // 로그인 안 되어 있으면 자동으로 GitHub OAuth 로. 끝나면 이 페이지로 복귀.
    return <AutoSignIn callbackUrl={`/device/${normalized}`} />;
  }
  const userId = (sess as { userId?: string }).userId!;

  const ds = await prisma.deviceSession.findUnique({
    where: { userCode: normalized },
  });

  let state: "ok" | "expired" | "not_found" | "already" = "ok";
  if (!ds) state = "not_found";
  else if (ds.expiresAt < new Date()) state = "expired";
  else if (ds.userId && ds.userId !== userId) state = "already";
  else if (!ds.userId) {
    await prisma.deviceSession.update({
      where: { id: ds.id },
      data: { userId },
    });
  }

  return (
    <main className="max-w-md mx-auto p-10 text-center space-y-6">
      {state === "ok" ? (
        <>
          <div className="text-5xl">✓</div>
          <h1 className="text-2xl font-semibold">연결되었습니다</h1>
          <p className="text-neutral-400">
            데스크탑 앱으로 돌아가세요. 곧 자동으로 로그인됩니다.
          </p>
        </>
      ) : state === "expired" ? (
        <>
          <h1 className="text-xl">코드가 만료되었습니다</h1>
          <p className="text-neutral-400">앱에서 다시 시도해 주세요.</p>
        </>
      ) : state === "not_found" ? (
        <>
          <h1 className="text-xl">유효하지 않은 코드</h1>
          <p className="text-neutral-400">앱에서 새 코드를 받아주세요.</p>
        </>
      ) : (
        <>
          <h1 className="text-xl">이미 다른 계정에 연결됨</h1>
        </>
      )}
    </main>
  );
}
