# ADR-0002：SQLite 采用「真表 + 内存工作副本」

- 状态：已接受
- 日期：2026-11-26
- 依赖：ADR-0001（Capacitor iOS 壳）

## 背景

现有持久化层（`src/core.js` §4）是「单一 JSON 快照」模型：

- 整个 app 状态是一个 `state` 对象（`pets` / `products` / `purchases` / `purchaseItems` / `batches` / `movements` / `categories` / `locations` / `meta` 九个字段）
- 所有读写走内存，`persistNow()` 把整个 `state` 序列化后写入 IndexedDB 单 key
- `snapshotMaybe()` 把 7 份快照写进**同一个 IndexedDB** 的 `snap` store

调研确认两件事：

1. **Capacitor 官方明确**：LocalStorage「必须视为临时存储」，IndexedDB 在 iOS 上同样不可靠；WebKit 的驱逐是**按 origin 整体删除**，localStorage + IndexedDB 会一起消失。
2. 因此现有的「7 份快照」**不是备份**——它和主数据在同一个 origin，同生共死。

用户的首要约束是「不丢数据」。所以存储必须移出 WebKit 的管辖范围。

## 决策

采用 **`@capacitor-community/sqlite`**，并且：

> **磁盘上是 9 张真表，内存里仍是那 8 个数组；两者之间只做映射。**

具体形态：

| 层 | 形态 |
|---|---|
| 磁盘 | `pet` / `category` / `product` / `location` / `purchase` / `purchase_item` / `stock_batch` / `stock_movement` / `app_meta` 九张真表（schema 见 `docs/宠物账本-方案.md` §3） |
| 内存 | `state` 对象保持不变，Domain Core 继续纯函数、零 IO |
| 映射 | `persistNow()` 把 state 全量拆写进九张表（单事务）；`initStore()` 从九张表拼回 state |
| 位置 | `Library/CapacitorDatabase`——**在 WebKit 的 WebsiteData 之外**，系统不会回收，随 iCloud 备份 |

## 备选方案与否决理由

| 方案 | 否决理由 |
|---|---|
| **A1 全量 SQL 重写**：把 `state.purchases.find(...)` 等 93 处内存操作改成 SQL 查询 | 违背 `docs/spec-v1.md` 定下的「Domain Core 纯函数、零 IO、零 db 依赖」架构约束；改动面覆盖 5 个文件 93 处引用，任何一处改错都是**静默错数据**，而收益（SQL 查询能力）在单机单家庭、数据量几 MB 的场景里用不上 |
| **B 单表存 JSON**：建一张 `kv` 表，把整个 state 当字符串塞进去 | 改动最小，但磁盘上是不可读的大字段，失去了「真表」能按表恢复、能用 SQLite 浏览器查看的价值 |
| **C 保留 IndexedDB + `@capacitor/filesystem` 镜像** | 能拿到第二副本，但权威存储仍在 WebKit 管辖下；而且用户已明确选「真表」 |

## 后果

**正面**

- 数据落在系统不会回收的目录，且随 iCloud 备份
- 磁盘上是真表，可用 SQLite 客户端打开、按表恢复、写 SQL 校验
- Domain Core 与 UI **一行不改**，风险最小
- 未来的数据迁移、导出格式、外部工具接入都准备好了

**负面 / 已知代价**

- 每次写入是**全量覆盖**而非增量（9 张表 DELETE + INSERT）。数据量在几 MB 级别，耗时毫秒级，可接受；若未来数据量显著增长，需要改成差量写入
- 需要维护 state ↔ 表的映射代码，schema 变更时要同步改映射
- 引入 `@capacitor-community/sqlite` 依赖（含 SQLCipher）

## 相关决策

- **不写迁移代码**（用户已确认现有数据为空，从零开始）：首次启动直接建库。但**要主动清理旧 IndexedDB**，避免旧数据在换 origin 后「复活」。
- `iosScheme` 固定为 `capacitor` 并写死。**origin 是隐形数据边界**，改 scheme/hostname 等于换域，老数据静默读不到。

## 附：同时修正的「假备份」缺陷

原 `persistNow()` 的兜底链是 `localStorage` + IndexedDB `kv` store，7 份快照又在同一个 IndexedDB 的 `snap` store。**三者同一 origin，会被一起删**。

迁移后，备份策略改为：

| 层 | 载体 | 作用 |
|---|---|---|
| 权威存储 | SQLite（`Library/CapacitorDatabase`） | 系统不回收 |
| 冷备份 | `@capacitor/filesystem` → `Documents/backups/*.json` | 真第二副本，随 iCloud |
| 用户手动 | 导出 JSON / CSV | 跨设备、跨 app |

IndexedDB **不再作为任何数据的存储层**，仅作为历史遗留被清理。
