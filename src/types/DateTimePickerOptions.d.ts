import { DateViewMode } from "../constants";

export interface OptionCallback {
  (...params: any[]): any;
}

export interface DateTimePickerOptions {
  selectionMode?: 'single' | 'range';
  numberOfMonths?: number;
  responsive?: boolean;
  responsiveOptions?: { breakpoint?: number; mobileMonths?: number; desktopMonths?: number };
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  minRange?: number;
  /** 선택할 수 있는 최대 기간. 숫자 · 단위 없는 문자열은 일 수(양 끝 포함), '2W'(주) · '3M'(개월) · '1Y'(년)은 시작일 기준 달력 단위. null 은 제한 없음 */
  maxRange?: number | string | null;
  /** range 에서 입력창 옆(inline 은 달력 위)에 기간 프리셋 셀렉트박스(1주 · 1개월 · 3개월 · 6개월 · 1년, 선택한 종료일 기준이며, 시작일만 있으면 그 시작일을, 아무것도 없으면 오늘을 종료일로 사용)를 표시할지 여부. 기본 true */
  periodSelect?: boolean;
  allowSameDate?: boolean;
  allowReverse?: boolean;
  resetRangeOnStart?: boolean;
  confirmButton?: boolean;
  clearButton?: boolean;
  showRangeHighlight?: boolean;
  showRangePreview?: boolean;
  showOutsideDays?: boolean;
  disabledDates?: (Date | string)[];
  disabledWeekdays?: number[];
  onRangeStart?: ((date: Date) => void) | null;
  onRangeChange?: ((range: DateRangeResult) => void) | null;
  onRangeComplete?: ((range: DateRangeResult) => void) | null;
  onRangeConfirm?: ((range: DateRangeResult) => void) | null;
  onRangeCancel?: (() => void) | null;
  beforeSelectRange?: ((range: DateRangeResult) => boolean | void) | null;
  inline: boolean; // layer or innerhtml
  initialDate: string | Date; // 초기화 요일
  isRTL: boolean;
  isPositionFixed: boolean;
  mode: `${DateViewMode}`;
  weekStartDay: number; // 첫번째 요일 0:일, 1:월, 2:화, 3:수, 4:목, 5:금, 6:토
  showMonthAfterYear: boolean;
  format: string;
  zIndex: number;
  enableTodayBtn: boolean; // today button 보일지 여부.
  autoClose: boolean;
  minDate: string | Date; // 초기화 요일
  maxDate: string | Date; // 초기화 요일
  onLoad?: OptionCallback;
  onSelect?: OptionCallback;
  beforeChangeDatepicker?: OptionCallback; // 년,월,일의 날짜가 변경되기 전 호출
  afterChangeDatepicker?: OptionCallback; // 년,월,일의 날짜가 변경 된후 호출
  onClose?: OptionCallback;
  beforeDrawDate?: OptionCallback; // 날짜 호출 전에 호출.
}

export interface DateRangeResult {
  startDate: Date | null;
  endDate: Date | null;
  days: number;
  complete: boolean;
}

export interface DateRangeState extends DateRangeResult {
  selecting: 'start' | 'end';
  committed: boolean;
  activeDate: Date | null;
}
