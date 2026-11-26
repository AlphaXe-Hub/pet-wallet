/* ============================================================
   4. 持久化（SQLite 真表 + 内存工作副本）

   架构（见 docs/adr/0002-sqlite-storage-mapping.md）：
   - 磁盘：9 张真表，落在 Library/CapacitorDatabase（WebKit 管不着，随 iCloud 备份）
   - 内存：state 仍是那 8 个数组，Domain Core 继续纯函数、零 IO
   - 映射：persistNow() 全量拆写；initStore() 全量拼回
   - 备份：Documents/backups/*.json（真第二副本，不再依赖同 origin 的 IndexedDB）
   - 浏览器（file:// 或静态托管）下自动降级回 IndexedDB，保证 Web 版仍可用
   ============================================================ */
const DB_NAME = 'pet_ledger';
const DB_VERSION = 1;
const BACKUP_DIR = 'backups';
const BACKUP_KEEP = 7;

/* ---------- 4.1 运行环境判定 ---------- */
function isNative() {
  try {
    return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  } catch (e) { return false; }
}
function nativePlugin(id) {
  try { return window.Capacitor && window.Capacitor.Plugins ? window.Capacitor.Plugins[id] : null; }
  catch (e) { return null; }
}

/* ---------- 4.2 SQLite 层（原生） ---------- */
let sqliteConn = null;
let sqliteInitp = null;

/* 9 张真表的 DDL。字段与 state 里的对象一一对应，不做任何语义改写。 */
const SQLITE_SCHEMA = `
CREATE TABLE IF NOT EXISTS pet (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, species TEXT NOT NULL,
  breed TEXT, birthday TEXT, gender TEXT,
  avatar_type TEXT, avatar_ref TEXT, note TEXT,
  sort_order INTEGER DEFAULT 0, created_at TEXT
);
CREATE TABLE IF NOT EXISTS category (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, icon TEXT, color TEXT,
  remind_days INTEGER, low_stock_days INTEGER, shelf_life_days INTEGER,
  sort_order INTEGER DEFAULT 0, builtin INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS product (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, category_id TEXT,
  unit TEXT, spec TEXT, daily_usage REAL DEFAULT 0, remind_days INTEGER,
  pet_id TEXT, note TEXT, archived INTEGER DEFAULT 0, created_at TEXT
);
CREATE TABLE IF NOT EXISTS location (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, icon TEXT, sort_order INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS purchase (
  id TEXT PRIMARY KEY, occurred_at TEXT, total REAL DEFAULT 0,
  note TEXT, created_at TEXT
);
CREATE TABLE IF NOT EXISTS purchase_item (
  id TEXT PRIMARY KEY, purchase_id TEXT, product_id TEXT,
  qty REAL DEFAULT 0, unit_price REAL DEFAULT 0, subtotal REAL DEFAULT 0,
  expiry_date TEXT, location_id TEXT, pet_id TEXT
);
CREATE TABLE IF NOT EXISTS stock_batch (
  id TEXT PRIMARY KEY, product_id TEXT, purchase_item_id TEXT,
  qty_in REAL DEFAULT 0, qty_left REAL DEFAULT 0,
  expiry_date TEXT, location_id TEXT, received_at TEXT, opened_at TEXT
);
CREATE TABLE IF NOT EXISTS stock_movement (
  id TEXT PRIMARY KEY, product_id TEXT, batch_id TEXT, type TEXT,
  qty REAL DEFAULT 0, happened_at TEXT, note TEXT
);
CREATE TABLE IF NOT EXISTS app_meta (
  key TEXT PRIMARY KEY, value TEXT
);
CREATE INDEX IF NOT EXISTS idx_batch_product ON stock_batch(product_id);
CREATE INDEX IF NOT EXISTS idx_item_purchase ON purchase_item(purchase_id);
CREATE INDEX IF NOT EXISTS idx_movement_product ON stock_movement(product_id);
`;

