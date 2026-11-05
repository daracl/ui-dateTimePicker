import assert from 'node:assert/strict';
import { test, before, after, beforeEach, afterEach } from 'node:test';
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { ENGLISH } from './english.mjs';

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
  // 기본 언어는 한국어다. 이 파일의 기존 테스트는 영어 문구를 기대하므로 영어 메시지를 적용한다. (한국어 기본값은 defaults.test.mjs)
  await page.evaluate(message => Daracl.dateTimePicker.setMessage(message), ENGLISH);
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
    let observers = [], writesBeforeSecondRead = -1;
    inputs.slice(0, 2).forEach((input, index) => {
      const read = input.getBoundingClientRect.bind(input);
      input.getBoundingClientRect = () => { log.push(`read${index}`); if (index === 1 && observers[0]) writesBeforeSecondRead = observers[0].takeRecords().length; return read(); };
      input.style.marginLeft = '20px';
    });
    const layers = Array.from(document.querySelectorAll('.layer.show'));
    // 위치는 CSP 호환을 위해 style 속성 문자열이 아니라 CSSOM(style.*)으로 쓴다. 쓰기는 style 속성 변경으로 관찰한다.
    observers = layers.map(layer => { const observer = new MutationObserver(() => {}); observer.observe(layer, { attributes: true, attributeFilter: ['style'] }); return observer; });
    for (let index = 0; index < 30; index++) {
      window.dispatchEvent(new Event('resize'));
      document.dispatchEvent(new Event('scroll'));
    }
    const scheduled = frames.size;
    const work = Array.from(frames.values()); frames.clear(); work.forEach(callback => callback(0));
    const firstFrame = [...log]; log.length = 0;
    const firstWrites = observers.map(observer => observer.takeRecords().length);
    window.dispatchEvent(new Event('resize'));
    const unchanged = Array.from(frames.values()); frames.clear(); unchanged.forEach(callback => callback(1));
    const unchangedFrame = [...log];
    const unchangedWrites = observers.map(observer => observer.takeRecords().length);
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
    return { closedCounts, openCounts, scheduled, firstFrame, firstWrites, writesBeforeSecondRead, unchangedFrame, unchangedWrites, vetoed, afterClose, reopenedCounts,
      afterDestroy: { counts: { ...counts }, pending: frames.size } };
  });
  const none = { resize: 0, scroll: 0, click: 0, keydown: 0 };
  const shared = { resize: 1, scroll: 1, click: 1, keydown: 1 };
  assert.deepEqual(result.closedCounts, none);
  assert.deepEqual(result.openCounts, shared);
  assert.equal(result.scheduled, 1);
  assert.deepEqual(result.firstFrame, ['read0', 'read1']);
  assert.equal(result.writesBeforeSecondRead, 0); // 모든 레이아웃 읽기를 끝낸 뒤에 쓴다.
  assert.ok(result.firstWrites.every(count => count > 0), result.firstWrites.join());
  assert.deepEqual(result.unchangedFrame, ['read0', 'read1']);
  assert.deepEqual(result.unchangedWrites, [0, 0]); // 위치가 같으면 다시 쓰지 않는다.
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

