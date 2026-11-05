import { addPeriod, calendarDay, cloneDate, parseRangePeriod, rangeResult, RangePeriod } from './util/range';
import { DateTimePickerOptions, DateRangeResult, DateRangeState } from "./types/DateTimePickerOptions";
import { MessageOptions } from "./types/Message";
import format from "./format";
import parser from "./util/parser";
import Lanauage, { Language } from "./Lanauage";
import { closestElement, escapeHtml } from "./util/utils";
import { registerPopup, unregisterPopup, PopupClient } from './util/popupEvents';
import { DaraDate } from "./DaraDate";
import { DAY_STYLE_CLASS, DEFAULT_FORMAT, DateViewMode } from "./constants";
import { isFunction, isNumeric, leftPad, leftPadClamp } from "@daracl/core";

declare const APP_VERSION: string;

let DEFAULT_OPTIONS: DateTimePickerOptions = {
  selectionMode: 'single', numberOfMonths: 2, responsive: true,
  startDate: null, endDate: null, minRange: 0, maxRange: null,
  allowSameDate: true, allowReverse: true, resetRangeOnStart: true,
  confirmButton: false, clearButton: true, showRangeHighlight: true,
  showRangePreview: true, showOutsideDays: true, periodSelect: true,
  inline: false, // layer or innerhtml
  weekStartDay: 0,
  initialDate: "",
  autoClose: true,
  isRTL: false,
  mode: DateViewMode.date,
  enableTodayBtn: false,
  showMonthAfterYear: false,
  isPositionFixed: false,
  format: "",
  zIndex: 1000,
  minDate: "",
  maxDate: "",
  beforeDrawDate: (dt) => {
    return {
      check: false,
      style: "",
      tooltip: "",
    };
  },
};

// z-index 는 숫자만 허용한다. 문자열을 그대로 style 에 넣으면 다른 CSS 속성이 주입될 수 있다.
function normalizeZIndex(value: unknown): number {
  const num = Number(value);
  return Number.isFinite(num) ? Math.trunc(num) : 1000;
}

function hiddenElement() {
  if (document.getElementById("hiddenDaraDatetimeElement") == null) {
    // body 가 아직 없는 시점(head 에서 생성)에도 팝업이 사라지지 않게 documentElement 로 대체한다.
    (document.body ?? document.documentElement).insertAdjacentHTML("beforeend", `<div id="hiddenDaraDatetimeElement" class="daracl-datetime-hidden"></div>`);
  }

  return document.getElementById("hiddenDaraDatetimeElement");
}

// 팝업과 화면 가장자리 사이의 최소 간격(px).
const VIEWPORT_MARGIN = 8;

let daraDatetimeIdx = 0;

// 요소별 현재 인스턴스. 같은 요소에 다시 생성하면 이전 인스턴스를 destroy 한다.
const INSTANCES = new WeakMap<HTMLElement, DateTimePicker>();

// 기간 프리셋(셀렉트박스). 키는 메시지 키(period1w, period1m ...)와 연결된다. 오늘을 종료일로 두고 시작일은 기간만큼 뺀다.
interface PeriodPreset { key: string; period: RangePeriod }
const PERIOD_PRESETS: PeriodPreset[] = [
  { key: '1w', period: { value: 1, unit: 'W' } },
  { key: '1m', period: { value: 1, unit: 'M' } },
  { key: '3m', period: { value: 3, unit: 'M' } },
  { key: '6m', period: { value: 6, unit: 'M' } },
  { key: '1y', period: { value: 1, unit: 'Y' } },
];

/**
 * date timepicker
 *
 * @class DateTimePicker1
 * @typedef {DateTimePicker}
 */
export class DateTimePicker {
  public static VERSION = `${APP_VERSION}`;
  public static format = format;
  public static parser = parser;

  private rangeState: DateRangeState = { ...rangeResult(null, null), selecting: 'start', committed: false, activeDate: null };
  private committedRange: DateRangeResult = rangeResult(null, null);
  private hasCommittedRange = false;
  private rangeError = '';
  // maxRange 를 해석한 값. 숫자 · 단위 없는 문자열은 일, 'W' · 'M' · 'Y' 는 시작일 기준 달력 단위다.
  private maxPeriod: RangePeriod | null = null;
  private periodSelectEl: HTMLSelectElement | null = null;
  // 입력창을 감싸는 요소와, 감싸기 전에 입력창에 지정되어 있던 오른쪽 여백(복원용)
  private periodField: HTMLElement | null = null;
  private periodInputPadding = '';
  private periodKey = '';
  // 기간 선택 달력의 칸 색인. 날짜 계산과 고정 속성(aria-label 등)은 그릴 때 한 번만 처리하고, paintRange 는 바뀐 값만 DOM 에 쓴다.
  private rangeCells: { el: Element; day: number; flags: number; selected: string }[] = [];
  // 종료일 선택이 거부된 날짜. 같은 날짜를 다시 누르면 그 날짜를 새 시작일로 바꾼다.
  private rangeRejectedDay: number | null = null;
  // 기간이 길어 시작일 · 종료일 달이 연속된 패널에 모두 들어가지 않을 때, 마지막 패널에 보여 줄 종료일의 달(year * 12 + month). null 이면 패널은 연속된 달이다.
  private rangeEndMonth: number | null = null;
  private rangeMedia?: MediaQueryList;
  private disabledRangeDays = new Set<number>();
  private readonly rangeResize = () => { if (!this.destroyed) { this.refresh(false); this.measurePosition()?.(); } };
  private get isRange() { return this.options.selectionMode === 'range'; }
  private readonly options;
  private readonly language: Language;

  private datetimeElement;

  private targetElement: HTMLElement;

  private currentDate: DaraDate;

  private dateFormat: string;

  private todayDate: string;

  private isInput = false;

  private isVisible = false;
  private positionKey = '';
  private timeEventBound = false;
  private destroyed = false;
  private originalClassName = '';
  private originalContent = '';
  private readonly popupClient: PopupClient = {
    measurePosition: () => this.measurePosition(),
    click: event => this._documentClickEvent(event),
    keydown: event => this._documentKeyEvent(event),
  };

  private _viewMode: DateViewMode;

  private initMode: DateViewMode;

  private hourInputEle: HTMLInputElement;

  private minuteInputEle: HTMLInputElement;

  private minDate: number;
  private maxDate: number;
  private minYear = -1;
  private maxYear = -1;
  private minMonth = -1;
  private maxMonth = -1;

  // 요일 순서.
  private dayOrder: number[] = [0, 1, 2, 3, 4, 5, 6];

  constructor(selector: string | HTMLElement, options: Partial<DateTimePickerOptions> = {}, message?: MessageOptions) {
    this.options = Object.assign({}, DEFAULT_OPTIONS, Object.fromEntries(Object.entries(options).filter(([, value]) => value !== undefined)));

    this.options.zIndex = normalizeZIndex(this.options.zIndex);

    daraDatetimeIdx += 1;

    let selectorElement: HTMLElement;
    if (typeof selector === "string") {
      selectorElement = document.querySelector(selector) as HTMLElement;
    } else {
      selectorElement = selector;
    }

    if (!selectorElement) {
      throw new Error(`${selector} datetimepicker element not found`);
    }

    this._viewMode = Object.keys(DateViewMode).includes(this.options.mode) ? this.options.mode as DateViewMode : DateViewMode.date;

    this.initMode = this._viewMode;
    if (this.isRange && ![DateViewMode.date, DateViewMode.datetime].includes(this.initMode)) {
      throw new RangeError('Range selection requires date or datetime mode');
    }

    this.language = new Language(message);

    if (this.initMode == DateViewMode.year) {
      this.dateFormat = this.options.format || DEFAULT_FORMAT.year;
    } else if (this.initMode == DateViewMode.month) {
      this.dateFormat = this.options.format || DEFAULT_FORMAT.month;
    } else if (this.initMode == DateViewMode.time) {
      this.dateFormat = this.options.format || DEFAULT_FORMAT.time;
    } else if (this.initMode == DateViewMode.datetime) {
      this.dateFormat = this.options.format || DEFAULT_FORMAT.datetime;
    } else {
      this.dateFormat = this.options.format || DEFAULT_FORMAT.date;
    }

    let viewDate: DaraDate;
    if (this.options.initialDate) {
      if (typeof this.options.initialDate === "string") {
        viewDate = new DaraDate(parser(this.options.initialDate, this.dateFormat, this.language) || new Date(), this.language);
      } else {
        viewDate = new DaraDate(Number.isFinite(this.options.initialDate.getTime()) ? this.options.initialDate : new Date(), this.language);
      }
    } else {
      const entered = !this.options.inline && 'value' in selectorElement
        ? parser((selectorElement as HTMLInputElement).value, this.dateFormat, this.language) : null;
      viewDate = new DaraDate(entered || new Date(), this.language);
      this.options.initialDate = viewDate.format(this.dateFormat);
    }

    this.setWeekDays();

    this.todayDate = format(new Date(), 'YYYY-MM-DD');
    this.currentDate = viewDate;
    this.targetElement = selectorElement;

    this.minDate = this._minDate();
    this.maxDate = this._maxDate();
    if (this.minDate > this.maxDate) {
      throw new RangeError('minDate must not be after maxDate');
    }
    if (this.currentDate.getTime() < this.minDate) this.currentDate = new DaraDate(new Date(this.minDate), this.language);
    if (this.currentDate.getTime() > this.maxDate) this.currentDate = new DaraDate(new Date(this.maxDate), this.language);

    if (this.isRange) this.initializeRange();

    // 옵션 검증을 모두 통과한 뒤에 이전 인스턴스를 정리한다. (생성이 실패하면 이전 인스턴스를 유지)
    INSTANCES.get(selectorElement)?.destroy();
    INSTANCES.set(selectorElement, this);

    if (this.options.inline) {
      this.originalClassName = selectorElement.className;
      this.originalContent = selectorElement.innerHTML;
      this.datetimeElement = selectorElement;
      this.datetimeElement.classList.add('daracl-datetime-wrapper', `ddtp-${daraDatetimeIdx}`, 'embed');
    } else {
      this.isInput = true;
      (this.targetElement as HTMLInputElement).defaultValue = this.currentDate.format(this.dateFormat);
      (this.targetElement as HTMLInputElement).value = this.currentDate.format(this.dateFormat);

      const datetimeElement = document.createElement("div");
      datetimeElement.className = `daracl-datetime-wrapper ddtp-${daraDatetimeIdx} layer`;
      // setAttribute("style") 는 CSP(style-src)에서 차단되므로 CSSOM 으로 지정한다.
      datetimeElement.style.zIndex = String(this.options.zIndex);
      hiddenElement()?.appendChild(datetimeElement);

      this.datetimeElement = datetimeElement;

      this.initTargetEvent();
    }

    this.createDatetimeTemplate();
    if (this.isRange) this.initRangeTemplate();
    if (this.isRange && this.options.periodSelect) this.initPeriodSelect();

    if (this.isTimeMode()) {
      this.hourInputEle = this.datetimeElement.querySelector(".ddtp-hour") as HTMLInputElement;
      this.minuteInputEle = this.datetimeElement.querySelector(".ddtp-minute") as HTMLInputElement;
    } else {
      this.hourInputEle = {} as HTMLInputElement;
      this.minuteInputEle = {} as HTMLInputElement;
    }

    this.changeViewMode(this._viewMode);

    this.initHeaderEvent();

    this.initDateEvent();
    this.syncTodayButton();

    this.initTimeEvent();
    if (this.isRange) {
      this.syncRangeTime(); this.writeRangeValue();
      if (this.isInput) (this.targetElement as HTMLInputElement).defaultValue = this.formatRange(this.committedRange);
    }
    this.options.onLoad?.(this);
  }
  setWeekDays() {
    let weekStartDay = this.options.weekStartDay;

    if (weekStartDay == 0) return;

    if (!Number.isInteger(weekStartDay) || weekStartDay < 0 || weekStartDay > 6) {
      weekStartDay = 0;
    }

    for (let i = 0; i < 7; i++) {
      const day = weekStartDay + i;

      this.dayOrder[i] = day < 7 ? day : day - 7;
    }
  }

