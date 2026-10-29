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
  try { localStorage.setItem('date-theme', theme); } catch { /* 저장이 제한되어도 테마 전환은 동작합니다. */ }
});

const Picker = window.Daracl?.dateTimePicker;
if (!Picker) {
  document.querySelector('#lastPick').textContent = '선택기를 불러오지 못했습니다. npm run build 실행 후 다시 열어주세요.';
} else {
  Picker.setDefaultFormat({ date: 'YYYY.MM.DD', datetime: 'YYYY.MM.DD HH:mm' });
  const months = Array.from({ length: 12 }, (_, index) => `${index + 1}월`);
  Picker.setMessage({
    year: '년', month: '월', day: '일', am: '오전', pm: '오후', today: '오늘', ok: '선택',
    months: { full: months, abbr: months },
    weeks: { full: ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'], abbr: ['일', '월', '화', '수', '목', '금', '토'] },
  });
  const now = new Date();
  const modes = [
    ['dateText', 'date', 'YYYY.MM.DD', '날짜'],
    ['datetimeText', 'datetime', 'YYYY.MM.DD HH:mm', '날짜와 시간'],
    ['timeText', 'time', 'HH:mm', '시간'],
    ['monthText', 'month', 'YYYY.MM', '월'],
    ['yearText', 'year', 'YYYY', '연도'],
    ['fixedText', 'datetime', 'YYYY.MM.DD HH:mm', '고정 위치'],
  ];
  modes.forEach(([id, mode, format, label]) => Picker.create(`#${id}`, {
    mode, format, initialDate: now, showMonthAfterYear: true, enableTodayBtn: true,
    isPositionFixed: id === 'fixedText',
    onSelect: value => { document.querySelector('#lastPick').textContent = `${label} · ${value}`; },
  }));
  document.querySelector('#inlineValue').textContent = Picker.format(now, 'YYYY.MM.DD HH:mm');
  Picker.create('#inlineCalendar', {
    inline: true, mode: 'datetime', initialDate: now, format: 'YYYY.MM.DD HH:mm',
    showMonthAfterYear: true, enableTodayBtn: true,
    onSelect: value => {
      document.querySelector('#inlineValue').textContent = value;
      document.querySelector('#lastPick').textContent = `인라인 캘린더 · ${value}`;
    },
  });
}
