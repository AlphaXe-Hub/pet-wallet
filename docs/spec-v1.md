# Spec: 宠物账本 v1（纯 Web）

Status: ready-for-agent
Created: 2026-11-25
Source: `docs/宠物账本-方案.md` + 需求拷问 Q1–Q35

---

## Problem Statement

养宠的人有两个反复出现的焦虑，而且市面上没有任何一个工具同时解决：

1. **钱花在哪儿了？** 粮、砂、医疗、玩具、零食混在一起，月底只看到总数，看不出结构。更关键是——**看不出「哪一件东西其实很贵」**。一袋 300 块的粮如果吃 30 天是 10 块/天，一顿 80 块的罐头吃两顿是 40 块/天，但纯记账 App 只告诉你「罐头花了 80」，完全掩盖了真实成本。
2. **东西什么时候断？放哪儿了？** 「好像快没猫砂了」「那袋备用的粮塞哪儿去了」——纯库存 App 能管货，但不在意钱；纯记账 App 管钱，但不知道货。

现有工具要么是记账（只管钱，看不见库存），要么是库存管理（只管货，不算钱），**没有一个是把「钱 × 库存」接起来算的**。而这两件事唯一的结合点，也是唯一有差异化价值的地方，就是**日均成本**。

同时，家庭场景还有三个具体摩擦：
- **多宠**：一袋 10kg 粮两只猫都在吃，硬把库存绑到某一只头上，用户自己都不确定该选谁。
- **一次买多样**：囤货时一次买粮 + 砂 + 零食，纯单行记账逼用户拆成三笔。
- **到期日记不下**：一次买 3 袋粮，如果分两次买的、到期日不同，一个字段装不下。

---

## Solution

一个**纯 Web 的单页应用**，不登录、不做后端、数据存在浏览器里：

- **首页是宠物画廊**：每只毛孩子一张卡片（照片或内置手绘头像），卡片上只显示**属于它自己的**告警（处方粮、专属药品），不显示金额——因为共享池下「这只猫花了多少」是编出来的数字。
- **第二屏是补给看板**：这是实际使用频率最高的一屏。谁快没了（按日均消耗算剩余天数）、谁快过期、放在家里的哪个位置，三段式一眼看完。每张卡片右下角一个「出库 -1」，一步扣减。
- **第三屏是洞察**：本月总支出、品类占比、月度趋势、环比对比，以及**日均成本榜**——「你最近喝得最贵的一口水」式的商品排名。这是整个产品唯一别人抄不走的东西。
- **记一笔**：一个模态，默认一行，能「＋再加一件」，自动合计，自动按品类预设的保质期算出到期日。

**用户价值一句话**：打开就知道该买什么、该先吃完什么、东西在哪儿；月底知道钱花在哪个品类上、以及哪件东西其实是隐形贵。

---

## User Stories

### 宠物登记与画廊

1. As a 养宠人, I want to 登记第一只宠物（名字、猫/狗/其他、品种、生日、性别）, so that 我可以开始按宠物组织我的账本和物资
2. As a 多宠家庭, I want to 添加第二只、第三只宠物, so that 每只毛孩子都有自己的身份卡
3. As a 养宠人, I want to 给宠物上传一张自己的照片当头像, so that 打开 App 就能看到「我家的猫」而不是一个通用图标
4. As a 还没拍照的养宠人, I want to 从内置的手绘品种头像里挑一个（橘猫/白猫/狸花/奶牛/布偶/柯基/柴犬/金毛/泰迪/兔/仓鼠）, so that 第一次打开时画廊不是一堆灰色占位块
5. As a 养宠人, I want to 给宠物改名字、补生日、写备注, so that 资料能随着了解加深而更新
6. As a 养宠人, I want to 看到每只宠物的年龄（自动按生日算，显示「2 岁 3 个月」）, so that 不用自己心算
7. As a 养宠人, I want to 拖动调整宠物卡片的顺序, so that 最常看的那只排在最前面
8. As a 养宠人, I want to 在宠物卡片上看到属于它自己的告警数量（比如「1 件专属物品快过期」）, so that 我一眼知道哪只该操心了
9. As a 养宠人, I want to 点进宠物详情看到它的完整资料和专属物品清单, so that 处方粮、专属药品不会混进家庭共享池里
10. As a 养宠人, I want to 删除一只宠物时被明确警告「这会同时删除它的 N 条记录」, so that 我不会手滑把两年账本删掉

