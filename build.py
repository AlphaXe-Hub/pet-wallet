#!/usr/bin/env python3
"""把 src/ 下的 CSS 与分段 JS 组装成单文件 HTML（无构建依赖）。"""
import pathlib, re, sys

root = pathlib.Path(__file__).resolve().parent
src = root / "src"
shell = (src / "shell.html").read_text(encoding="utf-8")
css = (src / "style.css").read_text(encoding="utf-8")

js_order = ["core.js", "persist.js", "ui.js", "views.js", "views2.js", "forms.js", "purchase.js", "app.js"]
parts = []
for name in js_order:
    body = (src / name).read_text(encoding="utf-8")
    parts.append(f"/* ==================== {name} ==================== */\n{body}")
js = "\n\n".join(parts)

out = shell.replace("/*__CSS__*/", css).replace("/*__JS__*/", js)
target = root / "宠物账本.html"
target.write_text(out, encoding="utf-8")
print(f"built {target}  ({len(out)/1024:.1f} KB)")
