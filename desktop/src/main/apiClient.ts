const API_BASE = process.env.PUBLIC_API_BASE ?? "http://localhost:3000";

async function jsonReq(
  path: string,
  token: string,
  init: RequestInit = {},
): Promise<any> {
  const r = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
  });
  const body = await r.json().catch(() => ({}));
  // 401 은 서버가 토큰을 무효로 본 것 — 로컬 토큰이 있어도 OAuth 는 깨진 상태.
  // 렌더러가 이걸 보고 즉시 로그아웃 처리할 수 있게 표식을 남긴다.
  if (r.status === 401) return { ...body, __unauthorized: true };
  return body;
}

export function fetchAd(token: string, deviceId: string) {
  return jsonReq("/api/ads/serve", token, {
    method: "POST",
    body: JSON.stringify({ deviceId }),
  });
}

export function completeImpression(
  token: string,
  impressionId: string,
  playedSec: number,
) {
  return jsonReq(`/api/ads/impression/${impressionId}`, token, {
    method: "PATCH",
    body: JSON.stringify({ playedSec }),
  });
}

export function recordCta(token: string, impressionId: string) {
  return jsonReq(`/api/ads/cta/${impressionId}`, token, { method: "POST" });
}

export function getBalance(token: string) {
  return jsonReq(`/api/ads/balance`, token, { method: "GET" });
}
