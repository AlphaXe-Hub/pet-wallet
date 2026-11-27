/* ============================================================
   应用外壳：路由 / 渲染 / 事件
   ============================================================ */
const ROUTES = ['gallery', 'pantry', 'insights', 'me'];
const routeState = { current: 'gallery' };

function readHash() {
  const h = (location.hash || '').replace(/^#\/?/, '');
  routeState.current = ROUTES.includes(h) ? h : 'gallery';
}

function viewHTML() {
  switch (routeState.current) {
    case 'pantry': return renderPantry();
    case 'insights': return renderInsights();
    case 'me': return renderMe();
    default: return renderGallery();
  }
}

function render() {
  if (!state) return;
  const app = document.getElementById('app');
  if (!app) return;
  app.innerHTML = `<div id="view">${viewHTML()}</div>`;
  updateChrome();
  if (routeState.current === 'insights') {
    const total = monthlyTotal(scopedEntries(insightState.petId), monthKey(todayISO()));
    countUp(document.getElementById('monthTotal'), total, 600);
  }
  if (routeState.current === 'pantry') {
    const input = document.getElementById('pantrySearch');
    if (input && pantryFilter.q) { input.focus(); input.setSelectionRange(input.value.length, input.value.length); }
  }
}

function navigate(route) {
  if (!ROUTES.includes(route)) return;
  routeState.current = route;
  if (location.hash !== '#/' + route) {
    history.replaceState(null, '', '#/' + route);
  }
  render();
  window.scrollTo({ top: 0, behavior: reducedMotion() ? 'auto' : 'smooth' });
}

function mountChrome() {
  if (document.getElementById('tabbar')) return;
  const tabs = [
    { id: 'gallery', label: '画廊', icon: 'paw' },
    { id: 'pantry', label: '看板', icon: 'box' },
    { id: 'insights', label: '洞察', icon: 'pie' },
    { id: 'me', label: '我的', icon: 'user' }
  ];
  const bar = document.createElement('nav');
  bar.id = 'tabbar';
  bar.className = 'tabbar';
  bar.innerHTML = tabs.map(t => `<button class="tab" data-act="tab" data-route="${t.id}" data-tab="${t.id}">
    ${imgIcon('tab-' + t.id, 26, 'tab-ic') || icon(t.icon, 22)}<span>${t.label}</span><span class="dot-badge hidden" data-badge="${t.id}"></span>
  </button>`).join('');
  document.body.appendChild(bar);

  if (!document.getElementById('topscrim')) {
    const scrim = document.createElement('div');
    scrim.id = 'topscrim';
    document.body.appendChild(scrim);
  }

  const fab = document.createElement('button');
  fab.id = 'fab';
  fab.className = 'fab';
  fab.dataset.act = 'openPurchase';
  fab.setAttribute('aria-label', '记一笔');
  fab.innerHTML = `<span>＋</span>`;
  document.body.appendChild(fab);
  updateChrome();
}

function updateChrome() {
  const fab = document.getElementById('fab');
  const canRecord = state && state.pets && state.pets.length > 0;
  if (fab) fab.classList.toggle('hidden', !canRecord || !['gallery', 'pantry'].includes(routeState.current));
  document.querySelectorAll('[data-tab]').forEach(el => {
    el.classList.toggle('on', el.dataset.tab === routeState.current);
  });
  const alerts = state ? pantryAlerts(todayISO()) : { total: 0, low: [] };
  const badge = document.querySelector('[data-badge="pantry"]');
  if (badge) {
    const n = alerts.total + alerts.low.length;
    badge.textContent = n > 99 ? '99+' : String(n);
    badge.classList.toggle('hidden', n === 0);
  }
  const status = document.querySelector('[data-badge="insights"]');
  if (status) status.classList.add('hidden');
}

/* ============================================================
   事件委托
   ============================================================ */
function bindEvents() {
  document.addEventListener('click', onClick);

  /* 全局触感：所有可点元素都触发一次轻震；主操作/保存用 medium。
     由于监听器注册在 onClick 之后且 haptic() 有 90ms 去重，
     已有语义震动（success/warning）的交互不会被重复震两下。 */
  document.addEventListener('click', e => {
    const el = e.target.closest('button, [data-act], .list-row, .tab, .opt, .chip, .fab, .avatar-opt, .switch, input[type="checkbox"], input[type="radio"]');
    if (!el || el.disabled) return;
    if (el.dataset && el.dataset.nohaptic === '1') return;
    const act = el.dataset && el.dataset.act;
    const primary = el.classList.contains('btn-primary') ||
      act === 'savePurchase' || act === 'savePet' || act === 'saveProduct' ||
      act === 'saveCategory' || act === 'saveLocation' || act === 'confirmAdjust';
    haptic(primary ? 'medium' : 'tap');
  });
  document.addEventListener('input', onInput);
  document.addEventListener('change', onChange);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });
  window.addEventListener('hashchange', () => { readHash(); render(); });
  bindLongPress();

  try {
    if ('BroadcastChannel' in window) {
      channel = new BroadcastChannel('pet_ledger');
      channel.onmessage = async ev => {
        if (!ev.data || ev.data.type !== 'commit') return;
        if (ev.data.revision <= (state.meta.revision || 0)) return;
        try {
          const raw = await idbReq('kv', 'readonly', store => store.get('state'));
          if (raw) {
            state = normalizeState(JSON.parse(raw));
            closeAllSheets();
            render();
            Toast.show('其他标签页已更新，已为你刷新');
          }
        } catch (err) { /* ignore */ }
      };
    }
  } catch (e) { /* ignore */ }
}

