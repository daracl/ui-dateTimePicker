import { DateTimePicker as Picker } from '../src/index.ts';
import '@daracl/ui-style/theme-vars.css';
import './playground.css';

const themeButton = document.querySelector('#themeToggle');
function setTheme(theme) {
  document.documentElement.dataset.daraclTheme = theme;
  themeButton.setAttribute('aria-pressed', String(theme === 'dark'));
  themeButton.setAttribute('aria-label', theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환');
  themeButton.querySelector('span').textContent = theme === 'dark' ? 'Light mode' : 'Dark mode';
}
try { setTheme(localStorage.getItem('date-theme') === 'dark' ? 'dark' : 'light'); } catch { setTheme('light'); }
themeButton.addEventListener('click', () => {
  const theme = document.documentElement.dataset.daraclTheme === 'dark' ? 'light' : 'dark';
  setTheme(theme);
  try { localStorage.setItem('date-theme', theme); } catch { /* 저장이 제한된 환경에서도 전환합니다. */ }
});

const months = Array.from({ length: 12 }, (_, index) => `${index + 1}월`);
Picker.setMessage({
  year: '년', month: '월', day: '일', am: '오전', pm: '오후', today: '오늘', ok: '선택',
  months: { full: months, abbr: months },
  weeks: { full: ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'], abbr: ['일', '월', '화', '수', '목', '금', '토'] },
});

const eventList = document.querySelector('#eventList');
function clearEvents() {
  const item = document.createElement('li');
  item.className = 'empty-events';
  item.textContent = '날짜를 고르거나 달력을 이동하면 이벤트를 확인할 수 있어요.';
  eventList.replaceChildren(item);
}
function recordEvent(type, label, value = '—') {
  eventList.querySelector('.empty-events')?.remove();
  const item = document.createElement('li');
  item.className = 'event-row';
  const heading = document.createElement('span');
  const badge = document.createElement('strong');
  badge.textContent = type;
  heading.append(badge, label);
  const output = document.createElement('span');
  output.className = 'event-value';
  output.textContent = value;
  const time = document.createElement('time');
  const now = new Date();
  time.dateTime = now.toISOString();
  time.textContent = now.toLocaleTimeString('ko-KR', { hour12: false });
  item.append(heading, output, time);
  eventList.prepend(item);
  while (eventList.children.length > 8) eventList.lastElementChild.remove();
}
document.querySelector('#clearEvents').addEventListener('click', clearEvents);

let instances = [];
let generation = 0;
function initialize() {
  const currentGeneration = ++generation;
  instances.forEach(instance => instance.destroy());
  instances = [];
  const now = new Date();
  const options = {
    weekStartDay: document.querySelector('#monday').checked ? 1 : 0,
    isRTL: document.querySelector('#rtl').checked,
    autoClose: document.querySelector('#autoClose').checked,
    enableTodayBtn: document.querySelector('#todayButton').checked,
    showMonthAfterYear: true,
  };
  const modes = [
    ['dateText', 'date', 'YYYY.MM.DD', '날짜'],
    ['datetimeText', 'datetime', 'YYYY.MM.DD HH:mm', '날짜와 시간'],
    ['timeText', 'time', 'HH:mm', '시간'],
    ['monthText', 'month', 'YYYY.MM', '월'],
    ['yearText', 'year', 'YYYY', '연도'],
    ['datetimeText1', 'datetime', 'YYYY.MM.DD HH:mm', '고정 위치'],
    ['date', 'datetime', 'YYYY.MM.DD HH:mm', '인라인'],
  ];
  modes.forEach(([id, mode, format, label]) => {
    let firstDraw = true;
    const instance = Picker.create(`#${id}`, {
      ...options, mode, format, initialDate: now,
      inline: id === 'date', isPositionFixed: id === 'datetimeText1',
      onSelect: value => {
        document.querySelector('#lastPick').textContent = `${label} · ${value}`;
        if (id === 'date') document.querySelector('#selectedDate').textContent = value;
        recordEvent('select', label, value);
      },
      onClose: () => recordEvent('close', label),
      beforeChangeDatepicker: (_value, done) => {
        if (id === 'date') {
          setTimeout(() => { if (currentGeneration === generation) done(true); }, 10);
          return false;
        }
      },
      afterChangeDatepicker: value => {
        if (firstDraw) { firstDraw = false; return; }
        recordEvent('render', label, value);
      },
    });
    instances.push(instance);
    if (id === 'date') window.aaa = instance;
  });
  document.querySelector('#selectedDate').textContent = Picker.format(now, 'YYYY.MM.DD HH:mm');
  document.querySelector('#lastPick').textContent = '날짜를 선택하면 여기에 표시됩니다.';
  document.querySelector('#configCode').textContent = `DateTimePicker.create('#date', {\n  inline: true,\n  mode: 'datetime',\n  weekStartDay: ${options.weekStartDay},\n  isRTL: ${options.isRTL},\n  autoClose: ${options.autoClose},\n  enableTodayBtn: ${options.enableTodayBtn}\n});`;
}
document.querySelectorAll('.setting input').forEach(input => input.addEventListener('change', () => {
  initialize();
  recordEvent('options', '설정 변경', input.closest('label').querySelector('strong').textContent);
}));
document.querySelector('#reset').addEventListener('click', () => {
  document.querySelector('#monday').checked = false;
  document.querySelector('#rtl').checked = false;
  document.querySelector('#autoClose').checked = true;
  document.querySelector('#todayButton').checked = true;
  initialize();
  clearEvents();
});
initialize();
if (import.meta.hot) import.meta.hot.dispose(() => instances.forEach(instance => instance.destroy()));
