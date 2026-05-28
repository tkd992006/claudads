import Link from "next/link";

const STEPS = [
  {
    n: "01",
    title: "Claude 와 같은 shift 로 출근",
    body: "GitHub 로 로그인하고 데스크탑 앱을 켭니다. 평소엔 풀스크린 터미널, 그대로입니다.",
  },
  {
    n: "02",
    title: "Claude 에게 야간근무를 시킨다",
    body: "코드를 짜라고 시키세요. Claude 가 busy 인 순간에만 짧은 광고가 터미널 위로 덮입니다.",
  },
  {
    n: "03",
    title: "야근비는 자동으로",
    body: "광고 노출마다 토큰이 적립됩니다. 잔고가 차면 대시보드에서 바로 출금하세요.",
  },
];

const PROMISES = [
  {
    title: "작업 흐름은 끊지 않는다",
    body: "Claude 가 입력 받을 차례 (idle) 가 되면 광고는 즉시 사라집니다. 키 입력을 가로막지 않습니다.",
  },
  {
    title: "키 입력은 수집하지 않는다",
    body: "광고 노출과 CTA 클릭 외엔 기록 0. 코드도, 프롬프트도, 파일명도 보내지 않습니다.",
  },
  {
    title: "100% 개발자 청중",
    body: "모든 시청자가 Claude Code 사용자. 일반 광고망과 다른, 좁고 정확한 인벤토리.",
  },
];

