# soksak-plugin-editor

soksak 파일 에디터. 코드·텍스트·마크다운·SVG 파일을 CodeMirror 6 에디터로 표시하며 구문 강조,
찾기/바꾸기, 저장을 제공합니다.

soksak **파일 뷰어**(`contributes.fileViewers`)로 등록됩니다. 코어는 열린 파일을 폴백(`"*"`)으로
이 플러그인의 뷰어에 라우팅합니다. 즉 에디터 엔진은 이 플러그인이 소유하고 코어는 매칭·호스팅만 합니다
— 스켈레톤 계약의 엔진 중립(A13). 미디어 플러그인이 이미지/PDF/영상/오디오를 정확한 확장자로 가져가고,
나머지는 에디터가 텍스트로 처리합니다.

## 기능

- CodeMirror 6 에디터, 구문 강조(`@uiw/codemirror-extensions-langs`)
- 찾기/바꾸기 위젯(⌘F / ⌘⌥F)
- 디스크 저장(⌘S)
- 마크다운·SVG 미리보기 전환
- 대용량 파일 보호(20 MiB 초과 시 구문 강조 비활성)
- 호스트 테마 추종(CSS 변수 + `theme.changed` 이벤트)

## 명령

- `editor.save {view?}` — 활성(또는 지정) 뷰 저장
- `editor.find {query, view?, caseSensitive?, regexp?, wholeWord?}` — 찾기·하이라이트
- `editor.replace {query, replacement, view?, all?, ...}` — 바꾸기
- `editor.format {view?}` — 서식(등록된 포매터 필요)
- `editor.ping` — 적재/버전 확인

모든 명령은 `sok` CLI 와 MCP 에 자동 노출됩니다.

## 권한

`ui`, `fs:read`, `fs:write`, `commands`

## 빌드

```
npm install
npm run build   # → main.js
```
