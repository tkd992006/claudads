import Link from "next/link";

const STEPS = [
  {
    n: "01",
    title: "Claude 한테 시켜놓고 자리 비우세요",
    body: "GitHub 로그인하고 데스크탑 앱 켜기. 평소처럼 작업 던지고, 답 나올 동안 커피 뽑으러 가든 다른 PR 보든 마음대로.",
  },
  {
    n: "02",
    title: "안 보는 화면을 광고가 채웁니다",
    body: "Claude 가 코드 짜는 동안 어차피 안 보고 있잖아요. 그 시간 위로만 짧은 광고가 뜨고, 흘러간 만큼 잔고에 박힙니다.",
  },
  {
    n: "03",
    title: "다시 자리에 오면 깨끗하게 사라집니다",
    body: "Claude 가 입력 받을 차례가 되는 순간 광고는 바로 걷힙니다. 잔고만 남고, 작업 흐름은 그대로.",
  },
];

const PROMISES = [
  {
    title: "작업은 1초도 안 끊김",
    body: "Claude 가 idle 로 돌아오면 광고는 즉시 사라집니다. 키 입력을 가로막는 일 없음.",
  },
  {
    title: "코드·프롬프트는 안 봅니다",
    body: "광고 노출이랑 클릭 외엔 서버로 가는 게 없어요. 파일명도, 키 입력도, 화면 캡처도 안 합니다.",
  },
  {
    title: "전부 진짜 개발자",
    body: "Claude Code 켜놓고 일하는 사람들만 봅니다. 일반 광고망이랑 트래픽 질이 다른 인벤토리.",
  },
];

export default function Landing() {
  return (
    <main className="mx-auto max-w-5xl px-6 pb-24">
      {/* Hero */}
      <section className="flex animate-fade-up flex-col items-center pb-14 pt-20 text-center">
        <span className="badge badge-lg gap-2 border-amber-500/25 bg-amber-500/10 text-amber-300">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
          Claude Code · 광고로 무료
        </span>
        <h1 className="mt-6 max-w-3xl text-balance text-4xl font-semibold leading-[1.12] sm:text-6xl">
          광고 보면서
          <br />
          Claude Code,
          <br />
          <span className="bg-gradient-to-r from-amber-200 via-amber-300 to-orange-300 bg-clip-text text-transparent">
            공짜로 쓰세요.
          </span>
        </h1>
        <p className="mt-5 max-w-xl text-balance text-neutral-400 sm:text-lg">
          Claude 가 답 만드는 동안 어차피 화면 안 보잖아요. 그 시간 위로만 짧게
          광고 뜨고, 한 달 모이면 구독료 정도는 가뿐히 덮입니다.
        </p>
        <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.32em] text-amber-400/70">
          ad-supported claude code
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
        보고 있을 땐 평소 터미널 · 자리 비우면 그 위로 광고
      </p>

      {/* How it works */}
      <section className="mt-24">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-semibold sm:text-3xl">
            구독료를 매달 광고가 대신 냅니다
          </h2>
          <p className="mt-2 text-sm text-neutral-500">
            하던 대로 Claude 만 돌리면, 안 보는 시간이 그대로 구독료로 회수됩니다
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
            돈은 받되, 흐름이랑 프라이버시는 안 건드립니다
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
          title="개발자"
          body="앱 켜두고 평소대로 Claude 돌리세요. 자리 비우는 시간이 그대로 잔고가 됩니다."
          href="/dashboard"
          cta="대시보드 열기"
        />
        <RoleCard
          icon={<MegaphoneIcon />}
          title="광고주"
          body="개발자가 가장 집중해서 다음 답을 기다리는 그 순간. 일반 디스플레이로는 못 사는 인벤토리를 통째로 살 수 있어요."
          href="/advertiser"
          cta="광고주 콘솔 열기"
        />
      </section>

      {/* Final CTA */}
      <section className="mt-24 overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/[0.08] via-orange-500/[0.04] to-transparent p-10 text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-amber-400/70">
          이번 달 구독료 · ₩-26,400 → ₩0
        </p>
        <h2 className="mt-4 text-balance text-2xl font-semibold sm:text-3xl">
          Claude Code, 다음 결제부터 공짜로 써보세요.
        </h2>
        <p className="mt-3 text-sm text-neutral-400">
          어차피 안 보던 시간만 광고가 메우고, 한 달 합치면 구독료가 사라집니다.
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Link href="/download" className="btn btn-primary">
            지금 시작하기
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
      <WindowBar label="claude — 보는 중 · idle" />
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
      <WindowBar label="claude — afk · 생성 중" accent />
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
            안 보는 화면 위로 광고
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
          afk
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
