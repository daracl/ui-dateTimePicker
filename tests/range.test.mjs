import assert from 'node:assert/strict';
import { test, before, after, beforeEach, afterEach } from 'node:test';
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { ENGLISH } from './english.mjs';

let browser, page, errors;
before(async () => { browser = await chromium.launch({ headless: true }); });
after(async () => { await browser?.close(); });
beforeEach(async () => {
  page = await browser.newPage({ timezoneId: 'America/New_York' });
  page.setDefaultTimeout(5000);
  errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setContent('<input id="input"><div id="calendar"></div><div id="other"></div>');
  await page.addStyleTag({ path: fileURLToPath(new URL('../dist/daracl.datetimepicker.min.css', import.meta.url)) });
  await page.addScriptTag({ path: fileURLToPath(new URL('../dist/daracl.datetimepicker.min.umd.js', import.meta.url)) });
  // 기본 언어는 한국어다. 이 파일의 기존 테스트는 영어 문구를 기대하므로 영어 메시지를 적용한다. (한국어 기본값은 defaults.test.mjs)
  await page.evaluate(message => Daracl.dateTimePicker.setMessage(message), ENGLISH);
});
afterEach(async () => { await page.close(); assert.deepEqual(errors, []); });
const create = async (options = {}, message) => page.evaluate(([options, message]) => {
  window.picker = Daracl.dateTimePicker.create('#calendar', { inline: true, initialDate: '2026-11-05', selectionMode: 'range', ...options }, message);
}, [options, message]);
const day = (month, date, root = '#calendar') => page.locator(`${root} .ddtp-day[data-day="${month},${date}"]`).first();
const state = () => page.evaluate(() => {
  const s = picker.getRangeState();
  return { ...s, startDate: s.startDate && Daracl.dateTimePicker.format(s.startDate, 'YYYY-MM-DD HH:mm'), endDate: s.endDate && Daracl.dateTimePicker.format(s.endDate, 'YYYY-MM-DD HH:mm') };
});

test('range selection, preview, inclusive length, event order, clear and cancel', async () => {
  await page.evaluate(() => {
    window.events = [];
    window.picker = Daracl.dateTimePicker.create('#calendar', { inline: true, selectionMode: 'range', initialDate: '2026-11-05', confirmButton: true,
      onRangeStart: () => events.push('start'), onRangeChange: () => events.push('change'), onRangeComplete: () => events.push('complete'), onRangeConfirm: () => events.push('confirm'), onRangeCancel: () => events.push('cancel') });
  });
  await day(11, 5).locator('span').click();
  assert.equal((await state()).selecting, 'end');
  await day(11, 12).hover();
  assert.equal(await page.locator('.ddtp-range-preview').count(), 8);
  await day(11, 12).click();
  assert.equal((await state()).days, 8);
  assert.equal((await state()).committed, false);
  assert.equal(await page.locator('.ddtp-in-range').count(), 6);
  await page.locator('.ddtp-range-confirm').click();
  assert.equal((await state()).committed, true);
  assert.deepEqual(await page.evaluate(() => events), ['start', 'change', 'change', 'complete', 'confirm']);
  await day(11, 15).click();
  assert.equal((await state()).endDate, null);
  await page.locator('.ddtp-range-cancel').click();
  assert.equal((await state()).days, 8);
  await page.locator('.ddtp-range-clear').click();
  assert.equal((await state()).startDate, null);
  await page.locator('.ddtp-range-cancel').click();
  assert.equal((await state()).days, 8);
});

for (const allowReverse of [false, true]) test(`reverse selection ${allowReverse}`, async () => {
  await create({ allowReverse, autoClose: false });
  await day(11, 12).click(); await day(11, 5).click();
  assert.equal((await state()).complete, allowReverse);
  if (allowReverse) assert.equal((await state()).days, 8);
});
test('selecting a date before the start swaps by default and keeps each endpoint time group', async () => {
  const events = [];
  await create({ autoClose: false, confirmButton: true, mode: 'datetime', format: 'YYYY-MM-DD HH:mm', initialDate: '2026-11-05 00:00' });
  await page.locator('.ddtp-range-time[data-endpoint="start"] .ddtp-hour').fill('09');
  await page.locator('.ddtp-range-time[data-endpoint="end"] .ddtp-hour').fill('18');
  await day(11, 12).click(); await day(11, 5).click();
  const s = await state();
  assert.equal(s.complete, true); assert.equal(s.days, 8);
  assert.match(s.startDate, /^2026-11-05 09:00$/); assert.match(s.endDate, /^2026-11-12 18:00$/);
  assert.equal(await page.locator('.ddtp-range-time[data-endpoint="start"] .ddtp-hour').inputValue(), '09');
  assert.equal(await page.locator('.ddtp-range-time[data-endpoint="end"] .ddtp-hour').inputValue(), '18');
  // 비활성 날짜를 가로지르게 되는 교환은 선택되지 않고 첫 선택이 유지된다.
  await create({ disabledDates: ['2026-11-08'], autoClose: false, confirmButton: true });
  await day(11, 12).click(); await day(11, 5).click();
  const blocked = await state();
  assert.equal(blocked.complete, false); assert.match(blocked.startDate, /^2026-11-12/);
  // 거부 사유가 status 에 표시된다. (비활성 날짜 포함)
  assert.equal(await page.locator('.ddtp-range-status').textContent(), 'The range includes dates that cannot be selected.');
  assert.equal(await page.locator('.ddtp-range-status').evaluate(el => el.classList.contains('ddtp-range-error')), true);
  // 비활성 요일도 같은 방식으로 안내한다.
  await create({ disabledWeekdays: [0], autoClose: false, confirmButton: true });
  await day(11, 5).click(); await day(11, 12).click();
  assert.equal((await state()).complete, false);
  assert.equal(await page.locator('.ddtp-range-status').textContent(), 'The range includes dates that cannot be selected.');
  // 사용자 메시지로 바꿀 수 있고, 유효한 선택은 메시지를 지운다.
  await create({ disabledDates: ['2026-11-10'], autoClose: false, confirmButton: true }, { rangeDisabled: '10일은 선택 불가' });
  await day(11, 6).click(); await day(11, 13).click();
  assert.equal(await page.locator('.ddtp-range-status').textContent(), '10일은 선택 불가');
  await day(11, 9).click();
  assert.equal((await state()).complete, true);
  assert.equal(await page.locator('.ddtp-range-status').evaluate(el => el.classList.contains('ddtp-range-error')), false);
});
for (const allowSameDate of [false, true]) test(`same date ${allowSameDate}`, async () => {
  await create({ allowSameDate });
  await day(11, 5).click(); await day(11, 5).click();
  assert.equal((await state()).complete, allowSameDate);
});

for (const [name, options, first, last, complete] of [
  ['minimum date', { minDate: '2026-11-06' }, 5, 12, false],
  ['maximum date', { maxDate: '2026-11-10' }, 5, 12, false],
  ['minimum length', { minRange: 9 }, 5, 12, false],
  ['maximum length', { maxRange: 7 }, 5, 12, false],
  ['inclusive length', { minRange: 8, maxRange: 8 }, 5, 12, true],
  ['disabled interior', { disabledDates: ['2026-11-08'] }, 5, 12, false],
  ['disabled weekday', { disabledWeekdays: [0] }, 5, 12, false],
]) test(name, async () => {
  await create(options); await day(11, first).click(); await day(11, last).click();
  assert.equal((await state()).complete, complete);
});

for (const [initialDate, first, last, days] of [
  ['2024-02-01', [2, 28], [3, 1], 3],
  ['2026-04-01', [4, 30], [5, 1], 2],
  ['2026-12-01', [12, 31], [1, 1], 2],
]) test(`calendar boundary ${initialDate}`, async () => {
  await create({ initialDate }); await day(...first).click(); await day(...last).click();
  assert.equal((await state()).days, days);
});

for (const autoClose of [false, true]) for (const confirmButton of [false, true]) test(`commit policy autoClose=${autoClose} confirmButton=${confirmButton}`, async () => {
  await page.evaluate(({ autoClose, confirmButton }) => { window.picker = Daracl.dateTimePicker.create('#input', { selectionMode: 'range', initialDate: '2026-11-05', autoClose, confirmButton }); }, { autoClose, confirmButton });
  await page.locator('#input').click();
  await day(11, 5, '.layer').click(); await day(11, 12, '.layer').click();
  assert.equal((await state()).committed, !confirmButton);
  assert.equal(await page.locator('.layer.show').count(), autoClose && !confirmButton ? 0 : 1);
  if (confirmButton) { assert.equal(await page.locator('#input').inputValue(), ''); await page.locator('.ddtp-range-confirm').click(); }
  assert.equal((await state()).committed, true);
  assert.equal(await page.locator('#input').inputValue(), '2026-11-05 ~ 2026-11-12');
  assert.equal(await page.locator('.layer.show').count(), autoClose ? 0 : 1);
});

