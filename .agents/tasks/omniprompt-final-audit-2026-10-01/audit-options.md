# OmniPrompt — Options & Welcome audit (read-only)

Date: 2026-10-01
Scope: `options/options.{html,js,css}`, `welcome/welcome.{html,js,css}`, `styles/base.css`.
Method: AST/text cross-checks (scratch scripts, since deleted), WCAG contrast computation, and
line-level reading. Every finding below is quoted from the source.

Cross-checks run:
- **DOM id diff** (JS `getElementById`/`querySelector('#…')` vs HTML `id=`): options.js uses 266 ids,
  options.html declares 282; welcome.js 19 vs welcome.html 33. The 5 ids the diff flagged
  (`btn-ws-create-empty`, `btn-mod-create-empty`, `btn-rule-create-empty`, `opt-sets-select`,
  `opt-sets-save`) are **false positives**: each is created in a template string and then read with a
  *scoped* `querySelector` (e.g. `options.js:2885-2886`). No dead/missing DOM ids. welcome: 0 missing.
- **`store.*` call check** (100 distinct calls in options.js vs `lib/promptStore.js`): 98 resolve; **2 do not** — see F1.

---

## Ranked findings

### F1 — CRITICAL — `store.isSitePermitted` and `store.addEnabledSite` do not exist (runtime TypeError)
- **Where:** `options/options.js:3787` and `options/options.js:3882`.
- **Evidence:**
  ```js
  // 3787, inside checkRuleHostPermissions()
  if (h && !store.isSitePermitted(h)) {
  // 3882, inside the "grant host" button handler
  if (granted) { await store.addEnabledSite(host); ... }
  ```
  `lib/promptStore.js` exports `isSiteDisabled` and `setSiteDisabled` only (grep: lines 2012 / 4811).
  There is **no** `isSitePermitted` and **no** `addEnabledSite` anywhere in the store.
- **Why it matters:** `checkRuleHostPermissions()` runs every time the Site-rule editor opens with hosts
  and on every keystroke in the hosts field (`el.ruleHosts.addEventListener('input', checkRuleHostPermissions)`,
  line ~3873). `store.isSitePermitted` is not a function → the whole handler throws, so the
  "not turned on for X yet" permission banner never appears and typing in the hosts field errors in the
  console. After the user grants a host permission, `await store.addEnabledSite(host)` throws, so the
  success toast and re-check never run (the catch is implicit via the unhandled rejection).
  This is the one Pro surface (Site rules) that is broken on first use.
- **Fix:** mirror the pattern the Settings "enabled sites" code already uses (permission-based, no store
  method). For the check at 3787, replace with a `chrome.permissions.contains` lookup; e.g. precompute a
  Set of granted origins once (as `renderEnabledSites()` does at `options.js:4958-4976` via
  `chrome.permissions.getAll`) and test `grantedOrigins.has('https://' + h + '/*')`, or make
  `checkRuleHostPermissions` async and call `chrome.permissions.contains({origins:['https://'+h+'/*']},cb)`.
  For line 3882, **delete** `await store.addEnabledSite(host)` entirely — the preceding
  `chrome.permissions.request` already granted it; just call `checkRuleHostPermissions()` and show the toast
  (exactly as the Settings handler at `options.js:5044-5051` does). Add a regression test asserting both
  method names are absent from the store so this can't silently reappear.

### F2 — HIGH — Library search re-renders the entire table on every keystroke (no debounce)
- **Where:** `options/options.js:1246-1249`.
- **Evidence:**
  ```js
  el.search.addEventListener('input', () => {
    searchQuery = el.search.value.trim();
    renderTable();
  });
  ```
  `renderTable()` rebuilds `el.tableBody.innerHTML` for *all* matching rows and, per row, calls
  `store.isFavorite`, `template.variableCount`, `store.getUsage`, `store.getCategoryMeta`,
  `template.listBlocks` and `templatePreviewHtml` (`options.js:1320-1400`).