### 商品与品类

11. As a 养宠人, I want to 新建商品时填名称、品类、单位（袋/罐/盒/支/包）、规格（如「1.5kg」）, so that 同一个东西以后能复用而不是每次重打
12. As a 养宠人, I want to 给商品填一个「日均消耗」（件/天）, so that 系统能算出「还剩几天」
13. As a 养宠人, I want to 不填日均消耗也能正常用（只是不出倒计时）, so that 不确定用量的东西（比如玩具）不被强迫填数字
14. As a 养宠人, I want to 用内置的 5 个品类（主粮/猫砂/医疗/玩具/其他），每个都带颜色和图标, so that 报表和筛选一眼能分
15. As a 养宠人, I want to 自定义品类并给每个品类设「临期提醒天数」（比如猫粮 15 天、药品 30 天、罐头 7 天）, so that 不同东西用不同标准，而不是一刀切
16. As a 养宠人, I want to 给单个商品覆盖品类默认的提醒天数, so that 特殊情况（比如这袋粮特别耐放）能单独调
17. As a 养宠人, I want to 把某个商品标记成「只给某只宠物」的专属商品, so that 处方粮不会被算进共享池
18. As a 养宠人, I want to 归档不再买的商品, so that 列表不被历史 SKU 塞满，但旧账单仍然完整
19. As a 养宠人, I want to 搜索商品名, so that 商品多了以后能快速找到

### 采购与记账

20. As a 养宠人, I want to 点一下就能记一笔, so that 记账不超过 15 秒
21. As a 养宠人, I want to 一笔采购默认只有一行（商品/数量/单价/到期日/位置）, so that 最常见的「买一袋粮」不啰嗦
22. As a 囤货的人, I want to 点「＋再加一件」加第二行、第三行, so that 一次买粮 + 砂 + 零食记成一笔而不是三笔
23. As a 养宠人, I want to 看到底部实时合计金额, so that 付款前能核对
24. As a 养宠人, I want to 到期日能够留空, so that 没有保质期的东西（玩具、用具）不被强迫填
25. As a 养宠人, I want to 到期日默认按品类的预设保质期自动填好, so that 我大部分时候不用改
26. As a 养宠人, I want to 位置默认取上次用的那个, so that 重复填写被省掉
27. As a 养宠人, I want to 给一笔采购写一句备注（比如「双十一囤货」）, so that 以后能想起来
28. As a 养宠人, I want to 事后编辑或删除一笔采购, so that 记错了能改
29. As a 养宠人, I want to 看到这笔采购对库存的影响（「猫粮 +3 袋」）, so that 我确认它真的入库了

### 库存与出入库

30. As a 养宠人, I want to 在补给看板看到每个商品的当前剩余数量, so that 我知道家里还有多少
31. As a 养宠人, I want to 看到每个商品的「剩余 X 天」（按日均消耗算）, so that 我能提前决定什么时候买
32. As a 养宠人, I want to 剩余天数为负时看到「已断货 N 天」的红色标记, so that 断粮是显眼的而不是我自己发现
33. As a 养宠人, I want to 点一下就出库一件, so that 高频动作不需要弹窗、不需要填表单
34. As a 养宠人, I want to 长按出库按钮调整数量, so that 一次用掉两袋的时候也能记
35. As a 养宠人, I want to 手动调整库存为某个绝对值（盘库）, so that 记漏了能一次性对齐
36. As a 养宠人, I want to 看到某商品的所有批次和各自的到期日, so that 一次买了多袋时我知道每袋什么时候过期
37. As a 养宠人, I want to 系统默认按「先到期先出」自动扣减批次, so that 我不需要每次自己选哪一袋
38. As a 养宠人, I want to 在商品详情看到最近的出入库流水, so that 库存对不上时能追溯是哪里记的
39. As a 养宠人, I want to 看到库存积压提醒（比如「这袋粮够吃 180 天，可能买多了」）, so that 我不会囤到过期

