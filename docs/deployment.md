# 部署上线手册 —— 把代码变成「手机点开链接就能玩」

> 这份文档是**给你（人）看的操作手册**，不是给 AI 看的代码说明。
> 每一步都写了「你会看到什么」，照着做就行。卡住了就把报错原文发给 AI。
>
> **进度**：✅ 第 1 步（注册账号）已完成，用户名 `luo2872996818-spec`
> 👉 **下一步：从第 2 步开始**

---

## 0. 总览：我们要做的事

```
你电脑上的代码
      │  ① 上传
      ▼
GitHub 上的仓库（repository）
      │  ② 打开 Pages 开关，GitHub 自动发布
      ▼
https://luo2872996818-spec.github.io/fish-eat-fish/   ← 手机点开就能玩
```

**GitHub Pages 是 GitHub 免费提供的「静态网站托管」服务**：
只要仓库里有 `index.html`，它就能把整个仓库当成一个网站发布出去，
全世界（包括你的手机）都能通过一个网址打开。

不花钱、不用买服务器、不用买域名。代价是：只能托管「静态」内容
（HTML / CSS / JS / 图片），不能跑需要后台的程序 —— 而我们这个纯前端小游戏正好符合。

---

## 第 1 步：注册 GitHub 账号（约 5 分钟，只需做一次）

1. 浏览器打开 https://github.com/signup
2. 按顺序填：
   - **Email**：常用邮箱（后面要收验证码）
   - **Password**：至少 15 位，或者 8 位以上且包含数字和小写字母
   - **Username（用户名）**：⚠️ **这条最重要**，它会出现在你的游戏网址里。
     你的用户名已经确定了，就是 **luo2872996818-spec**，
     所以你的游戏网址就是 **https://luo2872996818-spec.github.io/fish-eat-fish/**
   - **验证码**：GitHub 会往你邮箱发一个 6 位数字
3. 去邮箱点确认链接，完成注册

### 可能遇到的问题

| 现象 | 原因 / 怎么办 |
|---|---|
| 页面打不开、转圈很久 | GitHub 在国内访问不稳定。换个时间段、用手机流量、或者开代理再试 |
| 提示 Username 已被占用 | 换一个，后面加数字，比如 `jiulong-fish-2026` |
| 注册后要求设置 2FA（双重验证） | GitHub 现在对部分账号强制要求。手机装个 `Microsoft Authenticator` 或 `Google Authenticator` 扫码即可 |
| 收不到验证邮件 | 检查垃圾邮件；换个邮箱（推荐 QQ 邮箱、163 都行） |

### 注册完请记住两样东西
- **用户名**（会写进网址）
- **登录邮箱和密码**

把用户名告诉 AI 一次，之后配置提交身份会用到 ——
这样你在 GitHub 上看到的提交记录才会显示成你自己的头像。

---

## 第 2 步：把代码传上去（两条路线，二选一）

### 路线 A：GitHub Desktop（推荐，一劳永逸）

适合场景：你以后要反复改代码、反复更新。
装一个客户端，以后改完点两下就同步，不用背命令。

1. 下载安装：https://desktop.github.com/
2. 打开 GitHub Desktop → `Sign in to GitHub.com` → 浏览器里点授权 → 回到客户端
3. 菜单 `File` → `Add local repository...`
4. 路径选择：`E:\AIProject\fish-eat-fish`
5. 左侧会出现一堆文件（都是待提交的新文件）→ 左下角 `Summary` 里填一句
   `第一版部署自检页` → 点蓝色按钮 **Commit to main**
6. 顶部会出现 **Publish repository** 按钮 → 点它
   - **Name** 填 `fish-eat-fish`
   - ⚠️ **务必取消勾选 "Keep this code private"**
     （免费账号的 Pages 只对 Public 仓库稳定可用；游戏本来也要分享给别人）
   - 点 **Publish repository**
7. 完成后去 https://github.com/luo2872996818-spec?tab=repositories 看看，仓库应该在了

### 路线 B：只用网页上传（零安装）

适合场景：不想装软件，只想先跑通一次。

1. 打开 https://github.com/new
2. 填写：
   - **Repository name**：`fish-eat-fish`（必须全小写，和本地文件夹名一致）
   - **Public / Private**：选 **Public**
   - ⚠️ **不要勾** "Add a README file"、".gitignore"、"license"
     （本地已经有这些文件了，勾了会造成冲突，第一次上传就会卡住）
3. 点 **Create repository**
4. 新页面里找到链接 **uploading an existing file** → 点进去
5. 打开资源管理器，进入 `E:\AIProject\fish-eat-fish`，
   **全选里面的内容**（`index.html`、`.gitignore`、`docs`、`v1` 等），
   拖进浏览器那个上传框
   - ⚠️ 拖「文件夹里的内容」，不是拖 `fish-eat-fish` 文件夹本身
   - ⚠️ `.gitignore` 是隐藏文件，资源管理器要勾选「查看 → 显示 → 隐藏的项目」才看得到。
     漏了它不影响游戏运行，只是以后会多传一些垃圾文件
6. 下方 `Commit changes` 里填一句说明 → 点绿色按钮提交

---

## 第 3 步：打开 Pages 开关（关键一步）

1. 打开仓库页面 `https://github.com/luo2872996818-spec/fish-eat-fish`
2. 点顶部 **Settings**（齿轮图标）
3. 左侧栏往下滚，找到 **Pages** → 点进去
4. **Source** 区域：
   - 选择 **Deploy from a branch**（从分支部署）
