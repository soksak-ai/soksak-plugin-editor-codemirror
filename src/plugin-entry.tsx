// soksak 에디터 플러그인 엔트리 — loader 가 blob-URL 로 import 하는 단일 ESM(esbuild 번들).
// 파일 뷰어(code/text/markdown/svg)를 app.ui.registerFileViewer 로 등록 → 코어가 파일을 콘텐츠로
// 열 때 매칭(폴백 "*")해 이 provider 를 마운트한다. CodeMirror 는 이 플러그인이 소유(엔진 중립 A13).
import { createRoot, type Root } from "react-dom/client";
import { CodeViewer } from "./CodeViewer";
import { GLOBAL_CSS } from "./styles";
import { registerCommands } from "./commands";
import type { FileViewerContext, PluginContext } from "./host";

const STYLE_ID = "sk-editor-style";

function ensureStyle(): void {
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement("style");
  s.id = STYLE_ID;
  s.textContent = GLOBAL_CSS;
  document.head.appendChild(s);
}

const roots = new WeakMap<HTMLElement, Root>();

function unmountContainer(container: HTMLElement): void {
  const root = roots.get(container);
  if (root) {
    root.unmount();
    roots.delete(container);
  }
  container.replaceChildren();
}

export default {
  activate(ctx: PluginContext) {
    const app = ctx.app;
    ensureStyle();

    if (app.ui?.registerFileViewer) {
      ctx.subscriptions.push(
        app.ui.registerFileViewer("code", {
          mount(container: HTMLElement, fctx: FileViewerContext) {
            ensureStyle();
            unmountContainer(container); // 재마운트 방어(언마운트 누락 대비)
            container.style.position = "relative";
            const host = document.createElement("div");
            host.style.position = "absolute";
            host.style.inset = "0";
            container.appendChild(host);
            const root = createRoot(host);
            root.render(<CodeViewer app={app} ctx={fctx} />);
            roots.set(container, root);
          },
          unmount(container: HTMLElement) {
            unmountContainer(container);
          },
        }),
      );
    }

    registerCommands(ctx);
  },
  deactivate() {
    document.getElementById(STYLE_ID)?.remove();
  },
};