function onClick(e) {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const act = el.dataset.act;
  const id = el.dataset.id;
  const idx = el.dataset.idx != null ? Number(el.dataset.idx) : null;

  if (longFired && Date.now() - longFiredAt < 900) { longFired = false; return; }
  longFired = false;

  switch (act) {
    /* ---- 导航 ---- */
    case 'tab': navigate(el.dataset.route); haptic('tap'); break;
    case 'goPantry': navigate('pantry'); break;
    case 'goInsights': navigate('insights'); break;
    case 'goBackup': navigate('me'); setTimeout(() => Toast.show('在「数据」里导出 JSON 备份'), 300); break;

    /* ---- 弹层 ---- */
    case 'closeSheet': closeSheet(); break;
    case 'confirmYes': runConfirm(); break;

    /* ---- 宠物 ---- */
    case 'addPet': openPetForm(null); haptic('tap'); break;
    case 'openPet': openPetDetail(id); break;
    case 'editPet': closeAllSheets(); setTimeout(() => openPetForm(id), 60); break;
    case 'savePet': savePet(); break;
    case 'pickAvatar':
      syncPetText();
      petDraft.avatarType = 'svg'; petDraft.avatarRef = el.dataset.key;
      updateSheet(petFormBody()); bindAvatarPicker(); haptic('tap');
      break;
    case 'pickSpecies':
      syncPetText(); petDraft.species = el.dataset.key;
      updateSheet(petFormBody()); bindAvatarPicker(); haptic('tap');
      break;
    case 'pickGender':
      syncPetText(); petDraft.gender = el.dataset.key;
      updateSheet(petFormBody()); bindAvatarPicker(); haptic('tap');
      break;
    case 'deletePet': {
      const pet = petById(id);
      const count = state.purchaseItems.filter(i => i.petId === id).length;
      openConfirm({
        title: '删除宠物',
        body: `删除「${esc(pet ? pet.name : '')}」会同时把它名下的 <b>${count} 条账单</b>改为共享池，专属商品也会失去归属。<br><br>这个动作无法撤销。`,
        confirmText: '仍然删除',
        danger: true,
        onConfirm: () => {
          Actions.deletePet(id);
          closeAllSheets();
          render();
          Toast.show('已删除，相关记录已归入共享池');
        }
      });
      break;
    }
    case 'quickAddForPet': {
      const petId = id;
      closeAllSheets();
      setTimeout(() => openPurchase({ petId }), 60);
      break;
    }

    /* ---- 商品 ---- */
    case 'openProduct': openProductDetail(id); break;
    case 'editProduct': closeAllSheets(); setTimeout(() => openProductForm(id), 60); break;
    case 'saveProduct': saveProduct(); break;
    case 'pickProductCat':
      syncProductText(); prodDraft.categoryId = id;
      updateSheet(productFormBody()); haptic('tap');
      break;
    case 'pickProductPet':
      syncProductText(); prodDraft.petId = id === 'none' ? null : id;
      updateSheet(productFormBody()); haptic('tap');
      break;
    case 'archiveProduct':
      Actions.archiveProduct(id); closeAllSheets(); render();
      Toast.show(productById(id).archived ? '已归档，账单仍保留' : '已取消归档');
      break;
    case 'deleteProduct': {
      const p = productById(id);
      openConfirm({
        title: '删除商品',
        body: `确定删除「${esc(p ? p.name : '')}」？在库批次会被移除，历史账单按现有记录保留。<br><br>如果只是不想再买，用「归档」更合适。`,
        confirmText: '删除',
        danger: true,
        onConfirm: () => {
          commit(s => {
            s.products = s.products.filter(x => x.id !== id);
            s.batches.forEach(b => { if (b.productId === id) b.qtyLeft = 0; });
          });
          closeAllSheets(); render(); Toast.show('商品已删除');
        }
      });
      break;
    }
    case 'quickAddProduct': {
      const pid = id;
      closeAllSheets();
      setTimeout(() => openPurchase({ productId: pid }), 60);
      break;
    }
    case 'newProductForLine':
      pendingPickIdx = idx;
      openProductForm(null, null);
      break;
    case 'pickProduct': openProductPicker(idx); break;
    case 'chooseProduct':
      closeSheet();
      applyPickToLine(idx, el.dataset.id);
      haptic('tap');
      break;

    /* ---- 记一笔 ---- */
    case 'openPurchase': syncPurchaseGuard(); openPurchase({}); haptic('tap'); break;
    case 'addLine':
      syncPurchaseForm(); purchaseDraft.lines.push(blankLine());
      updateSheet(purchaseBody(), purchaseFoot());
      requestAnimationFrame(updatePurchaseTotals);
      break;
    case 'removeLine':
      syncPurchaseForm(); purchaseDraft.lines.splice(idx, 1);
      if (!purchaseDraft.lines.length) purchaseDraft.lines.push(blankLine());
      updateSheet(purchaseBody(), purchaseFoot());
      requestAnimationFrame(updatePurchaseTotals);
      break;
    case 'savePurchase': savePurchase(); break;
    case 'openPurchaseDetail': openPurchaseDetail(id); break;
    case 'editPurchase':
      closeAllSheets();
      setTimeout(() => openPurchase({ editId: id }), 60);
      break;
    case 'deletePurchase':
      openConfirm({
        title: '删除这笔采购',
        body: '这笔明细会从报表里消失，尚未用掉的库存会被冲销。已经用掉的部分保留流水，不会被抹掉。',
        confirmText: '删除',
        danger: true,
        onConfirm: () => {
          Actions.deletePurchase(id);
          closeAllSheets(); render(); Toast.show('这笔采购已删除');
        }
      });
      break;
    case 'savePurchaseNote': {
      const elNote = document.getElementById('purNoteEdit');
      Actions.updatePurchaseNote(id, elNote ? elNote.value : '');
      Toast.show('备注已保存'); render();
      break;
    }

    /* ---- 出库 / 盘库 ---- */
    case 'out': {
      const rect = el.getBoundingClientRect();
      const anchor = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      const done = Actions.consume(id, 1);
      const hadSheet = sheetStack.length > 0;
      if (hadSheet) closeAllSheets();
      render();
      if (done > 0) {
        floatText('-1', anchor.x, anchor.y);
        haptic('light');
        setTimeout(() => Toast.show('已出库 1 件'), 80);
      } else {
        Toast.show('这件已经没有库存了');
      }
      break;
    }
    case 'openAdjust': openAdjustSheet(id); break;
    case 'confirmAdjust': confirmAdjust(); break;
    case 'confirmConsume': confirmConsume(); break;
    case 'csMinus':
      if (window.__consume) {
        window.__consume.qty = Math.max(1, window.__consume.qty - 1);
        refreshConsumeSheet(); haptic('tap');
      }
      break;
    case 'csPlus':
      if (window.__consume) {
        window.__consume.qty = Math.min(Math.max(1, window.__consume.max), window.__consume.qty + 1);
        refreshConsumeSheet(); haptic('tap');
      }
      break;

    /* ---- 筛选 ---- */
    case 'toggleFilter': openFilterSheet(); break;
    case 'pickFilter':
      if (el.dataset.kind === 'loc') pantryFilter.loc = id;
      else pantryFilter.cat = id;
      closeSheet(); render(); haptic('tap');
      break;
    case 'resetFilter':
    case 'clearFilter':
      if (el.dataset.kind === 'loc') pantryFilter.loc = 'all';
      else if (el.dataset.kind === 'cat') pantryFilter.cat = 'all';
      else { pantryFilter.loc = 'all'; pantryFilter.cat = 'all'; }
      if (act === 'resetFilter') closeSheet();
      render();
      break;

    /* ---- 洞察 ---- */
    case 'scopePet':
      insightState.petId = id;
      render(); haptic('tap');
      break;
    case 'drill': openDrillSheet(id); break;

    /* ---- 品类 ---- */
    case 'addCategory': openCategoryForm(null); break;
    case 'editCategory': openCategoryForm(id); break;
    case 'saveCategory': saveCategory(); break;
    case 'pickCatIcon':
      syncCategoryText(); catDraft.icon = el.dataset.key;
      updateSheet(categoryFormBody()); haptic('tap'); break;
    case 'pickCatColor':
      syncCategoryText(); catDraft.color = el.dataset.key;
      updateSheet(categoryFormBody()); haptic('tap'); break;
    case 'deleteCategory': {
      const res = Actions.deleteCategory(id);
      if (res === -1) { Toast.show('内置品类不能删除，可以改提醒天数'); break; }
      if (res < 0) { Toast.show(`还有 ${-res} 个商品在用这个品类`); break; }
      closeSheet(); render(); Toast.show('品类已删除');
      break;
    }

    /* ---- 位置 ---- */
    case 'addLocation': openLocationForm(null); break;
    case 'editLocation': openLocationForm(id); break;
    case 'saveLocation': saveLocation(); break;
    case 'pickLocIcon':
      locDraft.icon = el.dataset.key;
      updateSheet(locationFormBody()); haptic('tap'); break;
    case 'deleteLocation': {
      const items = state.batches.filter(b => b.qtyLeft > 0 && b.locationId === id).length;
      openConfirm({
        title: '删除位置',
        body: `有 <b>${items} 个在库批次</b>记录在这个位置。删除后它们会变成「未记录位置」，库存数量不变，但以后按位置筛选就找不到它们了。`,
        confirmText: '仍然删除',
        danger: true,
        onConfirm: () => {
          Actions.deleteLocation(id);
          closeAllSheets(); render(); Toast.show('位置已删除');
        }
      });
      break;
    }

    /* ---- 数据 ---- */
    case 'exportJSON': exportJSON(); break;
    case 'exportCSV': exportCSV(); break;
    case 'importJSON': triggerImport(); break;
    case 'snapshotNow': snapshotNowAction(); break;
    case 'openSnapshots': openSnapshotSheet(); break;
    case 'restoreSnap': restoreSnapshot(Number(idx)); break;
    case 'toggleAutoBackup':
      Actions.setMeta({ autoBackup: !state.meta.autoBackup });
      render(); Toast.show(state.meta.autoBackup ? '自动快照已开启' : '自动快照已关闭');
      break;
    case 'loadDemo':
      if (state.purchases.length || state.pets.length) {
        openConfirm({
          title: '载入示例数据',
          body: '这会覆盖当前的宠物、商品与账单。原有数据不会保留，建议先导出备份。',
          confirmText: '载入示例',
          danger: true,
          onConfirm: () => { seedDemo(); closeAllSheets(); render(); navigate('gallery'); Toast.show('示例数据已载入，随便点点看'); }
        });
      } else {
        seedDemo(); closeAllSheets(); render(); navigate('gallery'); Toast.show('示例数据已载入，随便点点看');
      }
      break;
    case 'clearData': {
      openConfirm({
        title: '清空全部数据',
        body: `当前有 <b>${state.pets.length}</b> 只宠物、<b>${state.products.length}</b> 个商品、<b>${state.purchases.length}</b> 笔采购。清空后全部归零，无法撤销。<br><br>如果只是想起个新头，先导出 JSON 再清空。`,
        confirmText: '确认清空',
        danger: true,
        onConfirm: () => {
          Actions.clearAll();
          closeAllSheets(); render(); navigate('gallery');
          Toast.show('已清空，可以重新开始了');
        }
      });
      break;
    }
    default: break;
  }
}

