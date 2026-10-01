# OmniPrompt audit — background + popup + manifest

Scope: `manifest.json`, `background/background.js`, `popup/popup.html`, `popup/popup.js`, `popup/popup.css`.
Method: read each file in full; cross-checked every `OmniStore.*` / `OmniTemplate.*` / `ChatbotAdapters.*` call against `lib/` and `content/` (grep + AST). Read-only; no source edited.

Cross-check result: all `OmniStore.*`, `OmniTemplate.*` (`variableCount`, `listBlocks`, `buildInitialValues`, `autofillBadge`, `parseVariables`, `render`) and the `ChatbotAdapters` members used do exist. No missing-symbol defects. Defects below are behavioural.

Severity legend: **S1** broken feature / data-affecting · **S2** real bug, degraded behaviour · **S3** robustness / cross-browser · **S4** minor / cosmetic.

---

## S1 — Compare landing check is dead code; `landingCheck` is misused

**File:** `content/content.js` (compare boot, ~`content/content.js:958-962`), API in `content/adapters.js:509-519`.

Evidence — the Compare insertion path:
```js
const inserted = await window.ChatbotAdapters.insert(job.text, { mode: 'replace' });
const landed = window.ChatbotAdapters.landingCheck ? window.ChatbotAdapters.landingCheck() : true;
if (inserted && landed) { ... success, maybe submit ... }
```
Adapter definition:
```js
// adapters.js:509
function landingCheck(element, text, mode) {
  const probe = probeOf(text);
  if (!probe) return () => true;      // called with no args => probe '' => returns a FUNCTION
  const before = countProbe(element, probe);
  return () => { ... after > before ... };   // landingCheck RETURNS a checker function
}
```
`landingCheck` returns a *function*, and the real path proves it: `writeToPage` uses `result.check` from `insert()` and runs it inside `confirmLanded(result)` (`content/content.js:118`, `typeof result.check !== 'function'`). The Compare path instead calls `landingCheck()` with **no arguments**, so `probe` is `''`, it returns `() => true`, and `landed` is bound to that function reference — always truthy.

**Why it matters:** the compare "did the prompt actually land?" verification never runs. A composer that silently swallows the text (or auto-send firing on an empty box) is reported as `success:true` and, with auto-send on, can submit an empty/failed message. Also `insert()` here is `await`-ed but it is **synchronous and returns an object `{ ok, ... }`**, not a boolean — `inserted` is a truthy object regardless of `ok`, so a failed write (`{ ok:false }`) is also treated as success.

**Fix:** mirror the proven path. Capture the result object and use its own checker:
```js
const result = window.ChatbotAdapters.insert(job.text, { mode: 'replace' });
if (!result.ok) { /* report failure, toast, return */ }
const landed = typeof result.check === 'function' ? result.check() : true;
```
Prefer calling the shared `confirmLanded(result)` (with its short retry) rather than a one-shot check, since Lexical/rich editors commit a frame later.

---

## S2 — Compare window tiling ignores `availLeft` / `availTop` (multi-monitor / taskbar offset)

**File:** `background/background.js:556-603` (tiled branch); dims sent from `content/variableModal.js:885-886`.

Evidence:
```js
const screenW = Math.max(800, Number(request.screenWidth) || 1440);   // availWidth
const screenH = Math.max(600, Number(request.screenHeight) || 900);   // availHeight
...
const left = Math.round(col * colW);   // origin assumed 0,0
const top  = Math.round(row * rowH);
```
The page sends `screen.availWidth/availHeight` only (`variableModal.js:885`); `availLeft`/`availTop` are never sent or used.

**Why:** on a secondary monitor (common for a tiled compare layout) or with a left/top-docked taskbar, the usable origin is not `(0,0)`. Windows tile onto the wrong display or under the taskbar. `chrome.windows.create` clamps off-screen coords, collapsing the intended grid.

**Fix:** send `screen.availLeft` and `screen.availTop` from the page and offset: `left = availLeft + col*colW`, `top = availTop + row*rowH`.

---

## S2 — Compare tiled windows can fall below Chrome's minimum width

**File:** `background/background.js:560-564`.

Evidence:
```js
const cols = N <= 3 ? N : Math.ceil(N / 2);
const colW = Math.floor(screenW / cols);
...
const width = Math.round(colW);   // no lower bound
```
With `N` up to 6, `cols` can be 3; on a 1440-wide screen `colW` = 480, and on a 1280 laptop = ~426 — below the ~500px floor the brief itself calls for and below Chrome's practical minimum. Chrome silently enforces its own minimum, so widths differ from the computed grid and tiles overlap.

**Why:** overlapping / mis-sized windows; the layout no longer matches the computed `cols/rows`.

**Fix:** clamp `width = Math.max(500, colW)` (and a sensible min height), and if `cols*500 > screenW`, reduce `cols` so tiles stay ≥500 or fall back to the `tabs` layout.

---

