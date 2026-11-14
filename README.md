# Bible-Flash
성경 말씀을 빠르게 띄워주는 프로그램입니다.

예배 중 성경 구절을 입력하면 프로젝터나 보조 모니터에 전체화면으로 표시합니다. Windows 다중 모니터 환경을 기준으로 만들었습니다.

## 주요 기능

- **자유로운 구절 입력**: `요 3:16`, `요3:16`, `요 3 16`, `요한복음 3장 16절`, `고전 13:4-7`
- **책 이름 자동완성**: `마`를 치면 마태복음과 마가복음이 나오고, `ㅁㅌ`처럼 초성만으로도 찾을 수 있습니다
- **이전/다음 구절**: 장과 책의 경계를 넘어 이어집니다. 프레젠터 리모컨의 `PageUp`/`PageDown`으로도 넘길 수 있습니다
- **미리보기**: 제어 창에서 출력 화면을 실제 해상도 그대로 줄여서 보여 줍니다. 상단의 **미리보기** 체크박스로 켜고 끌 수 있고, 설정은 기억됩니다
- **송출 상태 표시**: 제어 창 오른쪽 위에 **화면 송출 중** / **화면 꺼짐**이 표시됩니다. `Esc`로 화면을 숨기고, 구절을 다시 표시하면 켜집니다
- **최근 구절**: 검색, 목록 선택, 최근 구절 클릭으로 띄운 구절이 최근 순으로 최대 30개 남습니다. 이전/다음으로 넘긴 구절은 남지 않으며, 누르면 바로 다시 띄웁니다. 앱을 다시 켜면 비워집니다
- **긴 구절 자동 맞춤**: 렘 32:3처럼 화면을 넘는 구절만 본문 글자를 줄여 화면 안에 맞춥니다. 설정한 글자 크기의 절반보다 작아지지는 않고, 아래 구절 표기는 그대로입니다
- **출력 모니터 선택**: Display 메뉴에서 고르면 다음 실행 때도 그대로 쓰입니다. 모니터를 꽂거나 빼면 자동으로 다시 배치됩니다
- **화면 꾸미기**: 배경 이미지, 글자 크기, 배경 어둡기
- **교체 가능한 성경 DB**: 프로그램과 분리된 파일이라, 다시 설치하지 않고 번역본을 바꿀 수 있습니다

## 설치

Windows 설치와 설정은 [Windows 설치 가이드](docs/windows-install.md)를 보세요.

## 성경 DB

성경 DB는 저장소와 설치 파일 어디에도 포함되지 않습니다. 원본 SQLite 파일(예: `Bible_NKRV.sqlite`)을 따로 준비해야 합니다.

- 첫 실행 때 파일을 고르면 사용자 데이터 폴더에 `bible.sqlite`로 변환 없이 복사됩니다
  - Windows: `%APPDATA%\bible-flash\bible.sqlite`
  - macOS: `~/Library/Application Support/bible-flash/bible.sqlite`
- 나중에 바꾸려면 메뉴의 **Setting > Load Database**를 쓰세요
- 원본 파일에는 `bible_book`, `bible_verse`, `bible_book_abbreviation` 테이블이 있어야 하고, 66권과 3만 개 이상의 구절이 있는지 검사합니다

## 개발

[Electron](https://www.electronjs.org/) 45와 Electron Forge 8을 씁니다 (Node.js 22.13 이상). Forge 8 패키지가 ESM 전용이라 설정 파일은 CommonJS로 유지하려고 `forge.config.cjs`를 씁니다. DB는 Electron에 내장된 `node:sqlite`로 읽기 때문에 네이티브 모듈 빌드가 필요 없습니다.

```bash
cd bible-flash
npm install
npm start          # 개발 모드로 실행
npm run make       # 설치 파일 만들기 (out/make/)
```

Windows 설치 파일(`Setup.exe`)은 Windows에서 만드는 것을 권장합니다. macOS에서 만들려면 Wine과 Mono가 필요합니다.

### 구조

| 파일 | 역할 |
| --- | --- |
| `src/index.js` | 메인 프로세스: 창 관리, 모니터 선택, IPC |
| `src/db.js` | 성경 DB 불러오기와 조회 |
| `src/bibleSchema.js` | 원본 DB를 메모리 DB로 옮기는 SQL과 검사 |
| `src/reference.js` | 입력한 구절(`요 3:16` 등) 해석 |
| `src/bookSearch.js` | 책 이름 자동완성 (초성 검색) |
| `src/settings.js` | 설정 저장 (`settings.json`) |
| `src/menuTemplate.js` | 메뉴 (Setting, Display, View) |
| `src/control.*` | 제어 창: 검색, 목록 선택, 이전/다음, 최근 구절, 미리보기 |
| `src/display.*` | 출력 창과 긴 구절 자동 맞춤. 제어 창의 미리보기도 같은 페이지(`display.html?preview`)를 씁니다 |
