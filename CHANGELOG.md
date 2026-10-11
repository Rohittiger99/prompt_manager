# Changelog

All notable changes to OmniPrompt will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Changed
- Backup and sync are now on one page, **Backup & sync**: sync, restore points, export, import and reset. The Chrome profile and folder sync options moved there from Settings.
- Automatic backups are called restore points. The export page no longer has the "include built-ins" tick box; built-ins ship with the extension.
- Restoring an earlier version of a prompt is free. It is your own data, and restoring a whole backup was already free.
- The Plan page is shorter: your own usage at the top, a Free card and a Pro card with one button, the licence key tucked away, four short answers about paying, and the full comparison behind one click. On Pro it lists what is unlocked, with a link into each part.
- The upgrade dialog lists three benefits, led by the one you reached for, and links to the full list.

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
- Version history with one-click restore is free for everyone.
- Remote code regression test asserting packaged files contain no remote scripts, stylesheets, fonts, iframes, eval, or dynamic imports.

### Fixed
- Custom categories, custom modifiers and site rules could be wiped when another tab or the popup changed storage, then saved back as empty. Every surface now reloads the full set of keys.
- Custom modifiers and site rules now travel with Chrome sync and folder sync, and deleting one on a computer removes it on the others. Importing a backup no longer lets an old deletion record remove a restored workspace, chain, modifier or rule.
- Compare across AIs from the in-page form did nothing. It now opens the AIs, waits up to 30 seconds for each chat box, checks the text arrived before sending, copies it to the clipboard when it cannot, and shows a summary in the tab that started the run, such as "inserted in 2 of 3".
- Compare windows open on the screen you started from and are never narrower than 520 pixels.
- The chain runner always said "Click inside a text box" because it called an adapter function that does not exist.
- The Site rules permission banner and its "Turn on for this site" button threw an error. Presets now use hosts that match the real apps (app.slack.com, *.notion.so, outlook.office.com).
- Alt+C (compare) in the palette did nothing on macOS, where Option+C types "ç".
- Compare across AIs still did nothing with Pro active. "Run comparison" inserted into the current page instead of opening the AIs, the target picker failed to draw (it read the remembered targets as a list when they arrive later), the palette's Compare… opened a plain form, and the library page's Compare dialog never opened. The library dialog now expands context blocks and lets you edit the text, so blanks can be filled before starting. Kimi opens kimi.com and Meta AI opens www.meta.ai, the pages the chat-box finder knows. Chain steps no longer show Compare.
- Compare now opens new tabs in the current window by default. Tiled windows are still one click away in the same dialog.
- Dates from {{date}} and {{date+7d}} are now YYYY-MM-DD, as documented, instead of a locale format where 10/8 can mean October or August.

### Improved
- Keyboard: Tab stays inside the palette, the fill-in form and every dialog on the library page; focus returns to the button that opened a dialog; Esc closes the Compare dialog.
- The library page supports the browser's Back and Forward buttons between views, and a reload keeps the current view.
- Library search waits for a pause in typing before redrawing, so large libraries stay responsive.
- The popup asks for confirmation in its own dialog. A native confirm could close the popup and lose the answer.
- macOS key names (⌘S, ⌘↵, ⌥C, ⌘V) where the page used Ctrl or Alt.
- Windows High Contrast mode keeps focus rings and panel edges visible. Muted text in the light theme now meets WCAG AA contrast.
- Long messages stay on screen long enough to read. The fill-in form fits narrow windows.
- The Opera add-ons store is excluded like the Chrome and Edge stores. The manifest declares Chrome 111 as the minimum, the first version with every CSS feature the pages use.

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
