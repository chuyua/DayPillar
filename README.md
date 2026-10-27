# DayPillar · 传统历法日历

本项目是 `tyme4ts` 驱动的静态历法前端，与旧站 `https://tyme.pages.dev/` 并行，不会自动覆盖现网。

## 数据及授权边界

- 公农历、干支、节气、建除、黄黑道：统一由 `tyme4ts@1.5.4` 计算；不展示 Tyme 的 28 宿值日体系。
- 传统农历月日 **27 宿循环规则**：`src/data/stars.mjs` 内仅实现常见规则，**不包含**机构内部电子表格、完整导出数据、原件内容或原件指纹。
- 60 条 `GUA_YING` 对应关系：保留原顺序及 `/n` 分隔方式；按用户确认的六十甲子顺序与日干支匹配（甲子日为天风姤／天罡），在月历和详情中直接展示。
- **保密：**机构内部《二十八星宿.xlsx》不得放进公开仓库、CI 缓存、构建产物、GitHub Pages 或 Release。禁止提交 `reference/`、`src/data/xlsx-stars.json`、生成原件脚本及传输文件。
- 内部电子表格可在受控环境中单独核验，但公开 CI **不访问**该原件，不代表已对原件进行在线回归验证。
- 闰月暂按同名农历月的 27 宿规则处理，该口径尚需单独研究，不强行视为历法库缺陷。

## 构建与部署

不要求维护者本地构建。每次推送 `main` 后，GitHub Actions 在 Ubuntu 24.04 + Node.js 22 上自动运行：

1. `npm ci`
2. `npm test`（27 宿规则、60 条映射、Git 隐私门禁）
3. `npm run test:integration`（真实 tyme4ts 农历、闰月、干支等 API）
4. `npm run typecheck`
5. `BASE_PATH=/DayPillar/ npm run build`
6. `node --test tests/dist.smoke.test.mjs`（Pages 资源路径冒烟检查）
7. 上传 `dist/` 并用 GitHub Actions 发布 Pages

本仓库已设为 Public，并已启用 GitHub Pages 的 **GitHub Actions** 部署方式。每次推送 `main` 都自动执行完整测试、打包及 Pages 发布；PR 仅验证，不部署。同时上传 `daypillar-static-site` 静态构建产物（保留 14 天）。

**线上地址：** https://chuyua.github.io/DayPillar/ （2026-10-27 首次发布成功，并已核对主页及 JS/CSS 返回 HTTP 200）。

## 功能

公历月历、农历、干支、十二建除、黄黑道、节气、公开 27 宿算法；不再展示 Tyme 28 宿；六十甲子卦象直接融入每个日历格（卦名及对应名称）及右侧选中日期详情（如甲子日：天风姤 · 天罡），不另外展示映射列表或独立页面；支持日期跳转、闰月说明、可分享日期链接。支持 1900—2100 年区间，今日以中国标准时间（UTC+8）计算。

交互：同月点击日期只更新选中状态与详情，不重建网格；同月日期计算仅保留一份缓存。日期格支持方向键、PageUp/PageDown（按住 Shift 按年）、T 返回今日。移动端选日打开可关闭的底部详情面板。日历支持简洁/详细模式，**两种模式均保留卦名与对应名称**，简洁模式仅隐藏建除及 27 宿的格内次要标注（详情仍保留）。依赖锁文件使用官方 npm registry，构建和发布在 GitHub Actions 执行。

本仓库为独立升级实现，**尚不等同于旧站全量功能迁移**。没有旧站原始 HTML 与 JS 源码时，无法承诺旧版个人化运算已逐项完成迁移。
