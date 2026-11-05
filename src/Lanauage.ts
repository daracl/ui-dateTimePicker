import { Message, MessageOptions } from "./types/Message";

// 기본 언어는 한국어다. 다른 언어는 DateTimePicker.setMessage(...) 또는 생성자의 message 인자로 바꾼다.
let localeMessage: Message = {
  year: '년',
  month: '월',
  day: '일',
  am: '오전',
  pm: '오후',
  today: '오늘',
  ok: '확인',
  clear: '초기화',
  cancel: '취소',
  time: '시간',
  rangeStart: '시작',
  rangeEnd: '종료',
  selectRangeStart: '시작일을 선택하세요',
  selectRangeEnd: '종료일을 선택하세요',
  rangeMin: '최소 {days}일 이상 선택하세요.',
  rangeMax: '최대 {days}일까지 선택할 수 있습니다.',
  rangeMaxPeriod: '최대 {period}까지 선택할 수 있습니다.',
  periodWeeks: '{n}주',
  periodMonths: '{n}개월',
  periodYears: '{n}년',
  periodPlaceholder: '기간 선택',
  period1w: '일주일',
  period1m: '1개월',
  period3m: '3개월',
  period6m: '6개월',
  period1y: '1년',
  rangeDisabled: '선택할 수 없는 날짜가 포함되어 있습니다.',
  rangeTimeOrder: '종료 시간은 시작 시간보다 늦어야 합니다.',
  months: {
    full: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
    abbr: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
  },
  weeks: {
    full: ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'],
    abbr: ['일', '월', '화', '수', '목', '금', '토'],
  },
};

/**
 * validation 메시지 처리.
 *
 * @class Language
 * @typedef {Language}
 */
export class Language {
  private lang: Message = localeMessage;

  constructor(lang?: MessageOptions) {
    this.set(lang);
  }

  public setDefaultMessage(lang?: MessageOptions) {
    localeMessage = this.merge(localeMessage, lang);
    this.set();
  }

  /**
   * 다국어 메시지 등록
   *
   * @public
   * @param {?Message} [lang] 둥록할 메시지
   */
  public set(lang?: MessageOptions) {
    this.lang = this.merge(localeMessage, lang);
  }

  private merge(base: Message, lang?: MessageOptions): Message {
    const defined = (value: object = {}) => Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined));
    const months = { ...base.months, ...defined(lang?.months) };
    const weeks = { ...base.weeks, ...defined(lang?.weeks) };
    return { ...base, ...defined(lang),
      months: { full: [...months.full], abbr: [...months.abbr] },
      weeks: { full: [...weeks.full], abbr: [...weeks.abbr] },
    };
  }

  /**
   * 메시지 얻기
   *
   * @public
   * @param {string} messageKey 메시지 키
   * @returns {*}
   */
  public getMessage(messageKey: string): any {
    return (this.lang as any)[messageKey];
  }

  public getMonthsMessage(idx: number, mode: "full" | "abbr" = "abbr") {
    return (this.lang.months as any)[mode][idx] || "";
  }

  public getWeeksMessage(idx: number, mode: "full" | "abbr" = "abbr") {
    return (this.lang.weeks as any)[mode][idx] || "";
  }

  public getMonthsIdx(val: string, mode: "full" | "abbr" = "abbr"): number {
    return mode == "full" ? this.lang.months.full.indexOf(val) : this.lang.months.abbr.indexOf(val);
  }

  public getWeeksIdx(val: string, mode: "full" | "abbr" = "abbr"): number {
    return mode == "full" ? this.lang.weeks.full.indexOf(val) : this.lang.weeks.abbr.indexOf(val);
  }
}

function message(msgFormat: string, msgParam: any): string {
  return msgFormat.replace(/\{{1,1}([A-Za-z0-9_.]*)\}{1,1}/g, (match, key) => {
    return typeof msgParam[key] !== "undefined" ? msgParam[key] : match;
  });
}

export default new Language();
