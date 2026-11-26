# V1.1 图标生成需求清单

> 交给外部生图工具使用。生成后放回 `cat-ledger-assets/generated/`，我统一处理去背、压缩、接入。
> 主题基准：与 `cat-ledger-assets/` 现有素材同风格 —— 玻璃猫 + 钱包/账本 + 薄荷绿/奶油/淡紫/冰蓝/暖橙，Apple Liquid Glass 质感。

---

## 一、通用提示词前缀（每次生成都带上）

**正向**（贴在提示词最前）：
```
standalone transparent icon object, no background tile, no rounded square background,
liquid glass / frosted translucent glass texture, soft specular highlight on top edge,
subtle rim light, macaron pastel palette (mint green #2FAE8C, cream #FFF9F0, lilac, ice blue, warm orange),
cute kawaii style, centered composition, generous empty margin around the subject,
clean soft shadow, 3d glossy glass, high detail, 1024x1024
```

**负向**（必填）：
```
text, letters, words, numbers, watermark, logo, app icon tile, rounded square background,
square container, badge, border, frame, UI card, phone mockup, complex background, cluttered,
multiple objects overlapping, realistic fur, realistic eyes, busy details, low contrast,
blurry, cropped, tiny details, gradient background
```

**关键要求**：**必须导出透明背景 PNG（RGBA）**。现有素材全是白底，白底图在卡片上会出现白方块，我这边虽然能批处理去背，但透明版质量更好。

---

## 二、需要生成的图标（按优先级）

### P0 · 底部 Tab 图标（4 个，最关键，首屏第一印象）

| 文件命名 | 对应 Tab | 画面描述 | 主色 |
|---|---|---|---|
| `tab-gallery.png` | 画廊 | 一只圆润的玻璃猫头正面像（含耳朵），或「相册/照片」叠加猫耳 | 薄荷绿 |
| `tab-pantry.png` | 看板 | 半透明玻璃补给箱 + 一片叶子/爪印，体现「储物」 | 薄荷绿 + 冰蓝 |
| `tab-insights.png` | 洞察 | 玻璃质感的迷你柱状图/饼图，顶部叠一枚爱心硬币 | 暖橙 + 奶油 |
| `tab-me.png` | 我的 | 玻璃猫爪按在一枚圆形头像牌上，或简化的猫耳人像 | 淡紫 |

> 尺寸建议 1024×1024（我缩到 24–28pt @3x）。**这 4 个也可以用线描 SVG 保持清晰**——如果你更想统一玻璃感就生成 PNG。

### P0 · 品类图标（5 个，看板/报表高频出现）

| 文件命名 | 品类 | 画面描述 |
|---|---|---|
| `cat-food.png` | 主粮 | 玻璃粮袋 + 几颗猫粮颗粒散落，袋口有猫爪压印 |
| `cat-litter.png` | 猫砂 | 玻璃猫砂盆 + 一柄小铲，边缘有细沙质感 |
| `cat-med.png` | 医疗 | 玻璃药瓶 + 一粒胶囊 + 小十字（不要文字） |
| `cat-toy.png` | 玩具 | 玻璃逗猫球/毛线球 + 一根羽毛 |
| `cat-other.png` | 其他 | 玻璃礼盒 + 缎带 + 猫爪印 |

### P1 · 位置图标（6 个，补给看板「放在哪」用）

| 文件命名 | 位置 | 画面描述 |
|---|---|---|
| `loc-kitchen.png` | 厨房柜 | 玻璃橱柜（双开门）+ 一只碗 |
| `loc-balcony.png` | 阳台 | 玻璃花盆 + 两片叶子 + 一点阳光 |
| `loc-fridge.png` | 冰箱 | 玻璃双门冰箱 + 一片雪花 |
| `loc-bath.png` | 卫生间 | 玻璃水滴 + 小瓷砖/洗手池一角 |
| `loc-store.png` | 储物间 | 玻璃收纳箱叠放 + 标签挂绳 |
| `loc-bedroom.png` | 卧室 | 玻璃月牙 + 一颗小星星 + 软枕角 |

