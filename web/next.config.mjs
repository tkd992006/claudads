import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Docker용 self-contained 서버 빌드. .next/standalone/ 에 트레이스된
  // node_modules + server.js 가 떨어진다.
  output: "standalone",
  // 모노레포라서 트레이싱 루트를 web/ 가 아니라 한 단계 위로 잡아준다.
  // 안 잡으면 Next 가 잘못된 lockfile 을 골라 경고를 띄움.
  outputFileTracingRoot: path.join(__dirname, ".."),
  experimental: {
    serverActions: { bodySizeLimit: "10mb" },
  },
};

export default nextConfig;
