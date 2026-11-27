/* ============================================================
   视图：洞察
   ============================================================ */
const insightState = { petId: 'all' };

function scopedEntries(petId) {
  const all = ledgerEntries();
  if (!petId || petId === 'all') return all;
  return all.filter(e => e.petId === petId);
}

function firstPurchaseDate() {
  const dates = state.purchases.map(p => (p.occurredAt || '').slice(0, 10)).filter(Boolean).sort();
  return dates[0] || null;
}

function renderInsights() {
  if (insightState.petId !== 'all' && !petById(insightState.petId)) insightState.petId = 'all';
  const today = todayISO();
  const month = monthKey(today);
  const prevMonth = shiftMonth(month, -1);
  const entries = scopedEntries(insightState.petId);
  const total = monthlyTotal(entries, month);
  const prevTotal = monthlyTotal(entries, prevMonth);
  const cats = state.categories.slice().sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  const breakdown = categoryBreakdown(entries, month, cats);
  const first = firstPurchaseDate();
  const daysSinceFirst = first ? diffDays(first, today) : 0;
  const locked = !first || daysSinceFirst < 30;
  const cmp = comparePeriods(total, prevTotal);

  let html = `<div class="top">
    <div>
      <div class="hello">洞察</div>
      <h1>钱花在<span>哪儿</span></h1>
    </div>
    <div class="streak" style="min-width:64px">
      <span class="n">${entries.filter(e => monthKey(e.occurredAt) === month).length}</span>
      <span class="t">本月明细</span>
    </div>
  </div>`;

  html += `<div class="seg">
    <button class="${insightState.petId === 'all' ? 'on' : ''}" data-act="scopePet" data-id="all">全部</button>
    ${state.pets.map(p => `<button class="${insightState.petId === p.id ? 'on' : ''}" data-act="scopePet" data-id="${p.id}">${esc(p.name)}</button>`).join('')}
  </div>`;
  if (insightState.petId !== 'all') {
    html += `<div class="hint" style="margin-top:8px">${icon('info', 12)} 仅统计「${esc((petById(insightState.petId) || {}).name || '')}」的专属商品，共享池不计入</div>`;
  }

  html += `<div class="total-card">
    <div class="lab">${Number(month.slice(5))} 月总支出</div>
    <div class="big"><span class="cur">¥</span><span id="monthTotal">0</span></div>
    <div class="cmp">${locked
      ? `<span>记账满 30 天解锁环比 · 已记 ${daysSinceFirst || 0} 天</span>`
      : (cmp
        ? `<span>比上月 <span class="${cmp.delta >= 0 ? 'up' : 'down'}">${cmp.delta >= 0 ? '↑' : '↓'} ${Math.abs(Math.round(cmp.deltaRatio * 100))}%</span>（${cmp.delta >= 0 ? '+' : ''}¥${fmtMoney(cmp.delta)}）</span>`
        : `<span>上月没有支出记录，暂无可比</span>`)}
    </div>
    ${locked ? `<div class="unlock">
      <div style="display:flex;justify-content:space-between"><span>记账满 30 天解锁环比与同比</span><b>${Math.min(30, daysSinceFirst || 0)}/30</b></div>
      <div class="unlock-bar"><i style="width:${Math.min(100, ((daysSinceFirst || 0) / 30) * 100)}%"></i></div>
    </div>` : ''}
  </div>`;

  /* 品类占比 */
  html += `<div class="chart-card">
    <h3>品类占比 <span style="font-size:11px;font-weight:600;color:var(--ink-3)">点色块看明细</span></h3>
    ${breakdown.length ? `<div class="donut-wrap">
      <div class="donut" style="width:132px;height:132px">
        ${donutSVG(breakdown, total)}
        <div class="donut-center"><span class="k">${Number(month.slice(5))} 月</span><span class="v">¥${fmtMoney(total)}</span></div>
      </div>
      <div class="legend">
        ${breakdown.map(b => `<div class="legend-row" data-act="drill" data-id="${b.categoryId}">
          <span class="dot" style="background:${b.color}"></span>
          <span class="nm">${esc(b.name)}</span>
          <span class="rt">${Math.round(b.ratio * 100)}%</span>
          <span class="am">¥${fmtMoney(b.amount)}</span>
        </div>`).join('')}
      </div>
    </div>` : `<div class="empty" style="padding:18px">${emptyArt('insights')}<div>本月还没有支出${state.products.length ? '，记一笔就能看到结构' : ''}</div></div>`}
  </div>`;

  /* 月度趋势 */
  const trend = monthlyTrend(entries, 6, month);
  const maxTrend = Math.max(1, ...trend.map(t => t.amount));
  html += `<div class="chart-card">
    <h3>最近 6 个月 <span style="font-size:11px;font-weight:600;color:var(--ink-3)">单位：元</span></h3>
    <div class="trend">
      ${trend.map(t => {
        const h = Math.max(3, (t.amount / maxTrend) * 96);
        return `<div class="col">
          <div class="bar ${t.month === month ? 'cur' : ''}" style="height:${h}px">
            ${t.amount > 0 ? `<span class="v">${t.amount >= 1000 ? (t.amount / 1000).toFixed(1) + 'k' : Math.round(t.amount)}</span>` : ''}
          </div>
          <span class="lb">${monthLabel(t.month)}</span>
        </div>`;
      }).join('')}
    </div>
  </div>`;

  /* 日均成本榜 */
  const ranking = dailyCostRanking(activeProducts(), entries).slice(0, 5);
  html += `<div class="chart-card">
    <h3>日均成本榜 <span style="font-size:11px;font-weight:600;color:var(--ink-3)">单价 × 日均消耗</span></h3>
    <div class="hint" style="margin:-4px 0 8px">这才是「隐形贵」的照妖镜：一顿罐头可能比一袋粮更烧钱。</div>
    ${ranking.length ? ranking.map((r, i) => `<div class="rank-row">
      <div class="rank-no ${i === 0 ? 'top' : ''}">${i + 1}</div>
      <div class="rank-main">
        <div class="nm">${esc(r.name)}</div>
        <div class="sub">¥${fmt2(r.unitPrice)} / 件 × ${r.dailyUsage} 件/天</div>
      </div>
      <div class="rank-val"><div class="p">¥${fmt2(r.perDay)}</div><div class="u">每天</div></div>
    </div>`).join('') : `<div class="empty" style="padding:14px">给商品填上「日均消耗」和至少一笔采购，就能算出每天烧多少钱</div>`}
  </div>`;

  /* 本月账单 */
  const monthPurchases = state.purchases
    .filter(p => monthKey(p.occurredAt) === month)
    .filter(p => insightState.petId === 'all' || state.purchaseItems.some(i => i.purchaseId === p.id && i.petId === insightState.petId))
    .sort((a, b) => (b.occurredAt || '').localeCompare(a.occurredAt || ''));
  html += `<div class="chart-card">
    <h3>本月账单 <span style="font-size:11px;font-weight:600;color:var(--ink-3)">${monthPurchases.length} 笔</span></h3>
    ${monthPurchases.length ? `<div class="bill-list">${monthPurchases.slice(0, 12).map(p => {
      const items = state.purchaseItems.filter(i => i.purchaseId === p.id);
      const names = items.map(i => (productById(i.productId) || {}).name || '商品').join(' · ');
      return `<div class="bill-row" data-act="openPurchaseDetail" data-id="${p.id}">
        <div class="bill-main"><div class="t">${esc(names)}</div><div class="s">${dateLabel((p.occurredAt || '').slice(0, 10))}${p.note ? ' · ' + esc(p.note) : ''} · ${items.length} 件</div></div>
        <div class="amt">¥${fmtMoney(p.total)}</div>
      </div>`;
    }).join('')}</div>` : `<div class="empty" style="padding:16px">本月还没有支出，这很正常</div>`}
    ${monthPurchases.length > 12 ? `<div class="drill-tip"><span>仅显示最近 12 笔</span></div>` : ''}
  </div>`;
  return html;
}

