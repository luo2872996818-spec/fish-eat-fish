/* =========================================================================
 *  tools/check-deploy.mjs —— 线上验收脚本
 *  -------------------------------------------------------------------------
 *  用途：用真实浏览器（无头模式）访问一个网址，自动检查部署是否健康。
 *        这是"部署完成"的客观标准 —— 不靠肉眼看，拿数据说话。
 *
 *  用法：
 *      node tools/check-deploy.mjs http://localhost:8766/
 *      node tools/check-deploy.mjs https://你的用户名.github.io/fish-eat-fish/
 *
 *  检查内容：
 *      1. 能不能打开、状态码是否正常
 *      2. 根地址会不会正确跳转到 /v1/
 *      3. 有没有加载失败的资源（404）—— 线上最容易踩的就是文件名大小写
 *      4. 有没有 JavaScript 报错
 *      5. 画布尺寸和 DPR 处理是否正确
 *      6. ★ 触摸坐标是否精确（派发真实触摸事件，再读回页面上的结果比对）
 *      7. 帧率是否正常
 *      8. 顺手存一张手机尺寸的截图
 *
 *  需要：Node 18+（用到内置 fetch 和 WebSocket）和本机装了 Edge 或 Chrome
 * ========================================================================= */

import { spawn } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

/* 目标网址：从命令行参数拿，默认测本地 */
const TARGET = process.argv[2] || 'http://localhost:8000/';

/* 浏览器可执行文件：先找 Edge（Windows 自带），再找 Chrome */
const BROWSER_CANDIDATES = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
];

/* 手机尺寸：按 iPhone 14 这类常见机型（逻辑 390×844，物理倍率 3） */
const VIEW = { width: 390, height: 844, dpr: 3 };

const DEBUG_PORT = 9411;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browserPath = BROWSER_CANDIDATES.find((p) => fs.existsSync(p));
if (!browserPath) {
  console.log('✗ 找不到 Edge 或 Chrome，无法执行检查');
  process.exit(1);
}

/* ---------- 检查结果的收集器 ---------- */
const report = { pass: [], fail: [], warn: [] };
const ok = (msg) => report.pass.push(msg);
const bad = (msg) => report.fail.push(msg);
const warn = (msg) => report.warn.push(msg);

/* ---------- 启动浏览器 ---------- */
const profile = path.join(os.tmpdir(), 'fetf-check-profile');
fs.rmSync(profile, { recursive: true, force: true });

const browser = spawn(browserPath, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--remote-debugging-port=' + DEBUG_PORT,
  '--user-data-dir=' + profile,
  'about:blank',
], { stdio: 'ignore' });

/* 等调试端口起来，拿到页面目标 */
let targets = null;
for (let i = 0; i < 60; i++) {
  try {
    const res = await fetch('http://127.0.0.1:' + DEBUG_PORT + '/json/list');
    targets = await res.json();
    if (targets.some((t) => t.type === 'page')) break;
  } catch { /* 还没起来，继续等 */ }
  await sleep(250);
}
if (!targets) {
  console.log('✗ 浏览器启动失败（调试端口没起来）');
  process.exit(1);
}

const page = targets.find((t) => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

let nextId = 1;
const pending = new Map();
const failedRequests = [];
const jsProblems = [];

ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); return; }

  if (msg.method === 'Network.responseReceived' && msg.params.response.status >= 400) {
    failedRequests.push(msg.params.response.status + '  ' + msg.params.response.url);
  }
  if (msg.method === 'Network.loadingFailed') {
    failedRequests.push('加载失败  ' + msg.params.errorText);
  }
  if (msg.method === 'Runtime.exceptionThrown') {
    const d = msg.params.exceptionDetails;
    jsProblems.push(d.exception?.description || d.text);
  }
  if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
    jsProblems.push('console.error: ' + msg.params.args.map((a) => a.value ?? a.description).join(' '));
  }
};

function send(method, params = {}) {
  const id = nextId++;
  return new Promise((res) => { pending.set(id, res); ws.send(JSON.stringify({ id, method, params })); });
}

async function evaluate(expression) {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true });
  if (r.result?.exceptionDetails) return null;
  return r.result?.result?.value;
}

/* =========================================================================
 *  开始检查
 * ========================================================================= */
console.log('检查目标：' + TARGET + '\n');

await send('Runtime.enable');
await send('Page.enable');
await send('Network.enable');
await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
await send('Emulation.setDeviceMetricsOverride', {
  width: VIEW.width, height: VIEW.height, deviceScaleFactor: VIEW.dpr, mobile: true,
});

await send('Page.navigate', { url: TARGET });
await sleep(2800);   // 等真实时间，让渲染循环跑起来（截图/取 DOM 太早会误判）


/* ---- 检查 1：根地址是否正确跳转到 /v1/ ---- */
const finalUrl = await evaluate('location.href');
if (finalUrl && finalUrl.includes('/v1/')) {
  ok('根地址自动跳转到 /v1/ → ' + finalUrl);
} else {
  bad('没有跳转到 /v1/，当前地址是 ' + finalUrl);
}

/* ---- 检查 2：有没有页面主体（说明 HTML 加载成功）---- */
const hasStage = await evaluate('!!document.getElementById("stage")');
if (hasStage) ok('页面骨架加载成功（找到 .stage）');
else bad('页面里没有 .stage —— HTML 可能没加载成功');

