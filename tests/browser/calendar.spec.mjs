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

test('深色配色与浏览器 theme-color 同步',async ({page}) => {
  await openCalendar(page);
  await page.emulateMedia({colorScheme:'dark'});
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content','#152624');
  const color=await page.locator('body').evaluate(el => getComputedStyle(el).backgroundColor);
  expect(color).toBe('rgb(16, 28, 25)');
  await page.emulateMedia({colorScheme:'light'});
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content','#f7f7f2');
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

    await page.locator('#calendar-grid').evaluate(grid => {
      const touch=(x,y) => new Touch({identifier:1,target:grid,clientX:x,clientY:y});
      grid.dispatchEvent(new TouchEvent('touchstart',{bubbles:true,touches:[touch(350,400)],changedTouches:[touch(350,400)]}));
      grid.dispatchEvent(new TouchEvent('touchend',{bubbles:true,cancelable:true,touches:[],changedTouches:[touch(80,403)]}));
    });
    await expect(page.locator('#month-label')).toContainText('11 月');
    await expect(page.locator('#error-toast')).toBeHidden();
  });
});
