import Lanauage, { Language } from "../Lanauage";
import { MAX_CHAR_LENGTH, EXPRESSIONS_FORMAT } from "@/constants";
import { leftPad } from "@daracl/core";

export default (date: Date, format: string = "YYYY-MM-DD", language: Language = Lanauage) => {
  if (!(date instanceof Date) || !Number.isFinite(date.getTime())) return "";
  format = format || "YYYY-MM-DD";
  const len = format.length;

  let result = [];
  for (let i = 0; i < len; ) {
    let minLen = Math.min(MAX_CHAR_LENGTH, len - i);
    let j = minLen;
    for (; j > 0; j--) {
      const v = format.substring(i, i + j);
      if (EXPRESSIONS_FORMAT.includes(v)) {
        result.push(expressionsFunction[v](date, language));
        break;
      }
    }

    if (j < 1) {
      result.push(format.substring(i, i + 1));
      i += 1;
    } else {
      i += j;
    }
  }

  return result.join("");
};

const expressionsFunction: Record<string, (date: Date, language: Language) => string> = {
  YY: (date: Date) => {
    return String(date.getFullYear()).slice(-2);
  },
  YYYY: (date: Date) => {
    return leftPad(date.getFullYear(), 4);
  },
  M: (date: Date) => {
    return String(date.getMonth() + 1);
  },
  MM: (date: Date) => {
    return leftPad(date.getMonth() + 1, 2);
  },
  MMM: (date: Date, language: Language) => {
    return language.getMonthsMessage(date.getMonth());
  },
  MMMM: (date: Date, language: Language) => {
    return language.getMonthsMessage(date.getMonth(), "full");
  },
  D: (date: Date) => {
    return String(date.getDate());
  },
  DD: (date: Date) => {
    return leftPad(date.getDate(), 2);
  },
  d: (date: Date) => {
    return String(date.getDate());
  },
  dd: (date: Date) => {
    return leftPad(date.getDate(), 2);
  },
  ddd: (date: Date, language: Language) => {
    return language.getWeeksMessage(date.getDay());
  },
  dddd: (date: Date, language: Language) => {
    return language.getWeeksMessage(date.getDay(), "full");
  },
  H: (date: Date) => {
    return String(date.getHours());
  },
  HH: (date: Date) => {
    return leftPad(date.getHours(), 2);
  },
  h: (date: Date) => {
    return String(getH(date));
  },
  hh: (date: Date) => {
    return leftPad(getH(date), 2);
  },
  a: (date: Date, language: Language) => {
    return getMeridiem(date, false, language).toLowerCase();
  },
  A: (date: Date, language: Language) => {
    return getMeridiem(date, true, language);
  },
  m: (date: Date) => {
    return String(date.getMinutes());
  },
  mm: (date: Date) => {
    return leftPad(date.getMinutes(), 2);
  },
  s: (date: Date) => {
    return String(date.getSeconds());
  },
  ss: (date: Date) => {
    return leftPad(date.getSeconds(), 2);
  },
  SSS: (date: Date) => {
    return leftPad(date.getMilliseconds(), 3);
  },
  S: (date: Date) => String(Math.floor(date.getMilliseconds() / 100)),
  SS: (date: Date) => leftPad(Math.floor(date.getMilliseconds() / 10), 2),
};

function getH(date: Date) {
  let hour = date.getHours();
  if (hour > 12) {
    hour -= 12;
  } else if (hour < 1) {
    hour = 12;
  }
  return hour;
}

function getMeridiem(date: Date, isUpper: boolean, language: Language) {
  const hour = date.getHours();
  let m = hour < 12 ? "am" : "pm";

  m = language.getMessage(m);
  m = isUpper ? m.toUpperCase() : m;

  return m;
}
