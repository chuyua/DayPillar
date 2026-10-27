# DayPillar · 时序品牌标志

![DayPillar 横向品牌组合](../public/brand/daypillar-lockup.svg)

## 设计

以 DayPillar 的 D 形外框包围一根立柱，柱上暖金色圆点代表初升的太阳；外框也借用传统「日」字的围合感。将「Day / 日」与「Pillar / 柱」组合，呼应时序、干支与每日历法。圆角墨绿印记延续现有网站的配色与印章感，不增加复杂星盘和装饰。

英文 DAYPILLAR 字标以原创几何路径绘制。所有 SVG 均为矢量图形，无字体依赖、嵌入位图、外链、脚本或动画，背景透明（主标志自身含墨绿底板）。中文品牌仍为「时序」。

## 文件

| 文件 | 用途 |
| --- | --- |
| [`daypillar-logo.svg`](../public/brand/daypillar-logo.svg) | 主标志，256 × 256，适合应用图标、头像与页头 |
| [`daypillar-lockup.svg`](../public/brand/daypillar-lockup.svg) | 图形与英文横向组合，600 × 192，适合浅色背景 |
| [`daypillar-mark-mono.svg`](../public/brand/daypillar-mark-mono.svg) | 墨绿单色透明版，适合浅色底与单色印刷 |
| [`daypillar-mark-reverse.svg`](../public/brand/daypillar-mark-reverse.svg) | 暖白反白透明版，适合深色背景 |

## 使用约定

- 墨绿 `#174B42`、暖白 `#FFFCF2` 延续网站品牌颜色；日光色 `#DBA97E` 呼应现有节气配色。
- 图形建议显示宽度不少于 24px；16px 可使用主标志，但细节会简化。横向组合建议不少于 240px。
- 四周保留至少图形宽度 1/8 的空白；等比缩放，不拉伸、不旋转、不添加阴影或渐变。
- 深色底使用反白版，或带墨绿底板的主标志；横向组合保留浅色背景。
- 用 `<img>` 引用时提供 `alt="时序 DayPillar"`；若旁边已有相同品牌文字，使用 `alt=""` 避免重复朗读。
- 资源置于 Vite 的 `public/brand/`，构建后保留文件名。部署于 `/DayPillar/` 子路径时，使用 `import.meta.env.BASE_URL + 'brand/daypillar-logo.svg'` 生成 URL，不写死站点根路径。

本 PR 仅提交品牌资源与用法说明，供审核采纳；未替换现有页头、favicon 或改变历法功能。
