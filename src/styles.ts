// 에디터 뷰어 전역 CSS — 단일 <style> 로 1회 주입(plugin-entry). 전부 .sk-ed 하위로 스코프해
// 호스트 chrome 오염 방지. 색은 호스트 CSS 변수 상속(계약 A10/S6) — 테마 재색칠이 그대로 반영.

export const GLOBAL_CSS = `
.sk-ed {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  background: var(--bg, #1e1e1e);
  color: var(--fg, #ddd);
  font: 13px var(--app-font, system-ui, sans-serif);
  overflow: hidden;
}
.sk-ed-toolbar {
  flex: none;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  border-bottom: 1px solid var(--bd, #333);
  background: var(--card, #252526);
}
.sk-ed-modes { display: flex; gap: 2px; }
.sk-ed-mode {
  padding: 3px 10px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--fg2, #aaa);
  font: inherit;
  cursor: pointer;
}
.sk-ed-mode.active { background: var(--inset, #333); color: var(--fg, #eee); }
.sk-ed-body { flex: 1; position: relative; overflow: hidden; min-height: 0; }
.sk-ed-code { position: absolute; inset: 0; display: flex; flex-direction: column; }
.sk-ed-cm { flex: 1; min-height: 0; overflow: auto; }
.sk-ed-cm .cm-editor { height: 100%; }
.sk-ed-msg {
  padding: 16px;
  color: var(--fg2, #aaa);
  font-size: 13px;
  text-align: center;
}
.sk-ed-msg-sub { color: var(--fg3, #777); font-size: 12px; }
.sk-ed-banner {
  flex: none;
  padding: 3px 10px;
  font-size: 12px;
  color: var(--fg2, #bbb);
  background: var(--inset, #2d2d2d);
  border-bottom: 1px solid var(--bd, #333);
}
.sk-ed-banner-err { color: var(--danger, #f47); }
.sk-ed-banner-dirty { color: var(--acc, #6cf); }
.sk-ed-markdown {
  position: absolute;
  inset: 0;
  overflow: auto;
  padding: 20px 28px;
  line-height: 1.6;
}
.sk-ed-markdown pre {
  background: var(--inset, #2d2d2d);
  padding: 10px 12px;
  border-radius: 6px;
  overflow: auto;
}
.sk-ed-markdown code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
.sk-ed-image-wrap, .sk-ed-media-wrap {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: auto;
  padding: 16px;
}
.sk-ed-image { max-width: 100%; max-height: 100%; object-fit: contain; }
.sk-ed-embed, .sk-ed-media { width: 100%; height: 100%; border: 0; }

/* VSCode 스타일 찾기/바꾸기 위젯 */
.cm-find {
  position: absolute;
  top: 6px;
  right: 16px;
  z-index: 5;
  display: flex;
  gap: 4px;
  padding: 4px 6px;
  background: var(--card, #252526);
  border: 1px solid var(--bd, #444);
  border-radius: 6px;
  box-shadow: var(--shadow, 0 2px 8px rgba(0,0,0,0.4));
}
.cmf-chevron {
  border: none; background: transparent; color: var(--fg2, #aaa);
  cursor: pointer; padding: 0 2px;
}
.cmf-rows { display: flex; flex-direction: column; gap: 4px; }
.cmf-row { display: flex; align-items: center; gap: 4px; }
.cmf-field {
  display: flex; align-items: center;
  background: var(--bg, #1e1e1e);
  border: 1px solid var(--bd, #444);
  border-radius: 4px;
  padding: 0 4px;
}
.cmf-field.error { border-color: var(--danger, #f47); }
.cmf-input {
  background: transparent; border: none; outline: none;
  color: var(--fg, #eee); font: inherit; width: 160px; padding: 3px 2px;
}
.cmf-opts { display: flex; gap: 1px; }
.cmf-opt {
  border: none; background: transparent; color: var(--fg3, #888);
  cursor: pointer; border-radius: 3px; padding: 1px 4px; font-size: 11px;
}
.cmf-opt.on { background: var(--acc, #06c); color: #fff; }
.cmf-count { color: var(--fg3, #888); font-size: 12px; min-width: 64px; }
.cmf-btn, .icon-btn {
  border: none; background: transparent; color: var(--fg2, #bbb);
  cursor: pointer; border-radius: 4px; padding: 2px 6px; font-size: 13px;
}
.cmf-btn:hover, .icon-btn:hover { background: var(--inset, #333); }
`;
