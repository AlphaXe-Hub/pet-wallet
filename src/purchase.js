/* ============================================================
   记一笔
   ============================================================ */
let purchaseDraft = null;
let purchaseEditId = null;
let pendingPickIdx = null;

function blankLine(seed) {
  return {
    productId: (seed && seed.productId) || null,
    qty: (seed && seed.qty) || 1,
    unitPrice: seed && seed.unitPrice != null ? seed.unitPrice : '',
    expiryDate: seed && seed.expiryDate !== undefined ? seed.expiryDate : null,
    locationId: (seed && seed.locationId) || state.meta.lastLocationId || (state.locations[0] || {}).id || null,
    petId: (seed && seed.petId) || null,
    touchedExpiry: false
  };
}

function openPurchase(opts) {
  const o = opts || {};
  purchaseEditId = o.editId || null;
  if (purchaseEditId) {
    const p = purchaseById(purchaseEditId);
    const items = state.purchaseItems.filter(i => i.purchaseId === purchaseEditId);
    purchaseDraft = {
      id: purchaseEditId,
      date: (p.occurredAt || todayISO()).slice(0, 10),
      note: p.note || '',
      lines: items.map(i => ({
        productId: i.productId, qty: i.qty, unitPrice: i.unitPrice,
        expiryDate: i.expiryDate || null, locationId: i.locationId, petId: i.petId, touchedExpiry: true
      }))
    };
  } else {
    const seed = o.productId ? { productId: o.productId, qty: 1, petId: o.petId || null } : null;
    const line = blankLine(seed);
    if (o.productId) fillLineDefaults(line, o.productId);
    purchaseDraft = { date: todayISO(), note: '', lines: [line] };
  }
  openSheet({
    title: purchaseEditId ? '编辑采购' : '记一笔',
    body: purchaseBody(),
    foot: purchaseFoot(),
    onMount: () => { requestAnimationFrame(updatePurchaseTotals); }
  });
}

function fillLineDefaults(line, productId) {
  const p = productById(productId);
  if (!p) return;
  const cat = catById(p.categoryId);
  const price = lastPrice(productId);
  if (price != null && line.unitPrice === '') line.unitPrice = price;
  if (!line.touchedExpiry) line.expiryDate = defaultExpiry(purchaseDraft.date, cat ? cat.shelfLifeDays : 0);
  if (p.petId) line.petId = p.petId;
  if (p.dailyUsage) line.qty = Math.max(1, line.qty);
}

