=== CodePen for WP ===
Contributors: arcwordpress
Tags: codepen, embed, code snippet, block editor, live preview
Requires at least: 6.1
Tested up to: 7.0
Requires PHP: 7.4
Stable tag: 0.1.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Write HTML, CSS and JS in a real code editor and display it as a live CodePen embed, sourced entirely from WordPress.

== Description ==

CodePen for WP adds a Gutenberg block for writing HTML, CSS and JS in a
real code editor — the same CodeMirror-backed editor WordPress' own
Custom HTML block uses — and displaying it on the front end as a live,
interactive [CodePen](https://codepen.io/) embed.

The code itself always lives in WordPress. Nothing is created on, saved
to, or fetched from a CodePen account to make this work.

= Why there's no "API key" =

CodePen doesn't offer an authenticated API for creating or reading pens,
so there's nothing to put an API key into. What it provides instead,
for free and without any account, is a **Prefill Embed**: a documented
convention where your HTML/CSS/JS is placed directly in the page markup
and a small script from CodePen turns it into an interactive
editor/preview. See CodePen's own documentation:
[Prefill Embeds](https://blog.codepen.io/documentation/prefill-embeds/).

= Features =

* A "CodePen Snippet" block with HTML/CSS/JS fields under their own
  tabs, plus a Preview tab that builds a live embed right in the block
  editor from whatever's currently in the other tabs.
* A settings screen (Settings → CodePen for WP) for site-wide defaults:
  theme, height, which pane(s) show by default — check more than one
  (e.g. CSS + Result) for a split view instead of a single tab — and
  whether the embedded preview is editable by visitors. Every block can
  override these individually.
* Changing a block's display settings is remembered and applied to the
  next freshly-inserted block automatically, so you don't have to
  re-pick them every time.
* Dynamic (server-side) rendering: the embed markup is built from the
  stored attributes at render time.

= External services =

This plugin relies on CodePen (a third-party service, not affiliated
with or endorsed by this plugin) to render the interactive embed:

* On any front-end page containing a CodePen Snippet block, and on the
  block editor's Preview tab, a script is loaded from
  `https://public.codepenassets.com/embed/index.js` (CodePen's own
  embed loader).
* That script builds an `<iframe>` whose content comes from CodePen
  (`https://codepen.io/embed/prefill`), submitting only the HTML/CSS/JS
  entered in that specific block so CodePen can render the preview. No
  account, tracking, or analytics data is sent — just the code needed to
  display that one embed.
* This only happens on pages/screens that actually contain a CodePen
  Snippet block; it is not loaded site-wide.

See CodePen's [Terms of Service](https://blog.codepen.io/legal/terms-of-service/)
and [Privacy Policy](https://blog.codepen.io/legal/privacy-policy/).

= Source code =

The block's editor UI is written in JSX/ES modules and compiled with
`@wordpress/scripts`; the compiled, minified output is what ships in
this plugin. Full, human-readable source is available at
https://github.com/caseyjmilne/codepen-for-wp

= Credits =

Bundles a copy of [CodeMirror](https://codemirror.net/5/)'s base
stylesheet (MIT licensed), used only for its CSS — the actual editor
JavaScript is WordPress' own bundled copy. This is needed because the
block editor's canvas renders inside an iframe that doesn't inherit
WordPress' own admin-side CodeMirror stylesheet.

== Installation ==

1. Upload the plugin zip via Plugins → Add New → Upload Plugin, or
   extract it into `wp-content/plugins/`.
2. Activate "CodePen for WP" from the Plugins screen.
3. Optionally visit Settings → CodePen for WP to set site-wide display
   defaults.
4. Add the "CodePen Snippet" block to any post or page.

== Frequently Asked Questions ==

= Do I need a CodePen account or API key? =

No. See "Why there's no API key" above — CodePen has no authenticated
API for this; the plugin uses CodePen's free, keyless Prefill Embed
feature instead.

= Is any of my code sent to or stored by CodePen ahead of time? =

No. The code lives in WordPress. It's only sent to CodePen (via the
visitor's or editor's own browser) at the moment an embed is actually
displayed, to render that specific preview.

= Can I show more than one pane (e.g. code and result side by side)? =

Yes. Both the site-wide settings screen and each block's Inspector
panel let you check more than one pane (HTML/CSS/JS/Result) to show a
split view instead of a single tab.

= What happens if I uninstall the plugin? =

Its own settings option is removed, and its scope is cleared from each
user's remembered block-editor preferences. Content already saved in
posts/pages (the HTML/CSS/JS in existing blocks) is untouched.

== Screenshots ==

1. The "CodePen Snippet" block editor with tabbed HTML/CSS/JS fields.
2. The in-editor live Preview tab.
3. The site-wide settings screen.

== Changelog ==

= 0.1.0 =
* Initial release.

== Upgrade Notice ==

= 0.1.0 =
Initial release.
