import {test,expect} from '@playwright/test';

async function openCalendar(page) {
  const errors=[];
  page.on('pageerror',error => errors.push(error.message));
  await page.goto('/DayPillar/?date=2026-10-17');
  await expect(page.locator('#calendar-grid [data-date]').first()).toBeVisible();
  expect(errors).toEqual([]);
}

test('首页按六十甲子显示卦象和传统宜忌，无旧 Tyme 28 宿 UI',async ({page}) => {
  await openCalendar(page);
  await expect(page.locator('#calendar-grid [data-date="2026-10-17"]')).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('#calendar-grid [data-date="2026-10-17"] .day-gua')).toContainText('天风姤');
  await expect(page.locator('#calendar-grid [data-date="2026-10-17"] .day-gua')).toContainText('天罡');
  await expect(page.locator('#date-detail .gua-highlight')).toContainText('天罡');
  await expect(page.locator('#date-detail .hexagram-figure')).toHaveCount(1);
  await expect(page.locator('#date-detail .taboo-group')).toHaveCount(2);
  await expect(page.locator('#date-detail')).not.toContainText('Tyme 值日体系');
  await expect(page.locator('#calendar-grid [data-date]')).toHaveCount(35);
});

test('通行卦名在日历、详情和查询中同步生效，对应名称保持不变',async ({page}) => {
  for (const [iso,gua,ying,oldName] of [
    ['2026-11-21','火雷噬嗑','甪端','火雷噬磕'],
    ['2026-12-10','山天大畜','九婴','山天大蓄']
  ]) {
    await page.goto(`/DayPillar/?date=${iso}`);
    const selected = page.locator(`#calendar-grid [data-date="${iso}"]`);
    await expect(selected).toHaveAttribute('aria-pressed','true');
    await expect(selected.locator('.day-gua')).toContainText(gua);
    await expect(selected.locator('.day-gua')).toContainText(ying);
    await expect(page.locator('#date-detail .gua-highlight')).toContainText(gua);
    await expect(page.locator('#date-detail .gua-highlight')).toContainText(ying);
    await expect(page.locator('#date-detail .hexagram-figure')).toBeVisible();
    await expect(selected.locator('.day-gua')).not.toContainText(oldName);
    await page.locator('#day-filter').fill(gua);
    await expect(selected).toHaveClass(/is-matched/);
    await expect(page.locator('#error-toast')).toBeHidden();
  }
});

test('卦象短义及异兽和神煞介绍独立切换，狍鸮详情精确匹配目录链接',async ({page}) => {
  await page.goto('/DayPillar/?date=2026-10-28');
  const guaTab = page.getByRole('tab',{name:'卦象映射'});
  const beastTab = page.getByRole('tab',{name:'异兽和神煞介绍'});
  await expect(guaTab).toHaveAttribute('aria-selected','true');
  await expect(beastTab).toHaveAttribute('aria-selected','false');
  await expect(page.locator('#culture-panel-hexagram .hexagram-figure')).toBeVisible();
  await expect(page.locator('#culture-panel-hexagram .gua-info strong')).toHaveText('风水涣');
  await expect(page.locator('#culture-panel-hexagram .gua-info p')).not.toBeEmpty();
  await expect(page.locator('#culture-panel-beast')).toBeHidden();

  await beastTab.click();
  await expect(beastTab).toHaveAttribute('aria-selected','true');
  await expect(page.locator('#culture-panel-hexagram')).toBeHidden();
  await expect(page.locator('#culture-panel-beast .beast-card strong')).toHaveText('狍鸮');
  await expect(page.locator('#culture-panel-beast .culture-kind')).toHaveText('异兽 / 神兽');
  await expect(page.locator('#culture-panel-beast .beast-card p')).toContainText('羊身人面');
  await expect(page.locator('#source-disclosure .culture-source').last()).toHaveAttribute('href','https://tgqmdj.cn/dadian_show.php?did=8&sid=54');
  await expect(page.locator('#source-disclosure .culture-disclaimer')).toContainText('不表示当日');

  await page.locator('#calendar-grid [data-date="2026-10-17"]').click();
  await expect(page.locator('#culture-panel-beast .beast-card strong')).toHaveText('天罡');
  await expect(page.locator('#culture-panel-beast .culture-kind')).toHaveText('神煞与术数');
  await expect(page.locator('#source-disclosure .culture-source').last()).toHaveAttribute('href','https://tgqmdj.cn/dadian_show.php?did=6&sid=13');
  await expect(beastTab).toHaveAttribute('aria-selected','true');
  await guaTab.focus();
  await page.keyboard.press('ArrowRight');
  await expect(beastTab).toBeFocused();
  await page.keyboard.press('Home');
  await expect(guaTab).toBeFocused();
  await expect(page.locator('#culture-panel-hexagram .gua-info strong')).toHaveText('天风姤');
  await expect(page.locator('#culture-panel-hexagram .gua-info')).toContainText('天罡');
  await expect(page.locator('#error-toast')).toBeHidden();
});

