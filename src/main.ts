import './style.css';
import {
  addMonths, formatISO, getCalendarDay, getDayTaboos, getMonthCells, parseISO, todayInChina,
  type CalendarDay
} from './calendar';
import {guaEntries, lookupDayGua} from './data/gua-ying.mjs';
import {renderHexagram} from './data/hexagram.mjs';
import {matchesDay} from './data/day-filter.mjs';
import {canMatchQuery} from './data/search-query.mjs';
import {boundedCacheGet} from './data/bounded-cache.mjs';
import {HEXAGRAM_SOURCE, lookupHexagramIntro, lookupCultureEntry} from './data/cultural-notes.mjs';
import {deriveTraditionalAlmanac} from './data/traditional-almanac.mjs';

let today = todayInChina();
const current = parseISO(new URLSearchParams(location.search).get('date') ?? '')
  ?? parseISO(today)
  ?? {year: 2026, month: 10, day: 27};
let selected = formatISO(current.year, current.month, current.day);
let view = {year: current.year, month: current.month};
let monthKey = '';
let monthCells: CalendarDay[] = [];
// 单用户低资源场景：只缓存最近 3 个月的格子及 32 个日期的宜忌。
const monthCache = new Map<string, CalendarDay[]>();
const tabooCache = new Map<string, ReturnType<typeof getDayTaboos>>();
const compactMedia = window.matchMedia('(max-width: 680px)');
const storedDisplayMode = (() => {
  try {
    const value = localStorage.getItem('daypillar-display-mode');
    return value === 'compact' || value === 'detailed' ? value : null;
  } catch {return null;}
})();
let hasManualDisplayMode = storedDisplayMode !== null;
let compact = storedDisplayMode ? storedDisplayMode === 'compact' : compactMedia.matches;
let dayFilter = '';
let searchSerial = 0;
let searchBusy = false;
let ignoreGridClickUntil = 0;
let culturalTab: 'hexagram' | 'beast' = 'hexagram';

const $ = <T extends Element = HTMLElement>(selector: string): T => {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`页面结构缺少 ${selector}`);
  return element;
};
const escapeHtml = (raw: string | number): string => String(raw).replace(/[&<>"']/g,
  s => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[s] ?? s));

function shell(): void {
  $('#app').innerHTML = `
    <header class="topbar">
      <a class="brand" href="${import.meta.env.BASE_URL}" aria-label="时序日历首页">
        <img class="brand-logo" src="${import.meta.env.BASE_URL}brand/daypillar-logo.svg"
          width="43" height="43" alt="" decoding="async" />
        <span><strong>时序</strong><small>传统历法 · 数字新生</small></span>
      </a>
      <span class="header-feature">历法月览 · 六十甲子卦象</span>
      <span class="header-source">传统历法与六十甲子</span>
    </header>
    <main class="page">
      <section id="calendar-view" class="workspace" aria-label="传统日历">
        <div class="calendar-panel">
          <div class="calendar-toolbar">
            <div class="month-name"><span class="sub-label">THE LUNISOLAR CALENDAR</span>
              <h2 id="month-label"></h2></div>
            <div class="actions">
              <button class="arrow-btn" data-change="-12" aria-label="上一年">«</button>
              <button class="arrow-btn" data-change="-1" aria-label="上个月">‹</button>
              <label class="jump-label">年<select id="year-jump" class="jump-select" aria-label="跳转年份">${Array.from({length:201},(_,i)=>`<option value="${1900+i}">${1900+i}</option>`).join('')}</select></label>
              <label class="jump-label">月<select id="month-jump" class="jump-select month-select" aria-label="跳转月份">${Array.from({length:12},(_,i)=>`<option value="${i+1}">${i+1}月</option>`).join('')}</select></label>
              <button class="arrow-btn" data-change="1" aria-label="下个月">›</button>
              <button class="arrow-btn" data-change="12" aria-label="下一年">»</button>
              <button class="today-btn" id="today-button">今日</button>
              <button class="mode-btn" type="button" id="mode-button" aria-pressed="false">简洁</button>
            </div>
          </div>
          <div class="filter-toolbar"><label for="day-filter">日期查询</label><input id="day-filter" type="search" placeholder="干支、宿、卦名、节气或对应名称…" autocomplete="off" aria-describedby="filter-result" />
            <button type="button" id="search-prev" class="search-nav" aria-label="上一个匹配日期" disabled>上一个</button>
            <button type="button" id="search-next" class="search-nav" aria-label="下一个匹配日期" disabled>下一个</button>
            <output id="filter-result" role="status" aria-live="polite"></output></div>
          <div class="weekday-header" aria-hidden="true"><span>日</span><span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span></div>
          <div id="calendar-grid" class="calendar-grid" role="group" aria-label="日期。方向键移动日期，PageUp 和 PageDown 切换月份，T 返回今天。"></div>
          <div class="calendar-footer"><span><i class="dot today-dot"></i> 今日</span><span><i class="dot term-dot"></i> 节气</span><span><i class="dot marked-dot"></i> 已选日期</span></div>
        </div>
        <aside class="detail-panel" id="detail-panel" aria-label="日期详情">
          <div id="drawer-handle" class="drawer-handle" aria-hidden="true"></div>
          <button type="button" class="detail-close" id="detail-close" aria-label="关闭日期详情">关闭 ×</button>
          <div id="date-detail"></div>
        </aside>
      </section>
      <div id="detail-backdrop" class="detail-backdrop" aria-hidden="true" hidden></div>
      <footer class="site-footer"><span>时序 / TIME &amp; TRADITION</span><span>历法 · tyme4ts 1.5.4　|　27 宿 · 传统公开规则　|　六十甲子 · 卦象映射</span></footer>
    </main>
    <div class="toast" id="error-toast" role="alert" hidden></div>`;
}

