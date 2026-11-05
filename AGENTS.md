# AGENTS.md

이 문서는 현재 소스와 설정에서 확인한 사실을 기록한다. 공통 하네스(`../ui-common-harness`)의 규약과 `CLAUDE.md` 를 함께 따른다.

## 공통 실행 환경

- 이 지침은 모든 기여자와 AI 도구가 공유한다. 개인 사용자명, 드라이브, 홈 디렉터리, Node.js 설치 경로와 버전을 지침이나 스크립트에 고정하지 않는다.
- 경로는 저장소 또는 스크립트 위치를 기준으로 계산한다. 공통 하네스는 선택 사항이며 형제 디렉터리에 체크아웃하는 기본 배치를 가정하되 별도 작업 경로(`UI_HARNESS_ROOT`)도 지원한다.
- Node.js 는 `package.json` 의 `engines`(`^20.19.0 || >=22.12.0`)를 따른다. 패키지 관리자는 `package-lock.json` 이 있으므로 npm 이다. 특정 버전 관리자(nvm 등)를 필수로 가정하지 않는다.
- 명령 실행 실패는 프로젝트 오류와 실행 환경 문제를 구분한다. Windows PowerShell 에서 `npm.ps1` 이 실행 정책에 막히면 `npm.cmd` 를 사용할 수 있다. 실제 실행 전에 실패했다면 테스트 실패로 보고하지 않는다.
- 개인 Codex/Claude 설정, 전역 PATH, 레지스트리, 실행 정책을 자동 변경하지 않는다.
- 로컬 포트 · 도구 설치 상태 · 브랜치 · 미커밋 상태는 환경별 관측값이다. 소스에 선언된 설정과 구분한다.

## 1. Project Overview

- `@daracl/datetimepicker`(버전은 `package.json` 기준): 프레임워크에 종속되지 않는 브라우저용 TypeScript 날짜 · 시간 선택기. MIT License.
- 선택 모드(`mode`): `year` · `month` · `date` · `datetime` · `time`. 선택 방식(`selectionMode`): `single`(기본) · `range`(기간 선택, 다중 월 표시, 확인 · 취소 · 초기화 버튼, 반응형 월 개수).
- 표시 방식: 입력창에 붙는 레이어(기본) 또는 `inline: true`. 지역화 메시지(`Message`), 포맷 · 파서, RTL, 주 시작 요일, 비활성 날짜 · 요일을 지원한다.
- 서버 애플리케이션이 아니다. 네트워크 호출, 저장소 접근, DB 는 없다.

## 2. Technology Stack

버전은 `package.json` 의 선언 범위 기준이다. 설치된 버전과 동일하다고 가정하지 않는다.

| 구분 | 기술 및 선언 버전 |
| --- | --- |
| 구현 | TypeScript `5.6.3`(고정), SCSS, 일부 `.mjs` 스크립트 · 테스트 |
| 빌드 | Vite `~7.3.7`, Sass `^1.106.1`, 선택 사항 rollup-plugin-visualizer |
| Daracl | `@daracl/core ^0.0.13`(peerDependencies + devDependencies, ESM/CJS 번들에서 **external**), `@daracl/ui-style ^0.0.8`(dependencies, SCSS 원본이 `style/` 에서 `@use`) |
| 테스트 | Node 내장 test runner(`node --test`), `playwright`(브라우저 테스트, `@playwright/test` 의 하위 의존), `tsc` 타입 계약 검사 |
| 문서 | TypeDoc `^0.28.13` (`tsconfig.doc.json`) |
| 포맷 · 린트 | Prettier `^2.8.8`(설정은 `.prettierrc`), ESLint `^8.40.0`, `@typescript-eslint/*` `^5.59.5`, `eslint-config-prettier` `^8.8.0` (ui-grid 와 같은 선언 범위) |

- `tsconfig.json`: `strict: true`, `strictPropertyInitialization: false`, target `ES2017`, `emitDeclarationOnly`, `declarationDir: ./dist`, 별칭 `@/*` → `src/*`, `@t/*` → `src/types/*`.
- 번들 브라우저 대상: chrome87 · edge88 · firefox78 · safari14 (`vite.common.mjs`).
- ESLint 는 ui-grid 와 같은 규칙 세트(`.eslintrc.json`: `eslint:recommended` + `@typescript-eslint/recommended` + `prettier`)를 `src/**/*.ts` 에 적용한다. 규칙은 ui-grid 와 같지만 `quotes` 만 `warn` 이다 (아래 "코딩 규칙" 참조). 배포 CI 는 `.github/workflows/publish-npm.yml` 이다.

