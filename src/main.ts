import './style.css';
import {
  addMonths, formatISO, getCalendarDay, getDayTaboos, getMonthCells, parseISO, todayInChina,
  type CalendarDay
} from './calendar';
import {guaEntries, lookupDayGua} from './data/gua-ying.mjs';
import {renderHexagram} from './data/hexagram.mjs';
import {matchesDay} from './data/day-filter.mjs';

const today = todayInChina();
const current = parseISO(new URLSearchParams(location.search).get('date') ?? '')
  ?? parseISO(today)
  ?? {year: 2026, month: 10, day: 27};
let selected = formatISO(current.year, current.month, current.day);
let view = {year: current.year, month: current.month};
let monthKey = '';
let monthCells: CalendarDay[] = [];
let compact = window.matchMedia('(max-width: 680px)').matches;
let dayFilter = '';
let ignoreGridClickUntil = 0;

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
        <span class="brand-seal" aria-hidden="true">序</span>
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
          <div class="filter-toolbar"><label for="day-filter">本月查询</label><input id="day-filter" type="search" placeholder="输入干支、宿、卦名或对应名称…" autocomplete="off" aria-describedby="filter-result" /><output id="filter-result" role="status" aria-live="polite"></output></div>
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
  const cls = ['day', !isMonth ? 'day-other' : '', item.iso === today ? 'is-today' : '', item.iso === selected ? 'is-selected' : ''].filter(Boolean).join(' ');
  const minor = item.lunarDay === 1 ? item.lunarMonthName : item.lunarName;
  const gua = lookupDayGua(item.dayCycle);
  const label = `${item.iso}，农历${item.lunarMonthName}${item.lunarName}，${item.dayCycle}日，${gua?.gua ?? ''}，${gua?.ying ?? ''}，传统星宿${item.star27}`;
  return `<button type="button" class="${cls}" data-date="${item.iso}" tabindex="${item.iso === selected ? 0 : -1}" aria-label="${escapeHtml(label)}" aria-pressed="${item.iso === selected}">
    <span class="day-top"><b>${item.day}</b><span class="day-lunar">${escapeHtml(minor)}</span></span>
    <span class="day-cycle">${escapeHtml(item.dayCycle)}日 <span class="duty-text"><span class="tiny-dot">·</span> ${escapeHtml(item.duty)}日</span></span>
    <span class="day-star">${escapeHtml(item.star27)}</span>
    <span class="day-gua"><span class="day-gua-name">${escapeHtml(gua?.gua ?? '—')}</span><span class="day-ying">${escapeHtml(gua?.ying ?? '—')}</span></span>
    ${item.term ? `<span class="day-term">${escapeHtml(item.term)}</span>` : item.festival ? `<span class="day-festival">${escapeHtml(item.festival)}</span>` : ''}
  </button>`;
}