function donutSVG(rows, total) {
  const r = 40, C = 2 * Math.PI * r;
  let acc = 0;
  const arcs = rows.map(row => {
    const len = Math.max(0.001, C * row.ratio);
    const dash = Math.max(0.4, len - 1.8);
    const el = `<circle class="arc" cx="50" cy="50" r="${r}" fill="none" stroke="${row.color}"
      stroke-width="17" stroke-dasharray="${dash} ${Math.max(0.4, C - dash)}"
      stroke-dashoffset="${-acc}" data-act="drill" data-id="${row.categoryId}">
      <title>${row.name} ¥${fmtMoney(row.amount)}</title></circle>`;
    acc += len;
    return el;
  }).join('');
  return `<svg viewBox="0 0 100 100" width="132" height="132">${arcs}</svg>`;
}

function openDrillSheet(categoryId) {
  const month = monthKey(todayISO());
  const cat = catById(categoryId);
  const rows = scopedEntries(insightState.petId)
    .filter(e => monthKey(e.occurredAt) === month && e.categoryId === categoryId)
    .sort((a, b) => (b.occurredAt || '').localeCompare(a.occurredAt || ''));
  const sum = r2(rows.reduce((s, e) => s + e.subtotal, 0));
  openSheet({
    title: `${cat ? cat.name : '品类'} · ${Number(month.slice(5))} 月`,
    body: `<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:14px">
      <span style="font-size:12px;color:var(--ink-3)">${rows.length} 条明细</span>
      <b style="font-size:26px;font-variant-numeric:tabular-nums">¥${fmtMoney(sum)}</b>
    </div>
    ${rows.map(e => `<button class="bill-row" style="width:100%;text-align:left" data-act="openPurchaseDetail" data-id="${e.purchaseId}">
      <div class="bill-main"><div class="t">${esc(e.productName)}</div><div class="s">${dateLabel((e.occurredAt || '').slice(0, 10))} · ${fmt2(e.qty)} ${esc(e.unit)} × ¥${fmt2(e.unitPrice)}</div></div>
      <div class="amt">¥${fmtMoney(e.subtotal)}</div>
    </button>`).join('')}`,
    foot: `<button class="btn btn-block" data-act="closeSheet">知道了</button>`
  });
}