test('异兽和神煞介绍在移动抽屉内可通过键盘访问来源、正常关闭',async ({page}) => {
  await page.setViewportSize({width:390,height:844});
  await page.goto('/DayPillar/?date=2026-11-21');
  await page.locator('#calendar-grid [data-date="2026-11-21"]').click();
  await expect(page.locator('#detail-close')).toBeFocused();
  const beastTab = page.getByRole('tab',{name:'异兽和神煞介绍'});
  await beastTab.click();
  await expect(page.locator('#culture-panel-beast .beast-card strong')).toHaveText('甪端');
  await expect(page.locator('#source-disclosure .culture-source').last()).toHaveAttribute('href','https://tgqmdj.cn/dadian_show.php?did=7&sid=30');
  await beastTab.focus();
  await page.keyboard.press('Tab');
  await expect(page.locator('#star-disclosure summary')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('#source-disclosure summary')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('#detail-close')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('#detail-panel')).not.toHaveClass(/is-open/);
});

test('九星与空亡词条保留原映射名称，提供独立分类和精确来源',async ({page}) => {
  for (const [date,name,category,link] of [
    ['2026-10-25','天蓬','奇门九星','did=6&sid=24'],
    ['2026-11-16','亡','空亡术语','did=5&sid=264'],
    ['2026-12-15','空','空亡术语','did=5&sid=264']
  ]) {
    await page.goto(`/DayPillar/?date=${date}`);
    await page.getByRole('tab',{name:'异兽和神煞介绍'}).click();
    await expect(page.locator('#culture-panel-beast .beast-card strong')).toHaveText(name);
    await expect(page.locator('#culture-panel-beast .culture-kind')).toHaveText(category);
    await expect(page.locator('#source-disclosure .culture-source').last()).toHaveAttribute('href',`https://tgqmdj.cn/dadian_show.php?${link}`);
    await expect(page.locator('#culture-panel-beast .beast-card p')).not.toBeEmpty();
    await expect(page.locator('#error-toast')).toBeHidden();
  }
});

test('唐代月将与月厌、厌对、金匮独立历注，节气前后结果可复核',async ({page}) => {
  await page.goto('/DayPillar/?date=2026-02-11');
  await page.locator('#ancient-disclosure summary').click();
  const panel=page.locator('.ancient-almanac');
  await expect(panel).toBeVisible();
  await expect(panel.locator('.ancient-item').filter({hasText:'阳建 · 月建'})).toContainText('寅建 · 1月');
  await expect(panel.locator('.ancient-item').filter({hasText:'阴建 · 月厌'})).toContainText('戌');
  await expect(panel.locator('.ancient-item').filter({hasText:'月厌对冲 · 厌对'})).toContainText('辰 · 今日值厌对');
  await expect(panel.locator('.ancient-item').filter({hasText:'十二黄黑道'})).toContainText('金匮 · 黄道');
  await expect(panel.locator('.ancient-item').filter({hasText:'月内天罡／河魁'})).toContainText('罡巳 · 魁亥');
  await expect(panel.locator('.ancient-item').filter({hasText:'十二月将'})).toContainText('神后 · 子');
  await expect(page.locator('.ancient-intersection')).toContainText('同时出现');
  await expect(page.locator('.ancient-sources a')).toHaveCount(6);

  await page.goto('/DayPillar/?date=2026-02-18');
  await page.locator('#ancient-disclosure summary').click();
  await expect(page.locator('.ancient-item').filter({hasText:'阳建 · 月建'})).toContainText('寅建');
  await expect(page.locator('.ancient-item').filter({hasText:'十二月将'})).toContainText('登明 · 亥');

  await page.goto('/DayPillar/?date=2026-02-23');
  await page.locator('#ancient-disclosure summary').click();
  await expect(page.locator('.ancient-item').filter({hasText:'月厌对冲 · 厌对'})).toContainText('今日值厌对');
  await expect(page.locator('.ancient-item').filter({hasText:'十二黄黑道'})).toContainText('金匮 · 黄道');
  await expect(page.locator('.ancient-item').filter({hasText:'十二月将'})).toContainText('登明 · 亥');
  await expect(page.locator('.ancient-intersection')).toBeVisible();
});

