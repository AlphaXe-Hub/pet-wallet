# Spec: v1.2.1 — 手表可操作 + 本地通知 + 静态表盘

基线：v1.2.0（watchOS 伴随 App 已通）。签名：免费 Personal Team（无 App Groups）。

## 目标（全部免费可做）

1. **手表快捷记账 / 出库**：手表上对商品点 `-1`（出库）或 `+1`（补货，沿用上次单价）→ 发回 iPhone 落库。
2. **本地通知**：商品临期 / 断货时，iPhone 发本地通知（镜像到手表）。
3. **静态交互表盘**：watchOS Widget Extension，表盘显示「玻璃猫爪 + 记一笔」，点击深链打开手表快捷记账页。**不读库存数据**（避免 App Groups）。

## 数据契约变更（快照 schema=2）

在 schema 1 基础上新增：

```
products: [{ id, name, qty, unit, lastPrice }]   // 最多 20 个在库/在售商品
```

## 通道设计

- **iPhone → Watch**：`updateApplicationContext`（快照，已有）。
- **Watch → iPhone**：`sendMessage({action, productId, qty})`，iPhone 端 `WCSessionDelegate` 收到后**追加到 `Documents/watch-inbox.json`**（数组），App 活着则 `notifyListeners('watchAction')` 立即处理；否则下次启动/前台 `drainInbox()` 取出并应用。
- **应用动作**：`out` → `Actions.consume(productId, qty)`；`in` → 用 `lastPrice` 生成一笔采购（`Actions.savePurchase`）；无历史单价则拒绝并提示。
- **幂等**：每条 action 带 `id`（uuid），已处理的 id 记录在 `app_meta`，避免重复。

## 本地通知

- iOS App 端 `UNUserNotificationCenter`（免费、无 entitlement），JS 在写快照后调用 `Notifier.schedule(items)`。
- 触发：某商品进入「临期」当天 09:00 或「已断货」立即。iPhone 锁屏时镜像到 Apple Watch。
- 首次使用时请求通知权限。

## 静态表盘

- 新增 watchOS Widget Extension target `PetWalletWatchWidget`（accessoryCircular / Rectangular / Inline / Corner）。
- 视图：玻璃猫爪 SF Symbol + 「记一笔」/「剩 N 件」静态文案（N 用占位，不读真实数据）。
- 点击：`widgetURL("petwallet://quickadd")` → 手表 App `onOpenURL` 打开快捷记账页。
- 手表 App Info.plist 注册 URL scheme `petwallet`。

## 测试/验收（真机）

- 手表点 `-1` → iPhone 库存减少；再打开 App 数字一致。
- 手表点 `+1` → iPhone 生成一笔采购、库存增加。
- 断网/后台场景：action 暂存，回到 App 后生效（幂等不重复）。
- 造一个临期商品 → 收到本地通知。
- 表盘添加「宠物账本」组件 → 显示徽标，点击打开 App 并落在快捷记账页。

## 不做

- 带真实数据的表盘复杂功能（需 App Groups / 付费）。
- iOS 主屏 4 个小组件（同上）。
- 远程推送（APNs）、iCloud。