/* ============================================================
   视图：我的
   ============================================================ */
function renderMe() {
  const today = todayISO();
  const lv = levelInfo();
  const streak = streakInfo(today);
  const lastBackup = state.meta.lastBackupAt ? String(state.meta.lastBackupAt).slice(0, 10) : null;
  const backupDays = lastBackup ? diffDays(lastBackup, today) : null;
  const petRows = state.pets.slice().sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

  let html = `<div class="top">
    <div><div class="hello">我的</div><h1>这本<span>账</span></h1></div>
  </div>`;

  html += `<div class="me-hero">
    <div class="lvl-ring">${levelRing(lv)}<div class="lv">Lv ${lv.level}</div></div>
    <div class="info">
      <div class="a">已记 ${state.purchases.length} 笔 · ${state.products.length} 个商品</div>
      <div class="b">${lv.nextAt ? `再记 ${lv.remain} 笔升到 Lv ${lv.level + 1}` : '满级了，厉害'}${streak.current ? ` · 连续 ${streak.current} 天` : ''}</div>
      <div class="bar"><i style="width:${Math.round(lv.progress * 100)}%"></i></div>
    </div>
  </div>`;

  if (state.meta.demo) {
    html += `<div class="alertbar" style="margin-top:12px">${icon('info', 16)}<span style="flex:1">当前为示例数据，正式使用前建议清空</span><button class="btn btn-sm" style="background:var(--surface)" data-act="clearData">清空</button></div>`;
  }

  html += `<div class="section-h"><h2>${icon('paw', 18)} 宠物</h2><button class="btn btn-ghost" data-act="addPet">${icon('plus', 14)} 添加</button></div>
  <div class="list-card">
    ${petRows.length ? petRows.map(p => {
      const excl = activeProducts().filter(x => x.petId === p.id).length;
      return `<button class="list-row" data-act="openPet" data-id="${p.id}">
        <span class="pet-avatar" style="width:36px;height:36px;margin:0;flex:none">${petAvatarHTML(p)}</span>
        <span class="tt"><span class="a">${esc(p.name)}</span><span class="b">${esc(speciesLabel(p))}${p.birthday ? ' · ' + ageLabel(petAge(p.birthday, today)) : ''}${excl ? ` · ${excl} 件专属` : ''}</span></span>
        <span class="chev">${icon('chev', 16)}</span>
      </button>`;
    }).join('') : `<div class="empty" style="padding:20px">还没有宠物，先加一只吧</div>`}
  </div>`;

  html += `<div class="section-h"><h2>${icon('box', 18)} 品类与提醒</h2><button class="btn btn-ghost" data-act="addCategory">${icon('plus', 14)} 新品类</button></div>
  <div class="list-card">
    ${state.categories.slice().sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)).map(c => `<button class="list-row" data-act="editCategory" data-id="${c.id}">
      <span class="ic-plain">${catIcon(c.icon, 32)}</span>
      <span class="tt"><span class="a">${esc(c.name)}${c.builtin ? '' : ' <span class="tag-mini">自定义</span>'}</span><span class="b">临期 ${c.remindDays} 天 · 补货阈值 ${c.lowStockDays} 天 · 保质期 ${c.shelfLifeDays || '未设'}${c.shelfLifeDays ? ' 天' : ''}</span></span>
      <span class="chev">${icon('chev', 16)}</span>
    </button>`).join('')}
  </div>`;

  html += `<div class="section-h"><h2>${icon('pin', 18)} 存放位置</h2><button class="btn btn-ghost" data-act="addLocation">${icon('plus', 14)} 添加</button></div>
  <div class="list-card">
    ${state.locations.slice().sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)).map(l => {
      const n = state.batches.filter(b => b.qtyLeft > 0 && b.locationId === l.id).length;
      return `<button class="list-row" data-act="editLocation" data-id="${l.id}">
        <span class="ic-plain">${locIcon(l.icon, 32)}</span>
        <span class="tt"><span class="a">${esc(l.name)}</span><span class="b">${n} 个批次在库</span></span>
        <span class="chev">${icon('chev', 16)}</span>
      </button>`;
    }).join('')}
  </div>`;

  html += `<div class="section-h"><h2>${icon('download', 18)} 数据</h2><span class="sub">${lastBackup ? `上次备份 ${dateLabel(lastBackup)}${backupDays > 7 ? ' · 该备份了' : ''}` : '从未备份'}</span></div>
  <div class="list-card">
    <button class="list-row" data-act="exportJSON">
      <span class="ic-wrap" style="background:var(--mint-soft);color:#3D8C74">${icon('download', 18)}</span>
      <span class="tt"><span class="a">导出完整备份（JSON）</span><span class="b">全部表结构 + 数据，换设备能完整恢复</span></span>
    </button>
    <button class="list-row" data-act="exportCSV">
      <span class="ic-wrap" style="background:var(--surface-alt);color:#8C7A64">${icon('edit', 18)}</span>
      <span class="tt"><span class="a">导出账单（CSV）</span><span class="b">可用 Excel 二次分析</span></span>
    </button>
    <button class="list-row" data-act="importJSON">
      <span class="ic-wrap" style="background:#EFE9FB;color:#7A66AC">${icon('upload', 18)}</span>
      <span class="tt"><span class="a">从备份恢复</span><span class="b">会覆盖当前全部数据，导入前会确认</span></span>
    </button>
    <button class="list-row" data-act="openSnapshots">
      <span class="ic-wrap" style="background:#EFF6F1;color:#5E8B72">${icon('refresh', 18)}</span>
      <span class="tt"><span class="a">从浏览器快照恢复</span><span class="b">最近 7 份，点开挑一份回退</span></span>
    </button>
    <button class="list-row" data-act="snapshotNow">
      <span class="ic-wrap" style="background:var(--surface-alt)">${icon('refresh', 18)}</span>
      <span class="tt"><span class="a">立即生成快照</span><span class="b">浏览器内保留最近 7 份</span></span>
    </button>
    <button class="list-row" data-act="toggleAutoBackup">
      <span class="ic-wrap" style="background:var(--surface-alt)">${icon('clock', 18)}</span>
      <span class="tt"><span class="a">自动快照</span><span class="b">每小时最多一份</span></span>
      <span style="width:44px;height:26px;border-radius:13px;background:${state.meta.autoBackup ? 'var(--mint)' : '#E3D7C7'};position:relative;flex:none;transition:background .2s">
        <span style="position:absolute;top:3px;left:${state.meta.autoBackup ? '21px' : '3px'};width:20px;height:20px;border-radius:50%;background:#fff;transition:left .2s var(--ease-spring)"></span>
      </span>
    </button>
  </div>`;

  html += `<div class="section-h"><h2>${icon('info', 18)} 关于</h2></div>
  <div class="list-card">
    <div class="list-row"><span class="tt"><span class="a">宠物账本 v1</span><span class="b">纯 Web · 数据只存在这台设备的浏览器里</span></span><span class="tag-mini">离线可用</span></div>
    <button class="list-row" data-act="loadDemo"><span class="tt"><span class="a">载入示例数据</span><span class="b">两只宠物 + 4 个月账单，用来试功能</span></span></button>
    <button class="list-row" data-act="clearData"><span class="tt"><span class="a" style="color:var(--danger)">清空全部数据</span><span class="b">不可撤销，建议先导出备份</span></span></button>
  </div>
  <div class="hint" style="margin:14px 4px 0;line-height:1.7">
    ${icon('alert', 12)} 浏览器存储可能被清理（清缓存、Safari 7 天未访问回收、隐身模式关闭）。<b>数据安全只能靠定期导出兜底</b>，这是纯 Web 形态的真实代价。动效会跟随系统的「减少动态效果」设置自动降级。
  </div>`;

  return html;
}

function levelRing(lv) {
  const r = 24, C = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, lv.progress || 0));
  return `<svg width="58" height="58" viewBox="0 0 58 58">
    <circle cx="29" cy="29" r="${r}" fill="none" stroke="#F2E7D8" stroke-width="5"/>
    <circle cx="29" cy="29" r="${r}" fill="none" stroke="#2FAE8C" stroke-width="5" stroke-linecap="round"
      stroke-dasharray="${C * p} ${C}" transform="rotate(-90 29 29)"/>
  </svg>`;
}