test('Today only moves the calendar to the current date and does not select anything; time input values clamp before padding', async () => {
  await page.clock.setFixedTime('2026-11-05T12:00:00-05:00');
  // 레이어: 입력값 · onSelect · 닫힘은 그대로이고, 달력만 오늘이 있는 달로 이동한다.
  await page.evaluate(() => {
    window.log = [];
    window.picker = Daracl.dateTimePicker.create('#input', { enableTodayBtn: true, initialDate: '2027-02-10', onSelect: value => log.push('select:' + value), onClose: () => { log.push('close'); } });
  });
  await page.locator('#input').click();
  assert.equal(await page.locator('.daracl-datetime-wrapper.show .ddtp-header-year').textContent(), '2027');
  await page.locator('.daracl-datetime-wrapper.show button.ddtp-today').click();
  assert.equal(await page.locator('.daracl-datetime-wrapper.show .ddtp-header-year').textContent(), '2026');
  assert.equal(await page.locator('.daracl-datetime-wrapper.show .ddtp-header-month').textContent(), 'November');
  assert.equal(await page.locator('.daracl-datetime-wrapper.show .ddtp-day.ddtp-today').count(), 1);
  assert.equal(await page.locator('#input').inputValue(), '2027-02-10');
  assert.deepEqual(await page.evaluate(() => log), []);
  assert.equal(await page.locator('.daracl-datetime-wrapper.show').count(), 1);
  await page.evaluate(() => { picker.destroy(); });
  // 월 보기에서도 날짜 보기로 돌아온다.
  await page.evaluate(() => { window.picker = Daracl.dateTimePicker.create('#calendar', { inline: true, initialDate: '2000-01-01', enableTodayBtn: true }); });
  await page.evaluate(() => { picker.viewMode = 'month'; });
  await page.locator('#calendar button.ddtp-today').click();
  assert.equal(await page.locator('#calendar .ddtp-datetime').getAttribute('view-mode'), 'date');
  assert.equal(await page.locator('#calendar .ddtp-header-year').textContent(), '2026');
  await page.evaluate(() => { picker.destroy(); window.picker = Daracl.dateTimePicker.create('#calendar', { inline: true, mode: 'time' }); });
  await page.locator('#calendar .ddtp-hour').fill('100');
  await page.locator('#calendar .ddtp-minute').fill('-5');
  assert.equal(await page.locator('#calendar .ddtp-hour').inputValue(), '23');
  assert.equal(await page.locator('#calendar .ddtp-minute').inputValue(), '00');
});

test('autoClose false keeps the popup open after a date click redraws the calendar', async () => {
  await page.evaluate(() => { window.picker = Daracl.dateTimePicker.create('#input', { autoClose: false, initialDate: '2026-11-05' }); });
  await page.locator('#input').click();
  await page.locator('.ddtp-day[data-day="11,12"] span').click();
  assert.equal(await page.locator('.daracl-datetime-wrapper.show').count(), 1);
  assert.equal(await page.locator('#input').inputValue(), '2026-11-12');
  await page.locator('#other').evaluate(el => el.click());
  assert.equal(await page.locator('.daracl-datetime-wrapper.show').count(), 0);
});

test('popup stays inside the content area when a vertical scrollbar narrows the viewport', async () => {
  // 헤드리스 기본값은 스크롤바를 숨기므로, 스크롤바가 있는 전용 브라우저로 실제 조건을 만든다.
  const scrolled = await chromium.launch({ headless: true, ignoreDefaultArgs: ['--hide-scrollbars'] });
  try {
    const view = await scrolled.newPage({ viewport: { width: 375, height: 500 } });
    await view.setContent('<style>body{margin:0}#input{position:absolute;top:20px;right:0;width:120px}</style><input id="input"><div style="height:2000px"></div>');
    await view.addStyleTag({ path: fileURLToPath(new URL('../dist/daracl.datetimepicker.min.css', import.meta.url)) });
    await view.addScriptTag({ path: fileURLToPath(new URL('../dist/daracl.datetimepicker.min.umd.js', import.meta.url)) });
    await view.evaluate(() => { document.documentElement.style.overflowY = 'scroll'; Daracl.dateTimePicker.create('#input', { mode: 'datetime' }); });
    await view.locator('#input').click();
    const result = await view.evaluate(() => {
      const root = document.documentElement, popup = document.querySelector('.daracl-datetime-wrapper.show').getBoundingClientRect();
      return { scrollbar: window.innerWidth - root.clientWidth, overflow: root.scrollWidth > root.clientWidth, right: popup.right, client: root.clientWidth };
    });
    assert.ok(result.scrollbar > 0, 'scrollbar must be present for this test to be meaningful');
    assert.equal(result.overflow, false);
    assert.ok(result.right <= result.client - 8, `popup right ${result.right} must keep 8px from content width ${result.client}`);
  } finally { await scrolled.close(); }
});

