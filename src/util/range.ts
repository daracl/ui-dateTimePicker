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
