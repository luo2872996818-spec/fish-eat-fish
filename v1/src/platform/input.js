/* =========================================================================
 *  platform/input.js —— 输入抽象层
 *  -------------------------------------------------------------------------
 *  「手机优先、PC 也能玩」这件事的关键，就是这一层。
 *
 *  对外只暴露一个 input 对象，游戏逻辑（entities/、systems/）只读它，
 *  永远不直接碰事件对象 —— 这是本项目最重要的一条架构纪律。
 *
 *  ---------------------------------------------------------------------
 *  为什么用 Pointer Events（pointerdown/pointermove/pointerup）
 *  而不是老一套 touchstart/touchmove/touchend？
 *
 *  因为浏览器把"手指""鼠标""触控笔"统一成了同一种 pointer 事件：
 *      手机：手指按下   → pointerdown
 *      电脑：鼠标按下   → 也是 pointerdown
 *      平板：触控笔     → 还是 pointerdown
 *
 *  同一份代码三种设备都能跑，不需要写 `if (是手机) {...} else {...}` 两套逻辑。
 *  这就是"PC 端接口"最自然的实现方式：不是留空位，而是从第一天就能用鼠标玩。
 *  ========================================================================= */

import { toWorld } from './viewport.js';

/* -------------------------------------------------------------------------
 *  游戏只需要知道三件事，全都挂在这个对象上
 * ---------------------------------------------------------------------- */
export const input = {
  /* 「我要去哪」—— 世界坐标；没有操作时为 null */
  target: null,

  /* 「现在是不是按着」—— 用来区分"松手滑行中"和"完全没在操作" */
  isPressed: false,

  /* 按钮类操作（开始游戏、重新开始…）。
   * 用 Set 装：一帧内同一个按键按两次也只算一次。 */
  actions: new Set(),

  /*
   * 功能：取走并清空某个按钮操作
   * 参数：name - 操作名，如 'restart'
   * 返回：true 表示这一帧确实按到了
   * 说明：必须"取走就清空"，否则按住键不放会连续触发好几帧 —— 这是新手常见 bug。
   */
  takeAction(name) {
    if (!this.actions.has(name)) return false;
    this.actions.delete(name);
    return true;
  },
};


/*
 * 功能：初始化所有输入监听
 * 参数：element - 接收事件的元素。传 .stage，不要传 canvas ——
 *                因为覆盖在上面的 HUD / 按钮也应该是可以点的。
 * 返回：无
 */
export function initInput(element) {

  /* =====================================================================
   *  一、触摸 + 鼠标 + 触控笔（Pointer Events，一套顶三套）
   * =================================================================== */

  const updateTarget = (event) => {
    input.target = toWorld(event.clientX, event.clientY);
  };

  element.addEventListener('pointerdown', (event) => {
    input.isPressed = true;
    updateTarget(event);

    /* 让这个元素"抓住"后续的 move / up 事件。
     * 没有这一行：手指滑出元素边界后事件就断了，表现为"鱼卡在半路不动了"。
     * 加了它，哪怕手指滑到屏幕边缘外，事件依然会送到这里。 */
    if (element.setPointerCapture) {
      element.setPointerCapture(event.pointerId);
    }
  });

  element.addEventListener('pointermove', (event) => {
    /* 鼠标有个坑：不按键、只是在屏幕上划过，也会收到 pointermove。
     * 那时 event.buttons 是 0。这种情况不应该改变目标点，
     * 否则你只是把鼠标挪到别处，鱼就自己游过去了 —— 很莫名其妙。
     * 手指没有这个问题（不接触就不产生事件），所以只对鼠标做判断。 */
    if (event.pointerType === 'mouse' && event.buttons === 0 && !input.isPressed) {
      return;
    }
    updateTarget(event);
  });

  element.addEventListener('pointerup', () => {
    input.isPressed = false;

    /* 【设计选择】松手后保留 target（目标点），鱼会"滑行"到那个点再停下，
     * 比"一松手就急刹车"自然得多。
     * 如果你想要"松手立刻停"，把下面这行的注释去掉即可： */
    // input.target = null;
  });

  /* 系统来电话、切到别的 App、弹出通知 —— 浏览器会发 pointercancel。
   * 这时必须复位，否则回到游戏后鱼会一直朝某个方向跑。 */
  element.addEventListener('pointercancel', () => {
    input.isPressed = false;
    input.target = null;
  });

  /* 长按（或电脑上右键）会弹出菜单，游戏里必须屏蔽 */
  element.addEventListener('contextmenu', (event) => event.preventDefault());


  /* =====================================================================
   *  二、键盘（PC 端）
   *  ---------------------------------------------------------------------
   *  【PC 升级接口】现阶段只接了一个"R 键重开"。
   *
   *  以后要做 WASD / 方向键移动，就在 input 上加一个字段，比如：
   *      input.moveVector = { x: 0, y: 0 }   // 方向键按下的方向
   *  然后在这里用 keydown 记下按键、keyup 清掉按键。
   *  游戏逻辑那边只需要加一句"有 moveVector 就优先用它，否则用 target"。
   *
   *  也就是说：加一整套键盘操作，游戏逻辑层只改一行判断。
   *  这就是"平台层"存在的意义 —— 把"设备差异"全部隔离在这里。
   * =================================================================== */

  window.addEventListener('keydown', (event) => {
    if (event.key === 'r' || event.key === 'R') {
      input.actions.add('restart');
      event.preventDefault();   // 阻止浏览器把 R 当成它自己的快捷键
    }
  });


  /* =====================================================================
   *  三、页面切到后台时复位
   * =================================================================== */
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      input.isPressed = false;
      input.target = null;
    }
  });
}