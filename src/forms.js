/* ============================================================
   表单通用
   ============================================================ */
function topSheet() { return sheetStack[sheetStack.length - 1]; }
function updateSheet(body, foot) {
  const t = topSheet();
  if (!t) return;
  t.sheet.querySelector('.sheet-body').innerHTML = body;
  const footEl = t.sheet.querySelector('.sheet-foot');
  if (footEl && foot != null) footEl.innerHTML = foot;
}
function val(id, fallback) {
  const el = document.getElementById(id);
  return el ? el.value : (fallback == null ? '' : fallback);
}

function compressImage(file, maxSize) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = maxSize || 220;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* ============================================================
   宠物：新增 / 编辑 / 详情
   ============================================================ */
let petDraft = null;
let petDraftId = null;

function openPetForm(petId) {
  const pet = petId ? petById(petId) : null;
  petDraftId = pet ? pet.id : null;
  petDraft = pet ? { ...pet } : { name: '', species: 'cat', breed: '', birthday: '', gender: 'unknown', avatarType: 'svg', avatarRef: 'cat-orange', note: '' };
  openSheet({
    title: pet ? '编辑资料' : '登记一只毛孩子',
    body: petFormBody(),
    foot: `<button class="btn btn-primary btn-block" data-act="savePet">${pet ? '保存修改' : '把它加进画廊'}</button>`,
    onMount: () => bindAvatarPicker()
  });
}
function petFormBody() {
  const d = petDraft;
  const age = petAge(d.birthday, todayISO());
  return `<div style="display:flex;gap:14px;align-items:center;margin-bottom:6px">
    <div class="pet-avatar" style="width:72px;height:72px;margin:0;flex:none;box-shadow:var(--shadow-1)">
      ${d.avatarType === 'photo' && d.avatarRef.startsWith('data:') ? `<img src="${d.avatarRef}" alt="">` : petAvatar(d.avatarRef)}
    </div>
    <div style="flex:1">
      <div style="font-size:13px;color:var(--ink-2);line-height:1.6">选一个内置手绘头像，或上传它的照片。<br>照片会压缩到 220px 后存在本机。</div>
    </div>
  </div>
  <div class="avatar-picker">
    ${AVATAR_KEYS.map(k => `<button class="avatar-opt ${d.avatarType === 'svg' && d.avatarRef === k ? 'on' : ''}" data-act="pickAvatar" data-key="${k}">${petAvatar(k)}</button>`).join('')}
    <label class="upload-tile">${icon('camera', 18)}<span>${d.avatarType === 'photo' ? '换照片' : '传照片'}</span>
      <input type="file" accept="image/*" id="avatarFile" style="display:none">
    </label>
  </div>
  <div class="divider"></div>
  <div class="field"><label>名字</label><input class="input" id="petName" value="${esc(d.name)}" placeholder="比如 豆豆" maxlength="12"></div>
  <div class="field"><label>它是</label>
    <div class="seg" style="margin-top:0">
      ${[['cat', '猫'], ['dog', '狗'], ['other', '其他']].map(([k, n]) => `<button class="${d.species === k ? 'on' : ''}" data-act="pickSpecies" data-key="${k}">${n}</button>`).join('')}
    </div>
  </div>
  <div class="field-row">
    <div class="field"><label>品种</label><input class="input" id="petBreed" value="${esc(d.breed || '')}" placeholder="橘猫 / 柯基"></div>
    <div class="field"><label>生日</label><input class="input" type="date" id="petBirthday" value="${d.birthday || ''}"></div>
  </div>
  ${age ? `<div class="hint" style="margin:-6px 0 12px">现在 ${ageLabel(age)}</div>` : ''}
  <div class="field"><label>性别</label>
    <div class="seg" style="margin-top:0">
      ${[['male', '公'], ['female', '母'], ['unknown', '不确定']].map(([k, n]) => `<button class="${d.gender === k ? 'on' : ''}" data-act="pickGender" data-key="${k}">${n}</button>`).join('')}
    </div>
  </div>
  <div class="field"><label>备注</label><textarea class="input" id="petNote" rows="2" placeholder="怕生、爱吃冻干、对鸡肉过敏…">${esc(d.note || '')}</textarea></div>
  ${petDraftId ? `<button class="btn btn-danger btn-block btn-sm" style="margin-top:6px" data-act="deletePet" data-id="${petDraftId}">删除这只宠物</button>` : ''}`;
}
function bindAvatarPicker() {
  const input = document.getElementById('avatarFile');
  if (!input) return;
  input.addEventListener('change', async e => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      const data = await compressImage(file, 220);
      petDraft.avatarType = 'photo';
      petDraft.avatarRef = data;
      syncPetText();
      updateSheet(petFormBody());
      bindAvatarPicker();
      haptic('tap');
    } catch (err) { Toast.show('图片处理失败，换一张试试'); }
  });
}
function syncPetText() {
  if (!petDraft) return;
  petDraft.name = val('petName', petDraft.name);
  petDraft.breed = val('petBreed', petDraft.breed);
  petDraft.birthday = val('petBirthday', petDraft.birthday);
  petDraft.note = val('petNote', petDraft.note);
}
function savePet() {
  syncPetText();
  if (!petDraft.name.trim()) { Toast.show('先给它起个名字吧'); return false; }
  if (petDraftId) {
    const { name, species, breed, birthday, gender, avatarType, avatarRef, note } = petDraft;
    Actions.updatePet(petDraftId, { name: name.trim(), species, breed, birthday, gender, avatarType, avatarRef, note });
  } else {
    Actions.addPet(petDraft);
  }
  haptic('success');
  closeSheet();
  render();
  Toast.show(petDraftId ? '资料已更新' : `${petDraft.name} 已加入画廊`);
  return true;
}