test('responsive months, consecutive navigation, outside dates and state preservation', async () => {
  await page.setViewportSize({ width: 1200, height: 800 });
  await create({ showOutsideDays: false });
  assert.equal(await page.locator('.ddtp-days').count(), 2);
  const boxes = await page.locator('.ddtp-days').evaluateAll(tables => tables.map(t => { const r = t.getBoundingClientRect(); return { x: r.x, y: r.y }; }));
  assert.equal(boxes[0].y, boxes[1].y); assert.ok(boxes[1].x > boxes[0].x);
  await day(11, 5).click();
  await page.setViewportSize({ width: 390, height: 800 });
  await page.waitForFunction(() => document.querySelectorAll('.ddtp-days').length === 1);
  assert.equal((await state()).selecting, 'end');
  await page.locator('.ddtp-move-btn.next').click();
  assert.match(await page.locator('caption').textContent(), /2026/);
  await day(12, 5).click();
  assert.equal((await state()).days, 31);
  await page.setViewportSize({ width: 1200, height: 800 });
  await page.waitForFunction(() => document.querySelectorAll('.ddtp-days').length === 2);
  assert.equal((await state()).days, 31);
  await page.evaluate(() => picker.destroy());
  await page.setViewportSize({ width: 390, height: 800 });
  assert.equal(await page.locator('.ddtp-days').count(), 0);
});

test('custom responsive options and responsive false', async () => {
  await page.setViewportSize({ width: 700, height: 800 });
  await create({ numberOfMonths: 3, responsiveOptions: { breakpoint: 600, mobileMonths: 1 } });
  assert.equal(await page.locator('.ddtp-days').count(), 3);
  await page.evaluate(() => picker.destroy());
  await create({ responsive: false, numberOfMonths: 2 });
  await page.setViewportSize({ width: 390, height: 800 });
  assert.equal(await page.locator('.ddtp-days').count(), 2);
});

test('datetime independent endpoint controls reject invalid times and preserve caller objects', async () => {
  await page.evaluate(() => {
    window.start = new Date(2026, 10, 5, 9); window.end = new Date(2026, 10, 5, 18);
    window.picker = Daracl.dateTimePicker.create('#calendar', { inline: true, mode: 'datetime', selectionMode: 'range', startDate: start, endDate: end, autoClose: false, confirmButton: true });
  });
  const startHour = page.locator('.ddtp-range-time[data-endpoint="start"] .ddtp-hour');
  const endHour = page.locator('.ddtp-range-time[data-endpoint="end"] .ddtp-hour');
  assert.equal(await page.locator('.ddtp-range-time').count(), 2);
  assert.equal(await page.locator('.time-select').count(), 0);
  assert.equal(await startHour.inputValue(), '09');
  assert.equal(await endHour.inputValue(), '18');
  await startHour.fill('19');
  assert.match((await state()).startDate, /09:00$/);
  assert.equal(await startHour.inputValue(), '09');
  await startHour.fill('10');
  assert.match((await state()).startDate, /10:00$/);
  await page.locator('.ddtp-range-time[data-endpoint="end"] .ddtp-hour-range').fill('20');
  assert.match((await state()).endDate, /20:00$/);
  assert.equal(await endHour.inputValue(), '20');
  await page.locator('.ddtp-range-confirm').click();
  await day(11, 6).click();
  assert.equal((await state()).endDate, null);
  await page.locator('.ddtp-range-cancel').click();
  assert.match((await state()).endDate, /20:00$/);
  assert.deepEqual(await page.evaluate(() => [start.getHours(), end.getHours()]), [9, 18]);
});

test('retaining end date revalidates range and snapshots are isolated', async () => {
  await create({ startDate: '2026-11-05', endDate: '2026-11-12', resetRangeOnStart: false, confirmButton: true });
  await day(11, 6).click(); assert.equal((await state()).days, 7);
  await page.evaluate(() => picker.getRange().startDate.setFullYear(2000));
  assert.match((await state()).startDate, /^2026/);
  await day(11, 15).click(); assert.equal((await state()).endDate, null);
});

test('veto hooks, instance isolation and legacy redraw hooks', async () => {
  await page.evaluate(() => {
    window.draws = 0; window.veto = true; window.selected = 0;
    window.picker = Daracl.dateTimePicker.create('#calendar', { inline: true, selectionMode: 'range', initialDate: '2026-11-05',
      beforeSelectRange: () => !veto, onSelect: () => { selected++; return false; },
      beforeChangeDatepicker: (_value, done) => done(true), afterChangeDatepicker: () => draws++ });
    window.other = Daracl.dateTimePicker.create('#other', { inline: true, selectionMode: 'range' });
  });
  assert.equal(await page.evaluate(() => draws), 1);
  await day(11, 5).click(); assert.equal(await page.evaluate(() => selected), 0);
  await page.evaluate(() => { veto = false; });
  await day(11, 5).click(); assert.equal((await state()).startDate, null);
  assert.equal(await page.evaluate(() => other.getRange().startDate), null);
  await page.evaluate(() => { picker.destroy(); picker.destroy(); other.destroy(); });
  assert.equal(await page.locator('.ddtp-days').count(), 0);
});

test('dark theme uses themed range colors', async () => {
  await page.addStyleTag({ path: fileURLToPath(new URL('../dist/theme-vars.css', import.meta.url)) });
  await create({ startDate: '2026-11-05', endDate: '2026-11-12' });
  const colors = () => page.locator('.ddtp-in-range').first().evaluate(el => ({ bg: getComputedStyle(el).backgroundColor, fg: getComputedStyle(el).color }));
  const light = await colors();
  await page.evaluate(() => document.documentElement.setAttribute('data-daracl-theme', 'dark'));
  const dark = await colors();
  assert.notEqual(light.bg, dark.bg); assert.notEqual(dark.bg, dark.fg);
});

for (const confirmButton of [false, true]) test(`cleared range can be committed ${confirmButton}`, async () => {
  await create({ startDate: '2026-11-05', endDate: '2026-11-12', confirmButton });
  await page.locator('.ddtp-range-clear').click();
  if (confirmButton) await page.locator('.ddtp-range-confirm').click();
  assert.equal((await state()).committed, true);
  await day(11, 15).click(); await page.locator('.ddtp-range-cancel').click();
  assert.equal((await state()).startDate, null); assert.equal((await state()).committed, true);
});

test('datetime same-day selection and keyboard selection use valid endpoint times', async () => {
  await create({ mode: 'datetime', initialDate: '2026-11-05 09:30', autoClose: false });
  await day(11, 5).focus(); await page.keyboard.press('Enter');
  await day(11, 5).focus(); await page.keyboard.press('Space');
  assert.equal((await state()).days, 1); assert.match((await state()).endDate, /09:30$/);
});

test('inclusive days survive DST transitions and callback Date mutation', async () => {
  await page.evaluate(() => {
    window.picker = Daracl.dateTimePicker.create('#calendar', { inline: true, selectionMode: 'range', initialDate: '2026-03-01', onRangeChange: range => range.startDate?.setFullYear(2000) });
  });
  await day(3, 7).click(); await day(3, 9).click();
  assert.equal((await state()).days, 3); assert.match((await state()).startDate, /^2026/);
});

test('range options fail early without DOM changes and single mode ignores range options', async () => {
  const result = await page.evaluate(() => {
    const invalid = [{ mode: 'time' }, { startDate: 'bad' },
      { startDate: '2026-11-12', endDate: '2026-11-05' }, { numberOfMonths: 0 }, { minRange: -1 },
      { maxRange: 0 }, { disabledWeekdays: [7] }, { responsiveOptions: { breakpoint: -1 } }];
    const failures = invalid.map(options => {
      try { Daracl.dateTimePicker.create('#calendar', { inline: true, selectionMode: 'range', ...options }); return false; }
      catch { return true; }
    });
    const unchanged = document.querySelector('#calendar').innerHTML === '';
    const single = Daracl.dateTimePicker.create('#calendar', { inline: true, numberOfMonths: 0, startDate: 'bad' });
    return { failures, unchanged, months: document.querySelectorAll('.ddtp-days').length };
  });
  assert.ok(result.failures.every(Boolean)); assert.equal(result.unchanged, true); assert.equal(result.months, 1);
});

test('closing with Escape or an outside click cancels an unconfirmed selection', async () => {
  for (const close of ['escape', 'outside']) {
    await page.evaluate(() => {
      window.picker?.destroy(); window.cancels = 0;
      window.picker = Daracl.dateTimePicker.create('#input', { selectionMode: 'range', confirmButton: true, startDate: '2026-11-05', endDate: '2026-11-12', onRangeCancel: () => cancels++ });
    });
    await page.locator('#input').click();
    await day(11, 20, '.daracl-datetime-wrapper.show').click();
    assert.equal((await state()).complete, false);
    if (close === 'escape') await page.keyboard.press('Escape'); else await page.locator('#other').evaluate(el => el.click());
    assert.equal(await page.locator('.daracl-datetime-wrapper.show').count(), 0, close);
    const restored = await state();
    assert.equal(restored.complete, true, close);
    assert.match(restored.startDate, /2026-11-05/); assert.match(restored.endDate, /2026-11-12/);
    assert.equal(await page.locator('#input').inputValue(), '2026-11-05 ~ 2026-11-12', close);
    assert.equal(await page.evaluate(() => cancels), 1, close);
  }
  // 확정된 값이 그대로면 취소 콜백이 호출되지 않는다.
  await page.evaluate(() => { cancels = 0; });
  await page.locator('#input').click(); await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(() => cancels), 0);
});

