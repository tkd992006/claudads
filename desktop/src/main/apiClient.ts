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
  return r.json().catch(() => ({}));
}

export function fetchAd(token: string, deviceId: string) {
  return jsonReq("/api/ads/serve", token, {
    method: "POST",
    body: JSON.stringify({ deviceId }),
  });
}

export function completeImpression(token: string, impressionId: string) {
  return jsonReq(`/api/ads/impression/${impressionId}`, token, {
    method: "PATCH",
  });
}

export function recordCta(token: string, impressionId: string) {
  return jsonReq(`/api/ads/cta/${impressionId}`, token, { method: "POST" });
}

export function getBalance(token: string) {
  return jsonReq(`/api/ads/balance`, token, { method: "GET" });
}
