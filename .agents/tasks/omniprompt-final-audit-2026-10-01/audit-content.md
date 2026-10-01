# OmniPrompt content-script audit — 2026-10-01

Read-only review of `content/*` cross-referenced against `lib/promptStore.js`,
`lib/template.js` and `background/background.js`. Every finding is quoted from
source. Ranked worst-first. Each lib/background symbol a content file calls was
grepped; the ones that exist are noted under "Verified OK" at the end.

---

## CRITICAL

### C1. `start_compare` from the in-page modal sends the wrong field names → Compare always fails
- **File:** `content/variableModal.js:875-889` (sender) vs `background/background.js:538-636` (handler)
- **Evidence:**
  variableModal sends:
  ```js
  chrome.runtime.sendMessage({
    action: 'start_compare',
    promptText: text,
    targetIds: selected,
    layout: layout,
    autoSend: autoSend,
    ...
  });
  ```
  background reads:
  ```js
  const targets = Array.isArray(request.targets) ? request.targets.slice(0, 6) : [];
  if (!targets.length) { sendResponse({ ok: false, error: 'No targets chosen.' }); return; }
  const text = String(request.text || '');
  ```
- **Why wrong:** The handler keys on `request.targets` and `request.text`.
  The in-page modal sends `targetIds` and `promptText`, so `targets` is always
  `[]` → the worker returns `{ok:false, error:'No targets chosen.'}` and never
  opens any windows. The modal does not even read the response (fire-and-forget
  at line 875), so the user sees the modal close and nothing happens. Note
  `options/options.js:4068-4070` sends the *correct* names (`text`, `targets`),
  so Compare launched from the options page works — proving the modal path is
  the defect, not the handler.
- **Fix:** In `variableModal.startCompareAction`, send `text: text` and
  `targets: selected` (match the worker and options.js). Optionally also read
  the callback to surface `res.error` in `warnEl`.

### C2. `ChatbotAdapters.findActiveComposer` does not exist — chain runner is permanently degraded
- **File:** `content/content.js:446-451` and `content/content.js:470-473`
- **Evidence:**
  ```js
  const comp = window.ChatbotAdapters && window.ChatbotAdapters.findActiveComposer ? window.ChatbotAdapters.findActiveComposer() : null;
  if (comp) { hint.textContent = 'Ready to insert into active composer.'; }
  else { hint.textContent = 'Click inside a text box, then press Next step.'; hint.classList.add('is-warn'); }
  ...
  const currentComp = window.ChatbotAdapters && window.ChatbotAdapters.findActiveComposer ? window.ChatbotAdapters.findActiveComposer() : null;
  continueChain({ target: currentComp ? currentComp.element : null });
  ```
  `grep findActiveComposer content/adapters.js` → **no matches**. The adapters
  module exports `getInputElement`, `getRememberedTarget`, etc., but no
  `findActiveComposer`.
- **Why wrong:** The `&&` guard means the call is skipped and `comp`/`currentComp`
  are always `null`. So (a) the runner card *always* shows the warning hint
  "Click inside a text box…" even when a composer is present, and (b) "Next
  step →" always passes `target: null`, forcing `continueChain` to re-resolve
  via `getInputElement()` — usually fine, but the intended behaviour (use the
  composer the runner found, read `comp.element`) never runs. Also note the
  expected shape `currentComp.element` does not match what any existing resolver
  returns (`getInputElement` returns the element directly, not `{element}`).
- **Fix:** Replace both calls with the real API, e.g.
  `window.ChatbotAdapters.getInputElement()` which returns the element directly:
  `const comp = adapters ? adapters.getInputElement() : null;` and
  `continueChain({ target: comp });`.

### C3. `checkPendingCompare` mis-calls `insert` and `landingCheck`; landing is never actually verified
- **File:** `content/content.js:916-918`
- **Evidence:**
  ```js
  const inserted = await window.ChatbotAdapters.insert(job.text, { mode: 'replace' });
  const landed = window.ChatbotAdapters.landingCheck ? window.ChatbotAdapters.landingCheck() : true;
  if (inserted && landed) { ... success ... }
  ```
  `insert` (adapters.js:~470) returns a plain object `{ ok, mode, submitted, target, check }`
  synchronously — not a Promise and not a boolean. `landingCheck(element, text, mode)`
  (adapters.js:~360) *requires three arguments* and **returns a function**, not a
  boolean:
  ```js
  function landingCheck(element, text, mode) { ... return () => { ... }; }
  ```
