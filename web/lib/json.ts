import { NextResponse } from "next/server";

// micro 토큰 보상/잔액은 bigint 인데 JSON.stringify 가 bigint 를 직렬화하지
// 못해 throw 한다. 응답 직전 replacer 로 string 으로 바꿔 내보낸다.
// Date 등은 replacer 호출 전에 toJSON 이 먼저 돌므로 영향받지 않는다.
export function jsonResponse(data: unknown) {
  const body = JSON.stringify(data, (_key, value) =>
    typeof value === "bigint" ? value.toString() : value,
  );
  return new NextResponse(body, {
    headers: { "content-type": "application/json" },
  });
}
