// 에디터 플러그인 i18n — 뷰어/찾기 위젯 텍스트. 호스트 표시 언어(app.locale())로 해소.
// 합성 발견 표면(LLM)은 명령 description+triggers(plugin.json/commands)가 담당 — 여기는 사람 UI 만.

type Dict = Record<string, string>;

const EN: Dict = {
  loading: "Loading…",
  unsupported: "Cannot display this file",
  binFail: "Failed to load file",
  code: "Code",
  preview: "Preview",
  largeFile: "Large file ({size}) — syntax highlighting off",
  truncated: "Truncated — first {read} shown (read-only)",
  saveFailed: "Save failed: {err}",
  saving: "Saving…",
  unsaved: "Unsaved",
  imgFail: "Failed to load image",
  "find.placeholder": "Find",
  "find.count": "{cur} of {total}",
  "find.noResults": "No results",
  "find.matchCase": "Match case",
  "find.wholeWord": "Whole word",
  "find.regex": "Regular expression",
  "find.prev": "Previous match",
  "find.next": "Next match",
  "find.close": "Close",
  "find.replace": "Replace",
  "find.replaceOne": "Replace",
  "find.replaceAll": "Replace all",
  "find.toggleReplace": "Toggle replace",
};

const KO: Dict = {
  loading: "불러오는 중…",
  unsupported: "이 파일은 표시할 수 없습니다",
  binFail: "파일을 불러오지 못했습니다",
  code: "코드",
  preview: "미리보기",
  largeFile: "큰 파일({size}) — 구문 강조 비활성",
  truncated: "잘림 — 앞 {read} 만 표시(읽기 전용)",
  saveFailed: "저장 실패: {err}",
  saving: "저장 중…",
  unsaved: "미저장",
  imgFail: "이미지를 불러오지 못했습니다",
  "find.placeholder": "찾기",
  "find.count": "{total} 중 {cur}",
  "find.noResults": "결과 없음",
  "find.matchCase": "대소문자 구분",
  "find.wholeWord": "단어 단위",
  "find.regex": "정규식",
  "find.prev": "이전 일치",
  "find.next": "다음 일치",
  "find.close": "닫기",
  "find.replace": "바꾸기",
  "find.replaceOne": "바꾸기",
  "find.replaceAll": "모두 바꾸기",
  "find.toggleReplace": "바꾸기 전환",
};

export function t(
  key: string,
  lang: string,
  params?: Record<string, string | number>,
): string {
  const dict = lang === "ko" ? KO : EN;
  let s = dict[key] ?? EN[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      s = s.replace(`{${k}}`, String(v));
    }
  }
  return s;
}
