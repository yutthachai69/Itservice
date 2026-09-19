/* eslint-disable @typescript-eslint/no-require-imports -- This standalone Node helper intentionally uses CommonJS. */
// Local Chrome CDP helper. Start Chrome with an isolated profile and port 9223.
const fs = require('node:fs');
const path = require('node:path');
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const pages = await (await fetch('http://127.0.0.1:9223/json/list')).json();
  const target = pages.find((page) => page.type === 'page');
  if (!target) throw new Error('No review tab');
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let seq = 0;
  const pending = new Map();
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    if (!pending.has(message.id)) return;
    const { resolve, reject, timer } = pending.get(message.id);
    clearTimeout(timer);
    pending.delete(message.id);
    if (message.error) reject(new Error(JSON.stringify(message.error)));
    else resolve(message.result);
  };
  const call = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++seq;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`Timeout: ${method}`)); }, 45000);
    pending.set(id, { resolve, reject, timer });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async (expression) => {
    const result = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  try {
    await call('Page.enable');
    if (process.argv[2] === 'close') { await call('Browser.close'); return; }
    if (process.argv[2] === 'links') {
      console.log(await evaluate(`JSON.stringify([...new Set([...document.querySelectorAll('main a[href]')].map(a=>a.getAttribute('href')))])`));
      return;
    }
    if (process.argv[2] === 'login') {
      const userId = Number(process.argv[3]);
      if (![1, 2, 3, 4].includes(userId)) throw new Error('Use a seeded demo account (1–4)');
      await evaluate(`document.querySelector('details').open=true; document.querySelector('select[name="userId"]').value=${JSON.stringify(String(userId))}; document.querySelector('select[name="userId"]').form.requestSubmit();`);
      await pause(2000);
      console.log(await evaluate('location.pathname'));
      return;
    }
    if (process.argv[2] === 'eval') {
      console.log(JSON.stringify(await evaluate(fs.readFileSync(process.argv[3], 'utf8')), null, 2));
      return;
    }
    const route = process.argv[2] || '/login';
    const width = Number(process.argv[3]) || 390;
    await call('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false });
    await call('Page.navigate', { url: `http://localhost:3000${route}` });
    for (let i = 0; i < 80; i++) {
      await pause(500);
      if (await evaluate('document.readyState === "complete" && document.body.innerText.length > 100')) break;
    }
    await evaluate('document.fonts.ready.then(() => true)');
    await evaluate('window.scrollTo(0, 0); true');
    await pause(1000);
    console.log(JSON.stringify(await evaluate(`({url:location.href,title:document.title,width:innerWidth,scrollWidth:document.documentElement.scrollWidth,text:document.body.innerText.slice(0,1500),overflow:[...document.querySelectorAll('main *')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&(r.right>innerWidth+1||r.left < -1)}).slice(0,10).map(e=>({tag:e.tagName,cls:e.className,text:e.innerText?.slice(0,70)}))})`), null, 2));
    const shot = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    const filename = `ui-review-${route.replace(/[^a-z0-9]/gi, '_')}-${width}.png`;
    fs.writeFileSync(path.join(__dirname, '..', filename), Buffer.from(shot.data, 'base64'));
    console.log(filename);
  } finally { socket.close(); }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
