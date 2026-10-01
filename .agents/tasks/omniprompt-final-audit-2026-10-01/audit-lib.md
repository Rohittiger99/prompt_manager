# OmniPrompt lib/ audit — audit-lib

Read-only senior JS review of `lib/promptStore.js`, `lib/template.js`, `lib/modifiers.js`, `lib/importers.js`, `lib/theme.js`. Baseline: `node test/verify.js` → **1014 passed, 0 failed**. Every finding below was verified by reading the code and, where noted, by running a throwaway script against `test/harness.js` (`createStoreRealm`). Scratch scripts were deleted after use.

---

## CRITICAL

### C1. `watchStorage()` wipes `customModifiers`, `siteRules` and `customCategories` from memory on any external storage change, then the next DELTA persist writes `[]` to disk — permanent data loss

**File:** `lib/promptStore.js`

**Evidence — the reload key list is incomplete** (`watchStorage`, ~line 2900):
```js
localGet([
  K.schemaVersion, K.userPrompts, K.defaultPatches, K.hiddenDefaults,
  K.folders, K.favorites, K.usage, K.settings, K.settingsUpdatedAt,
  K.license, K.history, K.workspaces, K.variableSets, K.chains,
  K.tombstones, K.lastValues
]).then(function (res) {
  applyLoaded(res);
  emit('external');
});
```
This list omits `K.customCategories`, `K.customModifiers` and `K.siteRules`.

**Evidence — `applyLoaded` resets any missing key to `[]`** (~line 650):
```js
state.customModifiers = (Array.isArray(res[K.customModifiers]) ? res[K.customModifiers] : []) ...
state.siteRules       = (Array.isArray(res[K.siteRules]) ? res[K.siteRules] : []) ...
state.customCategories = Array.isArray(res[K.customCategories]) ? res[K.customCategories] : [];
```
Because the keys are absent from `res`, each branch takes the `[]` fallback.

