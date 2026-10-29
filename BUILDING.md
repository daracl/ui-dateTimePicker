# 빌드 및 의존성 관리

Node.js `20.19+` 또는 `22.12+`가 필요합니다. 새 환경에서는 `npm ci`로
lockfile의 검증된 의존성을 설치합니다. `package-lock.json`을 함께 커밋해야 합니다.

```sh
npm run build
npm run test:package
npm run audit:security:all
```

전체 빌드는 타입 선언 생성과 production/development 번들을 병렬 실행합니다.
같은 CSS 파일을 쓰는 ES/CJS와 UMD 작업은 각 모드 안에서 순서대로 실행합니다.
최종 `dist`에는 기존과 동일하게 minified/unminified ES, CJS, UMD, CSS,
소스맵, 타입 선언과 데모 HTML이 생성됩니다. 전체 빌드는 `dist`를 초기화합니다.

개별 빌드는 `npm run build:escjs`, `npm run build:umd`를 사용합니다.
기존처럼 순서대로 실행한 뒤 `npm run mergenclean`으로 합칠 수 있습니다.

번들 분석은 기본 빌드에서 제외했습니다. 필요할 때 PowerShell에서 실행합니다.

```powershell
$env:ANALYZE = 'true'
npm run build
Remove-Item Env:ANALYZE
```

`bundle-report-production.html`, `bundle-report-development.html`을 생성하며
브라우저를 자동으로 열지 않습니다. 분석할 때만 gzip/Brotli 크기를 계산합니다.

## 설정 변경 근거

- 형제 `corejs` 프로젝트와 같이 Vite 7.3.7 및 ESM 설정 파일을 사용합니다.
  Vite 5의 브라우저 대상(Chrome 87, Edge 88, Firefox 78, Safari 14)은 유지합니다.
  Babel 설정은 Vite 빌드에 사용되지 않았으며, Chrome 80 지원을 의미하지 않습니다.
- Sass modern API를 사용하여 legacy JS API 경고를 해결했습니다.
- `cpx → babel-runtime → core-js 2` 경로를 제거했습니다. 복사·정리는 Node 내장
  파일 API를 사용하며 런타임 polyfill은 추가하지 않습니다.
- 미사용 Babel/PostCSS/배너 플러그인과 설정·실행 스크립트가 없는 구형
  ESLint/Airbnb 의존성을 제거했습니다. 배너는 Rollup 출력 옵션으로 유지합니다.
- 개발·preview 서버는 localhost로 제한하고 개발 서버 파일 접근은 프로젝트
  내부로 제한했습니다. 외부 기기 접근이 필요하면 의도적으로 host를 지정해야 합니다.
- `@daracl/core` 개발 의존성은 기존 peer 범위 `^0.0.12`에 맞췄습니다.
- CSS·전역 등록의 side effects를 보존하고 UMD export 및 subpath 패턴을 수정했습니다.
- unmin 디렉터리에서 옮겨진 소스맵의 상대 경로를 보정합니다.

## 검증 결과 (2026-10-29)

Windows / Node 24.20.0 환경에서 전체 CLI 실행 시간은 변경 전 46.38초,
변경 후 첫 실행 13.63초로 약 71% 감소했습니다. 캐시가 데워진 후 빌드 스크립트
내부 시간은 약 4초였습니다. 파일 캐시와 시스템 부하에 따라 측정치는 달라집니다.

`npm audit`은 변경 전 26건(critical 1, high 12, moderate 12, low 1)에서
변경 후 0건으로 감소했습니다. 이는 해당 시점의 레지스트리 audit 결과입니다.
lockfile에 deprecated 패키지도 남아 있지 않습니다.

`test:package`는 ES/CJS 로딩, UMD 전역 등록, 버전, 배너, 소스맵 경로,
CSS·타입 선언·HTML과 UMD export 대상의 존재를 검증합니다.
브라우저 상호작용 테스트를 대체하지는 않습니다.

참고: [Vite 7 마이그레이션](https://v7.vite.dev/guide/migration),
[Sass legacy JS API](https://sass-lang.com/documentation/breaking-changes/legacy-js-api/).
