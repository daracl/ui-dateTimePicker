import assert from 'node:assert/strict';
import { test, before, after, beforeEach, afterEach } from 'node:test';
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';

let browser, page, errors;
before(async () => { browser = await chromium.launch({ headless: true }); });
after(async () => { await browser?.close(); });
beforeEach(async () => {
  page = await browser.newPage();
  page.setDefaultTimeout(5000);
  errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setContent('<input id="input"><div id="calendar" class="original"><b>original</b></div><div id="other"></div>');
  await page.addStyleTag({ path: fileURLToPath(new URL('../dist/daracl.datetimepicker.min.css', import.meta.url)) });
  await page.addScriptTag({ path: fileURLToPath(new URL('../dist/daracl.datetimepicker.min.umd.js', import.meta.url)) });
});
afterEach(async () => { await page.close(); assert.deepEqual(errors, []); });

for (const fixed of [false, true]) {
  test(`open ${fixed ? 'fixed' : 'absolute'} popup follows input on viewport resize and scroll`, async () => {
    await page.setViewportSize({ width: 800, height: 800 });
    await page.addStyleTag({ content: 'body{margin:0;height:1800px} #input{display:block;width:180px;margin:160px auto 0}' });
    await page.evaluate(fixed => {
      window.picker = Daracl.dateTimePicker.create('#input', { isPositionFixed: fixed });
    }, fixed);
    await page.locator('#input').click();
    const aligned = async () => {
      const input = await page.locator('#input').boundingBox();
      const popup = await page.locator('.layer.show').boundingBox();
      assert.ok(Math.abs(input.x - popup.x) < 2, `input left ${input.x}, popup left ${popup.x}`);
      assert.ok(Math.abs(input.y + input.height + 2 - popup.y) < 2);
    };
    await aligned();
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.waitForFunction(() => Math.abs(document.querySelector('#input').getBoundingClientRect().left - document.querySelector('.layer.show').getBoundingClientRect().left) < 2);
    await aligned();
    await page.evaluate(() => window.scrollTo(0, 80));
    await page.waitForTimeout(50);
    await aligned();
    await page.setViewportSize({ width: 600, height: 800 });
    await page.waitForFunction(() => Math.abs(document.querySelector('#input').getBoundingClientRect().left - document.querySelector('.layer.show').getBoundingClientRect().left) < 2);
    await aligned();
    await page.keyboard.press('Escape');
    await page.setViewportSize({ width: 900, height: 800 });
    assert.equal(await page.locator('.layer.show').count(), 0);
    await page.evaluate(() => picker.destroy());
    await page.setViewportSize({ width: 1100, height: 800 });
  });
}

test('nested day clicks handle cross-year dates without mutating caller Date objects', async () => {
  await page.evaluate(() => {
    window.initial = new Date(2026, 11, 15);
    window.picker = Daracl.dateTimePicker.create('#calendar', { inline: true, initialDate: initial });
  });
  await page.locator('#calendar [data-year="2027"][data-day="1,1"] span').click();
  assert.equal(await page.evaluate(() => picker.getDateValue()), '2027-01-01');
  assert.equal(await page.evaluate(() => initial.getFullYear()), 2026);
  assert.equal(await page.evaluate(() => initial.getMonth()), 11);
});

test('month and year changes clamp month-end and leap days', async () => {
  await page.evaluate(() => { window.picker = Daracl.dateTimePicker.create('#calendar', { inline: true, mode: 'month', initialDate: '2026-01-31', format: 'YYYY-MM-DD' }); });
  await page.locator('#calendar [data-month="1"]').click();
  assert.equal(await page.evaluate(() => picker.getDateValue()), '2026-02-28');
  await page.evaluate(() => { picker.destroy(); window.picker = Daracl.dateTimePicker.create('#calendar', { inline: true, mode: 'year', initialDate: '2024-02-29', format: 'YYYY-MM-DD' }); });
  await page.locator('#calendar [data-year="2025"]').click();
  assert.equal(await page.evaluate(() => picker.getDateValue()), '2025-02-28');
});

test('disabled dates do not mutate state and input selections replace edited values', async () => {
  await page.evaluate(() => { window.picker = Daracl.dateTimePicker.create('#calendar', { inline: true, initialDate: '2026-12-15', minDate: '2026-12-10', maxDate: '2026-12-20' }); });
  await page.locator('#calendar [data-day="12,9"] span').click();
  assert.equal(await page.evaluate(() => picker.getDateValue()), '2026-12-15');
  await page.evaluate(() => { window.inputPicker = Daracl.dateTimePicker.create('#input', { initialDate: '2026-12-15' }); });
  await page.locator('#input').fill('2026-12-09');
  await page.locator('#input').click();
  assert.equal(await page.evaluate(() => inputPicker.getDateValue()), '2026-12-09');
  await page.locator('.layer.show [data-day="12,10"] span').click();
  assert.equal(await page.locator('#input').inputValue(), '2026-12-10');
});

