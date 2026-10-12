/* =========================================================================
 *  platform/device.js —— 设备信息探测
 *  -------------------------------------------------------------------------
 *  自检页要用这些信息，帮你确认"代码在真机上看到的到底是什么"。
 *  以后做难度调整（比如小屏手机上鱼不能太大、否则没地方躲）也会用到。
 *
 *  和 viewport.js 的分工：
 *    viewport.js —— 只管"尺寸多大、怎么换算"
 *    device.js   —— 管"这是台什么设备、有什么能力"
 * ========================================================================= */

/* 是否支持触摸。
 * ⚠️ 注意：带触屏的 Windows 笔记本这里也是 true，
 * 所以它不能用来判断"这是不是手机"，只能用来判断"要不要提示用手指操作"。 */
export const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

/* 是否以"添加到主屏幕"的独立窗口方式打开（这时没有浏览器地址栏，像原生 App）。
 * 两个写法要都判断：
 *   matchMedia(...)        —— 安卓 Chrome / 新版 Safari
 *   navigator.standalone   —— 老版本 iOS Safari 的私有属性 */
export const isStandalone =
  window.matchMedia('(display-mode: standalone)').matches ||
  window.navigator.standalone === true;


/*
 * 功能：读取安全区（刘海 / 挖孔 / 底部手势条）占用的内边距
 * 参数：无
 * 返回：{ top, right, bottom, left }，单位 px
 *
 * 说明：CSS 里已经用 env(safe-area-inset-*) 处理过布局了，
 *       这里再读一份是因为两件事：
 *         1. 自检页要把它显示出来，让你看见刘海到底占了多少；
 *         2. 阶段 2 要算"鱼不能游进刘海底下"，那时需要具体数值。
 */
export function readSafeArea() {
  const style = getComputedStyle(document.documentElement);
  const read = (name) => parseFloat(style.getPropertyValue(name)) || 0;
  return {
    top: read('--safe-t'),
    right: read('--safe-r'),
    bottom: read('--safe-b'),
    left: read('--safe-l'),
  };
}


/*
 * 功能：粗略判断当前是不是竖屏
 * 返回：true = 竖屏（高 >= 宽）
 * 说明：不要用 screen.orientation，那个在部分浏览器上不准；
 *       直接比窗口的宽高最可靠。
 */
export function isPortrait() {
  return window.innerHeight >= window.innerWidth;
}