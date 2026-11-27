/* ============================================================
   视图：宠物画廊
   ============================================================ */
function renderGallery() {
  const today = todayISO();
  const alerts = pantryAlerts(today);
  const pets = state.pets.slice().sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  const monthTotal = familyMonthlyTotal(today);
  const streak = streakInfo(today);
  const needBackup = state.meta.lastBackupAt
    ? diffDays(String(state.meta.lastBackupAt).slice(0, 10), today) > 7
    : (state.purchases.length > 0 || state.products.length > 0);
  const hasData = state.purchases.length > 0 || state.products.length > 0;

  let html = `<div class="top">
    <div>
      <div class="hello">${greeting()} · 今天 ${dateLabel(today)}</div>
      <h1>毛孩子的<span>账本</span></h1>
    </div>

  </div>`;

  if (needBackup && hasData) {
    html += `<button class="alertbar backup" data-act="goBackup" style="width:100%;border:1px solid #B7E9DB">
      <span>${icon('info', 16)} 上次备份是 ${state.meta.lastBackupAt ? dateLabel(String(state.meta.lastBackupAt).slice(0, 10)) : '从未备份'}，建议导出一次留个副本</span>
      <span style="font-weight:700">备份 →</span>
    </button>`;
  }
  if (alerts.total > 0) {
    html += `<button class="alertbar" data-act="goPantry" style="width:100%">
      <span>${icon('alert', 16)} 家里 ${alerts.total} 件东西快过期${alerts.low.length ? `，${alerts.low.length} 件该补货` : ''}</span>
      <span style="font-weight:700">去处理 →</span>
    </button>`;
  }

  if (!pets.length) {
    html += `<div class="hero-empty">
      <div class="art">${emptyArt('pet')}</div>
      <h2>先登记第一只毛孩子</h2>
      <p>有了它，账本和物资才有归属。以后每笔粮、每袋砂都能算出「每天到底花多少钱」。</p>
      <div class="acts">
        <button class="btn btn-primary" data-act="addPet">${icon('plus', 18)} 登记宠物</button>
        <button class="btn btn-ghost" data-act="loadDemo">先看看示例数据</button>
      </div>
    </div>`;
  } else {
    html += `<div class="pet-grid">${pets.map((p, i) => {
      const pa = petAlerts(p.id, today);
      const age = petAge(p.birthday, today);
      return `<button class="pet-card" data-act="openPet" data-id="${p.id}" style="animation-delay:${i * 50}ms">
        ${pa.length ? `<span class="pet-badge">${icon('alert', 11)} ${pa.length} 件</span>` : ''}
        <div class="pet-avatar">${petAvatarHTML(p)}</div>
        <div class="pname">${esc(p.name)}</div>
        <div class="pmeta">${esc(speciesLabel(p))}${age ? ` · ${ageLabel(age)}` : ''}</div>
      </button>`;
    }).join('')}
    <button class="add-pet" data-act="addPet">
      <span style="width:40px;height:40px;border-radius:50%;background:var(--surface-alt);display:flex;align-items:center;justify-content:center;color:var(--accent-dark)">${icon('plus', 20)}</span>
      加一只毛孩子
    </button></div>`;

    html += `<div class="family-foot">
      <div style="flex:1">
        <div style="font-weight:700;color:var(--ink);font-size:14px">本月家庭总支出 <b>¥${fmtMoney(monthTotal)}</b></div>
        <div style="font-size:12px;color:var(--ink-3);margin-top:2px">含共享池与专属商品 · 日均成本榜在洞察里</div>
      </div>
      <button class="btn btn-sm" data-act="goInsights" style="background:var(--surface)">看洞察</button>
    </div>`;
  }

  if (state.meta.demo) {
    html += `<div class="hint" style="text-align:center;margin-top:18px">当前是示例数据，可在「我的 → 数据」里清空后正式开账</div>`;
  }
  return html;
}
function greeting() {
  const h = new Date().getHours();
  if (h < 6) return '夜深了';
  if (h < 11) return '早上好';
  if (h < 14) return '中午好';
  if (h < 18) return '下午好';
  return '晚上好';
}
function speciesLabel(p) {
  if (p.breed) return p.breed;
  return { cat: '猫', dog: '狗', other: '其他' }[p.species] || '其他';
}

/* ============================================================
   视图：补给看板
   ============================================================ */
const pantryFilter = { q: '', loc: 'all', cat: 'all' };

