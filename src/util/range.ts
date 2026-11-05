import { DaraDate } from '../DaraDate';
import { DateRangeResult } from '../types/DateTimePickerOptions';

export const cloneDate = (date: Date | null): Date | null => date ? new Date(date.getTime()) : null;

// 현지 달력 날짜를 UTC 일련번호로 바꿔 DST와 0~99년 보정을 피합니다.
export function calendarDay(date: Date): number {
  const utc = new Date(0);
  utc.setUTCFullYear(date.getFullYear(), date.getMonth(), date.getDate());
  utc.setUTCHours(0, 0, 0, 0);
  return utc.getTime() / 86400000;
}

export function rangeResult(startDate: Date | null, endDate: Date | null): DateRangeResult {
  return { startDate: cloneDate(startDate), endDate: cloneDate(endDate),
    days: startDate && endDate ? calendarDay(endDate) - calendarDay(startDate) + 1 : 0,
    complete: !!(startDate && endDate) };
}

export type PeriodUnit = 'D' | 'W' | 'M' | 'Y';
export interface RangePeriod {
  value: number;
  unit: PeriodUnit;
}

// maxRange 값을 기간으로 해석한다. '3M' → 3개월, '1Y' → 1년, '2W' → 2주, '30D' · '30' · 30 → 30일(단위가 없으면 일). 올바르지 않으면 null.
export function parseRangePeriod(input: unknown): RangePeriod | null {
  if (typeof input === 'number') return Number.isInteger(input) && input >= 1 ? { value: input, unit: 'D' } : null;
  if (typeof input !== 'string') return null;
  const match = /^\s*(\d+)\s*([dwmy])?\s*$/i.exec(input);
  if (!match || Number(match[1]) < 1) return null;
  return { value: Number(match[1]), unit: (match[2] ? match[2].toUpperCase() : 'D') as PeriodUnit };
}

// 기준 날짜에서 기간만큼 더하거나(sign 1) 뺀다(sign -1). 월 · 연 단위는 말일을 넘지 않게 보정한다(1/31 + 1개월 → 2/28).
export function addPeriod(date: Date, period: RangePeriod, sign: 1 | -1 = 1): Date {
  const target = new DaraDate(date);
  if (period.unit === 'D') target.addDate(sign * period.value);
  else if (period.unit === 'W') target.addDate(sign * period.value * 7);
  else if (period.unit === 'M') target.addMonth(sign * period.value);
  else target.addYear(sign * period.value);
  return new Date(target.getTime());
}
