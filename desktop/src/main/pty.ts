import * as nodePty from "node-pty";
import os from "os";

export type PtyHandle = {
  write: (data: string) => void;
  resize: (cols: number, rows: number) => void;
  kill: () => void;
};

export function spawnPty(opts: {
  cwd: string;
  env: Record<string, string>;
  onData: (d: string) => void;
  onExit: () => void;
}): PtyHandle {
  const shell =
    process.platform === "win32"
      ? "powershell.exe"
      : process.env.SHELL ?? "/bin/bash";

  const env = { ...process.env, ...opts.env } as Record<string, string>;
  const p = nodePty.spawn(shell, [], {
    name: "xterm-256color",
    cols: 120,
    rows: 32,
    cwd: opts.cwd,
    env,
  });
  p.onData(opts.onData);
  p.onExit(opts.onExit);
  return {
    write: (d) => p.write(d),
    resize: (cols, rows) => p.resize(cols, rows),
    kill: () => p.kill(),
  };
}

export const homedir = os.homedir();