## 3. Project Structure

```text
src/
  DateTimePicker.ts          공개 클래스 (옵션 병합 · DOM 생성 · 이벤트 · 단일 / 기간 선택 · 위치 계산)
  DaraDate.ts                Date 래퍼 (월 말일 보정 · 가감산)
  Lanauage.ts                지역화 메시지 · Language 클래스 (파일명 철자 그대로 유지)
  constants.ts               포맷 토큰, 기본 포맷, 요일 클래스, DateViewMode enum
  index.ts                   ESM/CJS 진입점 (DateTimePicker · 타입 · DateViewMode export + SCSS import + global)
  index.umd.ts / global.ts   UMD 진입점 · window.Daracl.dateTimePicker 등록
  format/index.ts            Date → 문자열 (기본 export)
  util/parser.ts             문자열 → Date (엄격한 검증, 기본 export)
  util/popupEvents.ts        열린 팝업의 전역 resize / scroll / click / keydown 리스너를 하나로 공유
  util/range.ts              기간 계산 (calendarDay · rangeResult · cloneDate · parseRangePeriod · addPeriod: maxRange 의 2W · 3M · 1Y 해석과 프리셋 날짜 계산)
  util/utils.ts              escapeHtml · closestElement
  types/                     DateTimePickerOptions.d.ts · Message.d.ts (공개 타입)
style/
  daracl.datetimepicker.scss 유일한 SCSS 진입점 (css · min.css · map 은 생성물)
tests/                       dates · range · browser(.test.mjs), types.ts (타입 계약)
scripts/                     build.mjs · build-files.mjs · package-smoke.mjs
uitest/                      수동 / 시각 테스트 playground (index.html, playground.js, range-examples.js)
example/                     빌드 후 열어보는 예제 (index.html, range-demo.mjs)
public/                      배포물에 복사되는 데모 (index.html, demo.css, demo.js)
docs/ / dist/                생성 문서 · 배포 산출물 (직접 수정 금지)
```

루트: `package.json`, `vite.common.mjs` · `vite.config.mjs` · `vite.config.umd.mjs`, `tsconfig.json` · `tsconfig.doc.json`, `.prettierrc`, `.editorconfig`, `.gitattributes`(LF), `BUILDING.md`, `SOURCE-REVIEW.md`, `runBuild*.bat`.

## 4. Architecture & Module Responsibilities

- `DateTimePicker` 는 `constructor`/`static create` 로 생성한다. 옵션은 `DEFAULT_OPTIONS`(`DateTimePicker.setOptions` 가 전역 기본값을 바꾼다)에 인스턴스 옵션을 `Object.assign` 으로 덮어쓴다(값이 `undefined` 인 키는 무시). 생성된 인스턴스는 `destroy()` 로 DOM · 리스너를 해제한다.
- 렌더링은 `refresh()` → `yearDraw` / `monthDraw` / `dayDraw` 로 모드별로 나뉜다. `dayDraw` 의 한 달 그리기는 `drawDayMonth`, 기간 선택은 `initRangeTemplate`, `paintRange` 가 담당한다.
- **기간 선택**: 상태는 `rangeState`(진행 중) · `committedRange`(확정). `selectRangeDate` → `applyRange` → `validRange`(`minRange` · `maxRange` · `allowSameDate` · `allowReverse` · 비활성 날짜) 흐름이며 `confirmRange` / `cancelRange` / `clearRange` / `getRange` / `getRangeState` 를 공개한다. 일수 계산은 `util/range.ts` 의 `calendarDay`(DST · 0~99년 보정 회피)를 사용한다.
- **전역 이벤트**: 열린 팝업은 `registerPopup`/`unregisterPopup`(`util/popupEvents.ts`)으로 등록한다. 인스턴스 수와 관계없이 `window` resize · scroll, `document` click · keydown 리스너는 종류별 하나이며, 위치 갱신은 `requestAnimationFrame` 으로 묶는다. 닫을 때 마지막 팝업이면 프레임 요청까지 취소한다.
- 위치 계산 `measurePosition()` 은 읽기와 쓰기를 분리한 함수를 반환한다(강제 레이아웃 회피). 이 계약을 바꾸면 `popupEvents.ts` 도 함께 확인한다.
- 공용 유틸(`@daracl/core` 의 `isFunction`, `isNumeric`, `leftPad`, `leftPadClamp`)을 재사용한다. 비슷한 헬퍼를 새로 만들기 전에 core 와 `util/` 을 먼저 찾는다.
- 사용자 입력이나 메시지를 HTML 로 조립하는 곳은 `escapeHtml` 을 거치는지 확인한다.
- 스타일: 루트 `.daracl-datetime-wrapper`, 클래스 접두사 `ddtp-`, 전용 CSS 변수 접두사 `ddtp`, keyframes `ddtp-fade-in/out`. 공통 색은 `@daracl/ui-style` 의 `themes.themed(...)`. 숨김 컨테이너 `#hiddenDaraDatetimeElement`(`.daracl-datetime-hidden`)를 body 에 만든다.

