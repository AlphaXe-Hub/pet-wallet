# Spec: 宠物账本 v1.1 — iOS 原生质感 + 液态玻璃 + 图标体系

- 状态：ready-for-agent
- 日期：2026-11-26
- 基线：`v1.0`（tag，已在 iPhone 17 Pro / iOS 27.0.1 真机签名运行通过）
- 关联：`docs/adr/0001-ios-capacitor-shell.md`、`docs/adr/0002-sqlite-storage-mapping.md`

---

## Problem Statement

v1.0 已经能装进手机用了，但在真机上暴露出三类问题，都是「看起来不像一个 iOS 应用」的问题：

1. **状态栏区域露白**：灵动岛上方（时间 / 电池 / WiFi）那一条是白色，没有跟上 App 的奶油背景。
2. **底部菜单栏没有真正固定**：上下滚动时菜单栏跟着位移，滚到底还会在它下方露出一条黑边。
3. **整体质感偏「网页」**：目前的卡片和栏是普通半透明 + 轻模糊，与 iOS 26 的 Liquid Glass 语言差得远；动效也停在「能跑」的水平，不够丝滑灵动。

另外，**图标是手写的极简线描**（可看但谈不上精致），而项目已经有一套高质量的猫主题玻璃质感素材（`cat-ledger-assets/`）没有被用起来。

---

## Solution

一次纯 UI/体验升级，不动业务逻辑与数据层：

- **修掉两个 iOS 适配 bug**（根因是同一个 Capacitor 配置错误）：状态栏区域融入背景、底部栏真正钉死、消除回弹黑边。
- **全套 Liquid Glass 材质**：玻璃只给「悬浮 chrome」（底部栏 / 记一笔按钮 / 弹层 / Toast），内容卡片只做轻透，避免满屏模糊掉帧。
- **动效升级到「丝滑灵动」**：引入 spring 曲线体系、错峰入场、共享元素转场、粒子与光扫等微交互（参考 ShipSwift 的动效语言，翻译为 CSS/JS 实现——见 Further Notes 的可行性说明）。
- **图标体系重做**：把 28 个线描图标 + 5 个品类 + 6 个位置 + 11 个品种头像，升级为统一的玻璃猫风格；已有 PNG 素材（白底，需去背）优先复用。

---

## User Stories

### A. 状态栏与安全区

1. As an iPhone 用户, I want to 灵动岛上方的状态栏区域也是 App 的奶油背景色, so that 它看起来是一个完整的原生应用而不是一个网页
2. As an iPhone 用户, I want to 顶部标题不被灵动岛/状态栏压住, so that 「毛孩子的账本」始终完整可读
3. As a 用户滑动页面, I want to 内容能从状态栏下方平滑滑过（而不是在状态栏处被截断）, so that 滚动手感像原生应用
4. As a 深色壁纸用户, I want to 状态栏文字颜色与浅色背景保持高对比, so that 时间和电量始终看得清

### B. 底部菜单栏固定

5. As a 用户向上滑动列表, I want to 底部菜单栏固定在屏幕底部不动, so that 我随时能切换 tab
6. As a 用户滑到列表最底部, I want to 不再出现一条突兀的黑边, so that 界面完整不露馅
7. As a 用户快速滑动到顶部/底部, I want to 没有橡皮筋回弹把整页（含菜单栏）拖走, so that 操作稳定可预期
8. As a 用户点按底部 tab, I want to 选中态有玻璃高亮 + 轻震动 + 图标弹一下, so that 切换有明确反馈
9. As a 用户, I want to「记一笔」悬浮按钮在滚动时也固定, so that 随时能记账
10. As a iOS 用户, I want to 底部栏和悬浮按钮避开 Home Indicator 安全区, so that 不被手势条压住

### C. 液态玻璃质感

11. As a 用户, I want to 底部菜单栏是浮起来的玻璃胶囊（能透出下面的内容）, so that 有 iOS 26 的高级感
12. As a 用户, I want to 玻璃边缘有一圈亮边和顶部高光, so that 像真实玻璃被光打亮
13. As a 用户, I want to「记一笔」按钮是薄荷色玻璃, so that 主操作醒目又不突兀
14. As a 用户, I want to 底部弹出的表单是一层从底部升起的磨砂玻璃, so that 能感知到背后的页面
15. As a 用户, I want to Toast 提示也是玻璃小条, so that 反馈统一
16. As a 用户, I want to 内容卡片保持温暖纸感、只做轻微半透, so that 阅读舒适、不因满屏模糊而头晕
17. As a 性能敏感用户, I want to 滚动列表时保持 60fps, so that 不卡顿