  public static create(selector: string | HTMLElement, options: Partial<DateTimePickerOptions> = {}, message?: MessageOptions): DateTimePicker {
    return new DateTimePicker(selector, options, message);
  }

  /**
   * default date format setting
   * @example
   ```
  setDefaultFormat({
    year: "YYYY",
    month: "YYYY-MM",
    date: "YYYY-MM-DD",
    time: "HH:mm",
    datetime: "YYYY-MM-DD HH:mm",
  });
   ```
   * @public
   * @static
   * @param {*} dateFormat
   */
  public static setDefaultFormat(dateFormat: any) {
    Object.assign(DEFAULT_FORMAT, dateFormat);
  }

  private _minDate() {
    let minDate = this.options.minDate;

    if (minDate != "") {
      if (typeof minDate === "string") {
        const dt = parser(minDate, this.dateFormat, this.language);
        if (!dt) throw new RangeError('Invalid minDate');

        minDate = dt;
      }
      if (!(minDate instanceof Date) || !Number.isFinite(minDate.getTime())) throw new RangeError('Invalid minDate');
      this.minYear = minDate.getFullYear();
      this.minMonth = this.minYear * 12 + minDate.getMonth();
      const boundary = new Date(minDate.getTime());
      return boundary.setHours(0, 0, 0, 0);
    }
    return Number.NEGATIVE_INFINITY;
  }

  private _maxDate() {
    let maxDate = this.options.maxDate;

    if (maxDate != "") {
      if (typeof maxDate === "string") {
        const dt = parser(maxDate, this.dateFormat, this.language);
        if (!dt) throw new RangeError('Invalid maxDate');

        maxDate = dt;
      }
      if (!(maxDate instanceof Date) || !Number.isFinite(maxDate.getTime())) throw new RangeError('Invalid maxDate');
      this.maxYear = maxDate.getFullYear();
      this.maxMonth = this.maxYear * 12 + maxDate.getMonth();
      const boundary = new Date(maxDate.getTime());
      return boundary.setHours(23, 59, 59, 999);
    }
    return Number.POSITIVE_INFINITY;
  }

  public set viewMode(mode: DateViewMode) {
    if (this._viewMode === mode) {
      return;
    }

    this._viewMode = mode;

    this.changeViewMode(mode);
  }

  public get viewMode(): DateViewMode {
    return this._viewMode;
  }

  /**
   * 모드  change
   * @param mode
   */
  public changeViewMode(mode: DateViewMode) {
    if (this.destroyed) return;
    if (!Object.values(DateViewMode).includes(mode)) return;
    this._viewMode = mode;
    this.datetimeElement.querySelector(".ddtp-datetime")?.setAttribute("view-mode", mode);

    if (mode === "year") {
      this.yearDraw();
    } else if (mode === "month") {
      this.monthDraw();
    } else {
      this.dayDraw();
    }
  }

  /**
   * init header event
   *
   * @public
   */
  private initHeaderEvent() {
    const isRTL = this.options.isRTL;
    this.datetimeElement.querySelector(".ddtp-move-btn.prev")?.addEventListener("click", (e: Event) => {
      e.preventDefault();
      this.moveDate(isRTL ? "next" : "prev", e);
    });

    this.datetimeElement.querySelector(".ddtp-move-btn.next")?.addEventListener("click", (e: Event) => {
      e.preventDefault();
      this.moveDate(isRTL ? "prev" : "next", e);
    });

    this.datetimeElement.querySelector(".ddtp-header-year")?.addEventListener("click", (e: Event) => {
      this.viewMode = DateViewMode.year;
    });

    this.datetimeElement.querySelector(".ddtp-header-month")?.addEventListener("click", (e: Event) => {
      this.viewMode = DateViewMode.month;
    });
  }

  /**
   * 날짜 달력 이벤트처리.
   */
  private initDateEvent() {
    this.datetimeElement.querySelector(this.isRange ? ".ddtp-range-months" : ".ddtp-day-body")?.addEventListener("click", (e: Event) => {
      const targetEle = (e.target as Element).closest('.ddtp-day');

      if (targetEle) {
        const selectDate = targetEle.getAttribute("data-day") || "1";

        const mmDD = selectDate.split(",");

        const candidate = this.currentDate.clone().setDate(1)
          .setYear(Number(targetEle.getAttribute('data-year')))
          .setMonth(+mmDD[0] - 1).setDate(+mmDD[1]);
        if (this.isDayDisabled(candidate) || targetEle.classList.contains('disabled')) {
          return;
        }
        if (this.isRange) { this.selectRangeDate(new Date(candidate.getTime()), e); return; }
        const previous = this.currentDate;
        this.currentDate = candidate;

        this.datetimeElement.querySelector(".select")?.classList.remove("select");

        targetEle.classList.add("select");

        if (this.isTimeMode()) {
          this.currentDate.setHour(+this.hourInputEle.value);
          this.currentDate.setMinutes(+this.minuteInputEle.value);
        }

        if (this.dateChangeEvent(e) === false) this.currentDate = previous;
        this.dayDraw(false);
      }
    });

    // today click
    this.datetimeElement.querySelector("button.ddtp-today")?.addEventListener("click", () => {
      // "오늘" 버튼은 날짜나 기간을 선택하지 않고 달력을 오늘 날짜로 보여 주기만 한다. (입력값 · 선택 상태 · onSelect / onRange* 이벤트 · 닫힘은 그대로다)
      const initDate = new DaraDate(new Date());
      if (this.isRange) { this.goToToday(initDate); return; }
      if (this.isDayDisabled(initDate)) return;
      this.currentDate.setDate(1);
      this.currentDate.setYear(initDate.getYear());
      this.currentDate.setMonth(initDate.getMonth() - 1);
      this.currentDate.setDate(initDate.getDate());
      this.changeViewMode(this.initMode);
    });
  }

  // 오늘을 선택할 수 없으면(minDate · maxDate · 비활성 날짜 / 요일) "오늘" 버튼을 숨긴다.
  private syncTodayButton() {
    const button = this.datetimeElement.querySelector('button.ddtp-today') as HTMLButtonElement | null;
    if (!button) return;
    const hidden = this.isDayDisabled(new DaraDate(new Date()));
    if (button.hidden !== hidden) button.hidden = hidden;
  }

  // 기간 선택의 "오늘" 버튼: 달력만 오늘의 달로 되돌린다. (날짜보기, 첫 패널이 오늘의 달인 연속된 달) 기간 · 시작일 · 종료일은 선택하거나 바꾸지 않고 이벤트도 호출하지 않는다.
  private goToToday(today: DaraDate) {
    this.rangeEndMonth = null;
    this.currentDate = this.currentDate.clone().setDate(1).setYear(today.getYear()).setMonth(today.getMonth() - 1);
    this.changeViewMode(this.initMode);
  }

  private isTimeMode(): boolean {
    return this.initMode === DateViewMode.time || this.initMode === DateViewMode.datetime;
  }

  private getTimeNumberValue(val:string){
    if(!isNumeric(val)){
      return 0;
    }

    return Math.max(0, parseInt(val,10) || 0);
  }

