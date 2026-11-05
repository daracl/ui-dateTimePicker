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

Daracl.dateTimePicker.setMessage({
    year: '년',
    month: '월',
    day: '일',
    am: "오전",
    pm: "오후",
    today: '오늘',
    ok: '선택',
    months: {
    full: ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"],
    abbr: ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"]
    },
    weeks: {
    full: ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"],
    abbr: ["일", "월", "화", "수", "목", "금", "토"]
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
| enableTodayBtn        | enable today button       | false         | false, true|
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

| key    | Desc          | Default                                                                                                                    |
| ------ | ------------- | -------------------------------------------------------------------------------------------------------------------------- |
| year   | year          | Year                                                                                                                       |
| month  | Month         | Month                                                                                                                      |
| day    | Day           | Day                                                                                                                        |
| am     | AM            | AM                                                                                                                         |
| pm     | PM            | PM                                                                                                                         |
| today  | Today button  | Today                                                                                                                      |
| ok     | H:M Ok button | Ok                                                                                                                         |
| months | Months        |                                                                                                                            |
|        | full          | ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"] |
|        | abbr          | ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']                                       |
| weeks  | weeks         |                                                                                                                            |
|        | full          | ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]                                             |
|        | abbr          | ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]                                                                          |


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
  rangeTimeOrder: '종료 시간은 시작 시간보다 늦어야 합니다.', // 같은 날짜에서 종료 시간이 시작 시간보다 빠를 때
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
| `minRange`, `maxRange` | `0`, `null` | 양 끝을 포함한 최소/최대 달력 일수. 0/null은 제한 없음 |
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