- **Why it matters:** with 136 built-ins + user prompts, each keystroke throws away and rebuilds the whole
  DOM subtree and re-runs template parsing per row. On mid-range hardware this is visible jank, drops the
  caret's row hover/selection, and defeats the browser's incremental rendering. The steering docs explicitly
  call out "rendering 136+ prompts — full re-render on each keystroke?" as a concern.
- **Fix:** debounce the input (120–150 ms) before `renderTable()`, and/or memoise per-prompt derived values
  (varCount, blocks, usage) so filtering only re-filters an already-built row model. A cheap first step:
  `let t; el.search.addEventListener('input', () => { searchQuery = el.search.value.trim(); clearTimeout(t); t = setTimeout(renderTable, 130); });`

### F3 — MEDIUM — Compare modal is not closable with Escape (inconsistent with every other modal)
- **Where:** central Escape handler `options/options.js:5404-5433`; compare modal bindings
  `options/options.js:4030-4040`.
- **Evidence:** the global `keydown`/Escape handler closes tidy, history, upgrade, category, text and
  variable modals — but **not** `el.compareModal` (`options-compare-modal`). `bindCompareModal()` wires
  only a close button, a cancel button and a backdrop `mousedown`:
  ```js
  el.compareModal.addEventListener('mousedown', (e) => { if (e.target === el.compareModal) closeOptionsCompareModal(); });
  ```
- **Why it matters:** every other modal in the page closes on Escape; the Compare dialog traps the keyboard
  user, who must mouse to the ✕. Accessibility and consistency regression.
- **Fix:** add a branch to the handler at line 5404: `if (el.compareModal && el.compareModal.style.display === 'flex') { e.preventDefault(); closeOptionsCompareModal(); return; }`.

### F4 — MEDIUM — Modals have no focus trap and do not restore focus on close
- **Where:** all options modals — e.g. `openCategoryModal`/`closeCategoryModal`
  (`options.js:1095-1117`), `openOptionsCompareModal`/`closeOptionsCompareModal`
  (`options.js:3956-4030`), upgrade/history/tidy modals.
- **Evidence:** opening sets `display='flex'` and (for the category modal) `setTimeout(() => el.catModalName.focus(), 50)`; closing sets `display='none'` and nulls state. There is **no** Tab-key
  containment and **no** stored `previousActiveElement` to return focus to the trigger. Grep for
  `trapFocus|lastFocused|restoreFocus|previousActive` → 0 matches in options.js.
- **Why it matters:** keyboard and screen-reader users can Tab out of an open dialog onto the page behind
  it, and when a dialog closes focus is lost to `<body>` instead of the control that opened it. WCAG 2.4.3
  (Focus Order) / 2.1.2 (No Keyboard Trap, inverse) expectation for `role="dialog"`.
- **Fix:** add a small shared helper: on open, record `document.activeElement`; keep focus inside the dialog
  on `Tab`/`Shift+Tab` (wrap first/last focusable); on close, `previous.focus()`. Apply to the category,
  compare, upgrade, history and tidy modals. (The variable modal shares base.css `.modal-content`, so one
  helper covers them.)

### F5 — LOW/MEDIUM — No hash routing or back-button support between views
- **Where:** `showView()` `options/options.js:650-685`; URL handling is one-shot in `handleUrlParams()`
  (`options.js:690-745`) which reads `?view=`/`?edit=` only on load.
- **Evidence:** navigation is pure in-memory class toggling (`el.panels.forEach(p => p.classList.toggle('active', ...))`). Grep for `hashchange|popstate|location.hash` in options.js → **0 matches**. The only
  history use is `history.replaceState(null,'',pathname)` to strip query params (`options.js:750-751`).
- **Why it matters:** the browser Back button does not move between library ⇄ settings ⇄ plan ⇄ workspaces,
  etc.; deep links beyond the initial `?view=` param cannot be shared or bookmarked; the page can't restore
  the last view after reload. For a full-tab options page this is a surprising UX gap.