export default function Landing() {
  return (
    <main className="mx-auto max-w-5xl px-6 pb-24">
      {/* Hero */}
      <section className="flex animate-fade-up flex-col items-center pb-14 pt-20 text-center">
        <span className="badge badge-lg gap-2 border-amber-500/25 bg-amber-500/10 text-amber-300">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
          Claude Code × Night Shift
        </span>
        <h1 className="mt-6 max-w-3xl text-balance text-4xl font-semibold leading-[1.12] sm:text-6xl">
          클로드 코드에게
          <br />
          <span className="bg-gradient-to-r from-amber-200 via-amber-300 to-orange-300 bg-clip-text text-transparent">
            야간근무
          </span>
          를 시키세요.
        </h1>
        <p className="mt-5 max-w-xl text-balance text-neutral-400 sm:text-lg">
          Claude 가 busy 인 동안 터미널 위로 짧은 광고가 흐르고, 흘러간 시간이
          야근비로 적립됩니다.
        </p>
        <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.32em] text-amber-400/70">
          put claude on the night shift · get paid while it codes
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link href="/download" className="btn btn-primary">
            데스크탑 앱 받기
            <ArrowRight />
          </Link>
          <Link href="/advertiser" className="btn btn-ghost border-white/10">
            광고주로 시작
          </Link>
        </div>
        <p className="mt-4 text-xs text-neutral-600">
          macOS 지원 · Windows · Linux 곧 · GitHub 로그인 한 번
        </p>
      </section>

      {/* Terminal mock */}
      <section className="grid animate-fade-up gap-4 sm:grid-cols-2">
        <TerminalCard />
        <BusyTerminalCard />
      </section>
      <p className="mt-3 text-center text-xs text-neutral-600">
        평소엔 풀스크린 터미널 · Claude 가 야간근무 중일 때만 광고가 덮습니다
      </p>

      {/* How it works */}
      <section className="mt-24">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-semibold sm:text-3xl">
            출근부터 정산까지, 세 단계
          </h2>
          <p className="mt-2 text-sm text-neutral-500">
            처음 켜는 순간부터 야근비가 쌓이기 시작합니다
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {STEPS.map((s) => (
            <div
              key={s.title}
              className="card surface border border-white/[0.08] bg-base-200"
            >
              <div className="card-body gap-3 p-5">
                <span className="font-mono text-xs font-semibold tracking-widest text-amber-400/70">
                  {s.n}
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

      {/* Promises */}
      <section className="mt-20">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-semibold sm:text-3xl">세 가지 약속</h2>
          <p className="mt-2 text-sm text-neutral-500">
            야근시키는 건 Claude, 보호받는 건 당신
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {PROMISES.map((p) => (
            <div
              key={p.title}
              className="card surface border border-white/[0.08] bg-base-200/60"
            >
              <div className="card-body gap-2 p-5">
                <span className="text-amber-400">
                  <CheckIcon />
                </span>
                <h3 className="text-base font-semibold">{p.title}</h3>
                <p className="text-sm leading-relaxed text-neutral-400">
                  {p.body}
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
          body="앱을 켜두고 평소처럼 Claude 를 시키세요. Claude busy 시간이 그대로 야근비가 됩니다."
          href="/dashboard"
          cta="대시보드 열기"
        />
        <RoleCard
          icon={<MegaphoneIcon />}
          title="광고주"
          body="개발자의 night shift 를 통째로 삽니다. 영상 한 편, 예산, CPM 만 설정하면 끝."
          href="/advertiser"
          cta="광고주 콘솔 열기"
        />
      </section>

      {/* Final CTA */}
      <section className="mt-24 overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/[0.08] via-orange-500/[0.04] to-transparent p-10 text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-amber-400/70">
          03:14 AM · claude busy · ₩+240
        </p>
        <h2 className="mt-4 text-balance text-2xl font-semibold sm:text-3xl">
          야근비는 ClaudeShift 가 챙겨드립니다.
        </h2>
        <p className="mt-3 text-sm text-neutral-400">
          어차피 깨어 있던 시간. 처음으로 잔고가 같이 깨어 있는 앱.
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Link href="/download" className="btn btn-primary">
            지금 출근하기
            <ArrowRight />
          </Link>
          <Link
            href="/advertiser"
            className="btn btn-ghost border-amber-500/20 text-amber-200/90"
          >
            광고주로 시작
          </Link>
        </div>
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
    <div className="card surface border border-white/[0.08] bg-base-200 transition-colors hover:border-amber-500/30">
      <div className="card-body gap-3 p-6">
        <div className="grid h-11 w-11 place-items-center rounded-lg bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/25">
          {icon}
        </div>
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-sm leading-relaxed text-neutral-400">{body}</p>
        <Link
          href={href}
          className="link link-hover mt-1 inline-flex w-fit items-center gap-1 text-sm font-medium text-amber-300"
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
    <div className="surface overflow-hidden rounded-xl border border-white/[0.08] bg-[#0b0a08]">
      <WindowBar label="claude — idle · 11:48 PM" />
      <div className="space-y-2 p-5 font-mono text-[13px] leading-relaxed">
        <p className="text-neutral-500">
          $ claude{" "}
          <span className="text-neutral-300">&quot;리팩토링 해줘&quot;</span>
        </p>
        <p className="text-neutral-500">› 분석 중...</p>
        <p className="text-amber-300/90">› 적용 완료</p>
        <p className="text-neutral-300">
          ${" "}
          <span className="inline-block h-3.5 w-2 translate-y-[3px] animate-pulse bg-amber-300/80" />
        </p>
        <p className="pt-4 text-neutral-400">
          잔액 <span className="font-semibold text-amber-200">₩12,340</span>
        </p>
      </div>
    </div>
  );
}

function BusyTerminalCard() {
  return (
    <div className="overflow-hidden rounded-xl border border-amber-500/30 bg-[#0b0a08] shadow-[0_24px_60px_-30px_rgba(245,158,11,0.55)]">
      <WindowBar label="claude — night shift · 03:14 AM" accent />
      <div className="relative p-5">
        <div className="select-none space-y-2 font-mono text-[13px] leading-relaxed opacity-[0.18] blur-[1.5px]">
          <p>$ claude &quot;리팩토링 해줘&quot;</p>
          <p>› 분석 중...</p>
          <p>› 파일 12개 수정 중</p>
          <p>$ _</p>
          <p>잔액 ₩12,580</p>
        </div>
        <div className="absolute inset-4 flex flex-col items-center justify-center gap-2.5 rounded-lg border border-amber-500/30 bg-gradient-to-br from-amber-500/[0.16] via-orange-500/[0.08] to-transparent">
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber-300/80">
            ad · 0:14 / 0:30
          </span>
          <span className="text-sm text-neutral-200">
            광고가 터미널 위에 오버레이
          </span>
          <span className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-amber-400/15 px-3 py-1 text-[11px] font-medium text-amber-200 ring-1 ring-amber-400/30">
            +₩240 적립 중
          </span>
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
          ? "border-amber-500/15 bg-amber-500/[0.07]"
          : "border-white/[0.06] bg-white/[0.02]"
      }`}
    >
      <span className="flex gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[#f0506b]/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#f5b50a]/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
      </span>
      <span
        className={`ml-1.5 font-mono text-xs ${
          accent ? "text-amber-300/90" : "text-neutral-500"
        }`}
      >
        {label}
      </span>
      {accent && (
        <span className="badge badge-xs ml-auto gap-1 border-0 bg-amber-500/20 text-amber-100">
          <span className="h-1 w-1 animate-pulse rounded-full bg-amber-300" />
          on shift
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

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
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
