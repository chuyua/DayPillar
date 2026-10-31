import {test,expect} from '@playwright/test';

function luminance(rgb) {
  // CSS custom properties preserve hex notation; computed element colors may be rgb().
  const channels=/^#[0-9a-f]{6}$/i.test(rgb)
    ? [1,3,5].map(i=>parseInt(rgb.slice(i,i+2),16))
    : rgb.match(/[\d.]+/g)?.slice(0,3).map(Number);
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

test('辅助文字、相邻月与查询状态在双主题下具有实际 4.5:1 对比度',async ({page}) => {
  await page.addInitScript(() => localStorage.setItem('daypillar-display-mode','detailed'));
  await page.clock.install({time:new Date('2026-02-11T04:00:00Z')});
  await page.goto('/DayPillar/?date=2026-02-11');
  for(const scheme of ['light','dark']) {
    await page.emulateMedia({colorScheme:scheme});
    for(const width of [320,375,768,1440]) {
      await page.setViewportSize({width,height:900});
      // 搜索把非匹配日期置于 dimmed 状态；透明度也必须计入。
      await page.locator('#day-filter').fill('天罡');
      const pairs=await page.evaluate(() => {
        const rgba=value => {
          const channels=value.match(/[\d.]+/g).map(Number);
          return [...channels.slice(0,3),channels[3] ?? 1];
        };
        const over=(top,bottom) => {
          const a=top[3]+bottom[3]*(1-top[3]);
          return a ? [0,1,2].map(i=>(top[i]*top[3]+bottom[i]*bottom[3]*(1-top[3]))/a).concat(a) : [0,0,0,0];
        };
        const pixel=(el,foreground) => {
          let result=foreground ? rgba(getComputedStyle(el).color) : [0,0,0,0];
          for(let node=el;node;node=node.parentElement) {
            const style=getComputedStyle(node);
            result=over(result,rgba(style.backgroundColor));
            result[3]*=Number(style.opacity);
          }
          return 'rgb('+over(result,[255,255,255,1]).slice(0,3).join(',')+')';
        };
        const selectors=[
          '.day:not(:disabled) .day-lunar','.day-other:not(:disabled) .day-top b',
          '.day:not(:disabled) .day-cycle','.day:not(:disabled) .day-star',
          '.day:not(:disabled) .day-gua-name','.day:not(:disabled) .day-ying',
          '.day-term','.day-festival','.calendar-footer span','.site-footer span'
        ];
        return selectors.flatMap(selector=>[...document.querySelectorAll(selector)]
          .filter(el=>el.getClientRects().length>0 && getComputedStyle(el).visibility==='visible')
          .map(el=>({selector,text:el.textContent,foreground:pixel(el,true),background:pixel(el,false)})));
      });
      for(const pair of pairs) {
        expect(contrastRatio(pair.foreground,pair.background),
          scheme+' '+width+' '+pair.selector+' '+pair.text).toBeGreaterThanOrEqual(4.5);
      }
    }
  }
});

test('日期状态与两种显示模式在双主题窄屏布局中完整显示',async ({page}) => {
  await page.clock.install({time:new Date('2026-02-11T04:00:00Z')});
  await page.goto('/DayPillar/?date=2026-02-11');
  for(const scheme of ['light','dark']) {
    await page.emulateMedia({colorScheme:scheme});
    for(const width of [320,375,768,1440]) {
      await page.setViewportSize({width,height:900});
      await page.locator('#day-filter').fill('天罡');
      await expect(page.locator('.day.is-matched').first()).toBeVisible();
      await expect(page.locator('.day-term').first()).toBeVisible();
      await expect(page.locator('[aria-current="date"]')).toHaveCount(1);
      for(let mode=0;mode<2;mode++) {
        await page.locator('#mode-button').click();
        for(const selector of ['.day-gua-name','.day-ying']) {
          const bounds=await page.locator('.day.is-selected '+selector).evaluate(el=>({
            width:el.scrollWidth,client:el.clientWidth,
            grid:document.querySelector('#calendar-grid').getBoundingClientRect().width,
            page:document.documentElement.clientWidth
          }));
          expect(bounds.width).toBeLessThanOrEqual(bounds.client+1);
          expect(bounds.grid).toBeLessThanOrEqual(bounds.page);
        }
      }
    }
  }
});
