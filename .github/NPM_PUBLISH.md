# npm 자동 배포 설정 (OIDC)

`.github/workflows/publish-npm.yml` 은 `main` push 마다 마지막 커밋의 `package.json` `version` 과 직전 커밋(`HEAD^`)의 값을 비교한다. 버전이 같으면 설치 · 검증 · 배포 job 전체를 건너뛴다. 여러 커밋을 한 번에 push 해도 비교 대상은 마지막 두 커밋이다. 부모가 없는 최초 커밋은 배포하지 않으며, 부모의 `package.json` 을 읽을 수 없으면 실패한다.

버전이 바뀌면 Node.js 24, npm 11 환경에서 `npm ci` → Playwright 크로미움 설치 → `npm test` → `npm publish` 순서로 실행한다. 검증이 실패하면 배포하지 않는다.

- `npm test` 는 `npm run build` → `node --test tests/*.test.mjs` → `test:types` → `test:package` 를 모두 실행하므로 별도 빌드 단계가 없다. 배포되는 `dist/` 는 이 단계에서 만든 것이다.
- 배포 명령에는 `--ignore-scripts` 를 사용한다. `prepack`(`npm run build`)의 중복 빌드를 생략하기 위해서다.
- 의존성은 `package-lock.json` 으로 고정해 `npm ci` 로 설치한다. lockfile 과 `package.json` 이 어긋나면 설치 단계에서 실패한다.

## Trusted Publishing (OIDC) 등록

NPM_TOKEN 은 사용하지 않는다. 토큰 없이 GitHub 가 발급한 단기 OIDC 토큰으로 인증한다.

1. npmjs.com 의 `@daracl/datetimepicker` 패키지 **Settings → Trusted Publisher** 에서 GitHub Actions 를 선택한다.
2. 아래 값을 입력한다. npm 은 대소문자를 구분하므로 실제 저장소 이름과 정확히 같아야 한다.
   - Organization or user: `daracl`
   - Repository: `ui-dateTimePicker` (현재 `origin` 과 `package.json` 의 `repository.url` 기준)
   - Workflow filename: `publish-npm.yml`
   - Environment: 비워 둔다 (이 workflow 는 GitHub Environment 를 사용하지 않는다)
3. GitHub 저장소에서 Actions 를 활성화한다.
4. 사용하지 않는 기존 배포 토큰은 폐기하고, 필요하면 npm 패키지 설정에서 토큰 배포 차단을 선택한다.

GitHub 호스팅 Ubuntu runner 와 `id-token: write` 권한을 사용한다. Node.js 24 와 npm 11 은 OIDC 최소 요구사항(Node.js 22.14.0, npm 11.5.1)을 충족한다. npm 에 패키지가 아직 없다면 최초 1회 수동 배포 후 Trusted Publisher 를 등록한다. OIDC 인증이 실패해도 토큰으로 재시도하지 않는다. 저장소 · workflow 이름과 npm 등록 정보를 먼저 확인한다.

공식 안내: https://docs.npmjs.com/trusted-publishers/

## E404 / ENEEDAUTH 로 배포가 실패할 때

`npm error 404 Not Found - PUT https://registry.npmjs.org/@daracl%2fdatetimepicker` 는 패키지가 없어서가 아니라 **OIDC 인증이 되지 않았다**는 뜻일 수 있다. 아래를 순서대로 확인한다.

1. workflow 에서 `actions/setup-node` 에 `registry-url` 을 지정하지 않았는지 확인한다. 지정하면 `.npmrc` 에 `_authToken=${NODE_AUTH_TOKEN}` 가 생겨 OIDC 를 막는다. (로그에 `Unknown user config "always-auth"` 경고가 보이면 이 설정이 남아 있는 것이다.)
2. npmjs.com 의 Trusted Publisher 값이 workflow 실행과 **정확히 일치**하는지 확인한다: 소유자 `daracl`, 저장소 `ui-dateTimePicker`(대소문자 구분), workflow 파일명 `publish-npm.yml`, environment 비움.
3. npm 이 11.5.1 이상인지 확인한다. (workflow 가 `npm install --global npm@11` 후 버전을 검사한다.)
4. `package.json` 의 `repository.url` 이 `git+https://github.com/daracl/ui-dateTimePicker.git` 인지 확인한다.

버전이 같아서 push 만으로는 배포가 시작되지 않을 때는 Actions 탭의 **Publish to npm → Run workflow** (`main` 브랜치)로 수동 실행한다. 수동 실행은 `package.json` 의 현재 버전을 배포하며, 이미 게시된 버전이면 실패한다.

## 배포 및 확인

- `package.json` 의 `version` 을 올려 `main` 에 push 한다. 이미 게시된 버전은 다시 게시할 수 없으며 `npm publish` 가 실패한다.
- Actions 의 `Publish to npm` 실행에서 버전 비교와 test / build / publish 결과를 확인한다.
- 버전을 바꾸지 않은 후속 커밋에서는 `publish` job 이 skipped 인지 확인한다.
- 실패한 배포는 원인을 해결한 뒤 해당 실행을 다시 실행할 수 있다. 이미 게시된 실행을 다시 실행하면 중복 버전 오류로 실패한다.
- 로컬에서 같은 검증을 하려면 `npm ci && npx playwright install chromium && npm test` 를 실행한다. `npm test` 는 `dist/` 를 지우고 다시 만든다.
