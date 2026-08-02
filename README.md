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
  embed theme, height, which pane(s) show by default (check more than one,
  e.g. CSS + Result, for a split view instead of a single tab), and whether
  the live preview is editable by visitors. Every block can override these
  individually.
- **"CodePen Snippet" block**: three code fields (HTML/CSS/JS) backed by
  WordPress' own bundled CodeMirror editor (the same one Core's Custom
  HTML block uses) for proper syntax highlighting and indentation, plus
  an Inspector panel for per-block title/theme/height/tab(s)/editable
  overrides.
- **Remembered block settings**: changing theme/height/tabs/editable on
  any block (via `@wordpress/preferences`, persisted server-side to the
  current user's meta) is recalled automatically the next time you drop
  in a fresh CodePen Snippet block — you don't have to re-pick them every
  time. Content fields (title/HTML/CSS/JS) are obviously never shared
  between blocks.
- **Dynamic (server-side) rendering**: the block outputs the Prefill
  Embed markup from the stored attributes at render time, so changing the
  embed markup logic later doesn't require re-saving every post.

## Not yet built (roadmap)

- Preprocessor support (SCSS/Sass, TypeScript/Babel) — CodePen's prefill
  format supports these; the block currently always sends plain HTML/CSS/JS.
- Lazy-loading (click-to-load) embeds for pages with many snippets.
- A live in-editor preview pane (currently the preview only renders on
  the front end / block preview, not inline while typing).

## Building the block

The block's editor JS/CSS live in `src/codepen-snippet` and are compiled
with `@wordpress/scripts` (the same tool `@wordpress/create-block` uses).
`build/` is git-ignored — you need to generate it before activating:

```
npm install
npm run build
```

Other useful scripts:
- `npm start` — rebuilds on file changes while you work on the block.
- `npm run plugin-zip` — builds and packages the whole plugin into a zip.

If the plugin is activated without a `build/` directory present, it shows
an admin notice telling you to run the build rather than fataling.

## Local install

1. Copy/symlink this directory into `wp-content/plugins/codepen-for-wp`.
2. Run `npm install && npm run build` inside it (see above).
3. Activate "CodePen for WP" from the Plugins screen.