test('a single initial startDate or endDate fills both ends unless the range rules reject it', async () => {
  const init = options => page.evaluate(options => {
    window.picker?.destroy();
    window.picker = Daracl.dateTimePicker.create('#calendar', { inline: true, selectionMode: 'range', ...options });
  }, options);
  await init({ startDate: '2026-11-05' });
  let s = await state();
  assert.equal(s.complete, true); assert.equal(s.committed, true); assert.equal(s.days, 1);
  assert.match(s.startDate, /^2026-11-05/); assert.match(s.endDate, /^2026-11-05/);
  await init({ endDate: '2026-11-12' });
  s = await state();
  assert.match(s.startDate, /^2026-11-12/); assert.match(s.endDate, /^2026-11-12/);
  // 시간이 있는 모드에서는 시간도 그대로 채운다.
  await init({ mode: 'datetime', startDate: '2026-11-05 09:30' });
  s = await state();
  assert.match(s.startDate, /2026-11-05 09:30$/); assert.match(s.endDate, /2026-11-05 09:30$/);
  // 규칙에 맞지 않으면 채우지 않고 기존처럼 시작일만 남는다.
  await init({ startDate: '2026-11-05', minRange: 2 });
  s = await state();
  assert.equal(s.complete, false); assert.equal(s.endDate, null); assert.equal(s.selecting, 'end');
  // 규칙에 맞지 않는 종료일만 있는 경우는 기존처럼 오류다.
  await assert.rejects(init({ endDate: '2026-11-05', allowSameDate: false }), /Invalid initial range/);
  // 둘 다 있으면 그대로 둔다.
  await init({ startDate: '2026-11-05', endDate: '2026-11-12' });
  assert.equal((await state()).days, 8);
});

test('an end date outside minRange or maxRange shows a prominent status message until the next valid action', async () => {
  const status = page.locator('.ddtp-range-status');
  await create({ minRange: 3, maxRange: 5, autoClose: false, confirmButton: true });
  await day(11, 5).click(); await day(11, 6).click();
  assert.equal((await state()).complete, false);
  assert.equal(await status.textContent(), 'Select at least 3 days.');
  assert.equal(await status.evaluate(el => el.classList.contains('ddtp-range-error')), true);
  assert.equal(await status.getAttribute('aria-live'), 'assertive');
  // 오류가 색으로도 구분되어야 한다 (일반 상태와 글자색이 다르다).
  const errorColor = await status.evaluate(el => getComputedStyle(el).color);
  await day(11, 20).click();
  assert.equal(await status.textContent(), 'You can select up to 5 days.');
  // 호버 미리보기로 다시 그려져도 메시지가 유지된다.
  await day(11, 8).hover();
  assert.equal(await status.textContent(), 'You can select up to 5 days.');
  // 유효한 종료일을 고르면 메시지가 사라진다.
  await day(11, 8).click();
  assert.equal((await state()).days, 4);
  assert.equal(await status.evaluate(el => el.classList.contains('ddtp-range-error')), false);
  assert.match(await status.textContent(), /\(4\)$/);
  assert.notEqual(await status.evaluate(el => getComputedStyle(el).color), errorColor);
  // 다시 시작일을 고르거나 취소하면 오류가 남지 않는다.
  await day(11, 1).click(); await day(11, 2).click();
  assert.match(await status.textContent(), /^Select at least 3 days/);
  await page.locator('.ddtp-range-cancel').click();
  assert.equal(await status.evaluate(el => el.classList.contains('ddtp-range-error')), false);
  // allowSameDate: false 는 최소 2일이다. 사용자 메시지도 {days} 를 치환한다.
  await create({ allowSameDate: false, autoClose: false }, { rangeMin: '최소 {days}일' });
  await day(11, 5).click(); await day(11, 5).click();
  assert.equal(await status.textContent(), '최소 2일');
  assert.equal((await state()).complete, false);
});

test('pressing a rejected end date again restarts the range from that date', async () => {
  const status = page.locator('.ddtp-range-status');
  await page.evaluate(() => {
    window.starts = [];
    window.picker = Daracl.dateTimePicker.create('#calendar', { inline: true, initialDate: '2026-11-05', selectionMode: 'range', disabledDates: ['2026-11-10'], autoClose: false, confirmButton: true, onRangeStart: date => starts.push(date.getDate()) });
  });
  await day(11, 6).click(); await day(11, 13).click();
  assert.equal(await status.textContent(), 'The range includes dates that cannot be selected.');
  // 같은 날짜를 다시 누르면 그 날짜가 시작일이 되고 오류 표시는 사라진다.
  await day(11, 13).click();
  const restarted = await state();
  assert.equal(restarted.complete, false); assert.match(restarted.startDate, /^2026-11-13/); assert.equal(restarted.endDate, null); assert.equal(restarted.selecting, 'end');
  assert.equal(await status.evaluate(el => el.classList.contains('ddtp-range-error')), false);
  assert.equal(await status.textContent(), 'Select end date');
  assert.deepEqual(await page.evaluate(() => starts), [6, 13]);
  await day(11, 15).click();
  assert.equal((await state()).days, 3);
  // 다른 날짜를 누르면 기존처럼 종료일로 처리한다.
  await day(11, 1).click(); await day(11, 20).click();
  assert.equal(await status.evaluate(el => el.classList.contains('ddtp-range-error')), true);
  await day(11, 2).click();
  assert.match((await state()).startDate, /^2026-11-01/); assert.match((await state()).endDate, /^2026-11-02/);
  // 길이 제한(minRange)으로 거부된 날짜도 같은 방식으로 시작일이 된다.
  await create({ minRange: 3, autoClose: false, confirmButton: true });
  await day(11, 5).click(); await day(11, 6).click();
  assert.equal(await status.evaluate(el => el.classList.contains('ddtp-range-error')), true);
  await day(11, 6).click();
  assert.match((await state()).startDate, /^2026-11-06/); assert.equal((await state()).complete, false);
});

test('disabled days are drawn with a hatch pattern, strike-through and a not-allowed cursor', async () => {
  await create({ disabledDates: ['2026-11-10'], autoClose: false });
  const style = await day(11, 10).evaluate(cell => { const css = getComputedStyle(cell), span = getComputedStyle(cell.querySelector('span')); return { image: css.backgroundImage, cursor: css.cursor, line: span.textDecorationLine }; });
  assert.match(style.image, /repeating-linear-gradient/);
  assert.equal(style.cursor, 'not-allowed');
  assert.equal(style.line, 'line-through');
  const normal = await day(11, 9).evaluate(cell => ({ image: getComputedStyle(cell).backgroundImage, line: getComputedStyle(cell.querySelector('span')).textDecorationLine }));
  assert.equal(normal.image, 'none'); assert.equal(normal.line, 'none');
});

test('pressing the end date of a complete range keeps the start and re-selects only the end', async () => {
  for (const resetRangeOnStart of [true, false]) {
    await page.evaluate(resetRangeOnStart => {
      window.picker?.destroy(); window.log = [];
      window.picker = Daracl.dateTimePicker.create('#calendar', { inline: true, initialDate: '2026-11-05', selectionMode: 'range', autoClose: false, confirmButton: true, resetRangeOnStart,
        onRangeStart: date => log.push('start' + date.getDate()), onRangeChange: range => log.push(range.complete ? 'change-complete' : 'change-partial'), onRangeComplete: () => log.push('complete') });
    }, resetRangeOnStart);
    await day(11, 6).click(); await day(11, 12).click();
    assert.equal((await state()).complete, true);
    await page.evaluate(() => { log.length = 0; });
    await day(11, 12).click();
    const reopened = await state();
    assert.equal(reopened.complete, false, String(resetRangeOnStart)); assert.match(reopened.startDate, /^2026-11-06/); assert.equal(reopened.endDate, null); assert.equal(reopened.selecting, 'end');
    assert.deepEqual(await page.evaluate(() => log), ['change-partial']); // onRangeStart 는 다시 호출되지 않는다.
    assert.equal(await page.locator('.ddtp-range-confirm').isDisabled(), true);
    await day(11, 15).click();
    assert.equal((await state()).days, 10);
    assert.deepEqual(await page.evaluate(() => log), ['change-partial', 'change-complete', 'complete']);
  }
});

