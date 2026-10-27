# DayPillar · 传统历法日历

本项目是 `tyme4ts` 驱动的静态历法前端，与旧站 `https://tyme.pages.dev/` 并行，不会自动覆盖现网。

## 数据及授权边界

- 公农历、干支、节气、建除、黄黑道、28 宿轮值：统一由 `tyme4ts@1.5.4` 计算。
- 传统农历月日 **27 宿循环规则**：`src/data/stars.mjs` 内仅实现常见规则，**不包含**机构内部电子表格、完整导出数据、原件内容或原件指纹。
- 60 条 `GUA_YING` 对应关系：保留用户提供的原顺序及 `/n` 分隔方式，仅可检索，不臆造日期到卦象的算法。
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

本仓库目前为 Private；当前 GitHub 账户方案不支持为 Private 仓库开启 GitHub Pages。CI 仍执行全部测试并上传 `daypillar-static-site` 静态网站构建产物（保留 14 天），**不会虚报 Pages 已上线**。若以后仓库改为符合 Pages 资格的可见性，`main` 分支才启用 Pages 自动部署。PR 仅运行校验，不执行部署。

只有 Pages 真正启用后，预期地址才是：`https://chuyua.github.io/DayPillar/`。

## 功能

公历月历、农历、干支、十二建除、黄黑道、节气、公开 27 宿算法和库内 28 宿算法分列；日期跳转、闰月说明、可分享日期链接；60 条卦象名称检索。支持 1900—2100 年区间，今日以中国标准时间（UTC+8）计算。

本仓库为独立升级实现，**尚不等同于旧站全量功能迁移**。没有旧站原始 HTML 与 JS 源码时，无法承诺旧版个人化运算已逐项完成迁移。
