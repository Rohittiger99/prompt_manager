# OmniPrompt 2.0.0: pre-submission audit and cleanup plan

Date: 2026-09-30. Scope: audit and plan only; no code was changed. Baseline: `node test/verify.js` gives Passed 850, Failed 0 (DODO_MODE note printed).

Line numbers are from the working tree on 2026-09-30 (uncommitted changes on top of `7f38f62`).

## Hard constraints (binding on every later step)

- `node test/verify.js` from the repo root ends with 0 FAIL after every change. Run `node --check` on every shipped .js file.
- Do not change `permissions`, `host_permissions`, optional permissions or `content_scripts[].matches`/`exclude_matches`. Do not add `activeTab` or `clipboardRead`. Permission restructuring is a founder decision; A1 only analyses it.
- `lib/*.js` and `data/*.js` stay strict ES5. No npm, `package.json`, bundler, build step or dependency. Classic scripts only.
- No network calls outside `lib/promptStore.js`. No `eval`, `new Function`, remote code, inline scripts, or `innerHTML` with untrusted text.
- Do not touch `DODO_MODE`, `PRO_PRODUCT_IDS`, `PRO_CHECKOUT_URLS`, `PRO_PRICE` or the Free/Pro split. Do not hard-code prices.
- README keeps: `Alt+K`, `Ctrl+Shift+K`, ``Type `//` ``, `136 built-in prompts`, every permission name, only real `//shortcut`s (more than 50). welcome.html keeps `Alt+K` and `Ctrl+Shift+K`.
- British spelling, plain short sentences, no hype. Every doc claim literally true of the code.
- Do not edit or delete anything in `backups/` or `dist/`. Do not delete `product_research.md` or other docs. Leave no temp files.
- If a shipped script is added, removed or renamed, update every list in `.kiro/steering/structure.md` "Script load order": `manifest.json` content_scripts, `CONTENT_SCRIPTS` and `importScripts` in `background/background.js`, page `<script>` tags, `testSyntax` and `shipped` lists in `test/verify.js`, `LIB_FILES` in `test/harness.js`, and the steering file itself.
- No git commits.

---

## A1. Permissions

### A1.1 Per permission

| Permission | Call sites (file:line) | Needed? | Install warning |
| --- | --- | --- | --- |
| `storage` | `lib/promptStore.js:325,339,353` (local get/set/remove), `:376,390,404` (sync), `:4305` (onChanged); `welcome/welcome.js:72,83,89,220,231,241` | Yes. All persistence. `storage.sync` is only written when the user turns sync on. | None |
| `unlimitedStorage` | No API call; lifts the `chrome.storage.local` quota for everything above | Yes (see A1.3) | None |
| `contextMenus` | `background/background.js:48` (removeAll), `:51,61,72,82,92` (create), `:131` (onClicked) | Yes. Right-click modifiers, "Save selection as a new prompt", "Open prompt library". | None |
| `scripting` | `background/background.js:228-229` `executeScript` in `injectInto`, used by `injectIntoOpenTabs` (install/update, `:247`), the command fallback (`:319`) and `relay_to_active_tab` (`:340`) | Yes. Without it, tabs open at install or update get nothing until reloaded, and the popup/command cannot recover a tab whose script is missing. | None |
| host `<all_urls>` | Needed by `scripting.executeScript` (above); `chrome.tabs.query({url:[...]})` at `background.js:248,359` (URL filters only match tabs the extension can access); `popup/popup.js:1770-1774` reads `tab.url` for the per-site switch. `tabs.sendMessage` needs no host access. | Yes while the product promise is "every text box". | "Read and change all your data on all websites" |
| content_scripts `<all_urls>` | `manifest.json` content_scripts (11 files) | Yes, same promise. Merges into the same warning. | Same warning (not additional) |
| web_accessible_resources `content/content.css` to `<all_urls>` | `content/content.js:66-71` `<link href=chrome.runtime.getURL('content/content.css')>` inside the shadow root | Needed for the current styling method; see A1.4 | None, but a fingerprinting surface |
| `commands` `toggle-command-palette` | `background/background.js:307` | Yes. Browser-level Ctrl+Shift+K / Command+Shift+K. | None |

No other `chrome.*` permission-gated API is used. `chrome.tabs.create`, `tabs.query` (no url filter), `tabs.sendMessage`, `runtime.*`, `action.*` need no permission. `clipboardRead`, `activeTab`, `tabs`, `downloads` are not requested (asserted in `test/verify.js:222-227`).

### A1.2 Question 1: is host `<all_urls>` needed on top of the content_scripts match?

Yes, for the current design. A `content_scripts` match only lets Chrome inject the declared files at page load. `chrome.scripting.executeScript` (`background.js:229`) requires host permission for the tab (from `host_permissions` or `activeTab`). The `tabs.query` URL filters at `background.js:248,359` and `tab.url` in `popup.js:1774` also depend on host access. Removing `host_permissions` while keeping the content script match would break: injection into already-open tabs after install/update, the Ctrl+Shift+K recovery path on a tab without the script, the popup's recovery path, `broadcast_settings` reaching open tabs, and the popup's per-site switch. This follows Chromium's permission model; confirm it in a spike before relying on it for Option B.

Dodo licence fetch: it does not rely on host permission. On 2026-09-30 an `OPTIONS` preflight from `Origin: chrome-extension://…` to both `https://live.dodopayments.com/licenses/activate` and `https://test.dodopayments.com/licenses/activate` returned `200` with `access-control-allow-origin` echoing the extension origin and `POST` allowed. The options page CSP `connect-src` already allows both. So if host permissions were narrowed, `https://live.dodopayments.com/*` would not need to be listed, and listing it would add an install warning for no gain. Risk: this depends on Dodo keeping CORS open for extension origins. If they ever stop, the fix is an optional host permission requested at the moment the user presses Activate, not a required one.

### A1.3 Question 2: is `unlimitedStorage` justified?

Yes. `chrome.storage.local` is capped at 10 MB without it (5 MB before Chrome 114). Nothing in `sanitisePrompt` caps prompt template length. Worst case for a heavy Pro user:

| Item | Assumption | Size |
| --- | --- | --- |
| `omni.userPrompts` | 500 prompts × 1.5 KB average | ~0.75 MB |
| `omni.snapshots` | `SNAPSHOT_LIMIT = 7` full bundles of the above plus workspaces/chains | ~5.5 MB |
| `omni.history` | 100 edited prompts × `HISTORY_LIMIT = 20` × 1.5 KB | ~3 MB |
| `omni.workspaces` | up to 50 × 60 fields × 20,000 chars (`MAX_*` at `promptStore.js:152-158`) | theoretical 60 MB; realistic 0.2 MB |
| `omni.variableSets`, `lastValues`, `usage`, patches | bounded by `MAX_SETS_PER_PROMPT`, `MAX_REMEMBERED_*` | < 0.5 MB |