test('close veto keeps state consistent; Escape and destroy clean up', async () => {
  await page.evaluate(() => { window.closeCount = 0; window.picker = Daracl.dateTimePicker.create('#input', { onClose: () => ++closeCount > 1 }); });
  await page.locator('#input').click();
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('.layer.show').count(), 1);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('.layer.show').count(), 0);
  await page.locator('#input').click();
  await page.evaluate(() => { picker.destroy(); picker.destroy(); });
  await page.locator('#input').click();
  assert.equal(await page.locator('.layer').count(), 0);
  await page.evaluate(() => { window.inline = Daracl.dateTimePicker.create('#calendar', { inline: true }); inline.destroy(); });
  assert.equal(await page.locator('#calendar').getAttribute('class'), 'original');
  assert.equal(await page.locator('#calendar').innerHTML(), '<b>original</b>');
});

test('HTML in translations and draw callbacks is rendered as text, not markup', async () => {
  await page.evaluate(() => {
    window.picker = Daracl.dateTimePicker.create('#calendar', {
      inline: true, mode: 'month', initialDate: '2026-12',
      beforeDrawDate: () => ({ style: 'x" onclick="window.injected=1', tooltip: '"><img src=x onerror="window.injected=1">' }),
    }, { months: { full: Array(12).fill('Month'), abbr: Array(12).fill('<img src=x onerror="window.injected=1">') }, today: '<img src=x>' });
  });
  assert.equal(await page.locator('#calendar img, #calendar [onclick]').count(), 0);
  assert.equal(await page.evaluate(() => window.injected), undefined);
});

test('instance locale is independent and asynchronous redraw completes once', async () => {
  await page.evaluate(() => {
    const months = { full: Array(12).fill('Custom month'), abbr: Array(12).fill('Custom') };
    window.picker = Daracl.dateTimePicker.create('#calendar', { inline: true, initialDate: '2026-12-15' }, { months });
    Daracl.dateTimePicker.create('#other', { inline: true });
    picker.refresh();
  });
  assert.equal(await page.locator('#calendar .ddtp-header-month').textContent(), 'Custom month');
  await page.evaluate(() => {
    picker.destroy(); window.draws = 0;
    window.picker = Daracl.dateTimePicker.create('#calendar', {
      inline: true,
      beforeChangeDatepicker: (_date, done) => { done(true); },
      afterChangeDatepicker: () => { draws++; },
    });
  });
  assert.equal(await page.evaluate(() => draws), 1);
});

test('selection veto preserves values in every picker mode', async () => {
  for (const mode of ['date', 'month', 'year', 'datetime']) {
    await page.evaluate(mode => {
      window.picker?.destroy();
      window.picker = Daracl.dateTimePicker.create('#calendar', {
        inline: true, mode, format: 'YYYY-MM-DD HH:mm', initialDate: '2026-12-15 12:30', onSelect: () => false,
      });
    }, mode);
    if (mode === 'year') await page.locator('#calendar [data-year="2027"]').click();
    else if (mode === 'month') await page.locator('#calendar [data-month="1"]').click();
    else if (mode === 'datetime') {
      await page.locator('#calendar .ddtp-hour').fill('16');
      await page.locator('#calendar .time-select').click();
    } else await page.locator('#calendar [data-day="12,16"] span').click();
    assert.equal(await page.evaluate(() => picker.getDateValue()), '2026-12-15 12:30', mode);
  }
});

test('invalid bounds fail clearly, initial values clamp, and undefined options use defaults', async () => {
  const result = await page.evaluate(() => {
    const messages = [];
    for (const options of [{ minDate: 'invalid' }, { maxDate: new Date(NaN) }, { minDate: '2026-12-20', maxDate: '2026-12-10' }]) {
      try { Daracl.dateTimePicker.create('#calendar', { inline: true, ...options }); }
      catch (error) { messages.push(error.message); }
    }
    const picker = Daracl.dateTimePicker.create('#calendar', { inline: true, initialDate: '2026-12-01', minDate: '2026-12-10', maxDate: undefined });
    return { messages, value: picker.getDateValue() };
  });
  assert.equal(result.messages.length, 3);
  assert.equal(result.value, '2026-12-10');
});

test('Today uses the real date and time input values clamp before padding', async () => {
  await page.evaluate(() => {
    window.today = Daracl.dateTimePicker.format(new Date());
    window.picker = Daracl.dateTimePicker.create('#calendar', { inline: true, initialDate: '2000-01-01', enableTodayBtn: true });
  });
  await page.locator('#calendar button.ddtp-today').click();
  assert.equal(await page.evaluate(() => picker.getDateValue()), await page.evaluate(() => today));
  await page.evaluate(() => { picker.destroy(); window.picker = Daracl.dateTimePicker.create('#calendar', { inline: true, mode: 'time' }); });
  await page.locator('#calendar .ddtp-hour').fill('100');
  await page.locator('#calendar .ddtp-minute').fill('-5');
  assert.equal(await page.locator('#calendar .ddtp-hour').inputValue(), '23');
  assert.equal(await page.locator('#calendar .ddtp-minute').inputValue(), '00');
});
