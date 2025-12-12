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


## License
Darainfo is under [MIT License](./LICENSE).