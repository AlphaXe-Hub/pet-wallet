# ADR-0001：交付形态从纯 Web 改为 Capacitor 封装的 iOS 应用

- 状态：已接受
- 日期：2026-11-26
- 取代：`docs/宠物账本-方案.md` v1.1 中「纯 Web SPA」的形态决策

## 背景

2026-11-25 曾将交付形态从 Tauri 桌面应用改为**纯 Web SPA**，理由是「不需要安装、跨设备打开即用」。当时明确接受的代价是：**iOS 上永远没有震动**（Safari 全版本不支持 `navigator.vibrate()`）。

2026-11-26 需求变更：**要做成 iOS 应用，沿用现有 UI**，用于自己手机上安装使用（不上架、不分发）。

## 决策

采用 **Capacitor 8** 把现有单文件 HTML 封装为 iOS 应用。UI 层保持不动。

关键配置：

- Capacitor 版本：**8.6.3**（`latest` tag，2026-11-25 发布）
- iOS 最低版本：**15.0**
- 依赖管理：**SPM**（Capacitor 8 起为默认，无需 CocoaPods）
- Xcode 要求：**26.0+**
- 产物目录：把 `宠物账本.html` 复制为 `www/index.html`，`webDir` 指向 `www/`
- 刻意**不使用** `server.url` 指向远程站点（App Store 4.2 与 2.5.2 双重红线；本项目也不联网）

## 备选方案与否决理由

| 方案 | 否决理由 |
|---|---|
| 原生 SwiftUI 重写 | 违背「沿用现有 UI」，工作量高一个数量级 |
| PWA + 添加到主屏幕 | 不是 iOS 应用；无真震动、无本地通知；无法获得独立 App 身份 |
| React Native / Flutter 重写 | 同样要抛弃现有 UI，且引入全新工具链 |
| 继续纯 Web | 无法满足「iOS 应用」这个新需求 |

## 后果

**正面**

- UI 零改动（现有 CSS 本就是移动优先：零 `:hover`、输入框 `16px` 防缩放、`viewport-fit=cover` 与 `safe-area-inset-*` 已就位）
- iOS 可以拿到真正的 Taptic Engine 震动（`@capacitor/haptics`，**iOS 侧零权限**，纯 `UIImpactFeedbackGenerator`）
- 数据可以落到 WebKit 之外的目录（见 ADR-0002）

**负面 / 已知风险**

- 需要一个 Xcode 26+ 环境才能构建
- 免费 Apple ID 自签有效期 **7 天**，需要周期重签
- 增加一层原生壳的维护成本（Capacitor 大版本升级、iOS 大版本升级）

## 未决

- 存储层迁移方案 → ADR-0002（待 Q4 决定）
- 震动语义映射沿用 `docs/宠物账本-方案.md` §8.3 的定义，但反馈通道从「Android Web Vibration」换成「`@capacitor/haptics` 原生」
