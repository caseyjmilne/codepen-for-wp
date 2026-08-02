# CodePen for WP

A WordPress plugin that lets you write HTML/CSS/JS in a real code editor
inside the block editor, and display it on the front end as a live,
interactive CodePen embed — while the code itself lives in WordPress, not
in a CodePen account.

## Feasibility notes (read this first)

CodePen does **not** offer an authenticated API for creating, storing, or
fetching pens. There's nothing to put an "API key" into. What it does
provide, for free and without any account, is the **Prefill Embed**: a
documented HTML convention where you place your HTML/CSS/JS directly in
the page markup (inside `<pre data-lang="...">` blocks) and include one
`<script async src="https://public.codepenassets.com/embed/index.js">`.
CodePen's script reads that markup client-side and renders an interactive
editor/preview iframe from it. No data is sent to or stored on CodePen's
servers to make this work — it's rendered fresh from your page every time.

This is actually a better fit for "source of truth lives in WordPress"
than a real API would be: no keys to leak, no rate limits, no dependency
on a CodePen account existing or staying active.

References:
- https://blog.codepen.io/documentation/prefill-embeds/
- https://blog.codepen.io/documentation/prefill/

## What's here (v0.1.0 draft)

- **Settings page** (Settings → CodePen for WP): site-wide defaults for
  embed theme, height, default open tab, and whether the live preview is
  editable by visitors. Every block can override these individually.
- **"CodePen Snippet" block**: three code fields (HTML/CSS/JS) backed by
  WordPress' own bundled CodeMirror editor (the same one Core's Custom
  HTML block uses) for proper syntax highlighting and indentation, plus
  an Inspector panel for per-block title/theme/height/tab/editable
  overrides.
- **Dynamic (server-side) rendering**: the block outputs the Prefill
  Embed markup from the stored attributes at render time, so changing the
  embed markup logic later doesn't require re-saving every post.

## Not yet built (roadmap)

- Preprocessor support (SCSS/Sass, TypeScript/Babel) — CodePen's prefill
  format supports these; the block currently always sends plain HTML/CSS/JS.
- Lazy-loading (click-to-load) embeds for pages with many snippets.
- A live in-editor preview pane (currently the preview only renders on
  the front end / block preview, not inline while typing).

## Local install

Copy/symlink this directory into `wp-content/plugins/codepen-for-wp` and
activate it from the Plugins screen. No build step or npm install is
required — the editor script is plain ES5 loaded directly by WordPress.