function openPetDetail(petId) {
  const pet = petById(petId);
  if (!pet) return;
  const today = todayISO();
  const age = petAge(pet.birthday, today);
  const stock = stockMap();
  const exclusives = activeProducts().filter(p => p.petId === petId);
  const alerts = petAlerts(petId, today);
  const month = monthKey(today);
  const spend = petExclusiveSpend(petId, month);
  const bills = state.purchaseItems.filter(i => i.petId === petId).sort((a, b) => {
    const pa = purchaseById(a.purchaseId), pb = purchaseById(b.purchaseId);
    return ((pb && pb.occurredAt) || '').localeCompare((pa && pa.occurredAt) || '');
  }).slice(0, 6);

  let body = `<div class="detail-hero">
    <div class="av">${petAvatarHTML(pet)}</div>
    <div style="flex:1;min-width:0">
      <div class="nm">${esc(pet.name)}</div>
      <div class="mt">${esc(speciesLabel(pet))}${age ? ' · ' + ageLabel(age) : ''} · ${({ male: '公', female: '母', unknown: '性别未记录' })[pet.gender] || ''}</div>
      <div style="display:flex;gap:6px;margin-top:7px;flex-wrap:wrap">
        ${alerts.length ? `<span class="pill soon">${alerts.length} 件专属物品要操心</span>` : `<span class="pill healthy">专属物品都正常</span>`}
      </div>
    </div>
    <button class="sheet-close" data-act="editPet" data-id="${pet.id}" aria-label="编辑">${icon('edit', 16)}</button>
  </div>
  ${pet.note ? `<div class="danger-box" style="background:var(--surface-alt);color:var(--ink-2);margin-bottom:12px">${icon('heart', 14)} ${esc(pet.note)}</div>` : ''}
  <div class="kv">
    <span class="k">专属商品</span><span class="v">${exclusives.length} 个</span>
    <span class="k">本月专属支出</span><span class="v">¥${fmtMoney(spend)}</span>
    <span class="k">共享池支出</span><span class="v">不计入（共享商品不摊到单只宠物）</span>
  </div>

  <div class="section-h"><h2>专属物品</h2><span class="sub">${esc(pet.name)}专属</span></div>
  ${exclusives.length ? exclusives.map(p => {
    const st = stock.get(p.id) || { qty: 0, earliestExpiry: null };
    const cat = catById(p.categoryId);
    const rd = remainingDays(st.qty, p.dailyUsage);
    const es = expiryStatus(st.earliestExpiry, today, resolveRemindDays(p, cat));
    return `<button class="prod-card" style="width:100%;text-align:left" data-act="openProduct" data-id="${p.id}">
      <div class="prod-ic" style="background:transparent;color:${cat ? cat.color : '#C9B8E8'}">${catIcon(cat ? cat.icon : 'gift', 36)}</div>
      <div class="prod-main"><div class="prod-name">${esc(p.name)}</div>
        <div class="prod-meta"><span>${fmt2(st.qty)} ${esc(p.unit)}</span><span class="sep">·</span><span>${rd === null ? '未设日均' : '剩 ' + rd + ' 天'}</span>
        ${es === 'soon' || es === 'expired' ? `<span class="pill ${es}">${es === 'expired' ? '已过期' : '临期'}</span>` : ''}</div>
      </div>
    </button>`;
  }).join('') : `<div class="empty" style="padding:14px">还没有专属商品。在商品设置里勾上「只给 ${esc(pet.name)}」，处方粮就不会混进共享池。</div>`}

  <div class="section-h"><h2>它名下的账单</h2><span class="sub">仅统计专属商品</span></div>
  ${bills.length ? `<div class="list-card" style="margin-top:0">${bills.map(i => {
    const pr = purchaseById(i.purchaseId) || {};
    const prod = productById(i.productId) || {};
    return `<button class="list-row" data-act="openPurchaseDetail" data-id="${i.purchaseId}">
      <span class="tt"><span class="a">${esc(prod.name || '商品')}</span><span class="b">${dateLabel((pr.occurredAt || '').slice(0, 10))} · ${fmt2(i.qty)} ${esc(prod.unit || '件')} × ¥${fmt2(i.unitPrice)}</span></span>
      <b style="font-variant-numeric:tabular-nums">¥${fmtMoney(i.subtotal)}</b>
    </button>`;
  }).join('')}</div>` : `<div class="empty" style="padding:14px">它的专属商品还没有账单。共享池的粮砂不会算进来，这是刻意的。</div>`}`;

  body += `<div class="section-h"><h2>危险操作</h2></div>
  <div class="list-card">
    <button class="list-row" data-act="deletePet" data-id="${pet.id}">
      <span class="tt"><span class="a" style="color:var(--danger)">删除这只宠物</span><span class="b">账单与专属商品会转为共享，历史金额不变</span></span>
    </button>
  </div>`;

  openSheet({
    title: '宠物档案',
    body,
    foot: `<div style="display:flex;gap:10px">
      <button class="btn" style="flex:1" data-act="editPet" data-id="${pet.id}">编辑资料</button>
      <button class="btn btn-primary" style="flex:1" data-act="quickAddForPet" data-id="${pet.id}">给它记一笔</button>
    </div>`
  });
}

