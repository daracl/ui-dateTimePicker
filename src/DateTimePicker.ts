import { DateTimePickerOptions } from "./types/DateTimePickerOptions";
import { MessageOptions } from "./types/Message";
import format from "./format";
import parser from "./util/parser";
import Lanauage, { Language } from "./Lanauage";
import { closestElement, escapeHtml } from "./util/utils";
import { DaraDate } from "./DaraDate";
import { DAY_STYLE_CLASS, DEFAULT_FORMAT, DateViewMode } from "./constants";
import { isFunction, isNumeric, leftPad, leftPadClamp } from "@daracl/core";

declare const APP_VERSION: string;

let DEFAULT_OPTIONS: DateTimePickerOptions = {
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

function hiddenElement() {
  if (document.getElementById("hiddenDaraDatetimeElement") == null) {
    document.querySelector("body")?.insertAdjacentHTML("beforeend", `<div id="hiddenDaraDatetimeElement" class="daracl-datetime-hidden"></div>`);
  }

  return document.getElementById("hiddenDaraDatetimeElement");
}

let daraDatetimeIdx = 0;

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

  private readonly options;
  private readonly language: Language;

  private datetimeElement;

  private targetElement: HTMLElement;

  private currentDate: DaraDate;

  private dateFormat: string;

  private todayDate: string;

  private isInput: boolean = false;

  private isVisible = false;
  private destroyed = false;
  private originalClassName = '';
  private originalContent = '';

  private _viewMode: DateViewMode;

  private initMode: DateViewMode;

  private hourInputEle: HTMLInputElement;

  private minuteInputEle: HTMLInputElement;

  private minDate: number;
  private maxDate: number;
  private minYear: number = -1;
  private maxYear: number = -1;
  private minMonth: number = -1;
  private maxMonth: number = -1;

  // 요일 순서.
  private dayOrder: number[] = [0, 1, 2, 3, 4, 5, 6];

  constructor(selector: string | HTMLElement, options: Partial<DateTimePickerOptions> = {}, message?: MessageOptions) {
    this.options = Object.assign({}, DEFAULT_OPTIONS, Object.fromEntries(Object.entries(options).filter(([, value]) => value !== undefined)));

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
      datetimeElement.setAttribute("style", `z-index:${this.options.zIndex};`);
      hiddenElement()?.appendChild(datetimeElement);

      this.datetimeElement = datetimeElement;

      this.initTargetEvent();
    }

    this.createDatetimeTemplate();

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

    this.initTimeEvent();
    this.options.onLoad?.(this);
  }
  setWeekDays() {
    let weekStartDay = this.options.weekStartDay;

    if (weekStartDay == 0) return;

    if (!Number.isInteger(weekStartDay) || weekStartDay < 0 || weekStartDay > 6) {
      weekStartDay = 0;
    }

    for (let i = 0; i < 7; i++) {
      let day = weekStartDay + i;

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
      this.moveDate(isRTL ? "next" : "prev", e);
    });

    this.datetimeElement.querySelector(".ddtp-move-btn.next")?.addEventListener("click", (e: Event) => {
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
    this.datetimeElement.querySelector(".ddtp-day-body")?.addEventListener("click", (e: Event) => {
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
    this.datetimeElement.querySelector(".ddtp-today")?.addEventListener("click", (e: Event) => {
      const initDate = new DaraDate(new Date());
      if (this.isDayDisabled(initDate)) return;
      const previous = this.currentDate.clone();
      this.currentDate.setDate(1);
      this.currentDate.setYear(initDate.getYear());
      this.currentDate.setMonth(initDate.getMonth() - 1);
      this.currentDate.setDate(initDate.getDate());
      this.changeViewMode(this.initMode);
      if (!this.isTimeMode() && this.dateChangeEvent(e) === false) this.currentDate = previous;
    });
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
    if (!this.isTimeMode()) return;

    let hh = this.currentDate.format("HH");

    const datetimeElement = this.datetimeElement; 

    const hourInputEle = datetimeElement.querySelector(".ddtp-hour") as HTMLInputElement;
    const hourRangeEle = datetimeElement.querySelector(".ddtp-hour-range") as HTMLInputElement;
    hourInputEle.value = hh;
    hourRangeEle.value = hh;

    hourInputEle.addEventListener("input", (e: Event) => {
      const targetElement = e.target as HTMLInputElement;

      let val = this.getTimeNumberValue(targetElement.value);

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

    let mm = this.currentDate.format("mm");
    const minuteInputEle = datetimeElement.querySelector(".ddtp-minute") as HTMLInputElement;
    const minuteRangeEle = datetimeElement.querySelector(".ddtp-minute-range") as HTMLInputElement;

    minuteInputEle.value = mm;
    minuteRangeEle.value = mm;

    minuteInputEle.addEventListener("input", (e: Event) => {
      const targetElement = e.target as HTMLInputElement;
      let val = this.getTimeNumberValue(targetElement.value);
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
    const entered = parser((this.targetElement as HTMLInputElement).value, this.dateFormat, this.language);
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

    this.updatePosition();
    window.addEventListener('resize', this.updatePosition);
    window.addEventListener('scroll', this.updatePosition, true);
    document.addEventListener("click", this._documentClickEvent);
    document.addEventListener('keydown', this._documentKeyEvent);
  }

  // 레이아웃이 바뀔 때 입력 요소의 현재 좌표를 기준으로 다시 배치합니다.
  private updatePosition = () => {
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
    left = Math.max(minLeft, Math.min(left, minLeft + docSize.clientWidth - this.datetimeElement.offsetWidth));

    this.datetimeElement.setAttribute("style", `${this.options.isPositionFixed ? "position:fixed;" : ""}top:${top}px;left:${left}px;z-index:${this.options.zIndex}`);

  };

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
    this.isVisible = false;

    this.datetimeElement.classList.remove("show");

    this.datetimeElement.classList.add("hide");

    document.removeEventListener("click", this._documentClickEvent);
    document.removeEventListener('keydown', this._documentKeyEvent);
    window.removeEventListener('resize', this.updatePosition);
    window.removeEventListener('scroll', this.updatePosition, true);
  }

  private _documentKeyEvent = (e: KeyboardEvent) => {
    if (e.key === 'Escape') this.hide();
  };

  private _targetClickEvent = () => { this.show(); };

  /** DOM과 전역 이벤트를 정리합니다. 여러 번 호출해도 안전합니다. */
  public destroy() {
    if (this.destroyed) return;
    document.removeEventListener('click', this._documentClickEvent);
    document.removeEventListener('keydown', this._documentKeyEvent);
    window.removeEventListener('resize', this.updatePosition);
    window.removeEventListener('scroll', this.updatePosition, true);
    this.targetElement.removeEventListener('click', this._targetClickEvent);
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
    if (this.isVisible && e.target != this.targetElement && !closestElement(e.target as HTMLElement, this.datetimeElement)) {
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

    let datetimeTemplate = `<div class="ddtp-datetime ${this.options.isRTL ? "rtl" : ""}" view-mode="${this._viewMode}">
			<div class="ddtp-header">
                <span class="${showMonthAfterYear ? "ddtp-header-year" : "ddtp-header-month"}"></span>
                <span class="${showMonthAfterYear ? "ddtp-header-month" : "ddtp-header-year"}"></span>

                <span class="ddtp-date-move">  
                    <a href="javascript:;" class="ddtp-move-btn prev">
                        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#000000"><path d="M0 0h24v24H0z" fill="none"/><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
                    </a>
                    <a href="javascript:;" class="ddtp-move-btn next">
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
                            <div style="width:99%;text-align:center;margin-top: 5px;${this.options.enableTodayBtn ? "" : "display:none;"}"><button type="button" class="ddtp-today">${escapeHtml(this.language.getMessage("today"))}</button></div>
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

    let monthFirstDate = this.currentDate.clone();
    const currentMonth = monthFirstDate.getMonth();
    monthFirstDate.setDate(1);

    (this.datetimeElement.querySelector(".ddtp-header-year") as Element).textContent = monthFirstDate.format("YYYY");
    (this.datetimeElement.querySelector(".ddtp-header-month") as Element).textContent = monthFirstDate.format("MMMM");

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

      let disabled = this.isDayDisabled(dateItem);

      let addStylceClass = DAY_STYLE_CLASS[this.dayOrder[i % 7]];
      const dateItemMonth = dateItem.getMonth();

      if (dateItemMonth != currentMonth) {
        if (dateItemMonth < currentMonth) {
          addStylceClass += dateItemMonth == 1 ? " new" : " old";
        } else {
          addStylceClass += currentMonth == 1 && dateItemMonth == 12 ? " old" : " new";
        }
      }

      addStylceClass += this.todayDate == dateItemFormat ? " ddtp-today" : "";
      addStylceClass += this.currentDate.format('YYYY-MM-DD') === dateItemFormat ? ' select' : '';
      addStylceClass += disabled ? " disabled" : "";

      let tooltip = "";
      if (beforeDrawDateFlag && beforeDrawDateFn) {
        const reval = beforeDrawDateFn({ mode: this._viewMode, item: dateItem, date: dateItem.format(this.dateFormat) });
        addStylceClass += reval?.style ? " " + escapeHtml(reval.style) : "";

        addStylceClass += reval?.check ? " ddtp-event" : "";
        tooltip = reval?.tooltip;
        tooltip = tooltip ? `title="${escapeHtml(tooltip)}"` : "";
      }

      calHTML.push(`<td class="ddtp-day ${addStylceClass}" data-year="${dateItem.getYear()}" data-day="${dateItem.format("M,D")}" ${tooltip}>`);
      calHTML.push(`<span>${dateItem.format("d")}</span>`);
      calHTML.push("</td>");
    }

    calHTML.push("</tr>");

    (this.datetimeElement.querySelector(".ddtp-day-body") as Element).innerHTML = calHTML.join("");

    if (this.initMode == DateViewMode.date || this.initMode == DateViewMode.datetime) {
      this.afterChangeDatepicker();
    }
  }

  private isDayDisabled(dateItem: DaraDate) {
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

    let yearMonth = year * 12 + month;

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
    clientWidth: Math.max(document.documentElement.clientWidth, window.innerWidth || 0),
  };
}
