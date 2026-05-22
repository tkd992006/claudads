import React, { useEffect, useState } from "react";
import Login from "./Login";
import Terminal from "./Terminal";
import AdOverlay from "./AdOverlay";
import BalanceBar from "./BalanceBar";

export default function App() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [showAd, setShowAd] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    window.api.authGet().then((t) => setAuthed(!!t));
    window.api.onBusy((b) => {
      setBusy(b);
      if (b) setShowAd(true);
    });
  }, []);

  if (authed === null) return null;
  if (!authed) return <Login onAuthed={() => setAuthed(true)} />;

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh" }}>
      <Terminal />
      <BalanceBar />
      {showAd && (
        <AdOverlay busy={busy} onClose={() => setShowAd(false)} />
      )}
    </div>
  );
}
