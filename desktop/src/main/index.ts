import { app, BrowserWindow, Menu, ipcMain, shell, safeStorage } from "electron";
import { join } from "path";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { spawnPty, type PtyHandle } from "./pty";
import { startHookServer } from "./hookServer";
import {
  mergeClaudeHooks,
  restoreClaudeSettings,
  sweepDeadInstances,
  registerInstance,
  unregisterInstance,
  activeInstanceCount,
} from "./settingsPatch";
import { startDeviceFlow, pollToken } from "./auth";
import * as api from "./apiClient";
import os from "os";

const TOKEN_PATH = join(app.getPath("userData"), "token.enc");

function saveToken(t: string) {
  if (!safeStorage.isEncryptionAvailable()) {
    writeFileSync(TOKEN_PATH, t, "utf8");
    return;
  }
  writeFileSync(TOKEN_PATH, safeStorage.encryptString(t));
}
function loadToken(): string | null {
  if (!existsSync(TOKEN_PATH)) return null;
  const buf = readFileSync(TOKEN_PATH);
  if (!safeStorage.isEncryptionAvailable()) return buf.toString("utf8");
  try {
    return safeStorage.decryptString(buf);
  } catch {
    return null;
  }
}

let win: BrowserWindow | null = null;
let pty: PtyHandle | null = null;
let hookPort = 0;
let instanceId: string | null = null;
let cleanedUp = false;

async function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    backgroundColor: "#0a0a0a",
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    win.loadFile(join(__dirname, "../renderer/index.html"));
  }

  win.on("closed", () => {
    win = null;
    pty?.kill();
  });
}

function broadcastBusy(busy: boolean) {
  win?.webContents.send("busy:state", busy);
}

function buildTerminalMenu() {
  const isMac = process.platform === "darwin";
  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac
      ? ([
          {
            label: app.name,
            submenu: [
              { role: "about" },
              { type: "separator" },
              { role: "hide" },
              { role: "hideOthers" },
              { role: "unhide" },
              { type: "separator" },
              { role: "quit" },
            ],
          },
        ] as Electron.MenuItemConstructorOptions[])
      : []),
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
      ],
    },
    {
      label: "Window",
      submenu: [
        { role: "minimize" },
        { role: "close" },
        ...(isMac
          ? ([{ type: "separator" }, { role: "front" }] as Electron.MenuItemConstructorOptions[])
          : []),
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(async () => {
  buildTerminalMenu();
  hookPort = await startHookServer(broadcastBusy);
  mkdirSync(app.getPath("userData"), { recursive: true });
  await mergeClaudeHooks(hookPort).catch((e) => console.error("hook merge", e));
  // 멀티 인스턴스 추적: 크래시한 인스턴스 잔여 파일을 청소하고 자신을 등록.
  // 마지막 인스턴스가 종료할 때만 settings.json 을 복원한다(아래 before-quit).
  try {
    sweepDeadInstances();
    instanceId = registerInstance(hookPort);
  } catch (e) {
    console.error("instance register", e);
  }

  // IPC
  ipcMain.handle("pty:start", async () => {
    if (pty) pty.kill();
    pty = spawnPty({
      cwd: os.homedir(),
      env: { CLAUDE_AD_HOOK_PORT: String(hookPort) },
      onData: (d) => win?.webContents.send("pty:data", d),
      onExit: () => win?.webContents.send("pty:exit"),
    });
    return { ok: true };
  });
  ipcMain.on("pty:input", (_, data: string) => pty?.write(data));
  ipcMain.on("pty:resize", (_, cols: number, rows: number) =>
    pty?.resize(cols, rows),
  );

  ipcMain.handle("auth:start", async () => {
    return startDeviceFlow();
  });
  ipcMain.handle("auth:poll", async (_, deviceCode: string) => {
    const r = await pollToken(deviceCode);
    if (r.status === "ok" && r.token) saveToken(r.token);
    return r;
  });
  ipcMain.handle("auth:get", () => loadToken());
  ipcMain.handle("auth:logout", () => {
    if (existsSync(TOKEN_PATH)) writeFileSync(TOKEN_PATH, "");
    return true;
  });

  ipcMain.handle("shell:open", (_, url: string) => shell.openExternal(url));

  ipcMain.handle("ad:fetch", async (_, deviceId: string) => {
    const t = loadToken();
    if (!t) return { error: "no token" };
    return api.fetchAd(t, deviceId);
  });
  ipcMain.handle(
    "ad:complete",
    async (_, impressionId: string, playedSec: number) => {
      const t = loadToken();
      if (!t) return { error: "no token" };
      return api.completeImpression(t, impressionId, playedSec ?? 0);
    },
  );
  ipcMain.handle("ad:cta", async (_, impressionId: string, url: string) => {
    const t = loadToken();
    if (!t) return { error: "no token" };
    shell.openExternal(url);
    return api.recordCta(t, impressionId);
  });
  ipcMain.handle("ad:prefillPrompt", async (_, impressionId: string, text: string) => {
    const t = loadToken();
    if (!t) return { error: "no token" };
    // 광고주 텍스트는 PTY 입력으로 흐르므로, 자동 submit 을 일으키는 제어 문자를
    // 엄격히 제거해야 한다. CR/LF 가 들어가면 사용자 동의 없이 라인이 전송된다.
    // ESC/ETX 등 다른 제어문자도 터미널 escape sequence 가 될 수 있어 차단.
    const safe = text.replace(/[\x00-\x1F\x7F]/g, " ");
    pty?.write(safe);
    win?.webContents.send("pty:focus");
    return api.recordCta(t, impressionId);
  });
  ipcMain.handle("balance:get", async () => {
    const t = loadToken();
    if (!t) return { error: "no token" };
    return api.getBalance(t);
  });

  await createWindow();
});

// 이 인스턴스를 레지스트리에서 빼고, 마지막 인스턴스였다면 settings.json 복원.
// 동기 파일 연산만 사용 — before-quit 의 async 작업은 완료가 보장되지 않는다.
function cleanupInstance() {
  if (cleanedUp) return;
  cleanedUp = true;
  pty?.kill();
  try {
    if (instanceId) unregisterInstance(instanceId);
    if (activeInstanceCount() === 0) {
      void restoreClaudeSettings();
    }
  } catch (e) {
    console.error("instance cleanup", e);
  }
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  cleanupInstance();
});