### D. 动效「丝滑灵动」

18. As a 用户, I want to 页面切换有柔和的淡入上浮 + 轻微回弹, so that 转场不生硬
19. As a 用户, I want to 列表卡片依次错峰入场（stagger）, so that 打开页面有节奏感
20. As a 用户, I want to 点按任何按钮都有按下回弹（scale + 阴影）, so that 手感扎实
21. As a 用户, I want to 金额数字滚动增长, so that 数据变化有「生长感」
22. As a 用户出库时, I want to 看到「-1」飘字上浮淡出, so that 扣减有明确反馈
23. As a 用户出库时, I want to 卡片做一次轻微下沉回弹, so that 有重量感
24. As a 用户记账成功时, I want to 卡片弹跳 + 撒星星粒子, so that 有完成感
25. As a 用户, I want to 记账成功后手机有 success 震动, so that 不用看屏幕也知道成功
26. As a 用户, I want to 点开宠物卡进入详情时有共享元素放大转场, so that 层级关系清楚
27. As a 用户, I want to 连续打卡火焰有呼吸缩放, so that 有生命力
28. As a 用户, I want to 等级进度条填充时有 spring 动画, so that 升级有期待感
29. As a 用户, I want to 临期告警进入视口时摇摆一下, so that 它抓住我的注意
30. As a 用户, I want to 长按卡片时卡片轻微抖动（iOS 抖动感）, so that 我知道可以拖动/编辑
31. As a 用户, I want to 下拉刷新时有玻璃水滴/涟漪反馈, so that 刷新有质感
32. As a 对动效敏感的用户, I want to 系统开启「减弱动态效果」时动画自动降级为淡入淡出, so that 不被晃到
33. As a 用户, I want to 动画期间控件立即可点（不被动画延迟）, so that 手快时不被卡

### E. 图标体系

34. As a 用户, I want to 品类图标（主粮/猫砂/医疗/玩具/其他）是统一的玻璃猫风格, so that 一眼能认出品类的可爱感
35. As a 用户, I want to 位置图标（厨房柜/阳台/冰箱/卫生间/储物间/卧室）风格统一, so that 找东西时视觉一致
36. As a 用户, I want to 底部 tab 的四个图标（画廊/看板/洞察/我的）精致, so that 首屏第一印象好
37. As a 用户, I want to 空状态（无宠物/无库存/无账单/无数据）有专门的场景插画, so that 空白页不冷清
38. As a 用户, I want to 宠物品种头像更精致（或能复用已有素材）, so that 多宠画廊好看
39. As a 用户, I want to 功能图标（记一笔/统计/预算/账单）与素材库对齐, so that 全站图标语言统一

### F. 回归与稳定

40. As a 用户, I want to v1.1 升级后原有的全部数据、账本、库存照常存在, so that 升级不掉数据
41. As a 用户, I want to v1.1 升级后核心流程（记一笔/出库/看报表/备份恢复）全部照常, so that 升级不破坏功能
42. As a 用户, I want to 升级后震动在 iPhone 上真实可用, so that v1.1 的核心体验达成

---

## Implementation Decisions

### D1. 根因修复：Capacitor 内容内边距（决定 #1 #2）

**根因**：`capacitor.config.json` 的 `ios.contentInset` 当前为 `"always"`，Capacitor 把 WKWebView 的滚动内容整体下推 `safe-area-inset-top`，导致顶部露出 WKWebView 自身背景（白），底部 fixed 元素随滚动容器回弹位移并露出 WebView 黑底。

**决策**：
- `ios.contentInset` 改为 **`"never"`**，让网页从屏幕物理顶端开始绘制。
- 增加 `ios.backgroundColor = "#FFF9F0"`（与 `--bg` 一致），保证任何 overscroll 区域也是奶油色而非黑色。
- CSS 侧显式接管安全区：新增 `--safe-t: env(safe-area-inset-top, 0px)`，顶栏 padding-top 使用 `calc(基础值 + var(--safe-t))`；底部栏继续用已有 `--safe-b`。
- 全局 `html, body { overscroll-behavior-y: none; }` 抑制网页级橡皮筋（iOS 16+ 支持）。

> 若改 `contentInset: never` 后仍有 fixed 元素位移，备选方案是把 tabbar/FAB 改为 `position: sticky` 置于滚动容器内。优先用 never 方案。

### D2. Liquid Glass 材质 token 化（#11–#17）

新增一组 CSS 变量，只被「悬浮 chrome」消费：

