# 开发笔记

> 记录「遇到了什么问题、怎么解决的、下次怎么避免」。
> 按 `AGENTS.md` 的要求，踩过坑就要写下来 —— 不然下次还踩。

---

## [2026-10-12] 阶段 0：部署自检包

### 今天做了什么

1. 读了参考项目 `https://yhsome.github.io/BigNaiWa/`，拆出它「手机点开链接就能玩」的三个关键做法
2. 定了项目形态：**GitHub Pages 静态站点 + 版本化目录**（根目录跳转 → `v1/`）
3. 搭好目录结构，写了平台适配层 `platform/`（viewport / input / device）
4. 写了 `v1/` 的**部署自检页**：验证手机适配、触摸定位、帧率
5. 写了 `docs/deployment.md` 部署手册、`README.md`、`.gitignore`、`tools/serve.py`
6. 做了端到端验证（不是"看起来没问题"，是真的用浏览器跑了一遍）

### 关键决策记录（为什么这样做）

| 决策 | 选择 | 为什么 |
|---|---|---|
| 游戏放 `v1/` 而不是根目录 | 根目录只放一个跳转页 | 以后升 v2 时，已分享的链接不失效，老版本还能访问 |
| 用 ES Module 分文件 | `type="module"` + `import/export` | 变量不互相污染，依赖关系写在代码里，不靠 `<script>` 的先后顺序 |
| 输入用 Pointer Events | `pointerdown/move/up` | 一套代码同时覆盖手指、鼠标、触控笔 —— 「手机优先 + PC 可玩」不用写两套 |
| 世界坐标 = 屏幕可视区 | 不设固定逻辑分辨率 | 竖屏横屏手机电脑全都自然成立，不用为每种屏幕重做一套 |
| 画布 DPR 封顶 2 | `Math.min(devicePixelRatio, 2)` | 设成 3 清晰度提升有限，但每帧要画的像素翻 2.25 倍，手机会掉帧 |
| 所有文件名小写 | 全部小写 | GitHub Pages 跑在 Linux 上**区分大小写**，本地 Windows 不区分，大小写不一致会导致"本地正常、线上 404" |

### 今天踩的坑

#### 坑 1：`python -m http.server` 在这台电脑上会毁掉 ES Module（重要）

**现象**：本来打算用最常见的 `python -m http.server 8000` 做本地预览，
但实际测试发现 `.js` 文件被当成 `text/plain` 返回。

**为什么是致命的**：浏览器对 `<script type="module">` 会**强制检查 Content-Type**。
`text/plain` 会被直接拒绝执行，控制台报：

```
Failed to load module script: Expected a JavaScript module script
but the server responded with a MIME type of "text/plain".
```

表现是页面一片空白，而且报错信息藏得很深，初学者很容易以为是代码写错了。

**根因**（一步步查出来的）：

```
Windows 注册表  HKLM\SOFTWARE\Classes\.js   的 Content Type = text/plain
        ↓
Python 的 mimetypes 模块会去读注册表
        ↓
mimetypes.guess_type("a.js")  →  ('text/plain', None)
        ↓
python -m http.server 照着这个结果返回
```

**怎么发现的**：不是靠读代码猜的，是**真的起了一个服务器、用 curl 看响应头**才发现的。
验证命令：

```powershell
curl.exe -sS -o NUL -w "%{content_type}`n" http://localhost:8000/v1/src/main/main.js
```

**解决**：写了 `tools/serve.py`，在 `SimpleHTTPRequestHandler.extensions_map`
里把 `.js` / `.mjs` 强制改成 `text/javascript`，顺便关掉缓存（避免"我明明改了怎么没变"）。

**下次怎么避免**：看到"页面空白"时，**第一步永远是打开 F12 看 Console 和 Network**，
别盯着代码猜。MIME 类型、404、CORS 这三类问题的报错其实都写得很清楚。

#### 坑 2：`favicon.ico` 的 404

浏览器会自动请求网站图标，没提供就会在 Network 面板留一条红色 404，
容易让人误以为代码有问题。解决：`v1/index.html` 里加一行**内联 SVG 图标**
（写成 `data:` URI），既不产生额外请求，也顺手让标签页有个鱼的样子。

#### 坑 3：截图/`--dump-dom` 抓得太早，看起来像代码没跑

第一次用无头浏览器截图时，左上角面板还停在「正在自检…」，
差点误判成 JavaScript 报错。真实原因是：截图发生在页面加载完的瞬间，
而面板要等 200ms 才刷新（为了性能，只每 200ms 更新一次 DOM）。

**教训**：`--dump-dom` 和 `--screenshot` 是"加载完立刻抓"，
验证动态页面必须等一段真实时间再抓，或者干脆用 DevTools Protocol 控制。

### 今天的验证结果（都是实测）

| 验证项 | 结果 |
|---|---|
| JavaScript 语法（`node --check`，按 ES Module 解析） | 5 个文件全部通过 |
| `import` 路径是否存在（大小写敏感） | 5 条全部命中 |
| 本地服务器返回的 MIME 类型 | `text/javascript` ✓（修好后） |
| 页面加载后是否有 JS 报错 | 0 个 |
| 失败的网络请求 | 0 个（修好 favicon 后） |
| 画布尺寸 | 390×844 CSS 像素 → 780×1688 物理像素，DPR 封顶 2 ✓ |
| 模拟手指按 (200, 400) | 读到的坐标是 (200, 400) ✓ |
| 模拟手指拖到 (120, 600) | 读到的坐标是 (120, 600) ✓ |
| 松手状态 | `isPressed` 正确变回 false ✓ |
| 帧率 | 60 FPS ✓ |
| 页面可否滚动 | `scrollHeight == innerHeight`，不可滚动 ✓ |
| `touch-action` / `overscroll-behavior` / `user-select` | none / none / none ✓ |

### 待办 / 已知不足

- [ ] iOS 上「添加到主屏幕」目前用的是页面截图当图标（iOS 不认 SVG 图标，
      需要一张 180×180 的 PNG 才行）。属于锦上添花，优先级低。
- [ ] 还没在**真机**上测过（目前只在桌面版 Edge 的手机模拟模式下测过）。
      真机测试要在阶段 1 结束前补上。
- [ ] 阶段 1 开始时要写 `requirements.md` 和 `design.md`。

### 下一步

阶段 1：骨架能动 —— 一条真正的玩家鱼跟着手指游动，带加速度和阻尼，撞到边界不会跑出去。