function showError(message: string): void {
  const toast = $<HTMLElement>('#error-toast');
  toast.textContent = message;
  toast.hidden = false;
}

function monthLabel(year: number, month: number): string {
  return `${year} 年 <span>${String(month).padStart(2, '0')} 月</span>`;
}

function dayCell(item: CalendarDay): string {
  const isMonth = item.year === view.year && item.month === view.month;
  const supported = item.year >= 1900 && item.year <= 2100;
  const cls = ['day', !isMonth ? 'day-other' : '', !supported ? 'day-unavailable' : '', item.iso === today ? 'is-today' : '', item.iso === selected ? 'is-selected' : ''].filter(Boolean).join(' ');
  const minor = item.lunarDay === 1 ? item.lunarMonthName : item.lunarName;
  const gua = lookupDayGua(item.dayCycle);
  const label = `${item.iso}，农历${item.lunarMonthName}${item.lunarName}，${item.dayCycle}日，${gua?.gua ?? ''}，${gua?.ying ?? ''}，传统星宿${item.star27}`;
  return `<button type="button" class="${cls}" data-date="${item.iso}" tabindex="${item.iso === selected ? 0 : -1}" ${supported ? '' : 'disabled'} ${item.iso === today ? 'aria-current="date"' : ''} aria-label="${escapeHtml(label)}" aria-pressed="${item.iso === selected}">
    <span class="day-top"><b>${item.day}</b><span class="day-lunar">${escapeHtml(minor)}</span></span>
    <span class="day-cycle">${escapeHtml(item.dayCycle)}日 <span class="duty-text"><span class="tiny-dot">·</span> ${escapeHtml(item.duty)}日</span></span>
    <span class="day-star">${escapeHtml(item.star27)}</span>
    <span class="day-gua"><span class="day-gua-name">${escapeHtml(gua?.gua ?? '—')}</span><span class="day-ying">${escapeHtml(gua?.ying ?? '—')}</span></span>
    ${item.term ? `<span class="day-term">${escapeHtml(item.term)}</span>` : item.festival ? `<span class="day-festival">${escapeHtml(item.festival)}</span>` : ''}
  </button>`;
}

// 页面常驻跨午夜后，今日标记必须跟随中国标准时间更新，而非锁定初次加载日。
function refreshTodayMarker(): void {
  const next = todayInChina();
  if (next === today) return;
  const previous = today;
  today = next;
  const oldButton = $('#calendar-grid').querySelector<HTMLButtonElement>(`[data-date="${previous}"]`);
  oldButton?.classList.remove('is-today');
  oldButton?.removeAttribute('aria-current');
  const newButton = $('#calendar-grid').querySelector<HTMLButtonElement>(`[data-date="${today}"]`);
  newButton?.classList.add('is-today');
  newButton?.setAttribute('aria-current', 'date');
}

function renderCalendar(): void {
  refreshTodayMarker();
  $('#month-label').innerHTML = monthLabel(view.year, view.month);
  $<HTMLSelectElement>('#year-jump').value = String(view.year);
  $<HTMLSelectElement>('#month-jump').value = String(view.month);
  try {
    const nextKey = `${view.year}-${view.month}`;
    if (monthKey !== nextKey) {
      monthCells = boundedCacheGet(monthCache, nextKey, 3, () => getMonthCells(view.year, view.month));
      monthKey = nextKey;
    }
    $('#calendar-grid').innerHTML = monthCells.map(dayCell).join('');
  } catch (error) {
    showError(`历法计算失败：${String(error)}`);
  }
  updateDisplayMode();
  applyDayFilter();
  renderDetail();
}

