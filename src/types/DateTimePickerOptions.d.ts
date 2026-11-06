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
  /**
   * 처음 선택해 둘 기간. '10d'(일) · '2w'(주) · '3m'(개월) · '1y'(년), 단위가 없으면 일. 종료일은 endDate(없으면 오늘)이고 시작일은 `종료일 − 기간`이며, 확정된 값으로 입력창에 표시한다.
   * startDate 가 있으면 무시한다. 형식이 올바르지 않으면 시작일을 종료일과 같게 둔다(하루). 기간이 규칙(minRange · maxRange · 비활성 날짜 · minDate · maxDate)에 맞지 않으면 RangeError. range 에서만 쓴다.
   */
  period?: string | null;
  /**
   * 기간 프리셋 셀렉트박스의 항목. 주지 않으면 1w · 1m · 3m · 6m · 1y(문구는 period1w 같은 메시지 키)이다. 빈 배열이면 셀렉트박스를 만들지 않는다.
   * value 는 maxRange 와 같은 형식('10d' 일 · '2w' 주 · '3m' 개월 · '1y' 년, 단위가 없으면 일)이고 중복할 수 없다. 형식이 올바르지 않거나 중복되면 RangeError.
   * label 을 생략하면 메시지 키(period + value)나 단위 메시지('2w' → periodWeeks)를 쓴다. 예: [{ value: '1w', label: '1주' }, { value: '1m', label: '1달' }]
   */
  periodOptions?: PeriodOption[];
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
  /** 입력창에 직접 입력할 수 있는지 여부. 기본 false 는 입력창에 readonly 를 적용해 달력으로만 고르게 한다. true 이면 입력창에 날짜를 직접 입력할 수 있다(inline 에는 영향 없음) */
  editable?: boolean;
  minDate: string | Date; // 초기화 요일
  maxDate: string | Date; // 초기화 요일
  onLoad?: OptionCallback;
  /**
   * 값이 확정되어 이전 값과 달라졌을 때 호출된다. 단일 선택은 날짜를 선택해 입력창에 반영된 뒤, 기간 선택은 기간이 확정된 뒤(onRangeConfirm 과 같은 시점)에 호출한다.
   * 같은 값을 다시 선택하거나 취소 · 닫기 · 이동만 한 경우에는 호출하지 않는다. onSelect 와 달리 거부(false)할 수 없다.
   */
  onChange?: (change: DateChange) => void;
  onSelect?: OptionCallback;
  beforeChangeDatepicker?: OptionCallback; // 년,월,일의 날짜가 변경되기 전 호출
  afterChangeDatepicker?: OptionCallback; // 년,월,일의 날짜가 변경 된후 호출
  onClose?: OptionCallback;
  beforeDrawDate?: OptionCallback; // 날짜 호출 전에 호출.
}

/** 기간 프리셋 셀렉트박스의 항목. */
export interface PeriodOption {
  /** 기간. '10d'(일) · '2w'(주) · '3m'(개월) · '1y'(년), 단위가 없으면 일 */
  value: string;
  /** 셀렉트박스에 보일 문구. 생략하면 메시지에서 가져온다 */
  label?: string;
}

/** onChange 로 전달되는 값. 단일 선택은 startDate 와 endDate 가 같은 값이고, 기간 선택은 확정된 기간이다. */
export interface DateChange {
  /** 입력창에 표시되는 문자열. 단일 선택은 `format` 으로 만든 날짜, 기간 선택은 `시작 ~ 종료`. 비운 기간은 빈 문자열 */
  value: string;
  startDate: Date | null;
  endDate: Date | null;
  /** 양 끝을 포함한 일 수. 기간 선택은 확정된 기간의 일 수(비운 기간은 0), 단일 선택은 1 */
  days: number;
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
