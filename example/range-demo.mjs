/** 빌드 후 브라우저에서 이 모듈을 로드하면 예제 입력과 달력을 생성합니다. */
import { DateTimePicker } from '../dist/index.js';

for (const href of ['../dist/daracl.datetimepicker.css', '../dist/theme-vars.css']) {
  const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = new URL(href, import.meta.url).href; document.head.append(link);
}
const examples = [
  ['Date Range (자동 확정)', { mode: 'date', autoClose: true }],
  ['DateTime Range (확인 버튼)', { mode: 'datetime', autoClose: false, confirmButton: true,
    startDate: new Date(2026, 10, 5, 9), endDate: new Date(2026, 10, 12, 18) }],
  ['Responsive Range (화면 너비 변경)', { inline: true, responsiveOptions: { breakpoint: 768, mobileMonths: 1, desktopMonths: 2 } }],
];
for (const [title, options] of examples) {
  const heading = document.createElement('h2'); heading.textContent = title;
  const target = document.createElement(options.inline ? 'div' : 'input');
  if (!options.inline) { target.setAttribute('aria-label', title); target.style.width = '360px'; }
  const output = document.createElement('pre');
  document.body.append(heading, target, output);
  DateTimePicker.create(target, { selectionMode: 'range', numberOfMonths: 2, responsive: true, ...options,
    onRangeChange: range => { output.textContent = JSON.stringify(range, null, 2); }
  }, { clear: '초기화', cancel: '취소', rangeStart: '시작', rangeEnd: '종료', selectRangeStart: '시작일 선택', selectRangeEnd: '종료일 선택' });
}