test('月内天罡／河魁与同名的固定六十甲子对应资料不混用',async ({page}) => {
  await page.goto('/DayPillar/?date=2026-02-12');
  await page.locator('#ancient-disclosure summary').click();
  const k=page.locator('.ancient-item').filter({hasText:'月内天罡／河魁'});
  await expect(k).toContainText('罡巳 · 魁亥');
  await expect(k).toContainText('今日值月内天罡');
  await expect(page.locator('.ancient-item').filter({hasText:'十二月将'})).toContainText('神后 · 子');
  await expect(page.locator('#culture-panel-hexagram .gua-info')).toBeVisible();
  await expect(page.locator('#error-toast')).toBeHidden();
});

test('320px 手机仍可读古法历注及来源，选日无横向溢出',async ({page}) => {
  await page.setViewportSize({width:320,height:720});
  await page.goto('/DayPillar/?date=2026-02-11');
  await page.locator('#calendar-grid [data-date="2026-02-11"]').click();
  await expect(page.locator('#detail-panel')).toHaveClass(/is-open/);
  await page.locator('#ancient-disclosure summary').click();
  await page.locator('#source-disclosure summary').click();
  await expect(page.locator('.ancient-almanac')).toBeVisible();
  await expect(page.locator('.ancient-sources a').first()).toHaveAttribute('rel','noopener noreferrer');
  const bounds=await page.evaluate(()=>({
    outer:document.documentElement.scrollWidth,
    inner:document.documentElement.clientWidth,
    aside:document.querySelector('.detail-panel').scrollWidth,
    asideClient:document.querySelector('.detail-panel').clientWidth
  }));
  expect(bounds.outer).toBeLessThanOrEqual(bounds.inner+1);
  expect(bounds.aside).toBeLessThanOrEqual(bounds.asideClient+1);
  await page.keyboard.press('Escape');
  await expect(page.locator('#detail-panel')).not.toHaveClass(/is-open/);
});

test('PR #2 品牌 Logo 在页面顶栏和 favicon 正确加载',async ({page}) => {
  await openCalendar(page);
  const logo=page.locator('a.brand img.brand-logo');
  await expect(logo).toBeVisible();
  await expect(logo).toHaveAttribute('alt','');
  await expect(logo).toHaveAttribute('src','/DayPillar/brand/daypillar-logo.svg');
  expect(await logo.evaluate(el => el.complete && el.naturalWidth > 0)).toBe(true);
  await expect(page.locator('a.brand strong')).toHaveText('时序');
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href','/DayPillar/brand/daypillar-logo.svg');
});

test('同月切换不破坏按钮节点和键盘焦点，搜索只高亮',async ({page}) => {
  await openCalendar(page);
  const original=await page.locator('#calendar-grid [data-date="2026-10-17"]').elementHandle();
  const next=page.locator('#calendar-grid [data-date="2026-10-18"]');
  await next.click();
  expect(await original.evaluate(el => el.isConnected)).toBe(true);
  await expect(next).toBeFocused();
  await page.keyboard.press('ArrowRight');
  const third=page.locator('#calendar-grid [data-date="2026-10-19"]');
  await expect(third).toBeFocused();
  await expect(third).toHaveAttribute('aria-pressed','true');
  await page.locator('#day-filter').fill('天罡');
  await expect(page.locator('#filter-result')).toContainText('本月匹配 1 / 31 天');
  await expect(page.locator('#calendar-grid [data-date="2026-10-17"]')).toHaveClass(/is-matched/);
  await expect(third).toHaveClass(/is-dimmed/);
  await page.locator('#mode-button').click();
  await expect(page.locator('#calendar-grid')).toHaveClass(/is-compact/);
  await expect(page.locator('#calendar-grid [data-date="2026-10-17"] .day-gua')).toBeVisible();
});

