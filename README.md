# soksak-plugin-editor-codemirror

A CodeMirror-based file editor for soksak. Renders code, text, Markdown, and SVG files in a
CodeMirror 6 editor with syntax highlighting, find/replace, and save.

It registers as a soksak **file viewer** (`contributes.fileViewers`). The core
routes any opened file to this plugin's viewer as the fallback (`"*"`), so the
editor owns the editing engine while the core only matches and hosts — see the
skeleton contract (engine neutrality, A13). A media plugin can claim
image/pdf/video/audio by exact extension; the editor handles the rest as text.

## Features

- CodeMirror 6 editor with syntax highlighting (`@uiw/codemirror-extensions-langs`)
- Find / replace widget (⌘F / ⌘⌥F)
- Save to disk (⌘S)
- Markdown and SVG preview toggle
- Large-file guard (syntax highlighting off above 20 MiB)
- Theme follows the host via CSS variables and the `theme.changed` event

## Commands

- `editor.save {view?}` — save the active (or specified) view
- `editor.find {query, view?, caseSensitive?, regexp?, wholeWord?}` — find and highlight
- `editor.replace {query, replacement, view?, all?, ...}` — replace
- `editor.format {view?}` — format (requires a registered formatter)
- `editor.ping` — load/version check

All commands are exposed to the `sok` CLI and MCP.

## Permissions

`ui`, `fs:read`, `fs:write`, `commands`

## Build

```
npm install
npm run build   # → main.js
```
