// Throwaway: ad viewability probe. Real-time flags to terminal.
// Run: node ad-probe.js   → open http://localhost:4321
const http = require('http');
const PORT = 4321;

const HTML = `<!DOCTYPE html>
<html lang="ko"><head><meta charset="utf-8"><title>Ad Viewability Probe</title>
<style>
  body { font-family: system-ui, -apple-system; padding: 2rem; max-width: 760px; margin: 0 auto; line-height: 1.5; }
  .spacer { height: 90vh; background: #f5f5f5; display: flex; align-items: center; justify-content: center; color: #999; border-radius: 8px; margin: 1rem 0; }
  .ad { height: 360px; background: linear-gradient(135deg, #ff6b6b, #ee5a6f); color: white; display: flex; align-items: center; justify-content: center; font-size: 2rem; border-radius: 12px; margin: 2rem 0; font-weight: 700; letter-spacing: 0.1em; }
  .status { position: fixed; top: 1rem; right: 1rem; background: #111; color: #eee; padding: 0.9rem 1.1rem; border-radius: 10px; font-family: ui-monospace, Menlo, monospace; font-size: 0.85rem; min-width: 180px; box-shadow: 0 8px 24px rgba(0,0,0,0.18); }
  .row { display: flex; justify-content: space-between; gap: 1.2rem; padding: 0.15rem 0; }
  .yes { color: #4ade80; } .no { color: #f87171; } .unk { color: #facc15; }
  h1 { margin-top: 0; }
  code { background: #f0f0f0; padding: 0.1rem 0.35rem; border-radius: 4px; }
</style></head><body>
  <h1>광고 Viewability 실험</h1>
  <p>이 페이지를 띄워두고 <b>탭 전환 / 윈도우 최소화 / 다른 윈도우 클릭 / 스크롤</b> 해보세요. 우상단 + 터미널에 실시간으로 떠요.</p>
  <ul>
    <li><code>visible</code>: 탭이 활성 + 윈도우 최소화 안 됨</li>
    <li><code>focus</code>: 이 윈도우가 키보드 포커스 가짐</li>
    <li><code>seen50%</code>: 광고 박스가 뷰포트 50% 이상 차지</li>
  </ul>
  <div class="status">
    <div class="row"><span>visible</span><span id="f-vis" class="unk">?</span></div>
    <div class="row"><span>focus</span><span id="f-foc" class="unk">?</span></div>
    <div class="row"><span>seen50%</span><span id="f-int" class="unk">?</span></div>
  </div>
  <div class="spacer">↓ 스크롤해서 광고 보이게 ↓</div>
  <div class="ad" id="ad">AD</div>
  <div class="spacer">↑ 스크롤해서 광고 안 보이게 ↑</div>
<script>
const state = { visible: null, focused: null, intersecting: null };
const setFlag = (id, v) => {
  const el = document.getElementById(id);
  el.textContent = v === true ? '✓' : v === false ? '✗' : '?';
  el.className = v === true ? 'yes' : v === false ? 'no' : 'unk';
};
function report() {
  setFlag('f-vis', state.visible);
  setFlag('f-foc', state.focused);
  setFlag('f-int', state.intersecting);
  fetch('/state', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(state), keepalive: true }).catch(()=>{});
}
function updateVF() {
  state.visible = document.visibilityState === 'visible';
  state.focused = document.hasFocus();
  report();
}
document.addEventListener('visibilitychange', updateVF);
window.addEventListener('focus', updateVF);
window.addEventListener('blur', updateVF);
new IntersectionObserver((entries) => {
  state.intersecting = entries[0].intersectionRatio >= 0.5;
  report();
}, { threshold: [0, 0.25, 0.5, 0.75, 1] }).observe(document.getElementById('ad'));
updateVF();
</script></body></html>`;

const C = { g: '\x1b[32m', r: '\x1b[31m', y: '\x1b[33m', d: '\x1b[2m', x: '\x1b[0m' };
const flag = (v) => v === true ? `${C.g}✓${C.x}` : v === false ? `${C.r}✗${C.x}` : `${C.y}?${C.x}`;

let lastKey = '';
http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/state') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const s = JSON.parse(body);
        const key = `${s.visible}|${s.focused}|${s.intersecting}`;
        if (key !== lastKey) {
          lastKey = key;
          const t = new Date().toLocaleTimeString('en-GB');
          console.log(`${C.d}[${t}]${C.x}  visible:${flag(s.visible)}  focus:${flag(s.focused)}  seen50%:${flag(s.intersecting)}`);
        }
        res.writeHead(204).end();
      } catch { res.writeHead(400).end(); }
    });
    return;
  }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(HTML);
}).listen(PORT, () => {
  console.log(`\n🎯  Ad viewability probe`);
  console.log(`    → http://localhost:${PORT}\n`);
  console.log(`    상태 변할 때만 로그 찍힘. Ctrl+C 로 종료.\n${C.d}    ─────────────────────────────────────────────${C.x}`);
});
