import { DateTimePicker, DateViewMode, type DateTimePickerOptions, type MessageOptions } from '@daracl/datetimepicker';

const options: Partial<DateTimePickerOptions> = { mode: 'datetime', initialDate: new Date() };
const message: MessageOptions = { months: { abbr: ['Jan'] }, ok: 'Select' };
const picker = DateTimePicker.create('#date', options, message);
new DateTimePicker('#date');
DateTimePicker.create('#date', { mode: 'date' });
DateTimePicker.setOptions({ autoClose: false });
DateTimePicker.setMessage({ weeks: { abbr: ['Sun'] } });
DateTimePicker.parser('2026-10-29');
DateTimePicker.format(new Date());
picker.viewMode = DateViewMode.month;
picker.destroy();
// @ts-expect-error 유효하지 않은 모드는 타입 검사에서 거절합니다.
DateTimePicker.create('#date', { mode: 'invalid' });

import type { DateRangeResult, DateRangeState } from '@daracl/datetimepicker';
const rangePicker = DateTimePicker.create('#range', {
  mode: 'datetime', selectionMode: 'range', startDate: new Date(), endDate: null,
  responsiveOptions: { breakpoint: 768 }, disabledDates: ['2026-11-08'], disabledWeekdays: [0],
  onRangeChange: (range: DateRangeResult) => range.days,
  beforeSelectRange: range => !range.complete || range.days <= 30,
  onRangeStart: null, onRangeCancel: null,
}, { clear: '초기화', cancel: '취소' });
const rangeState: DateRangeState = rangePicker.getRangeState();
rangePicker.getRange(); rangePicker.confirmRange(); rangePicker.cancelRange(); rangePicker.clearRange();
// @ts-expect-error 선택 방식은 single 또는 range만 허용합니다.
DateTimePicker.create('#range', { selectionMode: 'multiple' });