### 补给看板与提醒

40. As a 养宠人, I want to 看板顶部单独分出「快过期」一段, so that 需要赶紧消耗的东西最显眼
41. As a 养宠人, I want to 看板顶部单独分出「该补货」一段（剩余天数 < 阈值）, so that 需要赶紧买的也显眼
42. As a 养宠人, I want to 下面看到全部库存的完整列表, so that 想找某个东西时不用翻页
43. As a 养宠人, I want to 按位置筛选库存, so that 打开冰箱前先看看里面有什么
44. As a 养宠人, I want to 按品类筛选库存, so that 只想看药品的时候能筛掉别的
45. As a 养宠人, I want to 搜索商品名, so that 东西多了也能立刻定位
46. As a 养宠人, I want to 在底部 tab 上看到红点/数字, so that 不用进去就知道有事要处理
47. As a 养宠人, I want to 在首页看到一条家庭级提示「家里 2 件东西快过期」, so that 画廊页也能感知到状态

### 位置管理

48. As a 养宠人, I want to 使用内置的位置（厨房柜/阳台/冰箱/卫生间/储物间/卧室）, so that 开箱即用不用先配置
49. As a 养宠人, I want to 增加自己的位置（比如「车库右柜」）, so that 能匹配我家真实布局
50. As a 养宠人, I want to 给位置配一个图标和排序, so that 视觉上一眼能分
51. As a 养宠人, I want to 删除位置时提示「有 N 件物品在这个位置」, so that 不会让物品失去归属
52. As a 养宠人, I want to 备注里能写更细的位置（「吊柜第二层」）, so that 两级层级不做也能记清楚

### 洞察报表

53. As a 养宠人, I want to 看到本月总支出（大数字）, so that 一眼知道这个月花了多少
54. As a 养宠人, I want to 看到品类占比环形图（主粮/猫砂/医疗/玩具/其他）, so that 我能看出「原来医疗才是大头」
55. As a 养宠人, I want to 看到最近 6 个月的月度趋势, so that 我能看出季节性（比如换毛季化毛膏支出飙升）
56. As a 养宠人, I want to 看到本月 vs 上月的环比涨跌, so that 我知道这个月是不是花超了
57. As a 养宠人, I want to 看到去年同期对比（有数据后）, so that 我知道长期趋势
58. As a 养宠人, I want to 记账不满一个月时，对比区显示「记账满 30 天解锁」而不是 0%, so that 我不会误以为支出暴跌
59. As a 养宠人, I want to 看到「日均成本排行」——哪件商品每天最烧钱, so that 我能发现隐形贵的东西（这是我用这个 App 的核心理由）
60. As a 养宠人, I want to 日均成本按「单价 × 日均消耗」算, so that 数字有依据而不是拍脑袋
61. As a 养宠人, I want to 在洞察页顶部切换「全部 / 某只宠物」, so that 我能看单宠的专属商品支出
62. As a 养宠人, I want to 切到单只宠物时看到「仅统计专属商品」的明确标注, so that 我知道共享池的钱没算进去，不会以为数据错了
63. As a 养宠人, I want to 点图表某一段下钻看对应账单列表, so that 看到「医疗占 60%」以后能知道是哪几笔

### 游戏化与动效

64. As a 养宠人, I want to 看到「连续记账 N 天」的火焰标记, so that 我有动力坚持记
65. As a 养宠人, I want to 连续天数中断时看到温和的处理（不是羞辱性提示）, so that 断更后我还愿意回来
66. As a 养宠人, I want to 看到等级进度条（按累计记账笔数）, so that 长期使用有正反馈
67. As a 养宠人, I want to 记账成功时看到撒星星动效, so that 记一笔有「完成感」
68. As a 养宠人, I want to 出库时不撒星星（只飘一个 -1）, so that 高频操作不被庆祝动画拖慢
69. As a 养宠人, I want to 所有动效不阻塞操作, so that 手快的时候不会被动画卡住
70. As a 对动效敏感的人, I want to 系统设置「减少动态效果」时动画自动降级, so that 我不被晃到
71. As a Android 用户, I want to 关键操作有震动反馈, so that 不用看屏幕也知道成功
72. As a iOS 用户, I want to 在没有震动时也有清晰的视觉反馈, so that 体验不残缺