/* ============================================================
   商品：详情 / 表单
   ============================================================ */
function openProductDetail(productId) {
  const p = productById(productId);
  if (!p) return;
  const today = todayISO();
  const cat = catById(p.categoryId);
  const st = productStock(p.id);
  const batches = batchesOf(p.id);
  const rd = remainingDays(st.qty, p.dailyUsage);
  const es = expiryStatus(st.earliestExpiry, today, resolveRemindDays(p, cat));
  const why = p.remindDays != null ? `商品覆盖 ${p.remindDays} 天` : (cat ? `品类默认 ${cat.remindDays} 天` : '全局 7 天');
  const mvs = state.movements.filter(m => m.productId === p.id).sort((a, b) => (b.happenedAt || '').localeCompare(a.happenedAt || '')).slice(0, 8);
  const unitPrice = lastPrice(p.id);

  let body = `<div class="detail-hero">
    <div class="av" style="border-radius:0;display:flex;align-items:center;justify-content:center;background:transparent;color:${cat ? cat.color : '#C9B8E8'}">
      ${catIcon(cat ? cat.icon : 'gift', 40)}
    </div>
    <div style="flex:1;min-width:0">
      <div class="nm" style="font-size:20px">${esc(p.name)}</div>
      <div class="mt">${esc(cat ? cat.name : '未分类')}${p.spec ? ' · ' + esc(p.spec) : ''}${p.petId ? ` · ${esc((petById(p.petId) || {}).name || '')}专属` : ' · 共享池'}</div>
      <div style="display:flex;gap:6px;margin-top:7px;flex-wrap:wrap">
        <span class="pill" style="background:var(--surface-alt)">当前 <b>${fmt2(st.qty)}</b> ${esc(p.unit)}</span>
        ${rd === null ? `<span class="pill">未设日均消耗</span>` : `<span class="pill ${rd < (cat ? cat.lowStockDays : 5) ? 'low' : 'healthy'}">剩 ${rd} 天</span>`}
        ${es === 'expired' ? `<span class="pill expired">已过期</span>` : es === 'soon' ? `<span class="pill soon">临期</span>` : ''}
      </div>
    </div>
  </div>
  <div class="card" style="padding:14px;margin-bottom:12px;box-shadow:var(--shadow-1)">
    <div class="kv">
      <span class="k">日均消耗</span><span class="v">${p.dailyUsage > 0 ? p.dailyUsage + ' ' + esc(p.unit) + '/天' : '未设置'}</span>
      <span class="k">最近单价</span><span class="v">${unitPrice ? '¥' + fmt2(unitPrice) : '—'}</span>
      <span class="k">日均成本</span><span class="v">${dailyCost(unitPrice, p.dailyUsage) ? '¥' + fmt2(dailyCost(unitPrice, p.dailyUsage)) + '/天' : '—'}</span>
      <span class="k">临期阈值</span><span class="v">${resolveRemindDays(p, cat)} 天（${why}）</span>
      <span class="k">最早到期</span><span class="v">${st.earliestExpiry || '无保质期'}</span>
    </div>
  </div>

  <div style="display:flex;gap:8px;margin-bottom:4px">
    <button class="btn btn-primary" style="flex:1;height:44px" data-act="out" data-id="${p.id}">出库 −1</button>
    <button class="btn" style="flex:1;height:44px" data-act="openAdjust" data-id="${p.id}">盘库对齐</button>
    <button class="btn" style="width:44px;height:44px" data-act="editProduct" data-id="${p.id}" aria-label="编辑">${icon('edit', 17)}</button>
  </div>

  <div class="section-h"><h2>批次</h2><span class="sub">出库按先到期先出</span></div>
  ${batches.length ? batches.map(b => {
    const loc = locById(b.locationId);
    const esb = expiryStatus(b.expiryDate, today, resolveRemindDays(p, cat));
    return `<div class="batch-row">
      <span class="b1"><span class="e">${b.expiryDate ? (esb === 'expired' ? '已过期 ' : '') + b.expiryDate + ' 到期' : '无保质期'}</span>
      <span class="s">${loc ? esc(loc.name) : '未记录位置'} · 入库 ${dateLabel((b.receivedAt || '').slice(0, 10))}</span></span>
      <span class="q">${fmt2(b.qtyLeft)} ${esc(p.unit)}</span>
    </div>`;
  }).join('') : `<div class="empty" style="padding:12px">没有在库批次。记一笔采购就会自动生成批次。</div>`}

  <div class="section-h"><h2>出入库流水</h2><span class="sub">近 8 条</span></div>
  ${mvs.length ? mvs.map(m => `<div class="mv-row">
    <span class="t">${dateLabel((m.happenedAt || '').slice(0, 10))} ${timeHM(m.happenedAt)}</span>
    <span class="ty ${m.type}">${m.type === 'in' ? '入库' : m.type === 'out' ? '出库' : '调整'}</span>
    <span style="flex:1;color:var(--ink-3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(m.note || '')}</span>
    <span class="qy" style="color:${m.qty < 0 ? 'var(--danger)' : '#3D8C74'}">${m.qty > 0 ? '+' : ''}${fmt2(m.qty)}</span>
  </div>`).join('') : `<div class="empty" style="padding:12px">还没有出入库记录</div>`}

  <div style="display:flex;gap:8px;margin-top:16px">
    <button class="btn btn-sm" style="flex:1" data-act="archiveProduct" data-id="${p.id}">${p.archived ? '取消归档' : '归档这个商品'}</button>
    <button class="btn btn-sm" data-act="deleteProduct" data-id="${p.id}" style="color:var(--danger)">删除商品</button>
  </div>
  <div class="hint" style="margin-top:8px">归档后不再出现在看板与选品列表，历史账单仍然完整。</div>`;

  openSheet({ title: '商品详情', body, foot: `<button class="btn btn-block btn-primary" data-act="quickAddProduct" data-id="${p.id}">再记一笔采购</button>` });
}