test('本月查询不误高亮相邻月补齐格，来回翻月仍保留卦象',async ({page}) => {
  await openCalendar(page);
  await page.locator('#day-filter').fill('2026-09');
  await expect(page.locator('#filter-result')).toContainText('本月匹配 0 / 31 天');
  await expect(page.locator('#calendar-grid .is-matched')).toHaveCount(0);
  await page.locator('#day-filter').fill('天罡');
  await expect(page.locator('#filter-result')).toContainText('本月匹配 1 / 31 天');
  await page.locator('[aria-label="下个月"]').click();
  await page.locator('[aria-label="上个月"]').click();
  await expect(page.locator('#calendar-grid [data-date="2026-10-17"] .day-gua')).toContainText('天罡');
  await expect(page.locator('#filter-result')).toContainText('本月匹配 1 / 31 天');
  await expect(page.locator('#error-toast')).toBeHidden();
});

test('跳转年份边界、不刷新即可切换月份',async ({page}) => {
  await openCalendar(page);
  await page.locator('#year-jump').selectOption('1900');
  await page.locator('#month-jump').selectOption('1');
  await expect(page.locator('#month-label')).toContainText('1900 年');
  await expect(page.locator('#month-label')).toContainText('01 月');
  await expect(page.locator('#calendar-grid [data-date="1900-01-17"]')).toHaveCount(1);
  await page.locator('#year-jump').selectOption('2100');
  await page.locator('#month-jump').selectOption('12');
  await expect(page.locator('#month-label')).toContainText('2100 年');
  await expect(page.locator('#month-label')).toContainText('12 月');
  await expect(page.locator('#calendar-grid [data-date="2100-12-17"]')).toHaveCount(1);
  await expect(page.locator('#error-toast')).toBeHidden();
});

test('1900 / 2100 边界补齐日期不可选择，越界键盘不触发错误',async ({page}) => {
  await page.goto('/DayPillar/?date=1900-01-01');
  const first=page.locator('#calendar-grid [data-date="1900-01-01"]');
  await expect(first).toHaveAttribute('aria-pressed','true');
  const older=page.locator('#calendar-grid [data-date^="1899-"]');
  expect(await older.count()).toBeGreaterThan(0);
  for (const cell of await older.all()) await expect(cell).toBeDisabled();
  await first.focus();
  await page.keyboard.press('ArrowLeft');
  await expect(first).toBeFocused();
  await page.keyboard.press('PageUp');
  await expect(first).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('#error-toast')).toBeHidden();

  await page.goto('/DayPillar/?date=2100-12-31');
  const last=page.locator('#calendar-grid [data-date="2100-12-31"]');
  await expect(last).toHaveAttribute('aria-pressed','true');
  const newer=page.locator('#calendar-grid [data-date^="2101-"]');
  expect(await newer.count()).toBeGreaterThan(0);
  for (const cell of await newer.all()) await expect(cell).toBeDisabled();
  await last.focus();
  await page.keyboard.press('ArrowRight');
  await expect(last).toBeFocused();
  await page.keyboard.press('PageDown');
  await expect(last).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('#error-toast')).toBeHidden();
});

test('跨中国午夜后标签页恢复与今日按钮使用最新日期',async ({page}) => {
  await page.clock.install({time:new Date('2026-10-27T15:50:00.000Z')});
  await page.goto('/DayPillar/?date=2026-10-27');
  await expect(page.locator('#calendar-grid [data-date="2026-10-27"]')).toHaveClass(/is-today/);
  await expect(page.locator('#calendar-grid [data-date="2026-10-27"]')).toHaveAttribute('aria-current','date');
  await page.clock.fastForward(20*60*1000);
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await expect(page.locator('#calendar-grid [data-date="2026-10-28"]')).toHaveClass(/is-today/);
  await expect(page.locator('#calendar-grid [data-date="2026-10-28"]')).toHaveAttribute('aria-current','date');
  await expect(page.locator('#calendar-grid [data-date="2026-10-27"]')).not.toHaveClass(/is-today/);
  await expect(page.locator('#calendar-grid [data-date="2026-10-27"]')).not.toHaveAttribute('aria-current','date');
  await page.locator('#today-button').click();
  await expect(page.locator('#calendar-grid [data-date="2026-10-28"]')).toHaveAttribute('aria-pressed','true');
});

