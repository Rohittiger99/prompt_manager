# Changelog

All notable changes to OmniPrompt will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- Compare across AIs (Pro): Send a prompt to up to 6 AI composers simultaneously (ChatGPT, Claude, Gemini, Copilot, Perplexity, DeepSeek, Grok, Mistral, Meta AI, Qwen, Kimi, Poe) in tiled side-by-side windows or background tabs, with zero transcript scraping.
- Smart templates (Pro): Conditionals (`{{#if}}...{{#else}}...{{/if}}`), date arithmetic (`{{date+7d}}`, `{{date-2w}}`, `{{date+1m}}`, `{{date+1y}}` with month-end and leap-year clamping), required fields (`{{field!}}`), and repeatable blocks (`{{#repeat item}}...{{/repeat}}`).
- Custom right-click modifiers (Pro): User-defined context-menu modifiers (up to 30) with customizable placement (`quote`, `fence`, `after`, `before`).
- Site rules (Pro): Domain-based prompt ranking (exact and `*.` wildcard) creating a "For this site" group and search boost, capped at 50 rules, with one-click presets and Option B permission banners.
- Cloud folder sync setup: Clear setup instructions for OneDrive, Google Drive, Dropbox, and iCloud Drive desktop folders, with privacy disclosure.
- Permissions Option B: Curated static list of 127 verified AI chat domains, eliminating broad `<all_urls>` permission warnings on install.
- Optional `<all_urls>` permission: "Use OmniPrompt on every website" toggle in Settings and Welcome page.
- On-demand injection: `activeTab` permission enables `Ctrl+Shift+K` and right-click context menu modifiers to work immediately on any page.
- Per-site dynamic enablement: "Turn on for this site" banner in toolbar popup for uncovered websites, plus custom website link input in Settings.
- View and copy version history for Free users (one-click restore remains Pro).
- Remote code regression test asserting packaged files contain no remote scripts, stylesheets, fonts, iframes, eval, or dynamic imports.

### Changed
- Free/Pro split: Folders, tags, bulk edit, tidy-up, and remembered short answers moved to the Free tier.
- Pro tier focused on power workflows: 20-custom-prompt cap, client workspaces, saved value sets, stepped chains, folder sync, one-click version restore, and context blocks.
- Shipped price confirmed as $25 final lifetime license.
- Workspaces, chains, and all forms: inline validation with `aria-invalid`/`.field-error`, unsaved-changes warnings on navigation, required-field markers (`*`), and instant error clearing on input. Chain editor gains drag-and-drop + keyboard step reordering, live variable-token preview, and step-count badge. In-page chain runner floats in the shadow root with progress dots and Next/Stop controls.
- Left sidebar redesign: responsive dock mode with shortcut `[` or toggle button, spring micro-animations, active left accent indicators, pulsing local-first privacy status, collapsible Categories/Folders/Tags with rotating chevrons, and custom thin scrollbars.

### Fixed
- IME composition safety: Enter and arrow keys confirming IME composition (Japanese, Chinese, Korean) no longer trigger palette selection, slash menu insertion, or premature form submission.
- Hotkey recorder physical key mapping: records physical key codes (`KeyK`, `Digit1`) so macOS Option+K and AltGr combinations display as clean shortcut labels instead of dead keys or special characters.
- Keyboard shortcut labels on macOS: displays Mac glyphs (`⌥K`, `⌃⇧K`, `⌘↵`) across all UI surfaces.
- Folder sync support message: informs user when `showDirectoryPicker` is disabled in the browser (e.g. Brave).
- Offline test page sandbox detection: reliably detects extension injection via the `#omniprompt-root` shadow host.
- Price labels across options and popup pages are dynamically driven by the store rather than hardcoded in HTML.

### Removed
- Unused dead code: `GROUP_ORDER`, `getCurrentInputValue`, `renderTemplate`, `extractVariables`, `getTriggerChar`, `setTriggerChar`, `rebuild_menus` message handler, `ping` message handler, and unused CSS selector classes.
- Dropped `lib/importers.js` from in-page content scripts and background service worker (kept for popup and options pages).

## [2.0.0] - 2026-09-30

### Added
- Pro tier lifetime license via Dodo Payments ($25 one-time, offline activation).
- Client workspaces with per-client dynamic variables and context blocks (`{{@shortcut}}`).
- Stepped chains for running multi-prompt sequences step by step.
- Saved value sets and remembered short answers.
- Folder sync supporting local folders and cloud drives (Dropbox, OneDrive, iCloud Drive).
- Library tools: nested folders, tag filtering, bulk edit, and tidy-up view.
- Per-prompt version history (up to 20 versions) and 7 automatic local backups.
- SKILL.md import and export format support.
- 136 built-in prompt library across 7 categories.

### Changed
- Complete rewrite (schema v2) separating built-in prompts as immutable code and user deltas.
- Insertion preserves the user's existing draft at cursor position.
- Caret-safe template rendering escaping `$` and regex special tokens.
