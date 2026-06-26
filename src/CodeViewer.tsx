// 코드/텍스트/마크다운/SVG 뷰어 — 코어 FileViewer 포팅(미디어 제외: 이미지/PDF/영상/오디오는
// files 플러그인 몫). CodeMirror 소유(엔진 — 계약 A13). 찾기/바꾸기·저장·구문 강조. dirty 는 ctx.setDirty 로
// 코어 탭에 보고. editor.* 명령은 registry 핸들로 동작.
import {
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { flushSync } from "react-dom";
import CodeMirror, { EditorView } from "@uiw/react-codemirror";
import { syntaxHighlighting, defaultHighlightStyle } from "@codemirror/language";
import { oneDarkHighlightStyle } from "@codemirror/theme-one-dark";
import {
  findNext,
  replaceAll,
  replaceNext,
  search,
  SearchQuery,
  setSearchQuery,
} from "@codemirror/search";
import {
  langNames,
  loadLanguage,
  type LanguageName,
} from "@uiw/codemirror-extensions-langs";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { EditorFind } from "./EditorFind";
import { t as translate } from "./i18n";
import { setHandle, clearHandle, markActive } from "./registry";
import {
  cmExtensionList,
  formatterForExt,
  languageForExt,
  onExtChange,
} from "./ext";
import type { Extension } from "@codemirror/state";
import type { FileViewerContext, PluginApi } from "./host";

type StrategyKind = "text" | "markdown" | "svg";

function fmtBytes(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}GB`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}MB`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}KB`;
  return `${n}B`;
}

function extOf(path: string): string {
  const name = path.split("/").pop() ?? path;
  const dot = name.lastIndexOf(".");
  if (dot <= 0) return "";
  return name.slice(dot + 1).toLowerCase();
}

function strategyFor(path: string): StrategyKind {
  const e = extOf(path);
  if (e === "svg") return "svg";
  if (e === "md" || e === "markdown") return "markdown";
  return "text";
}

const VALID_LANGS = new Set<string>(langNames as string[]);
const LANG_ALIAS: Record<string, string> = { zsh: "bash" };

function languageExtensionFor(path: string) {
  const e = extOf(path);
  // 확장 플러그인의 언어 매핑(ext→CM 키)이 내장 별칭보다 우선(코어 languageFor 선례).
  const key = languageForExt(e) ?? LANG_ALIAS[e] ?? e;
  return VALID_LANGS.has(key) ? loadLanguage(key as LanguageName) : null;
}

// 호스트 CSS 변수 --bg 의 명도로 다크/라이트 추정(초기값). 이후 theme.changed 로 갱신.
function detectDark(): boolean {
  try {
    const bg = getComputedStyle(document.documentElement)
      .getPropertyValue("--bg")
      .trim();
    const m = bg.match(/(\d+)[,\s]+(\d+)[,\s]+(\d+)/);
    if (m) {
      const lum = 0.299 * +m[1] + 0.587 * +m[2] + 0.114 * +m[3];
      return lum < 128;
    }
    if (/^#([0-9a-f]{6})$/i.test(bg)) {
      const r = parseInt(bg.slice(1, 3), 16);
      const g = parseInt(bg.slice(3, 5), 16);
      const b = parseInt(bg.slice(5, 7), 16);
      return 0.299 * r + 0.587 * g + 0.114 * b < 128;
    }
  } catch {
    /* 무시 — 기본 다크 */
  }
  return true;
}

// 에디터 프레임(배경·전경·거터·커서·선택)을 호스트 CSS 변수로 칠한다. @uiw theme="none" 이라 경쟁 테마가
// 없어 이 값이 그대로 적용되고, var(--bg) 등은 호스트가 테마를 바꾸는 *같은 브라우저 페인트*에 따라온다
// (원자적 — 크롬과 동시 전환). 구문 토큰색만 isDark 기반 HighlightStyle 로 따로 주는데(한 프레임 늦을 수
// 있으나 작은 글자색이라 비가시), 배경은 여기서 변수로 고정돼 토글이 통째로 늦는 "순차/허접" 이 사라진다.
// 안정 모듈 상수(재구성 무관) — isDark 에 의존하지 않아 테마 전환 시 reconfigure 를 유발하지 않는다.
const cssVarTheme = EditorView.theme({
  "&": { backgroundColor: "var(--bg)", color: "var(--fg)" },
  ".cm-content": { caretColor: "var(--fg)" },
  ".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--fg)" },
  ".cm-gutters": {
    backgroundColor: "var(--bg)",
    color: "var(--fg3)",
    border: "none",
  },
  ".cm-activeLine": { backgroundColor: "var(--card)" },
  ".cm-activeLineGutter": { backgroundColor: "var(--card)" },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection": {
    backgroundColor: "var(--accbg)",
  },
  ".cm-foldPlaceholder": {
    backgroundColor: "var(--card)",
    color: "var(--fg3)",
    border: "1px solid var(--bd)",
  },
  ".cm-panels": { backgroundColor: "var(--card)", color: "var(--fg)" },
});

export function CodeViewer({
  app,
  ctx,
}: {
  app: PluginApi;
  ctx: FileViewerContext;
}) {
  const { path, viewId } = ctx;
  const [lang, setLang] = useState(() => app.locale());
  const [isDark, setIsDark] = useState(detectDark);
  const t = useCallback(
    (key: string, params?: Record<string, string | number>) =>
      translate(key, lang, params),
    [lang],
  );

  // 호스트 테마/언어 추종. 배경/프레임은 cssVarTheme(변수)로 칠해 호스트가 색을 바꾸는 같은 페인트에
  // 원자적으로 따라오므로 isDark 타이밍과 무관하다. isDark 는 *구문 토큰색*(다크=oneDark/라이트=default
  // HighlightStyle)만 가른다. theme.changed 는 코어가 동기 발행하므로 flushSync 로 토큰 재색을 같은
  // 스택에서 처리해 한 프레임이라도 덜 늦춘다(토큰색 지연은 작은 글자라 비가시이나 굳이 미루지 않는다).
  useEffect(() => {
    const offTheme = app.events.on("theme.changed", (p) => {
      const mode = (p as { mode?: string })?.mode;
      if (mode === "dark" || mode === "light") {
        flushSync(() => setIsDark(mode === "dark"));
      }
    });
    const offLocale = app.events.on("locale.changed", (p) => {
      const l = (p as { language?: string })?.language;
      if (typeof l === "string") setLang(l);
    });
    return () => {
      offTheme.dispose();
      offLocale.dispose();
    };
  }, [app]);

  const strat = strategyFor(path);
  const previewable = strat === "markdown" || strat === "svg";
  const [mode, setMode] = useState<"code" | "preview">("code");

  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<{ total: number; truncated: boolean } | null>(
    null,
  );
  const savedRef = useRef<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [cmView, setCmView] = useState<EditorView | null>(null);
  const [findOpen, setFindOpen] = useState(false);
  const [findReplace, setFindReplace] = useState(false);
  const [findFocus, setFindFocus] = useState(0);

  // 파일 읽기(텍스트). 바이너리(읽기 실패)는 unsupported 메시지 — 미디어는 files 플러그인 몫.
  useEffect(() => {
    let cancelled = false;
    setText(null);
    setError(null);
    setInfo(null);
    const read = app.fs?.readText;
    if (!read) {
      setError("fs:read 권한 없음");
      return;
    }
    read(path)
      .then((d) => {
        if (cancelled) return;
        setText(d.text);
        savedRef.current = d.text;
        ctx.setDirty(false);
        setInfo({ total: d.totalBytes, truncated: d.truncated });
      })
      .catch((e) => {
        if (!cancelled) setError(String(e));
      });
    return () => {
      cancelled = true;
    };
  }, [app, path, ctx]);

  // 20MiB 초과면 구문 강조/폴딩 끈다(대용량 보호).
  const isLarge = info != null && info.total > 20 * 1024 * 1024;

  const svgUrl = useMemo(
    () =>
      strat === "svg" && text != null
        ? `data:image/svg+xml;utf8,${encodeURIComponent(text)}`
        : null,
    [strat, text],
  );

  // 확장 레지스트리(언어/포매터) 변경 신호 — 늦게 켜진 언어 플러그인이 열린 에디터에 반영되도록.
  const [extVer, setExtVer] = useState(0);
  useEffect(() => onExtChange(() => setExtVer((n) => n + 1)), []);

  const cmExtensions = useMemo(() => {
    const exts: Extension[] = [search()];
    if (!isLarge) {
      const ext = languageExtensionFor(path);
      if (ext) exts.push(ext);
      // 확장 플러그인이 등록한 전역 CM 확장(TODO 강조 등) — 큰 파일 보호 기준은 언어와 동일.
      exts.push(...(cmExtensionList() as Extension[]));
    }
    // 배경/프레임은 변수 테마(원자적), 구문 토큰색은 모드별 HighlightStyle(다크=oneDark, 라이트=default).
    exts.push(cssVarTheme);
    exts.push(
      syntaxHighlighting(isDark ? oneDarkHighlightStyle : defaultHighlightStyle),
    );
    return exts;
    // extVer: 언어/확장 등록/해제 신호(값 자체는 미사용).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, isLarge, extVer, isDark]);

  const markdownHtml = useMemo(() => {
    if (strat !== "markdown" || text == null) return "";
    const raw = marked.parse(text, { async: false }) as string;
    return DOMPurify.sanitize(raw);
  }, [strat, text]);

  const editable = info != null && !info.truncated;

  const onChange = useCallback(
    (v: string) => {
      setText(v);
      ctx.setDirty(v !== savedRef.current);
    },
    [ctx],
  );

  const save = useCallback(async (): Promise<{
    saved: boolean;
    reason?: string;
  }> => {
    if (!editable) return { saved: false, reason: "read-only" };
    if (text == null || saving) return { saved: false, reason: "not ready" };
    if (text === savedRef.current) return { saved: true, reason: "no change" };
    const write = app.fs?.writeText;
    if (!write) return { saved: false, reason: "fs:write 권한 없음" };
    setSaving(true);
    setSaveError(null);
    try {
      await write(path, text);
      savedRef.current = text;
      ctx.setDirty(false);
      return { saved: true };
    } catch (e) {
      setSaveError(String(e));
      return { saved: false, reason: String(e) };
    } finally {
      setSaving(false);
    }
  }, [editable, text, saving, app, path, ctx]);

  // editor.* 명령 브리지(최신 함수를 ref 로 노출 — registry 등록은 viewId 당 1회).
  const saveRef = useRef(save);
  saveRef.current = save;
  const cmViewRef = useRef<EditorView | null>(null);
  cmViewRef.current = cmView;
  const editableRef = useRef(editable);
  editableRef.current = editable;
  const textRef = useRef<string | null>(null);
  textRef.current = text;

  useEffect(() => {
    setHandle(viewId, {
      path,
      save: () => saveRef.current(),
      getText: () => textRef.current,
      setText: (next) => {
        const v = cmViewRef.current;
        if (!v || !editableRef.current) return false;
        v.dispatch({
          changes: { from: 0, to: v.state.doc.length, insert: next },
        });
        return true;
      },
      openFind: (replace) => {
        setFindReplace(replace);
        setFindOpen(true);
        setFindFocus((n) => n + 1);
      },
      format: async () => {
        const v = cmViewRef.current;
        if (!v || !editableRef.current) {
          return { formatted: false, reason: "read-only" };
        }
        const ext = extOf(path);
        const fmt = formatterForExt(ext);
        if (!fmt) return { formatted: false, reason: `no formatter: ${ext}` };
        const cur = textRef.current ?? "";
        const out = await fmt.format(cur, { path, ext });
        if (typeof out !== "string") {
          return { formatted: false, reason: "formatter returned non-string" };
        }
        if (out === cur) return { formatted: true };
        v.dispatch({
          changes: { from: 0, to: v.state.doc.length, insert: out },
        });
        return { formatted: true };
      },
      find: (query, opts) => {
        const v = cmViewRef.current;
        if (!v) return { matches: 0 };
        const q = new SearchQuery({
          search: query,
          caseSensitive: opts.caseSensitive ?? false,
          regexp: opts.regexp ?? false,
          wholeWord: opts.wholeWord ?? false,
        });
        v.dispatch({ effects: setSearchQuery.of(q) });
        let matches = 0;
        const it = q.getCursor(v.state);
        while (!it.next().done) matches++;
        if (matches > 0) findNext(v);
        return { matches };
      },
      replace: (query, replacement, opts) => {
        const v = cmViewRef.current;
        if (!v || !editableRef.current) return { replaced: 0 };
        const q = new SearchQuery({
          search: query,
          replace: replacement,
          caseSensitive: opts.caseSensitive ?? false,
          regexp: opts.regexp ?? false,
          wholeWord: opts.wholeWord ?? false,
        });
        v.dispatch({ effects: setSearchQuery.of(q) });
        let matches = 0;
        const it = q.getCursor(v.state);
        while (!it.next().done) matches++;
        if (matches === 0) return { replaced: 0 };
        if (opts.all) {
          replaceAll(v);
          return { replaced: matches };
        }
        findNext(v);
        replaceNext(v);
        return { replaced: 1 };
      },
    });
    return () => clearHandle(viewId);
  }, [viewId, path]);

  const onKeyDown = useCallback(
    (e: ReactKeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.code === "KeyS") {
        e.preventDefault();
        void save();
      } else if (mod && e.code === "KeyF" && !e.altKey) {
        e.preventDefault();
        setFindReplace(false);
        setFindOpen(true);
        setFindFocus((n) => n + 1);
      } else if (mod && ((e.code === "KeyF" && e.altKey) || e.code === "KeyH")) {
        e.preventDefault();
        setFindReplace(true);
        setFindOpen(true);
        setFindFocus((n) => n + 1);
      }
    },
    [save],
  );

  const dirty = editable && text != null && text !== savedRef.current;

  const codeBody = (): ReactNode => {
    if (error) {
      return (
        <div className="sk-ed-msg">
          {t("unsupported")}
          <br />
          <span className="sk-ed-msg-sub">{error}</span>
        </div>
      );
    }
    if (text == null) return <div className="sk-ed-msg">{t("loading")}</div>;
    return (
      <div
        className="sk-ed-code"
        onKeyDownCapture={onKeyDown}
        onFocusCapture={() => markActive(viewId)}
      >
        <EditorFind
          view={cmView}
          open={findOpen}
          replaceMode={findReplace}
          editable={editable}
          focusSignal={findFocus}
          onClose={() => setFindOpen(false)}
          t={t}
        />
        {(info && (isLarge || info.truncated)) || saveError || dirty ? (
          <div className="sk-ed-banner">
            {isLarge && t("largeFile", { size: fmtBytes(info!.total) })}
            {info?.truncated &&
              `${isLarge ? " · " : ""}${t("truncated", { read: fmtBytes(text.length) })}`}
            {saveError && (
              <span className="sk-ed-banner-err">
                {(isLarge || info?.truncated ? " · " : "") +
                  t("saveFailed", { err: saveError })}
              </span>
            )}
            {dirty && !saveError && (
              <span className="sk-ed-banner-dirty">
                {(isLarge || info?.truncated ? " · " : "") +
                  (saving ? t("saving") : t("unsaved"))}
              </span>
            )}
          </div>
        ) : null}
        <CodeMirror
          className="sk-ed-cm"
          value={text}
          height="100%"
          theme="none"
          extensions={cmExtensions}
          editable={editable}
          onChange={editable ? onChange : undefined}
          onCreateEditor={(v) => setCmView(v)}
          basicSetup={{
            lineNumbers: true,
            foldGutter: !isLarge,
            highlightActiveLine: editable,
            highlightActiveLineGutter: editable,
            searchKeymap: false,
          }}
        />
      </div>
    );
  };

  const body = (): ReactNode => {
    if (strat === "svg") {
      if (mode !== "preview") return codeBody();
      return svgUrl ? (
        <div className="sk-ed-image-wrap">
          <img className="sk-ed-image" src={svgUrl} alt="" />
        </div>
      ) : (
        <div className="sk-ed-msg">{t("loading")}</div>
      );
    }
    if (strat === "markdown") {
      return mode === "preview" ? (
        <div
          className="sk-ed-markdown"
          dangerouslySetInnerHTML={{ __html: markdownHtml }}
        />
      ) : (
        codeBody()
      );
    }
    return codeBody();
  };

  return (
    <div className="sk-ed">
      {previewable && (
        <div className="sk-ed-toolbar">
          <div className="sk-ed-modes">
            <button
              type="button"
              data-node="mode-code"
              className={`sk-ed-mode${mode === "code" ? " active" : ""}`}
              onClick={() => setMode("code")}
            >
              {t("code")}
            </button>
            <button
              type="button"
              data-node="mode-preview"
              className={`sk-ed-mode${mode === "preview" ? " active" : ""}`}
              onClick={() => setMode("preview")}
            >
              {t("preview")}
            </button>
          </div>
        </div>
      )}
      <div className="sk-ed-body">{body()}</div>
    </div>
  );
}
