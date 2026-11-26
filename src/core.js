/* ============================================================
   1. 基础工具
   ============================================================ */
const pad = n => String(n).padStart(2, '0');
const uid = p => p + '_' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
const r2 = n => Math.round((Number(n) || 0) * 100) / 100;

function todayISO(d) {
  const t = d || new Date();
  return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`;
}
function nowISO() { return new Date().toISOString(); }
function timeHM(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return '';
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function dateLabel(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${Number(m)}月${Number(d)}日`;
}
function monthKey(iso) { return (iso || '').slice(0, 7); }
function monthLabel(key) {
  const [y, m] = key.split('-');
  return `${Number(m)}月`;
}
function fmtMoney(n) {
  const v = r2(n);
  const abs = Math.abs(v);
  const out = abs >= 1000
    ? abs.toLocaleString('zh-CN', { maximumFractionDigits: 2 })
    : (v % 1 === 0 ? String(abs) : abs.toFixed(2));
  return (v < 0 ? '-' : '') + out;
}
function fmt2(n) { const v = r2(n); return v % 1 === 0 ? String(v) : v.toFixed(2); }

/* 日期运算（全部按 UTC 日历日，避免时区偏移） */
const DAY = 86400000;
function isoUTC(iso) { const [y, m, d] = iso.split('-').map(Number); return Date.UTC(y, m - 1, d); }
function diffDays(from, to) { return Math.round((isoUTC(to) - isoUTC(from)) / DAY); }
function addDays(iso, n) {
  const t = isoUTC(iso) + n * DAY;
  const d = new Date(t);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}
function monthRange(key) {
  const [y, m] = key.split('-').map(Number);
  const start = `${y}-${pad(m)}-01`;
  const next = new Date(Date.UTC(y, m, 1));
  return [start, `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-01`];
}
function shiftMonth(key, n) {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
}

/* ============================================================
   2. 领域核心（纯函数，today 一律注入，零 IO / 零 React）
   ============================================================ */

/* 2.1 库存 */
function remainingDays(qty, dailyUsage) {
  if (!(dailyUsage > 0)) return null;
  return Math.floor(Number(qty || 0) / dailyUsage);
}

function stockStatus(qty, dailyUsage, th) {
  th = th || {};
  if (!(qty > 0)) return 'out';
  const rd = remainingDays(qty, dailyUsage);
  if (rd === null) return 'healthy';
  if (rd < (th.lowDays == null ? 5 : th.lowDays)) return 'low';
  if (rd > (th.overstockDays == null ? 180 : th.overstockDays)) return 'overstocked';
  return 'healthy';
}

function resolveStock(batches) {
  const map = new Map();
  for (const b of batches || []) {
    if (!(b.qtyLeft > 0)) continue;
    let row = map.get(b.productId);
    if (!row) { row = { productId: b.productId, qty: 0, earliestExpiry: null, batchCount: 0 }; map.set(b.productId, row); }
    row.qty += b.qtyLeft;
    row.batchCount += 1;
    if (b.expiryDate && (!row.earliestExpiry || b.expiryDate < row.earliestExpiry)) row.earliestExpiry = b.expiryDate;
  }
  return [...map.values()].map(x => ({ ...x, qty: r2(x.qty) }));
}

function planConsume(batches, qty) {
  const sorted = (batches || []).filter(b => b.qtyLeft > 0).slice().sort((a, b) => {
    if (a.expiryDate && b.expiryDate && a.expiryDate !== b.expiryDate) return a.expiryDate < b.expiryDate ? -1 : 1;
    if (!a.expiryDate && b.expiryDate) return 1;
    if (a.expiryDate && !b.expiryDate) return -1;
    return (a.receivedAt || '').localeCompare(b.receivedAt || '');
  });
  let left = Number(qty) || 0;
  const allocations = [];
  for (const b of sorted) {
    if (left <= 0) break;
    const take = Math.min(b.qtyLeft, left);
    allocations.push({ batchId: b.id, qty: take });
    left = r2(left - take);
  }
  return { allocations, remainingQty: Math.max(0, r2(left)) };
}

/* 2.2 保质期 */
function expiryStatus(expiryDate, today, remindDays) {
  if (!expiryDate) return 'none';
  const d = diffDays(today, expiryDate);
  if (d < 0) return 'expired';
  if (d <= (remindDays == null ? 7 : remindDays)) return 'soon';
  return 'fresh';
}
function resolveRemindDays(product, category) {
  if (product && product.remindDays != null && product.remindDays !== '') return Number(product.remindDays);
  if (category && category.remindDays != null) return Number(category.remindDays);
  return 7;
}

/* 2.3 记账 */
function lineSubtotal(qty, unitPrice) { return r2((Number(qty) || 0) * (Number(unitPrice) || 0)); }
function purchaseTotal(lines) { return r2((lines || []).reduce((s, l) => s + lineSubtotal(l.qty, l.unitPrice), 0)); }
function defaultExpiry(purchaseDate, shelfLifeDays) {
  const n = Number(shelfLifeDays);
  if (!shelfLifeDays || !(n > 0)) return null;
  return addDays(purchaseDate, n);
}

