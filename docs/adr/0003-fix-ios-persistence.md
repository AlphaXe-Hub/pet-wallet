# ADR-0003：修复 iOS 端持久化失效（数据丢失事故）

- 状态：已修复
- 日期：2026-11-27
- 关联：ADR-0002（SQLite 真表 + 内存副本）

## 事故现象

用户早上录入的数据（宠物「奇奇」等），下午打开 App 就不见了。设备上 `Documents/` 只有备份 JSON，**没有任何 `.db` 文件**——说明权威存储 SQLite 从未真正写入过。

## 根因（两个独立 bug，串联成灾）

### Bug 1：`retrieveConnection` 用错 API

`src/persist.js` 的 `sqliteOpen()` 把 `retrieveConnection` / `createConnection` 当成**原生插件方法**调用：

```js
await sqlite.createConnection({database, encrypted, mode, version, readonly});
const conn = await sqlite.retrieveConnection({database, readonly});
```

但这两个方法是 **`SQLiteConnection` JS 包装类**的方法，原生插件上没有。设备实测报错：

```
CapacitorSQLite.retrieveConnection() is not implemented on ios
```

结果：`sqliteOpen()` 每次都抛异常 → `persistNow()` 的写入被 `catch` 吞掉 → **SQLite 永远为空**。而 `snapshotMaybe()` 走的是 Filesystem 插件（正常），所以只剩备份 JSON，且备份里只有第一小时的数据。

**修复**：使用包装类

```js
const wrapper = new CapacitorSQLite.SQLiteConnection(plugin);
const db = await wrapper.retrieveConnection(DB_NAME, false);
await db.open();
```

### Bug 2：`Filesystem.readdir` 返回对象数组

iOS 上 `readdir` 返回 `{files:[{name,uri,size,ctime,mtime}, ...]}`，不是 `string[]`。原代码直接 `.filter(f => f.endsWith('.json'))`，对对象调用 `endsWith` 抛错并被吞，导致：

- `restoreFromNewestBackup()` 永远返回 `null` → **即使 SQLite 修好，也不会从备份恢复**
- 快照列表、备份轮转同样失效（`deleteFile` 拼出 `[object Object]` 路径）

**修复**：新增 `fsNames(list)`，统一把 `{files:[...]}` / `string[]` 归一为文件名数组；所有 readdir 消费点改用它。

## 新增的数据安全网

`initStore()` 原生分支增加**自动恢复**：SQLite 读不出有效数据（品类在但没有任何业务数据）时，自动从 `Documents/backups` 里最新的、含实质数据的备份恢复，并回写 SQLite。这样即使将来 SQLite 再次异常，数据也不会凭空消失。

## 验证（iPhone 17 Pro / iOS 26.4.2，真机）

| 项 | 结果 |
|---|---|
| `sqliteOpen` | ✅ OK |
| 建表 + 读写 | ✅ `write+read OK` |
| 从备份恢复 | ✅ `restore backup: pets=1`，界面出现「奇奇」 |
| `Documents/pet_ledgerSQLite.db` 落盘 | ✅ 存在，`pet` 表 1 行 |
| 杀掉 App 重启后数据仍在 | ✅ 奇奇仍在 |

## 教训

1. **「写了但没验证过落盘」= 没写**。v1.0 声称「SQLite 真表持久化」，但从未在真机上确认 `.db` 文件生成；`console.error` 被吞，静默失败。
2. **错误必须可见**。持久化失败应有用户可见的提示，而不是只 `console.error`。
3. 备份是最后防线，但**备份逻辑同样依赖 Filesystem API**，所以 API 语义（返回结构）必须验证，不能靠猜。
