/* ============================================================
   图形资产：手写线描图标 / 宠物头像 / 品类图标
   ============================================================ */
const ICONS = {
  paw: '<circle cx="7" cy="8" r="2.2"/><circle cx="12" cy="6.2" r="2.4"/><circle cx="17" cy="8" r="2.2"/><path d="M12 11c-3 0-5.4 2.2-5.4 4.6 0 1.9 1.6 3.4 3.5 3.4 1 0 1.4-.5 1.9-.5s.9.5 1.9.5c1.9 0 3.5-1.5 3.5-3.4C17.4 13.2 15 11 12 11Z"/>',
  box: '<path d="M3.5 8.5 12 4l8.5 4.5v9L12 22l-8.5-4.5v-9Z"/><path d="M3.8 8.6 12 13l8.2-4.4M12 13v9"/>',
  pie: '<circle cx="12" cy="12" r="8.6"/><path d="M12 12V3.4M12 12l7.4 4.4"/>',
  user: '<circle cx="12" cy="8.2" r="4.2"/><path d="M4.4 20.4c0-3.8 3.4-6 7.6-6s7.6 2.2 7.6 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="6.4"/><path d="M16 16l4.4 4.4"/>',
  filter: '<path d="M4 6h16M7 12h10M10 18h4"/>',
  close: '<path d="M6 6l12 12M18 6l-12 12"/>',
  chev: '<path d="M9 5l7 7-7 7"/>',
  chevL: '<path d="M15 5l-7 7 7 7"/>',
  trash: '<path d="M4 7h16M9 7V4.6h6V7M6.5 7l1 13h9l1-13"/>',
  edit: '<path d="M4 20h4l10.4-10.4-4-4L4 16v4Z"/><path d="M14.4 5.6l4 4"/>',
  camera: '<path d="M4 8.5h3l1.6-2.5h6.8L17 8.5h3v10.5H4V8.5Z"/><circle cx="12" cy="13.2" r="3.4"/>',
  flame: '<path d="M12 3.5c3.4 3.4 2.2 5.6 1.2 7.2 1.2-1.6 2.2-1.8 3 .2 1.6 2.6-.4 5.2-4.2 5.2-4 .1-8.4-3.4-8.4-8.6 0-2.2 1.3-3.9 2.7-5.4"/>',
  star: '<path d="M12 3.6l2.4 5.2 5.6.7-4.1 4 1.1 5.7-5-2.9-5 2.9 1.1-5.7-4.1-4z"/>',
  check: '<path d="M4.5 12.5l5 5L19.5 7"/>',
  alert: '<path d="M12 3.6 22 20H2L12 3.6Z"/><path d="M12 9v5M12 17.2v.2"/>',
  calendar: '<rect x="4" y="5.6" width="16" height="14.4" rx="3"/><path d="M8 3.6v3.4M16 3.6v3.4M4 10.4h16"/>',
  pin: '<path d="M12 21c4.2-4.6 6-8 6-10.4a6 6 0 1 0-12 0C6 13 7.8 16.4 12 21Z"/><circle cx="12" cy="10.6" r="2.4"/>',
  upload: '<path d="M12 16V4.6M8 8.4 12 4.4l4 4M4 15v4.6h16V15"/>',
  download: '<path d="M12 4.6v11.4M8 12l4 4 4-4M4 15v4.6h16V15"/>',
  refresh: '<path d="M20 12a8 8 0 1 1-2.8-6.1M20 4.4v4.2h-4.2"/>',
  heart: '<path d="M12 20.4c-1.8-1.6-8-6.6-8-11.4a4.4 4.4 0 0 1 8-2 4.4 4.4 0 0 1 8 2c0 4.8-6.2 9.8-8 11.4Z"/>',
  clock: '<circle cx="12" cy="12" r="8.4"/><path d="M12 7.4v5l3.4 2.2"/>',
  sparkle: '<path d="M12 4l1.8 4.6L18.4 10l-4.6 1.8L12 16.4l-1.8-4.6L5.6 10l4.6-1.8L12 4Z"/>',
  info: '<circle cx="12" cy="12" r="8.4"/><path d="M12 11v5M12 7.8v.3"/>'
};
function icon(name, size, cls) {
  const s = size || 20;
  return `<svg class="ic ${cls || ''}" viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ''}</svg>`;
}