function lastPrice(productId) {
  let price = null, at = '';
  for (const it of state.purchaseItems) {
    if (it.productId !== productId) continue;
    const p = purchaseById(it.purchaseId);
    const occ = (p && p.occurredAt) || '';
    if (occ > at) { at = occ; price = it.unitPrice; }
  }
  return price;
}

let prodDraft = null, prodDraftId = null;
function openProductForm(editId, preset) {
  const p = editId ? productById(editId) : null;
  prodDraftId = p ? p.id : null;
  prodDraft = p ? { ...p } : {
    name: '', categoryId: (preset && preset.categoryId) || (state.categories[0] || {}).id,
    unit: '袋', spec: '', dailyUsage: '', remindDays: '', petId: null, note: ''
  };
  openSheet({
    title: p ? '编辑商品' : '新建商品',
    body: productFormBody(),
    foot: `<button class="btn btn-primary btn-block" data-act="saveProduct">${p ? '保存' : '建档'}</button>`
  });
}
function productFormBody() {
  const d = prodDraft;
  const cats = state.categories.slice().sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  return `<div class="field"><label>商品名</label><input class="input" id="prodName" value="${esc(d.name)}" placeholder="荒野盛宴 鸡肉粮" maxlength="24"></div>
  <div class="field"><label>品类</label>
    <div class="opt-list">${cats.map(c => `<button class="opt ${d.categoryId === c.id ? 'on' : ''}" data-act="pickProductCat" data-id="${c.id}">
      <span class="oi" style="background:transparent;color:${c.color}">${catIcon(c.icon, 32)}</span>
      <span class="ot"><span class="a">${esc(c.name)}</span><span class="b">临期 ${c.remindDays} 天 · 保质期 ${c.shelfLifeDays || '未设'}${c.shelfLifeDays ? ' 天' : ''}</span></span>
    </button>`).join('')}</div>
  </div>
  <div class="field-row">
    <div class="field"><label>单位</label>
      <select class="select" id="prodUnit">${UNITS.map(u => `<option value="${u}" ${d.unit === u ? 'selected' : ''}>${u}</option>`).join('')}</select>
    </div>
    <div class="field"><label>规格</label><input class="input" id="prodSpec" value="${esc(d.spec || '')}" placeholder="1.5kg / 6L"></div>
  </div>
  <div class="field"><label>日均消耗（${esc(d.unit)}/天）</label>
    <input class="input" id="prodUsage" type="number" step="0.01" min="0" value="${d.dailyUsage === 0 ? '' : d.dailyUsage}" placeholder="不知道就留空，只是不出倒计时">
    <p class="hint">填了才能算「还剩几天」和日均成本；不确定的东西（玩具）留空即可。</p>
  </div>
  <div class="field"><label>临期提醒天数（覆盖品类默认）</label>
    <input class="input" id="prodRemind" type="number" min="1" value="${d.remindDays == null ? '' : d.remindDays}" placeholder="留空 = 跟随品类">
  </div>
  <div class="field"><label>归属</label>
    <div class="opt-list">
      <button class="opt ${!d.petId ? 'on' : ''}" data-act="pickProductPet" data-id="none">
        <span class="oi" style="background:var(--surface-alt);color:var(--ink-2)">${icon('paw', 18)}</span>
        <span class="ot"><span class="a">共享池</span><span class="b">大家一起用，不摊到单只宠物</span></span>
      </button>
      ${state.pets.map(p => `<button class="opt ${d.petId === p.id ? 'on' : ''}" data-act="pickProductPet" data-id="${p.id}">
        <span class="oi" style="background:var(--surface-alt);padding:3px"><span class="pet-avatar" style="width:28px;height:28px;margin:0">${petAvatarHTML(p)}</span></span>
        <span class="ot"><span class="a">只给 ${esc(p.name)}</span><span class="b">处方粮 / 专属药品</span></span>
      </button>`).join('')}
    </div>
  </div>
  <div class="field"><label>备注</label><textarea class="input" id="prodNote" rows="2" placeholder="比如 医生开的处方粮，别混着喂">${esc(d.note || '')}</textarea></div>`;
}
function syncProductText() {
  prodDraft.name = val('prodName', prodDraft.name);
  prodDraft.unit = val('prodUnit', prodDraft.unit);
  prodDraft.spec = val('prodSpec', prodDraft.spec);
  const usage = val('prodUsage', '');
  prodDraft.dailyUsage = usage === '' ? 0 : Number(usage);
  const rem = val('prodRemind', '');
  prodDraft.remindDays = rem === '' ? null : Number(rem);
  prodDraft.note = val('prodNote', prodDraft.note);
}
function saveProduct() {
  syncProductText();
  if (!prodDraft.name.trim()) { Toast.show('商品名不能为空'); return; }
  let created = null;
  if (prodDraftId) {
    const { name, categoryId, unit, spec, dailyUsage, remindDays, petId, note } = prodDraft;
    Actions.updateProduct(prodDraftId, { name: name.trim(), categoryId, unit, spec, dailyUsage, remindDays, petId, note });
  } else {
    const { name, categoryId, unit, spec, dailyUsage, remindDays, petId, note } = prodDraft;
    created = Actions.addProduct({ name: name.trim(), categoryId, unit, spec, dailyUsage, remindDays, petId, note });
  }
  haptic('tap');
  if (pendingPickIdx != null && created) {
    /* 从「选商品」进入新建：关掉商品表单与选品列表，回到记一笔并选中它 */
    const idx = pendingPickIdx;
    pendingPickIdx = null;
    closeSheet();
    closeSheet();
    applyPickToLine(idx, created.id);
    Toast.show('新商品已建档并选中');
    return;
  }
  closeSheet();
  render();
  Toast.show(prodDraftId ? '商品已更新' : '商品已建档');
}

