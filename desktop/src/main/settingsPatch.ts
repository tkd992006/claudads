import { join } from "path";
import {
  existsSync,
  readFileSync,
  writeFileSync,
  renameSync,
  copyFileSync,
  mkdirSync,
  readdirSync,
  unlinkSync,
} from "fs";
import os from "os";
import crypto from "crypto";

// Merges busy/idle hooks into ~/.claude/settings.json so Claude Code reports
// its state to us. Backs up the original to settings.json.claudead-backup.
//
// 멀티 인스턴스 안전성: settings.json 의 hook 명령은 포트를 직접 박지 않고
// 런타임 env($CLAUDE_AD_HOOK_PORT)로 읽으므로, 어느 인스턴스가 써도 내용이
// 동일하다. 따라서 동시 실행은 (a) 쓰기 도중 JSON 깨짐, (b) 첫 인스턴스가
// 종료하며 hook 을 걷어내 남은 인스턴스를 망가뜨림 — 두 가지만 막으면 된다.
// (a) 는 temp+rename 원자적 쓰기로, (b) 는 instances/ 레지스트리로 해결.

type ClaudeHook = {
  hooks: Array<{ type: "command"; command: string }>;
};
type ClaudeSettings = {
  hooks?: Record<string, ClaudeHook[]>;
  [k: string]: unknown;
};

const MARKER = "claude-ad-terminal";

// 우리가 과거/현재 어떤 버전에서든 건드렸을 수 있는 hook 이벤트 전부.
// merge 시 이 이벤트들에서 우리 hook 을 모두 제거한 뒤 현재 버전을 다시 넣는다.
const MANAGED_EVENTS = [
  "UserPromptSubmit",
  "PreToolUse",
  "PostToolUse",
  "Stop",
  "SubagentStop",
  "Notification",
];

function claudeDir() {
  return join(os.homedir(), ".claude");
}
function settingsPath() {
  return join(claudeDir(), "settings.json");
}
function backupPath() {
  return join(claudeDir(), "settings.json.claudead-backup");
}
function instancesDir() {
  return join(os.homedir(), ".claude-ad", "instances");
}

function makeHooks(): Record<string, ClaudeHook[]> {
  // CLAUDE_AD_HOOK_PORT 가 set 되어 있을 때만 curl 실행 → 우리 PTY 안에서 켠
  // claude 세션에서만 hook 이 발화. hook JSON(stdin)을 그대로 전달해 서버가
  // session_id 로 세션을 구분할 수 있게 한다(tmux 멀티페인 대응).
  const post = (path: string) =>
    `[ -n "$CLAUDE_AD_HOOK_PORT" ] && curl -s -o /dev/null -X POST ` +
    `-H 'content-type: application/json' --data-binary @- ` +
    `"http://127.0.0.1:$CLAUDE_AD_HOOK_PORT${path}" || true`;
  const busy = [{ hooks: [{ type: "command" as const, command: post("/busy") }] }];
  const idle = [{ hooks: [{ type: "command" as const, command: post("/idle") }] }];
  // busy: 프롬프트 제출 + 모든 도구 호출 직전(작업 중 상태를 계속 갱신).
  // idle: 메인 응답 종료 + 입력 대기 알림. SubagentStop 은 메인 에이전트가
  //       계속 일하는 중에도 발화하므로 idle 신호로 쓰지 않는다.
  return {
    UserPromptSubmit: busy,
    PreToolUse: busy,
    Stop: idle,
    Notification: idle,
  };
}

function isOurHook(h: ClaudeHook): boolean {
  return !!h.hooks?.some(
    (c) =>
      c.command.includes("claude-ad-state") ||
      (c.command.includes("127.0.0.1") &&
        (c.command.includes("/busy") || c.command.includes("/idle"))),
  );
}

function atomicWriteJson(path: string, data: unknown) {
  const tmp = `${path}.tmp.${process.pid}.${Date.now()}`;
  writeFileSync(tmp, JSON.stringify(data, null, 2));
  renameSync(tmp, path);
}

export async function mergeClaudeHooks(port: number) {
  const p = settingsPath();
  mkdirSync(claudeDir(), { recursive: true });
  const existing: ClaudeSettings = existsSync(p)
    ? JSON.parse(readFileSync(p, "utf8") || "{}")
    : {};
  if (!existsSync(backupPath()) && existsSync(p)) {
    copyFileSync(p, backupPath());
  }

  const merged: ClaudeSettings = {
    ...existing,
    hooks: { ...(existing.hooks ?? {}) },
    [MARKER]: { managed: true, port },
  };

  // 1) 관리 대상 이벤트에서 우리(또는 레거시 tmp) hook 을 모두 제거.
  for (const k of MANAGED_EVENTS) {
    const prior = merged.hooks![k];
    if (!prior) continue;
    const filtered = prior.filter((h) => !isOurHook(h));
    if (filtered.length > 0) merged.hooks![k] = filtered;
    else delete merged.hooks![k];
  }
  // 2) 현재 버전의 hook 을 다시 추가.
  const ours = makeHooks();
  for (const k of Object.keys(ours)) {
    merged.hooks![k] = [...(merged.hooks![k] ?? []), ...ours[k]];
  }

  atomicWriteJson(p, merged);
}

export async function restoreClaudeSettings() {
  const p = settingsPath();
  const b = backupPath();
  if (existsSync(b)) {
    copyFileSync(b, p);
  }
}

// --- 멀티 인스턴스 레지스트리 -------------------------------------------------
// 살아있는 앱 인스턴스를 instances/<uuid>.json 로 추적한다. 마지막 인스턴스가
// 종료할 때만 settings.json 을 복원하기 위함.

function instanceFile(id: string) {
  return join(instancesDir(), `${id}.json`);
}

function pidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    // ESRCH = 없는 프로세스, EPERM = 살아있지만 우리 소유 아님(살아있음으로 간주).
    return (e as NodeJS.ErrnoException).code === "EPERM";
  }
}

// 죽은(크래시한) 인스턴스의 잔여 파일을 제거. 앱 시작 시 호출.
export function sweepDeadInstances() {
  const dir = instancesDir();
  if (!existsSync(dir)) return;
  for (const f of readdirSync(dir)) {
    if (!f.endsWith(".json")) continue;
    const full = join(dir, f);
    try {
      const { pid } = JSON.parse(readFileSync(full, "utf8")) as { pid: number };
      if (!pid || !pidAlive(pid)) unlinkSync(full);
    } catch {
      try {
        unlinkSync(full);
      } catch {}
    }
  }
}

export function registerInstance(port: number): string {
  const dir = instancesDir();
  mkdirSync(dir, { recursive: true });
  const id = crypto.randomUUID();
  atomicWriteJson(instanceFile(id), { pid: process.pid, port });
  return id;
}

export function unregisterInstance(id: string) {
  try {
    if (existsSync(instanceFile(id))) unlinkSync(instanceFile(id));
  } catch {}
}

export function activeInstanceCount(): number {
  const dir = instancesDir();
  if (!existsSync(dir)) return 0;
  return readdirSync(dir).filter((f) => f.endsWith(".json")).length;
}