test('a double click or a held key on the end date does not undo the range it just completed', async () => {
  await create({ autoClose: false, confirmButton: true });
  await day(11, 6).click();
  await day(11, 12).dblclick(); // 첫 클릭이 종료일을 확정하고, 두 번째 클릭(detail 2)은 무시된다.
  const afterDouble = await state();
  assert.equal(afterDouble.complete, true); assert.match(afterDouble.endDate, /^2026-11-12/);
  // 완료된 기간의 종료일에서 Enter 를 누르면 재선택, 길게 눌러 생기는 반복 입력은 무시한다.
  await day(11, 12).focus();
  await page.keyboard.press('Enter');
  assert.equal((await state()).complete, false);
  await day(11, 12).evaluate(cell => cell.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', repeat: true, bubbles: true })));
  assert.equal((await state()).complete, false);
  await page.keyboard.press('Enter');
  assert.equal((await state()).complete, true);
});

test('a same-day end time earlier than the start time is rejected with a message', async () => {
  const status = page.locator('.ddtp-range-status');
  await create({ mode: 'datetime', format: 'YYYY-MM-DD HH:mm', initialDate: '2026-11-05 00:00', autoClose: false, confirmButton: true });
  await page.locator('.ddtp-range-time[data-endpoint="start"] .ddtp-hour').fill('18');
  await page.locator('.ddtp-range-time[data-endpoint="end"] .ddtp-hour').fill('09');
  await day(11, 6).click(); await day(11, 6).click();
  assert.equal((await state()).complete, false);
  assert.equal(await status.textContent(), 'The end time must be later than the start time.');
  assert.equal(await status.evaluate(el => el.classList.contains('ddtp-range-error')), true);
  // 종료 시간을 시작 시간보다 늦게 고쳐서 같은 날짜를 다시 고르면 완료된다. (거부 직후 같은 날짜 재클릭은 새 시작일이므로 다른 날짜로 확인)
  await page.locator('.ddtp-range-time[data-endpoint="end"] .ddtp-hour').fill('20');
  await day(11, 8).click();
  assert.equal((await state()).complete, true);
  // 완료된 기간에서 시간 입력을 같은 날짜의 역전 값으로 바꾸면 거부 사유를 보여주고 이전 값으로 되돌린다.
  await create({ mode: 'datetime', format: 'YYYY-MM-DD HH:mm', startDate: '2026-11-05 09:00', endDate: '2026-11-05 18:00', autoClose: false, confirmButton: true });
  await page.locator('.ddtp-range-time[data-endpoint="start"] .ddtp-hour').fill('19');
  assert.equal(await status.textContent(), 'The end time must be later than the start time.');
  assert.match((await state()).startDate, /09:00$/);
  assert.equal(await page.locator('.ddtp-range-time[data-endpoint="start"] .ddtp-hour').inputValue(), '09');
});

test('range painting keeps aria state correct and only writes DOM values that changed', async () => {
  await create({ disabledDates: ['2026.11.10'], showOutsideDays: false, autoClose: false, confirmButton: true, format: 'YYYY.MM.DD', initialDate: '2026.11.05' });
  const attrs = (month, date) => day(month, date).evaluate(cell => ({ selected: cell.getAttribute('aria-selected'), disabled: cell.getAttribute('aria-disabled'), tab: cell.getAttribute('tabindex'), label: cell.getAttribute('aria-label') }));
  // 처음 그린 상태: 속성이 템플릿에 들어 있다.
  assert.deepEqual(await attrs(11, 9), { selected: 'false', disabled: 'false', tab: '0', label: '2026.11.09' });
  assert.deepEqual(await attrs(11, 10), { selected: 'false', disabled: 'true', tab: '-1', label: '2026.11.10' });
  assert.equal(await page.locator('#calendar .ddtp-outside-hidden').first().getAttribute('tabindex'), '-1');
  await day(11, 5).click();
  // 마우스 미리보기: 같은 칸(또는 칸 안의 span)을 다시 지나가도 DOM 을 쓰지 않는다.
  const records = await page.evaluate(() => {
    const target = document.querySelector('#calendar'), cell = date => document.querySelector(`#calendar .ddtp-day[data-day="11,${date}"]`);
    const count = fn => { const observer = new MutationObserver(() => {}); observer.observe(target, { attributes: true, childList: true, subtree: true }); fn(); const list = observer.takeRecords(); observer.disconnect(); return list; };
    const over = el => el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    const first = count(() => over(cell(8)));
    return { first: first.length, firstAttrs: first.filter(r => r.attributeName !== 'class').length, same: count(() => over(cell(8))).length, span: count(() => over(cell(8).querySelector('span'))).length,
      previewed: [...document.querySelectorAll('#calendar .ddtp-range-preview')].map(el => el.getAttribute('data-day')),
      leave: count(() => document.querySelector('#calendar .ddtp-range-months').dispatchEvent(new MouseEvent('mouseleave'))).length,
      leaveAgain: count(() => document.querySelector('#calendar .ddtp-range-months').dispatchEvent(new MouseEvent('mouseleave'))).length };
  });
  assert.equal(records.same, 0); assert.equal(records.span, 0);
  assert.equal(records.firstAttrs, 0); // 미리보기는 클래스만 바꾼다. (aria 속성은 다시 쓰지 않는다)
  assert.ok(records.first > 0 && records.first <= 8, String(records.first)); // 5~8일 칸의 클래스 변경 정도
  assert.deepEqual(records.previewed, ['11,5', '11,6', '11,7', '11,8']);
  assert.ok(records.leave > 0 && records.leave <= 8); assert.equal(records.leaveAgain, 0);
  // 선택 상태는 aria-selected 에 정확히 반영된다. 비활성 날짜(10일)는 기간 안에 들 수 없으므로 5~8일로 확인한다.
  await day(11, 8).click();
  for (const [date, expected] of [[4, 'false'], [5, 'true'], [6, 'true'], [8, 'true'], [9, 'false']]) assert.equal((await attrs(11, date)).selected, expected, String(date));
  // 다시 그려도(월 이동/크기 변경) 속성 갱신 기록이 칸 수(84)만큼 늘지 않는다.
  const redraw = await page.evaluate(() => { const target = document.querySelector('#calendar'); const observer = new MutationObserver(() => {}); observer.observe(target, { attributes: true, childList: true, subtree: true }); picker.refresh(false); const list = observer.takeRecords(); observer.disconnect(); return { total: list.length, attrs: list.filter(r => r.type === 'attributes').length }; });
  assert.ok(redraw.attrs < 30, JSON.stringify(redraw));
  assert.deepEqual(await attrs(11, 6), { selected: 'true', disabled: 'false', tab: '0', label: '2026.11.06' });
});

const createLayer = (options = {}, message) => page.evaluate(([options, message]) => {
  window.picker?.destroy();
  window.picker = Daracl.dateTimePicker.create('#input', { selectionMode: 'range', format: 'YYYY-MM-DD', ...options }, message);
}, [options, message]);

test('period select fills a recent range that ends today, commits it and follows manual changes', async () => {
  await page.clock.setFixedTime('2026-11-05T12:00:00-05:00');
  await createLayer();
  const select = page.locator('#input + select.ddtp-period-select');
  assert.equal(await select.count(), 1);
  assert.deepEqual(await select.locator('option').allTextContents(), ['Period', '1 week', '1 month', '3 months', '6 months', '1 year']);
  assert.equal(await select.inputValue(), '');
  for (const [key, expected] of [['1w', '2026-10-29 ~ 2026-11-05'], ['1m', '2026-10-05 ~ 2026-11-05'], ['3m', '2026-08-05 ~ 2026-11-05'], ['6m', '2026-05-05 ~ 2026-11-05'], ['1y', '2025-11-05 ~ 2026-11-05']]) {
    await select.selectOption(key);
    assert.equal(await page.locator('#input').inputValue(), expected, key);
    assert.equal(await select.inputValue(), key);
    const range = await page.evaluate(() => picker.getRangeState());
    assert.equal(range.complete, true); assert.equal(range.committed, true);
  }
  // 직접 기간을 바꾸면 프리셋 선택이 해제되고, 안내 문구를 고르면 현재 기간이 유지된다.
  await page.evaluate(() => picker.clearRange());
  assert.equal(await select.inputValue(), '');
  await select.selectOption('1m');
  await select.selectOption('');
  assert.equal(await select.inputValue(), '1m');
  assert.equal(await page.locator('#input').inputValue(), '2026-10-05 ~ 2026-11-05');
});

test('period presets respect month ends and are disabled when the range rules reject them', async () => {
  await page.clock.setFixedTime('2026-05-31T12:00:00-04:00');
  const disabledOf = () => page.locator('#input + select option').evaluateAll(options => options.filter(option => option.disabled).map(option => option.value));
  await createLayer({ maxRange: '1M' });
  assert.deepEqual(await disabledOf(), ['3m', '6m', '1y']);
  await page.locator('#input + select').selectOption('1m'); // 5/31 의 1개월은 말일을 보정한 4/30 ~ 5/31 이고 maxRange '1M' 에 맞는다.
  assert.equal(await page.locator('#input').inputValue(), '2026-04-30 ~ 2026-05-31');
  await createLayer({ maxRange: '3M' });
  assert.deepEqual(await disabledOf(), ['6m', '1y']);
  await createLayer({ maxRange: 30 }); // 숫자는 일 수: 1주(8일)만 가능
  assert.deepEqual(await disabledOf(), ['1m', '3m', '6m', '1y']);
  await createLayer({ maxRange: '1Y' });
  assert.deepEqual(await disabledOf(), []);
  // 비활성 날짜가 기간 안에 들어가는 프리셋은 비활성이다.
  await createLayer({ disabledDates: ['2026-05-20'] });
  assert.deepEqual(await disabledOf(), ['1m', '3m', '6m', '1y']);
  // minDate 보다 이전으로 가는 프리셋도 비활성이다.
  await createLayer({ minDate: '2026-03-01' }); // 5/31 의 3개월 전은 2/28 이라 3/1 보다 이르다.
  assert.deepEqual(await disabledOf(), ['3m', '6m', '1y']);
});

test('maxRange accepts days, weeks, months and years and measures calendar units from the end date', async () => {
  const check = specs => page.evaluate(specs => specs.map(([maxRange, start, end]) => {
    const picker = Daracl.dateTimePicker.create('#calendar', { inline: true, selectionMode: 'range', maxRange });
    const result = picker.validRange(new Date(...start), new Date(...end));
    picker.destroy();
    return result;
  }), specs);
  assert.deepEqual(await check([
    ['3M', [2026, 10, 5], [2027, 1, 5]], ['3M', [2026, 10, 5], [2027, 1, 6]],
    ['3M', [2026, 10, 30], [2027, 1, 28]], ['3M', [2026, 10, 30], [2027, 2, 1]],
    ['1M', [2026, 0, 31], [2026, 1, 28]], ['1M', [2026, 0, 31], [2026, 2, 1]],
    ['1Y', [2026, 10, 5], [2027, 10, 5]], ['1Y', [2026, 10, 5], [2027, 10, 6]],
    ['1Y', [2027, 1, 28], [2028, 1, 29]], ['1y', [2027, 1, 28], [2028, 1, 29]],
    ['2W', [2026, 10, 5], [2026, 10, 19]], ['2W', [2026, 10, 5], [2026, 10, 20]],
    [30, [2026, 10, 5], [2026, 11, 4]], [30, [2026, 10, 5], [2026, 11, 5]],
    ['30', [2026, 10, 5], [2026, 11, 4]], ['30', [2026, 10, 5], [2026, 11, 5]],
    ['30D', [2026, 10, 5], [2026, 11, 4]], [' 30 d ', [2026, 10, 5], [2026, 11, 5]],
  ]), [true, false, true, false, true, false, true, false, true, true, true, false, true, false, true, false, true, false]);
  const rejected = await page.evaluate(() => ['abc', '3X', '', '0M', '-1M', 0, -1, 1.5, '1.5M', {}].map(maxRange => {
    try { Daracl.dateTimePicker.create('#calendar', { inline: true, selectionMode: 'range', maxRange }).destroy(); return false; } catch (error) { return error instanceof RangeError; }
  }));
  assert.ok(rejected.every(Boolean), rejected.join());
  // maxRange 를 단일 선택에서는 무시한다.
  assert.equal(await page.evaluate(() => { const single = Daracl.dateTimePicker.create('#calendar', { inline: true, maxRange: 'bad' }); single.destroy(); return true; }), true);
});

test('an end date beyond a unit based maxRange is rejected with a period message', async () => {
  const status = page.locator('.ddtp-range-status');
  await create({ maxRange: '3M', numberOfMonths: 6, responsive: false, autoClose: false, confirmButton: true });
  await day(11, 5).click(); await day(2, 6).click();
  assert.equal((await state()).complete, false);
  assert.equal(await status.textContent(), 'You can select up to 3 month(s).');
  assert.equal(await status.evaluate(el => el.classList.contains('ddtp-range-error')), true);
  await day(2, 5).click();
  assert.equal((await state()).complete, true); assert.equal((await state()).days, 93);
  await create({ maxRange: '2W', autoClose: false, confirmButton: true }, { rangeMaxPeriod: '최대 {period}', periodWeeks: '{n}주' });
  await day(11, 5).click(); await day(11, 20).click();
  assert.equal(await status.textContent(), '최대 2주');
  await create({ maxRange: 5, autoClose: false, confirmButton: true });
  await day(11, 5).click(); await day(11, 12).click();
  assert.equal(await status.textContent(), 'You can select up to 5 days.');
});

test('period select placement, options, text safety, destroy and veto handling', async () => {
  await page.clock.setFixedTime('2026-11-05T12:00:00-05:00');
  // inline: 달력 위에 한 줄로 들어가고, destroy 하면 원래 내용으로 돌아간다.
  await create({});
  assert.equal(await page.locator('#calendar .ddtp-period > select.ddtp-period-select').count(), 1);
  await page.locator('#calendar select').selectOption('1w');
  assert.equal((await state()).complete, true); assert.match((await state()).startDate, /^2026-10-29/);
  await page.evaluate(() => picker.destroy());
  assert.equal(await page.locator('#calendar select').count(), 0);
  // periodSelect: false 이면 만들지 않는다. 단일 선택에서도 만들지 않는다.
  await create({ periodSelect: false });
  assert.equal(await page.locator('#calendar select').count(), 0);
  await page.evaluate(() => { picker.destroy(); window.picker = Daracl.dateTimePicker.create('#calendar', { inline: true }); });
  assert.equal(await page.locator('#calendar select').count(), 0);
  // 레이어: 입력창 바로 뒤에 하나만 있고, 같은 요소에 다시 만들거나 destroy 하면 정리된다.
  await createLayer(); await createLayer();
  assert.equal(await page.locator('#input + select').count(), 1);
  assert.equal(await page.locator('select.ddtp-period-select').count(), 1);
  await page.evaluate(() => picker.destroy());
  assert.equal(await page.locator('select.ddtp-period-select').count(), 0);
  // 문구는 HTML 이 아니라 텍스트로 들어간다.
  await createLayer({}, { period1m: '<img src=x onerror=alert(1)>', periodPlaceholder: '"><b>x</b>' });
  assert.equal(await page.locator('#input + select img, #input + select b').count(), 0);
  assert.equal(await page.locator('#input + select option[value="1m"]').textContent(), '<img src=x onerror=alert(1)>');
  // beforeSelectRange 가 거부하면 입력과 선택 상태가 그대로 돌아온다.
  await page.evaluate(() => { picker.destroy(); window.picker = Daracl.dateTimePicker.create('#input', { selectionMode: 'range', format: 'YYYY-MM-DD', beforeSelectRange: () => false }); });
  await page.locator('#input + select').selectOption('1m');
  assert.equal(await page.locator('#input + select').inputValue(), '');
  assert.equal(await page.locator('#input').inputValue(), '');
  // datetime: 시간은 시작 / 종료 시간 그룹의 값을 따른다.
  await page.evaluate(() => { picker.destroy(); window.picker = Daracl.dateTimePicker.create('#calendar', { inline: true, selectionMode: 'range', mode: 'datetime', format: 'YYYY-MM-DD HH:mm', initialDate: '2026-11-05 00:00' }); });
  await page.locator('.ddtp-range-time[data-endpoint="start"] .ddtp-hour').fill('09');
  await page.locator('.ddtp-range-time[data-endpoint="end"] .ddtp-hour').fill('18');
  await page.locator('#calendar select').selectOption('1w');
  assert.match((await state()).startDate, /^2026-10-29 09:00$/); assert.match((await state()).endDate, /^2026-11-05 18:00$/);
});

test('period select sits inside the input box as one control and the input is restored on destroy', async () => {
  await page.evaluate(() => { document.querySelector('#input').style.cssText = 'width:300px;padding-right:10px'; });
  await createLayer();
  await page.evaluate(() => { document.querySelector('#input').value = 'keep me'; }); // range 는 생성할 때 확정값이 없으면 입력창을 비우므로, 생성 뒤에 값을 넣는다.
  const layout = await page.evaluate(() => {
    const input = document.querySelector('#input'), field = input.parentElement, select = input.nextElementSibling;
    const i = input.getBoundingClientRect(), s = select.getBoundingClientRect();
    return { tag: field.tagName, className: field.className, order: [input.id, select.className],
      inside: s.left >= i.left && s.right <= i.right && s.top >= i.top && s.bottom <= i.bottom, selectWidth: s.width, padding: parseFloat(getComputedStyle(input).paddingRight) };
  });
  assert.equal(layout.tag, 'DDTP-PERIOD-FIELD'); // span · div 가 아닌 사용자 정의 태그라 호스트의 일반 태그 CSS 에 걸리지 않는다.
  assert.match(layout.className, /ddtp-period-field/);
  assert.deepEqual(layout.order, ['input', 'ddtp-period-select']);
  assert.equal(layout.inside, true);
  assert.ok(layout.padding >= layout.selectWidth + 10, 'input text must not run under the select: ' + JSON.stringify(layout));
  // 입력창을 누르면 여전히 달력이 열리고, 셀렉트박스에서 고르면 기간이 입력창에 채워진다.
  await page.locator('#input').click({ position: { x: 20, y: 5 } });
  assert.equal(await page.locator('.daracl-datetime-wrapper.show').count(), 1);
  await page.keyboard.press('Escape');
  await page.locator('#input + select').selectOption('1w');
  assert.match(await page.locator('#input').inputValue(), / ~ /);
  // destroy: 입력창이 원래 자리로 돌아오고 지정했던 스타일(여백)이 복원된다.
  await page.evaluate(() => picker.destroy());
  const restored = await page.evaluate(() => { const input = document.querySelector('#input'); return { parent: input.parentElement.tagName, wrappers: document.querySelectorAll('ddtp-period-field, select').length, padding: getComputedStyle(input).paddingRight, width: getComputedStyle(input).width, value: input.value }; });
  assert.match(restored.value, /^\d{4}-\d{2}-\d{2} ~ \d{4}-\d{2}-\d{2}$/); // 셀렉트로 채운 입력값은 destroy 후에도 그대로 유지된다.
  assert.deepEqual({ ...restored, value: '' }, { parent: 'BODY', wrappers: 0, padding: '10px', width: '300px', value: '' });
  // 스타일이 없던 입력창은 style 속성이 남지 않는다.
  await page.evaluate(() => { const input = document.querySelector('#input'); input.removeAttribute('style'); });
  await createLayer();
  await page.evaluate(() => picker.destroy());
  assert.equal(await page.locator('#input').getAttribute('style'), null);
  // 같은 입력창에 다시 만들어도 감싸는 요소가 겹치지 않는다.
  await createLayer(); await createLayer();
  assert.equal(await page.locator('ddtp-period-field').count(), 1);
  assert.equal(await page.locator('ddtp-period-field > #input').count(), 1);
});

test('presets that exceed maxRange are hidden and the whole select disappears when none fit', async () => {
  await page.clock.setFixedTime('2026-11-05T12:00:00-05:00');
  const base = await page.evaluate(() => getComputedStyle(document.querySelector('#input')).paddingRight); // 감싸기 전 원래 여백
  const shown = () => page.locator('#input + select option').evaluateAll(options => options.filter(option => !option.hidden).map(option => option.value));
  await createLayer({ maxRange: '6M' });
  assert.deepEqual(await shown(), ['', '1w', '1m', '3m', '6m']); // 1년은 보이지 않는다.
  await createLayer({ maxRange: '3M' });
  assert.deepEqual(await shown(), ['', '1w', '1m', '3m']);
  await createLayer({ maxRange: '1Y' });
  assert.deepEqual(await shown(), ['', '1w', '1m', '3m', '6m', '1y']);
  await createLayer();
  assert.deepEqual(await shown(), ['', '1w', '1m', '3m', '6m', '1y']);
  // 숫자는 일 수다. 8일이면 1주(10/29 ~ 11/5, 8일)만 들어간다.
  await createLayer({ maxRange: 8 });
  assert.deepEqual(await shown(), ['', '1w']);
  assert.equal(await page.locator('#input + select').evaluate(el => el.hidden), false);
  // 6일이면 고를 수 있는 항목이 없으므로 셀렉트박스 자체를 숨기고, 입력창 여백도 원래대로 둔다.
  await createLayer({ maxRange: 6 });
  assert.equal(await page.locator('#input + select').evaluate(el => el.hidden), true);
  assert.equal(await page.locator('#input + select').isVisible(), false);
  assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('#input')).paddingRight), base);
  // 숨겨진 항목은 선택할 수 없다: 달력에서 직접 고른 기간이 프리셋과 같아도 선택 표시는 보이는 항목에만 생긴다.
  await createLayer({ maxRange: '6M' });
  await page.locator('#input + select').selectOption('6m');
  assert.equal(await page.locator('#input').inputValue(), '2026-05-05 ~ 2026-11-05');
});