  /**
   * 시간 분 설정 이벤트 처리.
   *
   * @public
   */
  public initTimeEvent() {
    if (!this.isTimeMode() || this.timeEventBound) return;
    this.timeEventBound = true;
    if (this.isRange) { this.initRangeTimeEvent(); return; }

    const hh = this.currentDate.format("HH");

    const datetimeElement = this.datetimeElement; 

    const hourInputEle = datetimeElement.querySelector(".ddtp-hour") as HTMLInputElement;
    const hourRangeEle = datetimeElement.querySelector(".ddtp-hour-range") as HTMLInputElement;
    hourInputEle.value = hh;
    hourRangeEle.value = hh;

    hourInputEle.addEventListener("input", (e: Event) => {
      const targetElement = e.target as HTMLInputElement;

      const val = this.getTimeNumberValue(targetElement.value);

      let addVal = leftPad(Math.min(val, 23), 2);
      
      if(parseInt(addVal,10)>23){
        addVal = 23+'';
      }

      hourInputEle.value = addVal;
      hourRangeEle.value = addVal;
    });

    hourRangeEle.addEventListener("input", (e: Event) => {
      const targetElement = e.target as HTMLInputElement;
      hourInputEle.value = leftPadClamp(targetElement.value,2,'0');
    });

    const mm = this.currentDate.format("mm");
    const minuteInputEle = datetimeElement.querySelector(".ddtp-minute") as HTMLInputElement;
    const minuteRangeEle = datetimeElement.querySelector(".ddtp-minute-range") as HTMLInputElement;

    minuteInputEle.value = mm;
    minuteRangeEle.value = mm;

    minuteInputEle.addEventListener("input", (e: Event) => {
      const targetElement = e.target as HTMLInputElement;
      const val = this.getTimeNumberValue(targetElement.value);
      let addVal = leftPad(Math.min(val, 59), 2);

      if(parseInt(addVal,10)>59){
        addVal = 59+'';
      }

      minuteInputEle.value = addVal;
      minuteRangeEle.value = addVal;
    });

    minuteRangeEle.addEventListener("input", (e: Event) => {
      const targetElement = e.target as HTMLInputElement;
      minuteInputEle.value = leftPadClamp(targetElement.value,2,'0');
    });

    datetimeElement.querySelector(".time-select")?.addEventListener("click", (e: Event) => {
      const previous = this.currentDate.clone();
      this.currentDate.setHour(+hourInputEle.value);
      this.currentDate.setMinutes(+minuteInputEle.value);
      if (this.dateChangeEvent(e) === false) this.currentDate = previous;
    });
  }

  /**
   * 날짜 이동
   * @param moveMode // 앞뒤 이동 prev, next
   * @returns
   */
  public moveDate(moveMode: string, e: Event) {
    if (this._viewMode === DateViewMode.date || this._viewMode === DateViewMode.datetime) {
      this.rangeEndMonth = null;
      this.currentDate.setDate(1);
      this.currentDate.addMonth("prev" === moveMode ? -1 : 1);
      this.dayDraw();
      return;
    }

    if (this._viewMode === DateViewMode.month) {
      this.currentDate.setDate(1);
      this.currentDate.addYear("prev" === moveMode ? -1 : 1);
      this.monthDraw();
      return;
    }

    if (this._viewMode === DateViewMode.year) {
      this.currentDate.setDate(1);
      this.currentDate.addYear("prev" === moveMode ? -16 : 16);
      this.yearDraw();
    }
  }

  /**
   * get date value
   *
   * @returns
   */
  public getDateValue() {
    if (this.isRange) return this.formatRange(this.getRange());
    return this.currentDate.format(this.dateFormat);
  }

  /**
   * 옵션 셋팅
   * @static
   * @param {DateTimePickerOptions} options
   */
  static setOptions(options: Partial<DateTimePickerOptions>) {
    DEFAULT_OPTIONS = Object.assign({}, DEFAULT_OPTIONS, Object.fromEntries(Object.entries(options).filter(([, value]) => value !== undefined)));
  }

  /**
   * 달력 보이기 처리.
   *
   * @returns
   */
  private show() {
    if (this.destroyed || this.isVisible) {
      return;
    }
    this.syncTodayButton(); // 날짜가 바뀌었을 수 있으므로 열 때마다 다시 판단한다.
    this.layoutPeriodSelect();
    const entered = this.isRange ? null : parser((this.targetElement as HTMLInputElement).value, this.dateFormat, this.language);
    if (entered && !this.isDayDisabled(new DaraDate(entered))) {
      this.currentDate = new DaraDate(entered, this.language);
      this.refresh();
      if (this.isTimeMode()) {
        for (const [selector, token] of [['.ddtp-hour', 'HH'], ['.ddtp-hour-range', 'HH'], ['.ddtp-minute', 'mm'], ['.ddtp-minute-range', 'mm']]) {
          (this.datetimeElement.querySelector(selector) as HTMLInputElement).value = this.currentDate.format(token);
        }
      }
    }
    this.isVisible = true;

    this.datetimeElement.classList.remove("hide");

    this.datetimeElement.classList.add("show");

    this.measurePosition()?.();
    registerPopup(this.popupClient);
  }

  // 레이아웃이 바뀔 때 입력 요소의 현재 좌표를 기준으로 다시 배치합니다.
  private measurePosition() {
    if (!this.isVisible || this.destroyed || this.options.inline) return;
    const docSize = getDocSize();

    const rect = this.targetElement.getBoundingClientRect();

    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const scrollLeft = window.scrollX || document.documentElement.scrollLeft;

    const elementHeight = this.datetimeElement.offsetHeight;
    const targetElementHeight = this.targetElement.offsetHeight + 2;
    let left = rect.left + scrollLeft;

    let top = 0;

    if (this.options.isPositionFixed) {
      top = rect.top + targetElementHeight;
      left = rect.left;
    } else {
      if (rect.top + targetElementHeight + elementHeight > docSize.clientHeight && rect.top >= elementHeight) {
        top = scrollTop + rect.top - elementHeight - 2;
      } else {
        top = scrollTop + rect.top + targetElementHeight;
      }
    }
    const minLeft = this.options.isPositionFixed ? 0 : scrollLeft;
    // 화면 가장자리에 붙지 않도록 좌우에 여백을 둔다.
    left = Math.max(minLeft + VIEWPORT_MARGIN, Math.min(left, minLeft + docSize.clientWidth - this.datetimeElement.offsetWidth - VIEWPORT_MARGIN));

    const key = `${this.options.isPositionFixed}|${top}|${left}|${this.options.zIndex}`;
    return () => {
      if (!this.isVisible || this.destroyed || this.positionKey === key) return;
      // 속성 문자열 대신 CSSOM 으로 쓰면 style-src 가 엄격한 CSP 에서도 위치가 적용된다.
      const style = this.datetimeElement.style;
      style.position = this.options.isPositionFixed ? "fixed" : "";
      style.top = `${top}px`;
      style.left = `${left}px`;
      style.zIndex = String(this.options.zIndex);
      this.positionKey = key;
    };
  }

  /**
   * 달력 숨기기
   */
  private hide() {
    if (!this.isVisible) return;
    if (this.options.onClose) {
      if (this.options.onClose() === false) {
        return;
      }
    }
    // ESC · 바깥 클릭으로 닫을 때 확정되지 않은 기간 선택은 취소한다.
    if (this.isRange && this.hasPendingRange()) {
      this.revertRange();
      this.options.onRangeCancel?.();
    }
    this.isVisible = false;

    this.datetimeElement.classList.remove("show");

    this.datetimeElement.classList.add("hide");

    unregisterPopup(this.popupClient);
  }

  private _documentKeyEvent = (e: KeyboardEvent) => {
    if (e.key === 'Escape') this.hide();
  };

  private _targetClickEvent = () => { this.show(); };

  /** DOM과 전역 이벤트를 정리합니다. 여러 번 호출해도 안전합니다. */
  public destroy() {
    if (this.destroyed) return;
    unregisterPopup(this.popupClient);
    this.rangeMedia?.removeEventListener('change', this.rangeResize);
    this.targetElement.removeEventListener('click', this._targetClickEvent);
    if (INSTANCES.get(this.targetElement) === this) INSTANCES.delete(this.targetElement);
    this.unwrapPeriodSelect();
    this.periodSelectEl?.remove();
    if (this.options.inline) {
      this.targetElement.className = this.originalClassName;
      this.targetElement.innerHTML = this.originalContent;
    } else {
      this.datetimeElement.remove();
    }
    this.isVisible = false;
    this.destroyed = true;
  }

  /**
   * 바탕 클릭시 캘린더 숨김 처리.
   *
   * @param e
   */
  private _documentClickEvent = (e: Event) => {
    // 클릭한 칸이 재렌더링으로 DOM 에서 분리되어도 이벤트 경로로 팝업 내부 클릭인지 판단한다.
    const path = e.composedPath();
    const inside = path.includes(this.datetimeElement) || closestElement(e.target as HTMLElement, this.datetimeElement);
    // 입력창 옆(안쪽)의 기간 프리셋 셀렉트박스를 누르는 것은 바깥 클릭이 아니다. 항목을 고르면 applyPeriod 가 확정하면서 autoClose 에 따라 닫는다.
    const onPeriodSelect = !!this.periodSelectEl && path.includes(this.periodSelectEl);
    if (this.isVisible && e.target != this.targetElement && !inside && !onPeriodSelect) {
      this.hide();
    }
  };

  /**
   * 타켓 이벤트 처리.
   */
  private initTargetEvent() {
    if (this.targetElement) {
      this.targetElement.addEventListener("click", this._targetClickEvent);
    }
  }

  /**
   * 날짜 변경후 이벤트
   */
  private afterChangeDatepicker() {
    const formatValue = this.currentDate.format(this.dateFormat);

    if (this.options.afterChangeDatepicker && isFunction(this.options.afterChangeDatepicker)) {
      this.options.afterChangeDatepicker(formatValue, this.viewMode);
    }
  }

  /**
   * 날짜 변경 전 이벤트.
   * @returns void
   */
  private beforeChangeDatepicker() {
    const formatValue = this.currentDate.format(this.dateFormat);

    if (this.options.beforeChangeDatepicker && isFunction(this.options.beforeChangeDatepicker)) {
      let completed = false;
      const reval = this.options.beforeChangeDatepicker(formatValue, (result: boolean) => {
        if (completed || this.destroyed) return;
        completed = true;
        if (result === false) {
          return;
        }

        this.refresh(false);
      });

      if (reval === false || completed) {
        return;
      }

      completed = true;
      this.refresh(false);
      return;
    }

    this.refresh(false);
  }

