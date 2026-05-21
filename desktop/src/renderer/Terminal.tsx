import React, { useEffect, useRef } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";

export default function Terminal() {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const term = new XTerm({
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      fontSize: 14,
      cursorBlink: true,
      theme: { background: "#0a0a0a", foreground: "#e5e7eb" },
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(ref.current);
    fit.fit();
    term.focus();

    window.api.startPty().then(() => {
      // 초기 사이즈를 PTY 에 알려줘서 셸이 정확한 cols/rows 로 시작하도록
      window.api.ptyResize(term.cols, term.rows);
      term.focus();
    });
    window.api.onPtyData((d) => term.write(d));
    term.onData((d) => window.api.ptyWrite(d));
    const ro = new ResizeObserver(() => {
      fit.fit();
      window.api.ptyResize(term.cols, term.rows);
    });
    ro.observe(ref.current);
    return () => {
      ro.disconnect();
      term.dispose();
    };
  }, []);

  return (
    <div
      ref={ref}
      onClick={() => {
        const ta = ref.current?.querySelector("textarea");
        (ta as HTMLTextAreaElement | null)?.focus();
      }}
      style={{
        position: "absolute",
        inset: 0,
        bottom: 28,
        background: "#0a0a0a",
      }}
    />
  );
}