/* 图片图标：来自 ICON_DATA（构建期内联的 base64）。缺失时返回空字符串，调用方回退 SVG。 */
function imgIcon(name, size, cls) {
  const d = (typeof ICON_DATA !== 'undefined') && ICON_DATA[name];
  if (!d) return '';
  const s = size || 26;
  return `<img class="ic-img ${cls || ''}" src="${d}" width="${s}" height="${s}" alt="" draggable="false">`;
}
function hasImgIcon(name){ return (typeof ICON_DATA !== 'undefined') && !!ICON_DATA[name]; }

const CAT_ICONS = {
  food: '<path d="M7.2 8.4h9.6l1.7 11.6H5.5L7.2 8.4Z"/><path d="M7.6 8.4 9.2 4.4h5.6L16.4 8.4"/><path d="M9.6 13h4.8M10.2 16.6h3.6"/>',
  litter: '<path d="M3.5 10.5h17l-1.5 9.5H5L3.5 10.5Z"/><path d="M3.5 10.5 5.5 6h13l2 4.5"/><path d="M8 14v3.4M8 17.4 10 20M8 17.4 6 20"/>',
  med: '<rect x="6.5" y="8.4" width="11" height="13" rx="2.6"/><path d="M9 8.4V6.2h6v2.2M8 13h8M12 11v4"/>',
  toy: '<circle cx="12" cy="12" r="7.4"/><path d="M4.8 9.6c2.4 1 2.4 3.8 0 4.8M19.2 9.6c-2.4 1-2.4 3.8 0 4.8M9.6 4.8c1 2.4 3.8 2.4 4.8 0M9.6 19.2c1-2.4 3.8-2.4 4.8 0"/>',
  gift: '<rect x="4" y="10" width="16" height="10.4" rx="2"/><path d="M3 6.6h18v3.4H3M12 6.6v13.8"/><path d="M12 6.6c-1-3-5-3.4-4.6-.8.2 1.2 2.6 1 4.6.8M12 6.6c1-3 5-3.4 4.6-.8-.2 1.2-2.6 1-4.6.8"/>'
};
const LOC_ICONS = {
  cabinet: '<rect x="4.5" y="3.6" width="15" height="17" rx="2.4"/><path d="M12 3.8v16.6M4.6 12h14.8"/><circle cx="10.2" cy="7.8" r=".7"/><circle cx="10.2" cy="16" r=".7"/>',
  plant: '<path d="M12 21v-7.4"/><path d="M12 13.4c-3.6 0-5.6-2.4-5.4-5.6 3.4 0 5.4 2.4 5.4 5.6Z"/><path d="M12 12c4 0 6-2.6 5.6-6-3.6.2-5.6 2.8-5.6 6Z"/><path d="M8.4 21h7.2"/>',
  snow: '<path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9"/>',
  drop: '<path d="M12 3.6c3.6 4.4 5.4 7 5.4 9.6a5.4 5.4 0 1 1-10.8 0c0-2.6 1.8-5.2 5.4-9.6Z"/>',
  box: '<path d="M3.6 8.4 12 4l8.4 4.4v8.8L12 21.6l-8.4-4.4V8.4Z"/><path d="M3.9 8.5 12 12.9l8.1-4.4"/>',
  moon: '<path d="M19.6 15.6A8.4 8.4 0 0 1 8.4 4.4 8.4 8.4 0 1 0 11.2 19.4 8.4 8.4 0 0 0 8.4-3.8Z"/>'
};
function catIcon(name, size) {
  const s = size || 20;
  const img = hasImgIcon('cat-' + name) ? imgIcon('cat-' + name, s, 'cat-img') : '';
  if (img) return img;
  return `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${CAT_ICONS[name] || CAT_ICONS.gift}</svg>`;
}
function locIcon(name, size) {
  const s = size || 20;
  return `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${LOC_ICONS[name] || LOC_ICONS.box}</svg>`;
}

