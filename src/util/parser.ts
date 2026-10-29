import Lanauage, { Language } from "../Lanauage";
import { DEFAULT_FORMAT, EXPRESSIONS_FORMAT, MAX_CHAR_LENGTH } from "@/constants";

type DateInfo = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  millisecond: number;
  isPm: boolean;
  isH: boolean;
  timezoneOffset?: number | null;
  charIdx: number;
};

export default (dateStr: string, format: string = DEFAULT_FORMAT.date, language: Language = Lanauage): Date | null => {
  if (typeof dateStr !== 'string' || !dateStr || dateStr.length > 1000 || typeof format !== 'string') {
    return null;
  }

  format = format || DEFAULT_FORMAT.date;

  const dateInfo: DateInfo = {
    year: new Date().getFullYear(),
    month: 0,
    day: 1,
    hour: 0,
    minute: 0,
    second: 0,
    millisecond: 0,
    isPm: false,
    isH: false,
    charIdx: 0,
  };

  const len = format.length;
  let startIdx = 0;
  let has12Hour = false;
  let weekDay: number | undefined;

  for (let i = 0; i < len; ) {
    let minLen = Math.min(MAX_CHAR_LENGTH, len - i);
    let j = minLen;
    for (; j > 0; j--) {
      const v = format.substring(i, i + j);
      if (EXPRESSIONS_FORMAT.includes(v)) {
        const expInfo = expressionsFunction[v];
        const remaining = dateStr.substring(startIdx);
        let val = matchFind(remaining, expInfo[0]);
        if (['MMM', 'MMMM', 'ddd', 'dddd', 'a', 'A'].includes(v)) {
          const names = v === 'MMM' || v === 'MMMM'
            ? Array.from({ length: 12 }, (_, idx) => language.getMonthsMessage(idx, v === 'MMM' ? 'abbr' : 'full'))
            : v === 'ddd' || v === 'dddd'
              ? Array.from({ length: 7 }, (_, idx) => language.getWeeksMessage(idx, v === 'ddd' ? 'abbr' : 'full'))
              : [language.getMessage('am'), language.getMessage('pm')];
          val = names.filter(Boolean).sort((a, b) => b.length - a.length)
            .find(name => remaining.toLowerCase().startsWith(name.toLowerCase())) || '';
          if (v === 'ddd' || v === 'dddd') weekDay = names.indexOf(val);
        }
        if (!val) return null;
        if (v === 'h' || v === 'hh') has12Hour = true;
        expInfo[1](dateInfo, val);
        if (v === 'MMM' || v === 'MMMM') dateInfo.month = language.getMonthsIdx(val, v === 'MMM' ? 'abbr' : 'full');
        if (v === 'a' || v === 'A') dateInfo.isPm = val.toLowerCase() === language.getMessage('pm').toLowerCase();
        startIdx += val.length;
        break;
      }
    }

    if (j < 1) {
      if (dateStr[startIdx] !== format[i]) return null;
      i += 1;
      startIdx += 1;
    } else {
      i += j;
    }
  }
  if (startIdx !== dateStr.length) return null;
  if (dateInfo.month < 0 || dateInfo.month > 11 || dateInfo.day < 1 || dateInfo.day > 31 ||
    dateInfo.minute > 59 || dateInfo.second > 59 ||
    (has12Hour ? dateInfo.hour < 1 || dateInfo.hour > 12 : dateInfo.hour > 23)) return null;

  if (dateInfo.hour != null && !dateInfo.isH) {
    if (dateInfo.isPm && +dateInfo.hour !== 12) {
      dateInfo.hour = +dateInfo.hour + 12;
    } else if (!dateInfo.isPm && +dateInfo.hour === 12) {
      dateInfo.hour = 0;
    }
  }

  let date: Date;

  // setFullYear는 0~99년을 1900년대로 보정하지 않습니다.
  date = new Date(0);
  date.setFullYear(dateInfo.year, dateInfo.month, dateInfo.day);
  date.setHours(dateInfo.hour, dateInfo.minute, dateInfo.second, dateInfo.millisecond);
  if (date.getFullYear() !== dateInfo.year || date.getMonth() !== dateInfo.month ||
    date.getDate() !== dateInfo.day || date.getHours() !== dateInfo.hour ||
    date.getMinutes() !== dateInfo.minute || (weekDay !== undefined && date.getDay() !== weekDay)) return null;

  return date;
};

// match word
const matchFind = (val: string, regexp: RegExp) => {
  const match = regexp.exec(val);

  return match == null || match.index !== 0 ? "" : match[0];
};

// number check regular expression
const digitsCheck: Record<string, RegExp> = {
  twoOptional: /\d\d?/,
  two: /\d\d/,
  three: /\d{3}/,
  four: /\d{4}/,
};