test('Issue #5 跨月查询与历史记录同步，Enter 和 Shift+Enter 双向跳转',async ({page}) => {
  await page.goto('/DayPillar/?date=2026-10-17');
  await page.locator('#day-filter').fill('天罡');
  await page.getByRole('button',{name:'下一个匹配日期'}).click();
  await expect(page.locator('#calendar-grid [data-date="2026-12-16"]')).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('#calendar-grid [data-date="2026-12-16"]')).toBeFocused();
  await expect(page).toHaveURL(/date=2026-12-16/);
  await page.locator('#day-filter').focus();
  await page.keyboard.press('Shift+Enter');
  await expect(page.locator('#calendar-grid [data-date="2026-10-17"]')).toHaveAttribute('aria-pressed','true');
  await page.goBack();
  await expect(page.locator('#calendar-grid [data-date="2026-12-16"]')).toHaveAttribute('aria-pressed','true');
  await page.goForward();
  await expect(page.locator('#calendar-grid [data-date="2026-10-17"]')).toHaveAttribute('aria-pressed','true');
});

test('复合查询甲子 天罡在同一日命中，并能继续跨月定位',async ({page}) => {
  await page.goto('/DayPillar/?date=2026-10-16');
  await page.locator('#day-filter').fill('甲子 天罡');
  await expect(page.locator('#calendar-grid [data-date="2026-10-17"]')).toHaveClass(/is-matched/);
  await expect(page.locator('#filter-result')).toContainText('本月匹配 1 / 31 天');
  await page.getByRole('button',{name:'下一个匹配日期'}).click();
  await expect(page.locator('#calendar-grid [data-date="2026-10-17"]')).toHaveAttribute('aria-pressed','true');
  await page.getByRole('button',{name:'下一个匹配日期'}).click();
  await expect(page.locator('#calendar-grid [data-date="2026-12-16"]')).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('#error-toast')).toBeHidden();
});

test('Issue #5 查询越过 2100 年上限能即时提示而非崩溃',async ({page}) => {
  await page.goto('/DayPillar/?date=2100-12-31');
  await page.locator('#day-filter').fill('天罡');
  await page.getByRole('button',{name:'下一个匹配日期'}).click();
  await expect(page.locator('#filter-result')).toContainText('查询边界');
  await expect(page.locator('#calendar-grid [data-date="2100-12-31"]')).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('#error-toast')).toBeHidden();
});

test('Issues #4 #6 详情折叠、来源可查且日期切换保留展开状态',async ({page}) => {
  await page.goto('/DayPillar/?date=2026-10-17');
  await expect(page.locator('#ancient-disclosure')).not.toHaveAttribute('open','');
  await expect(page.locator('#star-disclosure')).not.toHaveAttribute('open','');
  await expect(page.locator('#source-disclosure')).not.toHaveAttribute('open','');
  await expect(page.locator('.hexagram-figure')).toHaveAttribute('aria-label','天风姤六爻卦象图');
  await expect(page.locator('#date-detail .taboo-group')).toHaveCount(2);
  await page.locator('#ancient-disclosure summary').click();
  await page.locator('#source-disclosure summary').click();
  await page.locator('#calendar-grid [data-date="2026-10-18"]').click();
  await expect(page.locator('#ancient-disclosure')).toHaveAttribute('open','');
  await expect(page.locator('#source-disclosure')).toHaveAttribute('open','');
  await expect(page.locator('.ancient-almanac')).toBeVisible();
  await expect(page.locator('#source-disclosure .ancient-sources a')).toHaveCount(6);
});

test('Issue #7 手动偏好刷新不丢失，自动偏好随窗口响应',async ({page}) => {
  await page.setViewportSize({width:390,height:800});
  await page.goto('/DayPillar/?date=2026-10-17');
  await expect(page.locator('#calendar-grid')).toHaveClass(/is-compact/);
  await page.setViewportSize({width:1060,height:800});
  await expect(page.locator('#calendar-grid')).not.toHaveClass(/is-compact/);
  await page.locator('#mode-button').click();
  await expect(page.locator('#calendar-grid')).toHaveClass(/is-compact/);
  await page.reload();
  await expect(page.locator('#calendar-grid')).toHaveClass(/is-compact/);
  await expect(page.locator('#mode-button')).toHaveAttribute('aria-pressed','true');
  await page.setViewportSize({width:390,height:800});
  await page.setViewportSize({width:1060,height:800});
  await expect(page.locator('#calendar-grid')).toHaveClass(/is-compact/);
});

