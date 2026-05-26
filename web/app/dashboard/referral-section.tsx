"use client";

/**
 * 추천 섹션 클라이언트 부분 — 링크 복사 + 매뉴얼 입력 폼.
 * 서버 데이터(나의 login, 추천인 정보, 통계, 만료 시각)는 props 로 받는다.
 */
import { useState, useTransition } from "react";

interface Props {
  myLogin: string;
  inviter: { login: string } | null;
  // 활성 상태일 때 남은 시간(ms). 만료/관계 없음이면 null.
  remainingMs: number | null;
  inviteesCount: number;
  commissionMicro: string; // BigInt → string 으로 직렬화해서 받는다
  // "/?ref=..." prefix 가 붙은 origin (서버에서 헤더로 계산해 넘김)
  origin: string;
}

export default function ReferralSection({
  myLogin,
  inviter,
  remainingMs,
  inviteesCount,
  commissionMicro,
  origin,
}: Props) {
  const link = `${origin}/?ref=${myLogin}`;
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // 브라우저가 clipboard 권한을 거부했을 때 — 입력란에서 직접 복사 유도.
    }
  };

  return (
    <section className="card surface border border-white/[0.08] bg-base-200">
      <div className="card-body gap-4 p-5">
        <div className="flex items-baseline justify-between">
          <h2 className="font-semibold">레퍼럴</h2>
          <span className="text-xs text-neutral-500">
            양방향 5% · 60일 이벤트
          </span>
        </div>

        {/* 내 추천 링크 */}
        <div>
          <p className="mb-1.5 text-xs text-neutral-500">내 추천 링크</p>
          <div className="flex gap-2">
            <input
              readOnly
              value={link}
              onFocus={(e) => e.currentTarget.select()}
              className="input input-bordered input-sm flex-1 font-mono text-xs"
            />
            <button
              type="button"
              onClick={onCopy}
              className="btn btn-sm btn-primary"
            >
              {copied ? "복사됨" : "복사"}
            </button>
          </div>
        </div>

        {/* 통계 */}
        <div className="grid grid-cols-3 gap-2">
          <Stat label="초대한 사람" value={inviteesCount.toString()} />
          <Stat label="누적 커미션 µ" value={commissionMicro} mono />
          <Stat
            label="내 추천인"
            value={inviter ? `@${inviter.login}` : "없음"}
          />
        </div>

        {/* 추천 관계 상태 */}
        {inviter && remainingMs != null && remainingMs > 0 && (
          <p className="text-xs text-emerald-400/80">
            추천 보너스 활성 — {Math.ceil(remainingMs / (24 * 60 * 60 * 1000))}
            일 남음
          </p>
        )}
        {inviter && (remainingMs == null || remainingMs <= 0) && (
          <p className="text-xs text-neutral-500">추천 보너스 기간이 끝났습니다.</p>
        )}

        {/* 추천인 매뉴얼 입력 (아직 없을 때만) */}
        {!inviter && <ManualInviterForm />}
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-base-100/40 p-3">
      <p className="text-[10px] uppercase tracking-wider text-neutral-500">
        {label}
      </p>
      <p
        className={`mt-1 text-sm ${mono ? "font-mono" : "font-medium"} truncate`}
      >
        {value}
      </p>
    </div>
  );
}

function ManualInviterForm() {
  const [login, setLogin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const value = login.trim();
    if (!value) return;
    startTransition(async () => {
      const res = await fetch("/api/referral", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ inviterLogin: value }),
      });
      if (res.ok) {
        // 보너스·커미션 표시를 위해 페이지 리로드 (서버 컴포넌트 재실행).
        window.location.reload();
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(
        data.error === "not_found"
          ? "해당 GitHub login 을 찾을 수 없습니다."
          : data.error === "self"
            ? "본인을 추천인으로 지정할 수 없습니다."
            : data.error === "already"
              ? "이미 추천인이 등록돼 있습니다."
              : data.error === "invalid_login"
                ? "올바른 GitHub login 이 아닙니다."
                : "요청 실패",
      );
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <p className="text-xs text-neutral-500">
        추천인이 있다면 GitHub login 을 입력하세요. (한 번만 가능)
      </p>
      <div className="flex gap-2">
        <input
          value={login}
          onChange={(e) => setLogin(e.target.value)}
          placeholder="octocat"
          className="input input-bordered input-sm flex-1 font-mono"
          disabled={isPending}
        />
        <button
          type="submit"
          className="btn btn-sm"
          disabled={isPending || !login.trim()}
        >
          {isPending ? "..." : "등록"}
        </button>
      </div>
      {error && <p className="text-xs text-rose-400">{error}</p>}
    </form>
  );
}
