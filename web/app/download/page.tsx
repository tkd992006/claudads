import Link from "next/link";
import type { Metadata } from "next";

// R2 에 업로드된 첫 공개 빌드. 0.1.0 은 옛 brand("Claude Ad Terminal") 시절
// 파일이라 URL 에 %20 이 박혀 있음. productName 을 ClaudeShift 로 바꿨으니
// 다음 빌드 산출물은 `ClaudeShift-<ver>-mac-x64.dmg` — R2 재업로드 후
// 아래 URL/버전 상수 갱신할 것.
const MAC_X64_URL =
  "https://pub-e3a28d684eec406a83af82013952bb1a.r2.dev/releases/Claude%20Ad%20Terminal-0.1.0-mac-x64.dmg";
const MAC_X64_VERSION = "0.1.0";
const MAC_X64_SIZE_MB = 103;

export const metadata: Metadata = {
  title: "데스크탑 앱 받기 · ClaudeShift",
  description:
    "Claude 답 기다리는 동안 안 보는 화면 위로만 광고가 뜨고, 모이면 구독료를 덮어주는 데스크탑 터미널 앱.",
};

export default function DownloadPage() {
  return (
    <main className="mx-auto max-w-3xl animate-fade-up px-6 pb-24 pt-16">
      <header className="text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-amber-400/70">
          desktop · v{MAC_X64_VERSION}
        </p>
        <h1 className="mt-4 text-balance text-3xl font-semibold sm:text-4xl">
          데스크탑 앱 받기
        </h1>
        <p className="mt-3 text-sm text-neutral-400">
          평소엔 풀스크린 터미널. Claude 답 기다리는 동안에만 짧게 광고가 뜨고,
          모이면 구독료를 통째로 덮어줍니다.
        </p>
      </header>

      {/* macOS — primary */}
      <section className="mt-10">
        <div className="surface relative overflow-hidden rounded-2xl border border-amber-500/25 bg-base-200 p-7">
          <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-amber-500/15 blur-3xl" />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <AppleIcon />
                <h2 className="text-lg font-semibold">macOS</h2>
                <span className="badge badge-sm border-amber-500/30 bg-amber-500/10 text-amber-200">
                  추천
                </span>
              </div>
              <p className="mt-2 text-sm text-neutral-400">
                Intel · Apple Silicon (Rosetta) · macOS 11 이상
              </p>
              <p className="mt-1 text-xs text-neutral-600">
                .dmg · 약 {MAC_X64_SIZE_MB} MB · 노타리제이션 완료
              </p>
            </div>
            <a
              href={MAC_X64_URL}
              className="btn btn-primary btn-lg whitespace-nowrap"
              download
            >
              .dmg 다운로드
              <DownloadIcon />
            </a>
          </div>
        </div>
      </section>

      {/* Windows / Linux — soon */}
      <section className="mt-4 grid gap-3 sm:grid-cols-2">
        <SoonCard
          icon={<WindowsIcon />}
          title="Windows"
          body=".exe 빌드 준비 중"
        />
        <SoonCard
          icon={<LinuxIcon />}
          title="Linux"
          body="AppImage 준비 중"
        />
      </section>

      {/* 설치 가이드 */}
      <section className="mt-12">
        <h2 className="text-base font-semibold">설치 후 3단계</h2>
        <ol className="mt-4 space-y-3">
          <Step
            n="01"
            title=".dmg 열고 앱을 Applications 폴더로 드래그"
            body="더블클릭하면 좌측에 앱, 우측에 Applications 폴더가 나옵니다. 끌어다 놓으면 끝."
          />
          <Step
            n="02"
            title="앱 실행 → GitHub 로그인"
            body="처음 실행 시 시스템이 잠깐 검사하고 바로 열립니다. GitHub OAuth 한 번이면 끝."
          />
          <Step
            n="03"
            title="평소처럼 Claude 사용"
            body="앱은 풀스크린 터미널이라 평소와 같습니다. Claude busy 시간에만 광고가 덮이고, 그만큼 잔액이 쌓입니다."
          />
        </ol>
      </section>

      {/* 다음 액션 */}
      <section className="mt-12 flex flex-wrap items-center justify-center gap-3 text-center">
        <Link href="/dashboard" className="btn btn-ghost border-white/10">
          대시보드 열기
        </Link>
        <Link href="/" className="link link-hover text-sm text-neutral-500">
          ← 메인으로
        </Link>
      </section>

      <p className="mt-12 text-center text-[11px] text-neutral-600">
        문제가 있으면 GitHub 로그인 후 대시보드 하단의 문의 채널로 알려주세요.
      </p>
    </main>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <li className="surface flex gap-4 rounded-xl border border-white/[0.06] bg-base-200/60 p-4">
      <span className="mt-0.5 font-mono text-xs font-semibold tracking-widest text-amber-400/70">
        {n}
      </span>
      <div className="space-y-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs leading-relaxed text-neutral-500">{body}</p>
      </div>
    </li>
  );
}

function SoonCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="surface flex items-center justify-between rounded-xl border border-white/[0.06] bg-base-200/40 p-4 opacity-70">
      <div className="flex items-center gap-3">
        <span className="text-neutral-500">{icon}</span>
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-neutral-600">{body}</p>
        </div>
      </div>
      <span className="badge badge-sm border-white/10 bg-white/[0.04] text-neutral-500">
        준비 중
      </span>
    </div>
  );
}

function DownloadIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 text-neutral-300" fill="currentColor">
      <path d="M17.05 12.04c-.03-2.94 2.4-4.36 2.51-4.43-1.37-2-3.5-2.28-4.26-2.31-1.81-.18-3.54 1.07-4.46 1.07-.94 0-2.34-1.05-3.85-1.02-1.98.03-3.81 1.15-4.83 2.92-2.06 3.57-.53 8.85 1.48 11.74.98 1.42 2.15 3.01 3.68 2.95 1.48-.06 2.04-.96 3.83-.96 1.78 0 2.29.96 3.85.93 1.59-.03 2.6-1.44 3.57-2.87 1.13-1.65 1.59-3.25 1.62-3.33-.04-.02-3.11-1.19-3.14-4.69zM14.05 3.78c.81-.99 1.36-2.36 1.21-3.74-1.17.05-2.59.78-3.43 1.77-.75.87-1.4 2.28-1.23 3.62 1.31.1 2.65-.66 3.45-1.65z" />
    </svg>
  );
}

function WindowsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
      <path d="M3 5.5L11 4v8H3zM3 13h8v7l-8-1.5zM12 4l9-1.5V12h-9zM12 13h9v8.5L12 20z" />
    </svg>
  );
}

function LinuxIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
      <path d="M12 2c-2.2 0-4 1.8-4 4 0 .3.1.6.1.9-1.2.8-2.1 2-2.1 3.6 0 1.1.5 2.1 1.3 2.8-.6 1-1.3 2.4-1.3 4.2 0 2.5 1.5 4.5 3 4.5h6c1.5 0 3-2 3-4.5 0-1.8-.7-3.2-1.3-4.2.8-.7 1.3-1.7 1.3-2.8 0-1.6-.9-2.8-2.1-3.6 0-.3.1-.6.1-.9 0-2.2-1.8-4-4-4zm-1.5 4.5c.3 0 .5.2.5.5s-.2.5-.5.5-.5-.2-.5-.5.2-.5.5-.5zm3 0c.3 0 .5.2.5.5s-.2.5-.5.5-.5-.2-.5-.5.2-.5.5-.5z" />
    </svg>
  );
}