const createLayerRange = (startDate, endDate, options = {}) => createLayer({ startDate, endDate, ...options });
const rangeOf = () => page.evaluate(() => { const s = picker.getRangeState(), f = d => d && Daracl.dateTimePicker.format(d, 'YYYY-MM-DD'); return { start: f(s.startDate), end: f(s.endDate), committed: s.committed, complete: s.complete }; });

test('period select counts back from the selected end date and keeps that end date', async () => {
  await page.clock.setFixedTime('2026-11-05T12:00:00-05:00');
  await createLayerRange('2026-09-25', '2026-10-20');
  const select = page.locator('#input + select');
  assert.equal(await select.inputValue(), ''); // 현재 기간(9/25 ~ 10/20)은 어떤 프리셋과도 다르다.
  for (const [key, expected] of [['1w', '2026-10-13 ~ 2026-10-20'], ['1m', '2026-09-20 ~ 2026-10-20'], ['3m', '2026-07-20 ~ 2026-10-20'], ['6m', '2026-04-20 ~ 2026-10-20'], ['1y', '2025-10-20 ~ 2026-10-20']]) {
    await select.selectOption(key);
    assert.equal(await page.locator('#input').inputValue(), expected, key);
    assert.equal(await select.inputValue(), key);
    const range = await rangeOf();
    assert.equal(range.end, '2026-10-20'); assert.equal(range.complete, true); assert.equal(range.committed, true); // 오늘(11/5)이 아니라 종료일 기준이다.
  }
  // 종료일이 바뀌면 그 종료일 기준으로 계산한다. 말일은 보정한다. (12/31 의 1개월 = 11/30)
  await createLayerRange('2026-12-01', '2026-12-31');
  await select.selectOption('1m');
  assert.equal(await page.locator('#input').inputValue(), '2026-11-30 ~ 2026-12-31');
  // 종료일이 오늘보다 미래여도, 과거여도 같은 방식이다.
  await createLayerRange('2027-02-01', '2027-02-10');
  await select.selectOption('1w');
  assert.equal(await page.locator('#input').inputValue(), '2027-02-03 ~ 2027-02-10');
  // 아무것도 선택하지 않았으면 오늘(11/5)을 종료일로 쓴다.
  await create({});
  await page.locator('#calendar select').selectOption('1m');
  assert.equal((await state()).complete, true);
  assert.match((await state()).startDate, /^2026-10-05/); assert.match((await state()).endDate, /^2026-11-05/);
  // 선택 표시는 현재 종료일 기준으로 판단한다: 직접 시작일을 바꿔 "종료일 − 1주"가 되면 1주가 선택돼 보인다.
  await createLayerRange('2026-10-13', '2026-10-20');
  assert.equal(await page.locator('#input + select').inputValue(), '1w');
  await createLayerRange('2026-10-12', '2026-10-20');
  assert.equal(await page.locator('#input + select').inputValue(), '');
});

