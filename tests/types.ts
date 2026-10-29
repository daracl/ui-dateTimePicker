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
