// soksak-plugin-editor 번들 빌드 — esbuild 단일 ESM main.js(loader 가 blob-URL 로 import).
// React + CodeMirror(@uiw/react-codemirror·@codemirror/*) + marked + dompurify 를 모두 인라인 번들.
// 전역 CSS 는 소스 문자열 상수(src/styles.ts)로 들고 plugin-entry 가 Shadow DOM <style> 로 주입.
import { build, context } from "esbuild";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(root, "src");
// 버전 단일진실 = plugin.json. 엔트리에는 __PLUGIN_VERSION__ 으로 주입(하드코딩 드리프트 금지).
const manifest = JSON.parse(readFileSync(path.resolve(root, "plugin.json"), "utf8"));

const opts = {
  entryPoints: ["src/plugin-entry.tsx"],
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  jsx: "automatic",
  alias: { "@": SRC },
  define: {
    "process.env.NODE_ENV": '"production"',
    "import.meta.env.DEV": "false",
    __PLUGIN_VERSION__: JSON.stringify(manifest.version),
  },
  outfile: "main.js",
  minify: false,
  legalComments: "none",
  logLevel: "info",
};

if (process.argv.includes("--watch")) {
  const ctx = await context(opts);
  await ctx.watch();
  console.log("[editor-codemirror] watching src → main.js …");
} else {
  await build(opts);
  console.log("[editor-codemirror] built main.js");
}