> ✅ 2026-11-26 已完成：6 张 1024 RGBA 透明原图在 `assets/item-icon/`，经 `scripts/prepare-icons.py` 缩到 96px 落 `assets/icons-web/`，由 `locIcon()` 图片优先、线描 SVG 回退。

### P1 · 空状态插画（3 个）

| 文件命名 | 场景 | 画面描述 |
|---|---|---|
| `empty-pets.png` | 还没有宠物 | 空旷的玻璃相框，一只小猫探头进来，周围漂浮爱心，大量留白 |
| `empty-pantry.png` | 还没有库存 | 空的玻璃储物箱，里面飘两片叶子/气泡，柔和留白 |
| `empty-insights.png` | 还没有数据 | 空白的玻璃图表框架（柱状/折线轮廓），一只小猫坐在旁边看，留白多 |

> ✅ 2026-11-26 已完成：3 张 360px 透明 PNG 落 `assets/icons-web/`，由 `emptyArt()` 接入「无宠物 / 无库存 / 无数据」，缺失时回退线描 SVG；洞察页「本月还没有支出」已挂 `empty-insights`。
>
> `illust-empty-bill.png` / `illust-empty-stat.png` 已有，可复用于「无账单」「无统计」；上面 3 个补齐「无宠物/无库存/无数据」。

### P2 · 宠物品种头像（可选，11 个）

现有是手绘 SVG（`cat-orange`/`cat-white`/`cat-tabby`/`cat-cow`/`cat-ragdoll`/`dog-corgi`/`dog-shiba`/`dog-golden`/`dog-teddy`/`rabbit`/`hamster`）。如果要换成玻璃质感：

| 文件命名 | 品种 |
|---|---|
| `pet-cat-orange.png` | 橘猫 |
| `pet-cat-white.png` | 白猫 |
| `pet-cat-tabby.png` | 狸花 |
| `pet-cat-cow.png` | 奶牛猫 |
| `pet-cat-ragdoll.png` | 布偶 |
| `pet-dog-corgi.png` | 柯基 |
| `pet-dog-shiba.png` | 柴犬 |
| `pet-dog-golden.png` | 金毛 |
| `pet-dog-teddy.png` | 泰迪 |
| `pet-rabbit.png` | 兔 |
| `pet-hamster.png` | 仓鼠 |

> **建议**：这一组**暂时保留现有 SVG**（矢量清晰、可换色），等 P0/P1 做完看整体协调度再决定要不要换。头像在卡片上只有 44–76px，PNG 优势不大。

---

## 三、现有素材已有、无需重生成

| 文件 | 用途 |
|---|---|
| `icon-add-record.png` | 记一笔 FAB |
| `icon-statistics.png` | 洞察页 |
| `icon-bill-list.png` | 账单列表（如需） |
| `illust-empty-bill.png` | 无账单空状态 |
| `illust-empty-stat.png` | 无统计空状态 |
| `deco-success-save.png` | 记账成功反馈 |
| `banner-hero-home.png` 等 3 张 | 首页 Hero（可选） |
| `AppIcon-1024-cream.png` | App 图标（已定稿） |

---

## 四、我这边需要你确认 / 提供的东西

1. **透明背景**：生成时务必导出 RGBA 透明 PNG；如果工具只能出白底，告诉我，我写脚本批处理去背（效果略差于原生透明）。
2. **导出尺寸**：统一 1024×1024 即可，我负责缩放到 @1x/@2x/@3x。
3. **优先级**：**先只做 P0（4 个 tab + 5 个品类，共 9 张）**，给我一轮看整体协调度；P1/P2 等确认后再做。
4. **是否保留 SVG 回退**：我计划「小图标用 SVG，大插画用 PNG」。如果你希望全站统一玻璃 PNG，告诉我，我会把 tab/品类也全换成 PNG（代价是低端设备略糊）。
5. **`icon-budget.png` 暂不用**——预算功能在 V2，先不接入。