  private dateChangeEvent(e: Event) {
    const disabled = this.initMode === DateViewMode.year ? this.isYearDisabled(this.currentDate.getYear())
      : this.initMode === DateViewMode.month ? this.isMonthDisabled(this.currentDate.getYear(), this.currentDate.getMonth() - 1)
        : this.isDayDisabled(this.currentDate);
    if (this.destroyed || disabled) return false;
    const formatValue = this.currentDate.format(this.dateFormat);

    if (this.options.onSelect) {
      if (this.options.onSelect(formatValue, this.viewMode, e) === false) {
        return false;
      }
    }

    if (this.isInput) {
      (this.targetElement as HTMLInputElement).value = formatValue;
    }

    if (!this.options.inline && this.options.autoClose) {
      this.hide();
    }
    return true;
  }

  /**
   *  datepicker template  그리기
   */
  private createDatetimeTemplate() {
    const showMonthAfterYear = this.options.showMonthAfterYear;

    const datetimeTemplate = `<div class="ddtp-datetime ${this.options.isRTL ? "rtl" : ""}" view-mode="${this._viewMode}">
			<div class="ddtp-header">
                <span class="${showMonthAfterYear ? "ddtp-header-year" : "ddtp-header-month"}"></span>
                <span class="${showMonthAfterYear ? "ddtp-header-month" : "ddtp-header-year"}"></span>

                <span class="ddtp-date-move">  
                    ${this.options.enableTodayBtn ? `<button type="button" class="ddtp-today">${escapeHtml(this.language.getMessage("today"))}</button>` : ""}
                    <a href="#" class="ddtp-move-btn prev">
                        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#000000"><path d="M0 0h24v24H0z" fill="none"/><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
                    </a>
                    <a href="#" class="ddtp-move-btn next">
                        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#000000"><path d="M0 0h24v24H0z" fill="none"/><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
                    </a> 
                </span>
			</div>
            <div class="ddtp-body">
                <table class="ddtp-days">
                    <thead class="ddtp-day-header">
                        <tr>		
                            <td class="ddtp-day-label ${DAY_STYLE_CLASS[this.dayOrder[0]]}">${escapeHtml(this.language.getWeeksMessage(this.dayOrder[0]))}</td>
                            <td class="ddtp-day-label ${DAY_STYLE_CLASS[this.dayOrder[1]]}">${escapeHtml(this.language.getWeeksMessage(this.dayOrder[1]))}</td>
                            <td class="ddtp-day-label ${DAY_STYLE_CLASS[this.dayOrder[2]]}">${escapeHtml(this.language.getWeeksMessage(this.dayOrder[2]))}</td>
                            <td class="ddtp-day-label ${DAY_STYLE_CLASS[this.dayOrder[3]]}">${escapeHtml(this.language.getWeeksMessage(this.dayOrder[3]))}</td>
                            <td class="ddtp-day-label ${DAY_STYLE_CLASS[this.dayOrder[4]]}">${escapeHtml(this.language.getWeeksMessage(this.dayOrder[4]))}</td>
                            <td class="ddtp-day-label ${DAY_STYLE_CLASS[this.dayOrder[5]]}">${escapeHtml(this.language.getWeeksMessage(this.dayOrder[5]))}</td>
                            <td class="ddtp-day-label ${DAY_STYLE_CLASS[this.dayOrder[6]]}">${escapeHtml(this.language.getWeeksMessage(this.dayOrder[6]))}</td>
                        </tr>
                    </thead>
                    <tbody class="ddtp-day-body">
                    </tbody>
                    
                    <tfoot class="ddtp-day-footer"><tr>
                        <td colspan="7">
                            <div class="footer-tooltip"></div>
                        </td>
                    </tr></tfoot>
                </table>

                <div class="ddtp-times">
                        <div class="time-container">
                            <div class="ddtp-time">
                                <span>H: </span><input type="number" class="ddtp-hour" min="0" max="23" maxlength="2">
                                <input type="range" min="0" max="23" class="ddtp-hour-range">
                            </div>
                            <div class="ddtp-time">
                                <span>M: </span><input type="number" class="ddtp-minute" min="0" max="59" size="2" maxlength="2">
                                <input type="range" min="0" max="59" class="ddtp-minute-range">
                            </div>
                        </div>
                        <div class="ddtp-btn">
                            <button type="button" class="time-select">${escapeHtml(this.language.getMessage("ok"))}</button>
                        </div>
                </div>

                <div class="ddtp-months">
                </div>

                <div class="ddtp-years">
                </div>
            </div>
        </div>`;

    this.datetimeElement.innerHTML = datetimeTemplate;
  }

  public refresh(beforeChangeDatepickerCheck?: boolean) {
    if (this.destroyed) return;
    if (this._viewMode === DateViewMode.date || this._viewMode === DateViewMode.datetime) {
      this.dayDraw(beforeChangeDatepickerCheck);
      return;
    }

    if (this._viewMode === DateViewMode.month) {
      this.monthDraw(beforeChangeDatepickerCheck);
      return;
    }

    if (this._viewMode === DateViewMode.year) {
      this.yearDraw(beforeChangeDatepickerCheck);
    }
  }

  /**
   * 년 달력 그리기
   */
  private yearDraw(beforeChangeDatepickerCheck?: boolean) {
    const currentYear = this.currentDate.format("YYYY");

    if (beforeChangeDatepickerCheck !== false && this.initMode == DateViewMode.year) {
      this.beforeChangeDatepicker();
      return;
    }

    const startYear = +currentYear - 8;

    (this.datetimeElement.querySelector(".ddtp-header-year") as Element).textContent = `${startYear} ~ ${startYear + 15}`;

    const beforeDrawDateFlag = isFunction(this.options.beforeDrawDate);
    const beforeDrawDateFn = beforeDrawDateFlag ? this.options.beforeDrawDate : false;

    const calHTML: string[] = [];
    for (let i = 0; i < 16; i++) {
      const year = startYear + i;

      const disabled = this.isYearDisabled(year);

      let addStylceClass = disabled ? " disabled" : "";

      let tooltip = "";
      if (beforeDrawDateFlag && beforeDrawDateFn) {
        const reval = beforeDrawDateFn({ mode: this._viewMode, date: year });
        addStylceClass += reval?.style ? " " + escapeHtml(reval.style) : "";
        tooltip = reval?.tooltip;
        tooltip = tooltip ? `title="${escapeHtml(tooltip)}"` : "";
      }

      calHTML.push(`<div class="ddtp-year ${addStylceClass}" data-year="${year}" ${tooltip}>${year}</div>`);
    }
    (this.datetimeElement.querySelector(".ddtp-years") as Element).innerHTML = calHTML.join("");

    if (this.initMode == DateViewMode.year) {
      this.afterChangeDatepicker();
    }

    this.datetimeElement.querySelectorAll(".ddtp-year")?.forEach((yearEle) => {
      yearEle.addEventListener("click", (e: Event) => {
        const targetEle = e.target as Element;

        if (targetEle) {
          const year = targetEle.getAttribute("data-year");

          if (year) {
            const numYear = +year;

            if (this.isYearDisabled(numYear)) {
              return;
            }

            if (this.initMode == DateViewMode.year) {
              if (this.isYearDisabled(numYear)) {
                return;
              }
              const previous = this.currentDate.clone();
              this.currentDate.setYear(numYear);
              if (this.dateChangeEvent(e) === false) this.currentDate = previous;
              return;
            }

            this.currentDate.setYear(numYear);
            this.viewMode = this.initMode;
          }
        }
      });
    });
  }

  /**
   * 월 달력 그리기
   */
  private monthDraw(beforeChangeDatepickerCheck?: boolean) {
    if (beforeChangeDatepickerCheck !== false && this.initMode == DateViewMode.month) {
      this.beforeChangeDatepicker();
      return;
    }

    const year = this.currentDate.format("YYYY");
    (this.datetimeElement.querySelector(".ddtp-header-year") as Element).textContent = `${year}`;

    (this.datetimeElement.querySelector(".ddtp-header-month") as Element).textContent = this.currentDate.format("MMMM");

    const beforeDrawDateFlag = isFunction(this.options.beforeDrawDate);
    const beforeDrawDateFn = beforeDrawDateFlag ? this.options.beforeDrawDate : false;

    const calHTML: string[] = [];
    for (let i = 0; i < 12; i++) {
      const disabled = this.isMonthDisabled(+year, i);

      let addStylceClass = disabled ? " disabled" : "";
      let tooltip = "";
      if (beforeDrawDateFlag && beforeDrawDateFn) {
        const reval = beforeDrawDateFn({ mode: this._viewMode, date: year + "/" + (i + 1) });
        addStylceClass += reval?.style ? " " + escapeHtml(reval.style) : "";
        tooltip = reval?.tooltip;
        tooltip = tooltip ? `title="${escapeHtml(tooltip)}"` : "";
      }

      calHTML.push(`<div class="ddtp-month ${addStylceClass}" data-month="${i}" ${tooltip}>${escapeHtml(this.language.getMonthsMessage(i, "abbr"))}</div>`);
    }
    (this.datetimeElement.querySelector(".ddtp-months") as Element).innerHTML = calHTML.join("");

    if (this.initMode == DateViewMode.month) {
      this.afterChangeDatepicker();
    }

    this.datetimeElement.querySelectorAll(".ddtp-month")?.forEach((monthEle) => {
      monthEle.addEventListener("click", (e: Event) => {
        const targetEle = e.target as Element;

        if (targetEle) {
          const month = targetEle.getAttribute("data-month");

          if (month) {
            if (this.isMonthDisabled(this.currentDate.getYear(), +month)) {
              return false;
            }

            if (this.initMode == DateViewMode.month) {
              const previous = this.currentDate.clone();
              this.currentDate.setMonth(+month);
              if (this.dateChangeEvent(e) === false) this.currentDate = previous;
              return;
            }
            this.currentDate.setMonth(+month);
            this.viewMode = this.initMode;
            this.dayDraw();
          }
        }
      });
    });
  }

