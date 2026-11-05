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
          <div class="card-heading"><div><h3>날짜 기간 · 자동 확정</h3><p>종료일을 선택하면 확정됩니다. 위의 자동 닫기 옵션도 적용됩니다.</p></div></div>
          <div class="range-example-content"><label for="rangeDateInput">여행 기간</label><div class="input-wrap"><input id="rangeDateInput" readonly placeholder="시작일 ~ 종료일" /></div>
          <pre class="range-state" id="rangeDateState" aria-live="polite"></pre>
          <details><summary>사용 코드</summary><pre><code>Picker.create('#rangeDateInput', {
  selectionMode: 'range', mode: 'date',
  autoClose: true
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
    ['rangeDateInput', 'rangeDateState', '날짜 기간', { mode: 'date' }],
    ['rangeDatetimeInput', 'rangeDatetimeState', '일시 기간', { mode: 'datetime', startDate: start, endDate: end, autoClose: false, confirmButton: true }],
    ['rangeInline', 'rangeInlineState', '반응형 기간', { inline: true, mode: 'date', minRange: 2, maxRange: 10, disabledDates: [excludedDate], allowReverse: true, confirmButton: true }],
  ];
  return examples.map(([id, outputId, label, extra]) => {
    let picker;
    const describe = date => date ? Picker.format(date, extra.mode === 'datetime' ? 'YYYY.MM.DD HH:mm' : 'YYYY.MM.DD') : '—';
    const update = () => {
      const state = picker.getRangeState();
      document.getElementById(outputId).textContent = `시작: ${describe(state.startDate)}\n종료: ${describe(state.endDate)}\n기간: ${state.days}일 · 완료: ${state.complete} · 확정: ${state.committed}`;
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
    }, {
      clear: '초기화', cancel: '취소', ok: '확인', time: '시간', rangeStart: '시작', rangeEnd: '종료',
      selectRangeStart: '시작일을 선택하세요', selectRangeEnd: '종료일을 선택하세요',
      rangeMin: '최소 {days}일 이상 선택하세요.', rangeMax: '최대 {days}일까지 선택할 수 있습니다.', rangeDisabled: '선택할 수 없는 날짜가 포함되어 있습니다.', rangeTimeOrder: '종료 시간은 시작 시간보다 늦어야 합니다.',
    });
    update();
    return picker;
  });
}