test('深色配色与浏览器 theme-color 同步',async ({page}) => {
  await openCalendar(page);
  await page.emulateMedia({colorScheme:'dark'});
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content','#152624');
  const color=await page.locator('body').evaluate(el => getComputedStyle(el).backgroundColor);
  expect(color).toBe('rgb(16, 28, 25)');
  await page.emulateMedia({colorScheme:'light'});
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content','#f7f7f2');
});

test('减少动态效果时重复开关移动抽屉，焦点恢复正常',async ({page}) => {
  await page.setViewportSize({width:390,height:844});
  await page.emulateMedia({reducedMotion:'reduce'});
  await openCalendar(page);
  const cell=page.locator('#calendar-grid [data-date="2026-10-18"]');
  for(let i=0;i<5;i++) {
    await cell.click();
    await expect(page.locator('#detail-close')).toBeFocused();
    await page.locator('#detail-close').click();
    await expect(page.locator('#detail-panel')).not.toHaveClass(/is-open/);
    await expect(cell).toBeFocused();
  }
});

test.describe('移动端日期交互',() => {
  test.use({viewport:{width:390,height:844},isMobile:true,hasTouch:true});

  test('选中日期显示抽屉，Esc 关闭后焦点返回日期，水平划动换月',async ({page}) => {
    await openCalendar(page);
    const button=page.locator('#calendar-grid [data-date="2026-10-18"]');
    await button.click();
    await expect(page.locator('#detail-panel')).toHaveClass(/is-open/);
    await expect(page.locator('#detail-close')).toBeVisible();
    await expect(page.locator('#detail-close')).toBeFocused();
    await expect(page.locator('#date-detail .taboo-group')).toHaveCount(2);
    await page.keyboard.press('Escape');
    await expect(page.locator('#detail-panel')).not.toHaveClass(/is-open/);
    await expect(button).toBeFocused();

    await button.click();
    await expect(page.locator('#detail-panel')).toHaveClass(/is-open/);
    await page.locator('#drawer-handle').evaluate(handle => {
      const touch=y => new Touch({identifier:2,target:handle,clientX:190,clientY:y});
      handle.dispatchEvent(new TouchEvent('touchstart',{bubbles:true,touches:[touch(300)],changedTouches:[touch(300)]}));
      handle.dispatchEvent(new TouchEvent('touchend',{bubbles:true,cancelable:true,touches:[],changedTouches:[touch(395)]}));
    });
    await expect(page.locator('#detail-panel')).not.toHaveClass(/is-open/);
    await expect(button).toBeFocused();

    await page.locator('#calendar-grid').evaluate(grid => {
      const touch=(x,y) => new Touch({identifier:1,target:grid,clientX:x,clientY:y});
      grid.dispatchEvent(new TouchEvent('touchstart',{bubbles:true,touches:[touch(350,400)],changedTouches:[touch(350,400)]}));
      grid.dispatchEvent(new TouchEvent('touchend',{bubbles:true,cancelable:true,touches:[],changedTouches:[touch(80,403)]}));
    });
    await expect(page.locator('#month-label')).toContainText('11 月');
    await page.locator('#calendar-grid').evaluate(grid => {
      const touch=(x,y) => new Touch({identifier:3,target:grid,clientX:x,clientY:y});
      grid.dispatchEvent(new TouchEvent('touchstart',{bubbles:true,touches:[touch(150,350)],changedTouches:[touch(150,350)]}));
      grid.dispatchEvent(new TouchEvent('touchend',{bubbles:true,cancelable:true,touches:[],changedTouches:[touch(160,530)]}));
    });
    await expect(page.locator('#month-label')).toContainText('11 月');
    await page.locator('#calendar-grid').evaluate(grid => {
      const touch=(x,y) => new Touch({identifier:4,target:grid,clientX:x,clientY:y});
      grid.dispatchEvent(new TouchEvent('touchstart',{bubbles:true,touches:[touch(50,400)],changedTouches:[touch(50,400)]}));
      grid.dispatchEvent(new TouchEvent('touchend',{bubbles:true,cancelable:true,touches:[],changedTouches:[touch(330,401)]}));
    });
    await expect(page.locator('#month-label')).toContainText('10 月');
    await expect(page.locator('#error-toast')).toBeHidden();
  });
});