## 5. Coding Conventions

- Prettier(`.prettierrc`): printWidth 512, tab 4, 작은따옴표, 세미콜론 없음, trailingComma all. **실제 소스는 파일마다 다르다** — `DateTimePicker.ts` · `format/` 은 큰따옴표 + 세미콜론 + 2칸, `DaraDate.ts` 는 4칸이다. 새 코드는 수정하는 파일의 주변 스타일에 맞추고, 파일 전체를 재포맷하지 않는다. (`package.json` 의 `prettier` 키는 `.prettierrc` 와 값이 다르다. 어느 쪽을 고칠지는 사용자에게 먼저 확인한다.)
- ESLint(`.eslintrc.json`): ui-grid 와 같은 규칙에 `no-console: warn`, `semi: always`(error), `quotes: single`. **`quotes` 는 `warn` 으로 낮춰 두었다.** 이 저장소의 소스(`DateTimePicker.ts`, `format/`, `parser.ts` 등)가 큰따옴표를 쓰고 있어 309건이 걸리기 때문이다. 일괄 변환은 `npx eslint src --ext .ts --fix` 로 가능하지만 파일 대부분이 바뀌므로 사용자 확인 후에만 한다. 변환을 마치면 `quotes` 를 `error` 로 올려 ui-grid 와 완전히 같게 맞춘다.
- 새 코드는 린트 경고를 늘리지 않는다. 기존 경고(`no-non-null-assertion`, `no-explicit-any`, `no-unused-vars`)는 ui-grid 와 같은 `warn` 이며 요청 없이 일괄 정리하지 않는다.
- 줄바꿈은 LF(`.gitattributes`, `.editorconfig`). `*.bat` 만 CRLF.
- 가져오기: `@/`(src), `@t/`(src/types) 별칭과 상대 경로가 혼용된다. 주변 코드를 따른다. 별칭을 바꾸면 `tsconfig.json` 과 `vite.common.mjs` 를 함께 고친다.
- `format` · `parser` 는 default export, `DateTimePicker` 등은 named export 다. 공개 export 형태를 바꾸지 않는다.
- 주석은 한국어. 공개 API 에는 `/** */` 를 쓴다.
- 테스트는 `node:test` + `node:assert/strict`(`*.test.mjs`). 빌드 산출물(`dist/`)을 import 해서 검증한다.
- 클래스 · CSS 변수 · 키프레임 이름은 접두사 규칙(`ddtp`)을 지킨다. 다른 Daracl 프로젝트(dialog, toast 등)와 전역 이름이 충돌하지 않게 한다.

## 6. Naming Conventions

| 대상 | 관례 · 예 |
| --- | --- |
| 클래스 · 인터페이스 · 타입 | PascalCase: `DateTimePicker`, `DaraDate`, `DateRangeState` |
| 메서드 · 변수 | camelCase. 내부 메서드는 `private`, 일부는 `_` 접두사 (`_minDate`, `_documentClickEvent`) |
| 상수 | UPPER_SNAKE_CASE: `DEFAULT_FORMAT`, `EXPRESSIONS_FORMAT` |
| enum | `DateViewMode` (공개 export) |
| CSS | 클래스 `ddtp-*`, 루트 `daracl-datetime-*`, 변수 `--ddtp-*` |
| 테스트 · 수동 페이지 | `tests/*.test.mjs`, `uitest/*` |

