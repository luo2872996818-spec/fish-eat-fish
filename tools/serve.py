# -*- coding: utf-8 -*-
r"""
本地开发服务器 —— 专治 Windows 上 `python -m http.server` 把 .js 当纯文本的老毛病。

=============================================================================
问题背景（为什么不能用 python -m http.server）
=============================================================================
浏览器对 <script type="module"> 会强制检查 Content-Type。
如果服务器把 .js 回成 text/plain，浏览器直接拒绝执行，控制台报：

    Failed to load module script: Expected a JavaScript module script
    but the server responded with a MIME type of "text/plain".

而这台电脑上：
    Windows 注册表 HKLM\SOFTWARE\Classes\.js 的 Content Type = text/plain
    Python 的 mimetypes 模块会去读注册表 → 于是 .js 被回成 text/plain
所以 `python -m http.server` 在 Windows 上带 ES Module 的项目里跑不起来。
（GitHub Pages 线上没有这个问题，它返回的 MIME 类型是正确的。）

=============================================================================
这个脚本做了三件事
=============================================================================
  1. 强制把 .js / .mjs 的 MIME 类型设成 text/javascript
  2. 关掉浏览器缓存 —— 改完代码刷新就是最新的，避免"我明明改了怎么没变"
  3. 启动时打印局域网地址，方便手机连过来预览

=============================================================================
用法
=============================================================================
    cd E:\\AIProject\\fish-eat-fish
    python tools\\serve.py            # 默认端口 8000
    python tools\\serve.py 9000       # 换个端口（8000 被占用时用）

然后浏览器打开 http://localhost:8000
手机预览：手机和电脑连同一个 WiFi，访问上面打印的"手机上访问"那个地址。
停止：在这个窗口按 Ctrl + C
"""

import os
import socket
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

# 项目根目录 = 本文件（tools/serve.py）所在目录的上一级
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class DevHandler(SimpleHTTPRequestHandler):
    """在标准静态文件处理器基础上，修正 MIME 类型并禁止缓存。"""

    # 这份表会在类定义时覆盖掉从 Windows 注册表读来的错误结果。
    # 必须在类定义阶段就位，因为 SimpleHTTPRequestHandler 处理请求时会直接查它。
    extensions_map = {
        **SimpleHTTPRequestHandler.extensions_map,
        ".js": "text/javascript",          # ← 就是这一条救了命
        ".mjs": "text/javascript",
        ".css": "text/css",
        ".html": "text/html",
        ".json": "application/json",
        ".svg": "image/svg+xml",
        ".webmanifest": "application/manifest+json",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".webp": "image/webp",
        ".mp3": "audio/mpeg",
        ".ogg": "audio/ogg",
    }

    def end_headers(self):
        # 开发期禁止缓存，否则改完代码刷新还是旧画面
        self.send_header("Cache-Control", "no-store, must-revalidate")
        super().end_headers()

    def log_message(self, fmt, *args):
        # 默认会打印一堆时间戳，这里只留请求行，看着清爽
        sys.stderr.write("  %s\n" % (fmt % args))


def get_local_ip():
    """
    功能：拿到本机在局域网里的 IPv4 地址（给手机访问用）
    返回：形如 "192.168.1.5" 的字符串
    说明：技巧是"连"一个外网地址但不真的发包（UDP 不握手），
          让操作系统自己选一张出口网卡，从而知道本机局域网 IP。
          比到处解析 ipconfig 的输出可靠得多。
    """
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        sock.connect(("8.8.8.8", 80))
        return sock.getsockname()[0]
    except OSError:
        return "127.0.0.1"
    finally:
        sock.close()


def main():
    """功能：解析端口参数、启动服务器、打印访问地址"""
    port = 8000
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            print("端口得是数字，比如：python tools\\serve.py 9000")
            return

    # directory=ROOT：无论从哪个目录启动，都以项目根目录为根目录提供服务
    handler = partial(DevHandler, directory=ROOT)
    # 绑定 0.0.0.0 而不是 127.0.0.1，手机才能从局域网连进来
    httpd = ThreadingHTTPServer(("0.0.0.0", port), handler)

    print("=" * 62)
    print("  大鱼吃小鱼 · 本地开发服务器已启动")
    print("=" * 62)
    print("  电脑上访问：  http://localhost:%d" % port)
    print("  手机上访问：  http://%s:%d" % (get_local_ip(), port))
    print("                （手机要和电脑连同一个 WiFi）")
    print()
    print("  改完代码直接刷新浏览器就行（已关缓存）。")
    print("  按 Ctrl + C 停止。")
    print("=" * 62)

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n已停止。")
    finally:
        httpd.server_close()


if __name__ == "__main__":
    main()