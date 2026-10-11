---
inclusion: fileMatch
fileMatchPattern: 'lib/**'
---

# Store, data safety and licensing rules

`lib/promptStore.js` is the single source of truth for everything persisted. Losing user data is the most severe complaint in this product category, so every change here is treated as data-handling work.

## Data model (schema v2)
- Built-in prompts are immutable code in `data/defaultPrompts.js`. Only user deltas are stored: `userPrompts`, `defaultPatches` (per-id edits limited to `PATCHABLE_FIELDS`), `hiddenDefaults`.
- "Restore built-ins" clears `defaultPatches` and `hiddenDefaults` only. It must never touch `userPrompts`.
- Deleting a built-in hides it; deleting a user prompt removes it.
- Imports never overwrite a built-in, skip malformed rows, and de-duplicate on title + template.
- Legacy v1 keys are read once by migration and left on disk as a recovery path. Do not delete them, and do not read them outside migration.
- Bump `SCHEMA_VERSION` and write a one-time migration if the stored shape changes. Old data must keep loading.

## Safety nets
- Take a snapshot (`SNAPSHOT_LIMIT = 7`) before any destructive or replacing action: replace-mode import, restore built-ins, restoring an older backup, extension update. Also once a day.
- Version history keeps `HISTORY_LIMIT = 20` entries per edited prompt.
- Snapshots, history, backup metadata, pending draft and the licence are local-only and never synced.
- "Erase all my data" requires confirmation plus typing `ERASE`.

## Sync
- Opt-in only (`syncEnabled: false` by default). Writes are chunked to fit Chrome sync quotas (8 KB per item, ~100 KB total); surface quota errors clearly rather than dropping data.

## Settings
- Defaults in `DEFAULT_SETTINGS`; stored values are validated against them on load (`applyLoaded`). New settings need a safe default and validation.
- `autoSubmit` and `clipboardAutofill` default to off.

## Free limit and Pro
- `FREE_CUSTOM_LIMIT = 20`. Enforce only at creation (`savePrompt`, `duplicatePrompt` throw `LIMIT_REACHED` unless `bypassLimit`). Never block reading, inserting, editing, exporting or backing up existing prompts.
- File imports on Free add up to the limit and report the rest as `overLimit`. A replace import may always restore as many prompts as the user already had. Snapshot restores and sync merges are the user's own data and are not capped.
- Check Pro with `isPro()`, `isLimitReached()`, `canCreatePrompt()`. UI reads price and checkout link from `getProInfo()`.
- Licensing talks only to Dodo Payments (`DODO_ENDPOINTS`): `activateLicense`, `validateLicense`, `deactivateLicense`. These are the only `fetch` calls in the extension.
- Never add hard-coded, offline or test bypass keys. The Dodo environment comes only from `DODO_MODE` (`'test'` or `'live'`); callers cannot switch it. `isPro()` ignores a licence whose `testMode` does not match `DODO_MODE`, so a test-card key never unlocks a live build. Ship with `DODO_MODE = 'live'`.
- Pro-only store APIs reject with `{ code: 'PRO_REQUIRED', feature }` (feature: `workspaces`, `sets`, `chains`, `sync`, `library`, `blocks`). Version history restore is free: it is the user's own data. Reading, exporting and deleting Pro data (workspaces, chains, value sets, folders) never needs Pro.
- Pro keys: `omni.workspaces`, `omni.variableSets`, `omni.chains` and `omni.tombstones` are synced, exported and snapshotted like prompts. `omni.lastValues` (remembered short answers; never textareas or auto-filled fields) and `omni.folderSyncMeta` are local-only.
- Deleting a user prompt, workspace or chain writes a tombstone. `mergeRemote` (Chrome sync and folder sync) removes a local item only when a tombstone is newer than its last edit, and takes a `before-sync` snapshot first. Restores and imports revive what they bring back.
- The same Dodo business sells other products, and Dodo's public activate endpoint accepts any of its keys. A licence counts only when `product.product_id` from the activate response is in `PRO_PRODUCT_IDS` (checked in `activateLicense` and in `isPro()`). A wrong-product key is refused with `WRONG_PRODUCT` and its new instance is deactivated. Never remove or bypass this check.
- Network errors must degrade gracefully (keep current Pro state, show a clear message), never wipe the licence silently.

## Style reminder
This directory is strict ES5 (`var`, `function`, no arrows/let/const/async). Emit changes through the store's event emitter (`emit('...')`) so all surfaces refresh, and isolate listener errors.
