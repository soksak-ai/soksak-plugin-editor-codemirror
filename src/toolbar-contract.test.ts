// 툴바 행 계약(코어 PLUGIN-CONTRACT §Toolbar row) — 존재하면 테마 토큰 소비, 치수 재창조 금지.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { GLOBAL_CSS } from "./styles.ts";

describe("toolbar row contract", () => {
  it("sk-ed-toolbar consumes the theme toolbar tokens", () => {
    const bar = GLOBAL_CSS.match(/\.sk-ed-toolbar \{[^}]*\}/)?.[0] ?? "";
    assert.match(bar, /height:\s*var\(--toolbar-h/);
    assert.match(bar, /padding:\s*0 var\(--toolbar-pad-x/);
  });

  it("본문 폰트는 §Zoom 범용 변수(--view-font-size)를 소비한다", () => {
    const ed = GLOBAL_CSS.match(/\.sk-ed \{[^}]*\}/)?.[0] ?? "";
    assert.match(ed, /font:\s*var\(--view-font-size, 13px\)/);
  });
});