async function sqliteOpen() {
  if (sqliteInitp) return sqliteInitp;
  sqliteInitp = (async () => {
    const sqlite = nativePlugin('CapacitorSQLite');
    if (!sqlite) throw new Error('CapacitorSQLite 插件不可用');
    /* 连接一致性：热重载/多标签页时可能残留旧连接 */
    try { await sqlite.checkConnectionsConsistency(); } catch (e) { /* ignore */ }
    let hasConn = false;
    try {
      const r = await sqlite.isConnection({ database: DB_NAME, readonly: false });
      hasConn = !!(r && r.result);
    } catch (e) { /* ignore */ }
    if (!hasConn) {
      await sqlite.createConnection({
        database: DB_NAME, encrypted: false, mode: 'no-encryption',
        version: DB_VERSION, readonly: false
      });
    }
    const conn = await sqlite.retrieveConnection({ database: DB_NAME, readonly: false });
    if (!conn) throw new Error('SQLite 连接打开失败');
    await conn.open();
    /* 首次建表：逐句执行，execute 支持多语句但拆开更好定位错误 */
    const stmts = SQLITE_SCHEMA.split(';').map(x => x.trim()).filter(Boolean);
    for (const stmt of stmts) await conn.execute(stmt);
    return conn;
  })();
  return sqliteInitp;
}

/* ---------- 4.3 state ↔ 9 张表 的映射 ---------- */
/* 所有映射都是「整表写、整表读」，不做增量。数据量在 MB 级，毫秒级完成。 */

function metaToRows(meta) {
  return Object.keys(meta || {}).map(k => ({
    statement: 'INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?);',
    values: [k, JSON.stringify(meta[k])]
  }));
}

function sqliteDump(state) {
  /* 生成一个 executeSet：DELETE 全部 + INSERT 全部，单事务 */
  const set = [];
  const clear = ['pet', 'category', 'product', 'location', 'purchase',
    'purchase_item', 'stock_batch', 'stock_movement', 'app_meta'];
  for (const t of clear) set.push({ statement: `DELETE FROM ${t};`, values: [] });

  for (const p of state.pets || []) set.push({
    statement: 'INSERT OR REPLACE INTO pet (id,name,species,breed,birthday,gender,avatar_type,avatar_ref,note,sort_order,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?);',
    values: [p.id, p.name, p.species, p.breed || '', p.birthday || '', p.gender || '',
      p.avatarType || 'svg', p.avatarRef || '', p.note || '', p.sortOrder || 0, p.createdAt || '']
  });
  for (const c of state.categories || []) set.push({
    statement: 'INSERT OR REPLACE INTO category (id,name,icon,color,remind_days,low_stock_days,shelf_life_days,sort_order,builtin) VALUES (?,?,?,?,?,?,?,?,?);',
    values: [c.id, c.name, c.icon || '', c.color || '', c.remindDays == null ? null : c.remindDays,
      c.lowStockDays == null ? null : c.lowStockDays, c.shelfLifeDays == null ? null : c.shelfLifeDays,
      c.sortOrder || 0, c.builtin ? 1 : 0]
  });
  for (const p of state.products || []) set.push({
    statement: 'INSERT OR REPLACE INTO product (id,name,category_id,unit,spec,daily_usage,remind_days,pet_id,note,archived,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?);',
    values: [p.id, p.name, p.categoryId || '', p.unit || '件', p.spec || '',
      Number(p.dailyUsage) || 0, p.remindDays == null ? null : p.remindDays,
      p.petId || null, p.note || '', p.archived ? 1 : 0, p.createdAt || '']
  });
  for (const l of state.locations || []) set.push({
    statement: 'INSERT OR REPLACE INTO location (id,name,icon,sort_order) VALUES (?,?,?,?);',
    values: [l.id, l.name, l.icon || '', l.sortOrder || 0]
  });
  for (const p of state.purchases || []) set.push({
    statement: 'INSERT OR REPLACE INTO purchase (id,occurred_at,total,note,created_at) VALUES (?,?,?,?,?);',
    values: [p.id, p.occurredAt || '', Number(p.total) || 0, p.note || '', p.createdAt || '']
  });
  for (const i of state.purchaseItems || []) set.push({
    statement: 'INSERT OR REPLACE INTO purchase_item (id,purchase_id,product_id,qty,unit_price,subtotal,expiry_date,location_id,pet_id) VALUES (?,?,?,?,?,?,?,?,?);',
    values: [i.id, i.purchaseId || '', i.productId || '', Number(i.qty) || 0,
      Number(i.unitPrice) || 0, Number(i.subtotal) || 0, i.expiryDate || null,
      i.locationId || null, i.petId || null]
  });
  for (const b of state.batches || []) set.push({
    statement: 'INSERT OR REPLACE INTO stock_batch (id,product_id,purchase_item_id,qty_in,qty_left,expiry_date,location_id,received_at,opened_at) VALUES (?,?,?,?,?,?,?,?,?);',
    values: [b.id, b.productId || '', b.purchaseItemId || null,
      Number(b.qtyIn) || 0, Number(b.qtyLeft) || 0, b.expiryDate || null,
      b.locationId || null, b.receivedAt || '', b.openedAt || null]
  });
  for (const m of state.movements || []) set.push({
    statement: 'INSERT OR REPLACE INTO stock_movement (id,product_id,batch_id,type,qty,happened_at,note) VALUES (?,?,?,?,?,?,?);',
    values: [m.id, m.productId || '', m.batchId || null, m.type || '',
      Number(m.qty) || 0, m.happenedAt || '', m.note || '']
  });
  set.push(...metaToRows(state.meta));
  return set;
}