function applyDayFilter(): void {
  let matches = 0;
  let inMonth = 0;
  // 一次获取网格按钮，避免每键输入 35–42 次独立的 DOM selector 查询。
  const buttons = $('#calendar-grid').querySelectorAll<HTMLButtonElement>('[data-date]');
  for (let index = 0; index < monthCells.length; index++) {
    const cell = monthCells[index];
    const button = buttons[index];
    if (!button) continue;
    const active = cell.year === view.year && cell.month === view.month;
    const found = active && matchesDay(cell, dayFilter);
    if (active) {inMonth += 1; if (found) matches += 1;}
    button.classList.toggle('is-dimmed', Boolean(dayFilter && active && !found));
    button.classList.toggle('is-matched', Boolean(dayFilter && found));
  }
  $('#filter-result').textContent = dayFilter ? `本月匹配 ${matches} / ${inMonth} 天` : '';
  for (const name of ['search-prev','search-next']) {
    $<HTMLButtonElement>(`#${name}`).disabled = !dayFilter || searchBusy;
  }
}

async function findAdjacentMatch(direction: 1 | -1): Promise<void> {
  if (!dayFilter || searchBusy) return;
  const keyword = dayFilter;
  const run = ++searchSerial;
  const origin = selected;
  searchBusy = true;
  applyDayFilter();
  $('#filter-result').textContent = '正在跨月查询…';
  try {
    if (!canMatchQuery(keyword)) {
      $('#filter-result').textContent = '已到 1900–2100 年查询边界，未找到更多匹配';
      return;
    }
    // Full ISO dates can be located directly without scanning intervening years.
    if (/^\d{4}-\d{2}-\d{2}$/.test(keyword)) {
      if (parseISO(keyword) && (direction > 0 ? keyword > origin : keyword < origin)) {
        pickDate(keyword,{focusDay:true,historyMode:'push'});
      } else {
        $('#filter-result').textContent = '已到 1900–2100 年查询边界，未找到更多匹配';
      }
      return;
    }
    // Scan only as far as needed, reusing visible cells. Yield by elapsed time
    // rather than whole months so slow devices can still edit/cancel a query.
    const start = new Date(origin+'T00:00:00Z').getTime();
    const minimum = Date.UTC(1900,0,1), maximum = Date.UTC(2100,11,31);
    let batchStart = performance.now();
    for (let time = start + direction*86_400_000;
      time >= minimum && time <= maximum; time += direction*86_400_000) {
      if (run !== searchSerial || keyword !== dayFilter) return;
      const date = new Date(time);
      const year = date.getUTCFullYear(), month = date.getUTCMonth()+1, day = date.getUTCDate();
      const candidate = (year === view.year && month === view.month
        ? monthCells.find(item=>item.day === day && item.month === month) : undefined)
        ?? getCalendarDay(year,month,day);
      if (matchesDay(candidate,keyword)) {
        pickDate(candidate.iso,{focusDay:true,historyMode:'push'});
        return;
      }
      if (performance.now()-batchStart >= 8) {
        await new Promise<void>(resolve=>window.setTimeout(resolve,0));
        batchStart = performance.now();
      }
    }
    $('#filter-result').textContent = '已到 1900–2100 年查询边界，未找到更多匹配';
  } catch (error) {
    showError(`查询失败：${String(error)}`);
  } finally {
    if (run === searchSerial) {
      searchBusy = false;
      for (const name of ['search-prev','search-next']) {
        $<HTMLButtonElement>(`#${name}`).disabled = !dayFilter;
      }
    }
  }
}

function cancelSearch(): void {
  if (!searchBusy) return;
  searchSerial++;
  searchBusy = false;
  applyDayFilter();
}

function updateDisplayMode(): void {
  $('#calendar-grid').classList.toggle('is-compact', compact);
  const button = $<HTMLButtonElement>('#mode-button');
  button.setAttribute('aria-pressed', String(compact));
  button.textContent = compact ? '详细' : '简洁';
  button.setAttribute('aria-label', compact ? '切换为详细月历' : '切换为简洁月历');
}

function updateSelectedDay(previous: string): void {
  for (const iso of new Set([previous, selected])) {
    const button = document.querySelector<HTMLButtonElement>(`#calendar-grid [data-date="${iso}"]`);
    if (!button) continue;
    const active = iso === selected;
    button.classList.toggle('is-selected', active);
    button.setAttribute('aria-pressed', String(active));
    button.tabIndex = active ? 0 : -1;
  }
}