/* 2.4 洞察 */
function monthlyTotal(entries, month) {
  return r2((entries || []).filter(e => monthKey(e.occurredAt) === month).reduce((s, e) => s + (Number(e.subtotal) || 0), 0));
}
function categoryBreakdown(entries, month, categories) {
  const totals = new Map();
  let sum = 0;
  for (const e of entries || []) {
    if (monthKey(e.occurredAt) !== month) continue;
    const amt = Number(e.subtotal) || 0;
    if (!(amt > 0)) continue;
    totals.set(e.categoryId, (totals.get(e.categoryId) || 0) + amt);
    sum += amt;
  }
  const out = [];
  for (const c of categories || []) {
    const amount = r2(totals.get(c.id) || 0);
    if (amount > 0) out.push({ categoryId: c.id, name: c.name, color: c.color, amount, ratio: sum ? amount / sum : 0 });
  }
  return out.sort((a, b) => b.amount - a.amount);
}
function monthlyTrend(entries, months, endMonth) {
  const keys = [];
  for (let i = months - 1; i >= 0; i--) keys.push(shiftMonth(endMonth, -i));
  return keys.map(k => ({ month: k, amount: monthlyTotal(entries, k) }));
}
function comparePeriods(current, previous) {
  const p = Number(previous) || 0;
  if (!(p > 0)) return null;
  const c = Number(current) || 0;
  return { delta: r2(c - p), deltaRatio: (c - p) / p };
}
function dailyCost(unitPrice, dailyUsage) {
  if (!(dailyUsage > 0)) return null;
  return r2((Number(unitPrice) || 0) * dailyUsage);
}
function dailyCostRanking(products, entries) {
  const lastPrice = new Map();
  for (const e of entries || []) {
    const prev = lastPrice.get(e.productId);
    if (!prev || (e.occurredAt || '') > (prev.occurredAt || '')) lastPrice.set(e.productId, { price: e.unitPrice, occurredAt: e.occurredAt, qty: e.qty });
  }
  return (products || [])
    .filter(p => p.dailyUsage > 0 && lastPrice.has(p.id) && !p.archived)
    .map(p => {
      const lp = lastPrice.get(p.id);
      return { productId: p.id, name: p.name, unitPrice: lp.price, dailyUsage: p.dailyUsage, perDay: r2(lp.price * p.dailyUsage) };
    })
    .sort((a, b) => b.perDay - a.perDay);
}

/* 2.5 游戏化 */
function computeStreak(ledgerDates, today) {
  const set = new Set(ledgerDates || []);
  let current = 0;
  let isBroken = false;
  let cursor = null;
  if (set.has(today)) cursor = today;
  else if (set.has(addDays(today, -1))) { cursor = addDays(today, -1); isBroken = true; }
  while (cursor && set.has(cursor)) { current++; cursor = addDays(cursor, -1); }
  const sorted = [...set].sort();
  let longest = 0, run = 0, prev = null;
  for (const d of sorted) {
    run = (prev && diffDays(prev, d) === 1) ? run + 1 : 1;
    if (run > longest) longest = run;
    prev = d;
  }
  return { current, longest, isBroken };
}
const LEVELS = [0, 3, 8, 20, 45, 90, 160, 300, 600, 1000];
function computeLevel(totalEntries) {
  const n = Number(totalEntries) || 0;
  let idx = 0;
  for (let i = 0; i < LEVELS.length; i++) if (n >= LEVELS[i]) idx = i;
  const cur = LEVELS[idx];
  const next = LEVELS[idx + 1] == null ? null : LEVELS[idx + 1];
  return {
    level: idx + 1,
    progress: next == null ? 1 : (n - cur) / (next - cur),
    nextAt: next,
    remain: next == null ? 0 : next - n,
    total: n
  };
}

/* 2.6 宠物 */
function petAge(birthday, today) {
  if (!birthday) return null;
  const [by, bm, bd] = birthday.split('-').map(Number);
  const [ty, tm, td] = today.split('-').map(Number);
  if (!by || !ty) return null;
  let months = (ty - by) * 12 + (tm - bm);
  if (td < bd) months -= 1;
  if (months < 0) return null;
  return { years: Math.floor(months / 12), months: months % 12, totalMonths: months };
}
function ageLabel(age) {
  if (!age) return '';
  if (age.totalMonths < 1) return '不到 1 个月';
  const y = age.years, m = age.months;
  if (y <= 0) return `${m} 个月`;
  return m ? `${y} 岁 ${m} 个月` : `${y} 岁`;
}

/* ============================================================
   3. 初始数据 / 状态
   ============================================================ */