function renderPantry() {
  const today = todayISO();
  const alerts = pantryAlerts(today);
  const stock = stockMap();
  const phrase = pantryFilter.q.trim().toLowerCase();

  const all = activeProducts()
    .map(p => {
      const st = stock.get(p.id) || { qty: 0, earliestExpiry: null, batchCount: 0 };
      const cat = catById(p.categoryId);
      const rd = remainingDays(st.qty, p.dailyUsage);
      const es = expiryStatus(st.earliestExpiry, today, resolveRemindDays(p, cat));
      const outDays = st.qty <= 0 ? outOfStockDays(p.id, today) : 0;
      return { p, cat, st, rd, es, outDays };
    })
    .filter(row => {
      if (phrase && !row.p.name.toLowerCase().includes(phrase)) return false;
      if (pantryFilter.loc !== 'all') {
        const hit = batchesOf(row.p.id).some(b => b.locationId === pantryFilter.loc);
        if (!hit) return false;
      }
      if (pantryFilter.cat !== 'all' && row.p.categoryId !== pantryFilter.cat) return false;
      return true;
    })
    .sort((a, b) => {
      const rank = r => (r.st.qty <= 0 ? 3 : r.es === 'expired' ? 0 : r.es === 'soon' ? 1 : 2);
      const d = rank(a) - rank(b);
      if (d) return d;
      return (a.st.earliestExpiry || '9999').localeCompare(b.st.earliestExpiry || '9999');
    });

  const soonRows = all.filter(r => r.st.qty > 0 && (r.es === 'soon' || r.es === 'expired'));
  const lowRows = all.filter(r => r.st.qty > 0 && r.es !== 'soon' && r.es !== 'expired' && r.rd !== null && r.rd < (r.cat && r.cat.lowStockDays != null ? r.cat.lowStockDays : 5));
  const restRows = all.filter(r => !soonRows.includes(r) && !lowRows.includes(r));

  let html = `<div class="top">
    <div>
      <div class="hello">补给看板</div>
      <h1>谁快没了，<span>放哪了</span></h1>
    </div>
    <div class="streak" style="min-width:64px">
      <span class="n">${all.filter(r => r.st.qty > 0).length}</span>
      <span class="t">在库商品</span>
    </div>
  </div>`;

  html += `<div class="pantry-tools">
    <div class="searchbox">${icon('search', 18)}<input id="pantrySearch" placeholder="搜商品名，比如「豆腐砂」" value="${esc(pantryFilter.q)}"></div>
    <button class="filterbtn ${pantryFilter.loc !== 'all' || pantryFilter.cat !== 'all' ? 'on' : ''}" data-act="toggleFilter" aria-label="筛选">${icon('filter', 19)}</button>
  </div>`;

  if (pantryFilter.loc !== 'all' || pantryFilter.cat !== 'all') {
    const loc = locById(pantryFilter.loc);
    const cat = catById(pantryFilter.cat);
    html += `<div class="chips">
      ${loc ? `<button class="chip on" data-act="clearFilter" data-kind="loc">${locIcon(loc.icon, 13)} ${esc(loc.name)} ✕</button>` : ''}
      ${cat ? `<button class="chip on" data-act="clearFilter" data-kind="cat"><span class="dot" style="background:${cat.color}"></span>${esc(cat.name)} ✕</button>` : ''}
    </div>`;
  }

  if (!all.length) {
    html += `<div class="empty" style="margin-top:40px">
      <div>${emptyArt('pantry')}</div>
      <div>${state.products.length ? '没有符合筛选条件的物品' : '还没有任何物品，记第一笔就自动入库了'}</div>
      <button class="btn btn-primary btn-sm" data-act="openPurchase">${icon('plus', 16)} 记一笔</button>
    </div>`;
    return html;
  }

  const card = (r, mode) => productCardHTML(r, today, mode);
  if (soonRows.length) {
    html += `<div class="section-h"><h2>${icon('alert', 18)} 快过期</h2><span class="sub">${soonRows.length} 件 · 先吃完它们</span></div>
      ${soonRows.map(r => card(r, 'warn')).join('')}`;
  }
  if (lowRows.length) {
    html += `<div class="section-h"><h2>${icon('box', 18)} 该补货</h2><span class="sub">${lowRows.length} 件 · 按日均消耗估算</span></div>
      ${lowRows.map(r => card(r, 'warn')).join('')}`;
  }
  html += `<div class="section-h"><h2>${icon('paw', 18)} 全部库存</h2><span class="sub">${restRows.length} 件 · 点卡片看批次</span></div>
    ${restRows.length ? restRows.map(r => card(r, 'flat')).join('') : `<div class="empty">这一段是空的，其余都在上面两段</div>`}`;
  html += `<div class="hint" style="text-align:center;margin:18px 0">长按「出库」可以一次扣多件；剩余天数按你填的日均消耗估算</div>`;
  return html;
}

