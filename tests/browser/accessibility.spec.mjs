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