- **Why wrong:**
  1. `await` on a non-Promise object yields the object itself, which is always
     truthy → `inserted` is truthy even when `result.ok === false`.
  2. `landingCheck()` called with no args: `probeOf(undefined)` → `''` → returns
     `() => true`; that function object is truthy and is never invoked. So
     `landed` is always a truthy function.
  3. Therefore `if (inserted && landed)` is **always true**, so the code reports
     success and (if `job.autoSend`) submits, even when the text never landed —
     violating product principle 2 ("never fail silently") and the landing-check
     rule in content-scripts.md. The `else` branch (toast "Insertion failed")
     is dead code.
- **Fix:** Use the real contract:
  ```js
  const result = window.ChatbotAdapters.insert(job.text, { mode: 'replace' });
  if (!result.ok) { /* toast + compare_status failure */ return; }
  const check = result.check;
  const landed = typeof check === 'function' ? check() : true;
  ```
  (and keep the short retry used elsewhere via `confirmLanded`). Only submit
  after `landed` is confirmed.

---

## HIGH

### H1. Palette "Alt+C to compare" never fires on macOS (Option+C → "ç")
- **File:** `content/commandPalette.js:559` (in `handlePaletteKeydown`)
- **Evidence:**
  ```js
  if (e.altKey && (e.key === 'c' || e.key === 'C')) { ... activateCompare(selectedIndex); ... }
  ```