## S2 — `compare_status` is a no-op; no summary returned to the origin tab

**File:** `background/background.js:671-673`; senders `content/content.js:946-971`.

Evidence:
```js
case 'compare_status':
  sendResponse({ ok: true });
  return false;
```
Each target tab reports `success/targetId/message`, but the worker neither records nor aggregates them, and nothing is routed back to the tab that started the run. The design/brief (`.agents/.../design.md:97`, `report.md:55`) specify a status summary back to the originator.

**Why:** the user gets no "4 of 6 inserted, 2 need sign-in" summary; silent partial failure, which the product principles explicitly forbid ("never fail silently").

**Fix:** store the origin tabId on the job, accumulate per-job results in `storage.session`, and when all targets report (or TTL elapses) send one summary message/toast back to the origin tab.

---

## S3 — Service-worker `importScripts` omits `lib/theme.js` while CONTENT_SCRIPTS lists it (asymmetry; benign today)

**File:** `background/background.js:36-41` vs `background/background.js:168-179`.

Evidence: `importScripts('../data/defaultPrompts.js','../lib/template.js','../lib/modifiers.js','../lib/promptStore.js')` — no `theme.js`. `CONTENT_SCRIPTS` (injected list) *does* include `lib/theme.js`. The worker never references `OmniTheme`, so this is currently fine, but the two lists diverging is exactly what `structure.md` warns against ("`CONTENT_SCRIPTS` must equal this list"). Note `promptStore.js` loads after `template.js`/`modifiers.js`, matching its runtime dependency order — good.

**Why:** future code that calls `OmniTheme` in the worker would throw; drift risks a tested invariant.

**Fix:** no runtime bug; add a comment that `theme.js` is intentionally not imported by the worker, or keep the lists checked by the test as they are. (`CONTENT_SCRIPTS` already equals the manifest content-script list — verified.)

---

## S3 — `onInstalled` catch rebuilds menus but skips dynamic-script reconcile

**File:** `background/background.js:452-470`.

Evidence:
```js
self.OmniStore.init()
  .then(() => buildContextMenus())
  .then(() => reconcileDynamicScripts())
  .then(() => self.OmniStore.takeSnapshot(...))
  .then(() => injectIntoOpenTabs())
  .then(() => { if (details.reason === 'install') { ...welcome tab... } })
  .catch(() => { buildContextMenus(); });   // reconcile NOT re-attempted
```
If `OmniStore.init()` or `takeSnapshot` rejects, the catch restores the menu but never calls `reconcileDynamicScripts()`. On a reinstall where the user had granted `<all_urls>` or per-site origins, the dynamic content scripts may be left unregistered until the next `onStartup`.

**Why:** after a failed update path, "every website" / per-site injection silently stops working until a browser restart.

**Fix:** in the catch, also attempt `reconcileDynamicScripts()` (independently guarded), or restructure so reconcile runs regardless of snapshot success.

---

## S3 — `window.confirm` for unsaved-changes / restore inside the popup can be swallowed

**File:** `popup/popup.js` — `selectTab` (`if (!window.confirm('Discard unsaved changes...'))`), `cancelBtn` handler, `restoreDefaults` (`if (!window.confirm(message)) return;`).

Evidence: three `window.confirm(...)` calls in the popup. A browser-action popup closes on blur; in some Chromium builds a modal dialog raised from popup context steals focus and the popup is torn down, so the handler never resolves (the branch after `confirm` never runs, or runs against a destroyed DOM).

**Why:** the unsaved-changes guard and the "Restore built-ins" confirmation can be unreliable in the popup; the file header itself notes "No native prompt()/confirm() ... can close the popup" yet `confirm` is still used for these flows.

**Fix:** replace with the existing in-popup modal pattern (an inline confirm card / the modal backdrop already present), as the header comment intends.

---

## S3 — Cross-browser: store-page excludes miss `chrome.google.com/webstore` and Opera/Arc stores

**File:** `manifest.json` (`content_scripts[0].exclude_matches` and `background/background.js:206-210` `EXCLUDE_MATCHES`).

Evidence (both lists):
```
*://chrome.google.com/webstore/*
*://chromewebstore.google.com/*
*://microsoftedge.microsoft.com/addons/*
```
`chrome.google.com/webstore/*` is present (good) but `addons.opera.com` is not excluded, and dynamic `<all_urls>` injection will try to run on it. Chrome blocks injection on the new web store and on `chrome.google.com/webstore` by policy regardless, but Opera's and Edge's add-on galleries are ordinary pages — injecting there is at best wasted and at worst flagged by store review.

**Why:** needless injection on competitor/first-party store pages; Edge is covered, Opera is not. Also note no handling difference for `chrome://`, PDF viewer, or `view-source:` beyond relying on `executeScript` rejecting — which is handled quietly (`void chrome.runtime.lastError`), so that part does **not** fail silently to the user incorrectly (acceptable).