/* ---------- 手绘宠物头像 ---------- */
const AVATARS = {
  'cat-orange': { type: 'cat', bg: '#FFF0DC', fur: '#F6B26B', ear: '#FBD0A6', muzzle: '#FFF6E8', stripe: '#E08E45', eye: '#4A3F36' },
  'cat-white': { type: 'cat', bg: '#FFF6F0', fur: '#FDFBF7', ear: '#F9DDD6', muzzle: '#FFFFFF', eye: '#5C7A96', outline: '#E9DCCF' },
  'cat-tabby': { type: 'cat', bg: '#F7EEE2', fur: '#C2A182', ear: '#E2C7AC', muzzle: '#F6E9D8', stripe: '#8E7157', eye: '#5E4A33' },
  'cat-cow': { type: 'cat', bg: '#F2F1EE', fur: '#FFFFFF', ear: '#4A4440', muzzle: '#FFFFFF', patch: '#4A4440', eye: '#4A3F36' },
  'cat-ragdoll': { type: 'cat', bg: '#FBF2F0', fur: '#FCF3E8', ear: '#C9AF9F', muzzle: '#FFF6EE', eye: '#6E9BC4', patch: '#CDB3A3' },
  'dog-corgi': { type: 'dog', bg: '#FFF1DE', fur: '#E8A05C', ear: '#F6C995', muzzle: '#FFF9F0', earStyle: 'point', eye: '#4A3F36', blaze: '#FFF7EC', tongue: '#F08A84' },
  'dog-shiba': { type: 'dog', bg: '#FFEEDD', fur: '#D8934C', ear: '#F0C392', muzzle: '#FFF8EC', earStyle: 'point', eye: '#4A3F36', blaze: '#FFF6E6', tongue: '#F08A84' },
  'dog-golden': { type: 'dog', bg: '#FFF3D9', fur: '#EFC172', ear: '#D9A958', muzzle: '#FFF8E8', earStyle: 'flop', eye: '#5A4630', blaze: '#FFF6DC', tongue: '#F08A84' },
  'dog-teddy': { type: 'dog', bg: '#F5E7D8', fur: '#A9784F', ear: '#8C613E', muzzle: '#F0D9C2', earStyle: 'flop', curl: '#8C613E', eye: '#3F332A', blaze: '#E8CDB4', tongue: '#F08A84' },
  'rabbit': { type: 'rabbit', bg: '#FFF2F4', fur: '#FBF7F4', ear: '#F7E6E4', muzzle: '#FFFFFF', outline: '#EADDD8', eye: '#9A6A63' },
  'hamster': { type: 'hamster', bg: '#FFF4E2', fur: '#E8C9A0', ear: '#F3DCC0', muzzle: '#FFF6E9', belly: '#FFFDF8', eye: '#3F332A' }
};

