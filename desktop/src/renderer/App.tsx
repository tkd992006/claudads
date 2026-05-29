import React, { useCallback, useEffect, useState } from "react";
import Login from "./Login";
import Terminal from "./Terminal";
import AdOverlay from "./AdOverlay";
import BalanceBar from "./BalanceBar";

export default function App() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [showAd, setShowAd] = useState(false);
  const [busy, setBusy] = useState(false);

  const forceLogout = useCallback(async () => {
    await window.api.authLogout();
    setShowAd(false);
    setBusy(false);
    setAuthed(false);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const t = await window.api.authGet();
      if (!t) {
        if (alive) setAuthed(false);
        return;
      }
      // 로컬 토큰이 있어도 서버가 인정하지 않으면 OAuth 깨진 상태다.
      // 광고/잔액 호출 전에 한 번 검증해서 깨진 채로 광고가 뜨는 걸 막는다.
      const r = await window.api.getBalance();
      if (!alive) return;
      if (r?.__unauthorized) {
        await window.api.authLogout();
        setAuthed(false);
      } else {
        setAuthed(true);
      }
    })();
    window.api.onBusy((b) => {
      setBusy(b);
      if (b) setShowAd(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (authed === null) return null;
  if (!authed) return <Login onAuthed={() => setAuthed(true)} />;

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh" }}>
      <Terminal />
      <BalanceBar onUnauthorized={forceLogout} onLogout={forceLogout} />
      {showAd && (
        <AdOverlay
          busy={busy}
          onClose={() => setShowAd(false)}
          onUnauthorized={forceLogout}
        />
      )}
    </div>
  );
}