test('period options are enabled, disabled or hidden according to the selected end date', async () => {
  await page.clock.setFixedTime('2026-11-05T12:00:00-05:00');
  const disabledOf = () => page.locator('#input + select option').evaluateAll(options => options.filter(option => option.disabled).map(option => option.value));
  const shown = () => page.locator('#input + select option').evaluateAll(options => options.filter(option => !option.hidden).map(option => option.value));
  // minDate 와의 관계가 종료일에 따라 달라진다.
  await createLayerRange('2026-10-01', '2026-10-20', { minDate: '2026-06-01' });
  assert.deepEqual(await disabledOf(), ['6m', '1y']);
  await createLayerRange('2026-07-01', '2026-07-10', { minDate: '2026-06-01' });
  assert.deepEqual(await disabledOf(), ['3m', '6m', '1y']);
  // 비활성 날짜가 종료일 기준 기간 안에 있을 때만 그 항목이 비활성이다.
  await createLayerRange('2026-10-18', '2026-10-20', { disabledDates: ['2026-10-10'] });
  assert.deepEqual(await disabledOf(), ['1m', '3m', '6m', '1y']);
  await createLayerRange('2026-10-18', '2026-10-20', { disabledDates: ['2026-08-10'] });
  assert.deepEqual(await disabledOf(), ['3m', '6m', '1y']);
  // 숫자 maxRange(일 수)는 종료일의 달 길이에 따라 "1개월"이 들어가는지가 달라진다. (31일: 2/5~3/5 는 29일, 2/28~3/31 은 32일)
  await createLayerRange('2026-03-01', '2026-03-05', { maxRange: 31 });
  assert.deepEqual(await shown(), ['', '1w', '1m']);
  await createLayerRange('2026-03-30', '2026-03-31', { maxRange: 31 });
  assert.deepEqual(await shown(), ['', '1w']);
  // 단위 maxRange 는 종료일과 무관하다.
  await createLayerRange('2026-03-30', '2026-03-31', { maxRange: '3M' });
  assert.deepEqual(await shown(), ['', '1w', '1m', '3m']);
});

test('period select keeps the selected end time and uses the start time group for the start', async () => {
  await page.evaluate(() => { window.picker?.destroy(); window.picker = Daracl.dateTimePicker.create('#calendar', { inline: true, selectionMode: 'range', mode: 'datetime', format: 'YYYY-MM-DD HH:mm', startDate: '2026-10-10 08:00', endDate: '2026-10-20 18:30' }); });
  await page.locator('.ddtp-range-time[data-endpoint="start"] .ddtp-hour').fill('09');
  await page.locator('#calendar select').selectOption('1w');
  const range = await state();
  assert.match(range.startDate, /^2026-10-13 09:00$/); // 시작일은 시작 시간 그룹의 값
  assert.match(range.endDate, /^2026-10-20 18:30$/); // 종료일의 날짜와 시간은 그대로
  assert.equal(range.complete, true);
});