**Why it is wrong:** `chrome.storage.onChanged` fires whenever *any* surface (another tab, the popup, the options page, even this instance's own `localSet` of an unrelated `omni.*` key such as `omni.favorites` or `omni.usage`) writes. The watcher then calls `applyLoaded` with a partial read, zeroing the three keys **in memory**. The data is still on disk at that instant — but the next write path that persists `DELTA_KEYS` (which includes `customModifiers` and `siteRules` via `pick()`), i.e. `mergeRemote` (sync pull), `importBundle`, `restoreSnapshot`, `eraseAllData`, flushes the empty in-memory arrays back to disk. The backup/export written afterwards is also empty.

**Verified (harness):**
- After `watchStorage()` + an external `omni.favorites` write: `getCustomModifiers()` and `getSiteRules()` → `[]`; `getCustomCategories()` → `[]` (a `MyCat` category created moments earlier was gone).
- After the above + `mergeRemote({userPrompts:[{...}]})`: on-disk `omni.customModifiers` and `omni.siteRules` were overwritten with `[]`.

`customCategories` has a partial safety net (`if (state.customCategories.length === 0 && state.folders.length > 0)` rebuilds from folders), so categories backed by a same-named folder survive, but standalone custom categories do not. Categories/folders are a **Free** feature, so this hurts Free users too.

**Fix:** Add `K.customCategories, K.customModifiers, K.siteRules` (and for safety `K.compareTargets`, `K.folderSyncMeta`, `K.backupMeta` are local-only and not in `applyLoaded`, so only the three state-backed keys matter) to the `localGet([...])` array in `watchStorage`. Simplest and least error-prone: have `watchStorage` request the **same key set that `applyLoaded` consumes** (or pass `null` to fetch all and let `applyLoaded` read what it needs). Guard against future drift by deriving the list from a single constant used by both `load()`, `watchStorage()` and `applyLoaded()`.

---

## MEDIUM

### M1. `customModifiers` and `siteRules` never propagate through Chrome sync or folder sync

**File:** `lib/promptStore.js`

**Evidence — `syncPayload()` (~line 2630) omits them:**
```js
function syncPayload() {
  return {
    v: SCHEMA_VERSION, at: Date.now(), settingsAt: state.settingsUpdatedAt || 0,
    userPrompts: ..., defaultPatches: ..., hiddenDefaults: ...,
    customCategories: ..., folders: ..., favorites: ...,
    workspaces: ..., variableSets: ..., chains: ..., tombstones: ..., settings: ...
  };               // no customModifiers, no siteRules
}
```
`mergeRemote` likewise has merge branches for `userPrompts/defaultPatches/hiddenDefaults/customCategories/folders/favorites/workspaces/chains/variableSets/settings` but **none** for `customModifiers` or `siteRules` (grep: `remote.customModifiers` / `remote.siteRules` have zero matches).

**Evidence — `folderSyncMerge` (~line 2460) does not pass them to `mergeRemote`:**
```js
merge = mergeRemote({
  userPrompts: data.prompts, defaultPatches: ..., hiddenDefaults: ...,
  customCategories: ..., folders: ..., favorites: ...,
  workspaces: ..., variableSets: ..., chains: ..., tombstones: ...
}, { settings: false, reason: 'folder-synced' });   // customModifiers/siteRules dropped
```
`exportBundle` *does* include `customModifiers` and `siteRules` (so they are in the file written to the sync folder), but the merge-in path ignores them.

**Why it is wrong:** Custom modifiers and site rules are advertised Pro cross-device data. A Pro user who sets them on machine A will never see them appear on machine B via either sync mechanism, even though the folder-sync file contains them. Silent, confusing, and inconsistent with export/import (which do carry them).

**Fix:** Add `customModifiers` and `siteRules` to `syncPayload()`; add `mergeById(state.customModifiers, remote.customModifiers, sanitiseCustomModifier, buried)` and the equivalent for `siteRules` to `mergeRemote` (they already have `id` + `updatedAt`, so `mergeById` fits); include them in the `folderSyncMerge` object passed to `mergeRemote`. Keep the 8 KB-per-item sync budget in mind (see note N1).

### M2. Import revives tombstones only for prompts, not for workspaces/chains/modifiers/rules

**File:** `lib/promptStore.js`, `importBundleNow` (~line 1500)

**Evidence:**
```js
if (reviveItems(state.userPrompts) || proAdded.workspaces || proAdded.chains || ...) {
  keys.push(K.tombstones);
}
```
Only `reviveItems(state.userPrompts)` is called. `importProData` pushes new workspaces/chains with fresh ids, but if a user imports a backup containing an item whose **id still carries a tombstone** (e.g. deleted on this device, then re-imported with the same id), the tombstone is not cleared. `restoreSnapshot` correctly calls `reviveItems` on all five lists; import does not.

**Why it is wrong:** A later sync pull can re-delete the just-imported item because its tombstone (newer than the item’s `updatedAt`) still buries it. `restoreSnapshot` handles this; `importBundle` is inconsistent.

**Fix:** After `importProData`, call `reviveItems(state.workspaces)`, `reviveItems(state.chains)`, `reviveItems(state.customModifiers)`, `reviveItems(state.siteRules)` as `restoreSnapshot` does, and push `K.tombstones` when any returns true.

---

## LOW / INFORMATIONAL

### L1. `recordUse` is a non-atomic read-modify-write on in-memory `state.usage`
`lib/promptStore.js` ~line 1240: `recordUse` increments `state.usage[id].count` from in-memory state and `localSet`s it, without re-reading storage. Two tabs inserting the same prompt concurrently will lose one increment (last writer wins). Usage is local-only ranking data, so impact is cosmetic (ranking drift), not correctness. Acceptable to leave, or re-read `omni.usage` before incrementing if precise counts ever matter.

### L2. Live Pro product id is still a placeholder (documented open item)
`PRO_PRODUCT_IDS.live = ['pdt_REPLACE_WITH_LIVE_OMNIPROMPT_PRO_ID']` and `PRO_CHECKOUT_URLS.live` likewise. `isPro()` requires `isAllowedProduct(...)`, so shipping with `DODO_MODE='live'` **before** filling these bricks all Pro activation (every real key returns `WRONG_PRODUCT`). This is already called out in `.kiro/steering/product.md` “Open items”; flagged here only so the release checklist is not missed. Not a code defect.

---

## Checked and found CORRECT (no action)

- **`template.js` `$&`/`$1`/`` $` `` safety** — `render` uses a replacer function; verified `{{code}}` = `a$&b$1c$`d` renders literally.
- **Smart templates** — `#if`/`#else` (value-equality and presence), `#repeat`, date math `+Nd/w/m/y` with month-end/leap clamping all render correctly; malformed/unbalanced `{{#if}}` renders literally without throwing; no catastrophic backtracking observed (`IF_RE` uses a non-nested-`#if` guard and a bounded 10-pass loop).
- **`{{date}}` / date math are LOCAL, not UTC** — both use `toLocaleDateString()` / `now.toLocaleDateString()`, not `toISOString()`. No timezone-rollover bug.
- **`{{time|10:30}}`** — colon-after-pipe is treated as a default, not a dropdown (`parseToken` checks `colonIdx < pipeIdx`). Correct.
- **Context blocks `{{@x}}` gating** — `prepareForUse` returns `locked: names` and leaves the template unchanged for non-Pro; only Pro calls `expandBlocks`. Self-reference guarded (`source.id === prompt.id` → null; `MAX_BLOCK_DEPTH`).
- **Free limit (20)** — verified: over-limit never locks/deletes; replace-import of the user’s own 25-prompt backup keeps all 25 (`room = max(FREE_CUSTOM_LIMIT, before)`); merge-import over the limit adds 0 and reports `overLimit`, inserting nothing destructive.
- **Licence offline handling** — `validateLicense` `.catch` and non-404 non-ok responses return `{ valid: isPro() }`, so Pro is **not** dropped when offline; only a hard 404 or `data.valid === false` demotes. No hard-coded/test-bypass keys in shipped code; `isPro()` enforces product id + matching Dodo mode (`testMode === isTestMode()`).
- **`isPro()` env isolation** — a test-mode licence cannot unlock a live build and vice-versa.
- **Importers** — CSV parser honours quoted fields, `""` escaping, embedded newlines, CRLF→LF, BOM strip (`replace(/^\uFEFF/, '')`), delimiter auto-detect; header with no recognisable column is rejected; malformed rows that lack template text are skipped (`mapRecord` returns null); SKILL.md checked before plain-text split so front-matter `---` is not shredded; **built-ins are never overwritten by import** (`if (builtinIds[p.id] || seenIds[p.id]) p.id = newId()`).
- **Site-rule wildcard matching + boost** — `hostMatchesRule` handles `*.` (sub- and root-domain) and exact match without substring false-positives; `getMatchedPromptIdsForHost` is Pro-gated; empty-query boost (`+100000`) groups site matches first, query boost (`+350`) is additive. Covered by passing tests §ranking.
- **`DELTA_KEYS` / export bundle / snapshot** — all include customModifiers, siteRules, workspaces, chains, variableSets, customCategories, folders, tombstones. `exportBundle` and `snapshotBundle` carry Pro data for everyone (“never held hostage”). The *gaps* are the sync paths (M1) and the `watchStorage` read (C1), not the bundle itself.
- **`eraseAllData`** writes emptied DELTA_KEYS, removes local-only keys, and clears the sync payload.
- **ES5 compliance** of `lib/*.js` — no arrow/let/const/template-literals/classes in the strict-ES5 libs reviewed.