/* ============================================================
   品类 / 位置 表单
   ============================================================ */
const CAT_ICON_KEYS = ['food', 'litter', 'med', 'toy', 'gift'];
const CAT_COLORS = ['#F6B26B', '#A8C7E8', '#F49AC1', '#9DD9A0', '#C9B8E8', '#FFB443', '#7BC8B0', '#E8A05C'];
let catDraft = null, catDraftId = null;
function openCategoryForm(id) {
  const c = id ? catById(id) : null;
  catDraftId = c ? c.id : null;
  catDraft = c ? { ...c } : { name: '', icon: 'gift', color: '#C9B8E8', remindDays: 7, lowStockDays: 5, shelfLifeDays: 0, builtin: 0 };
  openSheet({
    title: c ? '编辑品类' : '新建品类',
    body: categoryFormBody(),
    foot: `<button class="btn btn-primary btn-block" data-act="saveCategory">保存</button>`
  });
}
function categoryFormBody() {
  const c = catDraft;
  return `<div class="field"><label>品类名</label><input class="input" id="catName" value="${esc(c.name)}" placeholder="比如 冻干 / 驱虫"></div>
    <div class="field"><label>图标</label>
      <div style="display:flex;gap:10px">${CAT_ICON_KEYS.map(k => `<button class="avatar-opt ${c.icon === k ? 'on' : ''}" style="aspect-ratio:1;width:52px;color:${c.color}" data-act="pickCatIcon" data-key="${k}">${catIcon(k, 26)}</button>`).join('')}</div>
    </div>
    <div class="field"><label>颜色</label>
      <div style="display:flex;gap:9px;flex-wrap:wrap">${CAT_COLORS.map(col => `<button style="width:34px;height:34px;border-radius:50%;background:${col};box-shadow:${c.color === col ? '0 0 0 3px #fff, 0 0 0 5px ' + col : 'none'}" data-act="pickCatColor" data-key="${col}" aria-label="颜色"></button>`).join('')}</div>
    </div>
    <div class="field-row">
      <div class="field"><label>临期提醒（天）</label><input class="input" id="catRemind" type="number" min="1" value="${c.remindDays}"></div>
      <div class="field"><label>补货阈值（天）</label><input class="input" id="catLow" type="number" min="0" value="${c.lowStockDays}"></div>
    </div>
    <div class="field"><label>默认保质期（天）</label>
      <input class="input" id="catShelf" type="number" min="0" value="${c.shelfLifeDays}">
      <p class="hint">记账时到期日会按这个天数自动算好；0 表示不自动填（玩具、用具）。</p>
    </div>
    ${catDraftId && !catDraft.builtin ? `<button class="btn btn-danger btn-sm btn-block" data-act="deleteCategory" data-id="${catDraftId}">删除这个品类</button>` : ''}`;
}
function syncCategoryText() {
  catDraft.name = val('catName', catDraft.name);
  catDraft.remindDays = Number(val('catRemind', catDraft.remindDays)) || 7;
  catDraft.lowStockDays = Number(val('catLow', catDraft.lowStockDays)) || 0;
  catDraft.shelfLifeDays = Number(val('catShelf', catDraft.shelfLifeDays)) || 0;
}
function saveCategory() {
  syncCategoryText();
  if (!catDraft.name.trim()) { Toast.show('品类名不能为空'); return; }
  if (catDraftId) {
    const { name, icon, color, remindDays, lowStockDays, shelfLifeDays } = catDraft;
    Actions.updateCategory(catDraftId, { name: name.trim(), icon, color, remindDays, lowStockDays, shelfLifeDays });
  } else {
    Actions.addCategory(catDraft);
  }
  closeSheet(); render(); Toast.show('品类已保存');
}