기존 철자 `Lanauage.ts`(Language 의 오타)를 임의로 정정하지 않는다. import 경로가 모두 이 이름에 의존한다.

## 7. Development Guidelines

- 옵션을 추가 · 변경하면 `types/DateTimePickerOptions.d.ts` → `DEFAULT_OPTIONS`(`DateTimePicker.ts`) → 소비 코드 → `tests/types.ts`(타입 계약) → README 옵션 표 → `uitest/` 순으로 영향을 확인한다. 메시지 키를 추가하면 `types/Message.d.ts` 와 `Lanauage.ts` 의 기본값을 함께 갱신한다.
- 새 기능은 `uitest/` 에 확인 가능한 예를 추가하고, 로직은 `tests/*.test.mjs` 에 단위 테스트를 추가한다. DOM 상호작용은 `tests/browser.test.mjs`(Playwright 크로미움)에 둔다.
- 리스너 · 타이머 · 임시 DOM 을 추가하면 `destroy()` / `hide()` 경로에서 해제하고, 여러 인스턴스를 동시에 열었을 때의 독립성을 확인한다. 전역 리스너는 `popupEvents.ts` 를 통해서만 추가한다.
- 날짜 계산은 DST · 윤년 · 월말 보정 · 0~99년을 고려한다. `new Date(y, m, d)` 에 0~99 년을 넣으면 1900년대로 바뀐다.
- 스타일을 바꾸면 light/dark 모두 확인한다. 색은 `themes.themed(키)` 를 쓰고 hover / selected 는 bg · color 를 쌍으로 쓴다. `--dui-*` 를 컴포넌트 루트에서 다시 선언하지 않는다.
- 새 설명 · 주석은 한국어로 쓰고 기술명 · API 이름은 원문을 유지한다.

### 설정과 환경

- 번들 설정은 `vite.common.mjs`(공통) · `vite.config.mjs`(ESM/CJS, `@daracl/core` external) · `vite.config.umd.mjs`(UMD, 전역 이름 `Daracl`). `mode=production` 은 `dist`(minified), `development` 는 `dist/unmin` 에 쓰고 전체 빌드가 합친다.
- `APP_VERSION` 은 빌드 시 `package.json` 버전으로 주입된다(`DateTimePicker.VERSION`). 소스에서 `declare const APP_VERSION` 으로 사용한다.
- 번들 분석은 `ANALYZE=true` 일 때만 켜지고 브라우저를 열지 않는다(`bundle-report-*.html`).
- `scripts/build-files.mjs` 의 `html` 작업이 `public/` 의 데모와 `node_modules/@daracl/ui-style/dist/theme-vars.css` 를 `dist/` 로 복사한다. ui-style 이 설치돼 있어야 빌드가 끝난다.

## 8. Build & Test Commands

| 명령 | 용도 |
| --- | --- |
| `npm run dev` | Vite 개발 서버 (`127.0.0.1:4174`, `/uitest/index.html` 자동 열기) |
| `npm run build` | `scripts/build.mjs`: `dist` 초기화 → 선언 파일 + production/development 번들 병렬 → unmin 병합 · 정리 → 데모 HTML 복사 |
| `npm run build:escjs` / `build:umd` | ESM·CJS / UMD 번들만 (production + development) |
| `npm run build:tsc` | 타입 선언 생성 (`dist/`) |
| `npm run lint` | ESLint (`src/**/*.ts`). 오류가 있으면 종료 코드 1, 경고는 통과 |
| `npm run typecheck` | `tsc --noEmit` 소스 타입 검사 (산출물 없음) |
| `npm run test:types` | `tests/types.ts` 타입 계약 검사 (`tsc --noEmit`, 산출물 없음) |
| `npm run test:package` | `dist` 산출물 · exports · UMD 등록 · 배너 · 소스맵 검증. **먼저 build 가 필요** |
| `node --test tests/*.test.mjs` | 단위 · 브라우저 테스트. `dist/` 를 import 하므로 **먼저 build 가 필요**하고 `browser.test.mjs` 는 Playwright 크로미움이 필요하다 |
| `npm test` | `npm run build` → `node --test` → `test:types` → `test:package` 전체 |
| `npm run docs:gen` | TypeDoc 으로 `docs/` 생성 |
| `npm run audit:security` | 런타임 의존성 `npm audit` |

