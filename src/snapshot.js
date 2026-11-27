/* ============================================================
   手表快照（v1.2）
   生成一份只读 JSON（补给告警 / 本月支出 / 宠物 / 打卡），
   写入 App 沙盒 Documents/watch-snapshot.json，并通知原生 WatchBridge
   通过 WatchConnectivity 推送到 Apple Watch。
   不依赖 App Group（见 ADR-0004）。
   ============================================================ */

function buildWatchSnapshot() {
  const today = todayISO();
  const alerts = pantryAlerts(today);
  const out = [];

  /* 已过期 / 临期优先，其次该补货 */
  for (const it of (alerts.expired || []).concat(alerts.soon || [])) {
    out.push({
      name: it.product ? it.product.name : '',
      kind: 'expire',
      days: it.days == null ? null : it.days,          // 负数=已过期
      qty: it.stock ? r2(it.stock.qty) : 0,
      unit: it.product ? it.product.unit : '件',
      location: (it.stock && it.stock.locationId && locById(it.stock.locationId)) ? locById(it.stock.locationId).name : ''
    });
  }
  for (const it of (alerts.low || [])) {
    out.push({
      name: it.product ? it.product.name : '',
      kind: 'low',
      days: it.remainDays == null ? null : it.remainDays,
      qty: it.stock ? r2(it.stock.qty) : 0,
      unit: it.product ? it.product.unit : '件',
      location: (it.stock && it.stock.locationId && locById(it.stock.locationId)) ? locById(it.stock.locationId).name : ''
    });
  }
  /* 去重 + 截断 */
  const seen = new Set();
  const uniq = [];
  for (const a of out) {
    const k = a.kind + '|' + a.name;
    if (seen.has(k)) continue;
    seen.add(k);
    uniq.push(a);
    if (uniq.length >= 6) break;
  }

  const month = monthKey(today);
  const cb = categoryBreakdown(ledgerEntries(), month, state.categories) || [];

  return {
    schema: 2,
    generatedAt: new Date().toISOString(),
    today,
    alerts: uniq,
    monthTotal: r2(familyMonthlyTotal(today)),
    monthCount: (state.purchases || []).filter(p => monthKey(p.occurredAt) === month).length,
    categories: cb.slice(0, 4).map(c => ({
      name: (catById(c.categoryId) || {}).name || '其他',
      ratio: Math.round((c.ratio || 0) * 100) / 100
    })),
    pets: (state.pets || []).slice(0, 6).map(p => ({
      name: p.name,
      breed: p.breed || speciesLabel(p),
      age: p.birthday ? ageLabel(petAge(p.birthday, today)) : ''
    })),
    products: activeProducts().slice(0, 30).map(p => {
      const st = productStock(p.id);
      const lp = (typeof lastPrice === 'function') ? lastPrice(p.id) : null;
      return {
        id: p.id,
        name: p.name,
        qty: r2(st.qty || 0),
        unit: p.unit || '件',
        lastPrice: lp == null ? null : r2(lp)
      };
    }),
    streak: streakInfo(today).current,
    level: levelInfo().level,
    totalEntries: (state.purchases || []).length
  };
}

let __watchTimer = null;
function scheduleWatchSync() {
  if (!isNative()) return;
  clearTimeout(__watchTimer);
  __watchTimer = setTimeout(writeWatchSnapshot, 900);
}

async function writeWatchSnapshot() {
  if (!isNative()) return;
  try {
    const fs = nativePlugin('Filesystem');
    if (!fs) return;
    const snap = buildWatchSnapshot();
    await fs.writeFile({
      path: 'watch-snapshot.json',
      data: JSON.stringify(snap),
      directory: 'DOCUMENTS',
      encoding: 'utf8',
      recursive: true
    });
    const bridge = nativePlugin('WatchBridge');
    if (bridge && bridge.sync) {
      try { await bridge.sync(); } catch (e) { /* 手表未配对时静默 */ }
    }
    scheduleAlertNotifications(snap);
  } catch (e) { /* 静默：不影响主流程 */ }
}


/* ---- 本地通知：临期 / 断货提醒（iPhone 锁屏时镜像到手表）---- */
async function scheduleAlertNotifications(snap) {
  if (!isNative()) return;
  try {
    const n = nativePlugin('Notifier');
    if (!n || !n.schedule) return;
    if (!state.meta.notifAsked) {
      state.meta.notifAsked = true;
      try { await n.request(); } catch (e) { /* ignore */ }
    }
    const now = Date.now();
    const items = [];
    const alerts = (snap && snap.alerts) || [];
    for (const a of alerts.slice(0, 5)) {
      const d = a.days;
      let at;
      if (d == null) continue;
      if (d <= 0) {
        at = now + 60 * 1000;                 // 已过期/已断货：一分钟后提醒一次
      } else {
        // 提前一天 09:00 提醒
        const target = new Date();
        target.setDate(target.getDate() + Math.max(0, d - 1));
        target.setHours(9, 0, 0, 0);
        at = target.getTime();
        if (at <= now) at = now + 60 * 1000;
      }
      const title = '宠物账本 · 补给提醒';
      const body = (a.kind === 'expire')
        ? (d < 0 ? `${a.name} 已过期，尽快处理` : `${a.name} ${d} 天后过期`)
        : `${a.name} 约剩 ${d} 天，该补货了`;
      items.push({ id: 'a_' + encodeURIComponent(a.name) + '_' + a.kind, title, body, at });
    }
    if (items.length) { try { await n.schedule({ items }); } catch (e) { /* ignore */ } }
  } catch (e) { /* ignore */ }
}