**Fix:** add `*://addons.opera.com/*` (and optionally `*://microsoftedge.microsoft.com/*`) to both `exclude_matches` and `EXCLUDE_MATCHES`. Keep the two lists identical.

---

## S3 — `showDirectoryPicker` / folder sync and `sidePanel` are out of scope here but noted

**File:** manifest / popup do not use `chrome.sidePanel` or `showDirectoryPicker` — confirmed absent from the audited files. Folder sync lives in the options page. No defect in scope; Brave disabling the File System Access API is an options-page concern, not background/popup. Noted so the orchestration knows it was checked.

---

## S4 — `web_accessible_resources` matches `<all_urls>` (broader than needed)

**File:** `manifest.json` web_accessible_resources.

Evidence:
```json
"resources": ["content/content.css"],
"matches": ["<all_urls>"]
```
Only one CSS file is exposed (minimal resource list — good), but `<all_urls>` exposes its URL (and the extension id, via the resource URL) to every page. Because the content script is injected on curated hosts + opt-in origins, the WAR match set could be narrowed to the same hosts to reduce fingerprinting surface.

**Why:** minor privacy/fingerprinting surface; functionally correct.

**Fix:** optionally scope `matches` to the content-script host set (and the dynamic origins). Low priority; a single stylesheet is low-risk.

---

## S4 — Mac command key: correct, verified

**File:** `manifest.json` commands.

Evidence:
```json
"suggested_key": { "default": "Ctrl+Shift+K", "mac": "Command+Shift+K" }
```
`mac` override uses `Command+Shift+K` (valid MV3 token). This is a documented default and may collide with Chrome DevTools "Console" (`Ctrl+Shift+J` is console; `Ctrl+Shift+K` is free in Chrome but is a Firefox-ism) — Chromium leaves `Ctrl+Shift+K` unassigned, so no conflict on Chromium. The README documents this as changeable at `chrome://extensions/shortcuts`. **No defect.** README and manifest agree on the two shortcuts.

---

## Verified-correct items (checked, no defect)

- **Top-level listener registration:** `onInstalled`, `onStartup`, `commands.onCommand`, `runtime.onMessage`, `permissions.onAdded/onRemoved`, `tabs.onRemoved`, `storage.onChanged`, `contextMenus.onClicked` are all registered synchronously at module top level — correct for MV3 SW wakeups.
- **No lost global state:** compare jobs live in `chrome.storage.session` keyed by tabId (`COMPARE_JOB_PREFIX`), with a 2-minute TTL (`COMPARE_TTL_MS`) checked on read, and cleaned up on `tabs.onRemoved`. No cross-wakeup state is held in a plain global.
- **`storage.session` + content scripts:** content never reads `storage.session` directly; it asks the worker via `get_pending_compare` (`content/content.js:922`), so the default `TRUSTED_CONTEXTS` access level is **not** a problem. No `setAccessLevel` needed. Correctly designed.
- **Async `onMessage` returns `true`** for `relay_to_active_tab`, `broadcast_settings`, `inject_into_tab`, `start_compare`, `get_pending_compare`; returns `false` for the synchronous `open_editor_with_draft` and `compare_status`. Correct.
- **contextMenus duplicate-id:** `buildContextMenus()` does `removeAll()` then `create()`, wrapped in a Promise, and is the single rebuild path (install, startup, and `storage.onChanged` for license/customModifiers). Rebuilds are serialized through `storage.onChanged` → `buildContextMenus`; each `removeAll` precedes `create`, so no duplicate-id throw. (Minor: concurrent `storage.onChanged` bursts could interleave two rebuilds; `removeAll` makes it self-healing, so low risk.)
- **Dynamic scripts:** `reconcileDynamicScripts()` on startup, register/unregister on `permissions.onAdded/onRemoved`, `persistAcrossSessions:true`, `excludeMatches` applied, id derived deterministically from origin. Matches track host perms.
- **On-demand injection** (command + context menu): send → on `no-content-script` inject → retry → `notifyUnavailable` badge. Does not fail silently.
- **Popup keyboard nav:** ArrowUp/Down, Enter inserts, Shift+Enter copies, Escape clears search then closes; IME guard (`isImeKey`, keyCode 229) present.
- **`activeTab` tab URL:** `getActiveHost()` guards non-http(s) and malformed URLs; "Turn on for this site" calls `chrome.permissions.request` inside the click handler (user gesture) — correct.
- **Pro gating:** compare/workspaces/chains each check `store.isPro()` and open the upgrade page otherwise.
- **Copy fallback:** `copyText` uses `navigator.clipboard.writeText` with a boolean fallback; insert failures fall back to copy with an honest toast. No `clipboardRead` permission requested (only explicit Paste reads clipboard).
- **CSP:** `script-src 'self'; object-src 'self'; connect-src 'self' https://live.dodopayments.com https://test.dodopayments.com` — no remote script, connect limited to Dodo. Correct.
