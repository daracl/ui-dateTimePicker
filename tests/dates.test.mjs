import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DateTimePicker as Picker } from '../dist/index.js';

test('parser rejects invalid dates, incomplete values, mismatched separators and trailing text', () => {
  for (const value of ['2025-02-29', '2026-13-01', '2026-01-32', '2026-00-10', '2026-01-00', '2026-1-01', '2026/01/01', 'x2026-01-01', '2026-01-01x', '']) {
    assert.equal(Picker.parser(value), null, value);
  }
  assert.equal(Picker.parser('2024-02-29').getDate(), 29);
  assert.equal(Picker.parser('0099-01-02').getFullYear(), 99);
  assert.equal(Picker.format(Picker.parser('0099-01-02')), '0099-01-02');
});

test('12-hour clock, meridiem and milliseconds round trip', () => {
  for (const hour of [0, 1, 11, 12, 13, 23]) {
    const value = new Date(2026, 0, 2, hour, 5, 8, 100);
    for (const pattern of ['YYYY-MM-DD hh:mm:ss.SSS A', 'YYYY-MM-DD h:mm:ss.SS a', 'YYYY-MM-DD HH:mm:ss.S']) {
      assert.equal(Picker.parser(Picker.format(value, pattern), pattern).getTime(), value.getTime(), pattern);
    }
  }
  for (const [value, pattern] of [['00 AM', 'hh A'], ['13 PM', 'hh A'], ['24:00', 'HH:mm'], ['23:60', 'HH:mm'], ['12 NO', 'hh A']]) {
    assert.equal(Picker.parser(value, pattern), null, value);
  }
});

test('localized month and weekday names parse next to punctuation', () => {
  const date = new Date(2026, 9, 29);
  for (const pattern of ['MMM D, YYYY', 'MMMM DD, YYYY dddd', 'YYYY-MM-DD ddd']) {
    assert.equal(Picker.parser(Picker.format(date, pattern), pattern).getTime(), date.getTime());
  }
  assert.equal(Picker.parser('2026-10-29 Friday', 'YYYY-MM-DD dddd'), null);
  Picker.setMessage({ am: '오전', pm: '오후' });
  assert.equal(Picker.parser('오전 12:05', 'A hh:mm').getHours(), 0);
  assert.equal(Picker.parser('오후 12:05', 'A hh:mm').getHours(), 12);
});

test('unsupported timezone text is literal and invalid Date formatting is predictable', () => {
  assert.equal(Picker.parser('2026-10-29 z', 'YYYY-MM-DD z').getDate(), 29);
  assert.equal(Picker.format(new Date(NaN)), '');
});
