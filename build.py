#!/usr/bin/env python3
"""把 src/ 下的 CSS 与分段 JS 组装成单文件 HTML（无构建依赖）。

图标（assets/icons-web/*.png）在构建时内联为 base64 data URI，
写进生成的 src/icons-data.js，保证单文件 HTML 在 file:// 与 WKWebView 下都自包含。
"""
import base64
import pathlib

root = pathlib.Path(__file__).resolve().parent
src = root / "src"
shell = (src / "shell.html").read_text(encoding="utf-8")
css = (src / "style.css").read_text(encoding="utf-8")

# ---- 1. 生成图标内联数据 ----
icon_dir = root / "assets" / "icons-web"
lines = ["/* 自动生成：图标 base64 内联（由 build.py 产出，勿手改） */", "const ICON_DATA = {"]
if icon_dir.is_dir():
    for f in sorted(icon_dir.glob("*.png")):
        b64 = base64.b64encode(f.read_bytes()).decode("ascii")
        lines.append(f'  {f.stem!r}: "data:image/png;base64,{b64}",')
lines.append("};")
(src / "icons-data.js").write_text("\n".join(lines) + "\n", encoding="utf-8")

# ---- 2. 拼接 JS ----
js_order = ["icons-data.js", "core.js", "persist.js", "ui.js", "views.js",
            "views2.js", "forms.js", "purchase.js", "app.js"]
parts = []
for name in js_order:
    body = (src / name).read_text(encoding="utf-8")
    parts.append(f"/* ==================== {name} ==================== */\n{body}")
js = "\n\n".join(parts)

out = shell.replace("/*__CSS__*/", css).replace("/*__JS__*/", js)
target = root / "宠物账本.html"
target.write_text(out, encoding="utf-8")
print(f"built {target}  ({len(out)/1024:.1f} KB)")