const diagText = await evaluate('document.getElementById("diag") ? document.getElementById("diag").innerText : ""');
if (diagText && !diagText.includes('正在自检')) {
  ok('JavaScript 已执行（自检面板已被填充）');
} else {
  bad('JavaScript 没有执行（自检面板还是初始文字）—— 大概率是模块加载失败或报错');
}

/* ---- 检查 3：画布尺寸与 DPR ---- */
const metrics = await evaluate(`JSON.stringify({
  cw: document.getElementById('game').width,
  ch: document.getElementById('game').height,
  sw: document.getElementById('game').style.width,
  sh: document.getElementById('game').style.height,
  dpr: window.devicePixelRatio,
  scrollH: document.documentElement.scrollHeight,
  innerH: window.innerHeight,
  touchAction: getComputedStyle(document.getElementById('stage')).touchAction,
  overscroll: getComputedStyle(document.body).overscrollBehavior
})`);
if (metrics) {
  const m = JSON.parse(metrics);
  const expectDpr = Math.min(m.dpr, 2);   // 项目里 DPR 封顶 2
  const expectW = Math.round(VIEW.width * expectDpr);
  if (Math.abs(m.cw - expectW) <= 2) ok(`画布宽度正确：${m.cw} 物理像素（= ${VIEW.width} CSS × DPR封顶 ${expectDpr}）`);
  else bad(`画布宽度不对：实际 ${m.cw}，应该是 ${expectW}`);
  if (m.touchAction === 'none') ok('touch-action: none（浏览器不会抢走拖动手势）');
  else bad(`touch-action 是 ${m.touchAction}，应该是 none —— 拖动会被浏览器当成滚动`);
  if (m.overscroll === 'none') ok('overscroll-behavior: none（不会触发下拉刷新）');
  else warn(`overscroll-behavior 是 ${m.overscroll}，建议 none`);
  if (m.scrollH <= m.innerH + 1) ok('页面不可滚动（画面锁定，不会跟着手指跑）');
  else bad(`页面可以滚动：scrollHeight ${m.scrollH} > 视口 ${m.innerH}`);
}

/* ---- 检查 4：触摸坐标精度（最关键的一项）---- */
/* 从自检面板的文字里把坐标抠出来，和派发进去的坐标比对 */
const parseCoords = (text) => {
  const m = /你按在 \((\d+), (\d+)\)/.exec(text || '');
  return m ? { x: Number(m[1]), y: Number(m[2]) } : null;
};

const samples = [{ x: 100, y: 200 }, { x: 250, y: 700 }, { x: 40, y: 810 }];
let coordOk = 0;
for (const s of samples) {
  await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: s.x, y: s.y, id: 1 }] });
  /* 面板每 200ms 才刷新一次，所以最多等 1.5 秒，轮询到坐标变化为止 */
  let got = null;
  for (let i = 0; i < 6; i++) {
    await sleep(260);
    got = parseCoords(await evaluate('document.getElementById("diag").innerText'));
    if (got && got.x === s.x && got.y === s.y) break;
  }
  await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await sleep(120);

  if (got && got.x === s.x && got.y === s.y) {
    coordOk++;
    ok(`触摸坐标精确：按 (${s.x}, ${s.y}) → 读到 (${got.x}, ${got.y})`);
  } else {
    bad(`触摸坐标不对：按 (${s.x}, ${s.y}) → 读到 ${got ? `(${got.x}, ${got.y})` : '读不到'}`);
  }
}

/* ---- 检查 5：帧率 ---- */
const fpsMatch = /(\d+) FPS/.exec(diagText || '');
if (fpsMatch) {
  const fps = Number(fpsMatch[1]);
  if (fps >= 50) ok(`帧率 ${fps} FPS`);
  else if (fps >= 30) warn(`帧率只有 ${fps} FPS，偏低（浏览器后台标签页会限速，属正常；真机上要看实际表现）`);
  else bad(`帧率只有 ${fps} FPS，太低`);
} else {
  warn('读不到帧率信息');
}

/* ---- 检查 6：失败请求和 JS 报错 ---- */
if (failedRequests.length === 0) ok('没有任何加载失败的资源（404 等）');
else failedRequests.forEach((f) => bad('资源加载失败：' + f));

if (jsProblems.length === 0) ok('没有 JavaScript 报错');
else jsProblems.slice(0, 8).forEach((p) => bad('JS 报错：' + p.split('\n')[0]));

/* ---- 截图存档 ---- */
const shot = await send('Page.captureScreenshot', { format: 'png' });
const shotPath = path.join(os.tmpdir(), 'fetf-deploy-check.png');
fs.writeFileSync(shotPath, Buffer.from(shot.result.data, 'base64'));

/* =========================================================================
 *  输出报告
 * ========================================================================= */
console.log('===== 通过 =====');
report.pass.forEach((m) => console.log('  ✓ ' + m));
if (report.warn.length) {
  console.log('\n===== 提醒 =====');
  report.warn.forEach((m) => console.log('  ! ' + m));
}
if (report.fail.length) {
  console.log('\n===== 不通过 =====');
  report.fail.forEach((m) => console.log('  ✗ ' + m));
}

console.log('\n截图已保存：' + shotPath);
console.log(report.fail.length === 0
  ? `\n结论：全部通过（${report.pass.length} 项）。这个网址是健康的。`
  : `\n结论：有 ${report.fail.length} 项不通过，需要修。`);

ws.close();
browser.kill();
process.exit(report.fail.length === 0 ? 0 : 1);