function purchaseBody() {
  const d = purchaseDraft;
  return `<div class="field-row">
    <div class="field"><label>采购日期</label><input class="input" type="date" data-bind="purDate" value="${d.date}"></div>
    <div class="field"><label>备注（可选）</label><input class="input" data-bind="purNote" value="${esc(d.note)}" placeholder="双十一囤货"></div>
  </div>
  <div id="lineList">
    ${d.lines.map((l, idx) => purchaseLineHTML(l, idx)).join('')}
  </div>
  <button class="addline-btn" data-act="addLine">${icon('plus', 16)} 再加一件</button>
  <p class="hint" style="margin-top:12px">到期日会按品类预设的保质期自动算好，留空表示没有保质期。</p>`;
}
function purchaseLineHTML(l, idx) {
  const p = l.productId ? productById(l.productId) : null;
  const cat = p ? catById(p.categoryId) : null;
  const sub = lineSubtotal(l.qty, l.unitPrice || 0);
  return `<div class="line-row" data-line="${idx}">
    <div class="line-top">
      <span class="no">第 ${idx + 1} 件</span>
      ${purchaseDraft.lines.length > 1 ? `<button class="sheet-close" data-act="removeLine" data-idx="${idx}" style="width:26px;height:26px" aria-label="删除这行">${icon('close', 13)}</button>` : ''}
    </div>
    <button class="prod-pick" data-act="pickProduct" data-idx="${idx}">
      <span class="pic" style="background:transparent;color:${cat ? cat.color : '#A99A88'}">${p ? catIcon(cat ? cat.icon : 'gift', 34) : icon('plus', 30)}</span>
      <span class="txt">
        <span class="a">${p ? esc(p.name) : '选择商品'}</span>
        <span class="b">${p ? `${esc(cat ? cat.name : '')}${p.spec ? ' · ' + esc(p.spec) : ''} · 上次 ¥${lastPrice(p.id) == null ? '—' : fmt2(lastPrice(p.id))}` : '可以搜索，也可以现场新建'}</span>
      </span>
      <span class="hintplus">${p ? '更换' : '选'}</span>
    </button>
    <div class="line-grid">
      <div class="mini-field"><label>数量${p ? '（' + esc(p.unit) + '）' : ''}</label>
        <input class="input" type="number" inputmode="decimal" min="0" step="1" data-bind="qty" data-idx="${idx}" value="${l.qty}"></div>
      <div class="mini-field"><label>单价（元）</label>
        <input class="input" type="number" inputmode="decimal" min="0" step="0.01" data-bind="price" data-idx="${idx}" value="${l.unitPrice}" placeholder="0.00"></div>
      <div class="mini-field"><label>到期日</label>
        <input class="input" type="date" data-bind="expiry" data-idx="${idx}" value="${l.expiryDate || ''}"></div>
      <div class="mini-field"><label>位置</label>
        <select class="select" data-bind="loc" data-idx="${idx}">
          <option value="">未记录</option>
          ${state.locations.map(lo => `<option value="${lo.id}" ${l.locationId === lo.id ? 'selected' : ''}>${esc(lo.name)}</option>`).join('')}
        </select></div>
    </div>
    <div class="mini-field" style="margin-top:10px"><label>归属</label>
      <select class="select" data-bind="pet" data-idx="${idx}">
        <option value="">共享池（大家一起用）</option>
        ${state.pets.map(pt => `<option value="${pt.id}" ${l.petId === pt.id ? 'selected' : ''}>${esc(pt.name)}</option>`).join('')}
        ${l.petId && !state.pets.some(pt => pt.id === l.petId) ? `<option value="${l.petId}" selected>已删除的宠物</option>` : ''}
      </select>
    </div>
    <div class="line-sub"><span>小计</span><b data-sub="${idx}">¥${fmtMoney(sub)}</b></div>
  </div>`;
}
function purchaseFoot() {
  const total = purchaseTotal(purchaseDraft.lines);
  return `<div class="pay-bar">
    <div class="sum"><div class="l">合计 · ${purchaseDraft.lines.length} 件</div><div class="v" id="draftTotal">¥${fmtMoney(total)}</div></div>
    <button class="btn btn-primary" style="min-width:132px" data-act="savePurchase">${purchaseEditId ? '保存修改' : '保存这笔'}</button>
  </div>`;
}

function syncPurchaseForm() {
  if (!purchaseDraft) return;
  const d = purchaseDraft;
  const dateEl = document.querySelector('[data-bind="purDate"]');
  if (dateEl) d.date = dateEl.value || d.date;
  const noteEl = document.querySelector('[data-bind="purNote"]');
  if (noteEl) d.note = noteEl.value;
  document.querySelectorAll('[data-line]').forEach(row => {
    const idx = Number(row.dataset.line);
    if (!d.lines[idx]) return;
    const qty = row.querySelector('[data-bind="qty"]');
    const price = row.querySelector('[data-bind="price"]');
    const expiry = row.querySelector('[data-bind="expiry"]');
    const loc = row.querySelector('[data-bind="loc"]');
    const pet = row.querySelector('[data-bind="pet"]');
    if (qty) d.lines[idx].qty = qty.value === '' ? 0 : Number(qty.value);
    if (price) d.lines[idx].unitPrice = price.value === '' ? '' : Number(price.value);
    if (expiry) d.lines[idx].expiryDate = expiry.value || null;
    if (loc) d.lines[idx].locationId = loc.value || null;
    if (pet) d.lines[idx].petId = pet.value || null;
  });
}
function updatePurchaseTotals() {
  if (!purchaseDraft) return;
  syncPurchaseForm();
  purchaseDraft.lines.forEach((l, i) => {
    const el = document.querySelector(`[data-sub="${i}"]`);
    if (el) el.textContent = '¥' + fmtMoney(lineSubtotal(l.qty, l.unitPrice || 0));
  });
  const totalEl = document.getElementById('draftTotal');
  if (totalEl) totalEl.textContent = '¥' + fmtMoney(purchaseTotal(purchaseDraft.lines));
}