const LOC_ICON_KEYS = ['cabinet', 'plant', 'snow', 'drop', 'box', 'moon'];
let locDraft = null, locDraftId = null;
function openLocationForm(id) {
  const l = id ? locById(id) : null;
  locDraftId = l ? l.id : null;
  locDraft = l ? { ...l } : { name: '', icon: 'box' };
  openSheet({
    title: l ? '编辑位置' : '新增存放位置',
    body: locationFormBody(),
    foot: `<button class="btn btn-primary btn-block" data-act="saveLocation">保存</button>`
  });
}
function locationFormBody() {
  return `<div class="field"><label>位置名</label><input class="input" id="locName" value="${esc(locDraft.name)}" placeholder="车库右柜 / 冰箱下层"></div>
    <div class="field"><label>图标</label>
      <div style="display:flex;gap:10px;flex-wrap:wrap">${LOC_ICON_KEYS.map(k => `<button class="avatar-opt ${locDraft.icon === k ? 'on' : ''}" style="width:52px;height:52px" data-act="pickLocIcon" data-key="${k}">${locIcon(k, 26)}</button>`).join('')}</div>
    </div>
    <p class="hint">位置只做一级。更细的位置（吊柜第二层）写在采购备注里就好。</p>
    ${locDraftId ? `<button class="btn btn-danger btn-sm btn-block" style="margin-top:12px" data-act="deleteLocation" data-id="${locDraftId}">删除这个位置</button>` : ''}`;
}

function saveLocation() {
  const name = val('locName', locDraft.name).trim();
  if (!name) { Toast.show('位置名不能为空'); return; }
  if (locDraftId) Actions.updateLocation(locDraftId, { name, icon: locDraft.icon });
  else Actions.addLocation({ name, icon: locDraft.icon });
  closeSheet(); render(); Toast.show('位置已保存');
}