- **Why wrong:** This is the exact bug the hotkey matcher was written to avoid
  (see `matchesHotkey` comment: "`code` survives … Option-key remapping on
  macOS, where Alt+K produces '˚'"). On macOS, Option+C emits `e.key === 'ç'`,
  so the compare shortcut advertised in the footer (`Alt+C compare`,
  commandPalette.js build HTML) does nothing for Mac users. The footer label
  also shows "Alt+C" rather than "⌥C" on macOS.
- **Fix:** Match `e.code === 'KeyC' && e.altKey` (and gate out other modifiers),
  mirroring `matchesHotkey`. Render the label as `⌥C` when
  `OmniStore.isMacPlatform()`.

### H2. Compare pending-job retry window (12 s) is shorter than the worker's TTL (120 s), but TTL is checked *before* retries can help
- **File:** `content/content.js:884-886` vs `background/background.js:662-666`
- **Evidence:**
  content: `const timeoutMs = 12000; const checkInterval = 250;`
  background: `const COMPARE_TTL_MS = 2 * 60 * 1000;` and in `get_pending_compare`
  the job is **removed immediately** (`await sessionRemove(key);`) then TTL-checked.
- **Why wrong:** `get_pending_compare` deletes the job on first read, so the
  12 s composer-wait loop in `attemptInsert` has only one job fetch to work
  with (good), but on a slow-loading AI site (sign-in, SPA hydration) 12 s is
  frequently too short for first paint of the composer; after that the job is
  already consumed and cannot be retried on reload. Combined with C1 the whole
  path is moot today, but once C1 is fixed this will surface as "Composer not
  found" on cold tabs.
- **Fix:** Raise `timeoutMs` to ~30 s and/or have the worker keep the job until
  a `compare_status` success arrives (delete on ack rather than on read), so a
  reload can re-fetch within the 120 s TTL.

### H3. No focus trap in the palette or variable modal (Tab escapes the overlay)
- **File:** `content/commandPalette.js` (`build`/`handlePaletteKeydown`),
  `content/variableModal.js` (`build`)
- **Evidence:** `handlePaletteKeydown` handles Arrow/Home/End/Enter/Escape but
  has no `Tab` case; the modal `build()` binds `escHandler` (Escape only) and
  field-level keydown but never traps Tab. Both set `role="dialog"
  aria-modal="true"`.
- **Why wrong:** With `aria-modal="true"` declared, keyboard focus is expected
  to stay inside the dialog. Here Tab moves focus into the host page behind the
  overlay (the overlay is in a shadow root but the page remains focusable),
  which is an accessibility defect and lets keystrokes reach the page under an
  "modal" overlay.
- **Fix:** Add a Tab handler that cycles between the first and last focusable
  controls within the dialog (query the shadow dialog, wrap on Shift+Tab/Tab).

---

## MEDIUM

### M1. `insert`/`replaceRange` return `check` but direct popup inserts don't retry on rich editors — acceptable, but `confirmLanded` not used in compare path
- **File:** `content/content.js:905-949` (`checkPendingCompare`)
- **Evidence:** The main path uses `confirmLanded(result)` (180 ms retry for
  Lexical etc.), but the compare path hand-rolls its own check (see C3) without
  the retry.
- **Why wrong:** Even after C3 is fixed, a single synchronous `check()` will
  miss editors that commit a tick later (the very reason `confirmLanded` exists).
- **Fix:** Route the compare insert through the shared `writeToPage` /
  `confirmLanded` so Lexical/ProseMirror late-commit is handled consistently.

### M2. Compare uses `mode: 'replace'` on fresh-chat tabs — correct, but not guarded if the target tab isn't actually empty
- **File:** `content/content.js:916`, targets from `adapters.COMPARE_TARGETS`
- **Evidence:** `insert(job.text, { mode: 'replace' })`. `COMPARE_TARGETS`
  URLs are fresh-chat endpoints (e.g. `https://claude.ai/new`), so replace is
  intended and safe there.
- **Why wrong (nuance):** If the user navigated the compare tab elsewhere before
  the composer resolved, `replace` would wipe any draft they started — a
  principle-1 ("never destroy the draft") edge case. Low likelihood given the
  tab is freshly opened by the worker.
- **Fix:** Prefer `mode: 'caret'` into a known-empty composer, or only `replace`
  when `readValue(target).trim() === ''`.

### M3. `handleFocusOut` in slash menu uses a 0 ms timeout race to detect focus moving into the menu, but the menu is not focusable
- **File:** `content/slashTrigger.js:168-183`
- **Evidence:**
  ```js
  function handleFocusOut(e) {
    if (!isOpen) return;
    if (e.target === activeElement) {
      window.setTimeout(() => { ... if (active === activeElement) return; close(); }, 0);
    }
  }
  ```
- **Why wrong:** The menu rows are plain `<li>`/`<div>` with mousedown handlers
  and are never focused, so this handler always closes on blur. That's mostly
  fine (mousedown fires before focusout), but on editors that move focus
  asynchronously the 0 ms check can close before a tap registers. It works
  today because `bindRows` uses `mousedown` + `preventDefault`; the comment even
  says so. Flagging as fragile, not broken.
- **Fix:** Prefer the existing `handlePointerDown` composedPath check as the
  single close-on-outside path and drop the focusout timer, or verify against
  `composedPath()` including the menu.

### M4. Slash menu never destroyed; viewport listeners are per-open but `input`/`keydown`/`pointerdown` document listeners are never removed
- **File:** `content/slashTrigger.js:117-123` (`init` adds document listeners),
  no teardown
- **Evidence:** `init` registers `input`, `compositionend`, `keydown`,
  `pointerdown`, `focusout` on `document` in capture phase and there is no
  `destroy()`. The module is a singleton booted once, so this is not a leak
  across reinjection (guarded by `__OMNIPROMPT_LOADED__`), but `configure` can
  be called repeatedly and never rebinds — fine. The real nuance: these capture
  listeners run on *every* keystroke on the host page for the life of the tab.
- **Why wrong:** Acceptable for a singleton, but `handleInput`/`handleKeyDown`
  run on every event even when `enabled === false` (they early-return, so cost
  is low). No functional bug; noting for completeness since the task asked about
  leaks. **Not a defect.**
- **Fix:** None required. (Listed to show it was checked.)

### M5. `showToast` sets `innerHTML` then overwrites with `textContent` — safe, but the icon span is static HTML; message is correctly escaped
- **File:** `content/content.js:1001-1004`
- **Evidence:**
  ```js
  toast.innerHTML = '<span class="toast-icon">' + icon + '</span><span></span>';
  toast.querySelector('span:last-child').textContent = message;
  ```
- **Why wrong:** `icon` is a fixed emoji from a literal switch (`⚠️/✓/⚡`), and
  `message` goes through `textContent`, so there is no injection. **Not a
  defect** — verified the untrusted part (`message`) is not interpolated into
  `innerHTML`.
- **Fix:** None. (Checked per the innerHTML concern in the brief.)

---

## LOW

### L1. Variable modal footer hint shows "Ctrl/⌘ ↵ inserts" but Enter in a single-line field also inserts without that chord
- **File:** `content/variableModal.js:220-235` (keydown) and footer hint
- **Evidence:** `if (e.key === 'Enter' && field.tagName === 'INPUT') { e.preventDefault(); finish({submit:false}); }`
- **Why wrong:** Minor UX/doc mismatch: plain Enter on an `<input>` already
  inserts, so the advertised `Ctrl+↵` is only needed from textareas. Not a bug,
  but the hint under-describes behaviour.
- **Fix:** Clarify the hint, or restrict plain-Enter insert to avoid surprising
  users mid-field.

### L2. `pasteKeyLabel`/`isMac` detection relies on `navigator.platform` (deprecated) with `userAgentData` fallback — ordering is backwards
- **File:** `content/content.js:363-366`, `content/variableModal.js:60-66`
- **Evidence:** `(navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform`
- **Why wrong:** This order is actually correct (UA-CH first). No defect; noting
  that `userAgentData.platform` can be empty string `''` which is falsy and
  correctly falls through to `navigator.platform`. **Not a defect.**
- **Fix:** None.

### L3. Site rules correctly use only `location.hostname`
- **File:** `content/slashTrigger.js:291` (`const host = ... location.hostname`),
  `content/commandPalette.js` (`const host = ... location.hostname`)
- **Evidence:** Both pass `host: location.hostname` into `store.search`. No use
  of full URL or path for host matching. **Verified OK**, per the brief's
  site-rules check.

---

## Verified OK (checked, no defect)

- **Shadow DOM isolation:** all overlays append to `shadowRoot` on
  `#omniprompt-root`; host has `all:initial !important`, `z-index 2147483647`;
  `content.css` re-declares tokens on `:host([data-omni-theme='dark'])`
  (content.css:62). Slash menu is `position:fixed; z-index:2147483647`
  (content.css:122-124), matching the viewport-coordinate positioning in
  `slashTrigger.position()`.
- **Lib API surface:** every called `OmniStore.*` exists in the export block
  (promptStore.js:4757-4935): `formatHotkey`, `isMacPlatform`, `getValueSources`,
  `getLastCompareTargets`, `setLastCompareTargets`, `rememberValues`,
  `getChainStep`, `searchChains`, `prepareForUse`, `getCategoryMeta`,
  `getRecent`, `getFavorites`, `getWorkspaces`, `getActiveWorkspace`,
  `setActiveWorkspace`, `getWorkspace`, `getVariableSets`, `saveVariableSet`,
  `watchStorage`, `onChange`, `getCompareTargets`, `recordUse`, `getById`,
  `isSiteDisabled`, `reload`, `setPendingDraft`, `search`, `isFavorite`,
  `isPro`. Every called `OmniTemplate.*` exists (template.js): `variableCount`,
  `buildInitialValues`, `autofillBadge`, `render`.
- **Message action names content→background that DO match:**
  `open_editor_with_draft` (bg:509), `get_pending_compare` (bg:649),
  `compare_status` (bg:671), `start_compare` (bg:538 — action matches; only the
  *payload fields* are wrong, see C1).
- **Content-directed actions** (`open_palette`, `insert_prompt`, `apply_modifier`,
  `open_compare`, `start_chain`, `save_as_prompt`, `settings_changed`) are
  handled in `content/content.js:handleMessage` and relayed by the worker via
  `relay_to_active_tab`/`broadcast_settings`; they are not expected in the
  worker switch. OK.
- **IME handling:** slash, palette and modal all guard `e.isComposing ||
  e.keyCode === 229` before acting on Enter/Esc/arrows.
- **Caret-safe insertion:** default mode `caret`; `replaceBeforeCaret` /
  `rangeBeforeCaret` avoid `execCommand('delete')` and marker nodes;
  `captureCaret`/`restoreCaret` used across modal focus steals.
- **Escape stickiness in slash menu:** `dismissedToken = query` on Escape and
  the `handleInput` guard `dismissedToken === hit.query`.
- **Palette double-open guard:** `toggle()` 300 ms debounce for the dual
  in-page + browser-command keypress.
- **Listener accumulation:** palette/modal build overlay once; viewport scroll/
  resize handlers in slash menu are added on open and removed on close
  (`attach/detachViewportHandlers`).

---

## Priority order
1. **C1** start_compare field mismatch (feature dead from the in-page modal).
2. **C2** findActiveComposer missing (chain runner always degraded).
3. **C3** compare insert/landing check always "succeeds" (silent failure, can auto-send unlanded text).
4. **H1** macOS Alt+C compare shortcut dead.
5. **H2** compare retry window too short / job consumed on first read.
6. **H3** no focus trap in aria-modal dialogs.
7. M1–M3 compare robustness and replace-mode nuance.
8. L1–L3 cosmetic / verified-OK notes.