test('zIndex cannot inject CSS, positioning avoids the style attribute API and navigation links avoid javascript: URLs', async () => {
  await page.evaluate(() => {
    window.attrWrites = [];
    const set = Element.prototype.setAttribute;
    Element.prototype.setAttribute = function (name, value) { if (String(name).toLowerCase() === 'style') attrWrites.push(String(value)); return set.call(this, name, value); };
    window.picker = Daracl.dateTimePicker.create('#input', { zIndex: '1;background:url(//evil.example/x.png)' });
    window.second = Daracl.dateTimePicker.create('#other', { zIndex: 'not-a-number', isPositionFixed: true });
  });
  await page.locator('#input').click();
  const result = await page.evaluate(() => {
    const layer = document.querySelector('.daracl-datetime-wrapper.layer.show');
    return { zIndex: layer.style.zIndex, background: getComputedStyle(layer).backgroundImage, left: layer.style.left, top: layer.style.top,
      hrefs: Array.from(document.querySelectorAll('.daracl-datetime-wrapper a')).map(a => a.getAttribute('href')), attrWrites, other: document.querySelectorAll('.daracl-datetime-wrapper.layer')[1].style.zIndex };
  });
  assert.equal(result.zIndex, '1000'); // 숫자가 아닌 값은 기본값으로 대체된다.
  assert.equal(result.background, 'none');
  assert.deepEqual(result.attrWrites, []);
  assert.ok(result.left.endsWith('px') && result.top.endsWith('px'));
  assert.ok(result.hrefs.length > 0 && result.hrefs.every(href => !String(href).startsWith('javascript:')), result.hrefs.join());
  assert.equal(result.other, '1000');
  // 이전/다음 링크는 페이지 이동 없이 달력만 바꾼다.
  const before = page.url();
  await page.locator('.daracl-datetime-wrapper.show .ddtp-move-btn.next').click();
  assert.equal(page.url(), before);
});

test('creating again on the same element destroys the earlier instance and keeps only the later one', async () => {
  const result = await page.evaluate(() => {
    const out = {};
    // 인라인: 이전 인스턴스를 정리하고 나중 것만 남으며, 해제하면 최초 내용으로 복원된다.
    window.first = Daracl.dateTimePicker.create('#calendar', { inline: true, initialDate: '2026-11-05' });
    window.second = Daracl.dateTimePicker.create('#calendar', { inline: true, initialDate: '2026-12-25' });
    out.inlineCalendars = document.querySelectorAll('#calendar .ddtp-datetime').length;
    out.inlineValue = second.getDateValue();
    second.destroy();
    out.restored = [document.querySelector('#calendar').innerHTML, document.querySelector('#calendar').className];
    // 레이어: 팝업 요소가 하나만 남는다.
    window.layerA = Daracl.dateTimePicker.create('#input', {});
    window.layerB = Daracl.dateTimePicker.create('#input', {});
    out.layers = document.querySelectorAll('.daracl-datetime-wrapper.layer').length;
    // 이전 인스턴스는 이미 해제되었으므로 다시 destroy 해도 나중 인스턴스에 영향이 없다.
    layerA.destroy();
    out.layersAfterOldDestroy = document.querySelectorAll('.daracl-datetime-wrapper.layer').length;
    // 새 인스턴스의 생성이 실패하면 기존 인스턴스는 유지된다.
    try { Daracl.dateTimePicker.create('#input', { minDate: '2026-12-31', maxDate: '2026-01-01' }); out.threw = false; } catch { out.threw = true; }
    out.layersAfterFailure = document.querySelectorAll('.daracl-datetime-wrapper.layer').length;
    return out;
  });
  assert.equal(result.inlineCalendars, 1);
  assert.equal(result.inlineValue, '2026-12-25');
  assert.deepEqual(result.restored, ['<b>original</b>', 'original']);
  assert.equal(result.layers, 1);
  assert.equal(result.layersAfterOldDestroy, 1);
  assert.equal(result.threw, true);
  assert.equal(result.layersAfterFailure, 1);
  await page.locator('#input').click();
  assert.equal(await page.locator('.daracl-datetime-wrapper.show').count(), 1);
});

test('calling initTimeEvent again does not bind the time handlers twice', async () => {
  const calls = await page.evaluate(() => {
    let selected = 0;
    const picker = Daracl.dateTimePicker.create('#calendar', { inline: true, mode: 'datetime', initialDate: '2026-11-05 10:00', format: 'YYYY-MM-DD HH:mm', onSelect: () => { selected++; } });
    picker.initTimeEvent(); picker.initTimeEvent();
    document.querySelector('#calendar .time-select').click();
    return selected;
  });
  assert.equal(calls, 1);
});