function rowsToState(rows) {
  const num = v => (v == null ? null : Number(v));
  const s = {
    pets: (rows.pet || []).map(r => ({
      id: r.id, name: r.name, species: r.species, breed: r.breed || '',
      birthday: r.birthday || '', gender: r.gender || 'unknown',
      avatarType: r.avatar_type || 'svg', avatarRef: r.avatar_ref || '',
      note: r.note || '', sortOrder: r.sort_order || 0, createdAt: r.created_at || ''
    })),
    categories: (rows.category || []).map(r => ({
      id: r.id, name: r.name, icon: r.icon || '', color: r.color || '',
      remindDays: num(r.remind_days), lowStockDays: num(r.low_stock_days),
      shelfLifeDays: num(r.shelf_life_days), sortOrder: r.sort_order || 0,
      builtin: r.builtin ? 1 : 0
    })),
    products: (rows.product || []).map(r => ({
      id: r.id, name: r.name, categoryId: r.category_id || '',
      unit: r.unit || '件', spec: r.spec || '', dailyUsage: Number(r.daily_usage) || 0,
      remindDays: num(r.remind_days), petId: r.pet_id || null,
      note: r.note || '', archived: r.archived ? 1 : 0, createdAt: r.created_at || ''
    })),
    locations: (rows.location || []).map(r => ({
      id: r.id, name: r.name, icon: r.icon || '', sortOrder: r.sort_order || 0
    })),
    purchases: (rows.purchase || []).map(r => ({
      id: r.id, occurredAt: r.occurred_at || '', total: Number(r.total) || 0,
      note: r.note || '', createdAt: r.created_at || ''
    })),
    purchaseItems: (rows.purchase_item || []).map(r => ({
      id: r.id, purchaseId: r.purchase_id || '', productId: r.product_id || '',
      qty: Number(r.qty) || 0, unitPrice: Number(r.unit_price) || 0,
      subtotal: Number(r.subtotal) || 0, expiryDate: r.expiry_date || null,
      locationId: r.location_id || null, petId: r.pet_id || null
    })),
    batches: (rows.stock_batch || []).map(r => ({
      id: r.id, productId: r.product_id || '', purchaseItemId: r.purchase_item_id || null,
      qtyIn: Number(r.qty_in) || 0, qtyLeft: Number(r.qty_left) || 0,
      expiryDate: r.expiry_date || null, locationId: r.location_id || null,
      receivedAt: r.received_at || '', openedAt: r.opened_at || null
    })),
    movements: (rows.stock_movement || []).map(r => ({
      id: r.id, productId: r.product_id || '', batchId: r.batch_id || null,
      type: r.type || '', qty: Number(r.qty) || 0, happenedAt: r.happened_at || '',
      note: r.note || ''
    })),
    meta: {}
  };
  for (const r of rows.app_meta || []) {
    try { s.meta[r.key] = JSON.parse(r.value); } catch (e) { s.meta[r.key] = r.value; }
  }
  return s;
}