- **Fix:** push a hash on `showView(view)` (`history.pushState`/`location.hash = '#'+view`) and add a
  `popstate`/`hashchange` listener that calls `showView` with the dirty-guard already in place. Keep the
  existing `?view=` entry path for the popup hand-off.

### F6 — LOW — macOS key labels not localised for the editor save hint and inline Alt+K copy
- **Where:** `options/options.html:309` (`<span class="editor-save-hint"><kbd>Ctrl</kbd><kbd>S</kbd></span>`),
  plus static `Alt+K` in body copy at `options.html:122, 332`.
- **Evidence:** the save handler already honours ⌘ (`options.js:1735`: `(e.ctrlKey || e.metaKey) && … 's'`),
  and the store has `isMacPlatform()` + `formatHotkey()` (`options.js:32`). But the save hint has **no id**
  and is never repainted, so a Mac user sees "Ctrl S" while the shortcut they press is ⌘S. The browser-level
  shortcut *is* correctly dual-labelled at `options.html:644` (`Ctrl+Shift+K (Cmd+Shift+K on macOS)`),
  which makes the save-hint omission more conspicuous.
- **Why it matters:** minor but inconsistent; the hint is hidden on narrow screens (`options.css:1945
  .editor-save-hint { display: none; }`) so impact is small, but on a Mac desktop it is wrong.
- **Fix:** give the hint an id and, when `store.isMacPlatform()`, set it to `⌘ S`; optionally run `Alt+K`
  prose through `formatHotkey` (⌥K on macOS). welcome.html already does the dual-label trick for the browser
  shortcut (`Ctrl+Shift+K (Cmd+Shift+K on a Mac)`), so match that style.

### F7 — LOW — `--text-3` on `--bg` is 4.40:1 in the light theme (just under AA for normal text)
- **Where:** `styles/base.css` `--text-3: #71717a` on `--bg: #f4f4f5` (light).
- **Evidence (computed, WCAG 2.1):**
  - LIGHT: text/bg **16.12**, text-2/bg **7.03**, **text-3/bg 4.40 ✗ (normal-text AA)**, text-3/surface 4.83 ✓,
    accent/bg 5.90, accent-ink/accent 6.48, ink-text/ink 16.97, good/surface 5.02, warn/surface 5.19,
    danger/surface 5.88.
  - DARK: text/bg 17.89, text-2/bg 8.33, text-3/bg 5.38 ✓, accent/bg 7.35, accent-ink/accent 7.35, all pass.
- **Why it matters:** every real body-text pair passes AA; the only sub-4.5 value is the muted hint colour
  `--text-3` on the *page* background in light mode (4.40). `--text-3` is used for `.field-note`,
  `.pm-desc`, `.section-tag`, hints — small secondary text. It clears 4.5 on `--surface`/`--surface-sunken`,
  so it is only a concern where muted text sits directly on `--bg`.
- **Fix:** darken `--text-3` in light mode to ~`#6b6b73` (≈4.6:1 on `--bg`) or reserve `--text-3`-on-`--bg`
  for ≥16px/bold (large-text AA = 3:1, which it already passes). Dark theme needs no change.

### F8 — INFO — `id="setting-rank-favorites"` uses US spelling in the identifier
- **Where:** `options/options.html:687` `<input type="checkbox" id="setting-rank-favorites" />`.
- **Evidence/why:** this is an internal id, not user-facing copy; the visible label uses British
  "favourites". Steering only mandates British spelling for prose, so this is **not** a defect — noted only
  so a future "fix all US spellings" sweep does not break the matching `getElementById('setting-rank-favorites')`
  in options.js. No action needed.

### Verified GOOD (checked, no defect)
- **Ctrl/Cmd+S save** works and honours macOS metaKey (`options.js:1735`); Enter submits forms; Escape closes
  all modals except Compare (F3).
