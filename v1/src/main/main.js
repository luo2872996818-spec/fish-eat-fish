/* =========================================================================
 *  main.js —— v1 的入口（当前内容：部署自检页）
 *  -------------------------------------------------------------------------
 *  现在这个文件的用途：在写游戏之前，先确认三件事——
 *    ① 手机上能正常打开、满屏、没有白边、不能滚动
 *    ② 手指按下的位置和代码读到的坐标一致（这是"鱼跟手指游"的地基）
 *    ③ 帧率正常，画面不卡
 *
 *  阶段 1 正式开工后，这个文件会被"游戏主循环 + 场景切换"替换掉。
 *  现在的结构故意写得和将来的结构一致，所以不算白写。
 * ========================================================================= */

import { world, watchResize, applyTransform, ctx } from '../platform/viewport.js';
import { input, initInput } from '../platform/input.js';
import { hasTouch, isStandalone, readSafeArea, isPortrait } from '../platform/device.js';
import { clamp, randomRange } from '../utils/math.js';

const stage = document.getElementById('stage');
const diag = document.getElementById('diag');


/* =========================================================================
 *  一、自检用的临时状态
 * ===================================================================== */

/* 手指/鼠标的指针位置（只用于在自检页画一个圈，验证坐标对不对） */
const pointerMark = { x: 0, y: 0, active: false };

/* 几个慢慢上浮的气泡。
 * 它们的作用不只是好看 —— 就算你什么都不操作，画面也在动，
 * 一眼就能看出"渲染循环在正常跑"，而不是卡死在一张静止图上。 */
const bubbles = [];
for (let i = 0; i < 14; i++) {
  bubbles.push({
    x: Math.random(),                    // 用 0~1 的"相对坐标"存，屏幕尺寸变了也不会跑出界
    y: Math.random(),                    // 见下面 draw() 里的换算
    r: randomRange(3, 9),
    speed: randomRange(0.01, 0.035),     // 每秒上浮多少个"屏幕高度"
  });
}

/* FPS 统计用 */
let frames = 0;
let fpsTimer = 0;
let fps = 0;

/* 自检面板的刷新节流计时器（原因见 frame() 里的注释） */
let diagTimer = 0;

/* 上一帧的时间戳，用来算"这一帧过了多久" */
let lastTime = 0;


start();


/*
 * 功能：程序入口
 * 参数：无
 * 返回：无
 */
function start() {
  // ① 接上输入（触摸 / 鼠标）
  initInput(stage);

  // ② 接上尺寸监听：屏幕一转、地址栏一收，画布就跟着重算
  watchResize();

  // ③ 启动渲染循环
  requestAnimationFrame(frame);
}


/*
 * 功能：每一帧要做的事 —— 先更新状态，再画出来
 * 参数：now - 浏览器传进来的时间戳（毫秒，从页面打开算起）
 * 返回：无
 */
function frame(now) {
  // 算出"距离上一帧过了多久"，单位换成秒。
  // 第一帧没有上一帧，先按 1/60 秒算，避免出现一个巨大的 dt。
  const dt = lastTime ? (now - lastTime) / 1000 : 1 / 60;
  lastTime = now;

  /* ---- FPS 统计：每 500 毫秒算一次平均值 ----
   * 为什么不用"1 除以这一帧的耗时"？因为单帧耗时抖动很大，
   * 数字会疯狂跳动看不清。取半秒的平均值才稳定可读。 */
  frames++;
  if (now - fpsTimer >= 500) {
    fps = Math.round(frames * 1000 / (now - fpsTimer));
    frames = 0;
    fpsTimer = now;
  }

  // ---- 更新：把输入的目标点记下来 ----
  if (input.target) {
    // 限制在画面内，否则手指滑到屏幕外时圈会画到看不见的地方
    pointerMark.x = clamp(input.target.x, 0, world.w);
    pointerMark.y = clamp(input.target.y, 0, world.h);
    pointerMark.active = true;
  }

  // ---- 更新：气泡上浮 ----
  for (const b of bubbles) {
    b.y -= b.speed * dt;      // 乘 dt 是关键：这样不管 60 帧还是 30 帧，上浮速度都一样
    if (b.y < -0.05) {        // 冒出顶就回到屏幕底部，循环利用
      b.y = 1.05;
      b.x = Math.random();
    }
  }

  // ---- 画 ----
  draw(dt);

  /* ---- 刷新自检面板 ----
   * ⚠️ 这里的 if 很重要，是个性能知识点：
   * 改 innerHTML 会让浏览器重新排版（reflow），代价很高。
   * 如果每帧都改（每秒 60 次），手机上会明显吃性能。
   * 所以限制成每 200 毫秒才更新一次文字。 */
  if (now - diagTimer >= 200) {
    updateDiag();
    diagTimer = now;
  }

  requestAnimationFrame(frame);
}


