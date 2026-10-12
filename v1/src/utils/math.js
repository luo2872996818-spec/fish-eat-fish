/* =========================================================================
 *  utils/math.js —— 通用小工具（纯数学，和游戏内容无关）
 *  -------------------------------------------------------------------------
 *  放在 utils/ 的意思是：这些函数不关心"鱼"和"分数"，
 *  换个游戏照样能用。以后要写单元测试，也是测这些函数最省事。
 * ========================================================================= */


/*
 * 功能：把数值限制在 [min, max] 之间
 * 参数：v - 待限制的值；min / max - 上下限
 * 返回：限制后的值
 * 用途：防止鱼游出屏幕、防止速度超过上限
 */
export function clamp(v, min, max) {
  if (v < min) return min;
  if (v > max) return max;
  return v;
}


/*
 * 功能：求两点之间的距离
 * 参数：(x1, y1) 第一个点；(x2, y2) 第二个点
 * 返回：距离值
 * 用途：碰撞判定 —— 两条鱼的圆心距离小于半径之和就是"撞上了"
 */
export function distance(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}


/*
 * 功能：生成 [min, max) 区间内的随机小数
 * 参数：min - 下限（含）；max - 上限（不含）
 * 返回：随机数
 * 用途：敌方鱼从屏幕外随机位置出现
 */
export function randomRange(min, max) {
  return min + Math.random() * (max - min);
}


/*
 * 功能：从数组里随机取一个元素
 * 参数：list - 数组
 * 返回：随机选中的元素
 * 用途：随机挑一种鱼的外观 / 随机挑一个生成位置
 */
export function randomPick(list) {
  return list[Math.floor(Math.random() * list.length)];
}


/*
 * 功能：线性插值 —— 在 a 和 b 之间按比例 t 取一个值
 * 参数：a - 起点；b - 终点；t - 比例（0 得 a，1 得 b）
 * 返回：插值结果
 * 用途：做"渐变"效果，比如难度随时间从简单慢慢变难
 */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}