A realistic heavy library reaches 9-10 MB, and a single long pasted document inside a few prompts pushes it over. Hitting the quota would make `localSet` resolve false and a backup or edit silently fail, which contradicts principle 2. It produces no install warning.

### A1.4 Question 3: `content.css` exposed to every site

Any page can probe `chrome-extension://<fixed id>/content/content.css` and learn the extension is installed. Options:

1. `"use_dynamic_url": true` on the web_accessible_resources entry. Chrome enabled support in Chrome 130 (Chromium Extensions PSA, Oct 2024); earlier versions ignore the key. With it, the resource is only reachable through a per-session random id, and `chrome.runtime.getURL` returns that dynamic URL, so `content.js:69` keeps working unchanged. The early Chrome 130 regressions reported in that thread affected pages loading extension scripts, not stylesheets, but test it manually on ChatGPT, Claude and a strict-CSP page before shipping. MDN documents the key for Firefox and Safari too; Firefox already uses a random per-install UUID. One-line manifest change; no install warning. `test/verify.js:262-270` only checks that content.css is listed, so it still passes.
2. Constructable stylesheet: `new CSSStyleSheet()` + `replaceSync(cssText)` + `shadowRoot.adoptedStyleSheets`, and drop web_accessible_resources entirely. Strongest privacy, and not subject to page CSP. But the CSS would have to live in a JS string, which with no build step means hand-maintaining 21 KB of CSS inside JS. Reading the file with `fetch(getURL(...))` is not an option: it would trip the network-call test and the steering rule.
3. `<style>` element with inline text: same maintenance problem, and page CSP `style-src` can block it.

Recommendation: option 1, decided by the founder together with A1.5 (it is a manifest change). Not part of the behaviour-preserving plan below.

### A1.5 Options for the founder

| | Option A: keep `<all_urls>` | Option B: curated AI hosts + optional "Everywhere mode" |
| --- | --- | --- |
| Install warning | "Read and change all your data on all websites" | "Read and change your data on a number of websites" (lists them) |
| Store review | Broad host access triggers in-depth review; typically slower | Faster, lower scrutiny for the default install |
| Works on day one | Every text box (Gmail, Slack, Jira, Docs) | Only listed AI sites. Elsewhere: Ctrl+Shift+K, right-click, or the popup inject on demand (activeTab); `//` and Alt+K need Everywhere mode or a per-site grant |
| Trust story | Must be argued in text | Matches "never reads your chats" positioning; product_research.md §6 item 4 recommends it |
| Effort | None | M: about 2-3 days code plus a full manual pass |

Option B changes:
- `manifest.json`: `host_permissions` and `content_scripts[0].matches` become the hosts in the `SITES` table (`content/adapters.js:535-680`: chatgpt.com, chat.openai.com, claude.ai, gemini.google.com, aistudio.google.com, perplexity.ai, deepseek.com, copilot.microsoft.com, bing.com, grok.com, x.ai, chat.mistral.ai, poe.com, chat.qwen.ai, tongyi.aliyun.com, kimi.moonshot.cn, kimi.com, meta.ai, huggingface.co, openrouter.ai, lmarena.ai, chat.lmsys.org, phind.com, you.com, t3.chat, each as `https://*.host/*` where subdomains apply). Add `"optional_host_permissions": ["<all_urls>"]` and `"activeTab"`. web_accessible_resources matches can stay `<all_urls>` (they grant nothing) or follow the same list.
- `background/background.js`: on `chrome.permissions.onAdded` with `<all_urls>` call `chrome.scripting.registerContentScripts([{ id: 'omniprompt-everywhere', matches: ['<all_urls>'], excludeMatches: [store pages], js: CONTENT_SCRIPTS, runAt: 'document_idle', persistAcrossSessions: true }])` then `injectIntoOpenTabs()`; on `onRemoved` call `unregisterContentScripts`; on startup reconcile registration with `chrome.permissions.contains`. The command and context-menu paths already call `injectInto`, which activeTab makes work on the current tab.
- `welcome/welcome.html|js` and `options/options.html|js` (Settings): an "Use OmniPrompt in every text box" button that calls `chrome.permissions.request({ origins: ['<all_urls>'] })` from the click (a user gesture is required). Optionally a popup "Turn on for this site" that requests one origin.
- Docs: README, PRIVACY, CHROMEWEBSTORE permission tables and the "works on" text.
- Tests to update: `test/verify.js:222-227` (`activeTab` asserted absent, message says it is redundant beside `<all_urls>`); `:229-230` (`host_permissions` must equal `['<all_urls>']`); `:1541-1545` (README must name every host permission, so the README must list each host); new checks that `optional_host_permissions` contains `<all_urls>`, that the registered script list equals `CONTENT_SCRIPTS`, and that no permission is requested outside a click handler. Steering `tech.md` ("Do not add permissions … activeTab explicitly tested as absent") and `product.md` need the same change.
- Operational catch: adding a host to required `host_permissions` or `content_scripts.matches` in a later update is a permission increase. Chrome disables the extension for every existing user until they approve. New AI sites after launch must therefore go through the optional permission (per-site request or Everywhere mode), never the required list. Narrowing now is cheap; widening later is not. Removing a required host later is safe.

Recommendation: Option B, decided before the first submission. It is the only moment the change costs nothing for existing users, it shortens review, and it is the privacy posture the strategy doc sells. Put the Everywhere button on the welcome page's first screen so "every text box" is one click away. If the founder wants zero day-one friction on non-AI sites, Option A is acceptable, but then adopt `use_dynamic_url` and keep the justification text below.

### A1.6 Paste-ready dashboard justifications (Option A, current manifest)