function detailItem(label: string, value: string, note?: string): string {
  return `<div class="metric"><span>${escapeHtml(label)}</span><b>${escapeHtml(value)}</b>${note ? `<small>${escapeHtml(note)}</small>` : ''}</div>`;
}

function eclipticItem(day: CalendarDay): string {
  const color = day.ecliptic.includes('黄') ? 'ecliptic-good'
    : day.ecliptic.includes('黑') ? 'ecliptic-dark' : 'ecliptic-unknown';
  return `<div class="metric"><span>黄黑道</span><b class="ecliptic-value"><i class="ecliptic-dot ${color}" aria-hidden="true"></i>${escapeHtml(day.ecliptic)}</b><small>${escapeHtml(day.twelveStar)}值日</small></div>`;
}

function renderDetail(): void {
  const expanded = ['ancient-disclosure','star-disclosure','source-disclosure']
    .filter(id => document.getElementById(id) instanceof HTMLDetailsElement &&
      (document.getElementById(id) as HTMLDetailsElement).open);
  const item = parseISO(selected);
  if (!item) return;
  let day: CalendarDay;
  try { day = monthCells.find(cell => cell.iso === selected) ?? getCalendarDay(item.year, item.month, item.day); }
  catch (error) { showError(`详情计算失败：${String(error)}`); return; }
  const weekday = '日一二三四五六'[day.weekday];
  const dayGua = lookupDayGua(day.dayCycle);
  const guaName = dayGua?.gua ?? '';
  const guaIntro = lookupHexagramIntro(guaName);
  const cultureEntry = lookupCultureEntry(dayGua?.ying ?? '');
  const guaActive = culturalTab === 'hexagram';
  const traditional = deriveTraditionalAlmanac(day.monthCycleByTerm,day.dayCycle,day.recentSolarTerm);
  let taboos: ReturnType<typeof getDayTaboos> | null = null;
  try {
    taboos = boundedCacheGet(tabooCache, day.iso, 32,
      () => getDayTaboos(day.year, day.month, day.day));
  }
  catch (error) { showError(`宜忌资料读取失败：${String(error)}`); }
  const renderTaboos = (names: string[]): string =>
    names.length ? names.map(name => `<span class="taboo-tag">${escapeHtml(name)}</span>`).join('')
      : '<span class="taboo-empty">无对应资料</span>';
  $('#date-detail').innerHTML = `
    <div class="detail-header"><span class="side-overline">DATE INSIGHTS <span>·</span> 日期详览</span>
      <div class="large-date"><span>${String(day.day).padStart(2, '0')}</span><span class="date-suffix">${day.month}月 · 周${weekday}</span></div>
      <h2>${escapeHtml(day.lunarMonthName)}${escapeHtml(day.lunarName)}</h2>
      <p>${day.year}年　${escapeHtml(day.lunarYearCycle)}年</p>
      ${(day.term || day.festival) ? `<div class="special-tag">${escapeHtml(day.term ?? day.festival ?? '')}</div>` : ''}
    </div>
    <div class="side-content">
      <div class="section-title"><span>干支与建除</span><small>TYME CALCULATION</small></div>
      <div class="stats-grid">
        ${detailItem('年干支 · 节气界',day.yearCycleByTerm,'按节令划分')}
        ${detailItem('月干支',day.monthCycleByTerm,'按节令划分')}
        ${detailItem('日干支',day.dayCycle)}
        ${detailItem('十二建除',day.duty + '日')}
        ${eclipticItem(day)}
        ${detailItem('星座',day.zodiac)}
      </div>
      ${traditional ? `
      <details class="detail-disclosure" id="ancient-disclosure">
      <summary>古法月建与历注 <small>节令月建 · 十二月将</small></summary>
      <div class="ancient-almanac" aria-label="节令月建与传统神煞独立推演">
        <div class="ancient-item"><span>阳建 · 月建</span><strong>${escapeHtml(traditional.monthBranch)}建 · ${traditional.monthNumber}月</strong><small>按节气交节划分</small></div>
        <div class="ancient-item"><span>阴建 · 月厌</span><strong>${escapeHtml(traditional.monthYan)}${traditional.hitMonthYan ? ' · 今日值厌' : ''}</strong><small>正月戌起，逆行十二辰</small></div>
        <div class="ancient-item"><span>月厌对冲 · 厌对</span><strong>${escapeHtml(traditional.yanDui)}${traditional.hitYanDui ? ' · 今日值厌对' : ''}</strong><small>对冲月厌，不等于月内天罡</small></div>
        <div class="ancient-item"><span>十二黄黑道</span><strong>${escapeHtml(traditional.twelveStar)} · ${traditional.ecliptic}</strong><small>月建配日支；与建除另算</small></div>
        <div class="ancient-item"><span>月内天罡／河魁</span><strong>罡${escapeHtml(traditional.tianGang)} · 魁${escapeHtml(traditional.heKui)}</strong><small>${traditional.hitTianGang ? '今日值月内天罡' : traditional.hitHeKui ? '今日值月内河魁' : '此日均未值'}；不是六壬辰将</small></div>
        <div class="ancient-item"><span>十二月将 · 中气换将</span><strong>${escapeHtml(traditional.generalName)} · ${escapeHtml(traditional.generalBranch)}</strong><small>${escapeHtml(traditional.generalBoundary)}中气起，唐《太白阴经》月将表</small></div>
      </div>
      ${traditional.hitYanDui && traditional.ecliptic === '黄道'
        ? '<p class="ancient-intersection">此日黄道神与厌对同时出现：不同古法有不同象征，不可直接判定诸事皆吉。</p>' : ''}
      <p class="star-note">月将按中气、月建按节令；交节／交中气当天仅按日期归属，未精确到交接时刻。</p>
      </details>` : ''}
      <div class="section-title star-section"><span>日干支 · 文化映射</span><small>SIXTY-DAY CYCLE</small></div>
      <div class="culture-tabs" role="tablist" aria-label="文化资料类别">
        <button type="button" id="culture-tab-hexagram" role="tab" data-culture-tab="hexagram" aria-controls="culture-panel-hexagram" aria-selected="${guaActive}" tabindex="${guaActive ? 0 : -1}">卦象映射</button>
        <button type="button" id="culture-tab-beast" role="tab" data-culture-tab="beast" aria-controls="culture-panel-beast" aria-selected="${!guaActive}" tabindex="${guaActive ? -1 : 0}">异兽和神煞介绍</button>
      </div>
      <div id="culture-panel-hexagram" role="tabpanel" aria-labelledby="culture-tab-hexagram" ${guaActive ? '' : 'hidden'}>
        <div class="gua-highlight"><div class="gua-symbol-wrap">${renderHexagram(guaName)}<span>${escapeHtml(day.dayCycle)}日</span></div><div class="gua-info"><small>六十四卦体系 · 本项目映射60条</small><strong>${escapeHtml(guaName)}</strong><p>${escapeHtml(guaIntro ?? '暂无卦义介绍')}</p><span>对应名称：${escapeHtml(dayGua?.ying ?? '—')}</span></div></div>
      </div>
      <div id="culture-panel-beast" role="tabpanel" aria-labelledby="culture-tab-beast" ${guaActive ? 'hidden' : ''}>
        <div class="beast-card"><small class="culture-kind">${escapeHtml(cultureEntry?.category ?? '未分类')}</small><strong>${escapeHtml(cultureEntry?.name ?? '暂无对应资料')}</strong><p>${escapeHtml(cultureEntry?.description ?? '尚未找到该名称的可靠资料。')}</p></div>
      </div>
      <details class="detail-disclosure" id="star-disclosure">
      <summary>传统二十七宿 <small>${escapeHtml(day.star27)}</small></summary>
      <div class="star-block primary-star"><div class="star-symbol">廿七</div><div><small>传统农历月日算法 · 27 宿</small><strong>${escapeHtml(day.star27)}</strong><span>${day.monthSigned < 0 ? '闰月沿用对应月份资料' : '采用公开月日起宿循环算法'}</span></div></div>
      <p class="star-note">闰月沿用同名农历月份的二十七宿规则，属于当前项目假设。</p>
      </details>
      <div class="section-title star-section"><span>传统宜忌</span><small>TYME · DAILY REFERENCES</small></div>
      <div class="taboo-groups"><div class="taboo-group"><h3>宜</h3><div class="taboo-items">${renderTaboos(taboos?.recommends ?? [])}</div></div>
        <div class="taboo-group taboo-avoid"><h3>忌</h3><div class="taboo-items">${renderTaboos(taboos?.avoids ?? [])}</div></div></div>
      <details class="detail-disclosure source-disclosure" id="source-disclosure">
        <summary>资料来源与使用说明</summary>
        <div class="ancient-sources">
          ${traditional ? `<a href="https://zh.wikisource.org/zh-hans/太白陰經/卷十" target="_blank" rel="noopener noreferrer">唐《太白阴经》</a>
          <a href="https://www.shidianguji.com/book/SK1618/chapter/1jursttq22522" target="_blank" rel="noopener noreferrer">月厌与厌对</a>
          <a href="https://www.shidianguji.com/book/SK1618/chapter/1jurstuq9gl55" target="_blank" rel="noopener noreferrer">黄黑二道</a>
          <a href="https://www.shidianguji.com/zh/book/SK1618/chapter/1m2ba99sxl2cm" target="_blank" rel="noopener noreferrer">月内天罡河魁</a>` : ''}
          <a class="culture-source" href="${HEXAGRAM_SOURCE}" target="_blank" rel="noopener noreferrer">六十四卦资料</a>
          ${cultureEntry ? `<a class="culture-source" href="${escapeHtml(cultureEntry.source)}" target="_blank" rel="noopener noreferrer">异兽及神煞对应词条</a>` : ''}
        </div>
        <p class="culture-disclaimer">本页按六十甲子名称关联异兽、神煞及纪名，并非全部来自《山海经》，也不表示当日实际发生某种吉凶。古法月建、月将与黄黑道为不同计算规则；月将名表见唐《太白阴经》；月厌与厌对见唐《天宝历》佚文的清代辑录，黄黑二道、月内天罡河魁参照清《御定星历考原》，不视为唐代原文。宜忌来自 tyme4ts，均仅供文化考据，不作为现实决策依据。</p>
      </details>
    </div>`;
  for (const id of expanded) {
    const detail = document.getElementById(id);
    if (detail instanceof HTMLDetailsElement) detail.open = true;
  }
}

