import React, { useEffect, useState } from "react";

export default function Login({ onAuthed }: { onAuthed: () => void }) {
  const [code, setCode] = useState<string | null>(null);
  const [verifyUri, setVerifyUri] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");

  useEffect(() => {
    (async () => {
      const r = await window.api.authStart();
      setCode(r.userCode);
      setVerifyUri(r.verificationUri);
      const deviceCode = r.deviceCode;
      const interval = (r.interval ?? 3) * 1000;
      const timer = setInterval(async () => {
        const p = await window.api.authPoll(deviceCode);
        if (p.status === "ok") {
          clearInterval(timer);
          onAuthed();
        } else if (p.status === "expired" || p.status === "consumed") {
          clearInterval(timer);
          setStatus("코드 만료. 새로고침 해주세요.");
        }
      }, interval);
      return () => clearInterval(timer);
    })();
  }, [onAuthed]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        gap: 20,
      }}
    >
      <h1 style={{ fontSize: 24 }}>로그인이 필요합니다</h1>
      <p style={{ opacity: 0.7 }}>아래 코드를 웹에 입력하세요.</p>
      <code
        style={{
          fontSize: 32,
          letterSpacing: 4,
          padding: "12px 20px",
          background: "#1a1a1a",
          borderRadius: 8,
        }}
      >
        {code ?? "..."}
      </code>
      {verifyUri && (
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            window.api.openExternal(verifyUri);
          }}
          style={{ color: "#10b981" }}
        >
          웹에서 코드 입력 →
        </a>
      )}
      {status && <div style={{ color: "#f87171" }}>{status}</div>}
    </div>
  );
}
