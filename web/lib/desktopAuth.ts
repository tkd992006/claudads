import { prisma } from "./prisma";
import crypto from "node:crypto";

// Bearer token for desktop -> /api/ads/*. Issued by /api/device/poll on success.
// Stored on DeviceSession.token. Looked up by SHA-256.

function sha(s: string) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

export async function issueToken(userId: string, deviceCode: string) {
  const raw = crypto.randomBytes(24).toString("base64url");
  await prisma.deviceSession.update({
    where: { deviceCode },
    data: { token: sha(raw), userId },
  });
  return raw;
}

export async function userFromBearer(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  const tokenHash = sha(m[1]);
  const sess = await prisma.deviceSession.findFirst({
    where: { token: tokenHash, userId: { not: null } },
    include: { user: true },
  });
  if (!sess?.user || sess.user.banned) return null;
  return sess.user;
}
