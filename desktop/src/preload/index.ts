import { contextBridge, ipcRenderer } from "electron";

const api = {
  startPty: () => ipcRenderer.invoke("pty:start"),
  ptyWrite: (data: string) => ipcRenderer.send("pty:input", data),
  ptyResize: (cols: number, rows: number) =>
    ipcRenderer.send("pty:resize", cols, rows),
  onPtyData: (cb: (d: string) => void) =>
    ipcRenderer.on("pty:data", (_, d) => cb(d)),
  onBusy: (cb: (busy: boolean) => void) =>
    ipcRenderer.on("busy:state", (_, b) => cb(b)),

  authStart: () => ipcRenderer.invoke("auth:start"),
  authPoll: (deviceCode: string) =>
    ipcRenderer.invoke("auth:poll", deviceCode),
  authGet: () => ipcRenderer.invoke("auth:get"),
  authLogout: () => ipcRenderer.invoke("auth:logout"),

  fetchAd: (deviceId: string) => ipcRenderer.invoke("ad:fetch", deviceId),
  completeAd: (impressionId: string, playedSec: number) =>
    ipcRenderer.invoke("ad:complete", impressionId, playedSec),
  clickCta: (impressionId: string, url: string) =>
    ipcRenderer.invoke("ad:cta", impressionId, url),
  prefillPrompt: (impressionId: string, text: string) =>
    ipcRenderer.invoke("ad:prefillPrompt", impressionId, text),
  getBalance: () => ipcRenderer.invoke("balance:get"),

  openExternal: (url: string) => ipcRenderer.invoke("shell:open", url),
};

contextBridge.exposeInMainWorld("api", api);

export type DesktopApi = typeof api;