| token | 值 | 说明 |
|---|---|---|
| `--glass-bg` | `rgba(255,255,255,.52)` | 玻璃底（高透） |
| `--glass-blur` | `blur(30px) saturate(180%)` | 重模糊 + 提饱和 |
| `--glass-rim` | `inset 0 0 0 1px rgba(255,255,255,.55)` | 内亮边（玻璃厚度感） |
| `--glass-specular` | `inset 0 1px 0 rgba(255,255,255,.85)` | 顶部高光 |
| `--glass-shadow` | `0 10px 34px rgba(97,77,55,.18)` | 悬浮投影 |
| `--glass-tint-mint` | `rgba(47,174,140,.22)` | 薄荷色玻璃（FAB 专用） |

**作用范围（严格限定 4 类悬浮件）**：底部 tabbar、记一笔 FAB、底部 sheet、Toast。**内容卡片不上 `backdrop-filter`**，只用 `rgba(255,255,255,.72)` 半透底 + 现有纸纹，保证滚动性能。

**性能护栏**：`backdrop-filter` 只允许出现在 fixed/悬浮元素上，同一屏最多 4 个玻璃层；列表卡片滚动区禁止。

### D3. 动效体系（#18–#33）

建立统一的动效 token（沿用并扩展现有 `--ease-spring`）：

| token | 值 | 用途 |
|---|---|---|
| `--spring-gentle` | `cubic-bezier(.35,1.8,.35,.83)`（已实测多邻国过冲曲线） | 卡片/按钮回弹 |
| `--spring-bouncy` | 用 Motion 的 spring(stiffness 260, damping 18) | 弹跳/庆祝 |
| `--ease-out-quint` | `cubic-bezier(.22,1,.36,1)` | 减速进场 |
| `--dur-micro/card/page/celebrate` | 140 / 240 / 300 / 800ms（沿用） | 时长档位 |

**从 ShipSwift 借来的具体参数（翻译为 CSS/Web 实现）**：
- 抖动（长按）：衰减振幅 keyframes，每段 60–80ms，共 ~0.4s。
- 跳跃（记账成功）：squat 0.10s → 腾空 0.24s → 下落 0.18s → bouncy spring 0.2s，配合 squash&stretch scale `0.85→1.12→1.0→0.88`。
- 旋转（徽标/等级）：360° / 0.6s。
- 遮罩类转场（iris/wipe/dissolve）：用 `linear`/`easeInOut`，**不用 spring**（spring 会让 progress 过冲）。
- 弹性入场：`spring(duration .6, bounce .5)` 对应 CSS `cubic-bezier(.34,1.56,.64,1)` + 300–600ms。

**动效清单**（V1.1 交付，覆盖 #18–#33）：
1. 页面切换：淡入 + 上浮 8px，300ms ease-out
2. 列表 stagger：每项延迟 50ms，最多 8 项
3. 按钮按压：scale 0.96 + 底部阴影 3px→1px，140ms
4. 金额滚动：countUp + tabular-nums，600ms
5. 出库「-1」飘字：上浮淡出 + 卡片下沉回弹，240ms
6. 记账成功：卡片弹跳 + 12 粒子撒星星，800ms + success 震动
7. 宠物卡 → 详情：共享元素放大（view-transition 或 transform 模拟）
8. 打卡火焰呼吸：scale 1↔1.06 loop 2s
9. 等级进度条 spring 填充 600ms
10. 临期告警摇摆：rotate ±3° 一次 400ms
11. 长按抖动：衰减振幅 0.4s
12. 下拉刷新：玻璃水滴涟漪
13. `prefers-reduced-motion: reduce`：全部降级为纯 fade
14. 硬约束：动画期间控件必须已可交互

### D4. 图标与素材（#34–#39）

**素材现状（`cat-ledger-assets/`）**：12 张 PNG，**全部 RGB 白底、无 alpha**。质量高、风格统一（玻璃猫 + 薄荷/奶油），但：
- 直接用在卡片/按钮上会出现白色方块 → **必须先去背转透明 PNG**（可在构建脚本里批处理，或由图源侧提供透明版）。
- Banner（2048×1152）与 Deco（宽幅）更适合做 Hero / 空状态大图，不适合小图标。
- 4 个功能 icon（add-record / bill-list / statistics / budget）与 2 个 illust 可复用于对应位置。

**图标体系决策**：
- **保留现有手写 SVG 作为「线性回退」**（Web/低端场景），新增一套玻璃质感图标 **PNG（透明）或 WebP** 作为主视觉，按需替换 `<svg>` 引用。
- **小图标（≤32px）优先用矢量 SVG**（清晰、可改色），**大插画/空状态/Banner 用 PNG**。
- 需要新生成的图标清单见 `docs/icon-request-v1.1.md`（交给用户外部生图）。

