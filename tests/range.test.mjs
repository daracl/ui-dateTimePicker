import assert from 'node:assert/strict';
import { test, before, after, beforeEach, afterEach } from 'node:test';
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';

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
