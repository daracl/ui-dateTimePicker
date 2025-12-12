import { DateViewMode } from "@/constants";

export interface OptionCallback {
  (...params: any[]): any;
}

export interface DateTimePickerOptions {
  inline: boolean; // layer or innerhtml
  initialDate: string | Date; // 초기화 요일
  isRTL: boolean;
  isPositionFixed: boolean;
  mode: DateViewMode;
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