async function sqliteLoadAll(conn) {
  const tables = ['pet', 'category', 'product', 'location', 'purchase',
    'purchase_item', 'stock_batch', 'stock_movement', 'app_meta'];
  const rows = {};
  for (const t of tables) {
    const res = await conn.query(`SELECT * FROM ${t};`);
    rows[t] = (res && res.values) || [];
  }
  return rowsToState(rows);
}

async function sqliteSaveAll(conn, state) {
  const set = sqliteDump(state);
  await conn.executeSet(set, true);
}

/* ---------- 4.4 文件备份（Documents/backups，真第二副本） ---------- */
async function fileBackupMaybe(force) {
  if (!isNative()) return false;
  try {
    const fs = nativePlugin('Filesystem');
    if (!fs) return false;
    const now = Date.now();
    if (!force && state.meta.lastBackupAt && now - new Date(state.meta.lastBackupAt).getTime() < 24 * 3600 * 1000) return false;
    const payload = JSON.stringify(state);
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    try { await fs.mkdir({ path: BACKUP_DIR, directory: 'DOCUMENTS', recursive: true }); } catch (e) { /* 已存在 */ }
    await fs.writeFile({
      path: `${BACKUP_DIR}/pet-ledger-${stamp}.json`,
      data: payload, directory: 'DOCUMENTS', encoding: 'utf8', recursive: true
    });
    /* 只保留最近 BACKUP_KEEP 份 */
    try {
      const list = await fs.readdir({ path: BACKUP_DIR, directory: 'DOCUMENTS' });
      const files = (list.files || []).filter(f => f.endsWith('.json')).sort();
      for (const f of files.slice(0, Math.max(0, files.length - BACKUP_KEEP))) {
        try { await fs.deleteFile({ path: `${BACKUP_DIR}/${f}`, directory: 'DOCUMENTS' }); } catch (e) { /* ignore */ }
      }
    } catch (e) { /* ignore */ }
    state.meta.lastBackupAt = new Date().toISOString();
    return true;
  } catch (e) { return false; }
}

/* ---------- 4.5 Web 降级：IndexedDB（浏览器/静态托管时使用） ---------- */
let dbp = null;
function idb() {
  if (dbp) return dbp;
  dbp = new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) return reject(new Error('no idb'));
    const req = indexedDB.open('pet_ledger_v1', 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
      if (!db.objectStoreNames.contains('snap')) db.createObjectStore('snap', { autoIncrement: true });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbp;
}
function idbReq(storeName, mode, fn) {
  return idb().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const r = fn(store);
    tx.oncomplete = () => resolve(r && 'result' in r ? r.result : undefined);
    tx.onerror = () => reject(tx.error);
  }));
}
function lsKey(k) { return 'pet_ledger_' + k; }

/* ---------- 4.6 统一写入口 ---------- */
let saveTimer = null;
let channel = null;
let saveChain = Promise.resolve();

function persistNow() {
  const payload = JSON.stringify(state);
  if (!isNative()) {
    try { localStorage.setItem(lsKey('state'), payload); } catch (e) { /* ignore */ }
    idbReq('kv', 'readwrite', store => store.put(payload, 'state')).catch(() => { });
    return;
  }
  /* 原生：串行化写，避免 executeSet 并发 */
  saveChain = saveChain.then(async () => {
    try {
      const conn = await sqliteOpen();
      await sqliteSaveAll(conn, state);
    } catch (e) {
      console.error('[persist] SQLite 写入失败', e);
    }
  });
}

function persist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(persistNow, 260);
}