/*
 * 功能：把当前画面整个画出来
 * 参数：dt - 距上一帧的秒数（暂时没用到，留着是因为阶段 1 的鱼会用到）
 * 返回：无
 */
function draw(dt) {
  // 每次画之前先设好缩放，之后所有坐标都按 CSS 像素写
  applyTransform();

  // ---- 背景：从深海到浅海的渐变 ----
  const gradient = ctx.createLinearGradient(0, 0, 0, world.h);
  gradient.addColorStop(0, '#04202e');
  gradient.addColorStop(1, '#0a4a63');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, world.w, world.h);

  // ---- 气泡 ----
  ctx.fillStyle = 'rgba(127, 216, 255, .16)';
  for (const b of bubbles) {
    ctx.beginPath();
    // 相对坐标 × 屏幕尺寸 = 实际坐标
    ctx.arc(b.x * world.w, b.y * world.h, b.r, 0, Math.PI * 2);
    ctx.fill();
  }

  // ---- 屏幕正中间的"玩家鱼"占位 ----
  // 真正的玩家鱼在阶段 1 会用 entities/player.js 实现，这里只是让人看到画面是活的
  drawPlaceholderFish(world.w / 2, world.h / 2);

  // ---- 指针圈：验证"我按哪儿，代码就认为我在哪儿" ----
  if (pointerMark.active) {
    ctx.beginPath();
    // 按住时圈变大变色，用来确认 isPressed 状态也对
    ctx.arc(pointerMark.x, pointerMark.y, input.isPressed ? 24 : 14, 0, Math.PI * 2);
    ctx.strokeStyle = input.isPressed ? '#ffd479' : 'rgba(255, 255, 255, .45)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}


/*
 * 功能：画一条临时占位鱼（阶段 1 会被真正的 Player 类替换）
 * 参数：x, y - 鱼身中心的世界坐标
 * 返回：无
 * 说明：这里演示了 canvas 画复杂图形的标准套路 ——
 *       save() 保存现场 → translate() 把原点挪到鱼身中心 →
 *       这时所有坐标都可以按"以鱼身中心为原点"来写（简单得多）→
 *       restore() 恢复现场，不影响后面的绘制。
 */
function drawPlaceholderFish(x, y) {
  ctx.save();
  ctx.translate(x, y);

  // 鱼身
  ctx.beginPath();
  ctx.ellipse(0, 0, 26, 16, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#7fd8ff';
  ctx.fill();

  // 尾巴
  ctx.beginPath();
  ctx.moveTo(-24, 0);
  ctx.lineTo(-44, -12);
  ctx.lineTo(-44, 12);
  ctx.closePath();
  ctx.fillStyle = '#4aa8d8';
  ctx.fill();

  // 眼睛
  ctx.beginPath();
  ctx.arc(12, -4, 3.5, 0, Math.PI * 2);
  ctx.fillStyle = '#04202e';
  ctx.fill();

  ctx.restore();
}


/*
 * 功能：更新左上角的自检面板
 * 参数：无
 * 返回：无
 */
function updateDiag() {
  const safe = readSafeArea();
  const physicalW = Math.round(world.w * Math.min(window.devicePixelRatio || 1, 2));
  const physicalH = Math.round(world.h * Math.min(window.devicePixelRatio || 1, 2));

  const lines = [
    `<b>① 屏幕适配</b> 可视区 ${world.w}×${world.h} CSS像素 · 画布 ${physicalW}×${physicalH} 物理像素 · DPR ${window.devicePixelRatio} · ${isPortrait() ? '竖屏' : '横屏'}`,
    `<b>② 刘海安全区</b> 上 ${safe.top} · 右 ${safe.right} · 下 ${safe.bottom} · 左 ${safe.left} （单位px，全 0 说明这块屏幕没有刘海或浏览器没报）`,
    `<b>③ 触摸坐标</b> ${input.target
        ? `你按在 (${Math.round(input.target.x)}, ${Math.round(input.target.y)})，画面上那个圈应该正好在你手指底下 · ${input.isPressed ? '按住中' : '已松手'}`
        : '用手指点一下屏幕试试'}`,
    `<b>④ 流畅度</b> ${fps} FPS · 是触摸设备 ${hasTouch ? '是' : '否'} · 独立窗口打开 ${isStandalone ? '是' : '否'}`,
  ];

  diag.innerHTML = lines.join('<br>');
}