  /**
   * 날짜 그리기
   */
  private dayDraw(beforeChangeDatepickerCheck?: boolean) {
    this.todayDate = format(new Date(), 'YYYY-MM-DD');
    if (beforeChangeDatepickerCheck !== false && (this.initMode == DateViewMode.date || this.initMode == DateViewMode.datetime)) {
      this.beforeChangeDatepicker();
      return;
    }

    (this.datetimeElement.querySelector('.ddtp-header-year') as Element).textContent = this.currentDate.format('YYYY');
    (this.datetimeElement.querySelector('.ddtp-header-month') as Element).textContent = this.currentDate.format('MMMM');
    if (this.isRange) {
      const container = this.datetimeElement.querySelector('.ddtp-range-months') as HTMLElement;
      const prototype = container.querySelector('table')!.cloneNode(true) as HTMLTableElement;
      container.innerHTML = '';
      const count = this.rangeMonthCount(), firstMonth = this.currentDate.getYear() * 12 + this.currentDate.getMonth() - 1;
      // 첫 패널부터 연속으로 그리되, rangeEndMonth 가 연속된 패널 밖이면 마지막 패널만 종료일의 달로 대체한다. (예: 6월 | 12월)
      const endOffset = count > 1 && this.rangeEndMonth !== null && this.rangeEndMonth > firstMonth + count - 1 ? this.rangeEndMonth - firstMonth : -1;
      for (let i = 0; i < count; i++) {
        const table = prototype.cloneNode(true) as HTMLTableElement;
        const date = this.currentDate.clone().setDate(1).addMonth(i === count - 1 && endOffset >= 0 ? endOffset : i);
        table.querySelector('caption')!.textContent = date.format(this.options.showMonthAfterYear ? 'YYYY MMMM' : 'MMMM YYYY');
        this.drawDayMonth(date, table.querySelector('tbody')!);
        container.appendChild(table);
      }
      this.indexRangeCells();
      this.paintRange();
    } else this.drawDayMonth(this.currentDate, this.datetimeElement.querySelector('.ddtp-day-body')!);
    if (this.initMode == DateViewMode.date || this.initMode == DateViewMode.datetime) this.afterChangeDatepicker();
  }

  private drawDayMonth(monthDate: DaraDate, target: Element) {
    const monthFirstDate = monthDate.clone();
    const currentMonth = monthFirstDate.getMonth();
    monthFirstDate.setDate(1);



    let day = monthFirstDate.getDay();

    day = day - this.dayOrder[0];

    if (day >= 0) {
      monthFirstDate.addDate(-day);
    } else {
      monthFirstDate.addDate(-(7 + day));
    }

    const beforeDrawDateFlag = isFunction(this.options.beforeDrawDate);
    const beforeDrawDateFn = beforeDrawDateFlag ? this.options.beforeDrawDate : false;

    const calHTML = [];
    for (let i = 0; i < 42; i++) {
      let dateItem;
      if (i == 0) {
        dateItem = monthFirstDate;
      } else {
        dateItem = monthFirstDate.clone().addDate(i);
      }

      const dateItemFormat = dateItem.format('YYYY-MM-DD');

      if (i % 7 == 0) {
        calHTML.push((i == 0 ? "" : "</tr>") + "<tr>");
      }

      const disabled = this.isDayDisabled(dateItem);

      let addStylceClass = DAY_STYLE_CLASS[this.dayOrder[i % 7]];
      const dateItemMonth = dateItem.getMonth();

      if (dateItemMonth != currentMonth) {
        // 연도를 포함해 이전 달(old) / 다음 달(new)을 판단한다.
        addStylceClass += dateItem.getYear() * 12 + dateItemMonth < monthDate.getYear() * 12 + currentMonth ? " old" : " new";
      }

      addStylceClass += this.todayDate == dateItemFormat ? " ddtp-today" : "";
      addStylceClass += !this.isRange && this.currentDate.format('YYYY-MM-DD') === dateItemFormat ? ' select' : '';
      if (this.isRange && !this.options.showOutsideDays && dateItemMonth !== currentMonth) addStylceClass += ' ddtp-outside-hidden';
      addStylceClass += disabled ? " disabled" : "";

      let tooltip = "";
      if (beforeDrawDateFlag && beforeDrawDateFn) {
        const reval = beforeDrawDateFn({ mode: this._viewMode, item: dateItem, date: dateItem.format(this.dateFormat) });
        addStylceClass += reval?.style ? " " + escapeHtml(reval.style) : "";

        addStylceClass += reval?.check ? " ddtp-event" : "";
        tooltip = reval?.tooltip;
        tooltip = tooltip ? `title="${escapeHtml(tooltip)}"` : "";
      }

      // 기간 선택은 접근성 속성을 처음부터 HTML 에 넣는다. 그린 뒤 setAttribute 로 다시 쓰면 DOM 변경 기록이 칸 수만큼 늘어난다.
      let aria = "";
      if (this.isRange) {
        const midnight = new Date(0);
        midnight.setFullYear(dateItem.getYear(), dateItem.getMonth() - 1, dateItem.getDate());
        midnight.setHours(0, 0, 0, 0);
        const hidden = !this.options.showOutsideDays && dateItemMonth !== currentMonth;
        aria = ` aria-selected="false" aria-disabled="${disabled}" tabindex="${disabled || hidden ? -1 : 0}" aria-label="${escapeHtml(format(midnight, this.dateFormat, this.language))}"`;
      }
      calHTML.push(`<td class="ddtp-day ${addStylceClass}" data-year="${dateItem.getYear()}" data-day="${dateItem.format("M,D")}"${aria} ${tooltip}>`);
      calHTML.push(`<span>${dateItem.format("d")}</span>`);
      calHTML.push("</td>");
    }

    calHTML.push("</tr>");

    target.innerHTML = calHTML.join("");

  }

  private parseRangeDate(value: Date | string | null | undefined): Date | null {
    if (value == null || value === '') return null;
    const date = typeof value === 'string' ? parser(value, this.dateFormat, this.language) : cloneDate(value);
    if (!date || !Number.isFinite(date.getTime())) throw new RangeError('Invalid range date');
    if (this.initMode === DateViewMode.date) date.setHours(0, 0, 0, 0);
    return date;
  }

  private initializeRange() {
    const o = this.options;
    for (const count of [o.numberOfMonths, o.responsiveOptions?.mobileMonths, o.responsiveOptions?.desktopMonths]) {
      if (count !== undefined && (!Number.isInteger(count) || count < 1 || count > 12)) throw new RangeError('Month count must be between 1 and 12');
    }
    if (!Number.isInteger(o.minRange) || o.minRange! < 0) throw new RangeError('Invalid range limits');
    if (o.maxRange != null) {
      const period = parseRangePeriod(o.maxRange);
      if (!period || (period.unit === 'D' && period.value < Math.max(1, o.minRange!))) throw new RangeError('Invalid range limits');
      this.maxPeriod = period;
    }
    if (o.responsiveOptions?.breakpoint !== undefined && (!Number.isFinite(o.responsiveOptions.breakpoint) || o.responsiveOptions.breakpoint <= 0)) throw new RangeError('Invalid breakpoint');
    for (const date of o.disabledDates || []) this.disabledRangeDays.add(calendarDay(this.parseRangeDate(date)!));
    if ((o.disabledWeekdays || []).some(day => !Number.isInteger(day) || day < 0 || day > 6)) throw new RangeError('Invalid disabled weekday');
    let start = this.parseRangeDate(o.startDate), end = this.parseRangeDate(o.endDate);
    // 시작일 / 종료일 중 하나만 주어지면 같은 값으로 양쪽을 채운다. 옵션 규칙(minRange 등)에 맞지 않으면 채우지 않는다.
    const only = start || end;
    if (only && (!start || !end) && this.validRange(only, only)) { start = cloneDate(only); end = cloneDate(only); }
    if (!this.validRange(start, end)) throw new RangeError('Invalid initial range');
    this.rangeState = { ...rangeResult(start, end), selecting: start && !end ? 'end' : 'start', committed: !!end, activeDate: null };
    this.committedRange = end ? rangeResult(start, end) : rangeResult(null, null);
    this.hasCommittedRange = !!end;
    if (start) this.currentDate = new DaraDate(start, this.language);
  }

  private rangeDayDisabled(date: Date) {
    const day = calendarDay(date);
    return (Number.isFinite(this.minDate) && day < calendarDay(new Date(this.minDate))) ||
      (Number.isFinite(this.maxDate) && day > calendarDay(new Date(this.maxDate))) ||
      this.disabledRangeDays.has(day) || (this.options.disabledWeekdays || []).includes(date.getDay());
  }

  private validRange(start: Date | null, end: Date | null): boolean {
    if (!start) return !end;
    if (this.rangeDayDisabled(start)) return false;
    if (!end) return true;
    if (end < start || this.rangeDayDisabled(end)) return false;
    const days = calendarDay(end) - calendarDay(start) + 1;
    if ((!this.options.allowSameDate && days === 1) || days < this.options.minRange! || this.exceedsMaxRange(start, end)) return false;
    return !this.rangeCrossesDisabled(start, end);
  }

  // 기간 안에 비활성 날짜 / 요일이 들어 있는지 확인한다. 긴 기간을 하루씩 순회하지 않는다.
  private rangeCrossesDisabled(start: Date, end: Date): boolean {
    const first = calendarDay(start), last = calendarDay(end), days = last - first + 1;
    for (const day of this.disabledRangeDays) if (day >= first && day <= last) return true;
    for (const weekday of this.options.disabledWeekdays || []) if ((weekday - start.getDay() + 7) % 7 < days) return true;
    return false;
  }

  public getRange(): DateRangeResult { return rangeResult(this.rangeState.startDate, this.rangeState.endDate); }

  public getRangeState(): DateRangeState {
    return { ...this.rangeState, ...this.getRange(), activeDate: cloneDate(this.rangeState.activeDate) };
  }

  private formatRange(range: DateRangeResult) {
    return range.startDate ? format(range.startDate, this.dateFormat, this.language) + (range.endDate ? ' ~ ' + format(range.endDate, this.dateFormat, this.language) : '') : '';
  }

