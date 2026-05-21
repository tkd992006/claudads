import http from "http";
import { AddressInfo } from "net";

// Listens on 127.0.0.1 only. Claude Code hooks POST { state: "busy"|"idle" } here.
export function startHookServer(
  onState: (busy: boolean) => void,
): Promise<number> {
  return new Promise((resolve) => {
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
          if (req.url === "/busy") onState(true);
          else if (req.url === "/idle") onState(false);
        } catch {}
        res.writeHead(200, { "content-type": "application/json" });
        res.end("{}");
      });
    });
    server.listen(0, "127.0.0.1", () => {
      const port = (server.address() as AddressInfo).port;
      resolve(port);
    });
  });
}