/* ---------- 输入 ---------- */
let searchTimer = null;
function onInput(e) {
  const el = e.target;
  if (el.dataset.bind === 'purDate') return;
  if (el.dataset.bind && ['qty', 'price'].includes(el.dataset.bind)) {
    updatePurchaseTotals();
    return;
  }
  if (el.dataset.search === 'pick') {
    const q = el.value.trim().toLowerCase();
    document.querySelectorAll('#pickList .opt').forEach(opt => {
      const name = (opt.dataset.name || '').toLowerCase();
      opt.style.display = !q || name.includes(q) ? '' : 'none';
    });
    return;
  }
  if (el.id === 'pantrySearch') {
    pantryFilter.q = el.value;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => render(), 360);
    return;
  }
  if (el.dataset.bind === 'purNote') {
    purchaseDraft.note = el.value;
  }
}

function onChange(e) {
  const el = e.target;
  if (el.dataset.bind === 'purDate') {
    purchaseDraft.date = el.value || todayISO();
    purchaseDraft.lines.forEach(l => {
      if (!l.touchedExpiry) {
        const cat = catById((productById(l.productId) || {}).categoryId);
        l.expiryDate = defaultExpiry(purchaseDraft.date, cat ? cat.shelfLifeDays : 0);
      }
    });
    refreshPurchaseSheet();
    return;
  }
  if (el.dataset.bind === 'expiry') {
    const idx = Number(el.dataset.idx);
    purchaseDraft.lines[idx].expiryDate = el.value || null;
    purchaseDraft.lines[idx].touchedExpiry = true;
    return;
  }
  if (el.dataset.bind === 'loc') {
    const idx = Number(el.dataset.idx);
    purchaseDraft.lines[idx].locationId = el.value || null;
    return;
  }
  if (el.dataset.bind === 'pet') {
    const idx = Number(el.dataset.idx);
    purchaseDraft.lines[idx].petId = el.value || null;
    return;
  }
  if (el.dataset.bind === 'qty' || el.dataset.bind === 'price') {
    updatePurchaseTotals();
  }
}

