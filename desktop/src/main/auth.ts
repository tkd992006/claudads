const API_BASE = process.env.PUBLIC_API_BASE ?? "http://localhost:3000";

export async function startDeviceFlow() {
  const r = await fetch(`${API_BASE}/api/device/start`, { method: "POST" });
  return r.json();
}

export async function pollToken(deviceCode: string) {
  const r = await fetch(`${API_BASE}/api/device/poll`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ deviceCode }),
  });
  return r.json();
}
