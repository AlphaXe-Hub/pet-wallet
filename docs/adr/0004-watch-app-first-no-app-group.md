# ADR-0004：v1.2 先做 Apple Watch 应用，暂不做小组件（免费签名约束）

- 状态：已接受
- 日期：2026-11-27
- 关联：ADR-0001（Capacitor iOS 壳）

## 背景

v1.2 需求：4 个 iOS 小组件（补给告警 / 本月支出 / 宠物画廊 / 打卡统计）+ Apple Watch 应用。
当前签名账号是**免费个人团队**（`Chenzhe Xu (Personal Team)`，`isFreeProvisioningTeam = 1`）。

## 关键事实

- 小组件是独立进程，**无法读取主 App 沙盒**。跨进程共享数据必须使用 **App Groups**。
- Apple 官方能力表：**App Groups 仅对 Apple Developer Program（$99/年，ADP）/ Enterprise（ADEP）开放**。
- 免费个人团队的被禁能力清单明确包含 App Groups（"Sharing data between app targets requires paid; skip extensions"）。
- 免费团队另有：签名 7 天过期、App ID 上限 10 个。

因此：**在免费账号下，「带真实数据的小组件」在技术上不可实现**（只能做静态装饰版）。

## 决策

1. **v1.2 拆两步：先做 Apple Watch 应用（不依赖 App Groups），小组件推迟到升级付费账号后。**
2. 手表数据通道：**WatchConnectivity + 同一 App 容器内的 JSON 快照**，不使用 App Group：
   - Web 层在每次写入后，把「手表快照」写到 App 沙盒 `Documents/`（复用 Filesystem 插件，同一 App 容器，原生可直接读）。
   - App target 内的原生 Swift（`WCSession`）在启动/前台/JS 触发时读取该文件，通过 `updateApplicationContext` 推给手表。
   - 手表端（watchOS SwiftUI）从 `WCSession.receivedApplicationContext` 读取并渲染；手表离线时保留最后一份。
3. **不引入 App Group、不引入付费能力**；保持免费签名可构建。
4. 小组件（4 个 × 多尺寸）与 App Group 的完整方案，记录为「待付费账号后执行」。

## 备选与否决

| 方案 | 否决理由 |
|---|---|
| 用 App Group 做小组件 | 免费签名被禁，构建期会直接失败 |
| 小组件做静态装饰版 | 没有数据，无产品价值 |
| 手表独立存储数据 | 等于手表内重写一套存储与录入，工作量爆炸，且与 iPhone 数据不一致 |
| 立刻升 $99 账号 | 用户选择「先做手表」，付费决策延后 |

## 后果

**正面**
- 免费签名即可交付手表应用（待真机验证）。
- 数据通道与将来的小组件同源（同一份快照 JSON），付费后加小组件成本很低。

**负面 / 风险**
- 手表仍受 **7 天签名过期**约束。
- 免费团队能否把 watchOS 应用装到真机 + 手表开发者模式，**需实测确认**（未验证前不承诺）。
- 手表数据为「上次同步时的快照」，非实时（与小组件一致的口径）。

## 待办（付费账号后）

- 建 4 个 Widget Extension + App Group `group.com.xuchenzhe.petwallet`；快照写入 App Group 容器；按尺寸矩阵实现 12 套布局。