function broadcast() {
  try {
    if (!channel && 'BroadcastChannel' in window) channel = new BroadcastChannel('pet_ledger');
    if (channel) channel.postMessage({ type: 'commit', revision: state.meta.revision, at: Date.now() });
  } catch (e) { /* ignore */ }
}

/* 写事务：所有业务动作都从这里出去 */
function commit(fn) {
  fn(state);
  state.meta.revision = (state.meta.revision || 0) + 1;
  persist();
  broadcast();
  snapshotMaybe();
}

/* 每小时最多做一次文件备份（原生）／IndexedDB 快照（Web） */
function snapshotMaybe() {
  if (!state.meta.autoBackup) return;
  const now = Date.now();
  if (state.meta.snapshotAt && now - state.meta.snapshotAt < 3600000) return;
  state.meta.snapshotAt = now;
  if (isNative()) { fileBackupMaybe(false); return; }
  const payload = JSON.stringify(state);
  idbReq('snap', 'readwrite', store => {
    store.add({ at: now, revision: state.meta.revision, size: payload.length, data: payload });
    return store.getAllKeys();
  }).then(keys => {
    if (keys && keys.length > 7) {
      const extra = keys.slice(0, keys.length - 7);
      idbReq('snap', 'readwrite', store => { extra.forEach(k => store.delete(k)); }).catch(() => { });
    }
  }).catch(() => { });
}

async function listSnapshots() {
  if (isNative()) {
    try {
      const fs = nativePlugin('Filesystem');
      const list = await fs.readdir({ path: BACKUP_DIR, directory: 'DOCUMENTS' });
      const files = (list.files || []).filter(f => f.endsWith('.json')).sort().reverse();
      const out = [];
      for (const f of files) {
        try {
          const r = await fs.readFile({ path: `${BACKUP_DIR}/${f}`, directory: 'DOCUMENTS', encoding: 'utf8' });
          const text = typeof r.data === 'string' ? r.data : '';
          const parsed = JSON.parse(text);
          out.push({
            name: f,
            at: parsed && parsed.meta && parsed.meta.snapshotAt ? parsed.meta.snapshotAt : f,
            revision: parsed && parsed.meta ? parsed.meta.revision : 0,
            size: text.length,
            data: text
          });
        } catch (e) { /* 单份坏档跳过 */ }
      }
      return out;
    } catch (e) { return []; }
  }
  const list = await idbReq('snap', 'readonly', store => store.getAll());
  return (list || []).sort((a, b) => b.at - a.at);
}

/* ---------- 4.7 启动：从权威存储拼回 state ---------- */
async function initStore() {
  let loaded = null;

  if (isNative()) {
    try {
      const conn = await sqliteOpen();
      const s = await sqliteLoadAll(conn);
      /* 判定「空库」：连内置品类都没有，说明是全新安装 */
      if (s && Array.isArray(s.pets) && (s.categories || []).length) loaded = normalizeState(s);
    } catch (e) {
      console.error('[initStore] SQLite 读取失败，回退临时状态', e);
    }
  }

  if (!loaded) {
    /* Web 路径：IndexedDB → localStorage → 快照 */
    try {
      const raw = await idbReq('kv', 'readonly', store => store.get('state'));
      if (raw) loaded = normalizeState(JSON.parse(raw));
    } catch (e) {
      try {
        const raw = localStorage.getItem(lsKey('state'));
        if (raw) loaded = normalizeState(JSON.parse(raw));
      } catch (e2) { /* ignore */ }
    }
    if (!loaded) {
      try {
        const list = await idbReq('snap', 'readonly', store => store.getAll());
        if (list && list.length) {
          list.sort((a, b) => b.at - a.at);
          for (const item of list) {
            try { const s = normalizeState(JSON.parse(item.data)); if (s && Array.isArray(s.pets)) { loaded = s; break; } } catch (e) { /* 试下一个 */ }
          }
        }
      } catch (e) { /* ignore */ }
    }
  }

  state = loaded || blankState();
  if (!loaded) persistNow();
  const lastOpen = state.meta.lastOpenAt;
  state.meta.lastOpenAt = todayISO();
  persist();
  return { fresh: !loaded, lastOpen };
}
