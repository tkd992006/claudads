import { NextResponse, type NextRequest } from "next/server";

/**
 * 레퍼럴 링크(`?ref=<github-login>`) 캡처. URL 쿼리에 ref 가 있으면 30일짜리
 * `ref` 쿠키로 굳히고, 이후 OAuth 가입을 마치고 /dashboard 에 도착하면 거기서
 * 서버 컴포넌트가 쿠키를 읽어 attachReferral 을 호출한다.
 *
 * 미들웨어 자체는 응답을 통과시키기만 하고 가입 여부와 무관 — 비로그인 상태에서
 * 어느 페이지를 봐도 쿠키만 박힌다. /api, /_next, 정적 자산은 매처에서 제외.
 *
 * GitHub login 문자셋(영숫자 + hyphen, 최대 39자)으로 sanitize 하므로
 * 임의의 값이 쿠키에 들어가지 않는다.
 */
const GH_LOGIN_RE = /^[a-zA-Z0-9-]{1,39}$/;
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30일

export function middleware(req: NextRequest) {
  const ref = req.nextUrl.searchParams.get("ref");
  if (!ref) return NextResponse.next();

  const trimmed = ref.trim();
  if (!GH_LOGIN_RE.test(trimmed)) return NextResponse.next();

  // 이미 같은 값으로 쿠키가 있으면 재발급 생략 — 매 페이지뷰마다 헤더에 쿠키
  // 셋팅을 끼우지 않는다. 다른 값이면 "마지막 클릭" 우선으로 덮어쓴다.
  if (req.cookies.get("ref")?.value === trimmed) return NextResponse.next();

  const res = NextResponse.next();
  res.cookies.set("ref", trimmed, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
  return res;
}

// API, Next 내부 자산, 흔한 정적 파일은 매처에서 제외 — 미들웨어가 모든
// 요청에 끼어 페이지 응답 헤더를 흐리지 않게 한다.
export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp)).*)",
  ],
};