### 数据安全

73. As a 养宠人, I want to 随时导出全部数据为 JSON, so that 换浏览器/换电脑时能带走
74. As a 养宠人, I want to 导出 CSV 以便在 Excel 里二次分析, so that 数据不被锁死在这个 App 里
75. As a 养宠人, I want to 从 JSON 备份完整恢复, so that 换设备后一切照旧
76. As a 养宠人, I want to 导入时看到「这会覆盖现有 N 条数据」的确认, so that 我不会误覆盖
77. As a 养宠人, I want to 超过 7 天没打开时被提示「建议备份一次」, so that 浏览器清缓存时我还有副本
78. As a 养宠人, I want to 看到上次备份是几号, so that 我知道数据有多新

### 空状态与首次使用

79. As a 第一次打开的人, I want to 看到「先登记第一只毛孩子」的引导和可爱的插画, so that 我知道从哪儿开始
80. As a 第一次打开的人, I want to 没有库存时看到「还没有任何物品，记第一笔吧」, so that 空白页不是一张白纸
81. As a 第一次打开的人, I want to 没有账单时看到「本月还没有支出」, so that 我知道这是正常的
82. As a 新用户, I want to 报表区显示「记账满 30 天解锁对比」, so that 空图表变成一个目标而不是缺陷

---

## Implementation Decisions

### 架构

- **纯静态 SPA**，无服务端、无 API 层。构建产物是一组静态文件，可直接由任意静态托管或本地 `vite preview` 提供。
- **技术栈**：React 19 + TypeScript + Vite；Tailwind CSS v4 + CSS 变量 tokens；Zustand 管 UI 状态；TanStack Query 管异步读取（主要为 DB 查询）；Motion 管动效；图表手写 SVG。
- **数据库**：`sql.js`（WASM SQLite）。内存中运行完整 SQLite 引擎，写入后 `export()` 出 `Uint8Array`，持久化到 **IndexedDB** 的单一 key（外加滚动快照）。**持久化是显式的、可被测试替身替换的边界**。

### 分层与依赖方向

```
UI (features/*)  →  Domain Core (src/domain)  ←  DB (src/db)
                        ↑
                   纯函数，零 IO，零 React，零 db 引用
```

**Domain Core 不 import 任何 `db/` 或 React 的东西。** 它接收纯数据、返回纯数据。这是本项目唯一的测试缝合点（见 Testing Decisions）。

### Domain Core 契约

所有函数**必须接收 `today: string`（ISO date）作为显式参数，禁止读 `Date.now()`** —— 这是让全部业务规则可确定性测试的前提。

```
// 库存
resolveStock(batches)                          → { productId, qty, earliestExpiry }[]
planConsume(batches, qty)                      → { allocations: {batchId, qty}[], remainingQty }
remainingDays(qty, dailyUsage)                 → number | null   // dailyUsage <= 0 时返回 null
stockStatus(qty, dailyUsage, thresholds)       → 'healthy' | 'low' | 'out' | 'overstocked'

// 保质期
expiryStatus(expiryDate, today, remindDays)    → 'fresh' | 'soon' | 'expired' | 'none'
  // remindDays 解析优先级：product.remindDays ?? category.remindDays ?? 7

// 记账
lineSubtotal(qty, unitPrice)                   → number
purchaseTotal(lines)                           → number
defaultExpiry(purchaseDate, categoryShelfLife) → string | null

// 洞察
monthlyTotal(items, month)                     → number
categoryBreakdown(items, month, categories)    → { categoryId, amount, ratio }[]
monthlyTrend(items, months)                    → { month, amount }[]
comparePeriods(current, previous)              → { delta, deltaRatio } | null   // previous 为空返回 null
dailyCost(unitPrice, dailyUsage)               → number | null
dailyCostRanking(products, days)               → { productId, perDay }[]

// 游戏化
computeStreak(ledgerDates, today)              → { current, longest, isBroken }
computeLevel(totalEntries)                     → { level, progress, nextAt }

// 宠物
petAge(birthday, today)                        → { years, months } | null
```