function selectCulturalTab(tab: 'hexagram' | 'beast', moveFocus = false): void {
  culturalTab = tab;
  for (const kind of ['hexagram', 'beast'] as const) {
    const active = kind === tab;
    const button = $<HTMLButtonElement>(`#culture-tab-${kind}`);
    button.setAttribute('aria-selected', String(active));
    button.tabIndex = active ? 0 : -1;
    $<HTMLElement>(`#culture-panel-${kind}`).hidden = !active;
  }
  if (moveFocus) $<HTMLButtonElement>(`#culture-tab-${tab}`).focus();
}

function isMobileDetail(): boolean {
  return window.matchMedia('(max-width: 920px)').matches;
}

function closeDetail(restoreFocus = true): void {
  const panel = $('#detail-panel');
  if (!panel.classList.contains('is-open')) return;
  panel.classList.remove('is-open');
  panel.removeAttribute('role');
  panel.removeAttribute('aria-modal');
  $('#detail-backdrop').setAttribute('hidden', '');
  document.body.classList.remove('drawer-open');
  if (restoreFocus) {
    document.querySelector<HTMLButtonElement>(`#calendar-grid [data-date="${selected}"]`)?.focus();
  }
}

function openDetail(): void {
  if (!isMobileDetail()) return;
  const panel = $('#detail-panel');
  panel.classList.add('is-open');
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  $('#detail-backdrop').removeAttribute('hidden');
  document.body.classList.add('drawer-open');
  panel.scrollTop = 0;
  const focusClose = (): void => {
    if (panel.classList.contains('is-open') && !panel.contains(document.activeElement)) {
      $<HTMLButtonElement>('#detail-close').focus({preventScroll:true});
    }
  };
  // 动画帧与短时延兼容滑入动画和减少动态效果模式。
  // 不累积依赖 transitionend 的监听器；无动画时该事件可能永不触发。
  requestAnimationFrame(focusClose);
  window.setTimeout(focusClose,
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 240);
}