function productCardHTML(r, today, mode) {
  const { p, cat, st, rd, es, outDays } = r;
  const color = cat ? cat.color : '#C9B8E8';
  const expiryTxt = st.earliestExpiry ? `${dateLabel(st.earliestExpiry)}到期` : '无保质期';
  const loc = (() => {
    const b = batchesOf(p.id).find(x => x.locationId);
    return b && locById(b.locationId) ? locById(b.locationId) : null;
  })();
  let dayPill = '';
  if (st.qty <= 0) {
    dayPill = `<span class="pill out">已断货${outDays > 0 ? ' ' + outDays + ' 天' : ''}</span>`;
  } else if (rd === null) {
    dayPill = `<span class="pill">未设日均</span>`;
  } else if (rd <= (cat && cat.lowStockDays != null ? cat.lowStockDays : 5)) {
    dayPill = `<span class="pill low">只剩 ${rd} 天</span>`;
  } else if (rd > 180) {
    dayPill = `<span class="pill over">够用 ${rd} 天 · 囤多了?</span>`;
  } else {
    dayPill = `<span class="pill healthy">剩 ${rd} 天</span>`;
  }
  let expPill = '';
  if (es === 'expired') expPill = `<span class="pill expired">已过期 ${Math.abs(diffDays(today, st.earliestExpiry))} 天</span>`;
  else if (es === 'soon') {
    const d = diffDays(today, st.earliestExpiry);
    expPill = `<span class="pill soon">${d === 0 ? '今天到期' : d + ' 天后过期'}</span>`;
  }
  const cls = st.qty <= 0 ? 'danger' : (es === 'expired' || es === 'soon' || (rd !== null && rd < (cat && cat.lowStockDays != null ? cat.lowStockDays : 5))) ? 'warn' : '';
  const petTag = p.petId ? petById(p.petId) : null;
  return `<div class="prod-card ${cls}" data-act="openProduct" data-id="${p.id}">
    <div class="prod-ic" style="color:${color}">${catIcon(cat ? cat.icon : 'gift', 36)}</div>
    <div class="prod-main">
      <div class="prod-name">${esc(p.name)}${p.spec ? `<span class="spec">${esc(p.spec)}</span>` : ''}${petTag ? `<span class="pill" style="height:18px;font-size:10px;background:#FDECF4;color:#B4668C">${esc(petTag.name)}专属</span>` : ''}</div>
      <div class="prod-meta">
        <span style="display:flex;align-items:center;gap:3px">${icon('pin', 12)} ${loc ? esc(loc.name) : '未记录位置'}</span>
        <span class="sep">·</span>
        <span style="display:flex;align-items:center;gap:3px">${icon('calendar', 12)} ${expiryTxt}</span>
      </div>
      <div class="prod-tags">
        <span class="pill" style="background:var(--surface-alt)"><b style="font-variant-numeric:tabular-nums">${fmt2(st.qty)}</b> <span style="color:var(--ink-3);font-weight:600">${esc(p.unit)}</span></span>
        ${dayPill}${expPill}
      </div>
    </div>
    <button class="out-btn" data-act="out" data-id="${p.id}" data-long="1" ${st.qty <= 0 ? 'disabled' : ''} aria-label="出库一件">
      <span style="font-size:17px;line-height:1">−1</span><small>出库</small>
    </button>
  </div>`;
}

/* 筛选面板 */
function openFilterSheet() {
  const locs = state.locations.slice().sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  const cats = state.categories.slice().sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  openSheet({
    title: '筛选库存',
    body: `<div class="field"><label>按位置</label>
      <div class="opt-list">
        <button class="opt ${pantryFilter.loc === 'all' ? 'on' : ''}" data-act="pickFilter" data-kind="loc" data-id="all"><span class="oi">${icon('paw', 18)}</span><span class="ot"><span class="a">全部位置</span></span></button>
        ${locs.map(l => `<button class="opt ${pantryFilter.loc === l.id ? 'on' : ''}" data-act="pickFilter" data-kind="loc" data-id="${l.id}">
          <span class="oi" style="background:var(--surface-alt);color:var(--ink-2)">${locIcon(l.icon, 18)}</span>
          <span class="ot"><span class="a">${esc(l.name)}</span><span class="b">${state.batches.filter(b => b.qtyLeft > 0 && b.locationId === l.id).length} 个批次在库</span></span>
        </button>`).join('')}
      </div></div>
      <div class="field" style="margin-top:18px"><label>按品类</label>
      <div class="opt-list">
        <button class="opt ${pantryFilter.cat === 'all' ? 'on' : ''}" data-act="pickFilter" data-kind="cat" data-id="all"><span class="oi">${icon('paw', 18)}</span><span class="ot"><span class="a">全部品类</span></span></button>
        ${cats.map(c => `<button class="opt ${pantryFilter.cat === c.id ? 'on' : ''}" data-act="pickFilter" data-kind="cat" data-id="${c.id}">
          <span class="oi" style="background:transparent;color:${c.color}">${catIcon(c.icon, 32)}</span>
          <span class="ot"><span class="a">${esc(c.name)}</span><span class="b">${c.remindDays} 天临期提醒 · 保质期 ${c.shelfLifeDays || '未设'} ${c.shelfLifeDays ? '天' : ''}</span></span>
        </button>`).join('')}
      </div></div>`,
    foot: `<button class="btn btn-block" data-act="resetFilter">清除筛选</button>`
  });
}