function applyPickToLine(idx, productId) {
  if (!purchaseDraft || !purchaseDraft.lines[idx]) return;
  syncPurchaseForm();
  const line = purchaseDraft.lines[idx];
  line.productId = productId;
  line.touchedExpiry = false;
  line.unitPrice = '';
  fillLineDefaults(line, productId);
  refreshPurchaseSheet();
}
function refreshPurchaseSheet() {
  updateSheet(purchaseBody(), purchaseFoot());
  requestAnimationFrame(updatePurchaseTotals);
}

function openProductPicker(idx) {
  syncPurchaseForm();
  const list = activeProducts().slice().sort((a, b) => a.name.localeCompare(b.name, 'zh'));
  const body = `<div class="searchbox" style="margin-bottom:12px">${icon('search', 18)}<input id="pickSearch" placeholder="搜商品名" data-search="pick"></div>
    <div id="pickList">${list.map(p => productOptionHTML(p, idx)).join('') || `<div class="empty">还没有商品，先建一个档</div>`}</div>
    <button class="btn btn-block" style="margin-top:14px;background:var(--accent-soft);color:var(--accent-dark);font-weight:700" data-act="newProductForLine" data-idx="${idx}">${icon('plus', 16)} 新建商品</button>`;
  openSheet({ title: '选商品', body, foot: `<button class="btn btn-block" data-act="closeSheet">取消</button>` });
}
function productOptionHTML(p, idx) {
  const cat = catById(p.categoryId);
  const price = lastPrice(p.id);
  const st = productStock(p.id);
  return `<button class="opt" data-act="chooseProduct" data-id="${p.id}" data-idx="${idx}" data-name="${esc(p.name)}">
    <span class="oi" style="background:transparent;color:${cat ? cat.color : '#C9B8E8'}">${catIcon(cat ? cat.icon : 'gift', 32)}</span>
    <span class="ot"><span class="a">${esc(p.name)}</span><span class="b">${esc(cat ? cat.name : '')}${p.spec ? ' · ' + esc(p.spec) : ''} · 在库 ${fmt2(st.qty)} ${esc(p.unit)}${price != null ? ' · 上次 ¥' + fmt2(price) : ''}</span></span>
    ${p.petId ? `<span class="tag-mini">${esc((petById(p.petId) || {}).name || '')}专属</span>` : ''}
  </button>`;
}

function savePurchase() {
  syncPurchaseForm();
  const d = purchaseDraft;
  const bad = d.lines.find(l => !l.productId || !(l.qty > 0));
  if (bad) { Toast.show('每行都要选商品，数量要大于 0'); return; }
  const missingPrice = d.lines.find(l => l.unitPrice === '' || l.unitPrice == null);
  if (missingPrice) { Toast.show('单价还没填'); return; }
  const beforeStreak = streakInfo(todayISO()).current;
  const beforeLevel = computeLevel(state.purchases.length).level;
  const res = purchaseEditId ? Actions.savePurchase(d, purchaseEditId) : Actions.savePurchase(d);
  const afterStreak = streakInfo(todayISO()).current;
  const afterLevel = computeLevel(state.purchases.length).level;
  haptic('success');
  closeAllSheets();
  render();
  const cx = window.innerWidth / 2, cy = window.innerHeight * 0.58;
  starBurst(cx, cy);
  /* 成功弹跳：优先作用在首页汇总条，退化到第一张卡片 */
  const bounceEl = document.querySelector('#view .summary, #view .pet-card, #view .prod-card');
  if (bounceEl) { bounceEl.classList.remove('celebrate'); void bounceEl.offsetWidth; bounceEl.classList.add('celebrate'); }
  if (!purchaseEditId && afterStreak > beforeStreak) {
    setTimeout(() => Toast.show(`连续记账 ${afterStreak} 天 · 已入库`, 2200), 260);
  } else {
    Toast.show(purchaseEditId ? '采购已更新，库存已同步' : `已记 ¥${fmtMoney(res.total)} · ${res.count} 件入库`);
  }
  setTimeout(() => pulseAt(cx, cy), 60);
  if (!purchaseEditId && afterLevel > beforeLevel) {
    setTimeout(() => Toast.show(`升到 Lv ${afterLevel} · 已记 ${state.purchases.length} 笔`, 2200), 900);
  }
  if (state.meta.demo) {
    setTimeout(() => Toast.show('示例数据里的这笔也会算进报表', 2000), 2600);
  }
}

