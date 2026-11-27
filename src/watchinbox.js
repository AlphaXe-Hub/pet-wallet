/* ============================================================
   手表上行操作处理（v1.2.1）
   手表发来的 {action:'out'|'in', productId, qty, id} 由原生存入
   Documents/watch-inbox.json；这里取出并应用到账本（幂等）。
   ============================================================ */

function _appliedWatchIds() {
  if (!Array.isArray(state.meta.appliedWatchActions)) state.meta.appliedWatchActions = [];
  return state.meta.appliedWatchActions;
}

function _applyOneWatchAction(a) {
  if (!a || !a.productId) return false;
  const prod = productById(a.productId);
  if (!prod) return false;
  const qty = Math.max(0, Number(a.qty) || 0) || 1;

  if (a.action === 'out') {
    Actions.consume(a.productId, qty);
    return true;
  }
  if (a.action === 'in') {
    const price = lastPrice(a.productId);
    if (price == null) return false; // 没有历史单价，无法补货
    const cat = catById(prod.categoryId);
    const shelf = cat ? cat.shelfLifeDays : 0;
    Actions.savePurchase({
      date: todayISO(),
      note: '手表补货',
      lines: [{
        productId: a.productId,
        qty: qty,
        unitPrice: price,
        expiryDate: defaultExpiry(todayISO(), shelf),
        locationId: state.meta.lastLocationId || null,
        petId: prod.petId || null
      }]
    });
    return true;
  }
  return false;
}

async function drainWatchInbox() {
  if (!isNative()) return;
  const bridge = nativePlugin('WatchBridge');
  if (!bridge || !bridge.drainInbox) return;
  let res = null;
  try { res = await bridge.drainInbox(); } catch (e) { return; }
  const txt = res && res.actions;
  if (!txt) return;
  let arr = [];
  try { arr = JSON.parse(txt); } catch (e) { return; }
  if (!Array.isArray(arr) || !arr.length) return;

  const applied = _appliedWatchIds();
  let okCount = 0, failCount = 0;
  for (const a of arr) {
    if (!a || !a.id || applied.includes(a.id)) continue;
    let ok = false;
    try { ok = _applyOneWatchAction(a); } catch (e) { ok = false; }
    if (ok) { applied.push(a.id); okCount++; } else { failCount++; }
  }
  state.meta.appliedWatchActions = applied.slice(-80);

  if (okCount) {
    if (typeof render === 'function') { try { render(); } catch (e) { /* ignore */ } }
    try { Toast.show(`已处理 ${okCount} 个手表操作`); } catch (e) { /* ignore */ }
  }
  if (failCount) {
    try { Toast.show('有手表操作未能执行（缺商品或历史单价）'); } catch (e) { /* ignore */ }
  }
  try { if (typeof writeWatchSnapshot === 'function') writeWatchSnapshot(); } catch (e) { /* ignore */ }
}

function initWatchInbox() {
  if (!isNative()) return;
  const bridge = nativePlugin('WatchBridge');
  if (bridge && bridge.addListener) {
    try { bridge.addListener('watchAction', () => { drainWatchInbox(); }); } catch (e) { /* ignore */ }
  }
  /* 回到前台时补处理（后台收到、JS 未运行的情况） */
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') drainWatchInbox();
  });
  window.addEventListener('focus', () => drainWatchInbox());
}