/* ---------- 长按出库 ---------- */
let longFired = false;
let longFiredAt = 0;
let longTimer = null;
let pressStart = null;
function bindLongPress() {
  document.addEventListener('pointerdown', e => {
    const el = e.target.closest('[data-long]');
    if (!el || el.disabled) return;
    longFired = false;
    pressStart = { x: e.clientX, y: e.clientY };
    clearTimeout(longTimer);
    longTimer = setTimeout(() => {
      longFired = true;
      longFiredAt = Date.now();
      haptic('tap');
      el.classList.add('shaking');
      setTimeout(() => el.classList.remove('shaking'), 440);
      openConsumeSheet(el.dataset.id, { x: e.clientX, y: e.clientY });
    }, 430);
  });
  const cancel = e => {
    if (pressStart && e.type === 'pointermove') {
      const d = Math.abs(e.clientX - pressStart.x) + Math.abs(e.clientY - pressStart.y);
      if (d < 12) return;
    }
    clearTimeout(longTimer);
  };
  ['pointerup', 'pointercancel', 'pointermove'].forEach(t => document.addEventListener(t, cancel, { passive: true }));
  document.addEventListener('contextmenu', e => {
    if (e.target.closest('[data-long]')) e.preventDefault();
  });
}

function syncPurchaseGuard() {
  if (sheetStack.length && purchaseDraft) {
    closeAllSheets();
  }
}

/* ---------- 启动 ---------- */
(async function boot() {
  const app = document.getElementById('app');
  app.innerHTML = `<div class="boot"><div class="paw" style="color:#2FAE8C">${icon('paw', 34)}</div><div style="margin-top:10px">正在打开账本…</div></div>`;
  readHash();
  let info = { fresh: true, lastOpen: null };
  try {
    info = await initStore();
  } catch (e) {
    state = blankState();
    Toast.show('本地数据库打开失败，先以临时模式运行');
  }
  bindEvents();
  mountChrome();
  render();


  if (info.lastOpen && diffDays(info.lastOpen, todayISO()) > 7 && (state.purchases.length || state.products.length)) {
    setTimeout(() => {
      openConfirm({
        title: '好久没记账了',
        body: `上次打开是 ${dateLabel(info.lastOpen)}，距今 ${diffDays(info.lastOpen, todayISO())} 天。<br><br>浏览器有可能在这期间清掉本地数据。先导出一次备份，再继续记今天的账？`,
        confirmText: '去备份',
        onConfirm: () => { navigate('me'); exportJSON(); }
      });
    }, 600);
  }
})();
