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
- **"CodePen Snippet" block**: HTML/CSS/JS fields, each under its own tab
  (plus a Preview tab) so only one is visible at a time, backed by
  WordPress' own bundled CodeMirror editor (the same one Core's Custom
  HTML block uses) for proper syntax highlighting and indentation. An
  Inspector panel covers per-block title/theme/height/tab(s)/editable
  overrides. Switching tabs doesn't lose your place — each editor stays
  mounted (just hidden) so cursor position, scroll, and undo history
  survive.
- **In-editor live preview**: the Preview tab builds a real CodePen
  embed right there in the block editor, from whatever HTML/CSS/JS is
  currently in the other tabs — the same Prefill Embed mechanism used on
  the front end, so nothing is sent to or stored on CodePen's servers to
  show it. It's rebuilt fresh each time you open the tab or press
  "Refresh Preview" (CodePen doesn't offer a way to update an embed in
  place, only to convert a prepared element into a new one).
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

## Releases

Pushing a tag like `v1.0.0` triggers `.github/workflows/release.yml`,
which builds the block, runs `npm run plugin-zip`, and attaches the
resulting `codepen-for-wp.zip` to a new GitHub Release for that tag.
That zip contains only the runtime files a site needs (`build/`,
`includes/`, `codepen-for-wp.php`, `uninstall.php`, `README.md`,
`readme.txt`) under a single `codepen-for-wp/` folder — no `src/`,
`node_modules/`, or dev tooling — so it can be extracted straight into
`wp-content/plugins/`, or uploaded as-is via Plugins → Add New → Upload
Plugin.

## Before submitting to WordPress.org

`readme.txt` follows the [wp.org readme
standard](https://developer.wordpress.org/plugins/wordpress-org/how-your-readme-txt-works/)
and `uninstall.php` cleans up the plugin's stored option and its own
scope from remembered editor preferences. Still outstanding before an
actual directory submission:

- **Plugin name/slug — known risk, kept as-is by choice.** WordPress.org's
  [naming
  guidelines](https://make.wordpress.org/plugins/2015/10/05/guidelines-for-plugins-that-include-company-andor-product-names-in-the-plugin-name/)
  explicitly reject third-party plugin names/slugs that *start* with a
  trademarked product name — "CodePen for WordPress" is their literal
  example of a **rejected** name, which is what "CodePen for WP" and the
  `codepen-for-wp` slug both do. The accepted pattern for unaffiliated
  plugins is "Feature Name for CodePen" (e.g. "Snippet Embeds for
  CodePen"). Decision: keep the current name for now and accept the risk
  of a rename request during wp.org review, rather than rename
  preemptively. If that changes, a rename touches the plugin header,
  folder/slug, `package.json` name (drives the release zip filename), the
  block namespace (`codepen-for-wp/snippet`), text domain, and this
  readme.
- `readme.txt`'s `Contributors:` field has a placeholder
  (`yourwporgusername`) — replace with a real wordpress.org username
  before submitting (required for SVN commit access).
- No `screenshot-*.png` assets exist yet. On wp.org these live in the
  plugin's `/assets/` SVN directory (not inside the plugin zip itself)
  and should be added once the UI/branding is final.
- Consider whether `0.1.0` is the version to actually launch at, or
  whether to bump `Stable tag` (readme.txt) and `Version`
  (codepen-for-wp.php) together first — they must always match.

## Local install

1. Copy/symlink this directory into `wp-content/plugins/codepen-for-wp`.
2. Run `npm install && npm run build` inside it (see above).
3. Activate "CodePen for WP" from the Plugins screen.