- storage: "Saves the user's prompts, categories, favourites, backups and settings in the browser's own storage. If the user switches on sync, a copy is kept in Chrome sync storage for their own signed-in browsers. Nothing is sent to a server."
- unlimitedStorage: "Prompt libraries, the seven automatic local backups and the per-prompt version history can exceed the 10 MB local storage limit. Without this permission a backup or an edit could fail to save. Everything stays on the device."
- contextMenus: "Adds an OmniPrompt entry to the right-click menu on selected text and text boxes: 12 text modifiers (for example Make Concise, Fix Grammar), Save selection as a new prompt, and Open prompt library."
- scripting: "After install or update, injects the extension's own packaged content scripts into tabs that are already open, so the prompt menu works without reloading every tab. Also used to recover a tab when the user presses the keyboard shortcut and the script is missing. No remote code is injected."
- Host permission `<all_urls>`: "The core feature is typing // or pressing Alt+K in any text box to insert a saved prompt at the cursor. Users do this in AI chat sites and in any other text box they choose (email, issue trackers, documents), so the content script must run on all sites. It only reads the focused text box to insert text and to check the text arrived. It never reads chat transcripts or page content, and sends nothing anywhere. Users can switch it off per site in Settings."

---

## A2. Remote hosted code

Scanned every shipped file (`manifest.json`, `background/`, `content/`, `data/`, `icons/`, `lib/`, `options/`, `popup/`, `styles/`, `welcome/`).

| Check | Result |
| --- | --- |
| Remote `<script src>` | None. All `<script src>` are relative: `popup/popup.html:344-350`, `options/options.html:987-993`, `welcome/welcome.html:298-301`. |
| Inline `<script>` blocks, `on*=` attributes, `javascript:` URLs | None (also asserted by `test/verify.js:1400`). |
| Remote CSS, `@import`, web fonts (Google Fonts) | None. Fonts are system stacks (`styles/base.css:87-90`, `content/content.css:51-53`). |
| Remote images | None. Icons are local PNGs. `styles/base.css:438` uses a `data:image/svg+xml` chevron (inline data, not remote). |
| iframes | None. |
| CDN URLs | None. |
| `eval`, `new Function`, string `setTimeout`/`setInterval`, dynamic `import()` | None. `importScripts` at `background/background.js:23` loads local files only. |
| Fetch then execute | None. The only `fetch` calls are licence activate/validate/deactivate in `lib/promptStore.js:2034,2054,2123,2187`; responses are parsed as JSON data. |
| Links to remote pages | Allowed and fine: Dodo checkout (`promptStore.js:94-96`, set on links in `options.js:379-383`), placeholder `https://dodopayments.com` hrefs in `options.html:716,918` (overwritten at runtime), AI-site links in `welcome.html:103-106`, store review link `popup.js:280`. |
| CSP | `extension_pages: script-src 'self'; object-src 'self'; connect-src 'self' https://live.dodopayments.com https://test.dodopayments.com`. Blocks any remote script even if one were added. |

`innerHTML` is used (content: 10 sites, popup 12, options 40, welcome 8) but always with `escapeHtml`/`escapeAttr` on dynamic text or with static markup; `content.js:568-570` sets static markup then `textContent`. No remote code issue. No CSP fix is needed.

Answer for "Are you using remote code?": **No, I am not using remote code.** Justification if asked: "All JavaScript is packaged in the extension. There is no remote script, eval, or dynamically fetched code. The only network request is a JSON call to Dodo Payments to activate or deactivate a licence key the user enters."

---

## A3. Dead code and unnecessary files

### A3.1 Unused code (confirmed by searching all shipped files plus `test/verify.js`, `test/harness.js`, `test/test-page.*`, with comments stripped)

| Item | Where | Evidence | Plan |
| --- | --- | --- | --- |
| `GROUP_ORDER` constant | `content/commandPalette.js:28` | Declared, never read | Remove |
| `getCurrentInputValue` ("kept for older call sites") | `content/adapters.js:1103-1106` | No caller anywhere | Remove |
| `VariableModal.renderTemplate`, `.extractVariables` ("Kept so older call sites and tests keep working") | `content/variableModal.js:675-682` | No caller, no test | Remove |
| `SlashTrigger.getTriggerChar`, `.setTriggerChar` | `content/slashTrigger.js` return block | No caller | Remove |
| `CommandPalette.getHotkey`, `.setHotkey` | `content/commandPalette.js` return block (~787) | No caller | Remove |
| Message `rebuild_menus` | handled `background/background.js:348-351` | Nothing sends it | Remove handler; update `.kiro/steering/tech.md` Messaging list |
| Message `ping` | handled `content/content.js:618-621` | Nothing sends it | Remove; update `tech.md` |
| CSS `.btn-delete-row` | `styles/base.css:327,332` | No element uses it | Remove from selectors |
| CSS `.text-input` | `styles/base.css:415,443,449,456` | Unused | Remove from selectors |
| CSS `.sidebar-empty` | `styles/base.css:462` | Unused (`.sidebar-empty-note` is used, and stays) | Remove from selector list |
| CSS `.mini-select` | `styles/base.css:414,432,455`, `popup/popup.css:518`, `options/options.css:835` | Unused | Remove |
| `bypassLimit` option | `lib/promptStore.js:1186` | Only `test/verify.js:1651` uses it; no shipped caller | Keep: asserted by the suite and named in `store-and-licensing.md` |
| Other exports with no external user (`OmniStore.KEYS`, `SCHEMA_VERSION`, `parseImportPayload`, template `TOKEN_RE`, importer `parseCsv`, adapter `SITES`, `replaceBeforeCaret`, `restoreCaret`, …) | lib and adapters return blocks | Documented public API in steering, or used internally | Keep |

No `console.log`/`debug`, `debugger`, `TODO`, `FIXME` or `XXX` in shipped code. `lib/promptStore.js` `validateLicense` (`:2111`) is never called (product_research B4); keep it, it is a deliberate decision item.

### A3.2 Stale comments and claims

| Where | Stale text | Fix |
| --- | --- | --- |
| `content/content.js:40-41` | "All UI lives in a closed-off shadow root" | The root is `mode: 'open'` (`:65`). Say "an open shadow root, so page CSS cannot reach in". |
| `content/variableModal.js:11-14`, `lib/template.js:567-569`, README Privacy bullet ("or after you enable clipboard auto-fill yourself") | Claim a user-facing clipboard auto-fill switch | The setting still exists in `DEFAULT_SETTINGS` (`promptStore.js:259`) but has no switch; `test/verify.js:1443` asserts the switch is gone. Reword: clipboard is read only from the Paste button. |
| `lib/importers.js:1-17` header | Omits SKILL.md and the flat `"name": "text"` object that it parses | Add both |
| `lib/promptStore.js:1-32` header | Describes schema v2 only | Add one paragraph listing the other responsibilities: backups, history, sync, licensing, free limit, Pro data |
| `options/options.js:1-17` header | "Library table, prompt editor, folders, settings, backup and import" | Add plan/licence page, workspaces, chains, folder sync, library tools |
| `test/test-page.js:36-58,85-89,125-131`, `content/content.js:776-786` | The sandbox detects the extension through `window.OmniPrompt`, but content scripts run in an isolated world, so a page script can never see that global. The banner will always say "not detected" and the palette/modifier buttons do nothing. | Dev-only bug. Detect `document.getElementById('omniprompt-root')` instead; drop the buttons that call `window.OmniPrompt` (the manual checks use the real keys anyway). Then `window.OmniPrompt` in `content.js` has no possible consumer; remove it. |

