# DateTimePicker

An easy to use lightweight javascript calendar library.

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/daracl/ui-dateTimePicker/blob/main/LICENSE)
[![npm version](https://badge.fury.io/js/@daracl%2Fdatetimepicker.svg)](https://badge.fury.io/js/@daracl%2Fdatetimepicker)
[![npm](https://img.shields.io/npm/dt/@daracl%2Fdatetimepicker)](https://github.com/daracl/ui-dateTimePicker/releases)
[![minzipped size](https://img.shields.io/bundlephobia/minzip/@daracl%2Fdatetimepicker)](https://bundlephobia.com/package/@daracl%2Fdatetimepicker)



## Browser Support

| ![Chrome](https://raw.github.com/alrra/browser-logos/master/src/chrome/chrome_48x48.png) | ![Firefox](https://raw.github.com/alrra/browser-logos/master/src/firefox/firefox_48x48.png) | ![Safari](https://raw.github.com/alrra/browser-logos/master/src/safari/safari_48x48.png) | ![Opera](https://raw.github.com/alrra/browser-logos/master/src/opera/opera_48x48.png) | ![Edge](https://raw.github.com/alrra/browser-logos/master/src/edge/edge_48x48.png) |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Latest ✔                                                                                 | Latest ✔                                                                                    | Latest ✔                                                                                 | Latest ✔                                                                              | Latest ✔                                                                           |

<p>
<img src="https://github.com/daracl/ui-dateTimePicker/blob/main/demo.gif?raw=true"/>
</p>

# Installation

```bash
npm install @daracl/datetimepicker
```

OR

```bash
yarn add @daracl/datetimepicker
```

or download [zip](https://github.com/daracl/ui-dateTimePicker/releases)

# start

```bash
npm start
```

# build

```bash
npm run build

```

# datetimepicker 사용방법

```

// 언어 설정
Daracl.dateTimePicker.setDefaultFormat({
    date: 'YYYY.MM.DD'
    , datetime: "YYYY.MM.DD HH:mm"
})

// 기본 언어는 한국어입니다. 다른 언어는 setMessage(전역) 또는 create 의 세 번째 인자(인스턴스)로 바꿉니다.
Daracl.dateTimePicker.setMessage({
    am: 'AM',
    pm: 'PM',
    today: 'Today',
    ok: 'Ok',
    clear: 'Clear',
    cancel: 'Cancel',
    months: {
        full: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
        abbr: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    },
    weeks: {
        full: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        abbr: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    },
});

Daracl.dateTimePicker.create('#dateText', {
    //initialDate: '2023-08-10' // 초기화 요일
    aaa: 11
    , mode: 'date'
    , minDate: Daracl.dateTimePicker.parser('2023.08.05')
    , maxDate: Daracl.dateTimePicker.parser('2050.09.30')

    , onSelect: (dt) => {
    console.log(dt);
    //return false; 
    }
    , onClose: (dt) => {
    console.log(dt);
    //return false;
    }

    , zIndex: 1000
}, {
    ok: "Ok"
})

Daracl.dateTimePicker.create('#datetimeText', { initialDate: new Date(), mode: 'datetime' });

Daracl.dateTimePicker.create('#timeText', { initialDate: new Date(), mode: 'time' });

Daracl.dateTimePicker.create('#monthText', {
    initialDate: new Date(), format: 'YYYY-MM-DD', mode: 'month', afterChangeDatepicker: (dt, mode) => {
    console.log('monthText afterChangeDatepicker', dt, mode);
    }
});

Daracl.dateTimePicker.create('#yearText', {
    initialDate: new Date(), format: 'YYYY', mode: 'year', afterChangeDatepicker: (dt, mode) => {
    console.log('yearText afterChangeDatepicker', dt, mode);
    }
});


var aaa = Daracl.dateTimePicker.create('#date', {
    inline: true
    , showMonthAfterYear: true
    , mode: 'datetime'
    //, weekStartDay: 1
    , minDate: Daracl.dateTimePicker.parser('2023-08-05')
    , maxDate: Daracl.dateTimePicker.parser('2025-09-30')
    //, isRTL: true
    , initialDate: new Date() // 초기화 요일
    , onSelect: (dt, mode, e) => {
    console.log('select', dt, mode, e);
    }
    , beforeChangeDatepicker: (dt, callbackFn) => {
    console.log('beforeChangeDatepicker', dt);

    setTimeout(function () {
        callbackFn(true);
    }, 10)

    return false;
    }
    , afterChangeDatepicker: (dt, mode) => {
    console.log('afterChangeDatepicker', dt, mode);
    }
    , beforeDrawDate: (dt) => {
    //return false; 
    return {
        style: '111',
        //check: true,
        //, tooltip: dt.date
    }
    }
    , zIndex: 1000
});

```

# Options

| key         | Desc              | Default      | Option                            |
| ----------- | ----------------- | ------------ | --------------------------------- |
| inline     | embed             | false        |                                   |
| weekStartDay| start day        | 0            |  0:Sun, 1:Mon, 2:Tue, 3:Wed, 4:Thu, 5:Fri, 6:Sat |
| initialDate | initial date      | new Date()   |                                   |
| mode        | view mode         | date         | year, month, date, datetime, time |
| enableTodayBtn        | show the Today button. It only moves the calendar to today (it does not select a date or range, and fires no select events). Hidden when today cannot be selected (`minDate` / `maxDate` / disabled dates or weekdays) | false         | false, true|
| showMonthAfterYear | show month after           | false | true ,false      |
| format      | date format       | 'YYYY-MM-DD' |                                   |
| zIndex      | css z-index       | 1000         |                                   |
| autoClose   | auto close        | true         | true, false                       |
| minDate     | minimum date      | ''           |                                   |
| maxDate     | maximum date      | ''           |                                   |
| onLoad      | load event   |              |                                   |
| onSelect    | date select event |              |                                   |
| beforeChangeDatepicker    | date change before event |              |                                   |
| afterChangeDatepicker    | date change after event |              |                                   |
| beforeDrawDate    | before date draw |              |                                   |
| isPositionFixed    | position fixed | false      |                                   |


# Language

기본 언어는 **한국어**입니다. 아래는 기본값이며, 값을 지정한 키만 바뀝니다(`months` · `weeks`는 일부만 지정해도 됩니다). `{days}` · `{period}` · `{n}`은 값으로 치환됩니다.

| key | 설명 | 기본값 |
| --- | --- | --- |
| year, month, day | 년 · 월 · 일 | `년`, `월`, `일` |
| am, pm | 오전 · 오후 | `오전`, `오후` |
| today | 오늘 버튼 | `오늘` |
| ok | 시간 선택 · 기간 확인 버튼 | `확인` |
| clear, cancel | 기간 초기화 · 취소 버튼 | `초기화`, `취소` |
| time | 시간 | `시간` |
| rangeStart, rangeEnd | 시작 · 종료 라벨 | `시작`, `종료` |
| selectRangeStart, selectRangeEnd | 선택 안내 | `시작일을 선택하세요`, `종료일을 선택하세요` |
| rangeMin | 최소 기간 위반(`{days}`) | `최소 {days}일 이상 선택하세요.` |
| rangeMax | 최대 일 수 위반(`{days}`) | `최대 {days}일까지 선택할 수 있습니다.` |
| rangeMaxPeriod | 최대 기간(주 · 개월 · 년) 위반(`{period}`) | `최대 {period}까지 선택할 수 있습니다.` |
| periodWeeks, periodMonths, periodYears | 기간 단위(`{n}`) | `{n}주`, `{n}개월`, `{n}년` |
| rangeDisabled | 비활성 날짜 포함 | `선택할 수 없는 날짜가 포함되어 있습니다.` |
| rangeTimeOrder | 종료 시간이 시작 시간보다 빠름 | `종료 시간은 시작 시간보다 늦어야 합니다.` |
| periodPlaceholder, period1w, period1m, period3m, period6m, period1y | 기간 프리셋 셀렉트박스 | `기간 선택`, `일주일`, `1개월`, `3개월`, `6개월`, `1년` |
| months.full, months.abbr | 월 이름 | `1월` ~ `12월` |
| weeks.full | 요일 이름 | `일요일` ~ `토요일` |
| weeks.abbr | 요일 약어 | `일` ~ `토` |

> 포맷 토큰 `MMMM` · `MMM` · `dddd` · `ddd` · `a` · `A`도 이 메시지를 사용하므로 기본 출력이 한국어입니다. 예: `format(date, 'YYYY년 MMMM D일 dddd')` → `2026년 10월 29일 목요일`. 영어 이름이 필요하면 위 예시처럼 `setMessage`로 바꾸세요.


# Theme

색상 값은 [`@daracl/ui-style`](https://www.npmjs.com/package/@daracl/ui-style) 의 테마 변수(`--dui-*`)를 사용합니다.
light 값이 기본값으로 들어 있어 별도 설정 없이도 표시되지만, **dark 테마를 쓰려면 테마 변수 CSS 를 함께 로드**해야 합니다.

```js
import '@daracl/ui-style/theme-vars.css';

// dark 로 전환
document.documentElement.setAttribute('data-daracl-theme', 'dark');
```

OS 설정(`prefers-color-scheme: dark`)도 따르며, `data-daracl-theme` 속성이 있으면 그 값이 우선합니다.

> 이전 버전의 `body.dark` / `.daracl-datetime-wrapper.dark` 클래스 방식은 지원하지 않습니다.

## License
Darainfo is under [MIT License](./LICENSE).
## Range Mode (기간 선택)

`selectionMode`를 생략하면 기존 `single` 동작을 그대로 사용합니다. `range`는 `date`와 `datetime`에서 지원합니다. `time`, `month`, `year`와 조합하면 `RangeError`가 발생하며, 단일 선택의 해당 모드들은 종전처럼 작동합니다.

```javascript
const dateRange = Daracl.dateTimePicker.create('#dateRange', {
  mode: 'date',
  selectionMode: 'range',
  startDate: new Date(2026, 10, 5),
  endDate: new Date(2026, 10, 12),
  autoClose: true,
  onRangeComplete: ({ startDate, endDate, days }) => {
    console.log(startDate, endDate, days); // 양 끝 날짜를 포함한 8일
  }
});
```

DateTime Range는 기존 시간 숫자 입력과 슬라이더를 재사용합니다. `Start / End` 선택 상자로 편집 대상을 바꾸고 시간 옆의 `Ok`를 누르면 해당 시간만 적용합니다. 잘못된 시간 순서는 거부하고 이전 시간으로 복원합니다. 같은 날의 두 번째 선택은 시작 시간을 기본값으로 사용합니다.

```javascript
const dateTimeRange = Daracl.dateTimePicker.create('#dateTimeRange', {
  mode: 'datetime', selectionMode: 'range',
  startDate: new Date(2026, 10, 5, 9, 0),
  endDate: new Date(2026, 10, 12, 18, 0),
  autoClose: false, confirmButton: true,
  onRangeConfirm: range => console.log('확정', range)
}, {
  clear: '초기화', cancel: '취소', time: '시간',
  rangeStart: '시작', rangeEnd: '종료',
  selectRangeStart: '시작일을 선택하세요', selectRangeEnd: '종료일을 선택하세요',
  rangeMin: '최소 {days}일 이상 선택하세요.', rangeMax: '최대 {days}일까지 선택할 수 있습니다.', // minRange / maxRange 를 벗어나면 status 에 표시
  rangeDisabled: '선택할 수 없는 날짜가 포함되어 있습니다.', // 비활성 날짜 / 요일이 기간 안에 있을 때
  rangeTimeOrder: '종료 시간은 시작 시간보다 늦어야 합니다.',
  rangeMaxPeriod: '최대 {period}까지 선택할 수 있습니다.', periodWeeks: '{n}주', periodMonths: '{n}개월', periodYears: '{n}년', // maxRange 가 '2W' · '3M' · '1Y' 일 때
  periodPlaceholder: '기간 선택', period1w: '일주일', period1m: '1개월', period3m: '3개월', period6m: '6개월', period1y: '1년', // 기간 프리셋 셀렉트박스 // 같은 날짜에서 종료 시간이 시작 시간보다 빠를 때
  ok: '확인'
});
```

### 옵션과 우선순위

명시한 인스턴스 옵션 > `DateTimePicker.setOptions()` > 라이브러리 기본값 순으로 적용합니다. `undefined`는 기본값을 덮어쓰지 않습니다. 반응형 세부 옵션은 인스턴스에 제공한 객체를 사용하며, 생략된 필드는 아래 기본값으로 보완합니다.

| 옵션 | 기본값 | 의미 |
| --- | --- | --- |
| `selectionMode` | `'single'` | `'range'`로 기간 선택 활성화 |
| `numberOfMonths` | `2` | 표시할 월 수(1~12) |
| `responsive` | `true` | 화면 너비에 따라 월 수 변경 |
| `responsiveOptions.breakpoint` | `768` | 이 값 미만이면 모바일 |
| `responsiveOptions.mobileMonths` | `1` | 모바일 월 수 |
| `responsiveOptions.desktopMonths` | `numberOfMonths` | 데스크톱 월 수, 지정 시 `numberOfMonths`보다 우선 |
| `startDate`, `endDate` | `null` | `Date` 또는 기존 `format`에 맞춘 문자열. 둘 중 하나만 지정하면 같은 값으로 양쪽을 채웁니다(`minRange`, `allowSameDate` 등 규칙에 맞지 않으면 채우지 않음) |
| `minRange` | `0` | 양 끝을 포함한 최소 달력 일수. 0은 제한 없음 |
| `maxRange` | `null` | 선택할 수 있는 최대 기간. 숫자나 단위 없는 문자열(`30`, `'30'`, `'30D'`)은 양 끝을 포함한 **일 수**, `'2W'`(주) · `'3M'`(개월) · `'1Y'`(년)은 **달력 단위**입니다. `'3M'`은 종료일에서 3개월을 뺀 날짜(말일은 보정)가 시작일보다 늦지 않아야 합니다. 예: 시작 11/5이면 2/5까지. null은 제한 없음, 올바르지 않은 값은 `RangeError` |
| `periodSelect` | `true` | range에서 기간 프리셋 셀렉트박스(1주 · 1개월 · 3개월 · 6개월 · 1년)를 표시합니다. 입력창 **안쪽 오른쪽**에 겹쳐 입력창과 하나의 컨트롤처럼 보이고, `inline`은 달력 위에 들어갑니다. 입력창을 `<ddtp-period-field>`로 감싸므로 DOM 위치를 건드리고 싶지 않으면 `false`로 끄세요 |
| `allowSameDate` | `true` | 동일 날짜 허용. datetime도 날짜 기준이며 시간 순서는 별도 검사 |
| `allowReverse` | `true` | 시작일보다 이른 날을 고르면 먼저 고른 날을 종료일, 새로 고른 날을 시작일로 교환합니다. `false`이면 선택을 거부합니다 |
| `resetRangeOnStart` | `true` | 완료 후 새 시작일 선택 시 종료일 제거. false는 유효한 종료일을 유지하고, 무효하면 제거 |
| `autoClose` | `true` | 확정 후 팝업 닫기. inline에는 영향 없음 |
| `confirmButton`, `clearButton` | `false`, `true` | 확인/초기화 버튼 표시. 취소 버튼은 항상 표시 |
| `showRangeHighlight`, `showRangePreview` | `true`, `true` | 내부 기간 배경 / 마우스 미리보기 |
| `showOutsideDays` | `true` | 이전/다음 달 날짜 셀 표시 |
| `disabledDates`, `disabledWeekdays` | `[]`, `[]` | Range 전용 제외 날짜 / 요일(일요일 0~토요일 6) |

`minDate`, `maxDate`는 기존처럼 현지 날짜의 시작/끝까지 포함합니다(datetime의 시각 제한은 아님). 비활성 날짜가 양 끝이나 기간 중간에 있으면 기간 전체를 거부합니다. 날짜는 복제하며, 일수는 DST와 관계없이 달력 날짜로 계산합니다. 잘못된 초기 기간과 잘못된 숫자 옵션은 DOM 생성 전에 `RangeError`를 발생시킵니다. 초기 완료 기간은 확정값이며 초기화 시 선택 이벤트는 발생하지 않습니다. 시작일만 지정하면 종료일 선택 대기 상태로 시작합니다. `initialDate`는 시작일이 없을 때 표시 월을 정합니다.

```javascript
// 기본: PC 2개월, 768px 미만 1개월. 크기를 바꿔도 선택값 유지.
Daracl.dateTimePicker.create('#responsiveRange', {
  selectionMode: 'range', numberOfMonths: 2, responsive: true,
  responsiveOptions: { breakpoint: 768, mobileMonths: 1, desktopMonths: 2 }
});
// 항상 2개월을 표시하려면 responsive: false.
```

### 기간 프리셋 셀렉트박스

`selectionMode: 'range'`이면 입력창 **안쪽 오른쪽**에 `<select class="ddtp-period-select">`가 겹쳐서 입력창과 하나의 컨트롤처럼 보입니다. 라이브러리가 입력창을 `<ddtp-period-field>`(일반 태그가 아니라 호스트 CSS의 `span`/`div` 규칙에 걸리지 않습니다)로 감싸고, 글자가 셀렉트 밑으로 들어가지 않도록 입력창의 오른쪽 안쪽 여백만 늘립니다. `destroy()`하면 입력창이 원래 자리로 돌아오고 여백도 복원됩니다. 항목을 고르면 **이미 선택한 종료일은 그대로 두고, 시작일을 `종료일 − 기간`으로 채운 뒤 바로 확정**합니다(셀렉트박스는 팝업 밖에 있어 확인 버튼을 누를 수 없기 때문입니다). 종료일은 이렇게 정합니다: ① **선택한 종료일이 있으면** 그 날짜 ② **시작일만 고른 상태면 그 시작일을 종료일로 삼아** 거슬러 올라가기(시작일 11/12 + 1개월 → 10/12 ~ 11/12) ③ **아무것도 선택하지 않았으면 오늘**.

| 항목 | 종료일이 2026-10-20일 때 (시작일만 고른 경우는 그 시작일이 20일일 때도 같음) | 아무것도 선택하지 않고 오늘이 2026-11-05일 때 |
| --- | --- | --- |
| 1주 | 2026-10-13 ~ 2026-10-20 | 2026-10-29 ~ 2026-11-05 |
| 1개월 | 2026-09-20 ~ 2026-10-20 | 2026-10-05 ~ 2026-11-05 |
| 3개월 | 2026-07-20 ~ 2026-10-20 | 2026-08-05 ~ 2026-11-05 |
| 6개월 | 2026-04-20 ~ 2026-10-20 | 2026-05-05 ~ 2026-11-05 |
| 1년 | 2025-10-20 ~ 2026-10-20 | 2025-11-05 ~ 2026-11-05 |

- 시작일만 고른 상태에서 프리셋을 고르면 **고른 날짜가 시작일이 아니라 종료일**이 됩니다. `onRangeStart`는 날짜를 고른 순간에만 호출되고, 프리셋은 `onRangeChange` · `onRangeComplete`를 호출합니다.
- 월 · 연 단위는 말일을 넘지 않게 보정합니다(5/31의 1개월 → 4/30 ~ 5/31).
- **달력 위치**: 프리셋을 적용한 뒤 왼쪽 패널은 **시작일의 달**, 오른쪽(마지막) 패널은 **종료일의 달**을 보여 줍니다. 종료일이 12월이고 6개월이면 `6월 | 12월`이며, 두 달이 연속된 패널에 들어가는 거리면 연속된 달(`11월 | 12월`)입니다. 시작일 · 종료일 달이 이미 보이고 있으면 달력을 옮기지 않습니다. 패널이 3개 이상이면 첫 패널은 시작일의 달, 마지막은 종료일의 달이고 가운데는 시작일 다음 달들입니다. 한 달만 보이는 화면에서는 종료일의 달을 보여 줍니다. 이전 / 다음 달 버튼을 누르면 다시 연속된 달이 됩니다.
- 항목별 숨김 · 비활성 판단과 선택 표시도 **현재 종료일 기준**입니다. 종료일을 바꾸면 항목 상태도 달라질 수 있습니다(예: `minDate`가 6월이면 종료일이 10월일 때는 6개월이 비활성, 12월일 때는 선택 가능). 숫자 `maxRange`(일 수)는 종료일의 달 길이에 따라 1개월 항목이 보였다 숨었다 할 수 있습니다.
- **`maxRange`를 넘는 항목은 목록에서 숨깁니다.** `maxRange: '6M'`이면 1년이 보이지 않고, `'3M'`이면 6개월과 1년이 보이지 않습니다. 고를 수 있는 항목이 하나도 없으면 셀렉트박스 자체가 사라집니다. 숫자는 **일 수**이므로 `maxRange: 6`(6일)은 모든 항목이 넘어서 숨겨집니다. 6개월은 `'6M'`입니다.
- `minRange`, 비활성 날짜(`disabledDates`, `disabledWeekdays`), `minDate`, `maxDate`에 맞지 않는 항목은 **비활성**으로 표시합니다. 날짜에 따라 달라지는 규칙이라 항목은 남겨 둡니다.
- 직접 기간을 바꾸거나 초기화하면 선택이 해제되고, 현재 기간이 `종료일 − 기간`과 같으면 그 항목이 선택된 것으로 표시됩니다.
- `datetime`에서는 시작일에 시작 시간 그룹의 값을 쓰고, 이미 선택한 종료일의 날짜와 시간은 그대로 둡니다. 종료일이 새로 만들어지는 경우(시작일을 종료일로 삼거나 오늘)에는 날짜는 그대로 두고 **종료 시간 그룹**의 시간을 씁니다(시작일을 고를 때 붙어 있던 시작 시간은 쓰이지 않습니다). `beforeSelectRange`나 `onSelect`가 `false`를 반환하면 선택이 취소되고 셀렉트박스도 되돌아갑니다.
- 문구는 메시지 키로 바꿉니다: `periodPlaceholder`, `period1w`, `period1m`, `period3m`, `period6m`, `period1y`. 단위 maxRange 안내는 `rangeMaxPeriod`(`{period}`)와 `periodWeeks` · `periodMonths` · `periodYears`(`{n}`)를 씁니다.

```javascript
Daracl.dateTimePicker.create('#period', {
  selectionMode: 'range',
  maxRange: '3M',        // 최대 3개월 (6개월 · 1년 항목은 목록에서 숨김)
  // periodSelect: false // 셀렉트박스를 쓰지 않으려면 (입력창도 감싸지 않음)
}, {
  periodPlaceholder: '기간 선택', period1w: '일주일', period1m: '1개월', period3m: '3개월', period6m: '6개월', period1y: '1년',
  rangeMaxPeriod: '최대 {period}까지 선택할 수 있습니다.', periodWeeks: '{n}주', periodMonths: '{n}개월', periodYears: '{n}년'
});
```

### 선택 동작

날짜를 누를 때 아래 순서로 처리합니다.

1. **거부 안내가 떠 있을 때 같은 날짜를 다시 누르면** 그 날짜가 새 시작일이 됩니다. (종료일이 `minRange`/`maxRange`/비활성 날짜 때문에 거부된 직후)
2. **완료된 기간의 종료일을 다시 누르면** 시작일은 유지하고 종료일만 다시 고릅니다. `resetRangeOnStart`와 무관합니다. 더블클릭의 두 번째 클릭과 키 반복(Enter 길게 누름)은 무시합니다. `onRangeStart`는 다시 호출되지 않고 `onRangeChange`는 종료일이 없는 값으로 호출됩니다.
3. 그 밖에는 시작일 → 종료일 순서로 선택합니다. 시작일보다 이른 날을 고르면 `allowReverse`(기본 `true`)에 따라 두 날짜를 바꿉니다.

종료일 선택이 거부되면 사유(`rangeMin`, `rangeMax`, `rangeDisabled`, `rangeTimeOrder`)를 status 영역에 강조해서 보여줍니다.

### 확정과 취소

| autoClose | confirmButton | 완료 후 동작 |
| --- | --- | --- |
| true | false | 즉시 확정하고 닫음 |
| false | true | 편집값 유지, 확인 버튼으로 확정하고 열린 상태 유지 |
| false | false | 즉시 확정하고 열린 상태 유지 |
| true | true | 확인 버튼으로 확정하고 닫음 |

`complete`는 두 날짜 선택 완료, `committed`는 확정 여부입니다. 입력 요소에는 확정값만 `시작 ~ 종료` 형식으로 반영합니다. `getRange()` / `getDateValue()`는 현재 편집 중인 값을 반환합니다. 취소는 마지막 확정값으로 복원하고 팝업을 닫습니다. 초기화는 빈 기간을 만들며, 확인 버튼이 있으면 빈 값도 확인으로 확정할 수 있습니다. 확인 버튼이 없으면 초기화 즉시 빈 값을 확정합니다. Escape/바깥 클릭은 기존처럼 닫기만 수행하고 편집값을 유지합니다. 입력창에 직접 입력한 기간 문자열의 재파싱은 지원하지 않습니다.

### 이벤트와 메서드

모든 Range 콜백의 기본값은 미지정(호출 없음)이며 `null`도 허용합니다. 결과는 `{ startDate, endDate, days, complete }`이고 미완료/빈 기간의 `days`는 0입니다. 콜백과 getter가 반환하는 날짜를 수정해도 내부 상태는 바뀌지 않습니다.

| 이벤트 | 호출 시점 |
| --- | --- |
| `beforeSelectRange(range)` | 변경 전. false를 반환하면 변경/후속 이벤트 거부 |
| `onRangeStart(date)` | 새 시작일 선택 |
| `onRangeChange(range)` | 날짜/시간/초기화/취소로 값이 변경됨 |
| `onRangeComplete(range)` | 유효한 두 날짜가 설정되거나 완료 기간의 값이 변경됨 |
| `onRangeConfirm(range)` | 편집값을 확정. 동일 확정값 재확인 시 중복 호출 없음 |
| `onRangeCancel()` | 취소 버튼 또는 `cancelRange()` 호출 |

선택 이벤트 순서는 `beforeSelectRange` → 기존 `onSelect` → `onRangeStart`(새 시작일일 때) → `onRangeChange` → `onRangeComplete`(완료일 때) → `onRangeConfirm`(자동 확정일 때)입니다. 기존 `onSelect(value, mode, event)`의 `value`는 Range에서 기간 문자열이며 false로 거부할 수 있습니다. `beforeChangeDatepicker` / `afterChangeDatepicker`는 기존대로 달력 다시 그리기 훅이며 월 개수만큼 중복 호출하지 않습니다.

공개 메서드: `getRange()`, `getRangeState()`, `confirmRange(): boolean`, `clearRange(): boolean`, `cancelRange()`. `destroy()`는 반응형 감지 이벤트도 해제합니다. 반환값 false는 적용/확정 불가능을 뜻합니다.

```typescript
import { DateTimePicker, type DateRangeResult, type DateRangeState } from '@daracl/datetimepicker';
const picker = DateTimePicker.create('#typedRange', {
  mode: 'datetime', selectionMode: 'range', confirmButton: true,
  onRangeConfirm: (range: DateRangeResult) => console.log(range.days),
  beforeSelectRange: range => !range.complete || range.days <= 30
});
const state: DateRangeState = picker.getRangeState();
```

시각 상태 클래스는 `ddtp-range-start`, `ddtp-range-end`, `ddtp-in-range`, `ddtp-range-preview`, `ddtp-range-pending`입니다. 테마는 기존 `data-daracl-theme` 및 `@daracl/ui-style/theme-vars.css`를 사용합니다. 달력 날짜는 클릭 또는 포커스 후 Enter/Space로 선택할 수 있습니다. 실행 가능한 예제는 `example/range-demo.mjs`에 있습니다.
