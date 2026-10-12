/* =========================================================================
 *  platform/viewport.js —— 画布尺寸与坐标换算
 *  -------------------------------------------------------------------------
 *  这个文件只干一件事：把"屏幕"和"游戏世界"这两套坐标系对齐。
 *
 *  为什么要单独一个文件？
 *  手机屏幕千差万别（刘海、地址栏、横竖屏、各种分辨率），
 *  如果到处散落 window.innerWidth，改起来会疯。全部收在这里，只此一份。
 *
 *  【PC 接口预留】将来要上 PC，需要改的只是这个文件里的缩放策略，
 *  游戏逻辑（entities/、systems/）一行都不用动。
 * ========================================================================= */

/* 拿到 canvas 元素和它的 2D 绘制上下文（ctx = context，绘图工具箱） */
export const canvas = document.getElementById('game');
export const ctx = canvas.getContext('2d');

/* 游戏世界的尺寸，单位是 CSS 像素。
 *
 * 【重要设计决定】我们没有用"固定逻辑尺寸"（比如一律按 720×1280 来设计），
 * 而是让世界大小 = 屏幕可视区域大小。这样做的原因：
 *   1. 鱼的位置可以直接用屏幕坐标存，不需要来回换算，代码少一半；
 *   2. 竖屏、横屏、手机、电脑全都自然成立，不用为每种屏幕重做一套；
 *   3. 以后要加"会滚动的更大的海"时，只要给 world 加上 camera（相机）概念即可。
 * 代价：不同尺寸的屏幕上要保持玩法公平，难度数值需要按屏幕面积缩放 ——
 * 这件事阶段 2 做难度曲线时在处理 config.js 里统一处理。 */
export const world = { w: 0, h: 0 };

/* 设备物理像素 / CSS 像素 的比值。
 * iPhone 常见是 3，很多安卓是 2.75 或 3，老电脑是 1。
 * 画面要清晰就必须把画布按这个倍数放大，见下面 resize()。 */
export let dpr = 1;

/* 被 ResizeObserver 观察的元素（就是 .stage）。
 * 之所以观察 .stage 而不是 window，是因为手机上地址栏收起时
 * window 的尺寸不一定变化，但 .stage 的实际占位会变。 */
const stage = document.getElementById('stage');

/* 高清屏的倍数上限。
 * 设成 3 时画面更清晰，但每帧要填充的像素是 2 倍时的 2.25 倍，手机会掉帧。
 * 封顶 2 是"清晰度"和"流畅度"的折中 —— 这是从参考项目里学到的经验值。 */
const MAX_DPR = 2;


/*
 * 功能：重新计算画布尺寸，并把画布放大到物理像素
 * 参数：无
 * 返回：无
 * 何时调用：页面加载时、窗口尺寸变化时、手机转屏时、地址栏收起时
 */
export function resize() {
  // 每次都要重新读，因为 devicePixelRatio 在"手机连外接屏"等场景下会变
  dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);

  // 用 getBoundingClientRect() 拿真实占位大小，它已经扣掉了 .stage 上的
  // 安全区内边距（刘海那部分），所以这里得到的才是"能画东西的地方"。
  const rect = stage.getBoundingClientRect();
  world.w = Math.round(rect.width);
  world.h = Math.round(rect.height);

  /* canvas 有两套尺寸，是初学最容易混的地方：
   *
   *   canvas.width / canvas.height         = 物理像素，画布"内存"的真实大小
   *                                          → 决定画面清不清晰
   *   canvas.style.width / canvas.style.height = CSS 像素，它在页面上占多大
   *                                          → 决定画面占屏幕多少
   *
   * 两者之比就是 dpr。只改一个，画面就会模糊或者被拉伸变形。 */
  canvas.width = Math.max(1, Math.round(world.w * dpr));
  canvas.height = Math.max(1, Math.round(world.h * dpr));
  canvas.style.width = world.w + 'px';
  canvas.style.height = world.h + 'px';
}


/*
 * 功能：每帧绘制前调用一次，把坐标系设成"1 个单位 = 1 个 CSS 像素"
 * 参数：无
 * 返回：无
 * 说明：有了它，游戏逻辑里所有坐标都按 CSS 像素写，
 *       永远不用手写 `* dpr` —— 缩放这件事只在这一个地方发生。
 */
export function applyTransform() {
  // setTransform(横向缩放, 斜切, 斜切, 纵向缩放, 横向平移, 纵向平移)
  // 每个参数都重置一遍很重要：不重置的话，多次调用会不断叠加变形。
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}


/*
 * 功能：把"手指/鼠标在屏幕上的位置"换算成"游戏世界坐标"
 * 参数：clientX, clientY - 事件对象里的屏幕坐标
 * 返回：{ x, y } —— 世界坐标
 */
export function toWorld(clientX, clientY) {
  // 不能用 rect.left 直接算吗？可以，但用 getBoundingClientRect 更稳：
  // 它每次都是最新的（比如页面刚滚动过、安全区变化过）。
  const rect = canvas.getBoundingClientRect();
  return { x: clientX - rect.left, y: clientY - rect.top };
}


/*
 * 功能：开始监听尺寸变化，并立刻先算一次
 * 参数：onResize - 每次重算之后要额外执行的函数（可省略）
 * 返回：无
 */
export function watchResize(onResize) {
  const handler = () => {
    resize();
    if (onResize) onResize();
  };

  handler(); // 先立刻算一次，否则第一帧拿到的是 0×0

  /* ResizeObserver：元素尺寸一变就通知我。
   * 它比 window 的 resize 事件可靠得多 —— 手机地址栏收起时，
   * window 有时不会发 resize，但元素尺寸确实变了。 */
  if (window.ResizeObserver) {
    new ResizeObserver(handler).observe(stage);
  }
  window.addEventListener('resize', handler);

  /* 转屏后浏览器需要一小会儿才能把新尺寸算好，
   * 立刻执行会读到旧的（错误）尺寸，所以延迟 120ms 再补算一次。 */
  window.addEventListener('orientationchange', () => setTimeout(handler, 120));
}