  private writeRangeValue() {
    if (this.isInput) (this.targetElement as HTMLInputElement).value = this.formatRange(this.committedRange);
  }

  private applyRange(start: Date | null, end: Date | null, event?: Event, starting = false): boolean {
    if (this.destroyed || !this.isRange || !this.validRange(start, end)) return false;
    const previous = this.getRange();
    if (previous.startDate?.getTime() === start?.getTime() && previous.endDate?.getTime() === end?.getTime()) return true;
    if (this.options.beforeSelectRange?.(rangeResult(start, end)) === false) return false;
    if (event && this.options.onSelect?.(this.formatRange(rangeResult(start, end)), this.initMode, event) === false) return false;
    this.rangeState = { ...rangeResult(start, end), selecting: start && !end ? 'end' : 'start', committed: false, activeDate: null };
    this.paintRange();
    if (starting && start) this.options.onRangeStart?.(new Date(start));
    this.options.onRangeChange?.(this.getRange());
    if (this.rangeState.complete) {
      this.options.onRangeComplete?.(this.getRange());
      if (!this.options.confirmButton) this.confirmRange();
    }
    return true;
  }

  // 종료일 선택이 거부되는 사유(길이 제한 / 비활성 날짜 포함)를 안내 메시지로 반환한다. 사유가 없으면 빈 문자열이다.
  private rangeSelectError(start: Date, end: Date): string {
    const days = calendarDay(end) - calendarDay(start) + 1, min = Math.max(this.options.minRange!, this.options.allowSameDate ? 1 : 2);
    if (days < min) return String(this.language.getMessage('rangeMin')).replace('{days}', String(min));
    if (this.exceedsMaxRange(start, end)) return this.rangeMaxMessage();
    if (this.rangeCrossesDisabled(start, end)) return String(this.language.getMessage('rangeDisabled'));
    if (end < start) return String(this.language.getMessage('rangeTimeOrder'));
    return '';
  }

  private selectRangeDate(date: Date, event: Event) {
    // 거부 안내가 떠 있는 상태에서 같은 날짜를 다시 누르면 종료일이 아니라 새 시작일로 처리한다.
    const retry = !!this.rangeError && this.rangeRejectedDay === calendarDay(date);
    // 완료된 기간의 종료일을 다시 누르면 시작일은 유지하고 종료일만 다시 고른다. (resetRangeOnStart 와 무관)
    const { startDate, endDate } = this.rangeState;
    if (!retry && this.rangeState.complete && startDate && endDate && calendarDay(date) === calendarDay(endDate)) {
      // 더블클릭의 두 번째 클릭이 방금 확정한 기간을 되돌리지 않게 한다.
      if ((event as MouseEvent).detail > 1) return;
      this.rangeError = ''; this.rangeRejectedDay = null;
      this.applyRange(cloneDate(startDate), null, event, false);
      return;
    }
    const starting = this.rangeState.selecting === 'start' || retry;
    this.rangeError = '';
    this.rangeRejectedDay = null;
    if (this.isTimeMode()) {
      const [hour, minute] = this.rangeTimeInputs(starting ? 'start' : 'end');
      date.setHours(+hour.value, +minute.value, 0, 0);
    } else date.setHours(0, 0, 0, 0);
    let start = starting ? date : cloneDate(this.rangeState.startDate);
    let end = starting ? (this.options.resetRangeOnStart ? null : cloneDate(this.rangeState.endDate)) : date;
    if (starting && end && !this.validRange(start, end)) end = null;
    // 시작일보다 이른 날을 고르면 먼저 고른 날을 종료일로, 새로 고른 날을 시작일로 바꾼다.
    if (!starting && start && end && calendarDay(end) < calendarDay(start)) {
      if (!this.options.allowReverse) return;
      const first = start;
      start = end; end = first;
      // 시간은 날짜를 따라가지 않고 시작 / 종료 시간 그룹의 값을 따른다.
      if (this.isTimeMode()) {
        const [startHour, startMinute] = this.rangeTimeInputs('start'), [endHour, endMinute] = this.rangeTimeInputs('end');
        start.setHours(+startHour.value, +startMinute.value, 0, 0);
        end.setHours(+endHour.value, +endMinute.value, 0, 0);
      }
    }
    if (!starting && start && end) {
      const message = this.rangeSelectError(start, end);
      if (message) { this.rangeError = message; this.rangeRejectedDay = calendarDay(date); this.paintRange(); return; }
    }
    if (this.applyRange(start, end, event, starting)) {
      this.syncRangeTime();
    }
  }

  public confirmRange(): boolean {
    if (!this.isRange || this.destroyed || (this.rangeState.startDate && !this.rangeState.complete) || !this.validRange(this.rangeState.startDate, this.rangeState.endDate)) return false;
    if (!this.rangeState.committed) {
      this.committedRange = this.getRange();
      this.hasCommittedRange = true;
      this.rangeState.committed = true;
      this.writeRangeValue();
      this.options.onRangeConfirm?.(this.getRange());
    }
    if (this.options.autoClose && !this.options.inline) this.hide();
    return true;
  }

  public clearRange(): boolean {
    this.rangeError = '';
    if (!this.applyRange(null, null)) return false;
    if (!this.options.confirmButton) this.confirmRange();
    this.syncRangeTime();
    return true;
  }

  public cancelRange() {
    if (!this.isRange || this.destroyed) return;
    this.revertRange();
    this.options.onRangeCancel?.();
    if (!this.options.inline) this.hide();
  }

  // 확정되지 않은 선택(시작일만 고른 상태, 확인 전 변경)이 있는지 확인한다.
  private hasPendingRange() {
    const { startDate, endDate } = this.rangeState, committed = this.committedRange;
    return startDate?.getTime() !== committed.startDate?.getTime() || endDate?.getTime() !== committed.endDate?.getTime();
  }

  // 선택 상태를 마지막으로 확정한 값으로 되돌린다. 팝업은 닫지 않는다.
  private revertRange() {
    this.rangeError = '';
    const before = this.getRange();
    this.rangeState = { ...rangeResult(this.committedRange.startDate, this.committedRange.endDate), selecting: 'start', committed: this.hasCommittedRange, activeDate: null };
    this.paintRange();
    this.syncRangeTime();
    this.writeRangeValue();
    if (before.startDate?.getTime() !== this.rangeState.startDate?.getTime() || before.endDate?.getTime() !== this.rangeState.endDate?.getTime()) this.options.onRangeChange?.(this.getRange());
  }

  private rangeMonthCount() {
    if (!this.options.responsive) return this.options.numberOfMonths!;
    return this.rangeMedia?.matches ? (this.options.responsiveOptions?.mobileMonths ?? 1) : (this.options.responsiveOptions?.desktopMonths ?? this.options.numberOfMonths!);
  }

  private initRangeTemplate() {
    this.datetimeElement.classList.add('ddtp-range');
    const table = this.datetimeElement.querySelector('.ddtp-days') as HTMLTableElement;
    table.createCaption();
    table.querySelector('tfoot')!.remove();
    const container = document.createElement('div');
    container.className = 'ddtp-range-months';
    table.replaceWith(container); container.appendChild(table);
    if (this.options.responsive) {
      this.rangeMedia = window.matchMedia(`(width < ${this.options.responsiveOptions?.breakpoint ?? 768}px)`);
      this.rangeMedia.addEventListener('change', this.rangeResize);
    }
    this.datetimeElement.querySelector('.ddtp-body')!.insertAdjacentHTML('beforeend', `<div class="ddtp-range-actions">
      <div class="ddtp-range-status" role="status" aria-live="polite"></div>
      ${this.options.clearButton ? `<button type="button" class="ddtp-range-clear">${escapeHtml(this.language.getMessage('clear'))}</button>` : ''}
      ${this.options.confirmButton ? `<button type="button" class="ddtp-range-confirm">${escapeHtml(this.language.getMessage('ok'))}</button>` : ''}
      <button type="button" class="ddtp-range-cancel">${escapeHtml(this.language.getMessage('cancel'))}</button></div>`);
    this.datetimeElement.querySelector('.ddtp-range-clear')?.addEventListener('click', () => this.clearRange());
    this.datetimeElement.querySelector('.ddtp-range-confirm')?.addEventListener('click', () => this.confirmRange());
    this.datetimeElement.querySelector('.ddtp-range-cancel')?.addEventListener('click', () => this.cancelRange());
    container.addEventListener('mouseover', event => {
      if (!this.options.showRangePreview || this.rangeState.selecting !== 'end') return;
      const cell = (event.target as Element).closest('.ddtp-day');
      const date = cell && !cell.classList.contains('disabled') ? this.rangeCellDate(cell) : null, current = this.rangeState.activeDate;
      // 칸과 칸 안의 span 을 오가는 mouseover 처럼 미리보기 날짜가 그대로면 다시 그리지 않는다.
      if (date ? current && calendarDay(current) === calendarDay(date) : !current) return;
      this.rangeState.activeDate = date;
      this.paintRange();
    });
    container.addEventListener('mouseleave', () => { if (!this.rangeState.activeDate) return; this.rangeState.activeDate = null; this.paintRange(); });
    container.addEventListener('keydown', event => {
      const cell = (event.target as Element).closest('.ddtp-day');
      if (cell && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        if (event.repeat) return; // 키를 길게 눌러 선택이 반복되는 것을 막는다.
        if (!cell.classList.contains('disabled')) this.selectRangeDate(this.rangeCellDate(cell), event);
      }
    });
    if (this.isTimeMode()) {
      // 시작 / 종료 시간을 항상 함께 보여준다. 변경은 즉시 반영되므로 시간 확인 버튼은 두지 않는다.
      const times = this.datetimeElement.querySelector('.ddtp-times')!;
      times.classList.add('ddtp-range-times');
      times.innerHTML = (['start', 'end'] as const).map(endpoint => `<div class="ddtp-range-time" data-endpoint="${endpoint}">
        <div class="ddtp-range-time-title">${escapeHtml(this.language.getMessage(endpoint === 'start' ? 'rangeStart' : 'rangeEnd'))}</div>
        <div class="ddtp-range-time-fields">
          <div class="ddtp-time"><span>H: </span><input type="number" class="ddtp-hour" min="0" max="23" maxlength="2"><input type="range" min="0" max="23" class="ddtp-hour-range"></div>
          <div class="ddtp-time"><span>M: </span><input type="number" class="ddtp-minute" min="0" max="59" size="2" maxlength="2"><input type="range" min="0" max="59" class="ddtp-minute-range"></div>
        </div></div>`).join('');
    }
  }

