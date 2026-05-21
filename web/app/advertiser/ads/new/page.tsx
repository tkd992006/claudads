"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
          ctaUrl: ctaType === "LINK" ? (ctaUrl || undefined) : undefined,
          ctaType,
          ctaPrompt: ctaType === "PROMPT_INJECTION" ? (ctaPrompt || undefined) : undefined,
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
    <main className="max-w-xl mx-auto p-8 space-y-4">
      <h1 className="text-xl font-semibold">새 광고 등록</h1>
      <form onSubmit={submit} className="space-y-3">
        <label className="block">
          <div className="text-sm mb-1">제목</div>
          <input className="w-full" required value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>

        <label className="block">
          <div className="text-sm mb-1">영상 (mp4/webm, 짧을수록 좋음)</div>
          <input
            type="file"
            accept="video/mp4,video/webm"
            required
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <div className="text-sm mb-1">CPM (원/1000노출)</div>
            <input
              className="w-full"
              type="number"
              required
              value={cpmCents}
              onChange={(e) => setCpmCents(Number(e.target.value))}
            />
          </label>
          <label className="block">
            <div className="text-sm mb-1">예산 캡 (원)</div>
            <input
              className="w-full"
              type="number"
              required
              value={budgetCapCents}
              onChange={(e) => setBudgetCapCents(Number(e.target.value))}
            />
          </label>
        </div>

        <label className="block">
          <div className="text-sm mb-1">일일 노출 한도 (선택)</div>
          <input
            className="w-full"
            type="number"
            value={dailyCap}
            onChange={(e) => setDailyCap(e.target.value)}
          />
        </label>

        <label className="block">
          <div className="text-sm mb-1">CTA 타입</div>
          <select
            className="w-full"
            value={ctaType}
            onChange={(e) => setCtaType(e.target.value as "LINK" | "PROMPT_INJECTION")}
          >
            <option value="LINK">링크 (외부 URL 열기)</option>
            <option value="PROMPT_INJECTION">프롬프트 주입 (사용자 입력란에 프리필)</option>
          </select>
        </label>

        <label className="block">
          <div className="text-sm mb-1">CTA 라벨 {ctaType === "LINK" ? "(선택)" : ""}</div>
          <input
            className="w-full"
            required={ctaType === "PROMPT_INJECTION"}
            value={ctaLabel}
            onChange={(e) => setCtaLabel(e.target.value)}
          />
        </label>

        {ctaType === "LINK" ? (
          <label className="block">
            <div className="text-sm mb-1">CTA URL (선택)</div>
            <input
              className="w-full"
              type="url"
              value={ctaUrl}
              onChange={(e) => setCtaUrl(e.target.value)}
            />
          </label>
        ) : (
          <label className="block">
            <div className="text-sm mb-1">
              프롬프트 텍스트 (최대 500자, 사용자 입력란에 그대로 채워집니다)
            </div>
            <textarea
              className="w-full"
              required
              rows={3}
              maxLength={500}
              value={ctaPrompt}
              onChange={(e) => setCtaPrompt(e.target.value)}
            />
          </label>
        )}

        {err && <p className="text-red-400 text-sm">{err}</p>}
        <button className="btn-primary" disabled={busy}>
          {busy ? "업로드 중..." : "등록 (검수 대기)"}
        </button>
      </form>
    </main>
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
