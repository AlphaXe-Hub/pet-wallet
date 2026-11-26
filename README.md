# 宠物账本 v1 · 源码

纯 Web 的宠物开销与物资账本。单文件 HTML，原生 JS，无框架、无构建工具。
数据存在浏览器 IndexedDB（localStorage 兜底），可导出 JSON 备份并在其他设备恢复。

## 目录结构

```
pet-wallet/
├── 宠物账本.html      # 构建产物，双击即可离线运行
├── build.py           # 组装脚本：拼接 CSS/JS 到模板
├── README.md
├── docs/              # 需求方案与 spec
└── src/
    ├── shell.html     # 页面骨架，含 /*__CSS__*/ 与 /*__JS__*/ 占位符
    ├── style.css      # 全部样式（含桌面端适配、reduced-motion 降级）
    ├── core.js        # 工具函数、数据模型、Domain Core 纯函数、Actions、存储
    ├── ui.js          # 图标、Toast、Sheet、确认弹层、图表等通用元件
    ├── views.js       # 画廊首页 / 补给看板
    ├── views2.js      # 洞察页 / 我的页
    ├── forms.js       # 宠物与商品表单、宠物详情、商品详情
    ├── purchase.js    # 记一笔、选品、出库、盘库、采购明细、导入导出
    └── app.js         # 启动、路由、事件分发、长按交互
```

## 本地运行

1. 直接双击 `宠物账本.html` 即可（`file://` 下全部功能可用）。
2. 需要模拟线上环境时：进入本目录执行 `python3 -m http.server 8123`，浏览器打开 `http://localhost:8123/宠物账本.html`。

## 修改后重新构建

1. 编辑 `src/` 下对应的分段文件。
2. 执行 `node --check src/<改动文件>.js` 做语法检查。
3. 在本目录执行 `python3 build.py`，重新生成 `宠物账本.html`。
4. 刷新浏览器验证。JS 拼接顺序固定为 core → ui → views → views2 → forms → purchase → app。

## 关键约定

- `today` 一律显式传入 Domain Core 函数，便于测试与跨日边界处理。
- 所有写操作走 `commit()`：先改 state，再递增 revision、落盘 IndexedDB、广播 BroadcastChannel、写快照。
- 库存按批次管理，出库默认 FEFO（先到期先出），跨批次自动拆成多条 allocation。
- 汇率/单位不做换算：数量单位由商品的 `unit` 决定，日均成本 = 最近单价 × 日均消耗。
- 浏览器存储可能被清理，页面已内置「导出 JSON / 导入恢复 / 最近 7 份快照」三条兜底路径。

## 已知边界

- 不做 PWA、系统推送、预算、深色模式、按克计量、账号同步（与需求文档一致）。
- 数据不跨设备自动同步，换设备请走 JSON 导入。
- 单文件形态下数据库用 IndexedDB 单 key 存储，未引入 sql.js/WASM。
