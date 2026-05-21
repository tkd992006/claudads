import React, { useEffect, useState } from "react";

export default function BalanceBar() {
  const [balance, setBalance] = useState<string>("...");

  useEffect(() => {
    let mounted = true;
    async function refresh() {
      const r = await window.api.getBalance();
      if (mounted && r?.balanceMicro != null) setBalance(r.balanceMicro);
    }
    refresh();
    const t = setInterval(refresh, 15_000);
    return () => {
      mounted = false;
      clearInterval(t);
    };
  }, []);

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
        justifyContent: "space-between",
        opacity: 0.9,
        zIndex: 5,
      }}
    >
      <span style={{ opacity: 0.6 }}>Claude Ad Terminal</span>
      <span>잔액 {balance} µ</span>
    </div>
  );
}
