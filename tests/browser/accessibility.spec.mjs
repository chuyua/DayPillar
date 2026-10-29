import {test,expect} from '@playwright/test';

function luminance(rgb) {
  const channels=rgb.match(/[\d.]+/g)?.slice(0,3).map(Number);
  if (!channels || channels.length !== 3) throw new Error(`Unexpected CSS color: ${rgb}`);
  const linear=channels.map(value => {
    const x=value/255;
    return x <= 0.04045 ? x/12.92 : ((x+0.055)/1.055)**2.4;
  });
  return linear[0]*0.2126 + linear[1]*0.7152 + linear[2]*0.0722;
}

function contrastRatio(foreground,background) {
  const a=luminance(foreground), b=luminance(background);
  return (Math.max(a,b)+0.05)/(Math.min(a,b)+0.05);
}

test('320px 到桌面均可浏览：无页面横向溢出，日历卦象始终保留',async ({page}) => {
  await page.goto('/DayPillar/?date=2026-10-17');
  for(const width of [320,360,375,390,680,768,920,1024,1366]) {
    await page.setViewportSize({width,height:850});
    await expect(page.locator('#calendar-grid [data-date="2026-10-17"]')).toBeVisible();
    const dimensions=await page.evaluate(() => ({
      viewport:window.innerWidth,
      document:document.documentElement.scrollWidth,
      body:document.body.scrollWidth
    }));
    expect(dimensions.document, `Document overflow at ${width}px`).toBeLessThanOrEqual(width+1);
    expect(dimensions.body, `Body overflow at ${width}px`).toBeLessThanOrEqual(width+1);
    await expect(page.locator('#calendar-grid [data-date="2026-10-17"] .day-gua')).toContainText('天罡');
  }
});

test('重要日历信息在浅色和深色模式下的文字对比度均不少于 4.5:1',async ({page}) => {
  await page.goto('/DayPillar/?date=2026-10-17');
  for(const scheme of ['light','dark']) {
    await page.emulateMedia({colorScheme:scheme});
    const pairs=await page.locator('#calendar-grid [data-date="2026-10-17"]').evaluate(day => {
      const background=getComputedStyle(day).backgroundColor;
      return ['.day-cycle','.day-star','.day-gua-name','.day-ying'].map(selector => ({
        selector,foreground:getComputedStyle(day.querySelector(selector)).color,background
      }));
    });
    for(const pair of pairs) {
      expect(contrastRatio(pair.foreground,pair.background),
        `${scheme} ${pair.selector}: ${pair.foreground} / ${pair.background}`).toBeGreaterThanOrEqual(4.5);
    }
  }
});

test('Hallmark 精修：双主题键盘焦点、卦象辅助文字及表单边框可辨认',async ({page}) => {
  await page.goto('/DayPillar/?date=2026-02-11');
  for(const scheme of ['light','dark']) {
    await page.emulateMedia({colorScheme:scheme});
    const colors=await page.evaluate(()=>{
      const color=selector=>getComputedStyle(document.querySelector(selector));
      return {
        focus:getComputedStyle(document.documentElement).getPropertyValue('--focus-ring').trim(),
        surface:color('.calendar-panel').backgroundColor,
        label:color('.gua-highlight .gua-symbol-wrap>span').color,
        help:color('.gua-highlight .gua-info small').color,
        guaBackground:color('.gua-highlight').backgroundColor,
        starLabel:color('.star-block>div:last-child>span').color,
        starBackground:color('.star-block').backgroundColor,
        inputBorder:color('.filter-toolbar input').borderTopColor
      };
    });
    expect(contrastRatio(colors.focus,colors.surface),`${scheme} focus ring`).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(colors.label,colors.guaBackground),`${scheme} gua label`).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(colors.help,colors.guaBackground),`${scheme} gua help`).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(colors.starLabel,colors.starBackground),`${scheme} 27 star explanation`).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(colors.inputBorder,colors.surface),`${scheme} input edge`).toBeGreaterThanOrEqual(3);
  }
});

test('Hallmark 精修：320px 移动日历关键文字不低于 11px 且无水平溢出',async ({page}) => {
  await page.setViewportSize({width:320,height:740});
  await page.goto('/DayPillar/?date=2026-02-11');
  for(const selector of ['.day-cycle','.day-gua','.day-star','.day-lunar']) {
    const size=await page.locator('#calendar-grid [data-date="2026-02-11"] '+selector).evaluate(el=>parseFloat(getComputedStyle(el).fontSize));
    expect(size,`mobile readable ${selector}`).toBeGreaterThanOrEqual(11);
  }
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(321);
  await page.locator('#calendar-grid [data-date="2026-02-11"]').click();
  await expect(page.locator('#detail-panel')).toHaveClass(/is-open/);
  await page.keyboard.press('Escape');
  await expect(page.locator('#detail-panel')).not.toHaveClass(/is-open/);
});