/* ============================================================
   采购明细 / 删除
   ============================================================ */
function openPurchaseDetail(id) {
  const p = purchaseById(id);
  if (!p) return;
  const items = state.purchaseItems.filter(i => i.purchaseId === id);
  const body = `<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:4px">
      <span style="font-size:12px;color:var(--ink-3)">${dateLabel((p.occurredAt || '').slice(0, 10))} ${timeHM(p.occurredAt)}</span>
      <b style="font-size:28px;font-variant-numeric:tabular-nums">¥${fmtMoney(p.total)}</b>
    </div>
    <div class="field" style="margin-top:12px"><label>备注</label>
      <div style="display:flex;gap:8px"><input class="input" id="purNoteEdit" value="${esc(p.note || '')}" placeholder="给自己留一句提示">
      <button class="btn btn-sm" data-act="savePurchaseNote" data-id="${p.id}" style="flex:none">保存</button></div>
    </div>
    <div class="section-h" style="margin-top:18px"><h2>明细与入库影响</h2></div>
    ${items.map(i => {
      const prod = productById(i.productId);
      const cat = catById(prod ? prod.categoryId : '');
      const loc = locById(i.locationId);
      return `<div class="prod-card" style="padding:11px 12px">
        <div class="prod-ic" style="background:transparent;color:${cat ? cat.color : '#C9B8E8'}">${catIcon(cat ? cat.icon : 'gift', 34)}</div>
        <div class="prod-main">
          <div class="prod-name" style="font-size:14px">${esc(prod ? prod.name : '已删除商品')}</div>
          <div class="prod-meta">${fmt2(i.qty)} ${esc(prod ? prod.unit : '件')} × ¥${fmt2(i.unitPrice)}${loc ? ' · ' + esc(loc.name) : ''}${i.expiryDate ? ' · ' + i.expiryDate + ' 到期' : ''}</div>
          <div class="prod-tags"><span class="pill healthy">库存 +${fmt2(i.qty)} ${esc(prod ? prod.unit : '件')}</span>${i.petId ? `<span class="pill" style="background:#FDECF4;color:#B4668C">${esc((petById(i.petId) || {}).name || '')}专属</span>` : ''}</div>
        </div>
        <b style="font-variant-numeric:tabular-nums">¥${fmtMoney(i.subtotal)}</b>
      </div>`;
    }).join('')}
    <div class="hint">删除这笔会同时冲销尚未用掉的库存，已用掉的部分保留流水。</div>`;
  openSheet({
    title: '采购明细',
    body,
    foot: `<div style="display:flex;gap:10px">
      <button class="btn" style="flex:1" data-act="editPurchase" data-id="${p.id}">编辑</button>
      <button class="btn btn-danger" style="flex:1" data-act="deletePurchase" data-id="${p.id}">删除这笔</button>
    </div>`
  });
}

/* ============================================================
   出库 / 盘库
   ============================================================ */
