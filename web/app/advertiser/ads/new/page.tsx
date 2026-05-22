"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PROMPT_INJECTION_UI_ENABLED } from "@/lib/features";

export default function NewAdPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [ctaType, setCtaType] = useState<"LINK" | "PROMPT_INJECTION">("LINK");
  const [ctaPrompt, setCtaPrompt] = useState("");
  const [cpmCents, setCpmCents] = useState(10_000);
  const [budgetCapCents, setBudgetCapCents] = useState(100_000);
  const [dailyCap, setDailyCap] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setBusy(true);
    setErr(null);
    try {
      const durationSec = await videoDuration(file);
      const signed = await fetch("/api/upload/sign", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ contentType: file.type || "video/mp4" }),
      }).then((r) => r.json());
      if (!signed.url) throw new Error("upload sign failed");

      const put = await fetch(signed.url, {
        method: "PUT",
        headers: { "content-type": file.type || "video/mp4" },
        body: file,
      });
      if (!put.ok) throw new Error(`upload failed ${put.status}`);

      const res = await fetch("/api/advertiser/ads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title,
          videoKey: signed.key,
          durationSec: Math.round(durationSec),
          ctaLabel: ctaLabel || undefined,
          ctaUrl: ctaType === "LINK" ? ctaUrl || undefined : undefined,
          ctaType,
          ctaPrompt:
            ctaType === "PROMPT_INJECTION" ? ctaPrompt || undefined : undefined,
          cpmCents,
          budgetCapCents,
          dailyCapImpressions: dailyCap ? Number(dailyCap) : undefined,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "create failed");
      router.push("/advertiser");
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-xl animate-fade-up px-6 py-12">
      <Link
        href="/advertiser"
        className="link link-hover mb-4 inline-flex items-center gap-1 text-sm text-neutral-500"
      >
        ← 광고주 콘솔
      </Link>
      <h1 className="text-2xl font-semibold">새 광고 등록</h1>
      <p className="mt-1 text-sm text-neutral-500">
        등록 후 관리자 검수를 거쳐 노출이 시작됩니다.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-5">
        {/* Creative */}
        <section className="card surface border border-white/[0.08] bg-base-200">
          <div className="card-body gap-4 p-5">
            <SectionTitle>크리에이티브</SectionTitle>
            <Field label="제목">
              <input
                className="input input-bordered w-full"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="광고 제목"
              />
            </Field>
            <Field label="영상 (mp4 / webm — 짧을수록 좋음)">
              <input
                type="file"
                className="file-input file-input-bordered w-full"
                accept="video/mp4,video/webm"
                required
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </Field>
          </div>
        </section>

        {/* Budget */}
        <section className="card surface border border-white/[0.08] bg-base-200">
          <div className="card-body gap-4 p-5">
            <SectionTitle>예산 & 입찰</SectionTitle>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="CPM (원 / 1000노출)">
                <input
                  className="input input-bordered w-full font-mono"
                  type="number"
                  required
                  value={cpmCents}
                  onChange={(e) => setCpmCents(Number(e.target.value))}
                />
              </Field>
              <Field label="예산 캡 (원)">
                <input
                  className="input input-bordered w-full font-mono"
                  type="number"
                  required
                  value={budgetCapCents}
                  onChange={(e) => setBudgetCapCents(Number(e.target.value))}
                />
              </Field>
            </div>
            <Field label="일일 노출 한도 (선택)">
              <input
                className="input input-bordered w-full font-mono"
                type="number"
                placeholder="제한 없음"
                value={dailyCap}
                onChange={(e) => setDailyCap(e.target.value)}
              />
            </Field>
          </div>
        </section>

        {/* CTA */}
        <section className="card surface border border-white/[0.08] bg-base-200">
          <div className="card-body gap-4 p-5">
            <SectionTitle>콜 투 액션</SectionTitle>
            {/* PROMPT_INJECTION 은 방어 장치가 완성되기 전까지 OFF (features.ts).
                플래그가 꺼져 있으면 타입 선택 자체를 숨기고 LINK 로 고정한다. */}
            {PROMPT_INJECTION_UI_ENABLED && (
              <Field label="CTA 타입">
                <select
                  className="select select-bordered w-full"
                  value={ctaType}
                  onChange={(e) =>
                    setCtaType(e.target.value as "LINK" | "PROMPT_INJECTION")
                  }
                >
                  <option value="LINK">링크 (외부 URL 열기)</option>
                  <option value="PROMPT_INJECTION">
                    프롬프트 주입 (사용자 입력란에 프리필)
                  </option>
                </select>
              </Field>
            )}
            <Field
              label={`CTA 라벨${ctaType === "LINK" ? " (선택)" : ""}`}
            >
              <input
                className="input input-bordered w-full"
                required={ctaType === "PROMPT_INJECTION"}
                value={ctaLabel}
                onChange={(e) => setCtaLabel(e.target.value)}
                placeholder="예: 자세히 보기"
              />
            </Field>
            {ctaType === "LINK" ? (
              <Field label="CTA URL (선택)">
                <input
                  className="input input-bordered w-full"
                  type="url"
                  value={ctaUrl}
                  onChange={(e) => setCtaUrl(e.target.value)}
                  placeholder="https://"
                />
              </Field>
            ) : (
              <Field label="프롬프트 텍스트 (최대 500자, 입력란에 그대로 채워집니다)">
                <textarea
                  className="textarea textarea-bordered w-full"
                  required
                  rows={3}
                  maxLength={500}
                  value={ctaPrompt}
                  onChange={(e) => setCtaPrompt(e.target.value)}
                />
              </Field>
            )}
          </div>
        </section>

        {err && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">
            {err}
          </div>
        )}
        <button className="btn btn-primary w-full" disabled={busy}>
          {busy && <span className="loading loading-spinner loading-xs" />}
          {busy ? "업로드 중" : "등록 (검수 대기)"}
        </button>
      </form>
    </main>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-emerald-400/70">
      {children}
    </h2>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-neutral-300">{label}</span>
      {children}
    </label>
  );
}

function videoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => resolve(v.duration);
    v.onerror = () => reject(new Error("cannot read duration"));
    v.src = URL.createObjectURL(file);
  });
}