  private rangeTimeInputs(endpoint: 'start' | 'end'): [HTMLInputElement, HTMLInputElement] {
    const group = this.datetimeElement.querySelector(`.ddtp-range-time[data-endpoint="${endpoint}"]`)!;
    return [group.querySelector('.ddtp-hour') as HTMLInputElement, group.querySelector('.ddtp-minute') as HTMLInputElement];
  }

  private initRangeTimeEvent() {
    for (const endpoint of ['start', 'end'] as const) {
      const group = this.datetimeElement.querySelector(`.ddtp-range-time[data-endpoint="${endpoint}"]`)!;
      for (const [token, max] of [['hour', 23], ['minute', 59]] as const) {
        const input = group.querySelector(`.ddtp-${token}`) as HTMLInputElement;
        const slider = group.querySelector(`.ddtp-${token}-range`) as HTMLInputElement;
        input.value = slider.value = this.currentDate.format(token === 'hour' ? 'HH' : 'mm');
        input.addEventListener('input', e => {
          input.value = slider.value = leftPad(Math.min(this.getTimeNumberValue(input.value), max), 2);
          this.updateRangeTime(e, endpoint);
        });
        slider.addEventListener('input', e => {
          input.value = leftPadClamp(slider.value, 2, '0');
          this.updateRangeTime(e, endpoint);
        });
      }
    }
  }

  // 기간 프리셋(셀렉트박스)이 채우는 범위. 종료일은 아래 순서로 정하고, 시작일은 종료일에서 기간만큼 뺀다.
  //  1) 이미 선택한 종료일이 있으면 그 날짜를 그대로 둔다.            (종료일 10/20 + 1개월 → 9/20 ~ 10/20)
  //  2) 시작일만 선택한 상태면 그 시작일을 종료일로 삼는다.            (시작일 11/12 + 1개월 → 10/12 ~ 11/12)
  //  3) 아무것도 선택하지 않았으면 오늘을 종료일로 둔다.               (오늘 11/5 + 1개월 → 10/5 ~ 11/5)
  // 적용(applyPeriod)과 항목별 가용 여부(syncPeriodSelect)가 같은 계산을 쓰므로 비활성 · 숨김 항목도 같은 기준이다.
  private periodPresetRange(preset: PeriodPreset, withTime: boolean): { start: Date; end: Date } {
    const { startDate, endDate } = this.rangeState, base = endDate || startDate;
    const end = base ? new Date(base.getTime()) : new Date();
    if (!base) end.setHours(0, 0, 0, 0);
    const start = addPeriod(end, preset.period, -1);
    if (withTime && this.isTimeMode()) {
      // 시간은 날짜를 따라가지 않고 시작 / 종료 시간 그룹의 값을 따른다. 이미 선택한 종료일의 시간은 그대로 둔다.
      const [startHour, startMinute] = this.rangeTimeInputs('start');
      start.setHours(+startHour.value, +startMinute.value, 0, 0);
      if (!endDate) {
        // 종료일이 새로 만들어지는 경우(시작일을 종료일로 삼거나 오늘): 날짜는 그대로 두고 종료 시간 그룹의 시간을 쓴다.
        const [endHour, endMinute] = this.rangeTimeInputs('end');
        end.setHours(+endHour.value, +endMinute.value, 0, 0);
      }
    }
    return { start, end };
  }

  // 입력창 바로 뒤(inline 은 달력 위)에 기간 프리셋 셀렉트박스를 만든다. 문구는 textContent 로 넣어 HTML 로 해석되지 않는다.
  private initPeriodSelect() {
    const select = document.createElement('select');
    select.className = 'ddtp-period-select';
    select.setAttribute('aria-label', String(this.language.getMessage('periodPlaceholder')));
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = String(this.language.getMessage('periodPlaceholder'));
    select.append(placeholder);
    for (const preset of PERIOD_PRESETS) {
      const option = document.createElement('option');
      option.value = preset.key;
      option.textContent = String(this.language.getMessage(`period${preset.key}`));
      select.append(option);
    }
    select.addEventListener('change', event => this.applyPeriod(select.value, event));
    if (this.options.inline) {
      const row = document.createElement('div');
      row.className = 'ddtp-period';
      row.append(select);
      this.datetimeElement.querySelector('.ddtp-body')?.prepend(row);
    } else if (!this.wrapPeriodSelect(select)) {
      return;
    }
    this.periodSelectEl = select;
    this.layoutPeriodSelect();
  }

  // 입력창을 span 으로 감싸고 셀렉트를 입력창 오른쪽 안쪽에 겹쳐 하나의 컨트롤처럼 보이게 한다. 부모가 없어 감쌀 수 없으면 false.
  // 위치 · 크기는 클래스(CSS)로, 글자가 셀렉트 밑으로 들어가지 않게 하는 오른쪽 여백만 CSSOM 으로 지정한다. (style 속성 문자열은 CSP 에서 차단될 수 있다)
  private wrapPeriodSelect(select: HTMLSelectElement): boolean {
    const target = this.targetElement, parent = target.parentElement;
    if (!parent) return false;
    // span · div 같은 일반 태그를 대상으로 한 호스트 페이지 CSS(예: .input-wrap > span)에 걸리지 않도록 하이픈이 들어간 사용자 정의 태그를 쓴다.
    const field = document.createElement('ddtp-period-field');
    field.className = 'ddtp-period-field';
    // 입력창이 부모 폭을 가득 채우는 레이아웃이면 감싸는 요소도 블록으로 두어 폭이 줄어들지 않게 한다.
    if (parent.clientWidth > 0 && target.offsetWidth >= parent.clientWidth - 2) field.classList.add('ddtp-period-field-block');
    this.periodInputPadding = target.style.paddingRight;
    target.replaceWith(field);
    field.append(target, select);
    const css = getComputedStyle(target);
    select.style.fontSize = css.fontSize;
    select.style.fontFamily = css.fontFamily; // 글자색은 고정하지 않는다. 테마가 바뀌어도 CSS(color: inherit)를 따른다.
    this.periodField = field;
    return true;
  }

  // 입력창의 오른쪽 안쪽 여백을 셀렉트 폭만큼 늘려 글자와 겹치지 않게 한다. 셀렉트가 숨겨져 있으면 원래 값으로 되돌린다.
  private layoutPeriodSelect() {
    const select = this.periodSelectEl, input = this.targetElement;
    if (!select || !this.periodField) return;
    input.style.paddingRight = this.periodInputPadding;
    if (select.hidden) return;
    const width = select.offsetWidth;
    if (!width) return; // 화면에 보이지 않을 때는 보일 때(show) 다시 계산한다.
    input.style.paddingRight = `${(parseFloat(getComputedStyle(input).paddingRight) || 0) + width + 4}px`;
  }

  // 감싼 입력창을 원래 자리로 되돌리고 입력창에 지정했던 여백을 복원한다.
  private unwrapPeriodSelect() {
    const field = this.periodField;
    if (!field) return;
    const input = this.targetElement;
    input.style.paddingRight = this.periodInputPadding;
    if (!input.getAttribute('style')) input.removeAttribute('style');
    field.replaceWith(input);
    this.periodField = null;
  }

  // 프리셋을 고르면 기간을 채우고 바로 확정한다. (셀렉트박스는 팝업 밖에 있어 확인 버튼을 누를 수 없다)
  private applyPeriod(key: string, event: Event) {
    const preset = PERIOD_PRESETS.find(item => item.key === key);
    const restore = () => { this.periodKey = ''; this.syncPeriodSelect(); };
    if (!preset || this.destroyed) return restore();
    const { start, end } = this.periodPresetRange(preset, true);
    this.rangeError = '';
    this.rangeRejectedDay = null;
    // 규칙(minRange / maxRange / 비활성 날짜 / minDate · maxDate)에 맞지 않거나 beforeSelectRange · onSelect 가 거부하면 선택을 되돌린다.
    if (!this.validRange(start, end) || !this.applyRange(start, end, event)) return restore();
    this.showRangeMonths(start, end);
    this.refresh(false);
    this.syncRangeTime();
    this.confirmRange();
  }

  // 프리셋을 적용한 뒤 보여 줄 달을 정한다. 왼쪽(첫) 패널은 시작일의 달, 마지막 패널은 종료일의 달이 되게 한다. (종료일 12월 + 6개월 → 6월 | 12월)
  // - 시작일 · 종료일의 달이 지금 보이는 패널에 이미 모두 들어 있으면 달력을 그대로 둔다. (11월 | 12월 에서 12/3 ~ 12/10 → 그대로)
  // - 둘이 패널 수 이내의 거리면 종료일의 달이 마지막인 연속된 달로 옮긴다. (12월 | 1월 에서 11/10 ~ 12/10 → 11월 | 12월)
  // - 더 멀면 첫 패널을 시작일의 달로, 마지막 패널을 종료일의 달로 하고 가운데 달은 건너뛴다. 한 달만 보이는 화면에서는 종료일의 달을 보여 준다.
  private showRangeMonths(start: Date, end: Date) {
    const count = this.rangeMonthCount(), index = (date: Date) => date.getFullYear() * 12 + date.getMonth();
    const current = this.currentDate, currentFirst = current.getYear() * 12 + current.getMonth() - 1;
    const startIndex = index(start), endIndex = index(end), skipped = this.rangeEndMonth;
    // 지금 보이는 달: 연속된 패널이거나, 마지막 패널만 종료일의 달로 대체된 패널
    const split = count > 1 && skipped !== null && skipped > currentFirst + count - 1;
    const shown = (month: number) => (month >= currentFirst && month <= currentFirst + count - (split ? 2 : 1)) || (split && month === skipped);
    if (shown(startIndex) && shown(endIndex)) return;
    let first = currentFirst, endMonth: number | null = null;
    if (count === 1) first = endIndex;
    else if (endIndex - startIndex <= count - 1) first = endIndex - (count - 1);
    else { first = startIndex; endMonth = endIndex; }
    this.rangeEndMonth = endMonth;
    if (first === currentFirst) return;
    this.currentDate = current.clone().setDate(1).setYear(Math.floor(first / 12)).setMonth(first % 12);
  }

