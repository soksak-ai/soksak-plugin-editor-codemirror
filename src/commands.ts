// editor.* 명령 — 활성(또는 지정 view) 에디터 뷰어를 대상으로 동작. registry 핸들 경유.
// 매니페스트 contributes.commands 선언과 1:1(선언 외 등록은 코어가 거부). CLI/MCP/소켓 자동 노출.
import type { PluginContext } from "./host";
import { resolveHandle, activeViewId } from "./registry";

export function registerCommands(ctx: PluginContext): void {
  const app = ctx.app;
  if (!app.commands) return;
  const sub = (d: { dispose(): void }) => ctx.subscriptions.push(d);

  sub(
    app.commands.register("ping", {
      description: "Editor plugin load/version check (E2E).",
      triggers: { ko: "에디터 핑 적재확인 버전" },
      returns: "{ ok, version, active }",
      handler: () => ({ ok: true, version: "0.1.0", active: activeViewId() }),
    }),
  );

  sub(
    app.commands.register("save", {
      description:
        "Save the active (or specified) editor file view to disk. No-op if unchanged.",
      triggers: { ko: "저장 파일저장 디스크기록" },
      params: {
        view: { type: "string", description: "View id (default: active)" },
      },
      returns: "{ ok, saved, reason? }",
      handler: async (p) => {
        const h = resolveHandle(p.view as string | undefined);
        if (!h) return { ok: false, error: "no active editor view" };
        const r = await h.save();
        return { ok: true, ...r };
      },
    }),
  );

  sub(
    app.commands.register("find", {
      description:
        "Find text in the active (or specified) editor view; highlights and selects the first match.",
      triggers: { ko: "찾기 검색 하이라이트" },
      params: {
        query: { type: "string", description: "Search text", required: true },
        view: { type: "string", description: "View id (default: active)" },
        caseSensitive: { type: "boolean" },
        regexp: { type: "boolean" },
        wholeWord: { type: "boolean" },
      },
      returns: "{ ok, matches }",
      handler: (p) => {
        const h = resolveHandle(p.view as string | undefined);
        if (!h) return { ok: false, error: "no active editor view" };
        const r = h.find(String(p.query ?? ""), {
          caseSensitive: !!p.caseSensitive,
          regexp: !!p.regexp,
          wholeWord: !!p.wholeWord,
        });
        return { ok: true, ...r };
      },
    }),
  );

  sub(
    app.commands.register("replace", {
      description:
        "Replace text in the active (or specified) editor view. all=false replaces the next match only.",
      triggers: { ko: "바꾸기 치환 교체" },
      params: {
        query: { type: "string", required: true },
        replacement: { type: "string", required: true },
        view: { type: "string" },
        all: { type: "boolean" },
        caseSensitive: { type: "boolean" },
        regexp: { type: "boolean" },
        wholeWord: { type: "boolean" },
      },
      returns: "{ ok, replaced }",
      handler: (p) => {
        const h = resolveHandle(p.view as string | undefined);
        if (!h) return { ok: false, error: "no active editor view" };
        const r = h.replace(
          String(p.query ?? ""),
          String(p.replacement ?? ""),
          {
            all: !!p.all,
            caseSensitive: !!p.caseSensitive,
            regexp: !!p.regexp,
            wholeWord: !!p.wholeWord,
          },
        );
        return { ok: true, ...r };
      },
    }),
  );

  sub(
    app.commands.register("format", {
      description:
        "Format the active (or specified) editor document (requires a registered formatter).",
      triggers: { ko: "서식 포맷 문서정리" },
      params: { view: { type: "string" } },
      returns: "{ ok, formatted, reason? }",
      handler: async (p) => {
        const h = resolveHandle(p.view as string | undefined);
        if (!h) return { ok: false, error: "no active editor view" };
        const r = await h.format();
        return { ok: true, ...r };
      },
    }),
  );
}