**关键规则（必须被测试钉死）**：
- `remainingDays` 在 `dailyUsage <= 0` 时返回 `null`，UI 必须显示「未设置日均消耗」而不是 `Infinity` 或 `NaN`。
- `comparePeriods` 在对比期无数据时返回 `null`，UI 显示解锁占位而不是 0%。
- `expiryStatus` 的 `remindDays` 三级回退：商品覆盖 → 品类默认 → 全局 7 天。
- `planConsume` 按 **FEFO（先到期先出）** 排序；到期日为 `null` 的批次排在最后。跨批次扣减时返回多条 allocation。
- `resolveStock` 只汇总 `qtyLeft > 0` 的批次。

### 数据模型

沿用方案文档 §3 的 8 张表：`pet`、`category`、`product`、`location`、`purchase`、`purchase_item`、`stock_batch`、`stock_movement`，外加 `app_meta`（KV）。

**关键设计决策：存储层永远用批次，UI 层默认聚合为商品。**

| 层 | 行为 |
|---|---|
| 存储 | 每次入库生成一条 `stock_batch`（qty + expiry + location） |
| 默认 UI | 一个商品 = 一个「当前数量」+ 一个「最早到期日」 |
| 批次展开 | 商品详情可展开看各批次（不做开关，始终可看，避免多一个设置项） |
| 出库 | 默认按 FEFO 自动扣减，用户零感知 |

这条设计解决了「用户选商品级保质期」与「一次买 3 袋不同到期日」的数学矛盾：**录入体验是商品级，存储正确性是批次级**。

**`pet_id` 可空**：`purchase_item.pet_id` 为 `NULL` 表示共享池，非空表示专属商品。这直接支撑「共享池 vs 专属商品」的双模型。

**`stock_movement` 是唯一真相来源**：每次入库/出库/调整都写一条流水。`stock_batch.qty_left` 是派生缓存，可由流水重放校验。

### 事务与并发

- 每个用户操作（记一笔、出库、调整）在**单个 SQLite 事务**内完成：写 `purchase` + `purchase_item` + `stock_batch` + `stock_movement` 要么全成要么全败。
- 写事务成功后立即 `export()` → 写 IndexedDB。
- 多标签页：用 `BroadcastChannel` 广播「已写入」；接收方重新加载 DB。同时 IndexedDB 存一个单调递增的 `revision`，写前比对，不匹配则提示「其他标签页已更新，已为你刷新」。

### 视觉实现

- Design tokens 以 CSS 自定义属性落在 `:root`（暖奶油底 `#FFF9F0`、主强调色 `#FF8A5B`、全套圆角与双层阴影）。
- 插画全部为手写 SVG React 组件，**支持 `currentColor`**，以便在深色/告警状态下复用同一份资产。
- 中文字体：**默认走系统字体栈**（PingFang SC / Microsoft YaHei / Noto Sans SC）。可选子集化标题字体作为后续增强，不作为 V1 阻塞项。
- 图表全部手写 SVG（数据量 < 1000 点），不引第三方图表库，避免体积与视觉割裂。

### 动效

- 统一曲线：`--ease-spring: cubic-bezier(0.35, 1.8, 0.35, 0.83)`（过冲回弹）、`--ease-out: cubic-bezier(0.22, 1, 0.36, 1)`。
- 时长档位：micro 140ms / card 240ms / page 300ms / celebrate 800ms。
- **硬约束**：动画期间控件必须已可交互（不得用 `pointer-events: none` 拖时间）。
- `prefers-reduced-motion: reduce` 时全部降级为纯 fade，撒星星改为静态贴图。
- **撒星星只在记账成功触发；出库不撒**（高频动作）。出库用「-1」飘字。

### 震动

