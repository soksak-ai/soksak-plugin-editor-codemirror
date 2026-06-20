// 에디터 확장 프로토콜 — 다른 플러그인(포매터·언어·CM 확장)이 이 에디터를 확장하는 통로.
// 코어 app.editor 가 사라졌으므로(엔진 중립 A13: 코어는 에디터 엔진을 모른다) 에디터 플러그인이
// 자기 확장점을 app.bus 로 노출한다. 확장 플러그인은 manifest dependencies 로 이 플러그인을 보장받고,
// activate 에서 아래 토픽에 등록 메시지를 emit 한다. 등록은 멱등(같은 id 재등록 = 교체).
//
// 토픽(요청 = 확장 플러그인 → 에디터):
//   "editor.ext.register"   payload: RegisterMsg  — 포매터/언어/CM확장 등록
//   "editor.ext.unregister" payload: { kind, id } — 해제(플러그인 비활성 시)
// 토픽(공지 = 에디터 → 확장):
//   "editor.ext.ready"      payload: {}           — 에디터 활성(늦게 켜진 확장이 재등록하는 신호)
//
// 형식만 정의 — 실제 적용(CodeMirror 확장/언어 매핑/포매터 호출)은 registry 가 보관하고
// CodeViewer/commands 가 소비한다. 코어가 강제하지 않는 순수 플러그인 간 계약(app.bus 권한 불요).

import type { PluginApi } from "./host";

export interface FormatterReg {
  kind: "formatter";
  id: string;
  extensions: string[]; // 점 없는 확장자(예: ["json"])
  // 직렬화 불가(함수)라 bus 페이로드엔 못 싣는다 → 등록은 핸들 콜백을 ext 레지스트리에 직접 넣는
  // setFormatter API 로 한다(아래). 이 타입은 메타 보관용.
}

export interface LanguageReg {
  kind: "language";
  ext: string; // 점 없는 확장자
  lang: string; // CM6 언어 키(@uiw/codemirror-extensions-langs)
}

export type FormatFn = (
  text: string,
  ctx: { path: string; ext: string },
) => string | Promise<string>;

interface RegisteredFormatter {
  id: string;
  extensions: string[];
  format: FormatFn;
}

// 확장 레지스트리(에디터 플러그인 내부 단일 저장소). 함수/객체 핸들을 들고 있으므로 — soksak 은 단일
// webview(같은 JS 힙)라 app.bus 페이로드로 함수·CM Extension 객체를 그대로 실어 보낼 수 있다.
const formatters = new Map<string, RegisteredFormatter>();
const languages = new Map<string, string>(); // ext → lang
// CM Extension 객체(전역 — languages 미지정이면 모든 파일). id → extension(불투명 — CodeViewer 가 펼침).
const cmExtensions = new Map<string, unknown>();

export function cmExtensionList(): unknown[] {
  return [...cmExtensions.values()];
}

export function formatterForExt(ext: string): RegisteredFormatter | null {
  for (const f of formatters.values()) {
    if (f.extensions.includes(ext)) return f;
  }
  return null;
}

export function languageForExt(ext: string): string | null {
  return languages.get(ext) ?? null;
}

// 확장 레지스트리 변경 구독(CodeViewer 가 열린 에디터 재구성에 사용). 간단 버전 카운터.
let version = 0;
const watchers = new Set<() => void>();
export function onExtChange(cb: () => void): () => void {
  watchers.add(cb);
  return () => watchers.delete(cb);
}
function bump() {
  version++;
  for (const w of watchers) w();
}
export function extVersion(): number {
  return version;
}

// 에디터 플러그인이 activate 에서 1회 설치 — app.bus 로 확장 등록을 받는다.
// 확장 플러그인은 app.bus.emit("editor.ext.register", {...}) 가 아니라, 함수를 실어야 하므로
// app.bus 의 페이로드로 "등록 요청 핸들"을 전달한다(아래 EditorExtApi 형태). 구현 단순화를 위해
// 확장 플러그인은 app.bus.emit 으로 등록 객체를 그대로 보낸다(같은 JS 힙 — soksak 단일 webview).
// CM 확장 플러그인이 ctx.app.editor.modules 없이도 호스트 CM 모듈을 받도록, ready 공지 페이로드에
// 모듈 묶음을 싣는다(자체 번들 금지 — 에디터가 엔진을 소유). 확장 플러그인은 이 modules 로 확장을 만든다.
import * as cmView from "@codemirror/view";
import * as cmState from "@codemirror/state";
import * as cmLanguage from "@codemirror/language";

export function installEditorExtHost(app: PluginApi): () => void {
  const offReg = app.bus.on("editor.ext.register", (payload) => {
    const p = payload as
      | { kind: "formatter"; id: string; extensions: string[]; format: FormatFn }
      | { kind: "language"; ext: string; lang: string }
      | { kind: "cmext"; id: string; extension: unknown }
      | undefined;
    if (!p) return;
    if (p.kind === "formatter" && typeof p.format === "function") {
      formatters.set(p.id, { id: p.id, extensions: p.extensions, format: p.format });
      bump();
    } else if (p.kind === "language") {
      languages.set(p.ext, p.lang);
      bump();
    } else if (p.kind === "cmext") {
      cmExtensions.set(p.id, p.extension);
      bump();
    }
  });
  const offUnreg = app.bus.on("editor.ext.unregister", (payload) => {
    const p = payload as { kind: string; id?: string; ext?: string } | undefined;
    if (!p) return;
    if (p.kind === "formatter" && p.id) {
      formatters.delete(p.id);
      bump();
    } else if (p.kind === "language" && p.ext) {
      languages.delete(p.ext);
      bump();
    } else if (p.kind === "cmext" && p.id) {
      cmExtensions.delete(p.id);
      bump();
    }
  });
  const readyPayload = {
    modules: { view: cmView, state: cmState, language: cmLanguage },
  };
  // 핸드셰이크: 확장 플러그인이 자기 activate 에서 "editor.ext.hello" 를 emit 하면 ready 로 응답한다.
  // dependencies 로 에디터가 *먼저* activate 되므로(전이 종속 먼저), 확장 플러그인은 ready 를 놓친다 —
  // hello→ready 로 순서를 뒤집어 유실 0. 에디터가 늦게 켜진 경우엔 아래 1회 ready 가 커버.
  const offHello = app.bus.on("editor.ext.hello", () => {
    app.bus.emit("editor.ext.ready", readyPayload);
  });
  // 에디터가 확장보다 늦게 켜진 경우 대비 1회 공지(확장이 이미 hello 를 보냈더라도 멱등 재등록).
  app.bus.emit("editor.ext.ready", readyPayload);
  return () => {
    offReg.dispose();
    offUnreg.dispose();
    offHello.dispose();
  };
}
