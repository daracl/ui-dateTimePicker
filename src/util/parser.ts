import Lanauage from "@/Lanauage";
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

export default (dateStr: string, format: string): Date | null => {
  if (dateStr.length > 1000) {
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

  for (let i = 0; i < len; ) {
    let minLen = Math.min(MAX_CHAR_LENGTH, len - i);
    let j = minLen;
    for (; j > 0; j--) {
      const v = format.substring(i, i + j);
      if (EXPRESSIONS_FORMAT.includes(v)) {
        const expInfo = expressionsFunction[v];
        const val = matchFind(dateStr.substring(startIdx), expInfo[0]);
        expInfo[1](dateInfo, val);
        startIdx += val.length;
        break;
      }
    }

    if (j < 1) {
      i += 1;
      startIdx += 1;
    } else {
      i += j;
    }
  }

  if (dateInfo.hour != null && !dateInfo.isH) {
    if (dateInfo.isPm && +dateInfo.hour !== 12) {
      dateInfo.hour = +dateInfo.hour + 12;
    } else if (!dateInfo.isPm && +dateInfo.hour === 12) {
      dateInfo.hour = 0;
    }
  }

  let date: Date;

  date = new Date(dateInfo.year, dateInfo.month, dateInfo.day, dateInfo.hour, dateInfo.minute, dateInfo.second, dateInfo.millisecond);

  return date;
};

// match word
const matchFind = (val: string, regexp: RegExp) => {
  const match = regexp.exec(val);

  return match == null ? "" : match[0];
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
      if (Lanauage.getMessage("am") != val.toLowerCase()) {
        dateInfo.isPm = true;
      }
      return dateInfo;
    },
  ],
  A: [
    word,
    (dateInfo: DateInfo, val: string) => {
      if (Lanauage.getMessage("am") != val.toLowerCase()) {
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
};