function openConsumeSheet(productId, anchor) {
  const p = productById(productId);
  if (!p) return;
  const st = productStock(productId);
  let qty = 1;
  const body = () => `<div style="text-align:center;padding:6px 0 10px">
    <div style="font-size:13px;color:var(--ink-3)">${esc(p.name)} 当前在库</div>
    <div style="font-size:30px;font-weight:800;font-variant-numeric:tabular-nums;margin:2px 0">${fmt2(st.qty)} <span style="font-size:14px;color:var(--ink-3)">${esc(p.unit)}</span></div>
  </div>
  <div style="display:flex;justify-content:center;margin:6px 0 14px">
    <div class="stepper" style="padding:6px">
      <button data-act="csMinus" style="width:38px;height:38px">−</button>
      <span class="val" id="csVal" style="min-width:52px;font-size:20px">${qty}</span>
      <button data-act="csPlus" style="width:38px;height:38px">+</button>
    </div>
  </div>
  <p class="hint" style="text-align:center">按先到期先出自动扣减，不用选批次</p>`;
  openSheet({
    title: '出库',
    body: body(),
    foot: `<button class="btn btn-primary btn-block" data-act="confirmConsume" data-id="${productId}">扣减 ${qty} ${esc(p.unit)}</button>`
  });
  window.__consume = { productId, qty, max: st.qty, anchor };
}
function refreshConsumeSheet() {
  const c = window.__consume;
  const p = productById(c.productId);
  const t = topSheet();
  if (!t || !p) return;
  const valEl = document.getElementById('csVal');
  if (valEl) valEl.textContent = c.qty;
  const foot = t.sheet.querySelector('.sheet-foot');
  if (foot) foot.innerHTML = `<button class="btn btn-primary btn-block" data-act="confirmConsume" data-id="${c.productId}">扣减 ${c.qty} ${esc(p.unit)}</button>`;
}
function confirmConsume() {
  const c = window.__consume;
  if (!c) return;
  const anchor = c.anchor || { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  const done = Actions.consume(c.productId, c.qty);
  haptic('tap');
  closeSheet();
  render();
  floatText('-' + fmt2(done), anchor.x, anchor.y);
  setTimeout(() => Toast.show(`已出库 ${fmt2(done)} 件`), 100);
  window.__consume = null;
}

function openAdjustSheet(productId) {
  const p = productById(productId);
  const st = productStock(productId);
  openSheet({
    title: '盘库对齐',
    body: `<div class="field"><label>实际剩余数量（${esc(p.unit)}）</label>
      <input class="input" id="adjustVal" type="number" inputmode="decimal" min="0" step="0.5" value="${st.qty}">
      <p class="hint">当前系统记录 ${fmt2(st.qty)} ${esc(p.unit)}。填入你数出来的真实数量，差额会记一条「调整」流水。</p></div>`,
    foot: `<button class="btn btn-primary btn-block" data-act="confirmAdjust" data-id="${productId}">对齐库存</button>`
  });
}
function confirmAdjust() {
  const el = document.getElementById('adjustVal');
  const target = Number(el ? el.value : 0);
  const id = topSheet().sheet.querySelector('[data-act="confirmAdjust"]').dataset.id;
  const diff = Actions.adjustStock(id, target);
  closeSheet();
  render();
  Toast.show(diff === 0 ? '库存没有变化' : diff > 0 ? `补入 ${fmt2(diff)} 件` : `核减 ${fmt2(-diff)} 件`);
}

/* ============================================================
   通用确认 / 数据备份
   ============================================================ */
function openConfirm(opts) {
  openSheet({
    title: opts.title || '确认一下',
    body: `<div style="font-size:14px;line-height:1.7;color:var(--ink-2)">${opts.body || ''}</div>`,
    foot: `<div style="display:flex;gap:10px">
      <button class="btn" style="flex:1" data-act="closeSheet">取消</button>
      <button class="btn ${opts.danger ? 'btn-danger' : 'btn-primary'}" style="flex:1" data-act="confirmYes">${esc(opts.confirmText || '确定')}</button>
    </div>`
  });
  window.__confirmAction = opts.onConfirm || null;
}
function runConfirm() {
  const act = window.__confirmAction;
  window.__confirmAction = null;
  closeSheet();
  if (act) act();
}

function exportJSON() {
  const payload = exportPayload();
  const date = todayISO();
  download(`宠物账本-备份-${date}.json`, JSON.stringify(payload, null, 2), 'application/json');
  Actions.markBackup();
  render();
  haptic('success');
  Toast.show('备份已开始下载，记得存到网盘或聊天里');
}
function exportCSV() {
  if (!state.purchaseItems.length) { Toast.show('还没有账单可导出'); return; }
  download(`宠物账本-账单-${todayISO()}.csv`, '\ufeff' + toCSV(), 'text/csv;charset=utf-8');
  Toast.show('CSV 已导出，可直接用 Excel 打开');
}
function triggerImport() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';
  input.addEventListener('change', () => {
    const file = input.files && input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      let parsed, meta;
      try {
        parsed = JSON.parse(String(reader.result));
        meta = importPayload(parsed);
      } catch (e) {
        Toast.show('解析失败：' + e.message);
        return;
      }
      const cur = state.purchases.length;
      openConfirm({
        title: '确认覆盖现有数据',
        body: `这份备份包含 <b>${meta.count}</b> 笔采购、<b>${meta.state.pets.length}</b> 只宠物、<b>${meta.state.products.length}</b> 个商品。<br><br>导入会<b>覆盖当前的 ${cur} 笔采购与全部设置</b>，且无法撤销。建议先导出一次现有数据。`,
        confirmText: '覆盖并恢复',
        danger: true,
        onConfirm: () => {
          Actions.replaceAll(meta.state);
          render();
          haptic('success');
          Toast.show(`已从备份恢复 ${meta.count} 笔采购`);
        }
      });
    };
    reader.readAsText(file);
  });
  input.click();
}
let snapList = [];
async function openSnapshotSheet() {
  const list = await listSnapshots();
  if (!list.length) { Toast.show(isNative() ? '还没有备份，先点「立即生成快照」' : '还没有快照，先点「立即生成快照」'); return; }
  snapList = list;
  const rows = list.map((it, i) => {
    const d = new Date(it.at);
    const label = `${d.getMonth() + 1}月${d.getDate()}日 ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    const kb = Math.max(1, Math.round(it.size / 1024));
    return `<button class="list-row" data-act="restoreSnap" data-idx="${i}">
      <span class="ic-wrap" style="background:var(--surface-alt);color:#8C7A64">${icon('refresh', 18)}</span>
      <span class="tt"><span class="a">${label}${i === 0 ? '（最新）' : ''}</span><span class="b">修订 ${it.revision} · ${kb} KB</span></span>
    </button>`;
  }).join('');
  openSheet({
    title: isNative() ? '本地备份' : '浏览器快照',
    body: `<div class="hint" style="margin:0 2px 12px;line-height:1.6">只保留最近 7 份。恢复会覆盖当前数据，先用「导出完整备份」留一份更稳妥。</div><div class="list-card">${rows}</div>`,
    foot: `<button class="btn btn-ghost btn-block" data-act="closeSheet">收起</button>`
  });
}
function restoreSnapshot(i) {
  const it = snapList[i];
  if (!it) return;
  let s = null;
  try { s = normalizeState(JSON.parse(it.data)); } catch (e) { /* ignore */ }
  if (!s || !s.pets) { Toast.show('这份快照读不出来，换一份试试'); return; }
  const d = new Date(it.at);
  openConfirm({
    title: '用这份快照覆盖当前数据？',
    body: `快照时间 <b>${d.getMonth() + 1}月${d.getDate()}日 ${pad(d.getHours())}:${pad(d.getMinutes())}</b>，含 <b>${s.purchases.length}</b> 笔采购、<b>${s.pets.length}</b> 只宠物。<br><br>恢复后当前内容会被替换，且无法撤销。`,
    confirmText: '恢复这份快照',
    danger: true,
    onConfirm: () => {
      Actions.replaceAll(s);
      closeAllSheets();
      render();
      Toast.show('已恢复到所选快照');
    }
  });
}
function snapshotNowAction() {
  state.meta.snapshotAt = null;
  snapshotMaybe();
  persistNow();
  Toast.show(isNative() ? '备份已写入 App 文档目录（保留最近 7 份）' : '快照已写入浏览器（保留最近 7 份）');
}
