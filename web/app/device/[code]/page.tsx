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

  const content = {
    ok: {
      tone: "ok" as const,
      title: "연결되었습니다",
      body: "데스크탑 앱으로 돌아가세요. 곧 자동으로 로그인됩니다.",
    },
    expired: {
      tone: "warn" as const,
      title: "코드가 만료되었습니다",
      body: "앱에서 새 코드를 받아 다시 시도해 주세요.",
    },
    not_found: {
      tone: "warn" as const,
      title: "유효하지 않은 코드",
      body: "앱에서 새 코드를 받아주세요.",
    },
    already: {
      tone: "warn" as const,
      title: "이미 다른 계정에 연결됨",
      body: "이 코드는 다른 계정에서 사용 중입니다.",
    },
  }[state];

  const ok = content.tone === "ok";

  return (
    <main className="mx-auto max-w-md animate-fade-up px-6 py-24">
      <div className="card surface border border-white/[0.08] bg-base-200">
        <div className="card-body items-center gap-3 p-10 text-center">
          <div
            className={`grid h-14 w-14 place-items-center rounded-full ring-1 ${
              ok
                ? "bg-emerald-500/15 text-emerald-400 ring-emerald-500/30"
                : "bg-amber-500/15 text-amber-400 ring-amber-500/30"
            }`}
          >
            {ok ? <CheckIcon /> : <AlertIcon />}
          </div>
          <h1 className="text-xl font-semibold">{content.title}</h1>
          <p className="text-sm text-neutral-400">{content.body}</p>
        </div>
      </div>
    </main>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-7 w-7"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m5 13 4 4L19 7" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-7 w-7"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 8v5M12 17h.01" />
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}