test('period select keeps the visible months when the range is already shown and only moves the calendar when needed', async () => {
  const captions = () => page.locator('#calendar .ddtp-range-months caption').allTextContents();
  const make = (months, startDate, endDate) => page.evaluate(([months, startDate, endDate]) => {
    window.picker?.destroy();
    window.picker = Daracl.dateTimePicker.create('#calendar', { inline: true, selectionMode: 'range', numberOfMonths: months, responsive: false, format: 'YYYY-MM-DD', startDate, endDate });
  }, [months, startDate, endDate]);
  // 11월 | 12월 을 보는 중 종료일이 12월이고 시작일이 12/3 이 되어도 달력은 그대로다. (예전에는 12월 | 1월 로 넘어갔다)
  await make(2, '2026-11-25', '2026-12-10');
  assert.deepEqual(await captions(), ['November 2026', 'December 2026']);
  await page.locator('#calendar select').selectOption('1w');
  assert.match((await state()).startDate, /^2026-12-03/); assert.match((await state()).endDate, /^2026-12-10/);
  assert.deepEqual(await captions(), ['November 2026', 'December 2026']);
  // 시작일이 11월(보이는 달)이면 역시 그대로다.
  await page.locator('#calendar select').selectOption('1m');
  assert.match((await state()).startDate, /^2026-11-10/);
  assert.deepEqual(await captions(), ['November 2026', 'December 2026']);
  // 시작일이 보이는 달보다 멀리 이전이면 왼쪽 패널은 시작일의 달, 오른쪽 패널은 종료일의 달이 된다. 가운데 달은 건너뛴다.
  await page.locator('#calendar select').selectOption('3m');
  assert.match((await state()).startDate, /^2026-09-10/); assert.match((await state()).endDate, /^2026-12-10/);
  assert.deepEqual(await captions(), ['September 2026', 'December 2026']);
  await page.locator('#calendar select').selectOption('6m');
  assert.match((await state()).startDate, /^2026-06-10/);
  assert.deepEqual(await captions(), ['June 2026', 'December 2026']); // 왼쪽은 6월, 오른쪽은 종료일의 12월
  // 같은 기간을 다시 고르거나 두 달이 이미 보이는 기간으로 바꾸면 달력이 흔들리지 않는다.
  await page.locator('#calendar select').selectOption('6m');
  assert.deepEqual(await captions(), ['June 2026', 'December 2026']);
  // 시작일 · 종료일 달 위의 날짜를 눌러 직접 기간을 고를 수 있고, 시작일 / 종료일 표시도 각 패널에 그려진다.
  assert.equal(await page.locator('#calendar .ddtp-range-months table').nth(0).locator('.ddtp-range-start').count(), 1);
  assert.equal(await page.locator('#calendar .ddtp-range-months table').nth(1).locator('.ddtp-range-end').count(), 1);
  // 이전 / 다음 달로 이동하면 다시 연속된 달을 보여 준다.
  await page.locator('#calendar .ddtp-move-btn.next').click();
  assert.deepEqual(await captions(), ['July 2026', 'August 2026']);
  // 3개 패널이면 첫 패널은 시작일의 달, 마지막은 종료일의 달이고 가운데는 시작일 다음 달이다.
  await make(3, '2026-11-25', '2026-12-10');
  assert.deepEqual(await captions(), ['November 2026', 'December 2026', 'January 2027']);
  await page.locator('#calendar select').selectOption('6m');
  assert.deepEqual(await captions(), ['June 2026', 'July 2026', 'December 2026']);
  await make(2, '2026-11-25', '2026-12-10');
  // 종료일이 왼쪽 패널이고 시작일이 그 앞달이면, 종료일은 계속 보이면서 시작일 쪽 달력으로 옮긴다. (12월 | 1월 → 11월 | 12월)
  await make(2, '2026-12-01', '2026-12-10');
  assert.deepEqual(await captions(), ['December 2026', 'January 2027']);
  await page.locator('#calendar select').selectOption('1m');
  assert.match((await state()).startDate, /^2026-11-10/);
  assert.deepEqual(await captions(), ['November 2026', 'December 2026']);
  // 종료일이 보이는 달 밖(왼쪽)에 있으면 종료일이 보이도록 옮긴다.
  await make(2, '2026-11-25', '2026-12-10');
  for (let i = 0; i < 4; i++) await page.locator('#calendar .ddtp-move-btn.next').click();
  assert.deepEqual(await captions(), ['March 2027', 'April 2027']);
  await page.locator('#calendar select').selectOption('1w');
  assert.deepEqual(await captions(), ['November 2026', 'December 2026']);
  // 종료일이 보이는 달보다 이후이면(다른 달을 보고 있다가 선택) 종료일의 달이 마지막 패널이 되어 종료일이 보인다.
  await make(2, '2026-11-25', '2026-12-10');
  for (let i = 0; i < 3; i++) await page.locator('#calendar .ddtp-move-btn.prev').click();
  assert.deepEqual(await captions(), ['August 2026', 'September 2026']);
  await page.locator('#calendar select').selectOption('1w');
  assert.deepEqual(await captions(), ['November 2026', 'December 2026']);
  // 해를 넘기는 경우: 1월 | 2월 을 보는 중 종료일 2월, 3개월이면 시작일은 전년 11월이라 11월 | 2월 이 된다.
  await make(2, '2027-01-20', '2027-02-10');
  await page.locator('#calendar select').selectOption('3m');
  assert.match((await state()).startDate, /^2026-11-10/);
  assert.deepEqual(await captions(), ['November 2026', 'February 2027']);
  // 종료일 1월이 왼쪽 패널이면 해를 넘어 12월 | 1월 로 옮긴다.
  await make(2, '2027-01-02', '2027-01-10');
  assert.deepEqual(await captions(), ['January 2027', 'February 2027']);
  await page.locator('#calendar select').selectOption('1m');
  assert.match((await state()).startDate, /^2026-12-10/);
  assert.deepEqual(await captions(), ['December 2026', 'January 2027']);
  // 한 달만 보여 주는 경우(모바일 등): 항상 종료일의 달을 보여 준다. 시작일이 이전 달이어도 그대로다.
  await make(1, '2026-12-01', '2026-12-10');
  assert.deepEqual(await captions(), ['December 2026']);
  await page.locator('#calendar select').selectOption('1w');
  assert.deepEqual(await captions(), ['December 2026']);
  await page.locator('#calendar select').selectOption('1m');
  assert.match((await state()).startDate, /^2026-11-10/);
  assert.deepEqual(await captions(), ['December 2026']);
  // 달력을 옮겨도 선택한 기간과 확정 상태는 그대로 유지된다.
  assert.equal((await state()).complete, true); assert.match((await state()).endDate, /^2026-12-10/);
});

test('clicking the period select keeps an open calendar open and choosing an item closes it', async () => {
  await page.clock.setFixedTime('2026-11-05T12:00:00-05:00');
  for (const options of [{}, { confirmButton: true }]) {
    await createLayer(options);
    const select = page.locator('#input + select');
    await page.locator('#input').click();
    assert.equal(await page.locator('.daracl-datetime-wrapper.show').count(), 1);
    // 셀렉트박스를 누르는 것만으로는 달력이 닫히지 않는다.
    await select.click();
    assert.equal(await page.locator('.daracl-datetime-wrapper.show').count(), 1, JSON.stringify(options));
    // 항목을 고르면 기간이 확정되고 그때 달력이 닫힌다.
    await select.selectOption('1m');
    assert.equal(await page.locator('#input').inputValue(), '2026-10-05 ~ 2026-11-05');
    assert.equal(await page.locator('.daracl-datetime-wrapper.show').count(), 0, JSON.stringify(options));
  }
  // 달력이 열려 있어도 다른 곳을 누르면 여전히 닫힌다.
  await createLayer();
  await page.locator('#input').click();
  await page.locator('#input + select').click();
  await page.locator('#other').evaluate(el => el.click());
  assert.equal(await page.locator('.daracl-datetime-wrapper.show').count(), 0);
  // autoClose: false 이면 고른 뒤에도 열려 있다.
  await createLayer({ autoClose: false });
  await page.locator('#input').click();
  await page.locator('#input + select').click();
  await page.locator('#input + select').selectOption('1w');
  assert.equal(await page.locator('.daracl-datetime-wrapper.show').count(), 1);
  assert.match(await page.locator('#input').inputValue(), / ~ /);
});

test('with only a start date selected, the period select treats that start date as the end date', async () => {
  await page.clock.setFixedTime('2026-11-05T12:00:00-05:00'); // 오늘(11/5)과 다른 날짜로 확인해 "오늘 기준"과 구별한다.
  const make = () => page.evaluate(() => {
    window.log = [];
    window.picker?.destroy();
    window.picker = Daracl.dateTimePicker.create('#calendar', { inline: true, selectionMode: 'range', numberOfMonths: 2, responsive: false, format: 'YYYY-MM-DD', initialDate: '2026-11-05', autoClose: false, confirmButton: true,
      onRangeStart: date => log.push('start' + date.getDate()), onRangeChange: range => log.push(range.complete ? 'change-complete' : 'change-partial'), onRangeComplete: () => log.push('complete') });
  });
  const select = page.locator('#calendar select');
  await make();
  await day(11, 12).click();
  assert.equal((await state()).endDate, null);
  for (const [key, start, end] of [['1w', '2026-11-05', '2026-11-12'], ['1m', '2026-10-12', '2026-11-12'], ['3m', '2026-08-12', '2026-11-12'], ['6m', '2026-05-12', '2026-11-12'], ['1y', '2025-11-12', '2026-11-12']]) {
    // 시작일만 있는 상태를 매번 새로 만든다. (이전 선택으로 달력이 다른 달을 보고 있지 않게)
    await make();
    await day(11, 12).click();
    await select.selectOption(key);
    const range = await state();
    assert.equal(range.complete, true, key);
    assert.match(range.startDate, new RegExp('^' + start), key); assert.match(range.endDate, new RegExp('^' + end), key); // 고른 날짜(11/12)가 종료일이 되고 시작일은 그 앞이다.
    assert.equal(await select.inputValue(), key);
  }
  // 이벤트: onRangeStart 는 날짜를 고른 순간에만 호출되고, 프리셋은 변경 · 완료 이벤트만 호출한다.
  await make();
  await day(11, 12).click();
  await select.selectOption('1m');
  assert.deepEqual(await page.evaluate(() => log), ['start12', 'change-partial', 'change-complete', 'complete']);
  // 시작일을 다른 날짜로 고르면 그 날짜가 기준이 된다.
  await make();
  await day(11, 20).click();
  await select.selectOption('1w');
  assert.match((await state()).startDate, /^2026-11-13/); assert.match((await state()).endDate, /^2026-11-20/);
  // 종료일까지 고른 상태에서는 종료일이 기준이다. (시작일이 아니라)
  await make();
  await day(11, 2).click(); await day(11, 20).click();
  await select.selectOption('1w');
  assert.match((await state()).startDate, /^2026-11-13/); assert.match((await state()).endDate, /^2026-11-20/);
});

