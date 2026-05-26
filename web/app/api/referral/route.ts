import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { attachReferral } from "@/lib/services/referral";

/**
 * 매뉴얼 입력 경로 — 대시보드의 "추천인 코드 입력" 폼이 호출한다.
 * URL ?ref=... 자동 attach 경로는 dashboard 서버 컴포넌트에서 같은 헬퍼를
 * 직접 호출하므로 이 라우트를 거치지 않는다.
 *
 * 가입 보너스·인보이트 관계 생성·referralEndsAt 설정은 모두 attachReferral 안에
 * 일원화돼 있고 inviteeId @unique 가 중복을 막아준다.
 */
export async function POST(req: Request) {
  const { userId } = await requireUser();
  const { inviterLogin } = (await req.json().catch(() => ({}))) as {
    inviterLogin?: string;
  };
  if (!inviterLogin || typeof inviterLogin !== "string") {
    return NextResponse.json({ error: "inviterLogin required" }, { status: 400 });
  }

  const result = await prisma.$transaction((tx) =>
    attachReferral(tx, userId, inviterLogin),
  );

  if (!result.ok) {
    const status =
      result.reason === "already" ? 409
      : result.reason === "not_found" ? 404
      : 400;
    return NextResponse.json({ error: result.reason }, { status });
  }
  return NextResponse.json({ ok: true });
}