test('跨月午夜自动刷新今天语义，离开月份后不残留标记',async ({page}) => {
  await page.clock.install({time:new Date('2026-07-31T15:59:00Z')});
  await page.goto('/DayPillar/?date=2026-07-31');
  await page.clock.fastForward(61_000);
  await expect(page.locator('[aria-current="date"]')).toHaveCount(1);
  await expect(page.locator('[data-date="2026-08-01"]')).toHaveAttribute('aria-current','date');
  await expect(page.locator('[data-date="2026-07-31"]')).not.toHaveAttribute('aria-current','date');
  await page.locator('#today-button').click();
  await expect(page.locator('#month-label')).toContainText('08 月');
  await expect(page.locator('[aria-current="date"]')).toHaveCount(1);
  await page.locator('[data-change="12"]').click();
  await expect(page.locator('[aria-current="date"]')).toHaveCount(0);
});

test('搜索支持干支、通行卦名、二十七宿与节气的最近匹配',async ({page}) => {
  for(const [keyword,origin,next] of [
    ['甲子','2026-10-17','2026-12-16'],
    ['火雷噬嗑','2026-11-21','2027-01-20'],
    ['雨水','2026-02-19','2027-02-19'],
    ['角','2026-10-31',null]
  ]) {
    await page.goto('/DayPillar/?date='+origin);
    await page.locator('#day-filter').fill(keyword);
    await page.locator('#day-filter').press('Enter');
    if(next) await expect(page).toHaveURL(new RegExp('date='+next));
    else {
      await expect(page.locator('.day.is-selected')).toHaveClass(/is-matched/);
      const selected=await page.locator('.day.is-selected').getAttribute('data-date');
      expect(selected > origin).toBe(true);
    }
    await expect(page.locator('.day.is-selected')).toHaveClass(/is-matched/);
    await expect(page.locator('.day.is-selected')).toBeFocused();
    await page.locator('#day-filter').press('Shift+Enter');
    if(keyword!=='角') await expect(page).toHaveURL(new RegExp('date='+origin.replace('2026-02-19','2026-02-18')));
  }
});

test('无匹配与两端边界可结束，修改查询和选日可以取消旧搜索',async ({page}) => {
  for(const [date,button] of [['1900-01-01','#search-prev'],['2100-12-31','#search-next'],['2099-12-01','#search-next']]) {
    await page.goto('/DayPillar/?date='+date);
    await page.locator('#day-filter').fill('不存在的词条');
    await page.locator(button).click();
    await expect(page.locator('#filter-result')).toContainText('查询边界');
    await expect(page).toHaveURL(new RegExp('date='+date));
  }
  await openCalendar(page);
  // 同一事件循环内在第一次异步让出线程时变更状态，确定性覆盖取消竞争。
  await page.evaluate(() => {
    const input=document.querySelector('#day-filter');
    input.value='不存在的词条';
    input.dispatchEvent(new Event('input'));
    document.querySelector('#search-next').click();
    document.querySelector('[data-date="2026-10-18"]').click();
    input.value='天罡';
    input.dispatchEvent(new Event('input'));
  });
  await expect(page).toHaveURL(/date=2026-10-18/);
  await expect(page.locator('#search-next')).toBeEnabled();
  await page.locator('#search-next').click();
  await expect(page).toHaveURL(/date=2026-12-16/);
});

test('移动抽屉与跨月搜索后退前进不循环，键盘移动不增加历史',async ({page}) => {
  await page.setViewportSize({width:375,height:800});
  await openCalendar(page);
  const length=await page.evaluate(()=>history.length);
  await page.locator('[data-date="2026-10-18"]').click();
  await expect(page.locator('#detail-panel')).toHaveClass(/is-open/);
  await page.goBack();
  await expect(page.locator('#detail-panel')).not.toHaveClass(/is-open/);
  await expect(page.locator('[data-date="2026-10-17"]')).toBeFocused();
  await page.goForward();
  await expect(page.locator('[data-date="2026-10-18"]')).toHaveAttribute('aria-pressed','true');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  expect(await page.evaluate(()=>history.length)).toBe(length+1);
  await page.goBack();
  await expect(page).toHaveURL(/date=2026-10-17/);
  await page.goForward();
  await expect(page).toHaveURL(/date=2026-10-20/);
  await page.locator('[data-change="1"]').click();
  await expect(page).toHaveURL(/date=2026-11-20/);
  await page.goBack();
  await expect(page).toHaveURL(/date=2026-10-20/);
});

