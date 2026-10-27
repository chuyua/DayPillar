import './style.css';
import {
  addMonths, formatISO, getCalendarDay, getMonthCells, parseISO, todayInChina,
  type CalendarDay
} from './calendar';
import {guaEntries, lookupDayGua} from './data/gua-ying.mjs';

const today = todayInChina();
const current = parseISO(new URLSearchParams(location.search).get('date') ?? '')
  ?? parseISO(today)
  ?? {year: 2026, month: 10, day: 27};
let selected = formatISO(current.year, current.month, current.day);
let view = {year: current.year, month: current.month};

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
      <span class="header-source">历法引擎 <strong>tyme4ts</strong></span>
    </header>
    <main class="page">
      <div class="intro">
        <div><span class="eyebrow"><span class="accent-line"></span> 传统历法 · 精准查阅</span>
          <h1>在日月流转之间，<em>读懂时序。</em></h1>
          <p>公农历与干支由 Tyme 计算；农历 27 宿与六十甲子卦象直接呈现。</p>
        </div>
        <div class="intro-emblem" aria-hidden="true"><span>节</span><span>气</span></div>
      </div>
      <section id="calendar-view" class="workspace" aria-label="传统日历">
        <div class="calendar-panel">
          <div class="calendar-toolbar">
            <div class="month-name"><span class="sub-label">THE LUNISOLAR CALENDAR</span>
              <h2 id="month-label"></h2></div>
            <div class="actions">
              <button class="arrow-btn" data-change="-12" aria-label="上一年">«</button>
              <button class="arrow-btn" data-change="-1" aria-label="上个月">‹</button>
              <input type="month" aria-label="跳转年月" id="month-jump" min="1900-01" max="2100-12" />
              <button class="arrow-btn" data-change="1" aria-label="下个月">›</button>
              <button class="arrow-btn" data-change="12" aria-label="下一年">»</button>
              <button class="today-btn" id="today-button">今日</button>
            </div>
          </div>
          <div class="weekday-header" role="row"><span>日</span><span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span></div>
          <div id="calendar-grid" class="calendar-grid" role="group" aria-label="日期"></div>
          <div class="calendar-footer"><span><i class="dot today-dot"></i> 今日</span><span><i class="dot term-dot"></i> 节气</span><span><i class="dot marked-dot"></i> 已选日期</span><span class="foot-source">农历、干支、节气来自 tyme4ts</span></div>
        </div>
        <aside class="detail-panel" aria-label="日期详情">
          <div id="date-detail"></div>
        </aside>
      </section>
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
  return `<button type="button" class="${cls}" data-date="${item.iso}" aria-label="${escapeHtml(label)}" aria-pressed="${item.iso === selected}">
    <span class="day-top"><b>${item.day}</b><span class="day-lunar">${escapeHtml(minor)}</span></span>
    <span class="day-cycle">${escapeHtml(item.dayCycle)}日 <span class="tiny-dot">·</span> ${escapeHtml(item.duty)}日</span>
    <span class="day-star">${escapeHtml(item.star27)}</span>
    <span class="day-gua"><span class="day-gua-name">${escapeHtml(gua?.gua ?? '—')}</span><span class="day-ying">${escapeHtml(gua?.ying ?? '—')}</span></span>
    ${item.term ? `<span class="day-term">${escapeHtml(item.term)}</span>` : item.festival ? `<span class="day-festival">${escapeHtml(item.festival)}</span>` : ''}
  </button>`;
}

function renderCalendar(): void {
  $('#month-label').innerHTML = monthLabel(view.year, view.month);
  $<HTMLInputElement>('#month-jump').value = `${view.year}-${String(view.month).padStart(2,'0')}`;
  try {
    const items = getMonthCells(view.year, view.month);
    $('#calendar-grid').innerHTML = items.map(dayCell).join('');
  } catch (error) {
    showError(`历法计算失败：${String(error)}`);
  }
  renderDetail();
}

