import Link from "next/link";

const STEPS = [
  {
    title: "데스크탑 앱 설치",
    body: "GitHub 로 로그인하고 터미널 래퍼 앱을 실행합니다. 평소엔 풀스크린 터미널 그대로입니다.",
  },
  {
    title: "그냥 코드를 짠다",
    body: "Claude 가 busy 일 때만 터미널 위에 짧은 광고가 흐릅니다. idle 로 돌아오면 사라집니다.",
  },
  {
    title: "잔고가 쌓인다",
    body: "광고 노출마다 토큰이 적립되고, 대시보드에서 원할 때 출금을 신청합니다.",
  },
];

export default function Landing() {
  return (
    <main className="mx-auto max-w-5xl px-6 pb-24">
      {/* Hero */}
      <section className="flex animate-fade-up flex-col items-center pb-14 pt-20 text-center">
        <span className="badge badge-lg gap-2 border-emerald-500/20 bg-emerald-500/10 text-emerald-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Claude Code 터미널 래퍼
        </span>
        <h1 className="mt-6 max-w-3xl text-balance text-4xl font-semibold leading-[1.12] sm:text-6xl">
          터미널이 일하는 시간,
          <br />
          <span className="bg-gradient-to-r from-emerald-300 via-emerald-400 to-cyan-300 bg-clip-text text-transparent">
            가만 두지 마세요.
          </span>
        </h1>
        <p className="mt-5 max-w-xl text-balance text-neutral-400 sm:text-lg">
          Claude 가 코드를 짜는 동안 짧은 광고 한 편이 흐르고, 작업이 끝날
          즈음엔 잔고가 자라 있습니다.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/dashboard" className="btn btn-primary">
            대시보드 시작하기
            <ArrowRight />
          </Link>
          <Link href="/advertiser" className="btn btn-ghost border-white/10">
            광고주로 시작
          </Link>
        </div>
      </section>

      {/* Terminal mock */}
      <section className="grid animate-fade-up gap-4 sm:grid-cols-2">
        <TerminalCard />
        <BusyTerminalCard />
      </section>
      <p className="mt-3 text-center text-xs text-neutral-600">
        평소엔 풀스크린 터미널, Claude 가 일할 때만 광고가 덮습니다.
      </p>

      {/* How it works */}
      <section className="mt-24">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-semibold sm:text-3xl">어떻게 작동하나</h2>
          <p className="mt-2 text-sm text-neutral-500">
            설치부터 정산까지 세 단계
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {STEPS.map((s, i) => (
            <div
              key={s.title}
              className="card surface border border-white/[0.08] bg-base-200"
            >
              <div className="card-body gap-3 p-5">
                <span className="font-mono text-xs font-semibold tracking-widest text-emerald-400/70">
                  0{i + 1}
                </span>
                <h3 className="text-base font-semibold">{s.title}</h3>
                <p className="text-sm leading-relaxed text-neutral-400">
                  {s.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Roles */}
      <section className="mt-20 grid gap-4 md:grid-cols-2">
        <RoleCard
          icon={<TerminalIcon />}
          title="시청자 (개발자)"
          body="데스크탑 앱을 받고 GitHub 로 로그인하세요. Claude busy 시간에 광고가 흐르고 잔고가 쌓입니다."
          href="/dashboard"
          cta="대시보드 열기"
        />
        <RoleCard
          icon={<MegaphoneIcon />}
          title="광고주"
          body="영상 한 편, 예산, CPM 만 설정하면 끝. 청중이 100% 개발자인 광고 인벤토리."
          href="/advertiser"
          cta="광고주 콘솔 열기"
        />
      </section>
    </main>
  );
}

function RoleCard({
  icon,
  title,
  body,
  href,
  cta,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="card surface border border-white/[0.08] bg-base-200 transition-colors hover:border-emerald-500/30">
      <div className="card-body gap-3 p-6">
        <div className="grid h-11 w-11 place-items-center rounded-lg bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20">
          {icon}
        </div>
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-sm leading-relaxed text-neutral-400">{body}</p>
        <Link
          href={href}
          className="link link-hover mt-1 inline-flex w-fit items-center gap-1 text-sm font-medium text-emerald-400"
        >
          {cta}
          <ArrowRight />
        </Link>
      </div>
    </div>
  );
}

function TerminalCard() {
  return (
    <div className="surface overflow-hidden rounded-xl border border-white/[0.08] bg-[#0b0b0d]">
      <WindowBar label="claude — idle" />
      <div className="space-y-2 p-5 font-mono text-[13px] leading-relaxed">
        <p className="text-neutral-500">
          $ claude <span className="text-neutral-300">&quot;리팩토링 해줘&quot;</span>
        </p>
        <p className="text-neutral-500">› 분석 중...</p>
        <p className="text-emerald-400/90">› 적용 완료</p>
        <p className="text-neutral-300">
          ${" "}
          <span className="inline-block h-3.5 w-2 translate-y-[3px] animate-pulse bg-emerald-400/80" />
        </p>
        <p className="pt-4 text-neutral-400">
          잔액 <span className="font-semibold text-emerald-300">₩12,340</span>
        </p>
      </div>
    </div>
  );
}

function BusyTerminalCard() {
  return (
    <div className="overflow-hidden rounded-xl border border-emerald-500/25 bg-[#0b0b0d] shadow-[0_24px_60px_-30px_rgba(16,185,129,0.5)]">
      <WindowBar label="claude — busy" accent />
      <div className="relative p-5">
        <div className="select-none space-y-2 font-mono text-[13px] leading-relaxed opacity-[0.18] blur-[1.5px]">
          <p>$ claude &quot;리팩토링 해줘&quot;</p>
          <p>› 분석 중...</p>
          <p>› 파일 12개 수정 중</p>
          <p>$ _</p>
          <p>잔액 ₩12,340</p>
        </div>
        <div className="absolute inset-4 flex flex-col items-center justify-center gap-2.5 rounded-lg border border-emerald-500/25 bg-gradient-to-br from-emerald-500/[0.13] to-cyan-500/[0.05]">
          <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-emerald-400/70">
            광고 영상
          </span>
          <span className="text-sm text-neutral-300">터미널 위에 오버레이</span>
          <span className="btn btn-primary btn-xs mt-1">자세히 보기 →</span>
        </div>
      </div>
    </div>
  );
}

function WindowBar({ label, accent }: { label: string; accent?: boolean }) {
  return (
    <div
      className={`flex items-center gap-2 border-b px-4 py-2.5 ${
        accent
          ? "border-white/[0.06] bg-emerald-500/[0.06]"
          : "border-white/[0.06] bg-white/[0.02]"
      }`}
    >
      <span className="flex gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[#f0506b]/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#f5b50a]/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
      </span>
      <span
        className={`ml-1.5 font-mono text-xs ${
          accent ? "text-emerald-400/80" : "text-neutral-500"
        }`}
      >
        {label}
      </span>
      {accent && (
        <span className="badge badge-xs ml-auto border-0 bg-emerald-500/15 text-emerald-300">
          광고 재생 중
        </span>
      )}
    </div>
  );
}

function ArrowRight() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function TerminalIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="m7 9 3 3-3 3M13 15h4" />
    </svg>
  );
}

function MegaphoneIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 11v2a1 1 0 0 0 1 1h2.5L11 18V6L6.5 10H4a1 1 0 0 0-1 1Z" />
      <path d="M15 8.5a4 4 0 0 1 0 7M11 6l8-3v18l-8-3" />
    </svg>
  );
}