  // 현재 기간이 프리셋과 같으면 그 항목을 선택 상태로, 아니면 안내 문구로 되돌린다. 규칙에 맞지 않는 항목은 비활성으로 둔다.
  private syncPeriodSelect() {
    const select = this.periodSelectEl;
    if (!select) return;
    const { startDate, endDate, complete } = this.rangeState;
    const key = `${startDate?.getTime()}|${endDate?.getTime()}|${calendarDay(new Date())}`;
    if (key === this.periodKey) return;
    this.periodKey = key;
    let selected = '', visible = 0;
    for (const preset of PERIOD_PRESETS) {
      const { start, end } = this.periodPresetRange(preset, false);
      const option = select.querySelector(`option[value="${preset.key}"]`) as HTMLOptionElement;
      const exceeds = this.exceedsMaxRange(start, end), disabled = !this.validRange(start, end);
      if (option.hidden !== exceeds) option.hidden = exceeds; // maxRange 를 넘는 항목은 보이지 않게 한다.
      if (option.disabled !== disabled) option.disabled = disabled; // 그 밖의 규칙(비활성 날짜 · minDate 등)에 맞지 않으면 비활성으로 둔다.
      if (!exceeds) visible++;
      if (complete && startDate && endDate && calendarDay(startDate) === calendarDay(start) && calendarDay(endDate) === calendarDay(end)) selected = preset.key;
    }
    if (select.hidden !== !visible) select.hidden = !visible; // 고를 수 있는 항목이 없으면 셀렉트 자체를 숨긴다.
    if (select.value !== selected) select.value = selected;
    this.layoutPeriodSelect();
  }

  // 기간이 maxRange 를 넘는지 확인한다. 숫자 · 'D' 는 양 끝을 포함한 일 수, 'W' · 'M' · 'Y' 는 종료일에서 기간을 뺀 날짜(말일은 보정)가 시작일보다 늦으면 넘는 것이다.
  // 종료일 기준으로 빼므로 프리셋(오늘 − 기간 ~ 오늘)은 같은 기간의 maxRange 에 항상 맞는다. (5/31 의 1개월 = 4/30 ~ 5/31)
  private exceedsMaxRange(start: Date, end: Date): boolean {
    const period = this.maxPeriod;
    if (!period) return false;
    return period.unit === 'D' ? calendarDay(end) - calendarDay(start) + 1 > period.value : calendarDay(addPeriod(end, period, -1)) > calendarDay(start);
  }

  private rangeMaxMessage(): string {
    const period = this.maxPeriod;
    if (!period) return '';
    if (period.unit === 'D') return String(this.language.getMessage('rangeMax')).replace('{days}', String(period.value));
    const unit = period.unit === 'W' ? 'periodWeeks' : period.unit === 'M' ? 'periodMonths' : 'periodYears';
    const label = String(this.language.getMessage(unit)).replace('{n}', String(period.value));
    return String(this.language.getMessage('rangeMaxPeriod')).replace('{period}', label);
  }

  private rangeCellDate(cell: Element): Date {
    const [month, day] = cell.getAttribute('data-day')!.split(',').map(Number);
    const date = new Date(0); date.setFullYear(Number(cell.getAttribute('data-year')), month - 1, day); date.setHours(0, 0, 0, 0);
    return date;
  }

  // 새로 그린 칸의 날짜 번호를 한 번만 계산해 둔다. (변하지 않는 aria 속성은 drawDayMonth 가 HTML 에 넣는다)
  private indexRangeCells() {
    this.rangeCells = Array.from(this.datetimeElement.querySelectorAll('.ddtp-day'), (el: Element) => ({ el, day: calendarDay(this.rangeCellDate(el)), flags: 0, selected: 'false' }));
  }

  private paintRange() {
    const state = this.rangeState;
    let previewStart = state.startDate, previewEnd = cloneDate(state.activeDate);
    if (previewEnd && previewStart && this.isTimeMode()) previewEnd.setHours(previewStart.getHours(), previewStart.getMinutes(), 0, 0);
    if (previewStart && previewEnd && previewEnd < previewStart && this.options.allowReverse) [previewStart, previewEnd] = [previewEnd, previewStart];
    const preview = !!(previewEnd && this.validRange(previewStart, previewEnd));
    this.datetimeElement.classList.toggle('ddtp-range-pending', !!state.startDate && !state.complete);
    const startDay = state.startDate ? calendarDay(state.startDate) : NaN, endDay = state.endDate ? calendarDay(state.endDate) : NaN;
    const lastDay = state.endDate ? endDay : startDay, highlight = !!this.options.showRangeHighlight;
    const previewFirst = preview ? calendarDay(previewStart!) : NaN, previewLast = preview ? calendarDay(previewEnd!) : NaN;
    for (const cell of this.rangeCells) {
      const day = cell.day;
      const flags = (day === startDay ? 1 : 0) | (day === endDay ? 2 : 0) | (highlight && day > startDay && day < endDay ? 4 : 0) | (preview && day >= previewFirst && day <= previewLast ? 8 : 0);
      if (flags !== cell.flags) {
        const changed = flags ^ cell.flags, list = cell.el.classList;
        if (changed & 1) list.toggle('ddtp-range-start', !!(flags & 1));
        if (changed & 2) list.toggle('ddtp-range-end', !!(flags & 2));
        if (changed & 4) list.toggle('ddtp-in-range', !!(flags & 4));
        if (changed & 8) list.toggle('ddtp-range-preview', !!(flags & 8));
        cell.flags = flags;
      }
      const selected = String(day >= startDay && day <= lastDay);
      if (selected !== cell.selected) { cell.el.setAttribute('aria-selected', selected); cell.selected = selected; }
    }
    const status = this.datetimeElement.querySelector('.ddtp-range-status');
    if (status) {
      const text = this.rangeError || (state.complete ? `${this.formatRange(this.getRange())} (${state.days})` : this.language.getMessage(state.startDate ? 'selectRangeEnd' : 'selectRangeStart'));
      const live = this.rangeError ? 'assertive' : 'polite';
      status.classList.toggle('ddtp-range-error', !!this.rangeError);
      if (status.getAttribute('aria-live') !== live) status.setAttribute('aria-live', live);
      if (status.textContent !== text) status.textContent = text;
    }
    const confirm = this.datetimeElement.querySelector('.ddtp-range-confirm') as HTMLButtonElement | null;
    // disabled 는 같은 값을 대입해도 속성 변경으로 기록되므로 바뀔 때만 쓴다.
    const confirmDisabled = !!state.startDate && !state.complete;
    if (confirm && confirm.disabled !== confirmDisabled) confirm.disabled = confirmDisabled;
    this.syncPeriodSelect();
  }

  private syncRangeTime() {
    if (!this.isTimeMode()) return;
    for (const endpoint of ['start', 'end'] as const) {
      // 해당 날짜가 아직 없으면 사용자가 입력해 둔 시간을 유지한다. (초기값은 initRangeTimeEvent 에서 채운다)
      const date = endpoint === 'start' ? this.rangeState.startDate : this.rangeState.endDate;
      if (!date) continue;
      const [hour, minute] = this.rangeTimeInputs(endpoint);
      const group = hour.closest('.ddtp-range-time')!;
      hour.value = format(date, 'HH'); minute.value = format(date, 'mm');
      (group.querySelector('.ddtp-hour-range') as HTMLInputElement).value = hour.value;
      (group.querySelector('.ddtp-minute-range') as HTMLInputElement).value = minute.value;
    }
  }

  private updateRangeTime(event: Event, endpoint: 'start' | 'end') {
    const start = cloneDate(this.rangeState.startDate), end = cloneDate(this.rangeState.endDate);
    const date = endpoint === 'end' ? end : start;
    if (date) {
      const [hour, minute] = this.rangeTimeInputs(endpoint);
      date.setHours(+hour.value, +minute.value, 0, 0);
      const message = start && end ? this.rangeSelectError(start, end) : '';
      if (message) { this.rangeError = message; this.rangeRejectedDay = null; this.paintRange(); }
      else { this.rangeError = ''; this.applyRange(start, end, event); }
    }
    this.syncRangeTime();
  }

  private isDayDisabled(dateItem: DaraDate) {
    if (this.isRange && this.rangeDayDisabled(new Date(dateItem.getTime()))) return true;
    if (this.minDate > dateItem.getTime() || this.maxDate < dateItem.getTime()) {
      return true;
    }

    return false;
  }

  private isYearDisabled(year: number) {
    if ((this.minYear != -1 && this.minYear > year) || (this.maxYear != -1 && this.maxYear < year)) {
      return true;
    }

    return false;
  }

  private isMonthDisabled(year: number, month: number) {
    if (this.isYearDisabled(year)) {
      return true;
    }

    const yearMonth = year * 12 + month;

    if ((this.minMonth != -1 && this.minMonth > yearMonth) || (this.maxMonth != -1 && this.maxMonth < yearMonth)) {
      return true;
    }

    return false;
  }

  public static setMessage(message: MessageOptions) {
    Lanauage.setDefaultMessage(message);
  }
}

function getDocSize() {
  return {
    clientHeight: Math.max(document.documentElement.clientHeight, window.innerHeight || 0),
    // innerWidth 는 세로 스크롤바를 포함하므로, 팝업이 스크롤바 아래로 넘쳐 가로 스크롤이 생기지 않게 clientWidth 를 우선한다.
    clientWidth: document.documentElement.clientWidth || window.innerWidth || 0,
  };
}