function detailItem(label: string, value: string, note?: string): string {
  return `<div class="metric"><span>${escapeHtml(label)}</span><b>${escapeHtml(value)}</b>${note ? `<small>${escapeHtml(note)}</small>` : ''}</div>`;
}

function renderDetail(): void {
  const item = parseISO(selected);
  if (!item) return;
  let day: CalendarDay;
  try { day = getCalendarDay(item.year, item.month, item.day); }
  catch (error) { showError(`详情计算失败：${String(error)}`); return; }
  const weekday = '日一二三四五六'[day.weekday];
  const dayGua = lookupDayGua(day.dayCycle);
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
        ${detailItem('黄黑道',day.ecliptic,day.twelveStar+'值日')}
        ${detailItem('星座',day.zodiac)}
      </div>
      <div class="section-title star-section"><span>日干支 · 卦象映射</span><small>SIXTY-DAY CYCLE</small></div>
      <div class="gua-highlight"><span class="gua-symbol">${escapeHtml(day.dayCycle)}</span><div><small>${escapeHtml(day.dayCycle)}日所对应的卦象和名称</small><strong>${escapeHtml(dayGua?.ying ?? '—')}</strong><span>${escapeHtml(dayGua?.gua ?? '暂无对应卦象')}</span></div></div>
      <div class="section-title star-section"><span>传统二十七宿</span><small>LUNAR MONTH & DAY</small></div>
      <div class="star-block primary-star"><div class="star-symbol">廿七</div><div><small>传统农历月日算法 · 27 宿</small><strong>${escapeHtml(day.star27)}</strong><span>${day.monthSigned < 0 ? '闰月沿用对应月份资料' : '采用公开月日起宿循环算法'}</span></div></div>
      <p class="star-note">闰月沿用同名农历月份的二十七宿规则，属于当前项目假设。</p>
    </div>`;
}

function pickDate(value: string): void {
  const date = parseISO(value);
  if (!date) {showError('日期超出当前查询支持范围（1900—2100 年）');return;}
  selected = value;
  view = {year:date.year,month:date.month};
  const url = new URL(location.href);
  url.searchParams.set('date',selected);
  history.replaceState(null,'',url.pathname + url.search);
  $<HTMLElement>('#error-toast').hidden = true;
  renderCalendar();
}

function initEvents(): void {
  document.addEventListener('click', event => {
    if (!(event.target instanceof Element)) return;
    const day = event.target.closest<HTMLElement>('[data-date]');
    if (day?.dataset.date) {pickDate(day.dataset.date);return;}
    const move = event.target.closest<HTMLElement>('[data-change]');
    if (move?.dataset.change) {
      const next = addMonths(view.year,view.month,Number(move.dataset.change));
      if (next.year < 1900 || next.year > 2100) {showError('支持查询 1900—2100 年');return;}
      const d = parseISO(selected)?.day ?? 1;
      const safeDay = Math.min(d,new Date(Date.UTC(next.year,next.month,0)).getUTCDate());
      pickDate(formatISO(next.year,next.month,safeDay)); return;
    }
    if (event.target.closest('#today-button')) {pickDate(todayInChina());}
  });
  $<HTMLInputElement>('#month-jump').addEventListener('change',e => {
    const v = (e.target as HTMLInputElement).value;
    if (!/^\d{4}-\d{2}$/.test(v)) return;
    pickDate(`${v}-01`);
  });
  window.addEventListener('popstate', () => {
    const parsed = parseISO(new URLSearchParams(location.search).get('date') ?? '');
    if (parsed) pickDate(formatISO(parsed.year,parsed.month,parsed.day));
  });
}

shell();
initEvents();
renderCalendar();
// 可被自动化截图测试和诊断脚本只读获取，非业务接口。
Object.defineProperty(window,'__TYME_AUDIT__', {
  value: Object.freeze({starScheme:'traditional-27',guayings:guaEntries().length}),
  configurable: false,writable:false
});