The "used to …" history lines in file headers (adapters, template, popup, options, slashTrigger, commandPalette, modifiers) describe fixed bugs accurately; keep them per the tech steering.

### A3.3 Is every content-script file needed in the page?

| File | Bytes | Used in the page? |
| --- | --- | --- |
| data/defaultPrompts.js | 129,052 | Yes (store reads built-ins) |
| lib/theme.js | 3,979 | Yes (`content.js:595,712`) |
| lib/template.js | 25,152 | Yes (modal, menu badges) |
| lib/modifiers.js | 9,332 | Yes (palette rows, `runModifier`) |
| **lib/importers.js** | **17,911** | **No.** Only reached through `OmniStore.importBundle` → `parseImportPayload` → `delegateToImporters` (`promptStore.js:2271-2530`). `importBundle` is called only from options and popup. No content script imports or exports files. `delegateToImporters` already returns `{ ok:false, error:'unavailable' }` when `OmniImporters` is absent. The service worker's `importScripts` (`background.js:27`) does not need it either (the worker never imports). |
| lib/promptStore.js | 149,027 | Yes |
| content/*.js (5 files) | 132,453 | Yes |
| content/content.css | 21,608 | Yes |

Total injected into every top-level page: 466,906 bytes of JS + 21,608 bytes of CSS = **488,514 bytes** (~477 KB). Dropping importers saves 17,911 bytes (3.7%) per page. The two big items (`promptStore.js`, `defaultPrompts.js`) are 57% of it; splitting them is a larger design change and is not planned.

### A3.4 Repo files: shipped vs dev-only

- Shipped: `manifest.json`, `background/`, `content/`, `data/`, `icons/`, `lib/`, `options/`, `popup/`, `styles/`, `welcome/`.
- Dev-only: `test/`, `generate-icons.js`, `README.md`, `PRIVACY.md`, `CHROMEWEBSTORE.md`, `product_research.md`, `.kiro/`, `.agents/`, `backups/`, `dist/`, `.git/`. There is no `.gitignore`; `.agents/` is untracked. Suggest a `.gitignore` for `.agents/` only if the founder wants it (not planned).

### A3.5 `dist/omniprompt-v2.0.0.zip`

27 entries, all inside the shipped set, forward-slash paths, no docs or tests. **No entry outside the shipped set.** But it is stale: built 2026-09-29 13:16, and 22 of 27 files differ in size from the working tree (for example `lib/promptStore.js` 96,763 in the zip vs 149,027 now; `options/options.js` 82,139 vs 154,193). It predates the Pro features and must be rebuilt, after `DODO_MODE` is set to `'live'`, before submission. Not modified by this audit.

---

## A4. Cross-browser and cross-OS

### A4.1 Findings in the current Chrome build

(a) Chromium family
- Store pages: `exclude_matches` lists only the Chrome Web Store. Chromium browsers block content scripts on their own store anyway, so this is harmless. Edge Add-ons (`microsoftedge.microsoft.com/addons/*`) is protected by Edge itself; `injectInto` already swallows the error. Adding it to `exclude_matches` is optional and is a content_scripts change, so it is a founder item, not planned.
- `popup/popup.js:280` sends the review button to `chromewebstore.google.com/detail/<id>/reviews`. Correct for the Chrome Web Store install. An Edge Add-ons install would land on the Chrome listing. Fine for the first submission; revisit when publishing to Edge Add-ons (detect via `chrome.runtime.getManifest().update_url`).
- `options/options.js:3377` opens `chrome://extensions/shortcuts`, with a copy-the-address fallback on failure. Edge, Brave, Opera and Vivaldi accept `chrome://` aliases in practice; not verified on each. Button text "Change in Chrome" (`options.html:439`) is Chrome-specific wording.
- Edge maps `Ctrl+Shift+K` to Duplicate tab. The manifest command may be left unassigned or collide there; verify manually and point Edge users at `edge://extensions/shortcuts`. Alt+K (in-page) is unaffected.
- Brave disables the File System Access API by default, so folder sync is unavailable there. Already handled: `options.js:2924,2932-2934,2961-2964` feature-detect `showDirectoryPicker` and say "This browser cannot give extensions access to a folder." The Choose folder button stays enabled and only shows a toast.
- CSS floor: `color-mix()` (Chrome 111), `:has()` (Chrome 105, options.css), `text-wrap` (progressive). No `minimum_chrome_version` is set. Chrome 111+ is a safe practical floor; MV3 `use_dynamic_url` would need 130.

(b) macOS
- In-page hotkey matching is already layout-safe: `content/commandPalette.js:92-95` matches `e.code === hotkey.code` first (`KeyK`), so Option+K producing `˚` still opens the palette.
- Bug: the hotkey recorder stores `key: e.key.toLowerCase()` (`options/options.js:3445-3452`). On macOS, recording Option+K stores key `˚`, and `describeHotkey` (`promptStore.js:647-660`) shows "Alt+˚" everywhere the label is used. Matching still works via `code`, but the label is wrong. Same on AltGr/dead-key layouts on Windows and Linux.
- Labels: every UI surface prints `settings.paletteHotkey.display` ("Alt+K") on a Mac: `popup/popup.js:207,843,1803`, `content/content.js:306`, `options/options.js:3353` and the recorder toast, plus static `options.html:408,425,427` and `popup.html:74`. `variableModal.js:63-68,93` and `content.js:140-141` already switch to ⌘ on Mac, so the pattern exists. The browser command label is already right in `welcome.html:53` and `options.html:436` ("Cmd+Shift+K on a Mac").

(c) Non-US layouts and AltGr
- `//` detection is layout-independent: `slashTrigger.js:121-146` reads the text before the caret on `input` events, not key codes.
- AltGr reports `ctrlKey && altKey`. The default Alt+K requires `ctrlKey === false` (`commandPalette.js:105`), so AltGr+K never opens it. `options.js:1493` Ctrl+S excludes Alt. No misfire found.
- Residual: the `e.key` fallback (`commandPalette.js:94`) also fires for the key that types `k` on Dvorak/Colemak, so two physical keys open the palette. Harmless; leave.
- Residual: the recorder accepts Ctrl+Alt+<key>. On AltGr layouts that combination types a character (for example AltGr+A = ą on Polish), so a recorded shortcut could swallow a letter. Warning the user is a behaviour change; flagged, not planned.

(d) IME (Chinese, Japanese, Korean) - real bugs
No file checks `isComposing` or `compositionstart` (searched all of content/, popup/, options/, welcome/). Consequences:
- `slashTrigger.js:121` `handleInput` runs on every composition update. `slashTrigger.js:173` `handleKeyDown` then handles Enter/Tab/arrows while the IME candidate window is open, so the Enter that confirms a composition picks a menu row instead.
- `commandPalette.js:701` `handlePaletteKeydown`: Enter confirming a Japanese search term activates the selected row. `commandPalette.js:111` global hotkey also runs during composition.
- `variableModal.js:350-360`: Enter in a single-line field during composition submits the form early; Ctrl+Enter likewise. `:514` save-set name field too.
- Same pattern in `popup/popup.js:454-471` (search Enter), `:1119-1124`; `options/options.js:3293,3392,3769,3831,3984`; `welcome/welcome.js:310-316,449-466` (practice menu).
Fix: at the top of each of these keydown handlers, `if (e.isComposing || e.keyCode === 229) return;` (Safari reports the confirming Enter with `isComposing` false but `keyCode` 229). In `handleInput`, skip while `e.isComposing` and re-run detection on `compositionend`.

(e) RTL pages: the shadow host uses `all: initial`, which does not reset `direction`, so overlays inherit the page's `rtl`. Flex rows mirror and the slash menu is clamped to the viewport (`slashTrigger.js:318-345`), so nothing breaks, but English prompt text is laid out RTL. Adding `dir="auto"` to titles/previews changes rendering; flagged for the founder, not planned.

(f) Firefox (verified on MDN, 2026-09-30)
- `background.service_worker` is not supported in Firefox (bug 1573659). Add `"scripts": [...]` alongside `service_worker`; Chrome 121+ ignores `scripts` in MV3. `background.js:23` calls `importScripts`, which does not exist in a Firefox event page, so list the five libs in `background.scripts` before `background.js` and guard the call with `typeof importScripts === 'function'`.
- `browser_specific_settings.gecko.id` is mandatory for MV3 signing, and new AMO listings since 3 Nov 2025 must declare `gecko.data_collection_permissions` (likely `{"required": ["none"]}`; the founder should decide whether a licence key sent to Dodo counts as "authentication info").
- Host permissions: since Firefox 127 they show in the install prompt, but MV3 users can revoke them in about:addons. Check with `permissions.contains` and ask when missing.
- File System Access (`showDirectoryPicker`) is Chromium-only. Folder sync already reports it as unavailable.
- `storage.sync`: works through Firefox Sync with similar quotas (about 100 KB, 8 KB per item); the chunking already fits.
- Commands: `Ctrl+Shift+K` opens the Firefox Web Console. Use a different default for Firefox.
- `use_dynamic_url`: Firefox already randomises the extension UUID; the key is harmless.
- Chrome-only strings: `chrome://extensions/shortcuts` (Firefox: about:addons → Manage extension shortcuts), the store review link.
- `chrome.*` namespace with callbacks, `contextMenus`, `scripting`, `action`, `document.execCommand('insertText')` all work in Firefox. `navigator.userAgentData` is absent; code already falls back to `navigator.platform`.
- Effort: S-M for a working Firefox build (manifest variant plus 3-4 small guards), plus an AMO listing. Needs a second manifest or a manual packaging step because there is no build tool.

(g) Safari: convert with `xcrun safari-web-extension-converter` in Xcode, ship inside a macOS/iOS app through the App Store (Apple Developer Program, US$99 a year). Blockers and gaps: no File System Access (folder sync off), storage.sync behaviour not verified, `commands` shortcut support is limited, Dodo checkout in a tab is fine but App Store rules on unlocking digital features bought outside Apple's payment system must be checked before shipping Pro there. Not verified on hardware.

(h) Mobile: Chrome for Android and iOS do not run extensions. Firefox for Android runs many extensions but has no keyboard shortcuts or context menus in the same form; the `//` menu could work on a physical keyboard. Safari iOS needs the app from (g). Mobile Edge extension support is limited. Treat mobile as out of scope.

(i) i18n: every UI string is hard-coded English; there is no `_locales/` and no `default_locale`. Rough count: 600-900 strings across `popup.html`, `options.html`, `welcome.html`, the four page scripts and the content UI, plus 136 built-in prompts. `chrome.i18n.getMessage` works in pages, content scripts and the worker. Effort: L (1-2 weeks) to externalise UI strings with `data-i18n` attributes and a small helper; translating prompts is separate. Cheap first step: `default_locale` + `__MSG_name__` / `__MSG_description__` in the manifest so the store listing can be localised. Not planned in this cleanup.

### A4.2 Compatibility matrix

| Browser / OS | Installs from | Works | Gaps |
| --- | --- | --- | --- |
| Chrome, Windows/macOS/Linux/ChromeOS | CWS | Yes | macOS labels, recorder label, IME (fixed by plan) |
| Edge | CWS or Edge Add-ons | Yes | Ctrl+Shift+K = Duplicate tab; review link points at CWS |
| Brave | CWS | Yes | Folder sync off by default (message shown) |
| Opera | CWS via "Install Chrome Extensions" | Expected yes | Not tested; shortcut conflicts unknown |
| Vivaldi, Arc | CWS | Expected yes | Not tested |
| Firefox desktop | AMO | No, as shipped | Needs `background.scripts`, gecko id, data-collection key, importScripts guard, different command key; no folder sync |
| Safari macOS/iOS | App Store | No | Xcode conversion, Apple account, payment rules, no folder sync |
| Chrome/Edge mobile | - | No | No extension support |
| Firefox Android | AMO | Not tested | No shortcuts/context menu parity |

---

## A5. Free-limit facts (report only)

Pro checks (all in `lib/promptStore.js` unless noted): `isPro` `:1970`, `isLimitReached` `:1994-1995`, `canCreatePrompt` `:1998-1999`, `proRequired` `:2781-2786`. Gated APIs: `restoreVersion` `:1114`; `savePrompt` limit `:1186`; `duplicatePrompt` limit `:1280`; `createFolder` `:1623`; `renameFolder` `:1643`; import room `:2307-2311`; `getActiveWorkspace` `:2931`; `saveWorkspace` `:2936`; `setActiveWorkspace` `:2991`; `saveVariableSet` `:3045`; `rememberValues` `:3090`; `getValueSources` `:3140`; `saveChain` `:3207`; `moveFolder` `:3333`; `bulkUpdate` `:3383`; `bulkDelete` `:3483`; `folderSyncMerge` `:3577`; `prepareForUse` blocks `:3799`. UI checks: `content/content.js:312,322` (chains), `content/commandPalette.js:452` (workspaces), `content/variableModal.js:433`, `popup/popup.js:227,746,898`, `options/options.js:679-680` wrapper and about 30 call sites.

Can a Free user go above 20 custom prompts?
- Create in popup/options/save-selection: no. All go through `savePrompt` (`:1186`). The right-click save path opens the editor, which calls `savePrompt`.
- Duplicate: no (`:1280`).
- File import, merge: no. Room is `20 - current` (`:2311`); the rest is reported as `overLimit`.
- File import, replace: only up to `max(20, current)` (`:2310`). A user already above 20 (for example after Pro lapsed) keeps their count; nobody grows past it.
- Restore a local backup: not capped (by design), but snapshots are only the user's own earlier states, so it cannot exceed their historical maximum.
- Folder sync: no, `folderSyncMerge` is Pro-only (`:3577`).
- **Chrome profile sync: yes.** `mergeRemote` (`:4005`) is not capped and sync is free. Two browsers each with 20 different prompts merge to 40 on both. Each extra profile adds 20, bounded only by Chrome's ~100 KB sync quota (roughly 60-100 small prompts). This follows the steering rule ("sync merges are the user's own data and are not capped"). Pricing question for the founder.
- `bypassLimit` (`:1186`): no shipped caller; tests only.

Can a Free user view or copy an earlier version? They can open History and see each version's title, time and the first 160 characters (`options/options.js:2133-2165`). There is no copy or full-text view; Restore shows "🔒 Restore (Pro)". `getHistory` itself is not gated, so the full text is kept and would appear on upgrade.

Are remembered short answers fully Pro-gated? Yes for writing and use: `rememberValues` returns false on Free (`:3090`) and `getValueSources` returns empty (`:3140`), which is the only read path the forms use. Forgetting and erasing (`forgetRemembered` `:3123`, `clearRememberedValues` `:3131`) stay free, which matches principle 3.

---

## A6. Roadmap status (product_research.md §7.3 and §9)

| Item | Status | Evidence |
| --- | --- | --- |
| Automatic local backups, visible status, restore | Shipped | `takeSnapshot`/`restoreSnapshot` `promptStore.js:2603,2646`; `SNAPSHOT_LIMIT` 7; options Backup & import |
| Insertion self-check + clipboard fallback | Shipped | `content/content.js` `confirmLanded`, `fallBackToClipboard` |
| Search over body, notes, tags | Shipped | store `search`; `test/verify.js` §20 |
| Typo tolerance | Missing | no fuzzy matching in `promptStore.js` |
| Save selection or draft as a prompt | Shipped | `background.js` `SAVE_SELECTION_ID`, palette `save-as-prompt`, `content.js` `saveAsPrompt` |
| Warn about unfilled placeholders | Shipped | `variableModal.js:563-567`, `popup.js:1268`, `options.js:4014` |
| Prompt notes | Shipped | README "Notes"; §20 tests |
| Version history (20) | Shipped (restore is Pro) | `HISTORY_LIMIT` `:123`, `restoreVersion` `:1113` |
| Context blocks | Shipped (Pro) | `prepareForUse` `:3793` |
| `{{selection}}`, page vars, dropdowns | Shipped, and Free (the doc proposed Pro) | `lib/template.js:70-80` |
| Gem / GPT import-export | Missing | only SKILL.md in `lib/importers.js:286-380` |
| SKILL.md import and export | Shipped | `parseSkillMd`, `toSkillMd`; `options.js:2091` |
| Multi-step chains | Shipped (Pro) | `saveChain` `:3206`, `content.js` chain runner |
| Firefox build | Missing | see A4 (f) |
| Edge build | Partial | CWS package installs on Edge; no Edge Add-ons listing or checks |
| Team packs (`storage.managed` or shared file) | Missing | no `storage.managed` use |
| Cloud sync with an account | Missing by choice | Chrome sync + folder sync instead |
| Phase 0: remove test bypass keys (B1) | Shipped | no `TEST-PRO`/`PRO-LIFETIME` in code; `PRO_PRODUCT_IDS` check |
| Phase 0: honest privacy text (B2) | Shipped, one stale line | README clipboard auto-fill bullet (A3.2) |
| Phase 0: remove pack gate (B3) | Shipped | all built-ins free; welcome roles only filter |
| Phase 0: `validateLicense` never called (B4) | Unchanged | `promptStore.js:2111`, no caller |
| Phase 0: store listing text, screenshots, video | Partial | text done in CHROMEWEBSTORE.md; screenshots and promo tiles marked 🟡; no video |
| Phase 0: review request once | Shipped (after 15, not 10) | `REVIEW_AFTER_USES = 15` `:126`; `popup.js:268-290` |
| Phase 1: scheduled backup to a user-picked file | Partial | folder sync (Pro) writes on open/changes/Sync now, not on a schedule |
| Phase 1: unlimited prompts in Pro | Shipped | `FREE_CUSTOM_LIMIT = 20` |
| Phase 2: public gallery pages for SEO | Missing | no site in repo |
| Phase 3: teams, encrypted sync, MCP/local API | Missing | - |

Note: product_research.md §7.1 and §10 still say the Free limit is 25 and 110 built-ins; the code says 20 and 136. The code is the source of truth. The doc is left as written (strategy draft).

---

# Part B. Implementation plan (behaviour-preserving cleanup)

Every item leaves the suite green. Verify after each item with `node test/verify.js` (expect `Failed: 0`) from `c:\Zmy_work\1my_apps\1Extensions\prompt_manager`. Run `node --check <file>` on each touched .js file. Do not commit.

- [x] 1. Remote code and CSP. No change needed: A2 found no remote fonts, scripts, images or eval, and the CSP already restricts scripts and connections. Add one regression test so it stays that way.
      Files: `test/verify.js` (new `function testNoRemoteCode()` with section `33. No remote code in shipped files`, called from `main()`): for every .html/.css/.js under the shipped folders, assert no `<script src="http`, no `@import`, no `url(http`, no `fonts.googleapis`, no `<iframe`, and in `readCode` output no `eval(`, `new Function`, `import(`, or `setTimeout('`/`setInterval('` with a string first argument. Also add `'lib/theme.js'` to the `testSyntax` list (`verify.js:294-310`) and to the `shipped` network list (`:1513-1527`); it is shipped but missing from both.
      Verify: `node test/verify.js` → Failed: 0, new section passes.

- [x] 2. Remove confirmed dead code (conservative).
      - `content/commandPalette.js:28` delete `GROUP_ORDER`; delete `getHotkey`/`setHotkey` from the return block.
      - `content/adapters.js:1103-1106` delete `getCurrentInputValue` and its "kept for older call sites" comment.
      - `content/variableModal.js:675-682` delete `renderTemplate`, `extractVariables` and their comment.
      - `content/slashTrigger.js` return block: delete `getTriggerChar`, `setTriggerChar`.
      - `background/background.js:348-351` delete the `rebuild_menus` case; `content/content.js:618-621` delete the `ping` case. Update `.kiro/steering/tech.md` Messaging lists to match.
      - CSS: remove `.btn-delete-row`, `.text-input`, `.sidebar-empty` (not `-note`), `.mini-select` from the selector lists in `styles/base.css:327,332,414-415,432,443,449,455-456,462`, `popup/popup.css:518`, `options/options.css:835`. Remove only the unused selector from each comma list.
      - Keep `bypassLimit`, `validateLicense`, every `OmniStore`/`OmniTemplate`/`OmniImporters` export, and `ChatbotAdapters` exports named in steering.
      Before each deletion, re-run a search for the identifier across the repo (excluding `backups/`) to confirm zero uses.
      Verify: `node --check` each file; `node test/verify.js` → Failed: 0.

- [x] 3. Drop `lib/importers.js` from the page and the worker (proved unused there in A3.3).
      Files: `manifest.json` content_scripts[0].js (remove the entry, keep the rest in order); `background/background.js` `CONTENT_SCRIPTS` (~`:210`) and `importScripts` (`:27`); `.kiro/steering/structure.md` "Script load order" list and the `CONTENT_SCRIPTS` note. Keep it in `popup.html:348`, `options.html:991`, `LIB_FILES` in `test/harness.js` and the `testSyntax`/`shipped` lists (the file still ships for the pages). Add a test in `test/verify.js` §1: content scripts do not include `lib/importers.js`, and an `H.createStoreRealm` loaded without importers still `init()`s and `importBundle` of a JSON bundle works (store handles JSON itself) while a CSV returns `ok:false`.
      This is a manifest file-list change, not a permission change. Confidence: high. If the implementer finds any content-script path to `importBundle`/`parseImportPayload`, stop and ask.
      Verify: `node test/verify.js` → Failed: 0 (the §14 check that `CONTENT_SCRIPTS` equals the manifest list must pass). Manual: load unpacked, `//` and Alt+K work on a page; popup and options import a CSV.

- [x] 4. Fix the sandbox detection (dev-only, A3.2).
      Files: `test/test-page.js` (detect `document.getElementById('omniprompt-root')`; show counts only if available; remove the modifier toolbar and palette button handlers that call `window.OmniPrompt`, or replace their text with "use Alt+K / right-click"); `test/test-page.html` (matching markup, keep ids referenced); then `content/content.js:776-786` remove `window.OmniPrompt`. Search first: nothing else reads `window.OmniPrompt` (confirmed in A3).
      Verify: `node test/verify.js` → Failed: 0. Manual: open `test/test-page.html` with file access on; banner says active.

- [x] 5. IME composition safety (A4 d).
      Add `if (e.isComposing || e.keyCode === 229) return;` as the first line of: `content/slashTrigger.js` `handleKeyDown` (`:173`); `content/commandPalette.js` `handleGlobalKeydown` (`:111`) and `handlePaletteKeydown` (`:701`); `content/variableModal.js` field keydown (`:350`) and `nameInput` keydown (`:514`); `popup/popup.js` search keydown (`:454`) and modal field keydown (`:1119`); `options/options.js` keydowns at `:1485` (global), `:3293`, `:3392`, `:3769`, `:3831`, `:3984`; `welcome/welcome.js` `:310` and `onKeydown` `:449`. In `slashTrigger.js` `handleInput` (`:121`) return early when `e.isComposing`, and register `document.addEventListener('compositionend', handleInput, true)` in `init` next to the `input` listener (`:70`) so the menu opens once the text is committed.
      Tests (`test/verify.js`, new section `13e. IME composition`): source checks with `readCode` that each of the five content/page files contains `isComposing` and `229`, and that `slashTrigger.js` registers `compositionend`. Behavioural test is not feasible in `createAdapterRealm` (these modules need a shadow root).
      Behaviour: identical for non-IME typing. Verify: `node test/verify.js` → Failed: 0; manual with Windows Japanese IME: type in the palette, press Enter to confirm, row is not activated.

- [x] 6. Hotkey recorder records the physical key (macOS Option, AltGr, dead keys).
      Files: `options/options.js:3445-3452`: set `key` from `e.code` when it matches `/^Key([A-Z])$/` (letter, lower-cased) or `/^Digit(\d)$/`, else keep `e.key.toLowerCase()`. `lib/promptStore.js` `describeHotkey` (`:647`): same derivation from `hk.code` when present, so an already stored `{ key:'˚', code:'KeyK' }` displays "Alt+K". ES5 only.
      Tests: `test/verify.js` §10b: `eq(S.describeHotkey({ altKey:true, key:'˚', code:'KeyK' }), 'Alt+K', ...)` and `S.normalizeHotkey({ altKey:true, key:'˚', code:'KeyK' }).display === 'Alt+K'` (only when no display is passed).
      Verify: `node test/verify.js` → Failed: 0.

- [x] 7. Mac-appropriate shortcut labels in the UI.
      Add `formatHotkey(hk, mac)` to `lib/promptStore.js` (ES5, exported on `OmniStore`): non-Mac returns `hk.display`; Mac returns the glyph form built from the flags in order ⌃ ⌥ ⇧ ⌘ plus the key from step 6 (Alt+K → `⌥K`, Ctrl+Shift+K → `⌃⇧K`). Stored `display` stays "Alt+K" (tests assert it). Each surface detects Mac the way `variableModal.js:63-68` does. Use it in `popup/popup.js:207,843,1803`, `content/content.js:306`, `options/options.js:3353` and the recorder toast. Static HTML (`options.html:408,425,427`, `popup.html:74`) keeps "Alt+K" as the initial text; JS repaints it. README and welcome.html keep their literal strings.
      Tests: `eq(S.formatHotkey({altKey:true,key:'k',code:'KeyK',display:'Alt+K'}, true), '⌥K')`, `eq(S.formatHotkey(..., false), 'Alt+K')`.
      Behaviour: labels change only on macOS. Low risk, user-visible on Mac only; implement unless the founder objects.
      Verify: `node test/verify.js` → Failed: 0.

- [x] 8. Folder sync explains itself where `showDirectoryPicker` is missing.
      Files: `options/options.js` `paintFolderSync` (`:2920-2950`): when `!supported`, disable `el.folderSyncChoose` and set its `title`, and make the status say "Folder sync needs a browser that lets extensions use a folder, such as Chrome or Edge. Brave turns this off by default." Keep the click guard at `:2961`.
      Tests: `readCode('options/options.js')` contains `folderSyncChoose.disabled`.
      Verify: `node test/verify.js` → Failed: 0.

- [x] 9. Price label read from the store (existing hard-coded price).
      `options/options.html:716` link text "Get Pro for $25, once" is never repainted (`paintCheckoutLinks` `options.js:379-383` only sets `href`). Wrap the label in `<span id="buy-pro-label">Get Pro</span>` (keep the SVG) and set it in `paintCheckoutLinks` to `'Get Pro for ' + info.price + ', once'`. Replace the other static `$25` initial texts (`options.html:707,754,912,918`, `popup.html:130`) with neutral text ("Get Pro", "once"), since JS already repaints them from `getProInfo()`. Do not touch `PRO_PRICE`. `options.html:915` ("Other prompt tools charge about $10 a month") is a competitor claim, leave it.
      Tests: add to §26: no `$\d` in `options/options.html` or `popup/popup.html`, and `options.js` references `buy-pro-label`.
      Verify: `node test/verify.js` → Failed: 0; manual: Plan page shows "Get Pro for $25, once".

- [x] 10. File header blocks accurate (`/** OmniPrompt - <Name> ... */`).
      Edit only comments: `content/content.js:40-41` ("open shadow root"); `content/variableModal.js:11-14` and `lib/template.js:567-569` (clipboard read only from Paste; the setting has no switch); `lib/importers.js:1-17` (add SKILL.md and flat name/text objects); `lib/promptStore.js:1-32` (add a paragraph: backups, history, sync, licensing, free limit, Pro data); `options/options.js:1-17` (add plan and licence, workspaces, chains, folder sync, library tools); `content/content.js:1-21` (drop the page debugging surface mention if step 4 removed it). Check every other shipped file's header still matches after steps 2-9.
      Verify: `node --check` each; `node test/verify.js` → Failed: 0.

- [x] 11. Docs literally true.
      - README.md: Privacy bullet → "The clipboard is only read when you press **Paste** in a form." Project layout: `importers.js` "used by the popup and library page"; add `CHANGELOG.md`. Install: note folder sync needs File System Access (not Brave by default). Mention the Mac labels (`⌥K`) next to `Alt+K` in the shortcut table without removing the literal. Keep every tested literal.
      - PRIVACY.md: §1 "No Page Reading" is accurate; §5 "Export … and settings" must be checked against `exportBundle(opts)` (`promptStore.js:2216`) and the options export button; reword if settings are optional. Mention that `chrome.storage.sync` is used only when the user turns sync on.
      - CHROMEWEBSTORE.md: add a "Submission answers" section: single-purpose statement ("OmniPrompt saves reusable text prompts and inserts them at the cursor in any text box, through a // menu, a keyboard palette and the right-click menu."), the per-permission justifications from A1.6, remote code "No" with the justification from A2, data-use answers (no data collected; the only transmission is the licence key to Dodo Payments when the user activates; list it under the privacy policy), and the note that `dist/` must be rebuilt after `DODO_MODE = 'live'`. Fix the checklist: "ZIP packaged" stays unchecked; add "Rebuild dist zip (current one predates Pro features)". Keep "20 prompts of your own" (tested).
      - CHANGELOG.md (new, repo root, not shipped): Keep a Changelog format with `## [Unreleased]` (Removed: unused exports, CSS, messages, importers from content scripts; Fixed: IME Enter, recorder label, Mac labels, folder sync message, sandbox detection; Added: remote-code test) and `## [2.0.0] - 2026-09-30` summarising README "Version 2.0.0" plus Pro features.
      Do not invent contact addresses or URLs. `support@omniprompt.app`, `privacy@omniprompt.app` and `github.com/omniprompt/omniprompt` are unverified placeholders; list them as a founder item, do not change them.
      Verify: `node test/verify.js` → Failed: 0 (§16 README checks, §32 25-limit checks).