const DEFAULT_CATEGORIES = [
  { id: 'cat_food', name: '主粮', icon: 'food', color: '#F6B26B', remindDays: 15, lowStockDays: 7, shelfLifeDays: 365, sortOrder: 1, builtin: 1 },
  { id: 'cat_litter', name: '猫砂', icon: 'litter', color: '#A8C7E8', remindDays: 10, lowStockDays: 5, shelfLifeDays: 730, sortOrder: 2, builtin: 1 },
  { id: 'cat_med', name: '医疗', icon: 'med', color: '#F49AC1', remindDays: 30, lowStockDays: 3, shelfLifeDays: 540, sortOrder: 3, builtin: 1 },
  { id: 'cat_toy', name: '玩具', icon: 'toy', color: '#9DD9A0', remindDays: 7, lowStockDays: 0, shelfLifeDays: 0, sortOrder: 4, builtin: 1 },
  { id: 'cat_other', name: '其他', icon: 'gift', color: '#C9B8E8', remindDays: 7, lowStockDays: 3, shelfLifeDays: 0, sortOrder: 5, builtin: 1 }
];
const DEFAULT_LOCATIONS = [
  { id: 'loc_kitchen', name: '厨房柜', icon: 'cabinet', sortOrder: 1 },
  { id: 'loc_balcony', name: '阳台', icon: 'plant', sortOrder: 2 },
  { id: 'loc_fridge', name: '冰箱', icon: 'snow', sortOrder: 3 },
  { id: 'loc_bath', name: '卫生间', icon: 'drop', sortOrder: 4 },
  { id: 'loc_store', name: '储物间', icon: 'box', sortOrder: 5 },
  { id: 'loc_bedroom', name: '卧室', icon: 'moon', sortOrder: 6 }
];
const PET_KINDS = ['cat', 'dog', 'other'];
const AVATAR_KEYS = ['cat-orange', 'cat-white', 'cat-tabby', 'cat-cow', 'cat-ragdoll', 'dog-corgi', 'dog-shiba', 'dog-golden', 'dog-teddy', 'rabbit', 'hamster'];
const UNITS = ['袋', '罐', '盒', '支', '包', '件'];

function blankState() {
  return {
    pets: [],
    categories: DEFAULT_CATEGORIES.map(c => ({ ...c })),
    products: [],
    locations: DEFAULT_LOCATIONS.map(l => ({ ...l })),
    purchases: [],
    purchaseItems: [],
    batches: [],
    movements: [],
    meta: {
      revision: 1,
      lastBackupAt: null,
      lastOpenAt: todayISO(),
      autoBackup: true,
      outSince: {},
      lastLocationId: 'loc_kitchen',
      snapshotAt: null,
      demo: false,
      seeded: true
    }
  };
}

function normalizeState(raw) {
  const s = { ...blankState(), ...(raw || {}) };
  s.meta = { ...blankState().meta, ...(raw && raw.meta ? raw.meta : {}) };
  ['pets', 'categories', 'products', 'locations', 'purchases', 'purchaseItems', 'batches', 'movements'].forEach(k => {
    if (!Array.isArray(s[k])) s[k] = [];
  });
  if (!s.categories.length) s.categories = DEFAULT_CATEGORIES.map(c => ({ ...c }));
  if (!s.locations.length) s.locations = DEFAULT_LOCATIONS.map(l => ({ ...l }));
  return s;
}

let state = null;

/* ============================================================
   4. 持久化（IndexedDB 单 key + 7 份滚动快照，localStorage 兜底）
   ============================================================ */
const DB_NAME = 'pet_ledger_v1';
let dbp = null;
function idb() {
  if (dbp) return dbp;
  dbp = new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) return reject(new Error('no idb'));
    const req = indexedDB.open(DB_NAME, 1);
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

let saveTimer = null;
let channel = null;