test('with only a start date, option availability and the visible months follow that date', async () => {
  await page.clock.setFixedTime('2026-11-05T12:00:00-05:00');
  const make = (extra = {}) => page.evaluate(extra => {
    window.picker?.destroy();
    window.picker = Daracl.dateTimePicker.create('#calendar', { inline: true, selectionMode: 'range', numberOfMonths: 2, responsive: false, format: 'YYYY-MM-DD', initialDate: '2026-11-05', ...extra });
  }, extra);
  const disabledOf = () => page.locator('#calendar select option').evaluateAll(options => options.filter(option => option.disabled).map(option => option.value));
  const shown = () => page.locator('#calendar select option').evaluateAll(options => options.filter(option => !option.hidden).map(option => option.value));
  // minDate: 시작일을 누를 때마다 그 날짜를 종료일로 삼아 항목 상태를 다시 계산한다.
  await make({ minDate: '2026-06-01' });
  assert.deepEqual(await disabledOf(), ['6m', '1y']); // 오늘(11/5) 기준: 5/5 가 minDate 보다 이르다.
  await day(11, 20).click();
  assert.deepEqual(await disabledOf(), ['6m', '1y']); // 11/20 − 6개월 = 5/20
  await page.evaluate(() => picker.clearRange());
  await day(12, 20).click();
  assert.deepEqual(await disabledOf(), ['1y']); // 12/20 − 6개월 = 6/20 은 가능
  // 숫자 maxRange(일 수): 시작일(종료일로 쓰는 날짜)에 따라 1개월 항목이 보이거나 숨는다.
  await make({ maxRange: 31, initialDate: '2027-02-05' });
  await day(3, 5).click();
  assert.deepEqual(await shown(), ['', '1w', '1m']); // 2/5 ~ 3/5 = 29일
  await page.evaluate(() => picker.clearRange());
  await day(3, 31).click();
  assert.deepEqual(await shown(), ['', '1w']); // 2/28 ~ 3/31 = 32일 이라 1개월은 숨는다.
  // 달력 위치: 고른 날짜(종료일이 되는 날짜)의 달이 보이고, 시작일이 멀면 왼쪽 패널이 시작일의 달이 된다.
  await make();
  await day(12, 20).click();
  await page.locator('#calendar select').selectOption('6m');
  assert.deepEqual(await page.locator('#calendar .ddtp-range-months caption').allTextContents(), ['June 2026', 'December 2026']);
  // datetime: 시작일은 시작 시간 그룹, 종료일(고른 날짜)은 종료 시간 그룹의 시간을 쓴다.
  await make({ mode: 'datetime', format: 'YYYY-MM-DD HH:mm', initialDate: '2026-11-05 00:00' });
  await page.locator('.ddtp-range-time[data-endpoint="start"] .ddtp-hour').fill('09');
  await page.locator('.ddtp-range-time[data-endpoint="end"] .ddtp-hour').fill('18');
  await day(11, 12).click();
  await page.locator('#calendar select').selectOption('1w');
  assert.match((await state()).startDate, /^2026-11-05 09:00$/); assert.match((await state()).endDate, /^2026-11-12 18:00$/);
});

test('Today in range mode only moves the calendar to the current month and never selects anything', async () => {
  await page.clock.setFixedTime('2026-11-05T12:00:00-05:00');
  const captions = () => page.locator('#calendar .ddtp-range-months caption').allTextContents();
  const make = extra => page.evaluate(extra => {
    window.log = [];
    window.picker?.destroy();
    window.picker = Daracl.dateTimePicker.create('#calendar', { inline: true, selectionMode: 'range', numberOfMonths: 2, responsive: false, format: 'YYYY-MM-DD', enableTodayBtn: true, ...extra,
      onSelect: () => { log.push('select'); }, onRangeStart: () => log.push('start'), onRangeChange: () => log.push('change'), onRangeComplete: () => log.push('complete'), onRangeConfirm: () => log.push('confirm') });
  }, extra);
  const today = page.locator('#calendar button.ddtp-today');
  const unchanged = async (start, end) => {
    const range = await state();
    assert.match(range.startDate, new RegExp('^' + start)); assert.match(range.endDate, new RegExp('^' + end)); assert.equal(range.complete, true);
    assert.deepEqual(await page.evaluate(() => log), []); // 어떤 선택 / 기간 이벤트도 호출되지 않는다.
  };
  // 다른 달을 보다가 "오늘"을 누르면 오늘의 달이 첫 패널로 돌아오고, 완료된 기간은 그대로다.
  await make({ startDate: '2027-02-10', endDate: '2027-02-20' });
  assert.deepEqual(await captions(), ['February 2027', 'March 2027']);
  await today.click();
  assert.deepEqual(await captions(), ['November 2026', 'December 2026']);
  await unchanged('2027-02-10', '2027-02-20');
  // 시작일만 고른 상태(12/20)에서 월 보기로 바꿨다가 "오늘"을 누르면 날짜 보기로 돌아오고, 시작일 · 선택 중 상태는 그대로다.
  await make({});
  await day(12, 20).click();
  await page.evaluate(() => { log.length = 0; picker.viewMode = 'month'; });
  assert.equal(await page.locator('#calendar .ddtp-datetime').getAttribute('view-mode'), 'month');
  await today.click();
  assert.equal(await page.locator('#calendar .ddtp-datetime').getAttribute('view-mode'), 'date');
  assert.deepEqual(await captions(), ['November 2026', 'December 2026']);
  assert.match((await state()).startDate, /^2026-12-20/); assert.equal((await state()).endDate, null); assert.equal((await state()).selecting, 'end');
  assert.deepEqual(await page.evaluate(() => log), []);
  // 아무것도 선택하지 않았으면 아무것도 선택되지 않는다.
  await make({});
  await page.evaluate(() => { picker.moveDate('next'); picker.moveDate('next'); });
  await today.click();
  assert.deepEqual(await captions(), ['November 2026', 'December 2026']);
  assert.equal((await state()).startDate, null); assert.equal((await state()).endDate, null);
  assert.deepEqual(await page.evaluate(() => log), []);
  // 오늘이 이미 종료일 또는 시작일이어도 기간은 그대로다.
  await make({ startDate: '2026-10-20', endDate: '2026-11-05' });
  await page.evaluate(() => { picker.moveDate('next'); picker.moveDate('next'); });
  await today.click();
  assert.deepEqual(await captions(), ['November 2026', 'December 2026']);
  await unchanged('2026-10-20', '2026-11-05');
  await make({ startDate: '2026-11-05', endDate: '2026-11-20' });
  await page.evaluate(() => { picker.moveDate('next'); });
  await today.click();
  await unchanged('2026-11-05', '2026-11-20');
  // 기간 프리셋으로 시작 / 종료 달이 떨어져 보이는 화면에서도 연속된 달로 돌아온다. (선택 상태는 프리셋이 정한 그대로)
  await make({ startDate: '2026-11-25', endDate: '2026-12-10' });
  await page.locator('#calendar select').selectOption('6m');
  assert.deepEqual(await captions(), ['June 2026', 'December 2026']);
  const afterPreset = await state();
  await page.evaluate(() => { log.length = 0; });
  await today.click();
  assert.deepEqual(await captions(), ['November 2026', 'December 2026']);
  assert.equal((await state()).startDate, afterPreset.startDate); assert.equal((await state()).endDate, afterPreset.endDate);
  assert.deepEqual(await page.evaluate(() => log), []);
});

test('the Today button is hidden whenever today cannot be selected', async () => {
  await page.clock.setFixedTime('2026-11-05T12:00:00-05:00'); // 2026-11-05 는 목요일
  const visible = async (selectionMode, extra = {}) => {
    await page.evaluate(([selectionMode, extra]) => {
      window.picker?.destroy();
      window.picker = Daracl.dateTimePicker.create('#calendar', { inline: true, selectionMode, enableTodayBtn: true, ...extra });
    }, [selectionMode, extra]);
    return page.locator('#calendar button.ddtp-today').isVisible();
  };
  for (const selectionMode of ['single', 'range']) {
    assert.equal(await visible(selectionMode), true, selectionMode + ' default');
    assert.equal(await visible(selectionMode, { minDate: '2026-11-06' }), false, selectionMode + ' minDate after today');
    assert.equal(await visible(selectionMode, { minDate: '2026-11-05' }), true, selectionMode + ' minDate is today');
    assert.equal(await visible(selectionMode, { maxDate: '2026-11-04' }), false, selectionMode + ' maxDate before today');
    assert.equal(await visible(selectionMode, { maxDate: '2026-11-05' }), true, selectionMode + ' maxDate is today');
  }
  // 비활성 날짜 / 요일은 기간 선택 전용 옵션이다.
  assert.equal(await visible('range', { disabledDates: ['2026-11-05'] }), false);
  assert.equal(await visible('range', { disabledDates: ['2026-11-06'] }), true);
  assert.equal(await visible('range', { disabledWeekdays: [4] }), false); // 목요일
  assert.equal(await visible('range', { disabledWeekdays: [0, 6] }), true);
  // 버튼을 쓰지 않으면(enableTodayBtn 기본값) 원래부터 없다. 
  await page.evaluate(() => { window.picker?.destroy(); window.picker = Daracl.dateTimePicker.create('#calendar', { inline: true, selectionMode: 'range' }); });
  assert.equal(await page.locator('#calendar button.ddtp-today').count(), 0);
  assert.equal(await visible('range'), true);
  await page.locator('#calendar button.ddtp-today').click(); // 보이는 버튼은 눌러도 아무것도 선택하지 않는다.
  assert.equal((await state()).startDate, null);
  // 레이어: 달력을 열 때마다 다시 판단하므로 날짜가 바뀌어 오늘이 선택 불가가 되면 숨겨진다.
  await page.evaluate(() => { window.picker?.destroy(); window.picker = Daracl.dateTimePicker.create('#input', { selectionMode: 'range', enableTodayBtn: true, format: 'YYYY-MM-DD', maxDate: '2026-11-05' }); });
  await page.locator('#input').click();
  assert.equal(await page.locator('.daracl-datetime-wrapper.show button.ddtp-today').isVisible(), true);
  await page.keyboard.press('Escape');
  await page.clock.setFixedTime('2026-11-06T12:00:00-05:00'); // 하루가 지나 오늘(11/6)이 maxDate 를 넘는다.
  await page.locator('#input').click();
  assert.equal(await page.locator('.daracl-datetime-wrapper.show button.ddtp-today').isVisible(), false);
});
