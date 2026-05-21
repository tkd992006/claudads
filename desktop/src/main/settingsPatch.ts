import { join } from "path";
import { existsSync, readFileSync, writeFileSync, copyFileSync } from "fs";
import os from "os";

// Merges 4 hooks into ~/.claude/settings.json so Claude Code reports busy/idle to us.
// Backs up the original to settings.json.claudead-backup. restoreClaudeSettings reverts.

type ClaudeHook = {
  hooks: Array<{ type: "command"; command: string }>;
};
type ClaudeSettings = {
  hooks?: Record<string, ClaudeHook[]>;
  [k: string]: unknown;
};

function settingsPath() {
  return join(os.homedir(), ".claude", "settings.json");
}
function backupPath() {
  return join(os.homedir(), ".claude", "settings.json.claudead-backup");
}

const MARKER = "claude-ad-terminal";

function makeHooks(): Record<string, ClaudeHook[]> {
  // CLAUDE_AD_HOOK_PORT 가 set 되어 있을 때만 curl 실행 → 우리 PTY 안에서
  // 켠 claude 세션에서만 hook 이 발화. 시스템 다른 곳의 claude 세션은 영향 없음.
  const post = (path: string) =>
    `[ -n "$CLAUDE_AD_HOOK_PORT" ] && curl -s -o /dev/null -X POST "http://127.0.0.1:$CLAUDE_AD_HOOK_PORT${path}" || true`;
  return {
    UserPromptSubmit: [{ hooks: [{ type: "command", command: post("/busy") }] }],
    Stop: [{ hooks: [{ type: "command", command: post("/idle") }] }],
    SubagentStop: [{ hooks: [{ type: "command", command: post("/idle") }] }],
    Notification: [{ hooks: [{ type: "command", command: post("/idle") }] }],
  };
}

export async function mergeClaudeHooks(port: number) {
  const p = settingsPath();
  const existing: ClaudeSettings = existsSync(p)
    ? JSON.parse(readFileSync(p, "utf8") || "{}")
    : {};
  if (!existsSync(backupPath()) && existsSync(p)) {
    copyFileSync(p, backupPath());
  }
  const ours = makeHooks();
  const merged: ClaudeSettings = {
    ...existing,
    hooks: { ...(existing.hooks ?? {}) },
    [MARKER]: { managed: true, port },
  };
  for (const k of Object.keys(ours)) {
    const prior = merged.hooks![k] ?? [];
    const filtered = prior.filter(
      (h) =>
        !h.hooks?.some((c) => c.command.includes("127.0.0.1") && c.command.includes("/busy")) &&
        !h.hooks?.some((c) => c.command.includes("127.0.0.1") && c.command.includes("/idle")),
    );
    merged.hooks![k] = [...filtered, ...ours[k]];
  }
  writeFileSync(p, JSON.stringify(merged, null, 2));
}

export async function restoreClaudeSettings() {
  const p = settingsPath();
  const b = backupPath();
  if (existsSync(b)) {
    copyFileSync(b, p);
  }
}