- `haptic(kind: 'tap' | 'success' | 'warning' | 'celebrate')`，能力探测后调用 `navigator.vibrate()`，不可用则静默返回 `false`。**调用点必须在业务成功之后、且不 await 阻塞 UI。**
- 只在 Android Chrome 生效；iOS 无任何替代实现。所有关键状态必须另有视觉表达。

### 备份

- 导出：`db.export()` → 下载 `.sqlite` 文件；另有 JSON 全量导出（表结构 + 行）。
- 导入：JSON → 清库 → 事务内重建 → 校验行数 → 提示结果。
- 自动快照：每次写事务后，若距上次快照 > 1 小时，把 `db.export()` 存进 IndexedDB 的环形缓冲（保留 7 份）。
- 冷启动策略：**优先加载最新快照**，避免每次全量重建；加载失败则回退到上一个快照。

---

## Testing Decisions

### 单一缝合点：Domain Core

本项目**只在一个位置做业务测试**——`src/domain`。

理由：这是一个没有服务端、没有网络、没有鉴权的纯前端应用。业务复杂度全部集中在「库存怎么算、报表怎么聚合、保质期怎么判定」这些**纯函数**里。UI 只是它们的渲染器，DB 只是它们的搬运工。在 Domain Core 之上测一次，胜过在 UI 上点一百次。

**测试只打 Domain Core 的公开函数签名，不测内部实现。** 允许重构内部算法（比如把 O(n²) 的排序换掉），只要函数在同样输入下返回同样输出，测试就必须原样通过。

### 什么算好测试

- **只测输入 → 输出**。断言 `planConsume(batches, 2)` 返回哪几条 allocation、各自多少，不关心它内部用了什么排序算法。
- **时间永远是注入的**。「今天」由参数传入，测试不 mock `Date.now()`、不用 `vi.setSystemTime`。这让所有时间相关测试变成纯数据断言。
- **一条测试一个业务规则**。测试名直接用领域词，比如 `「到期日为 null 的批次排在最后」`、`「日均消耗为 0 时剩余天数返回 null」`。
- **边界优先于快乐路径**。跨批次扣减、零库存、过期、空对比期、跨年、闰年 2 月 29 日、`dailyUsage` 为 0 —— 这些才是会出 bug 的地方。
- **不做快照测试**。DOM 快照改一次样式就全红，价值低于维护成本。

### 要测的模块与关键用例

| 领域 | 必须覆盖 |
|---|---|
| `planConsume` | 单批次够扣；跨两批次扣减；qty 超过总量时如何处理（clamp 并返回剩余）；`expiry=null` 排最后；同到期日按入库时间排序 |
| `resolveStock` | 只汇总 `qtyLeft > 0`；全空返回空数组；最早到期日取最小值 |
| `remainingDays` | 正常除法；`dailyUsage=0` → `null`；`dailyUsage` 为负 → `null` |
| `expiryStatus` | 三级回退（商品覆盖 > 品类 > 7 天默认）；今天到期算 `soon` 不算 `expired`；已过期返回 `expired` |
| `comparePeriods` | 上期无数据 → `null`；上期为 0 → `null`；正常涨跌比例 |
| `dailyCost` | `dailyUsage=0` → `null`；正常乘法 |
| `monthlyTotal` / `categoryBreakdown` | 跨月边界；品类无支出时不出现 `0` 项还是出现（明确约定：**不出现**） |
| `computeStreak` | 连续 N 天；昨天有记录今天没记 → `isBroken=true` 但 current 保留；跨月；跨年 |
| `computeLevel` | 阈值边界（正好落在升级点） |
| `petAge` | 生日未到 vs 已到；闰日生日 |
| `purchaseTotal` | 多行求和；浮点误差（用整数分或显式 round） |

### 不需要测的

- **UI 组件**：不写组件测试。视觉正确性靠人眼 + 手动走查，不靠断言 class 名。
- **DB 层**：不写集成测试。`sql.js` 的 SQL 行为本身不需要我们验证；我们只验证「Domain Core 收到的数据是对的」，而这是数据映射的单一职责。
- **动效**：不做断言。
- **导出/导入的往返**：**例外，要测**。这是「不丢数据」这个最高优先级约束的唯一技术保障。测法：构造一份 Domain 层数据集 → 序列化 → 反序列化 → 深度相等。这条测试不依赖浏览器。

