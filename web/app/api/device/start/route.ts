import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "node:crypto";

// Custom (simple) device flow. We don't proxy to GitHub's device endpoint to keep this
// fully under our control. The user opens /device, signs in with GitHub on the web,
// then enters the user_code to bind the session.

function rand(n: number) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  const bytes = crypto.randomBytes(n);
  for (let i = 0; i < n; i++) s += alphabet[bytes[i] % alphabet.length];
  return s;
}

export async function POST() {
  const deviceCode = crypto.randomBytes(24).toString("base64url");
  const userCode = `${rand(4)}-${rand(4)}`;
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await prisma.deviceSession.create({
    data: { deviceCode, userCode, expiresAt },
  });
  const base = (process.env.NEXTAUTH_URL ?? "http://localhost:3000").replace(/\/+$/, "");
  return NextResponse.json({
    deviceCode,
    userCode,
    // 코드가 URL 에 박혀 있어서 클릭 한 번 → GitHub → 자동 바인딩 → 완료
    verificationUri: `${base}/device/${userCode}`,
    expiresIn: 600,
    interval: 3,
  });
}