- `npm test` 와 `npm run build` 는 `dist/` 를 지우고 다시 만든다. 원본 `dist` 를 보존해야 하면 하네스의 임시 사본 빌드(`../ui-common-harness/scripts/temp-build.mjs`)를 사용한다.
- `npm run pwtest` 는 `playwright test` 이지만 `playwright.config` 와 `*.spec.*` 가 없다. 준비된 E2E 로 간주하지 않는다. 브라우저 테스트는 `node --test` 로 실행되는 `tests/browser.test.mjs` 다.
- 의존성 설치(`npm install`, `npm ci`)는 사용자 확인 후에 한다.

## 9. Error Handling & Logging

- 값 변환은 계약된 값으로 처리한다: `parser` 는 유효하지 않으면 `null`, `format` 은 유효하지 않은 Date 에 빈 문자열을 반환한다.
- 생성자는 대상 요소가 없으면 `Error`, 기간 선택에 `date` / `datetime` 이외의 `mode` 를 주면 `RangeError` 를 던진다.
- 콜백(`onSelect`, `onClose`, `beforeChangeDatepicker`, `beforeSelectRange` 등)이 `false` 를 반환하면 해당 동작이 취소된다. 이 취소 계약을 유지한다.
- 중앙 logger 는 없다. 라이브러리 코드에 `console.*` 를 새로 추가하지 않는다.

## 10. AI Agent Instructions

1. 코드 수정 전 관련 모듈, 공개 타입, 이벤트 · 상태 흐름과 테스트를 먼저 읽는다. `git status` 로 미커밋 변경을 확인하고 보존한다.
2. 기존 아키텍처와 주변 코드 스타일을 유지하고 하위 호환성을 보장한다.
3. 불필요한 리팩터링 · 구조 변경 · 전체 포맷팅을 하지 않는다. 요청하지 않은 파일은 수정하지 않는다.
4. 공용 모듈(`@daracl/core`, `util/`)을 먼저 찾아 재사용한다. 새 라이브러리는 꼭 필요할 때만, 이유를 설명하고 사용자 확인 후 추가한다.
5. 공개 export, 옵션 키, 메서드 시그니처, CSS 클래스 · 변수, 전역 등록 이름(`Daracl.dateTimePicker`), export 경로를 임의로 바꾸지 않는다. 바꿔야 하면 먼저 알린다.
6. 수정 후 가능한 범위에서 `npm run test:types`, 빌드, 테스트를 실행한다. UI 동작은 `uitest/` 에서의 수동 확인과 자동 검증을 구분해 보고한다.
7. 완료 후 변경 파일, 변경 내용, 검증 결과와 실행하지 못한 검증 및 이유를 설명한다.
8. 요구사항이나 공개 계약이 불명확하면 임의로 결정하지 않고 사용자에게 확인한다.

## 11. Restrictions & Precautions

- 사용자 작업과 기존 미커밋 변경을 보존한다. 생성물 · lockfile · 배포 · 문서 전체를 요청 없이 갱신하지 않는다.
- `dist/` · `docs/` · 빌드가 만든 `style/*.css` · `style/*.map` · `bundle-report*.html` 은 직접 수정하지 않는다.
- 커밋 · 푸시 · 파일 삭제 · 배포(`npm publish`)는 사용자가 요청할 때만 한다.
- 브라우저 DOM 을 직접 다루는 라이브러리다. SSR 에서 import 만으로 깨지지 않도록 전역 접근(`window`, `document`)은 가드하거나 생성 시점으로 미룬다. SSR 전체 지원을 단정하지 않는다.
- 오래된 주석 · README · 문서보다 현재 구현 · 설정을 근거로 삼는다. 문서와 코드가 다르면 보고한다.
