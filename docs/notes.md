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

---

## [2026-10-12] 部署上线（阶段 0 完成）

### 结果

**线上地址：https://luo2872996818-spec.github.io/fish-eat-fish/**
仓库：https://github.com/luo2872996818-spec/fish-eat-fish

线上验收 13 项全部通过：根地址正确跳转到 `/v1/`、无 404、无 JS 报错、
画布 780×1688 物理像素正确、`touch-action: none`、页面不可滚动、
**触摸坐标精确**（三组采样点全部命中）、60 FPS。

### 踩坑：curl 和 git 都不走 Windows 系统代理（重要）

**现象**：Edge 能正常打开 github.com，但命令行里 `curl https://github.com` 和
`git ls-remote https://github.com/...` 全部超时（`Failed to connect ... after 21s`）。

**根因**：这台机器开着本地代理（`HKCU\...\Internet Settings` 里
`ProxyEnable=1`、`ProxyServer=127.0.0.1:7900`）。
- Edge / PowerShell 的 `Invoke-WebRequest` 会**读系统代理设置**，所以能通；
- **curl 和 git 不读**，它们只看环境变量 `HTTPS_PROXY` 或自己的配置，所以直连超时。

**验证方法**（有用的排查套路）：

```powershell
# 读系统代理
Get-ItemProperty "HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings" |
  Select-Object ProxyEnable, ProxyServer

# PowerShell 走系统代理 → 通
Invoke-WebRequest https://github.com -UseBasicParsing -TimeoutSec 25

# curl 显式指定代理 → 通
curl.exe --proxy http://127.0.0.1:7900 https://api.github.com/user

# git 显式指定代理 → 通
git -c http.proxy=http://127.0.0.1:7900 ls-remote https://github.com/...
```

**解决**：本仓库已设置 `git config http.proxy http://127.0.0.1:7900`（**只作用于本仓库**，
是本地开发配置，不在版本控制里）。
⚠️ 如果哪天代理软件关了、或者端口变了，`git push` 会连不上 —— 那时执行
`git config --unset http.proxy` 去掉它即可。

### 踩坑：PowerShell 发 JSON 请求体被 GitHub 拒收

`Invoke-RestMethod -Body ($obj | ConvertTo-Json)` 调 GitHub API 建仓库时返回
`400 Problems parsing JSON`（PowerShell 5.1 的请求体编码问题）。

**解决**：把 JSON 用 `[System.IO.File]::WriteAllText` 写成 **UTF-8 无 BOM** 的文件，
再用 `curl.exe --data-binary "@文件"` 发送，绕开 PowerShell 的编码处理。
以后凡是往 API 发中文 JSON，都用这个套路。

### 这次是怎么发布的（可复现的步骤）

因为没有 `gh` 命令行工具，是靠 GitHub REST API + git 完成的，全程没用网页界面：

1. 用令牌验证身份：`GET /user`
2. 建仓库：`POST /user/repos`
3. 配置提交身份为 GitHub 的 noreply 邮箱（既关联头像，又不暴露真实邮箱）：
   `253884885+luo2872996818-spec@users.noreply.github.com`
4. 推送：`git -c "http.extraheader=Authorization: Basic <base64>" push -u origin main`
   —— 用**一次性 extraheader** 传凭据，**不写进 `.git/config`**、不留痕
5. 开 Pages：`POST /repos/{owner}/{repo}/pages`，body `{"source":{"branch":"main","path":"/"}}`
6. 轮询 `GET .../pages` 直到 `status = built`，再用 `tools/check-deploy.mjs` 验收

### 以后更新代码的流程

```
改代码 → git add -A → git commit -m "说明" → git push
        → 等 1 分钟 GitHub Pages 自动重新构建 → 手机刷新即可
```

或者用 GitHub Desktop 点两下。**关键**：改完推送后一定要跑一次
`node tools/check-deploy.mjs https://luo2872996818-spec.github.io/fish-eat-fish/`
—— 让脚本告诉你线上到底有没有问题，而不是靠肉眼看。


---

## 阶段总结：阶段 0 —— 部署自检（按 AGENTS.md 的总结模板）

### 完成了什么？

- `requirements.md`（需求文档，含"不做什么"清单）和 `design.md`（设计文档，含数值表初稿）
- 平台适配层 `platform/`：`viewport.js`（尺寸/DPR/坐标换算）、
  `input.js`（Pointer Events 统一触摸和鼠标）、`device.js`（安全区、设备能力）
- 手机端适配 `style.css`：dvh 视口高度、刘海安全区、禁下拉刷新、禁双击缩放、防长按选中
- 部署自检页 `v1/index.html` + `main.js`：能显示屏幕尺寸、DPR、安全区、触点坐标、帧率
- 两个自研工具：`tools/serve.py`（本地服务器）、`tools/check-deploy.mjs`（线上验收，13 项）
- 文档：`README.md`、`deployment.md`（部署手册）、`notes.md`（本文件）
- **已上线**：https://luo2872996818-spec.github.io/fish-eat-fish/
- **真机验证通过**：手机上打开正常，60 FPS

### 遇到的问题

| 问题 | 解决方式 |
|---|---|
| Windows 注册表把 `.js` 登记为 `text/plain`，导致 ES Module 被浏览器拒绝执行 | 自写 `tools/serve.py` 强制返回 `text/javascript` |
| curl 和 git 不读 Windows 系统代理，连不上 github.com | 显式指定 `--proxy` / `http.proxy` |
| PowerShell 5.1 发 JSON 请求体被 GitHub 拒收（400） | 改成写 UTF-8 无 BOM 文件 + `curl --data-binary` |
| 无头浏览器截图抓得太早，看起来像 JS 没跑 | 改成等真实时间后再抓；学会用 DevTools Protocol 控制时机 |

### 学到了什么？

- **"页面空白"先看 F12 的 Console 和 Network**，别盯着代码猜。MIME、404、CORS 这三类问题的报错都很明确
- **验证要拿数据说话**：与其目视"看起来没问题"，不如派发一次真实触摸、把页面里读到的坐标打出来比对
- **平台差异要关在一层里**：把"屏幕多大、用什么东西输入"全部收敛到 `platform/`，
  上层代码不知道自己在手机上还是电脑上 —— 这样将来加键盘、改横屏都不用动玩法代码
- **部署形态要一开始就想好**：游戏放 `v1/` 而不是根目录，以后升级不破坏已分享的链接

### 下一阶段的计划

阶段 1：骨架能动

- `main/config.js`：把所有数值集中起来（design.md 第 6 节的数值表）
- `main/game-loop.js`：固定步长循环
- `entities/player.js`：玩家鱼 —— 加速度、阻尼、限速、朝向、边界限制
- `systems/render.js`：把背景、气泡、玩家鱼画出来
- 验收：手机上手指拖动，鱼平滑跟随并转向；松手滑行减速；撞边界停住不出去