function pickDate(value: string, options: {
  focusDay?: boolean; open?: boolean; historyMode?: 'push' | 'replace' | 'none'
} = {}): void {
  refreshTodayMarker();
  const date = parseISO(value);
  if (!date) {showError('日期超出当前查询支持范围（1900—2100 年）');return;}
  cancelSearch();
  const previous = selected;
  const changedMonth = date.year !== view.year || date.month !== view.month || !monthKey;
  selected = value;
  view = {year:date.year,month:date.month};
  const url = new URL(location.href);
  url.searchParams.set('date',selected);
  if (options.historyMode !== 'none') {
    const mode = options.historyMode === 'push' && selected !== previous ? 'push' : 'replace';
    if (mode === 'push') history.pushState(null, '', url.pathname + url.search + url.hash);
    else history.replaceState(null, '', url.pathname + url.search + url.hash);
  }
  $<HTMLElement>('#error-toast').hidden = true;
  if (changedMonth) renderCalendar();
  else {
    updateSelectedDay(previous);
    if (previous !== selected) renderDetail();
  }
  if (options.focusDay) {
    document.querySelector<HTMLButtonElement>(`#calendar-grid [data-date="${selected}"]`)?.focus();
  }
  if (options.open) openDetail();
}

function moveCalendar(offset: number, preserveFocus = false): void {
  const next = addMonths(view.year, view.month, offset);
  if (next.year < 1900 || next.year > 2100) {
    showError('支持查询 1900—2100 年');
    return;
  }
  const currentDay = parseISO(selected)?.day ?? 1;
  const lastDay = new Date(Date.UTC(next.year, next.month, 0)).getUTCDate();
  pickDate(formatISO(next.year, next.month, Math.min(currentDay, lastDay)), {focusDay: preserveFocus, historyMode: preserveFocus ? 'replace' : 'push'});
}