function renderCalendar(): void {
  $('#month-label').innerHTML = monthLabel(view.year, view.month);
  $<HTMLSelectElement>('#year-jump').value = String(view.year);
  $<HTMLSelectElement>('#month-jump').value = String(view.month);
  try {
    const nextKey = `${view.year}-${view.month}`;
    if (monthKey !== nextKey) {
      monthCells = getMonthCells(view.year, view.month);
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
  for (const cell of monthCells) {
    const button = document.querySelector<HTMLButtonElement>(`#calendar-grid [data-date="${cell.iso}"]`);
    if (!button) continue;
    const active = cell.year === view.year && cell.month === view.month;
    const found = matchesDay(cell, dayFilter);
    if (active) {inMonth += 1; if (found) matches += 1;}
    button.classList.toggle('is-dimmed', Boolean(dayFilter && !found));
    button.classList.toggle('is-matched', Boolean(dayFilter && found));
  }
  $('#filter-result').textContent = dayFilter ? `本月匹配 ${matches} / ${inMonth} 天` : '';
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
  const item = parseISO(selected);
  if (!item) return;
  let day: CalendarDay;
  try { day = monthCells.find(cell => cell.iso === selected) ?? getCalendarDay(item.year, item.month, item.day); }
  catch (error) { showError(`详情计算失败：${String(error)}`); return; }
  const weekday = '日一二三四五六'[day.weekday];
  const dayGua = lookupDayGua(day.dayCycle);
  let taboos: ReturnType<typeof getDayTaboos> | null = null;
  try { taboos = getDayTaboos(day.year, day.month, day.day); }
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
      <div class="section-title star-section"><span>日干支 · 卦象映射</span><small>SIXTY-DAY CYCLE</small></div>
      <div class="gua-highlight"><div class="gua-symbol-wrap">${renderHexagram(dayGua?.gua ?? '')}<span>${escapeHtml(day.dayCycle)}日</span></div><div><small>${escapeHtml(day.dayCycle)}日所对应的卦象和名称</small><strong>${escapeHtml(dayGua?.ying ?? '—')}</strong><span>${escapeHtml(dayGua?.gua ?? '暂无对应卦象')}</span></div></div>
      <div class="section-title star-section"><span>传统二十七宿</span><small>LUNAR MONTH & DAY</small></div>
      <div class="star-block primary-star"><div class="star-symbol">廿七</div><div><small>传统农历月日算法 · 27 宿</small><strong>${escapeHtml(day.star27)}</strong><span>${day.monthSigned < 0 ? '闰月沿用对应月份资料' : '采用公开月日起宿循环算法'}</span></div></div>
      <p class="star-note">闰月沿用同名农历月份的二十七宿规则，属于当前项目假设。</p>
      <div class="section-title star-section"><span>传统宜忌</span><small>TYME · DAILY REFERENCES</small></div>
      <div class="taboo-groups"><div class="taboo-group"><h3>宜</h3><div class="taboo-items">${renderTaboos(taboos?.recommends ?? [])}</div></div>
        <div class="taboo-group taboo-avoid"><h3>忌</h3><div class="taboo-items">${renderTaboos(taboos?.avoids ?? [])}</div></div></div>
      <p class="star-note">此处宜忌来自 tyme4ts 传统历书规则，仅供文化资料查阅，不作为现实决策依据。</p>
    </div>`;
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
  $<HTMLButtonElement>('#detail-close').focus();
}

function pickDate(value: string, options: {focusDay?: boolean; open?: boolean} = {}): void {
  const date = parseISO(value);
  if (!date) {showError('日期超出当前查询支持范围（1900—2100 年）');return;}
  const previous = selected;
  const changedMonth = date.year !== view.year || date.month !== view.month || !monthKey;
  selected = value;
  view = {year:date.year,month:date.month};
  const url = new URL(location.href);
  url.searchParams.set('date',selected);
  history.replaceState(null,'',url.pathname + url.search);
  $<HTMLElement>('#error-toast').hidden = true;
  if (changedMonth) renderCalendar();
  else {
    updateSelectedDay(previous);
    renderDetail();
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
  pickDate(formatISO(next.year, next.month, Math.min(currentDay, lastDay)), {focusDay: preserveFocus});
}

function initEvents(): void {
  document.addEventListener('click', event => {
    if (!(event.target instanceof Element)) return;
    const day = event.target.closest<HTMLElement>('[data-date]');
    if (day?.dataset.date) {
      if (Date.now() < ignoreGridClickUntil) {event.preventDefault();return;}
      pickDate(day.dataset.date,{focusDay:true,open:true});return;
    }
    const move = event.target.closest<HTMLElement>('[data-change]');
    if (move?.dataset.change) {
      moveCalendar(Number(move.dataset.change)); return;
    }
    if (event.target.closest('#today-button')) {pickDate(todayInChina());return;}
    if (event.target.closest('#mode-button')) {
      compact = !compact;
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
      event.preventDefault();
      $<HTMLButtonElement>('#detail-close').focus();
    }
  });
  window.addEventListener('resize', () => {
    if (!isMobileDetail()) closeDetail(false);
  });
  const jump = (): void => {
    const year = Number($<HTMLSelectElement>('#year-jump').value);
    const month = Number($<HTMLSelectElement>('#month-jump').value);
    const currentDay = parseISO(selected)?.day ?? 1;
    const lastDay = new Date(Date.UTC(year,month,0)).getUTCDate();
    const iso = formatISO(year,month,Math.min(currentDay,lastDay));
    if (parseISO(iso)) pickDate(iso);
  };
  $<HTMLSelectElement>('#year-jump').addEventListener('change',jump);
  $<HTMLSelectElement>('#month-jump').addEventListener('change',jump);
  $<HTMLInputElement>('#day-filter').addEventListener('input',event => {
    dayFilter = (event.target as HTMLInputElement).value.trim();
    applyDayFilter();
  });
  window.addEventListener('popstate', () => {
    const parsed = parseISO(new URLSearchParams(location.search).get('date') ?? '');
    if (parsed) pickDate(formatISO(parsed.year,parsed.month,parsed.day));
  });
}

shell();
initEvents();
renderCalendar();
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