test('无日期链接初始状态也可在后退时恢复',async ({page}) => {
  await page.clock.install({time:new Date('2026-10-17T04:00:00Z')});
  await page.goto('/DayPillar/');
  await expect(page).toHaveURL(/date=2026-10-17/);
  await page.locator('[data-date="2026-10-18"]').click();
  await page.goBack();
  await expect(page).toHaveURL(/date=2026-10-17/);
});


test('全范围无效名称无需扫描，长查询仍能处理取消事件',async ({page}) => {
  await page.goto('/DayPillar/?date=1900-01-01');
  await page.locator('#day-filter').fill('不存在的词条');
  await page.locator('#search-next').click();
  await expect(page.locator('#filter-result')).toContainText('查询边界');
  await expect(page).toHaveURL(/date=1900-01-01/);
  await expect(page.locator('#search-next')).toBeEnabled();
  // 两个真实名称组成无匹配查询；用浏览器计时事件取消，验证异步让出线程。
  await page.evaluate(() => {
    const input=document.querySelector('#day-filter');
    input.value='甲子 火雷噬嗑';
    input.dispatchEvent(new Event('input'));
    document.querySelector('#search-next').click();
    setTimeout(()=>{
      input.value='天罡';
      input.dispatchEvent(new Event('input'));
    },0);
  });
  await expect(page.locator('#day-filter')).toHaveValue('天罡');
  await expect(page.locator('#search-next')).toBeEnabled();
  await page.locator('#search-next').click();
  await expect(page.locator('.day.is-selected')).toHaveClass(/is-matched/);
  await expect(page).not.toHaveURL(/date=1900-01-01/);
});

test('完整日期查询直接定位到远年，非法或反向日期不跳转',async ({page}) => {
  await page.goto('/DayPillar/?date=1900-01-01');
  await page.locator('#day-filter').fill('2099-12-31');
  await page.locator('#day-filter').press('Enter');
  await expect(page).toHaveURL(/date=2099-12-31/);
  for(const value of ['2101-01-01','2100-02-30','1900-01-01']) {
    await page.locator('#day-filter').fill(value);
    await page.locator('#search-next').click();
    await expect(page.locator('#filter-result')).toContainText('查询边界');
    await expect(page).toHaveURL(/date=2099-12-31/);
  }
});

test('移动端详情可用 Enter 和空格展开，折叠后的来源链接不截获焦点',async ({page}) => {
  await page.setViewportSize({width:320,height:800});
  await openCalendar(page);
  await page.locator('[data-date="2026-10-17"]').click();
  const summary=page.locator('#source-disclosure summary');
  await summary.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#source-disclosure')).toHaveAttribute('open','');
  await page.keyboard.press('Tab');
  await expect(page.locator('#source-disclosure a').first()).toBeFocused();
  await summary.focus();
  await page.keyboard.press('Space');
  await expect(page.locator('#source-disclosure')).not.toHaveAttribute('open','');
  await page.keyboard.press('Tab');
  await expect(page.locator('#detail-close')).toBeFocused();
});

test('损坏偏好回到响应式选择，禁止存储时切换仍可用',async ({page}) => {
  await page.addInitScript(() => localStorage.setItem('daypillar-display-mode','broken'));
  await page.setViewportSize({width:375,height:800});
  await openCalendar(page);
  await expect(page.locator('#calendar-grid')).toHaveClass(/is-compact/);
  await page.setViewportSize({width:1440,height:900});
  await expect(page.locator('#calendar-grid')).not.toHaveClass(/is-compact/);
  await page.addInitScript(() => {
    Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Denied','SecurityError');}});
  });
  await page.reload();
  await page.locator('#mode-button').click();
  await expect(page.locator('#mode-button')).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('#mode-button')).toHaveText('详细');
  await expect(page.locator('#calendar-grid')).toHaveClass(/is-compact/);
  await page.setViewportSize({width:375,height:800});
  await page.locator('#mode-button').click();
  await expect(page.locator('#mode-button')).toHaveAttribute('aria-pressed','false');
  await expect(page.locator('#calendar-grid')).not.toHaveClass(/is-compact/);
  await expect(page.locator('#error-toast')).toBeHidden();
});