- [x] 12. Final verification.
      `node test/verify.js` → Failed: 0. `node --check` every file in `background/`, `content/`, `data/`, `lib/`, `options/`, `popup/`, `welcome/`, `test/`. Confirm no root file starts with `_`/`scratch` or ends `.tmp`, and no temp files remain. Do not rebuild `dist/` (founder does it after going live).

### Changes flagged for the user (not behaviour-preserving; do not implement without approval)

1. Permission model: Option A vs B (A1.5), including `activeTab` and optional host permissions.
2. `use_dynamic_url: true` for content.css (A1.4).
3. Adding Edge Add-ons to `exclude_matches`.
4. Free users exceeding 20 prompts through Chrome profile sync (A5).
5. Recorder refusing or warning on Ctrl+Alt (AltGr) combinations.
6. `dir="auto"` on overlay text for RTL pages.
7. Firefox and Safari builds (new manifest keys, a second package), `minimum_chrome_version`, i18n.
8. Free users copying full text of earlier versions (history is Pro-gated for restore; view is a 160-char preview).
9. `DODO_MODE = 'live'`, live product id and checkout link, rebuild of `dist/`, hosted privacy policy URL, real contact addresses.

### Suggestions for making OmniPrompt the category leader (for the founder, not in this plan)

- Product: typo-tolerant search; Gem/Custom GPT import; scheduled file backup for everyone (it is a trust feature, consider Free); a Firefox build (A4 f, small effort); prompt gallery pages for search traffic; per-site "turn on here" if Option B ships; team read-only packs via a shared file or `storage.managed` only when paying users ask.
- Pricing: the current split (Free: all insertion, 136 built-ins, 20 prompts, backups; Pro $25 once) is coherent and matches the research that users pay once and resent caps under 20. Two open questions: whether version-history restore should be Free (it is data safety, which principle 3 protects), and whether the sync route past 20 should be closed or accepted as goodwill. Price changes stay with `PRO_PRICE` and the founder.