// word check regular expression
const word = /[^\s]+/;

const expressionsFunction: Record<string, [RegExp, (dateInfo: DateInfo, val: string) => DateInfo]> = {
  YY: [
    digitsCheck["two"],
    (dateInfo: DateInfo, val: string) => {
      dateInfo.year = +(("" + new Date().getFullYear()).substring(0, 2) + val);
      return dateInfo;
    },
  ],
  YYYY: [
    digitsCheck["four"],
    (dateInfo: DateInfo, val: string) => {
      dateInfo.year = +val;
      return dateInfo;
    },
  ],
  M: [
    digitsCheck["twoOptional"],
    (dateInfo: DateInfo, val: string) => {
      dateInfo.month = +val - 1;
      return dateInfo;
    },
  ],
  MM: [
    digitsCheck["two"],
    (dateInfo: DateInfo, val: string) => {
      dateInfo.month = +val - 1;
      return dateInfo;
    },
  ],
  MMM: [
    word,
    (dateInfo: DateInfo, val: string) => {
      dateInfo.month = Lanauage.getMonthsIdx(val, "abbr");
      return dateInfo;
    },
  ],
  MMMM: [
    word,
    (dateInfo: DateInfo, val: string) => {
      dateInfo.month = Lanauage.getMonthsIdx(val, "full");
      return dateInfo;
    },
  ],
  D: [
    digitsCheck["twoOptional"],
    (dateInfo: DateInfo, val: string) => {
      dateInfo.day = +val;
      return dateInfo;
    },
  ],
  DD: [
    digitsCheck["two"],
    (dateInfo: DateInfo, val: string) => {
      dateInfo.day = +val;
      return dateInfo;
    },
  ],
  d: [
    digitsCheck["twoOptional"],
    (dateInfo: DateInfo, val: string) => {
      dateInfo.day = +val;
      return dateInfo;
    },
  ],
  dd: [
    digitsCheck["two"],
    (dateInfo: DateInfo, val: string) => {
      dateInfo.day = +val;
      return dateInfo;
    },
  ],
  ddd: [
    word,
    (dateInfo: DateInfo, val: string) => {
      return dateInfo;
    },
  ],
  dddd: [
    word,
    (dateInfo: DateInfo, val: string) => {
      return dateInfo;
    },
  ],
  H: [
    digitsCheck["twoOptional"],
    (dateInfo: DateInfo, val: string) => {
      dateInfo.hour = +val;
      dateInfo.isH = true;
      return dateInfo;
    },
  ],
  HH: [
    digitsCheck["two"],
    (dateInfo: DateInfo, val: string) => {
      dateInfo.hour = +val;
      dateInfo.isH = true;
      return dateInfo;
    },
  ],
  h: [
    digitsCheck["twoOptional"],
    (dateInfo: DateInfo, val: string) => {
      dateInfo.hour = +val;
      return dateInfo;
    },
  ],
  hh: [
    digitsCheck["two"],
    (dateInfo: DateInfo, val: string) => {
      dateInfo.hour = +val;
      return dateInfo;
    },
  ],
  a: [
    word,
    (dateInfo: DateInfo, val: string) => {
      if (Lanauage.getMessage("am").toLowerCase() != val.toLowerCase()) {
        dateInfo.isPm = true;
      }
      return dateInfo;
    },
  ],
  A: [
    word,
    (dateInfo: DateInfo, val: string) => {
      if (Lanauage.getMessage("am").toLowerCase() != val.toLowerCase()) {
        dateInfo.isPm = true;
      }
      return dateInfo;
    },
  ],
  m: [
    digitsCheck["twoOptional"],
    (dateInfo: DateInfo, val: string) => {
      dateInfo.minute = +val;
      return dateInfo;
    },
  ],
  mm: [
    digitsCheck["two"],
    (dateInfo: DateInfo, val: string) => {
      dateInfo.minute = +val;
      return dateInfo;
    },
  ],
  s: [
    digitsCheck["twoOptional"],
    (dateInfo: DateInfo, val: string) => {
      dateInfo.second = +val;
      return dateInfo;
    },
  ],
  ss: [
    digitsCheck["two"],
    (dateInfo: DateInfo, val: string) => {
      dateInfo.second = +val;
      return dateInfo;
    },
  ],
  SSS: [
    digitsCheck["three"],
    (dateInfo: DateInfo, val: string) => {
      dateInfo.millisecond = +val;
      return dateInfo;
    },
  ],
  SS: [/\d{2}/, (dateInfo, val) => { dateInfo.millisecond = +val * 10; return dateInfo; }],
  S: [/\d/, (dateInfo, val) => { dateInfo.millisecond = +val * 100; return dateInfo; }],
};