5. **Branch** 区域：
   - 下拉框选 **main**
   - 右边的文件夹下拉框选 **/ (root)** ← 必须是 root，不能选 /docs
   - 点 **Save**
6. 页面刷新后回到 Pages，顶部会出现一行：
   > Your site is live at `https://luo2872996818-spec.github.io/fish-eat-fish/`

   ⚠️ 刚保存时可能显示 "Your site is being built"，**等 1~2 分钟**就好。

---

## 第 4 步：验证（在手机上）

1. 手机浏览器打开：`https://luo2872996818-spec.github.io/fish-eat-fish/`
2. 你应该看到：屏幕上有一个深蓝色渐变背景、中间一条蓝色小鱼、几个上浮的气泡、
   左上角一个信息面板。
3. **用手指点一下屏幕** → 手指底下应该出现一个圈，并且信息面板里的
   **「③ 触摸坐标」**会跟着变。
   - 圈出现在手指**底下**才算对。如果圈偏了，说明坐标换算有问题，告诉 AI。
4. 面板里的 **「④ 流畅度」**应该稳定在 **55~60 FPS**（手机省电模式下可能低一些）。
5. 屏幕**不能上下滚动**、**不能双指放大** —— 能滚动就说明 CSS 的适配还没生效。

### 加分操作：添加到主屏幕
- **iPhone（Safari）**：点底部「分享」→「添加到主屏幕」
- **安卓（Chrome）**：点右上角三个点 →「添加到主屏幕」
- 之后从桌面图标打开，没有地址栏，看着就像个真正的 App。

---

## 第 5 步：以后怎么更新代码

改完代码后：

**路线 A（GitHub Desktop）**
1. 打开 GitHub Desktop，左下角会列出你改了哪些文件
2. 填一句说明（比如「加了吃鱼变大的逻辑」）
3. 点 **Commit to main**
4. 点顶部 **Push origin**
5. 等 1 分钟左右，手机刷新页面（可能需要强制刷新：下拉一次）就看到新版了

**路线 B（网页上传）**
1. 进入仓库 → 点进要改的文件 → 点右上角铅笔图标编辑 → 提交
   （只适合小改动；传整个文件夹的话，用 `Add file` → `Upload files` 会覆盖同名文件）

> 💡 **小技巧**：手机上看到的是旧版？下拉刷新不行就换个浏览器标签，
> 或者地址后面加 `?v=2` 再打开，绕开缓存。

---

## 6. 踩坑速查表

| 现象 | 原因 | 解决 |
|---|---|---|
| 打开是 404 | Pages 还没构建完 / 分支选错 / 文件夹选成了 /docs | 等 1~2 分钟；回 Settings → Pages 检查分支是不是 main、目录是不是 /(root) |
| 打开是一个空白页或只有一行字 | `index.html` 不在仓库根目录 | 确认仓库根目录下能直接看到 `index.html` |
| 页面打开但**样式全丢、文字是默认字体** | `style.css` 路径大小写不对 | **GitHub Pages 跑在 Linux 上，文件名区分大小写**！本地 Windows 不区分，所以本地正常、线上出错。本项目所有文件名一律小写，就是为了避开这个坑 |
| 手机上能打开，但**点屏幕没反应** | JS 报错了 | 手机上看不到控制台。用电脑的 Chrome 打开同一网址 → F12 → Console 看红色报错，把报错发给 AI |
| 手机上画面有白边 / 被地址栏挡住 | CSS 的 `--vh` 没生效 | 告诉 AI，附上你的手机型号 |
| 改完代码，手机上还是旧版 | 浏览器缓存 | 强制刷新 / 加 `?v=2` / 清缓存 |
| 本地预览页面全空白，控制台报 `Failed to load module script: ... MIME type of "text/plain"` | 这台电脑的 Windows 注册表把 `.js` 登记成了 `text/plain`，`python -m http.server` 会照抄这个结果 | 改用本项目自带的 `python tools\serve.py`，它强制返回正确的 `text/javascript` |
| 手机上出现 `404 favicon.ico` | 浏览器自动找网站图标 | 已用内联 SVG 图标解决，不该再出现 |
| 上传后仓库里少了 `.gitignore` | 隐藏文件没显示 | 不影响运行，可以先忽略 |

---

## 7. 可选：本地预览（写完代码先在电脑上看）

因为代码用了 `type="module"`，**不能直接双击 `index.html`**（浏览器会以 `file://`
协议加载，模块会被 CORS 拦截，控制台报 `Access to script ... has been blocked`）。

要在项目文件夹里起一个本地服务器（一行命令）：

```powershell
cd E:\AIProject\fish-eat-fish
python tools\serve.py
```

然后浏览器打开 http://localhost:8000

**想在手机上预览本地版本**（不部署也能测）：
1. 电脑和手机连**同一个 WiFi**
2. 电脑上执行 `ipconfig`，找到「无线局域网适配器 WLAN」下的 **IPv4 地址**
   （长得像 `192.168.1.5`）
3. 手机浏览器访问 `http://192.168.1.5:8000`
4. 如果打不开：多半是 Windows 防火墙拦了，弹窗时选「允许访问」

> 本地预览适合快速改代码；正式分享给别人还是要用 GitHub Pages。