### 先例

仓库当前**没有任何代码**，因此没有可参考的既有测试。本 spec 同时确立测试规范：Vitest + `src/domain/*.test.ts` 同目录并列，测试名用中文领域词。

---

## Out of Scope

- **后端服务 / API / 数据库服务器**——明确不做（见方案 §6.2）。
- **账号、登录、多端同步、协作共享**——单机单用户。
- **桌面应用壳（Tauri / Electron）**——已明确改判为纯 Web。
- **移动端原生壳 / 上架**——因此 iOS 无震动，接受。
- **存量数据导入**（Excel / 其他记账 App）——从零开始；只做自有格式的 JSON 恢复。
- **按克/毫升计量**——所有库存按「件」，不做单位换算。
- **预算功能**——V2。
- **系统级推送通知**——V1 不做；Tab 红点 + 首页提示条代替。
- **云同步 / 多设备**。
- **深色模式**——V1 不做，但 tokens 结构预留。
- **中文字体随包分发**——V1 用系统字体，作为后续增强。

---

## Further Notes

### 已知的产品级矛盾（已裁决，记录于此）

1. **「核心诉求是消费洞察」vs「首页是宠物画廊」**——首页不承载消费数据。裁决：画廊卡片下方加一行「本月家庭总支出」小字作软性导流，洞察仍是完整第二屏。这是一个主动接受的错位，不是疏漏。
2. **「共享池」vs「宠物卡片显示告警」**——逻辑不相容。裁决：共享池告警归家庭看板；宠物卡只显示**专属商品**的告警。
3. **「商品级保质期」vs「一次买 3 袋」**——数学不相容。裁决：存储用批次，UI 聚合为商品。
4. **「需要前端和后端」vs「单机离线」**——后端无职责。裁决：不做后端。

### 技术风险

- **浏览器存储会被清空**（用户清缓存、Safari 7 天未访问回收、隐身模式关闭）。Web 形态下「不丢数据」只能靠**定期导出 + 主动提醒**兑现，不能靠「数据在本地」。这是形态选择的真实代价，必须在 UI 上诚实告知用户。
- **多标签页并发写会互相覆盖**。用 `BroadcastChannel` + `revision` 检测缓解。
- **sql.js 是全量内存库**：数据量到几万条时需要关注 `export()` 的开销。V1 的规模（单家庭、每年几千条）远未触及，但写事务后的 debounce 要设计好。

### 调研依据

- **Duolingo 动效技术栈**：主 App 用 Rive（官方文章 + 线上 `.riv` 文件实证），Web 是 Rive + Lottie 并存。其「流畅」来自过冲曲线 + 200–350ms 短时长 + 状态机混合。**本项目用 Motion 而非 Rive**：Rive canvas-lite 压缩后 222KB 且需 WASM 双文件、免费版导出带水印，而 Motion 仅 63KB(gzip)、零设计师成本。多邻国能承担 Rive 是因为设有专职 creative technologist 岗位。
- **`cubic-bezier(.35,1.8,.35,.83)`** 是从 duolingo.com 生产环境 CSS 反推的实测值，**不是官方设计规范**——多邻国未公开 motion token。
- **生图能力**（火山方舟 `images/generations`）：`background: transparent` 可直出带 Alpha 的 PNG；`layer_decomposition` 可拆最多 99 个透明图层。**但没有 `seed` 参数，风格一致性锁不死**——靠多参考图 + 固定提示词模板 + 人工筛选。
- **豆包云电脑**：是「工作任务模式」下用完即弃的云端沙箱，官方无端口映射/公网 IP/常驻进程能力，**不能作为托管环境**。仅可作演示/构建环境。

### 待确认

- **部署位置**：需要「一个能打开它的地址」。候选：火山引擎 OSS 静态托管、GitHub Pages、妙搭（需先确认静态站点是否可托管）、或本地 `vite preview`。不影响编码。