function petAvatar(key, opts) {
  const c = AVATARS[key] || AVATARS['cat-orange'];
  const o = opts || {};
  const stroke = c.outline || 'rgba(61,58,54,.28)';
  const S = `stroke="${stroke}" stroke-width="1.2"`;
  const blink = o.blink === false ? '' : 'class="eyes"';
  const eyes = c.eye
    ? `<g ${blink}><ellipse cx="39.5" cy="55" rx="3.6" ry="4.6" fill="${c.eye}"/><ellipse cx="60.5" cy="55" rx="3.6" ry="4.6" fill="${c.eye}"/>
       <circle cx="38.3" cy="53.4" r="1.25" fill="#fff" opacity=".9"/><circle cx="59.3" cy="53.4" r="1.25" fill="#fff" opacity=".9"/></g>`
    : '';
  const blush = `<ellipse cx="29" cy="64" rx="5.2" ry="3" fill="#FFB8A6" opacity=".45"/><ellipse cx="71" cy="64" rx="5.2" ry="3" fill="#FFB8A6" opacity=".45"/>`;
  let ears = '';
  if (c.type === 'cat') {
    ears = `<path d="M23 42 22.5 15.5 44 27.5Z" fill="${c.ear}" ${S}/><path d="M77 42 77.5 15.5 56 27.5Z" fill="${c.ear}" ${S}/>
      <path d="M27 36.5 26.8 22 39 29.5Z" fill="#F2A6A0" opacity=".55"/><path d="M73 36.5 73.2 22 61 29.5Z" fill="#F2A6A0" opacity=".55"/>`;
  } else if (c.type === 'dog') {
    ears = c.earStyle === 'point'
      ? `<path d="M20 46 18.5 14 40 28Z" fill="${c.ear}" ${S}/><path d="M80 46 81.5 14 60 28Z" fill="${c.ear}" ${S}/>`
      : `<ellipse cx="18.5" cy="48" rx="10.5" ry="18" transform="rotate(14 18.5 48)" fill="${c.ear}" ${S}/>
         <ellipse cx="81.5" cy="48" rx="10.5" ry="18" transform="rotate(-14 81.5 48)" fill="${c.ear}" ${S}/>`;
  } else if (c.type === 'rabbit') {
    ears = `<ellipse cx="37" cy="21" rx="8.4" ry="22" transform="rotate(-10 37 21)" fill="${c.fur}" ${S}/>
      <ellipse cx="63" cy="21" rx="8.4" ry="22" transform="rotate(10 63 21)" fill="${c.fur}" ${S}/>
      <ellipse cx="37" cy="22" rx="4.4" ry="16" transform="rotate(-10 37 22)" fill="${c.ear}"/>
      <ellipse cx="63" cy="22" rx="4.4" ry="16" transform="rotate(10 63 22)" fill="${c.ear}"/>`;
  } else if (c.type === 'hamster') {
    ears = `<circle cx="28" cy="34" r="9.6" fill="${c.ear}" ${S}/><circle cx="72" cy="34" r="9.6" fill="${c.ear}" ${S}/>
      <circle cx="28" cy="34" r="5" fill="#F0C9B6" opacity=".7"/><circle cx="72" cy="34" r="5" fill="#F0C9B6" opacity=".7"/>`;
  }
  let patches = '';
  if (c.patch && c.type === 'cat') {
    patches = key === 'cat-cow'
      ? `<ellipse cx="37" cy="45" rx="11" ry="9.4" transform="rotate(-18 37 45)" fill="${c.patch}" opacity=".92"/>
         <ellipse cx="67" cy="64" rx="8.4" ry="5.6" transform="rotate(12 67 64)" fill="${c.patch}" opacity=".9"/>`
      : `<ellipse cx="36" cy="44" rx="12" ry="9" transform="rotate(-14 36 44)" fill="${c.patch}" opacity=".55"/>`;
  }
  let stripes = '';
  if (key === 'cat-tabby' && c.stripe) {
    stripes = `<path d="M43 32c1 3 1 5 0 7M50 30.5c1 3.4 1 5.6 0 8M57 32c-.6 3-.6 5 .2 7" stroke="${c.stripe}" stroke-width="2" stroke-linecap="round" fill="none" opacity=".8"/>`;
  }
  let curls = '';
  if (c.curl) {
    curls = `<g fill="${c.curl}" opacity=".55">
      <circle cx="30" cy="48" r="2.4"/><circle cx="27" cy="55" r="2.2"/><circle cx="70" cy="48" r="2.4"/><circle cx="73" cy="55" r="2.2"/>
      <circle cx="34" cy="60" r="2"/><circle cx="66" cy="60" r="2"/></g>`;
  }
  const whiskers = c.type === 'cat'
    ? `<g stroke="${c.eye}" stroke-width="1" opacity=".38">
        <path d="M30 64 16 61M30 67 15 68M70 64 84 61M70 67 85 68" fill="none"/></g>` : '';
  const belly = c.type === 'hamster'
    ? `<ellipse cx="50" cy="76" rx="11" ry="7" fill="${c.belly}"/>` : '';
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="宠物头像">
    <circle cx="50" cy="50" r="50" fill="${c.bg}"/>
    <circle cx="50" cy="50" r="44" fill="#fff" opacity=".18"/>
    ${ears}
    <ellipse cx="50" cy="56" rx="31" ry="28.5" fill="${c.fur}" ${S}/>
    ${patches}${stripes}${curls}${belly}
    ${c.blaze ? `<path d="M50 29c-6.4 0-7.6 8.4-4.2 14.6 2.6 4.8 4 8.6 4.2 13 2.2-4.4 1.6-8.2 4.2-13C57.6 37.4 56.4 29 50 29Z" fill="${c.blaze}" opacity=".9"/>` : ''}
    ${c.muzzle ? `<ellipse cx="50" cy="${c.type === 'dog' ? 70.5 : 70}" rx="${c.type === 'dog' ? 19 : 17}" ry="${c.type === 'dog' ? 13 : 11.5}" fill="${c.muzzle}" opacity=".96"/>` : ''}
    ${c.tongue ? `<path d="M50 73.4c1.4 0 2.4 1 2.4 3.2 0 2.2-1 3.4-2.4 3.4s-2.4-1.2-2.4-3.4c0-2.2 1-3.2 2.4-3.2Z" fill="${c.tongue}" opacity=".9"/>` : ''}
    ${blush}${eyes}
    <path d="M50 64.5c-1.6 0-2.6.9-2.6 1.9 0 1 .9 1.7 2.6 2.7 1.7-1 2.6-1.7 2.6-2.7 0-1-1-1.9-2.6-1.9Z" fill="#E4897C" ${S}/>
    <path d="M50 69.5c0 ${c.type === 'dog' ? 2.8 : 2}-1.8 3.4-3.6 3.6M50 69.5c0 ${c.type === 'dog' ? 2.8 : 2} 1.8 3.4 3.6 3.6" fill="none" stroke="#B8786C" stroke-width="1.2" stroke-linecap="round" opacity=".75"/>
    ${whiskers}
  </svg>`;
}

function petAvatarHTML(pet, size) {
  if (pet && pet.avatarType === 'photo' && pet.avatarRef && pet.avatarRef.startsWith('data:')) {
    return `<img src="${pet.avatarRef}" alt="${esc(pet.name)}" style="width:${size || 100}%;height:${size || 100}%;object-fit:cover">`;
  }
  return petAvatar(pet ? pet.avatarRef : 'cat-orange');
}

/* 空状态插画 */
function emptyArt(kind) {
  if (kind === 'pet') {
    return `<svg width="150" height="126" viewBox="0 0 150 126" fill="none" stroke="#C9B29C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="75" cy="112" rx="52" ry="7" fill="#FFF1DE" stroke="none"/>
      <path d="M100 62c8-3 12 3 9 8-2 4-6 4-8 3" stroke="#E0A97E"/>
      <ellipse cx="75" cy="78" rx="34" ry="26" fill="#FFF7EC"/>
      <path d="M56 62 54 36l20 13M94 62l2-26-20 13" fill="#FFE6C9"/>
      <circle cx="64" cy="76" r="3" fill="#7A736B" stroke="none"/><circle cx="86" cy="76" r="3" fill="#7A736B" stroke="none"/>
      <path d="M75 84v3M75 87c-2 3-5 3-6 1M75 87c2 3 5 3 6 1M56 82 46 79M56 86 45 88M94 82l10-3M94 86l11 2" stroke-width="1.6"/>
      <path d="M28 100c-6-6-9-12-8-16 5 2 9 7 10 12" stroke="#9DD9A0" fill="#DFF3E1"/>
      <path d="M120 104c6-5 9-10 8-14-5 2-8 6-9 11" stroke="#9DD9A0" fill="#DFF3E1"/>
      <circle cx="34" cy="26" r="3" fill="#FFC46B" stroke="none"/><circle cx="120" cy="34" r="2.2" fill="#FFD9A0" stroke="none"/>
    </svg>`;
  }
  if (kind === 'pantry') {
    return `<svg width="140" height="110" viewBox="0 0 140 110" fill="none" stroke="#C9B29C" stroke-width="2" stroke-linejoin="round">
      <ellipse cx="70" cy="99" rx="44" ry="6" fill="#FFF1DE" stroke="none"/>
      <path d="M38 42h64l-6 48H44L38 42Z" fill="#FFF7EC"/>
      <path d="M38 42 47 22h46l9 20" fill="#FFE6C9"/>
      <path d="M56 34h28" stroke="#E0A97E" stroke-width="6"/>
      <circle cx="70" cy="68" r="10" stroke="#FFB9A0"/><path d="M66 68h8M70 64v8" stroke="#FFB9A0"/>
    </svg>`;
  }
  return `<svg width="140" height="110" viewBox="0 0 140 110" fill="none" stroke="#C9B29C" stroke-width="2">
    <ellipse cx="70" cy="98" rx="42" ry="6" fill="#FFF1DE" stroke="none"/>
    <path d="M40 46h60v42H40V46Z" fill="#FFF7EC"/><path d="M34 38h72v8H34V38Z" fill="#FFE6C9"/>
    <circle cx="70" cy="66" r="9" stroke="#FFB9A0"/><path d="M66 66h8M70 62v8" stroke="#FFB9A0"/></svg>`;
}

/* ============================================================
   通用组件
   ============================================================ */
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

/* 震动：原生优先走 Capacitor Haptics（iOS 的 Taptic Engine），
   否则退回 Web Vibration API（Android）。不可用时静默返回 false，绝不阻塞业务。 */
function haptic(kind) {
  try {
    const cap = window.Capacitor;
    const native = !!(cap && cap.isNativePlatform && cap.isNativePlatform());
    if (native) {
      const Haptics = cap.Plugins && cap.Plugins.Haptics;
      if (Haptics) {
        /* 语义映射沿用方案 §8.3：出库=tap 最轻，记账=success，告警=warning */
        const p = kind === 'success' ? Haptics.notification({ type: 'SUCCESS' })
          : kind === 'warning' ? Haptics.notification({ type: 'WARNING' })
            : kind === 'celebrate' ? Haptics.impact({ style: 'MEDIUM' })
              : Haptics.selectionStart();
        if (p && p.catch) p.catch(() => {});
        return true;
      }
    }
    if (!('vibrate' in navigator)) return false;
    const map = { tap: 10, success: 24, warning: [16, 40, 16], celebrate: [12, 30, 12, 30, 24] };
    navigator.vibrate(map[kind] || 10);
    return true;
  } catch (e) { return false; }
}
function reducedMotion() {
  return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

const Toast = {
  show(msg, ms) {
    let host = document.getElementById('toasts');
    if (!host) { host = document.createElement('div'); host.id = 'toasts'; document.body.appendChild(host); }
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    host.appendChild(el);
    setTimeout(() => {
      el.classList.add('out');
      setTimeout(() => el.remove(), 220);
    }, ms || 1800);
  }
};

function fxHost() {
  let host = document.getElementById('fx');
  if (!host) { host = document.createElement('div'); host.id = 'fx'; document.body.appendChild(host); }
  return host;
}
function starBurst(x, y) {
  if (reducedMotion()) return;
  const host = fxHost();
  const glyphs = ['✦', '✧', '★', '✶', '·'];
  const colors = ['#2FAE8C', '#FFB443', '#7BC8B0', '#F49AC1', '#C9B8E8'];
  for (let i = 0; i < 14; i++) {
    const s = document.createElement('span');
    s.className = 'star';
    s.textContent = glyphs[i % glyphs.length];
    s.style.left = (x - 8) + 'px';
    s.style.top = (y - 8) + 'px';
    s.style.color = colors[i % colors.length];
    s.style.setProperty('--dx', (Math.random() * 220 - 110) + 'px');
    s.style.setProperty('--dy', (Math.random() * -150 - 30) + 'px');
    s.style.setProperty('--rot', (Math.random() * 300 - 150) + 'deg');
    s.style.animationDelay = (Math.random() * 120) + 'ms';
    host.appendChild(s);
    setTimeout(() => s.remove(), 1000);
  }
}
function floatText(text, x, y, color) {
  const host = fxHost();
  const el = document.createElement('span');
  el.className = 'floaty';
  el.textContent = text;
  el.style.left = (x - 14) + 'px';
  el.style.top = (y - 10) + 'px';
  if (color) el.style.color = color;
  host.appendChild(el);
  setTimeout(() => el.remove(), 760);
}
function pulseAt(x, y) {
  if (reducedMotion()) return;
  const host = fxHost();
  const el = document.createElement('span');
  el.className = 'pulse-ring';
  el.style.left = (x - 24) + 'px';
  el.style.top = (y - 24) + 'px';
  el.style.width = '48px'; el.style.height = '48px';
  host.appendChild(el);
  setTimeout(() => el.remove(), 520);
}

/* 底部抽屉 */
let sheetStack = [];
function openSheet(opts) {
  const scrim = document.createElement('div');
  scrim.className = 'scrim';
  scrim.dataset.sheetScrim = '1';
  const sheet = document.createElement('div');
  sheet.className = 'sheet';
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-modal', 'true');
  sheet.innerHTML = `
    <div class="sheet-head">
      <span class="grab"></span>
      <div class="sheet-title">${esc(opts.title || '')}</div>
      <button class="sheet-close" data-act="closeSheet" aria-label="关闭">${icon('close', 18)}</button>
    </div>
    <div class="sheet-body">${opts.body || ''}</div>
    ${opts.foot ? `<div class="sheet-foot">${opts.foot}</div>` : ''}`;
  document.body.appendChild(scrim);
  document.body.appendChild(sheet);
  document.body.style.overflow = 'hidden';
  sheetStack.push({ scrim, sheet, onClose: opts.onClose });
  if (opts.onMount) opts.onMount(sheet);
  return sheet;
}
function closeSheet(deep) {
  const item = sheetStack.pop();
  if (!item) return;
  item.scrim.remove();
  item.sheet.remove();
  if (item.onClose) item.onClose();
  if (!sheetStack.length) document.body.style.overflow = '';
  if (deep) { while (sheetStack.length) closeSheet(); }
}
function closeAllSheets() {
  while (sheetStack.length) {
    const it = sheetStack.pop();
    it.scrim.remove(); it.sheet.remove();
  }
  document.body.style.overflow = '';
}
function refreshSheet(scroller, keepScroll) {
  const top = sheetStack[sheetStack.length - 1];
  if (!top) return;
  const body = scroller || top.sheet.querySelector('.sheet-body');
  const scroll = body.scrollTop;
  if (scroller) { body.innerHTML = scroller(); }
  if (keepScroll) body.scrollTop = scroll;
}

/* 表单小件 */
function inputField(label, attrs, hint) {
  return `<div class="field"><label>${esc(label)}</label><input class="input" ${attrs}>${hint ? `<p class="hint">${hint}</p>` : ''}</div>`;
}
function selectField(label, attrs, options) {
  return `<div class="field"><label>${esc(label)}</label><select class="select" ${attrs}>${options}</select></div>`;
}
function optionList(items, selectedId, act) {
  return `<div class="opt-list">${items.map(it => `
    <button class="opt ${it.id === selectedId ? 'on' : ''}" data-act="${act}" data-id="${it.id}">
      <span class="oi" style="background:${it.color ? hexA(it.color, .14) : '#FFF3E4'};color:${it.color || '#7A736B'}">${it.iconHTML || icon('box', 18)}</span>
      <span class="ot"><span class="a">${esc(it.name)}</span><span class="b">${it.sub || ''}</span></span>
      ${it.id === selectedId ? icon('check', 18) : ''}
    </button>`).join('')}</div>`;
}
function hexA(hex, a) {
  const h = (hex || '#C9B8E8').replace('#', '');
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const r = parseInt(full.slice(0, 2), 16), g = parseInt(full.slice(2, 4), 16), b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

/* 数量滚动 */
function countUp(el, to, ms, prefix) {
  if (!el) return;
  const from = 0;
  const dur = reducedMotion() ? 1 : (ms || 600);
  const t0 = performance.now();
  const fmt = v => (prefix || '') + fmtMoney(v);
  function tick(t) {
    const p = Math.min(1, (t - t0) / dur);
    const e = 1 - Math.pow(1 - p, 3);
    el.textContent = fmt(from + (to - from) * e);
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
