import React, { useEffect, useRef, useState } from "react";

type Cta =
  | { type: "LINK"; label: string; url: string }
  | { type: "PROMPT_INJECTION"; label: string; prompt: string };

type Ad = {
  impressionId: string;
  ad: {
    id: string;
    title: string;
    videoUrl: string;
    durationSec: number;
    cta: Cta | null;
  };
};

const DEVICE_ID_KEY = "claudead.deviceId";
function deviceId() {
  let v = localStorage.getItem(DEVICE_ID_KEY);
  if (!v) {
    v = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, v);
  }
  return v;
}

export default function AdOverlay({
  busy,
  onClose,
}: {
  busy: boolean;
  onClose: () => void;
}) {
  const [ad, setAd] = useState<Ad | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [progress, setProgress] = useState(0); // 0~1
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const completedRef = useRef(false);
  const maxTimeRef = useRef(0); // 정직하게 재생된 가장 먼 지점 (초)

  useEffect(() => {
    (async () => {
      const r = await window.api.fetchAd(deviceId());
      if (r.error) {
        setErr(r.error);
        setDone(true);
        return;
      }
      if (!r.ad) {
        setErr("표시할 광고가 없습니다.");
        setDone(true);
        return;
      }
      setAd(r);
      setRemaining(r.ad.durationSec);
    })();
  }, []);

  // 작업이 끝나거나 Claude 가 입력을 기다리면(busy=false) 광고를 닫는다.
  // 끝까지 안 봤어도 impression 을 finalize 하면 서버가 본 구간만큼 비례
  // 적립한다. 영상이 이미 끝났거나(completedRef) 아직 못 불러왔으면 그냥 닫는다.
  useEffect(() => {
    if (busy) return;
    if (ad && !completedRef.current) {
      completedRef.current = true;
      void window.api
        .completeAd(ad.impressionId, maxTimeRef.current)
        .finally(onClose);
    } else {
      onClose();
    }
  }, [busy, ad]);

  function onTimeUpdate(e: React.SyntheticEvent<HTMLVideoElement>) {
    const v = e.currentTarget;
    if (v.currentTime > maxTimeRef.current) maxTimeRef.current = v.currentTime;
    if (v.duration > 0) {
      setRemaining(Math.max(0, Math.ceil(v.duration - v.currentTime)));
      setProgress(Math.min(1, v.currentTime / v.duration));
    }
  }

  // 앞으로 스킵 시도하면 그동안 정직하게 본 지점으로 되돌림.
  function onSeeking(e: React.SyntheticEvent<HTMLVideoElement>) {
    const v = e.currentTarget;
    if (v.currentTime > maxTimeRef.current + 0.5) {
      v.currentTime = maxTimeRef.current;
    }
  }

  // pause 시도하면 즉시 재개. (controls 가 없으면 UI 로는 불가능하지만 키보드/JS 방어용)
  function onPause(e: React.SyntheticEvent<HTMLVideoElement>) {
    if (completedRef.current) return;
    const v = e.currentTarget;
    if (!v.ended) void v.play().catch(() => {});
  }

  async function onEnded() {
    if (!ad || completedRef.current) return;
    completedRef.current = true;
    await window.api.completeAd(ad.impressionId, maxTimeRef.current);
    setDone(true);
  }

  async function onCta() {
    const cta = ad?.ad.cta;
    if (!cta) return;
    if (cta.type === "PROMPT_INJECTION") {
      await window.api.prefillPrompt(ad!.impressionId, cta.prompt);
      onClose();
    } else {
      await window.api.clickCta(ad!.impressionId, cta.url);
    }
  }

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(8, 10, 14, 0.62)",
        backdropFilter: "blur(8px) saturate(120%)",
        WebkitBackdropFilter: "blur(8px) saturate(120%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10,
        animation: "claudead-fade 180ms ease-out",
      }}
    >
      <style>{`
        @keyframes claudead-fade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes claudead-pop {
          from { opacity: 0; transform: translateY(6px) scale(0.985); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .claudead-cta {
          background: linear-gradient(180deg, #34d399 0%, #10b981 100%);
          color: #04130d;
          font-weight: 600;
          border: 0;
          border-radius: 10px;
          padding: 10px 18px;
          font-size: 14px;
          cursor: pointer;
          box-shadow:
            0 1px 0 rgba(255, 255, 255, 0.25) inset,
            0 8px 22px -8px rgba(16, 185, 129, 0.55);
          transition: transform 120ms ease, box-shadow 120ms ease, filter 120ms ease;
        }
        .claudead-cta:hover {
          transform: translateY(-1px);
          filter: brightness(1.05);
          box-shadow:
            0 1px 0 rgba(255, 255, 255, 0.3) inset,
            0 12px 28px -8px rgba(16, 185, 129, 0.7);
        }
        .claudead-cta:active { transform: translateY(0); filter: brightness(0.97); }

        .claudead-close {
          background: rgba(255, 255, 255, 0.04);
          color: #e5e7eb;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 10px;
          padding: 8px 16px;
          font-size: 13px;
          cursor: pointer;
          transition: background 120ms ease, border-color 120ms ease;
        }
        .claudead-close:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.22);
        }
      `}</style>

      <div
        style={{
          maxWidth: "min(880px, 86vw)",
          width: "auto",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 14,
          animation: "claudead-pop 220ms cubic-bezier(.2,.7,.2,1)",
        }}
      >
        {ad ? (
          <>
            <div
              onContextMenu={(e) => e.preventDefault()}
              style={{
                position: "relative",
                borderRadius: 14,
                overflow: "hidden",
                background: "#000",
                userSelect: "none",
                boxShadow:
                  "0 1px 0 rgba(255,255,255,0.06) inset, 0 30px 60px -20px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.06)",
              }}
            >
              <video
                ref={videoRef}
                src={ad.ad.videoUrl}
                autoPlay
                muted
                playsInline
                disablePictureInPicture
                disableRemotePlayback
                controlsList="nodownload nofullscreen noremoteplayback noplaybackrate"
                onContextMenu={(e) => e.preventDefault()}
                onTimeUpdate={onTimeUpdate}
                onSeeking={onSeeking}
                onPause={onPause}
                onEnded={onEnded}
                style={{
                  display: "block",
                  maxWidth: "min(880px, 86vw)",
                  maxHeight: "62vh",
                  width: "auto",
                  height: "auto",
                  objectFit: "contain",
                  background: "#000",
                  pointerEvents: "none",
                }}
              />

              <div
                style={{
                  position: "absolute",
                  top: 10,
                  left: 12,
                  padding: "3px 8px",
                  borderRadius: 999,
                  background: "rgba(0,0,0,0.55)",
                  color: "rgba(255,255,255,0.78)",
                  fontSize: 10.5,
                  letterSpacing: 0.6,
                  textTransform: "uppercase",
                  fontWeight: 600,
                  backdropFilter: "blur(4px)",
                }}
              >
                Ad
              </div>

              {remaining != null && !done && (
                <div
                  style={{
                    position: "absolute",
                    top: 10,
                    right: 12,
                    padding: "3px 10px",
                    borderRadius: 999,
                    background: "rgba(0,0,0,0.55)",
                    color: "rgba(255,255,255,0.88)",
                    fontSize: 11.5,
                    fontVariantNumeric: "tabular-nums",
                    fontWeight: 600,
                    backdropFilter: "blur(4px)",
                  }}
                >
                  {remaining}s
                </div>
              )}

              <div
                aria-hidden
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  bottom: 0,
                  height: 2,
                  background: "rgba(255,255,255,0.08)",
                }}
              >
                <div
                  style={{
                    width: `${progress * 100}%`,
                    height: "100%",
                    background:
                      "linear-gradient(90deg, #34d399 0%, #10b981 100%)",
                    transition: "width 120ms linear",
                  }}
                />
              </div>
            </div>

            <div
              style={{
                color: "rgba(229, 231, 235, 0.9)",
                fontSize: 14,
                fontWeight: 500,
                textAlign: "center",
                maxWidth: 600,
                lineHeight: 1.4,
              }}
            >
              {ad.ad.title}
            </div>

            <div
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
                marginTop: 2,
              }}
            >
              {ad.ad.cta && (
                <button className="claudead-cta" onClick={onCta}>
                  {ad.ad.cta.label}
                  <span style={{ marginLeft: 6, opacity: 0.85 }}>
                    {ad.ad.cta.type === "PROMPT_INJECTION" ? "💬" : "→"}
                  </span>
                </button>
              )}
              {done && (
                <button className="claudead-close" onClick={onClose}>
                  닫기
                </button>
              )}
            </div>
          </>
        ) : (
          <div
            style={{
              color: "rgba(229, 231, 235, 0.75)",
              fontSize: 13,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
              padding: "28px 32px",
            }}
          >
            <div
              style={{
                width: 22,
                height: 22,
                border: "2px solid rgba(255,255,255,0.15)",
                borderTopColor: "rgba(255,255,255,0.7)",
                borderRadius: "50%",
                animation: "claudead-spin 700ms linear infinite",
              }}
            />
            <style>{`@keyframes claudead-spin { to { transform: rotate(360deg); } }`}</style>
            <span>{err ?? "광고 불러오는 중..."}</span>
            {done && (
              <button className="claudead-close" onClick={onClose}>
                닫기
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