- **Form a11y:** labels tied with `for`/`id`, `required`, `.req-mark`, `aria-describedby` to `.field-error`
  with `role="alert"`, `aria-invalid` set/cleared on input (editor `options.html:204-212, 260-296`,
  workspace/chain/modifier forms likewise). First-error focus on submit (`options.js:2373`).
- **Dirty guards** on view change for editor/workspace/chain/modifier/rule (`options.js:651-668`) and on
  editor/rule re-open; `window.confirm` discard prompts.
- **Pro gating** matches principle 3: Free users *see* existing workspaces/chains/modifiers/rules
  (`renderWorkspaces` lists regardless of Pro, `options.js:2823`), the upgrade modal fires only on *create*
  (`openWorkspaceEditor` `!ws && !isPro()`, `options.js:2940`) or *save* (`submit → !isPro()`), and the empty
  state says the data is kept and backed up. Smart-template save is gated + linted (`options.js:2360-2379`).
- **Price** is read from `store.getProInfo()` everywhere (`paintCheckoutLinks` `options.js:478-486`); no
  hard-coded `$25`/`$19`/`$39` in options/welcome/popup JS or HTML (only in docs and `PRO_PRICE`).
- **Folder sync** detects `window.showDirectoryPicker`, disables + titles the button when unsupported
  (`options.js:4238-4241`), re-requests permission only when `interactive` (`options.js:4177-4178`), stores
  the handle in IndexedDB (`options.js:4098-4142`), and surfaces `needsPermission`/`lastError` states.
- **No untrusted innerHTML:** all dynamic row/field text goes through `escapeHtml`/`escapeAttr`
  (`renderTable`, `renderWorkspaces`, emoji picker, compare targets).
- **Welcome practice box** uses the real `OmniTemplate` + `DEFAULT_PROMPTS`, mirrors slash/Esc/Ctrl+↵
  behaviour, and bails cleanly if the library/engine is absent (`welcome.js initPractice` guard). The
  everywhere switch reflects real permission state via `chrome.permissions.contains` and re-syncs after
  request/remove. Starter pack writes `activePacks`/`selectedRole` and the practice box follows the choice.
- **Theme contrast** is strong in both skins (see F7 for the single borderline value); `:focus-visible`
  outline defined globally (`base.css`), `prefers-reduced-motion` honoured.

---

## UX improvements worth making (top 10, concrete)

1. **Debounce library search** (F2) and keep the caret/scroll position across renders so typing feels instant
   on a 150-prompt library.
2. **Add hash routing + Back-button support** (F5) so views are linkable, reloadable to the same place, and
   the browser Back button behaves.
3. **Shared modal focus-trap/restore helper** (F4) applied to category, compare, upgrade, history, tidy —
   trap Tab, return focus to the opener on close.
4. **Close Compare with Escape** (F3) — one line, removes a keyboard trap and matches the other six modals.
5. **Platform-correct key hints** (F6): repaint the editor save hint to ⌘S and Alt+K prose to ⌥K on macOS
   using the existing `isMacPlatform()`/`formatHotkey()`.
6. **Site-rule host banner**: after fixing F1, show a live "turned on / needs permission" chip per host as
   the user types, instead of only the first unpermitted host — the data is already parsed in
   `checkRuleHostPermissions`.
7. **Unsaved-changes affordance beyond `window.confirm`**: the native confirm is easy to miss and can't be
   styled; show an inline "Unsaved changes" pill in the editor header and only confirm on destructive nav.
8. **Compare "Start" button** re-enable on failure: it sets `disabled=true; textContent='Starting…'`
   (`options.js:4062`) — ensure it resets in the message callback's error branch so a failed start isn't
   stuck.
9. **Search empty-state → create**: when a search yields nothing, the empty state already offers "create";
   prefill the new prompt's title with the query (code exists at `options.js:1306`) — surface it as the
   primary action so a miss becomes a one-click new prompt.
10. **Darken `--text-3` in light mode** (F7) to clear AA on `--bg`, lifting legibility of hints/notes/section
    tags that currently sit at 4.40:1.