function initEvents(): void {
  document.addEventListener('click', event => {
    if (!(event.target instanceof Element)) return;
    const tabButton = event.target.closest<HTMLButtonElement>('[data-culture-tab]');
    if (tabButton?.dataset.cultureTab === 'hexagram' || tabButton?.dataset.cultureTab === 'beast') {
      selectCulturalTab(tabButton.dataset.cultureTab);
      return;
    }
    const day = event.target.closest<HTMLElement>('[data-date]');
    if (day?.dataset.date) {
      if (Date.now() < ignoreGridClickUntil) {event.preventDefault();return;}
      pickDate(day.dataset.date,{focusDay:true,open:true,historyMode:'push'});return;
    }
    const move = event.target.closest<HTMLElement>('[data-change]');
    if (move?.dataset.change) {
      moveCalendar(Number(move.dataset.change)); return;
    }
    if (event.target.closest('#today-button')) {pickDate(todayInChina(),{historyMode:'push'});return;}
    if (event.target.closest('#search-prev')) {void findAdjacentMatch(-1);return;}
    if (event.target.closest('#search-next')) {void findAdjacentMatch(1);return;}
    if (event.target.closest('#mode-button')) {
      compact = !compact;
      hasManualDisplayMode = true;
      try {localStorage.setItem('daypillar-display-mode',compact ? 'compact' : 'detailed');}
      catch { /* Private browsing or storage-denied: keep the in-memory preference. */ }
      updateDisplayMode();
      return;
    }
    if (event.target.closest('#detail-close') || event.target.closest('#detail-backdrop')) {
      closeDetail();
    }
  });
  $<HTMLElement>('#calendar-grid').addEventListener('keydown', event => {
    if (!(event.target instanceof HTMLButtonElement) || !event.target.dataset.date) return;
    const active = parseISO(event.target.dataset.date);
    if (!active) return;
    const jumps: Record<string, number> = {ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7};
    let next: string | null = null;
    if (event.key in jumps) {
      const d = new Date(Date.UTC(active.year,active.month-1,active.day+jumps[event.key]));
      next = formatISO(d.getUTCFullYear(),d.getUTCMonth()+1,d.getUTCDate());
    } else if (event.key === 'PageUp' || event.key === 'PageDown') {
      const offset = (event.key === 'PageDown' ? 1 : -1)*(event.shiftKey ? 12 : 1);
      const m = addMonths(active.year,active.month,offset);
      if (m.year >= 1900 && m.year <= 2100) {
        next = formatISO(m.year,m.month,Math.min(active.day,new Date(Date.UTC(m.year,m.month,0)).getUTCDate()));
      }
    } else if (event.key.toLowerCase() === 't' && !event.altKey && !event.ctrlKey && !event.metaKey) {
      next = todayInChina();
    }
    if (next !== null) {
      event.preventDefault();
      if (parseISO(next)) pickDate(next,{focusDay:true});
    } else if (event.key === 'PageUp' || event.key === 'PageDown') {
      // 在 1900/2100 年边界不让浏览器误把 PageUp/Down 当页面滚动。
      event.preventDefault();
    }
  });
  // 仅在移动端对月历做水平手势；纵向滚动与普通单击保持原有行为。
  let touchOrigin: {x: number;y: number} | null = null;
  $('#calendar-grid').addEventListener('touchstart', event => {
    const touches = (event as TouchEvent).touches;
    touchOrigin = touches.length === 1 ? {x:touches[0].clientX,y:touches[0].clientY} : null;
  }, {passive:true});
  $('#calendar-grid').addEventListener('touchcancel', () => {touchOrigin = null;});
  $('#calendar-grid').addEventListener('touchend', event => {
    const changed = (event as TouchEvent).changedTouches;
    const start = touchOrigin;
    touchOrigin = null;
    if (!start || changed.length !== 1 || !isMobileDetail()) return;
    const dx = changed[0].clientX-start.x;
    const dy = changed[0].clientY-start.y;
    if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy)*1.5) return;
    const offset = dx < 0 ? 1 : -1;
    const next = addMonths(view.year,view.month,offset);
    if (next.year < 1900 || next.year > 2100) return;
    event.preventDefault();
    ignoreGridClickUntil = Date.now()+600;
    moveCalendar(offset);
  }, {passive:false});
  let drawerStartY: number | null = null;
  $('#drawer-handle').addEventListener('touchstart', event => {
    const touches = (event as TouchEvent).touches;
    drawerStartY = touches.length === 1 ? touches[0].clientY : null;
  }, {passive:true});
  $('#drawer-handle').addEventListener('touchend', event => {
    const changed = (event as TouchEvent).changedTouches;
    if (drawerStartY !== null && changed.length === 1 &&
        changed[0].clientY - drawerStartY > 60) closeDetail();
    drawerStartY = null;
  }, {passive:true});
  document.addEventListener('keydown', event => {
    if (!$('#detail-panel').classList.contains('is-open')) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeDetail();
    } else if (event.key === 'Tab') {
      // 移动抽屉允许在标签与来源链接之间用 Tab 导航，仅在两端循环焦点。
      const focusables = [...$('#detail-panel').querySelectorAll<HTMLElement>(
        'button:not([disabled]):not([tabindex="-1"]), a[href], summary'
      )].filter(el => !el.closest('[hidden]') &&
        (el.tagName === 'SUMMARY' || !el.closest('details:not([open])')) &&
        el.getClientRects().length > 0);
      const first = focusables[0], last = focusables[focusables.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && (document.activeElement === first || !$('#detail-panel').contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !$('#detail-panel').contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    }
  });
  $('#date-detail').addEventListener('keydown', event => {
    if (!(event.target instanceof Element)) return;
    const tab = event.target.closest<HTMLButtonElement>('[data-culture-tab]');
    if (!tab || !['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 'hexagram' : event.key === 'End' ? 'beast'
      : tab.dataset.cultureTab === 'hexagram' ? 'beast' : 'hexagram';
    selectCulturalTab(next, true);
  });
  window.addEventListener('resize', () => {
    if (!isMobileDetail()) closeDetail(false);
  });
  compactMedia.addEventListener('change', event => {
    if (!hasManualDisplayMode) {
      compact = event.matches;
      updateDisplayMode();
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) refreshTodayMarker();
  });
  window.addEventListener('focus', refreshTodayMarker);
  const jump = (): void => {
    const year = Number($<HTMLSelectElement>('#year-jump').value);
    const month = Number($<HTMLSelectElement>('#month-jump').value);
    const currentDay = parseISO(selected)?.day ?? 1;
    const lastDay = new Date(Date.UTC(year,month,0)).getUTCDate();
    const iso = formatISO(year,month,Math.min(currentDay,lastDay));
    if (parseISO(iso)) pickDate(iso,{historyMode:'push'});
  };
  $<HTMLSelectElement>('#year-jump').addEventListener('change',jump);
  $<HTMLSelectElement>('#month-jump').addEventListener('change',jump);
  $<HTMLInputElement>('#day-filter').addEventListener('input',event => {
    dayFilter = (event.target as HTMLInputElement).value.trim();
    searchSerial++;
    searchBusy = false;
    applyDayFilter();
  });
  $<HTMLInputElement>('#day-filter').addEventListener('keydown',event => {
    if (event.key === 'Enter' && dayFilter) {
      event.preventDefault();
      void findAdjacentMatch(event.shiftKey ? -1 : 1);
    }
  });
  window.addEventListener('popstate', () => {
    const parsed = parseISO(new URLSearchParams(location.search).get('date') ?? '');
    const restored = parsed ?? parseISO(todayInChina());
    if (restored) {
      closeDetail(false);
      pickDate(formatISO(restored.year,restored.month,restored.day),{historyMode:'none',focusDay:true});
    }
  });
}

shell();
initEvents();
pickDate(selected,{historyMode:'replace'});
// 按中国标准时间安排下一次午夜更新，前台常驻页面也能及时刷新。
function scheduleTodayRefresh(): void {
  refreshTodayMarker();
  const nextMidnight = new Date(today + 'T00:00:00+08:00').getTime() + 86_400_000;
  window.setTimeout(scheduleTodayRefresh,Math.max(1000,nextMidnight-Date.now()));
}
scheduleTodayRefresh();
// 跟随操作系统深色模式，并同步浏览器顶栏颜色；无额外持久化配置。
const darkScheme = window.matchMedia('(prefers-color-scheme: dark)');
const syncThemeColor = (): void => {
  document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    ?.setAttribute('content', darkScheme.matches ? '#152624' : '#f7f7f2');
};
darkScheme.addEventListener('change',syncThemeColor);
syncThemeColor();
// 可被自动化截图测试和诊断脚本只读获取，非业务接口。
Object.defineProperty(window,'__TYME_AUDIT__', {
  value: Object.freeze({starScheme:'traditional-27',guayings:guaEntries().length}),
  configurable: false,writable:false
});
