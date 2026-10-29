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

test('global popup listeners are shared, frame updates are batched, and final close cancels work', async () => {
  const result = await page.evaluate(() => {
    const counts = { resize: 0, scroll: 0, click: 0, keydown: 0 };
    for (const [target, types] of [[window, ['resize', 'scroll']], [document, ['click', 'keydown']]]) {
      const add = target.addEventListener.bind(target);
      const remove = target.removeEventListener.bind(target);
      target.addEventListener = (type, listener, options) => {
        if (types.includes(type)) counts[type]++;
        return add(type, listener, options);
      };
      target.removeEventListener = (type, listener, options) => {
        if (types.includes(type)) counts[type]--;
        return remove(type, listener, options);
      };
    }
    let nextFrame = 0;
    const frames = new Map();
    window.requestAnimationFrame = callback => { frames.set(++nextFrame, callback); return nextFrame; };
    window.cancelAnimationFrame = id => frames.delete(id);
    let allowClose = false;
    const inputs = Array.from({ length: 20 }, () => {
      const input = document.createElement('input');
      document.body.append(input);
      return input;
    });
    const pickers = inputs.map(input => Daracl.dateTimePicker.create(input, { onClose: () => allowClose }));
    const closedCounts = { ...counts };
    inputs[0].click(); inputs[1].click();
    const openCounts = { ...counts };
    const log = [];
    inputs.slice(0, 2).forEach((input, index) => {
      const read = input.getBoundingClientRect.bind(input);
      input.getBoundingClientRect = () => { log.push(`read${index}`); return read(); };
      input.style.marginLeft = '20px';
    });
    const layers = Array.from(document.querySelectorAll('.layer.show'));
    layers.forEach((layer, index) => {
      const write = layer.setAttribute.bind(layer);
      layer.setAttribute = (name, value) => { if (name === 'style') log.push(`write${index}`); write(name, value); };
    });
    for (let index = 0; index < 30; index++) {
      window.dispatchEvent(new Event('resize'));
      document.dispatchEvent(new Event('scroll'));
    }
    const scheduled = frames.size;
    const work = Array.from(frames.values()); frames.clear(); work.forEach(callback => callback(0));
    const firstFrame = [...log]; log.length = 0;
    window.dispatchEvent(new Event('resize'));
    const unchanged = Array.from(frames.values()); frames.clear(); unchanged.forEach(callback => callback(1));
    const unchangedFrame = [...log];
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    const vetoed = document.querySelectorAll('.layer.show').length;
    allowClose = true;
    window.dispatchEvent(new Event('resize'));
    document.body.click();
    const afterClose = { counts: { ...counts }, pending: frames.size, open: document.querySelectorAll('.layer.show').length };
    inputs[0].click();
    const reopenedCounts = { ...counts };
    window.dispatchEvent(new Event('resize'));
    pickers.forEach(picker => picker.destroy());
    return { closedCounts, openCounts, scheduled, firstFrame, unchangedFrame, vetoed, afterClose, reopenedCounts,
      afterDestroy: { counts: { ...counts }, pending: frames.size } };
  });
  const none = { resize: 0, scroll: 0, click: 0, keydown: 0 };
  const shared = { resize: 1, scroll: 1, click: 1, keydown: 1 };
  assert.deepEqual(result.closedCounts, none);
  assert.deepEqual(result.openCounts, shared);
  assert.equal(result.scheduled, 1);
  assert.deepEqual(result.firstFrame, ['read0', 'read1', 'write0', 'write1']);
  assert.deepEqual(result.unchangedFrame, ['read0', 'read1']);
  assert.equal(result.vetoed, 2);
  assert.deepEqual(result.afterClose, { counts: none, pending: 0, open: 0 });
  assert.deepEqual(result.reopenedCounts, shared);
  assert.deepEqual(result.afterDestroy, { counts: none, pending: 0 });
});

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
