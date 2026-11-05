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
const create = async (options = {}) => page.evaluate(options => {
  window.picker = Daracl.dateTimePicker.create('#calendar', { inline: true, initialDate: '2026-11-05', selectionMode: 'range', ...options });
}, options);
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
