import http from "http";
import { AddressInfo } from "net";

// 한 세션이 busy 인 채로 이 시간 동안 어떤 hook 도 안 오면 죽은 것으로 간주.
// 작업 중인 Claude 는 PreToolUse/UserPromptSubmit hook 으로 계속 갱신되므로,
// 이 값을 넘는 건 사실상 세션이 강제 종료된(Stop 미발화) 경우뿐이다.
const STALE_MS = 8 * 60 * 1000;
const SWEEP_MS = 30 * 1000;

// Listens on 127.0.0.1 only. Claude Code hooks POST the hook JSON (stdin) here.
// busy/idle 를 boolean flip 이 아니라 session_id 별 상태로 추적한다 — tmux/zellij
// 처럼 한 PTY 안에서 여러 Claude 세션이 같은 포트로 신호를 보내도, 또 Stop 외에
// 짝이 맞지 않는 idle 이벤트가 와도 상태가 깨지지 않는다. busy 세션이 하나라도
// 있으면 광고를 띄운다.
export function startHookServer(
  onState: (busy: boolean) => void,
): Promise<number> {
  return new Promise((resolve) => {
    // session_id -> 마지막으로 busy 신호를 받은 시각(ms). 존재하면 busy.
    const busy = new Map<string, number>();
    let lastEmitted = false;

    const emit = () => {
      const v = busy.size > 0;
      if (v !== lastEmitted) {
        lastEmitted = v;
        onState(v);
      }
    };

    const sessionId = (body: string): string => {
      if (!body) return "default";
      try {
        const j = JSON.parse(body);
        if (j && typeof j.session_id === "string" && j.session_id) {
          return j.session_id;
        }
      } catch {}
      return "default";
    };

    const server = http.createServer((req, res) => {
      if (req.method !== "POST") {
        res.writeHead(405);
        res.end();
        return;
      }
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        try {
          const sid = sessionId(body);
          if (req.url === "/busy") busy.set(sid, Date.now());
          else if (req.url === "/idle") busy.delete(sid);
          emit();
        } catch {}
        res.writeHead(200, { "content-type": "application/json" });
        res.end("{}");
      });
    });

    // Watchdog: Stop hook 없이 죽은 세션을 일정 시간 뒤 정리해 광고가 영구히
    // 갇히는 것을 막는다.
    const sweep = setInterval(() => {
      const cutoff = Date.now() - STALE_MS;
      let changed = false;
      for (const [sid, ts] of busy) {
        if (ts < cutoff) {
          busy.delete(sid);
          changed = true;
        }
      }
      if (changed) emit();
    }, SWEEP_MS);
    sweep.unref?.();

    server.listen(0, "127.0.0.1", () => {
      const port = (server.address() as AddressInfo).port;
      resolve(port);
    });
  });
}