### D5. 版本与提交

- v1.0 已打 tag（`v1.0`）。所有 v1.1 改动在新提交序列中进行，最终打 `v1.1`。
- 业务逻辑（`src/core.js` Domain Core）与持久层**零改动**；仅动 `src/style.css`、`src/ui.js`（动效与图标引用）、`src/app.js`（长按/转场钩子）、`capacitor.config.json`。

---

## Testing Decisions

**测试缝合点：仍只有 `src/domain`（即 `src/core.js` §2 的纯函数区）。理想数量是一个，本版不新增。**

好测试的标准：只断言「输入 → 输出」，不测实现细节；时间一律由 `today` 参数注入。

**本版是 UI 版，因此：**
- **不写 UI 快照测试 / 组件测试 / 像素测试**——视觉正确性靠真机截图人工走查（iPhone 17 Pro / iOS 27.0.1）。
- **必须回归的纯逻辑**（v1.1 不得破坏）：`planConsume`（FEFO 跨批次）、`remainingDays`（除零返 null）、`expiryStatus`（三级回退）、`comparePeriods`（空期返 null）、导出/导入往返。这些在 v1.0 的 issue #2 已有验收清单，v1.1 只做「回归不破坏」，不新增用例。
- **新增的手工验收清单**（真机）：
  1. 滚动到底部无黑边、无露白
  2. tabbar/FAB 固定不动
  3. 状态栏区域为奶油色、标题不被压
  4. 四个玻璃件透出背后内容、边缘有高光
  5. 真机震动在记账/出库/告警触发
  6. 开启「减弱动态效果」后动画降级
  7. 列表滚动 60fps（肉眼顺滑，无掉帧）

---

## Out of Scope

- 不改业务逻辑、数据模型、SQLite 表结构（ADR-0002 保持）。
- 不做账号/同步/预算（仍按 v1.0 约定）。
- 不做深色模式（V1.1 不做，tokens 预留）。
- 不做 App Store 上架相关（4.2 套壳风险，仍为自用侧载）。
- 不引入 SwiftUI 重写（保持 Capacitor + Web 技术栈）。
- 不重新设计信息架构与页面布局（沿用 v1.0 三屏 + 记一笔模态）。

---

## Further Notes

### 关于 `/shipswift` 的可行性（重要，必须如实说明）

ShipSwift 是 **SwiftUI** 代码库（118 个 SwiftUI 技能）。**本项目是 Capacitor 封装的 WebView 应用（HTML/CSS/JS），不是 SwiftUI**，所以：

- **不能直接粘贴 Swift 代码**。
- 但它的**动效语言与参数是可迁移的**——我已提取可直接翻译成 CSS/JS 的具体数值：
  - 抖动衰减振幅 keyframes（60–80ms/段）
  - 跳跃 squat/leap/land 时长（0.10/0.24/0.18s）+ squash&stretch 比例（0.85/1.12/1.0/0.88）
  - spring(duration .6, bounce .5) → CSS `cubic-bezier(.34,1.56,.64,1)`
  - 遮罩类转场必须用 linear/easeInOut（spring 会过冲）
- **可借鉴的 ShipSwift 技能（翻译为 Web）**：`change-effect`（微交互 + 触觉）、`confetti`（撒星星）、`transition`（16 种转场）、`particle-transition`（poof/pop ripple）、`shimmer`/`light-sweep`（骨架与高光）、`chromatic-glass`/`glass`/`glass-orb`（正是 Liquid Glass 的 Fresnel 边缘/高光/色散描述）、`shaking-icon`（长按抖动）、`alert`（Toast）、`ring-chart`/`donut-chart`/`activity-heatmap`（洞察页图表）。

**结论**：ShipSwift 作为**动效设计参考与参数来源**使用，落地实现走 CSS + 现有 Motion/原生 CSS。若未来改为 SwiftUI 原生重写，可整套复用 ShipSwift。

### 素材去背

`cat-ledger-assets/` 的 12 张图全部白底无 alpha。V1.1 落地前需统一去背（构建期批处理或图源侧重出透明版）。这是「能不能用上」的关键前提。

### 已知小 bug（顺手修）

- `src/ui.js` 的 `moon`（卧室/月牙）图标 path 疑似畸变（`A8.4 8.4 0 0 0 8.4-3.8Z`），渲染可能不正常，本次重做图标时一并修正。
