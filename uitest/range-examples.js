import { DateTimePicker as Picker } from '../src/index.ts';

// 기존 플레이그라운드의 테마, 공통 옵션, 이벤트 기록과 함께 동작합니다.
export function createRangeExamples(options, recordEvent) {
  let section = document.querySelector('#rangeExamples');
  if (!section) {
    section = document.createElement('section');
    section.id = 'rangeExamples';
    section.className = 'range-examples';
    section.setAttribute('aria-labelledby', 'range-title');
    section.innerHTML = `
      <div class="section-heading"><div><span class="section-index">RANGE MODE</span><h2 id="range-title">시작부터 끝까지, 하나의 기간</h2></div></div>
      <p class="range-intro">시작일과 종료일을 차례로 선택하세요. 화면 너비가 768px 미만이면 달력이 하나로 바뀌고, 선택한 기간은 유지됩니다.</p>
      <div class="range-example-grid">
        <article class="card range-example">
          <div class="card-heading"><div><h3>날짜 기간 · 자동 확정</h3><p>종료일을 선택하면 확정됩니다. 입력창 안쪽의 셀렉트박스로 선택한 종료일 기준 1주~6개월을 바로 채울 수 있고(시작일만 고르면 그 날짜가 종료일이 되고, 아무것도 없으면 오늘 기준이며, 최대 6개월이라 1년은 보이지 않습니다), 직접 고르는 기간도 6개월까지입니다.</p></div></div>
          <div class="range-example-content"><label for="rangeDateInput">여행 기간</label><div class="input-wrap"><input id="rangeDateInput" readonly placeholder="시작일 ~ 종료일" /></div>
          <pre class="range-state" id="rangeDateState" aria-live="polite"></pre>
          <details><summary>사용 코드</summary><pre><code>Picker.create('#rangeDateInput', {
  selectionMode: 'range', mode: 'date',
  maxRange: '6M',        // 최대 6개월 ('3M' · '1Y' · '2W', 숫자는 일 수)
  autoClose: true,       // periodSelect: false 로 프리셋 셀렉트박스를 끌 수 있음
  onChange: ({ value, startDate, endDate, days }) => {
    // 기간이 확정되어 이전 값과 달라졌을 때만 호출 (단일 선택과 같은 모양)
  }
});</code></pre></details></div>
        </article>
        <article class="card range-example">
          <div class="card-heading"><div><h3>날짜와 시간 · 직접 확정</h3><p>시작/종료 시간을 각각 적용한 뒤 확인하세요. 취소하면 이전 확정값으로 돌아갑니다.</p></div></div>
          <div class="range-example-content"><label for="rangeDatetimeInput">예약 일시</label><div class="input-wrap"><input id="rangeDatetimeInput" readonly /></div>
          <pre class="range-state" id="rangeDatetimeState" aria-live="polite"></pre>
          <details><summary>사용 코드</summary><pre><code>Picker.create('#rangeDatetimeInput', {
  selectionMode: 'range', mode: 'datetime',
  confirmButton: true, autoClose: false,
  startDate: new Date(2026, 10, 5, 9),
  endDate: new Date(2026, 10, 12, 18)
});</code></pre></details></div>
        </article>
        <article class="card range-example range-example-wide">
          <div class="card-heading"><div><h3>반응형 달력 · 기간 제한</h3><p>2~10일을 선택할 수 있습니다. 역순 선택은 자동 정렬되며, 오늘부터 5일 뒤의 날짜는 선택할 수 없습니다.</p></div></div>
          <div class="range-inline-layout"><div class="range-calendar-stage" id="rangeInline"></div><div class="range-example-content">
          <pre class="range-state" id="rangeInlineState" aria-live="polite"></pre>
          <details><summary>사용 코드</summary><pre><code>Picker.create('#rangeInline', {
  inline: true, selectionMode: 'range',
  responsive: true, numberOfMonths: 2,
  minRange: 2, maxRange: 10,
  allowReverse: true, confirmButton: true,
  disabledDates: [excludedDate]
});</code></pre></details></div></div>
        </article>
      </div>`;
    document.querySelector('.result-strip').before(section);
  }
  const start = new Date(); start.setHours(9, 0, 0, 0);
  const end = new Date(start); end.setDate(end.getDate() + 7); end.setHours(18);
  const excludedDate = new Date(start); excludedDate.setDate(excludedDate.getDate() + 5);
  const examples = [
    ['rangeDateInput', 'rangeDateState', '날짜 기간', { mode: 'date', maxRange: '6M' }],
    ['rangeDatetimeInput', 'rangeDatetimeState', '일시 기간', { mode: 'datetime', startDate: start, endDate: end, autoClose: false, confirmButton: true }],
    ['rangeInline', 'rangeInlineState', '반응형 기간', { inline: true, mode: 'date', minRange: 2, maxRange: 10, disabledDates: [excludedDate], allowReverse: true, confirmButton: true }],
  ];
  return examples.map(([id, outputId, label, extra]) => {
    let picker;
    let lastChange = '—'; // 마지막으로 받은 onChange 값
    const describe = date => date ? Picker.format(date, extra.mode === 'datetime' ? 'YYYY.MM.DD HH:mm' : 'YYYY.MM.DD') : '—';
    const update = () => {
      const state = picker.getRangeState();
      document.getElementById(outputId).textContent = `시작: ${describe(state.startDate)}\n종료: ${describe(state.endDate)}\n기간: ${state.days}일 · 완료: ${state.complete} · 확정: ${state.committed}\nonChange: ${lastChange}`;
    };
    const record = type => range => {
      update();
      recordEvent(type, label, range ? `${describe(range.startDate)} ~ ${describe(range.endDate)} (${range.days}일)` : '이전 확정값으로 복원');
    };
    picker = Picker.create(`#${id}`, {
      ...options, selectionMode: 'range', initialDate: start, numberOfMonths: 2, responsive: true,
      format: extra.mode === 'datetime' ? 'YYYY.MM.DD HH:mm' : 'YYYY.MM.DD', ...extra,
      onRangeStart: date => recordEvent('rangeStart', label, describe(date)),
      onRangeChange: record('rangeChange'), onRangeComplete: record('rangeComplete'),
      onRangeConfirm: record('rangeConfirm'), onRangeCancel: record('rangeCancel'),
      // onChange: 기간이 확정되어 이전 값과 달라졌을 때만 호출된다. (단일 선택과 같은 { value, startDate, endDate, days })
      onChange: ({ value, startDate, endDate, days }) => {
        lastChange = `value="${value}" · startDate=${describe(startDate)} · endDate=${describe(endDate)} · days=${days}`;
        update();
        document.querySelector('#lastChange').textContent = `onChange · ${label} · ${lastChange}`;
        recordEvent('change', label, lastChange);
      },
    }, {
      clear: '초기화', cancel: '취소', ok: '확인', time: '시간', rangeStart: '시작', rangeEnd: '종료',
      selectRangeStart: '시작일을 선택하세요', selectRangeEnd: '종료일을 선택하세요',
      rangeMin: '최소 {days}일 이상 선택하세요.', rangeMax: '최대 {days}일까지 선택할 수 있습니다.', rangeDisabled: '선택할 수 없는 날짜가 포함되어 있습니다.', rangeTimeOrder: '종료 시간은 시작 시간보다 늦어야 합니다.',
      rangeMaxPeriod: '최대 {period}까지 선택할 수 있습니다.', periodWeeks: '{n}주', periodMonths: '{n}개월', periodYears: '{n}년',
      periodPlaceholder: '기간 선택', period1w: '일주일', period1m: '1개월', period3m: '3개월', period6m: '6개월', period1y: '1년',
    });
    update();
    return picker;
  });
}
