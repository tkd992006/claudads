#!/usr/bin/env node
//
// R2 의 `releases` 버킷에 데스크탑 빌드 산출물(.dmg/.exe/.AppImage)을 올리고
// 공개 다운로드 URL 한 줄을 stdout 에 뱉는다.
//
// 사용:
//   node scripts/upload-release.mjs desktop/release/Claude-Ad-Terminal-mac-x64.dmg
//   node scripts/upload-release.mjs <path> [--key <override>]
//
// 필요 env (기존 R2 셋업 100% 재사용):
//   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_BASE
//
// 기본은 기존 `ads` 버킷에 `releases/` prefix 로 업로드 → 광고 비디오랑 ACL/
// 도메인 공유. 별도 분리하고 싶으면 다음을 추가로 export:
//   R2_RELEASES_BUCKET       (기본: $R2_BUCKET, 그것도 없으면 "ads")
//   R2_RELEASES_PUBLIC_BASE  (기본: $R2_PUBLIC_BASE)
//   R2_RELEASES_PREFIX       (기본: "releases/")
//
// .env 자동 로드: web/.env.local → web/.env → .env (있는 것 순서대로).
//

import { createReadStream, readFileSync, statSync } from "node:fs";
import { basename, extname, resolve } from "node:path";
import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";

// ── tiny .env 로더 (의존성 없이) ─────────────────────────────────────────
for (const p of ["web/.env.local", "web/.env", ".env"]) {
  try {
    const txt = readFileSync(p, "utf8");
    for (const line of txt.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (!m) continue;
      const [, k, vRaw] = m;
      if (process.env[k]) continue; // 이미 셸에 있으면 우선
      const v = vRaw.replace(/^["']|["']$/g, "");
      process.env[k] = v;
    }
  } catch {
    /* 파일 없으면 무시 */
  }
}

// ── 인자 파싱 ──────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--"));
const keyArgIx = args.indexOf("--key");
const keyOverride = keyArgIx >= 0 ? args[keyArgIx + 1] : null;

if (!file) {
  console.error("Usage: upload-release.mjs <file> [--key <r2-key>]");
  process.exit(2);
}

const absFile = resolve(file);
const stat = statSync(absFile); // 없으면 throw 로 종료

// ── env 검증 ───────────────────────────────────────────────────────────
const ACCOUNT = required("R2_ACCOUNT_ID");
const ACCESS = required("R2_ACCESS_KEY_ID");
const SECRET = required("R2_SECRET_ACCESS_KEY");
// 기존 R2 셋업 재사용 — 별도 분리 원할 때만 RELEASES_ 변수로 오버라이드.
const BUCKET =
  process.env.R2_RELEASES_BUCKET ?? process.env.R2_BUCKET ?? "ads";
const PUBLIC_BASE =
  process.env.R2_RELEASES_PUBLIC_BASE ?? process.env.R2_PUBLIC_BASE;
const PREFIX = (process.env.R2_RELEASES_PREFIX ?? "releases/").replace(
  /^\/+|\/+$/g,
  "",
); // "releases/foo" → "releases/foo", 슬래시 정규화
const key = keyOverride ?? `${PREFIX}/${basename(absFile)}`;

function required(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`❌ env ${name} 가 없음. .env 또는 셸에 설정 필요.`);
    process.exit(1);
  }
  return v;
}

// ── 업로드 ─────────────────────────────────────────────────────────────
const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${ACCOUNT}.r2.cloudflarestorage.com`,
  forcePathStyle: true,
  // R2 가 일부 checksum 헤더에 까칠해서 명시적으로 끔.
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
  credentials: { accessKeyId: ACCESS, secretAccessKey: SECRET },
});

const ext = extname(absFile).toLowerCase();
const CONTENT_TYPE =
  {
    ".dmg": "application/x-apple-diskimage",
    ".exe": "application/vnd.microsoft.portable-executable",
    ".appimage": "application/vnd.appimage",
    ".zip": "application/zip",
  }[ext] ?? "application/octet-stream";

const sizeMb = (stat.size / 1024 / 1024).toFixed(1);
console.error(`▶ uploading ${absFile} (${sizeMb} MB) → r2://${BUCKET}/${key}`);

// multipart upload — 큰 파일(100MB+) 의 단일 PUT 은 Node 23 + R2 조합에서
// SSL handshake 깨짐이 잦다. lib-storage 의 Upload 는 8MB 청크로 잘라
// 보내고 실패한 청크만 재시도하므로 안정적. 파일도 stream 으로 보내서
// 메모리에 통째로 안 올림.
const uploader = new Upload({
  client: s3,
  partSize: 8 * 1024 * 1024,
  queueSize: 4,
  leavePartsOnError: false,
  params: {
    Bucket: BUCKET,
    Key: key,
    Body: createReadStream(absFile),
    ContentType: CONTENT_TYPE,
    ContentDisposition: `attachment; filename="${basename(key)}"`,
    CacheControl: "public, max-age=300, must-revalidate",
  },
});

uploader.on("httpUploadProgress", (p) => {
  if (!p.total) return;
  const pct = ((p.loaded / p.total) * 100).toFixed(0);
  process.stderr.write(`\r  ${pct}% (${(p.loaded / 1024 / 1024).toFixed(1)}/${sizeMb} MB)`);
});

await uploader.done();
process.stderr.write("\n");

// ── 결과 URL 출력 ──────────────────────────────────────────────────────
if (PUBLIC_BASE) {
  const url = `${PUBLIC_BASE.replace(/\/$/, "")}/${key}`;
  console.error("✓ uploaded.");
  console.log(url); // ← 한 줄. 다른 도구가 파이프로 받을 수 있게 stdout.
} else {
  console.error("✓ uploaded — 하지만 R2_PUBLIC_BASE (또는 R2_RELEASES_PUBLIC_BASE) 가 없어 URL 출력 생략.");
  console.error(
    `  버킷 ${BUCKET} 의 public base 를 env 에 박으면 다음부터 자동 출력됩니다.`,
  );
  process.exit(0);
}
