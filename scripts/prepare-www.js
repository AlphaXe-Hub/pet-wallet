#!/usr/bin/env node
/**
 * 把构建产物 宠物账本.html 复制为 www/index.html（Capacitor 的 webDir）。
 *
 * 为什么是复制而不是软链：`cap sync` 会整目录拷贝 ios/App/App/public，
 * 软链在部分工具链下会失效，复制最稳。产物 179KB，复制成本可忽略。
 */
const fs = require('fs');
const path = require('path');

const root = __dirname ? path.resolve(__dirname, '..') : process.cwd();
const src = path.join(root, '宠物账本.html');
const outDir = path.join(root, 'www');
const out = path.join(outDir, 'index.html');
const vendorSrc = path.join(root, 'src', 'vendor');
const vendorOut = path.join(outDir, 'vendor');

if (!fs.existsSync(src)) {
  console.error(`[prepare-www] 找不到构建产物：${src}`);
  console.error('[prepare-www] 请先运行 python3 build.py');
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });
fs.copyFileSync(src, out);

/* Capacitor 运行时与插件必须在页面里以普通 <script> 加载（非 bundler 环境） */
fs.mkdirSync(vendorOut, { recursive: true });
for (const f of fs.readdirSync(vendorSrc)) {
  if (f.endsWith('.js')) fs.copyFileSync(path.join(vendorSrc, f), path.join(vendorOut, f));
}

const kb = (fs.statSync(out).size / 1024).toFixed(1);
console.log(`[prepare-www] www/index.html  ${kb} KB  (+ vendor/${fs.readdirSync(vendorOut).length} files)`);
