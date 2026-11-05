import assert from 'node:assert/strict';
import { test, before, after } from 'node:test';
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { DateTimePicker as Picker } from '../dist/index.js';
import { ENGLISH } from './english.mjs';

// 기본 언어는 한국어다. 이 파일은 아무 메시지도 지정하지 않은 기본 상태를 검증한다.
test('default format and parser names are Korean and round trip', () => {
  const date = new Date(2026, 9, 29, 15, 5);
  assert.equal(Picker.format(date, 'YYYY년 MMMM D일 dddd A h:mm'), '2026년 10월 29일 목요일 오후 3:05');
  assert.equal(Picker.format(date, 'MMM ddd a'), '10월 목 오후');
  assert.equal(Picker.format(new Date(2026, 0, 2, 9, 0), 'MMMM dddd A'), '1월 금요일 오전');
  for (const pattern of ['YYYY년 MMMM D일 dddd A h:mm', 'YYYY-MM-DD ddd', 'MMM D, YYYY']) {
    const value = Picker.format(date, pattern);
    assert.equal(Picker.parser(value, pattern)?.getDate(), 29, pattern);
  }
  // 1월 / 10월 / 11월 처럼 앞부분이 같은 이름도 구분한다.
  for (const month of [0, 9, 10, 11]) assert.equal(Picker.parser(`2026-${String(month + 1).padStart(2, '0')}-05 ${month + 1}월`, 'YYYY-MM-DD MMMM')?.getMonth(), month);
  assert.equal(Picker.parser('2026-10-29 목요일', 'YYYY-MM-DD dddd')?.getDate(), 29);
  assert.equal(Picker.parser('2026-10-29 금요일', 'YYYY-MM-DD dddd'), null); // 요일이 날짜와 다르면 거부
  assert.equal(Picker.parser('2026-10-29 Friday', 'YYYY-MM-DD dddd'), null);
});

let browser, page, errors;
before(async () => { browser = await chromium.launch({ headless: true }); });
after(async () => { await browser?.close(); });
const open = async () => {
  page = await browser.newPage({ timezoneId: 'America/New_York' });
  errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setContent('<input id="input"><div id="calendar"></div>');
  await page.addStyleTag({ path: fileURLToPath(new URL('../dist/daracl.datetimepicker.min.css', import.meta.url)) });
  await page.addScriptTag({ path: fileURLToPath(new URL('../dist/daracl.datetimepicker.min.umd.js', import.meta.url)) });
};

test('default UI text is Korean for single and range pickers', async () => {
  await open();
  try {
    await page.clock.setFixedTime('2026-11-05T12:00:00-05:00');
    const ui = await page.evaluate(() => {
      const text = selector => [...document.querySelectorAll(selector)].map(el => el.textContent.trim());
      const single = Daracl.dateTimePicker.create('#calendar', { inline: true, mode: 'datetime', enableTodayBtn: true, initialDate: '2026-11-05 10:00' });
      const out = { weekdays: text('#calendar .ddtp-day-label'), month: text('#calendar .ddtp-header-month'), today: text('#calendar button.ddtp-today'), ok: text('#calendar .time-select') };
      single.destroy();
      Daracl.dateTimePicker.create('#calendar', { inline: true, selectionMode: 'range', confirmButton: true, initialDate: '2026-11-05' });
      Object.assign(out, { status: text('.ddtp-range-status'), buttons: text('.ddtp-range-actions button'), periods: text('#calendar .ddtp-period-select option') });
      return out;
    });
    assert.deepEqual(ui.weekdays, ['일', '월', '화', '수', '목', '금', '토']);
    assert.deepEqual(ui.month, ['11월']);
    assert.deepEqual(ui.today, ['오늘']);
    assert.deepEqual(ui.ok, ['확인']);
    assert.deepEqual(ui.status, ['시작일을 선택하세요']);
    assert.deepEqual(ui.buttons, ['초기화', '확인', '취소']);
    assert.deepEqual(ui.periods, ['기간 선택', '일주일', '1개월', '3개월', '6개월', '1년']);
    // 거부 안내도 한국어 기본 문구다.
    await page.evaluate(() => {
      document.querySelector('#calendar .ddtp-period')?.remove();
      window.picker?.destroy();
      window.picker = Daracl.dateTimePicker.create('#calendar', { inline: true, selectionMode: 'range', minRange: 3, maxRange: '1M', periodSelect: false, initialDate: '2026-11-05' });
    });
    const day = date => page.locator('#calendar .ddtp-day[data-day="11,' + date + '"]:not(.old):not(.new)').first();
    await day(5).click(); await day(6).click();
    assert.equal(await page.locator('.ddtp-range-status').textContent(), '최소 3일 이상 선택하세요.');
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

test('messages can still be replaced per instance and globally', async () => {
  await open();
  try {
    const result = await page.evaluate(english => {
      const text = selector => [...document.querySelectorAll(selector)].map(el => el.textContent.trim());
      // 인스턴스 메시지는 해당 인스턴스만 바꾼다.
      const first = Daracl.dateTimePicker.create('#calendar', { inline: true, selectionMode: 'range', initialDate: '2026-11-05' }, { selectRangeStart: 'Pick a start' });
      const instance = text('.ddtp-range-status');
      first.destroy();
      // 전역 메시지를 바꾸면 이후 생성하는 인스턴스에 적용된다.
      Daracl.dateTimePicker.setMessage(english);
      Daracl.dateTimePicker.create('#calendar', { inline: true, selectionMode: 'range', initialDate: '2026-11-05' });
      return { instance, global: text('.ddtp-range-status'), weekdays: text('#calendar .ddtp-day-label').slice(0, 7), formatted: Daracl.dateTimePicker.format(new Date(2026, 9, 29), 'MMMM dddd') };
    }, ENGLISH);
    assert.deepEqual(result.instance, ['Pick a start']);
    assert.deepEqual(result.global, ['Select start date']);
    assert.deepEqual(result.weekdays, ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
    assert.equal(result.formatted, 'October Thursday');
  } finally { await page.close(); }
});
