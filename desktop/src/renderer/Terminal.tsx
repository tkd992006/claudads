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
      // Option 키를 Meta 로 취급 → Option+B/F/Backspace 등 단어 단위 편집이 동작.
      macOptionIsMeta: true,
      theme: { background: "#0a0a0a", foreground: "#e5e7eb" },
    });
    const fit = new FitAddon();
    term.loadAddon(fit);

    // macOS Cmd / Option 조합을 터미널 제어 시퀀스로 변환한다.
    // xterm 은 Cmd 를 전혀 모르고, Option+화살표는 셸이 모르는 시퀀스를 보낸다.
    term.attachCustomKeyEventHandler((e) => {
      if (e.type !== "keydown") return true;
      const send = (seq: string): boolean => {
        e.preventDefault();
        window.api.ptyWrite(seq);
        return false;
      };
      if (e.metaKey && !e.ctrlKey && !e.altKey) {
        switch (e.key) {
          case "Backspace": return send("\x15"); // Ctrl+U: 줄 시작까지 삭제
          case "Delete": return send("\x0b"); // Ctrl+K: 줄 끝까지 삭제
          case "ArrowLeft": return send("\x01"); // Ctrl+A: 줄 맨 앞
          case "ArrowRight": return send("\x05"); // Ctrl+E: 줄 맨 끝
        }
        return true;
      }
      if (e.altKey && !e.metaKey && !e.ctrlKey) {
        if (e.key === "ArrowLeft") return send("\x1bb"); // 단어 뒤로
        if (e.key === "ArrowRight") return send("\x1bf"); // 단어 앞으로
      }
      return true;
    });

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