function persistNow() {
  const payload = JSON.stringify(state);
  try { localStorage.setItem(lsKey('state'), payload); } catch (e) { /* ignore */ }
  idbReq('kv', 'readwrite', store => store.put(payload, 'state')).catch(() => { });
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
function snapshotMaybe() {
  if (!state.meta.autoBackup) return;
  const now = Date.now();
  if (state.meta.snapshotAt && now - state.meta.snapshotAt < 3600000) return;
  state.meta.snapshotAt = now;
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
async function loadSnapshot() {
  const list = await idbReq('snap', 'readonly', store => store.getAll());
  if (!list || !list.length) return null;
  list.sort((a, b) => b.at - a.at);
  for (const item of list) {
    try {
      const s = normalizeState(JSON.parse(item.data));
      if (s && Array.isArray(s.pets)) return s;
    } catch (e) { /* 试上一个快照 */ }
  }
  return null;
}
async function listSnapshots() {
  const list = await idbReq('snap', 'readonly', store => store.getAll());
  return (list || []).sort((a, b) => b.at - a.at);
}
async function initStore() {
  let loaded = null;
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
    try { loaded = await loadSnapshot(); } catch (e) { /* ignore */ }
  }
  state = loaded || blankState();
  if (!loaded) persistNow();
  /* 上次使用距今 > 7 天 → 备份提醒（仅在有数据时） */
  const lastOpen = state.meta.lastOpenAt;
  state.meta.lastOpenAt = todayISO();
  persist();
  return { fresh: !loaded, lastOpen };
}

/* ============================================================
   5. 查询 / 派生
   ============================================================ */
function catById(id) { return state.categories.find(c => c.id === id) || null; }
function productById(id) { return state.products.find(p => p.id === id) || null; }
function petById(id) { return state.pets.find(p => p.id === id) || null; }
function locById(id) { return state.locations.find(l => l.id === id) || null; }
function purchaseById(id) { return state.purchases.find(p => p.id === id) || null; }

function stockMap() {
  const map = new Map();
  for (const row of resolveStock(state.batches)) map.set(row.productId, row);
  return map;
}
function productStock(productId) {
  return stockMap().get(productId) || { productId, qty: 0, earliestExpiry: null, batchCount: 0 };
}
function batchesOf(productId) {
  return state.batches.filter(b => b.productId === productId && b.qtyLeft > 0)
    .sort((a, b) => {
      if (a.expiryDate && b.expiryDate && a.expiryDate !== b.expiryDate) return a.expiryDate < b.expiryDate ? -1 : 1;
      if (!a.expiryDate && b.expiryDate) return 1;
      if (a.expiryDate && !b.expiryDate) return -1;
      return (a.receivedAt || '').localeCompare(b.receivedAt || '');
    });
}
function ledgerEntries() {
  const pmap = new Map(state.purchases.map(p => [p.id, p]));
  return state.purchaseItems.map(it => {
    const p = pmap.get(it.purchaseId) || {};
    const prod = productById(it.productId) || {};
    return {
      ...it,
      occurredAt: p.occurredAt || '',
      purchaseNote: p.note || '',
      categoryId: prod.categoryId || 'cat_other',
      productName: prod.name || '已删除商品',
      unit: prod.unit || '件'
    };
  });
}
function activeProducts() { return state.products.filter(p => !p.archived); }

/* 家庭级告警：临期 + 该补货 */
function pantryAlerts(today) {
  const stock = stockMap();
  const soon = [], low = [], expired = [];
  for (const p of activeProducts()) {
    const st = stock.get(p.id);
    if (!st || !(st.qty > 0)) continue;
    const cat = catById(p.categoryId);
    const eStat = expiryStatus(st.earliestExpiry, today, resolveRemindDays(p, cat));
    const base = { product: p, cat, stock: st, expiry: eStat, days: st.earliestExpiry ? diffDays(today, st.earliestExpiry) : null };
    if (eStat === 'expired') expired.push(base);
    else if (eStat === 'soon') soon.push(base);
    const rd = remainingDays(st.qty, p.dailyUsage);
    if (rd !== null && rd < (cat && cat.lowStockDays != null ? cat.lowStockDays : 5)) low.push({ ...base, remainDays: rd });
  }
  soon.sort((a, b) => a.days - b.days);
  expired.sort((a, b) => a.days - b.days);
  low.sort((a, b) => a.remainDays - b.remainDays);
  return { soon, expired, low, total: soon.length + expired.length };
}
function petAlerts(petId, today) {
  const stock = stockMap();
  const out = [];
  for (const p of activeProducts()) {
    if (p.petId !== petId) continue;
    const st = stock.get(p.id);
    if (!st || !(st.qty > 0)) continue;
    const cat = catById(p.categoryId);
    const es = expiryStatus(st.earliestExpiry, today, resolveRemindDays(p, cat));
    const rd = remainingDays(st.qty, p.dailyUsage);
    if (es === 'soon' || es === 'expired' || (rd !== null && rd < 5)) out.push({ product: p, stock: st, es, rd });
  }
  return out;
}
function familyMonthlyTotal(today) { return monthlyTotal(ledgerEntries(), monthKey(today)); }
function outOfStockDays(productId, today) {
  const since = state.meta.outSince && state.meta.outSince[productId];
  if (!since) return 0;
  return Math.max(0, diffDays(since, today));
}
function ledgerDates() { return [...new Set(state.purchases.map(p => (p.occurredAt || '').slice(0, 10)).filter(Boolean))]; }
function streakInfo(today) { return computeStreak(ledgerDates(), today); }
function levelInfo() { return computeLevel(state.purchases.length); }

function petExclusiveSpend(petId, month) {
  return monthlyTotal(ledgerEntries().filter(e => e.petId === petId), month);
}
function categoryOfEntry(e) { return catById(e.categoryId) || catById('cat_other'); }

/* ============================================================
   6. 业务动作
   ============================================================ */
function nextSort(list) { return list.reduce((m, x) => Math.max(m, x.sortOrder || 0), 0) + 1; }

const Actions = {
  /* --- 宠物 --- */
  addPet(data) {
    const pet = {
      id: uid('pet'), name: data.name.trim(), species: data.species || 'cat',
      breed: data.breed || '', birthday: data.birthday || '', gender: data.gender || 'unknown',
      avatarType: data.avatarType || 'svg', avatarRef: data.avatarRef || AVATAR_KEYS[0],
      note: data.note || '', sortOrder: nextSort(state.pets), createdAt: nowISO()
    };
    commit(s => { s.pets.push(pet); });
    return pet;
  },
  updatePet(id, patch) {
    commit(s => { const p = s.pets.find(x => x.id === id); if (p) Object.assign(p, patch); });
  },
  deletePet(id) {
    const count = state.purchaseItems.filter(i => i.petId === id).length;
    commit(s => {
      s.pets = s.pets.filter(p => p.id !== id);
      s.purchaseItems.forEach(i => { if (i.petId === id) i.petId = null; });
      s.products.forEach(p => { if (p.petId === id) p.petId = null; });
    });
    return count;
  },
  movePet(fromIdx, toIdx) {
    const arr = state.pets.slice().sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    if (toIdx < 0 || toIdx >= arr.length) return;
    const [item] = arr.splice(fromIdx, 1);
    arr.splice(toIdx, 0, item);
    commit(s => { arr.forEach((p, i) => { const t = s.pets.find(x => x.id === p.id); if (t) t.sortOrder = i + 1; }); });
  },

  /* --- 商品 --- */
  addProduct(data) {
    const prod = {
      id: uid('prod'), name: data.name.trim(), categoryId: data.categoryId,
      unit: data.unit || '件', spec: data.spec || '', dailyUsage: Number(data.dailyUsage) || 0,
      remindDays: data.remindDays === '' || data.remindDays == null ? null : Number(data.remindDays),
      petId: data.petId || null, note: data.note || '', archived: 0, createdAt: nowISO()
    };
    commit(s => { s.products.push(prod); });
    return prod;
  },
  updateProduct(id, patch) {
    commit(s => {
      const p = s.products.find(x => x.id === id);
      if (p) Object.assign(p, patch);
    });
  },
  archiveProduct(id) {
    commit(s => { const p = s.products.find(x => x.id === id); if (p) p.archived = p.archived ? 0 : 1; });
  },

  /* --- 品类 / 位置 --- */
  addCategory(data) {
    const cat = {
      id: uid('cat'), name: data.name.trim(), icon: data.icon || 'gift',
      color: data.color || '#C9B8E8', remindDays: Number(data.remindDays) || 7,
      lowStockDays: Number(data.lowStockDays) || 5, shelfLifeDays: Number(data.shelfLifeDays) || 0,
      sortOrder: nextSort(state.categories), builtin: 0
    };
    commit(s => { s.categories.push(cat); });
    return cat;
  },
  updateCategory(id, patch) {
    commit(s => { const c = s.categories.find(x => x.id === id); if (c) Object.assign(c, patch); });
  },
  deleteCategory(id) {
    if (state.categories.find(c => c.id === id && c.builtin)) return -1;
    const used = state.products.filter(p => p.categoryId === id).length;
    if (used) return -used;
    commit(s => { s.categories = s.categories.filter(c => c.id !== id); });
    return 0;
  },
  addLocation(data) {
    const loc = { id: uid('loc'), name: data.name.trim(), icon: data.icon || 'box', sortOrder: nextSort(state.locations) };
    commit(s => { s.locations.push(loc); });
    return loc;
  },
  updateLocation(id, patch) {
    commit(s => { const l = s.locations.find(x => x.id === id); if (l) Object.assign(l, patch); });
  },
  deleteLocation(id) {
    const items = state.batches.filter(b => b.qtyLeft > 0 && b.locationId === id).length;
    commit(s => {
      s.locations = s.locations.filter(l => l.id !== id);
      s.batches.forEach(b => { if (b.locationId === id && b.qtyLeft > 0) b.locationId = null; });
      s.purchaseItems.forEach(i => { if (i.locationId === id) i.locationId = null; });
      if (s.meta.lastLocationId === id) s.meta.lastLocationId = null;
    });
    return items;
  },

  /* --- 记一笔（单事务：purchase + items + batches + movements） --- */
  savePurchase(draft, purchaseId) {
    const today = draft.date || todayISO();
    const occurredAt = new Date().toISOString();
    let result = null;
    commit(s => {
      if (purchaseId) {
        /* 编辑：先冲销原单的未消耗库存 */
        const old = s.purchases.find(p => p.id === purchaseId);
        if (old) {
          s.purchaseItems.filter(i => i.purchaseId === purchaseId).forEach(it => {
            s.batches.filter(b => b.purchaseItemId === it.id && b.qtyLeft > 0).forEach(b => {
              s.movements.push({ id: uid('mv'), productId: b.productId, batchId: b.id, type: 'adjust', qty: -b.qtyLeft, happenedAt: occurredAt, note: '编辑采购单冲销' });
              b.qtyLeft = 0;
            });
          });
          s.purchases = s.purchases.filter(p => p.id !== purchaseId);
          s.purchaseItems = s.purchaseItems.filter(i => i.purchaseId !== purchaseId);
        }
      }
      const total = purchaseTotal(draft.lines);
      const pid = purchaseId || uid('pur');
      const d = new Date();
      const purchase = { id: pid, occurredAt: `${today}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`, total, note: draft.note || '', createdAt: occurredAt };
      s.purchases.push(purchase);
      let lastLoc = null;
      for (const line of draft.lines) {
        const itemId = uid('pi');
        const sub = lineSubtotal(line.qty, line.unitPrice);
        s.purchaseItems.push({
          id: itemId, purchaseId: pid, productId: line.productId, qty: Number(line.qty) || 0,
          unitPrice: Number(line.unitPrice) || 0, subtotal: sub, expiryDate: line.expiryDate || null,
          locationId: line.locationId || null, petId: line.petId || null
        });
        if (line.qty > 0) {
          const batch = {
            id: uid('bat'), productId: line.productId, purchaseItemId: itemId,
            qtyIn: Number(line.qty) || 0, qtyLeft: Number(line.qty) || 0,
            expiryDate: line.expiryDate || null, locationId: line.locationId || null,
            receivedAt: occurredAt, openedAt: null
          };
          s.batches.push(batch);
          s.movements.push({ id: uid('mv'), productId: line.productId, batchId: batch.id, type: 'in', qty: batch.qtyIn, happenedAt: occurredAt, note: draft.note || '入库' });
          if (s.meta.outSince) delete s.meta.outSince[line.productId];
        }
        if (line.locationId) lastLoc = line.locationId;
      }
      if (lastLoc) s.meta.lastLocationId = lastLoc;
      s.meta.lastPurchaseAt = occurredAt;
      result = { id: pid, total, count: draft.lines.length };
    });
    return result;
  },
  deletePurchase(id) {
    const today = todayISO();
    commit(s => {
      const items = s.purchaseItems.filter(i => i.purchaseId === id);
      items.forEach(it => {
        s.batches.filter(b => b.purchaseItemId === it.id).forEach(b => {
          if (b.qtyLeft > 0) {
            s.movements.push({ id: uid('mv'), productId: b.productId, batchId: b.id, type: 'adjust', qty: -b.qtyLeft, happenedAt: nowISO(), note: '删除采购单冲销' });
            b.qtyLeft = 0;
          }
        });
      });
      s.purchases = s.purchases.filter(p => p.id !== id);
      s.purchaseItems = s.purchaseItems.filter(i => i.purchaseId !== id);
    });
    return items.length;
  },
  updatePurchaseNote(id, note) {
    commit(s => { const p = s.purchases.find(x => x.id === id); if (p) p.note = note; });
  },

  /* --- 出库（FEFO） --- */
  consume(productId, qty) {
    const need = Math.max(0, Number(qty) || 0);
    const today = todayISO();
    let done = 0;
    commit(s => {
      const batches = s.batches.filter(b => b.productId === productId && b.qtyLeft > 0);
      const plan = planConsume(batches, need);
      for (const a of plan.allocations) {
        const b = s.batches.find(x => x.id === a.batchId);
        if (!b) continue;
        b.qtyLeft = r2(b.qtyLeft - a.qty);
        s.movements.push({ id: uid('mv'), productId, batchId: b.id, type: 'out', qty: -a.qty, happenedAt: nowISO(), note: '日常消耗' });
        done = r2(done + a.qty);
      }
      const left = s.batches.filter(b => b.productId === productId && b.qtyLeft > 0).reduce((a, b) => a + b.qtyLeft, 0);
      if (left <= 0) {
        if (!s.meta.outSince) s.meta.outSince = {};
        s.meta.outSince[productId] = today;
      }
    });
    return done;
  },
  /* --- 盘库：绝对值对齐 --- */
  adjustStock(productId, target) {
    const today = todayISO();
    const cur = productStock(productId).qty;
    const diff = r2(Number(target) - cur);
    if (!diff) return 0;
    commit(s => {
      if (diff > 0) {
        const batch = {
          id: uid('bat'), productId, purchaseItemId: null, qtyIn: diff, qtyLeft: diff,
          expiryDate: null, locationId: s.meta.lastLocationId || null, receivedAt: nowISO(), openedAt: null
        };
        s.batches.push(batch);
        s.movements.push({ id: uid('mv'), productId, batchId: batch.id, type: 'adjust', qty: diff, happenedAt: nowISO(), note: '盘库补齐' });
      } else {
        const plan = planConsume(s.batches.filter(b => b.productId === productId && b.qtyLeft > 0), -diff);
        plan.allocations.forEach(a => {
          const b = s.batches.find(x => x.id === a.batchId);
          if (!b) return;
          b.qtyLeft = r2(b.qtyLeft - a.qty);
          s.movements.push({ id: uid('mv'), productId, batchId: b.id, type: 'adjust', qty: -a.qty, happenedAt: nowISO(), note: '盘库核减' });
        });
      }
      if (s.meta.outSince) {
        if (Number(target) <= 0) s.meta.outSince[productId] = today;
        else delete s.meta.outSince[productId];
      }
    });
    return diff;
  },

  /* --- 数据 --- */
  markBackup() { commit(s => { s.meta.lastBackupAt = nowISO(); }); },
  setMeta(patch) { commit(s => Object.assign(s.meta, patch)); },
  clearAll() {
    commit(s => {
      const fresh = blankState();
      Object.keys(fresh).forEach(k => { s[k] = fresh[k]; });
      s.meta.revision = (state.meta.revision || 0) + 1;
    });
  },
  replaceAll(newState) {
    commit(s => {
      const rev = (s.meta.revision || 0) + 1;
      const fresh = normalizeState(newState);
      Object.keys(fresh).forEach(k => { s[k] = fresh[k]; });
      s.meta.revision = rev;
      s.meta.lastBackupAt = nowISO();
    });
  }
};

/* ============================================================
   7. 导出 / 导入
   ============================================================ */
function exportPayload() {
  return {
    app: 'pet-ledger', version: 1, exportedAt: nowISO(), revision: state.meta.revision,
    tables: {
      pet: state.pets, category: state.categories, product: state.products, location: state.locations,
      purchase: state.purchases, purchase_item: state.purchaseItems, stock_batch: state.batches,
      stock_movement: state.movements, app_meta: [{ key: 'revision', value: String(state.meta.revision) }]
    }
  };
}
function toCSV() {
  const rows = [['日期', '备注', '商品', '品类', '数量', '单位', '单价', '小计', '到期日', '位置', '归属']];
  const pmap = new Map(state.purchases.map(p => [p.id, p]));
  for (const it of state.purchaseItems) {
    const p = pmap.get(it.purchaseId) || {};
    const prod = productById(it.productId) || {};
    const cat = catById(prod.categoryId);
    rows.push([
      (p.occurredAt || '').slice(0, 10), p.note || '', prod.name || '', cat ? cat.name : '',
      it.qty, prod.unit || '件', it.unitPrice, it.subtotal, it.expiryDate || '',
      (locById(it.locationId) || {}).name || '', petById(it.petId) ? petById(it.petId).name : '共享池'
    ]);
  }
  return rows.map(r => r.map(c => {
    const s = c == null ? '' : String(c);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }).join(',')).join('\r\n');
}
function download(filename, content, type) {
  const blob = new Blob([content], { type: type || 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 800);
}
function importPayload(obj) {
  if (!obj || typeof obj !== 'object') throw new Error('文件内容不是合法 JSON');
  const t = obj.tables || obj;
  if (!t || (!Array.isArray(t.pet) && !Array.isArray(t.pets))) throw new Error('缺少 pet 表，无法识别备份格式');
  const count = (t.purchase || t.purchases || []).length;
  const next = {
    pets: t.pet || t.pets || [],
    categories: t.category || t.categories || [],
    products: t.product || t.products || [],
    locations: t.location || t.locations || [],
    purchases: t.purchase || t.purchases || [],
    purchaseItems: t.purchase_item || t.purchaseItems || [],
    batches: t.stock_batch || t.batches || [],
    movements: t.stock_movement || t.movements || [],
    meta: state.meta
  };
  return { state: next, count };
}

/* ============================================================
   8. 示例数据（只在用户主动点击时载入）
   ============================================================ */
function seedDemo() {
  if (!state) state = blankState();
  const today = todayISO();
  let seed = 20261125;
  const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };

  const pets = [
    { id: 'pet_doudou', name: '豆豆', species: 'cat', breed: '橘猫', birthday: '2022-04-18', gender: 'male', avatarType: 'svg', avatarRef: 'cat-orange', note: '怕生，爱吃冻干', sortOrder: 1, createdAt: nowISO() },
    { id: 'pet_tuanzi', name: '团子', species: 'dog', breed: '柯基', birthday: '2021-09-02', gender: 'female', avatarType: 'svg', avatarRef: 'dog-corgi', note: '见人就摇尾巴', sortOrder: 2, createdAt: nowISO() }
  ];
  const locs = DEFAULT_LOCATIONS.map((l, i) => ({ ...l, sortOrder: i + 1 }));
  const cats = DEFAULT_CATEGORIES.map(c => ({ ...c }));

  const prods = [
    { name: '荒野盛宴 鸡肉粮', categoryId: 'cat_food', unit: '袋', spec: '1.5kg', dailyUsage: 0.08, price: 168, loc: 'loc_kitchen', pet: null },
    { name: '处方化毛粮', categoryId: 'cat_food', unit: '袋', spec: '1.2kg', dailyUsage: 0.05, price: 236, loc: 'loc_kitchen', pet: 'pet_doudou', remind: 30 },
    { name: '豆腐砂', categoryId: 'cat_litter', unit: '袋', spec: '6L', dailyUsage: 0.22, price: 39, loc: 'loc_balcony', pet: null },
    { name: '膨润土砂', categoryId: 'cat_litter', unit: '袋', spec: '10kg', dailyUsage: 0.18, price: 55, loc: 'loc_balcony', pet: null },
    { name: '泌尿护理罐头', categoryId: 'cat_med', unit: '罐', spec: '85g', dailyUsage: 0.5, price: 32, loc: 'loc_fridge', pet: 'pet_doudou', remind: 20 },
    { name: '体内驱虫片', categoryId: 'cat_med', unit: '盒', spec: '4 片', dailyUsage: 0, price: 128, loc: 'loc_fridge', pet: 'pet_tuanzi' },
    { name: '冻干鸡胸', categoryId: 'cat_other', unit: '包', spec: '200g', dailyUsage: 0.1, price: 48, loc: 'loc_fridge', pet: null },
    { name: '逗猫棒', categoryId: 'cat_toy', unit: '支', spec: '羽毛', dailyUsage: 0, price: 19, loc: 'loc_bedroom', pet: null },
    { name: '狗粮 三文鱼味', categoryId: 'cat_food', unit: '袋', spec: '3kg', dailyUsage: 0.12, price: 198, loc: 'loc_kitchen', pet: 'pet_tuanzi' },
    { name: '漏食球', categoryId: 'cat_toy', unit: '个', spec: 'M', dailyUsage: 0, price: 36, loc: 'loc_bedroom', pet: 'pet_tuanzi' }
  ];
  const products = prods.map((p, i) => ({
    id: 'prod_' + i, name: p.name, categoryId: p.categoryId, unit: p.unit, spec: p.spec,
    dailyUsage: p.dailyUsage, remindDays: p.remind || null, petId: p.pet, note: '', archived: 0,
    createdAt: nowISO(), _loc: p.loc, _price: p.price
  }));

  const purchases = [], items = [], batches = [], movements = [];
  const month0 = monthKey(today);
  for (let back = 3; back >= 0; back--) {
    const mk = shiftMonth(month0, -back);
    const [y, m] = mk.split('-').map(Number);
    const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const n = back === 0 ? 3 : 3 + Math.floor(rnd() * 2);
    for (let k = 0; k < n; k++) {
      const maxDay = back === 0 ? Math.max(1, Number(today.slice(8))) : daysInMonth;
      const day = Math.min(daysInMonth, 1 + Math.floor(rnd() * maxDay));
      const date = `${mk}-${pad(day)}`;
      const pid = uid('pur');
      const pick = [products[Math.floor(rnd() * products.length)]];
      const second = products[Math.floor(rnd() * products.length)];
      if (second && second.id !== pick[0].id && rnd() > 0.4) pick.push(second);
      let total = 0;
      const its = [];
      for (const prod of pick) {
        const qty = prod.dailyUsage > 0 ? 2 + Math.floor(rnd() * 3) : 1 + Math.floor(rnd() * 2);
        const price = r2(prod._price * (0.92 + rnd() * 0.16));
        const sub = r2(qty * price);
        total = r2(total + sub);
        const itemId = uid('pi');
        const cat = cats.find(c => c.id === prod.categoryId);
        const exp = cat && cat.shelfLifeDays ? addDays(date, cat.shelfLifeDays) : null;
        const item = {
          id: itemId, purchaseId: pid, productId: prod.id, qty, unitPrice: price, subtotal: sub,
          expiryDate: exp, locationId: prod._loc, petId: prod.petId || null
        };
        items.push(item); its.push(item);
      }
      purchases.push({ id: pid, occurredAt: `${date}T1${Math.floor(rnd() * 9)}:00:00`, total, note: pick.length > 1 ? '囤货' : '', createdAt: nowISO() });
      for (const it of its) {
        const batchId = uid('bat');
        batches.push({
          id: batchId, productId: it.productId, purchaseItemId: it.id, qtyIn: it.qty, qtyLeft: it.qty,
          expiryDate: it.expiryDate, locationId: it.locationId, receivedAt: `${date}T12:00:00`, openedAt: null
        });
        movements.push({ id: uid('mv'), productId: it.productId, batchId, type: 'in', qty: it.qty, happenedAt: `${date}T12:00:00`, note: '入库' });
      }
    }
  }

  /* 把库存调成「像在用」的状态：每种商品留 20~40 天，少数刻意做成临期 / 断货 */
  const targetDays = { 0: 32, 1: 24, 2: 2, 3: 18, 4: 8, 5: 1, 6: 14, 7: 0, 8: 38, 9: 1 };
  const outSince = {};
  products.forEach((prod, i) => {
    const myBatches = batches.filter(b => b.productId === prod.id)
      .sort((a, b) => (a.expiryDate || '9999').localeCompare(b.expiryDate || '9999'));
    const total = r2(myBatches.reduce((a, b) => a + b.qtyLeft, 0));
    const days = targetDays[i] == null ? 20 : targetDays[i];
    const target = prod.dailyUsage > 0
      ? (days === 0 ? 0 : Math.max(1, Math.round(prod.dailyUsage * days)))
      : (days === 0 ? 0 : Math.min(2, total));
    if (total > target) {
      let need = r2(total - target);
      for (const b of myBatches) {
        if (need <= 0) break;
        const take = Math.min(b.qtyLeft, need);
        b.qtyLeft = r2(b.qtyLeft - take);
        need = r2(need - take);
        movements.push({ id: uid('mv'), productId: prod.id, batchId: b.id, type: 'out', qty: -take, happenedAt: `${addDays(today, -1)}T09:00:00`, note: '日常消耗' });
      }
    } else if (total < target) {
      const extra = r2(target - total);
      const batchId = uid('bat');
      batches.push({
        id: batchId, productId: prod.id, purchaseItemId: null, qtyIn: extra, qtyLeft: extra,
        expiryDate: addDays(today, 240), locationId: prod._loc, receivedAt: `${addDays(today, -6)}T12:00:00`, openedAt: null
      });
      movements.push({ id: uid('mv'), productId: prod.id, batchId, type: 'adjust', qty: extra, happenedAt: `${addDays(today, -6)}T12:00:00`, note: '盘库补齐' });
    }
    if (target === 0 && total > 0) outSince[prod.id] = addDays(today, -3);
  });

  /* 刻意制造两段告警：豆腐砂临期、罐头快临期且量少 */
  const adjustExpiry = (pid, expiry) => {
    const b = batches.find(x => x.productId === pid && x.qtyLeft > 0);
    if (b) b.expiryDate = expiry;
  };
  adjustExpiry('prod_2', addDays(today, 20));
  adjustExpiry('prod_4', addDays(today, 5));
  adjustExpiry('prod_6', addDays(today, 6));

  const cleanProducts = products.map(({ _loc, _price, ...p }) => p);
  const next = {
    pets, categories: cats, products: cleanProducts, locations: locs,
    purchases, purchaseItems: items, batches, movements,
    meta: { ...blankState().meta, revision: 1, lastBackupAt: addDays(today, -9) + 'T10:00:00', demo: true, lastLocationId: 'loc_kitchen', outSince }
  };
  Actions.replaceAll(next);
}
