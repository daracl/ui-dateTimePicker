import Lanauage from "@/Lanauage";
import { MAX_CHAR_LENGTH, EXPRESSIONS_FORMAT } from "@/constants";
import { leftPad } from "@daracl/core";

export default (date: Date, format: string) => {
  format = format || "YYYY-MM-DD";
  const len = format.length;

  let result = [];
  for (let i = 0; i < len; ) {
    let minLen = Math.min(MAX_CHAR_LENGTH, len - i);
    let j = minLen;
    for (; j > 0; j--) {
      const v = format.substring(i, i + j);
      if (EXPRESSIONS_FORMAT.includes(v)) {
        try {
          result.push(expressionsFunction[v](date));
        } catch (e) {
          console.log(EXPRESSIONS_FORMAT.includes(v), v, e);
        }
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

const expressionsFunction: any = {
  YY: (date: Date) => {
    return String(date.getFullYear()).slice(-2);
  },
  YYYY: (date: Date) => {
    return String(date.getFullYear());
  },
  M: (date: Date) => {
    return String(date.getMonth() + 1);
  },
  MM: (date: Date) => {
    return leftPad(date.getMonth() + 1, 2);
  },
  MMM: (date: Date) => {
    return Lanauage.getMonthsMessage(date.getMonth());
  },
  MMMM: (date: Date) => {
    return Lanauage.getMonthsMessage(date.getMonth(), "full");
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
  ddd: (date: Date) => {
    return Lanauage.getWeeksMessage(date.getDay());
  },
  dddd: (date: Date) => {
    return Lanauage.getWeeksMessage(date.getDay(), "full");
  },
  H: (date: Date) => {
    return String(date.getHours());
  },
  HH: (date: Date) => {
    return leftPad(date.getHours(), 2);
  },
  h: (date: Date) => {
    return getH(date);
  },
  hh: (date: Date) => {
    return leftPad(getH(date), 2);
  },
  a: (date: Date) => {
    return String(date.getFullYear()).slice(-2);
  },
  A: (date: Date) => {
    return getMeridiem(date, true, true);
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

function getMeridiem(date: Date, isUpper: boolean, isShort: boolean) {
  const hour = date.getHours();
  let m = hour < 12 ? "am" : "pm";

  m = Lanauage.getMessage(m);
  m = isUpper ? m.toUpperCase() : m;

  return m;
}
