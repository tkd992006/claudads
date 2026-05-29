import React, { useEffect, useState } from "react";

type Props = {
  onUnauthorized: () => void;
  onLogout: () => void;
};

export default function BalanceBar({ onUnauthorized, onLogout }: Props) {
  const [balance, setBalance] = useState<string>("...");
  const [ok, setOk] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function refresh() {
      const r = await window.api.getBalance();
      if (!mounted) return;
      if (r?.__unauthorized) {
        setOk(false);
        onUnauthorized();
        return;
      }
      if (r?.balanceMicro != null) {
        setBalance(r.balanceMicro);
        setOk(true);
      }
    }
    refresh();
    const t = setInterval(refresh, 15_000);
    return () => {
      mounted = false;
      clearInterval(t);
    };
  }, [onUnauthorized]);

  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        padding: "6px 12px",
        background: "rgba(10,10,10,0.85)",
        borderTop: "1px solid #1f2937",
        fontSize: 12,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        opacity: 0.95,
        zIndex: 5,
      }}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          opacity: 0.85,
        }}
        title={ok ? "OAuth 연결됨" : "OAuth 끊김"}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: ok ? "#10b981" : "#ef4444",
            boxShadow: ok
              ? "0 0 6px rgba(16,185,129,0.7)"
              : "0 0 6px rgba(239,68,68,0.7)",
          }}
        />
        <span>{ok ? "로그인됨" : "로그아웃됨"}</span>
        <button
          onClick={onLogout}
          style={{
            marginLeft: 6,
            background: "transparent",
            color: "#9ca3af",
            border: "1px solid #374151",
            borderRadius: 6,
            padding: "1px 8px",
            fontSize: 11,
            cursor: "pointer",
          }}
        >
          로그아웃
        </button>
      </span>
      <span>잔액 {balance} µ</span>
    </div>
  );
}
