# Testing and doc-code coupling

## Running
`node test/verify.js` from the repo root. No framework or install needed; any current LTS Node works. The suite must pass (0 FAIL) before a change is considered done. The licensing tests use a fake `dodoFetch`, so no network is needed.

## Writing a test
- Helpers in `test/verify.js`: `section(title)`, `ok(cond, msg, detail)`, `eq(actual, expected, msg)`, `read(rel)`, `readCode(rel)` (source with comments stripped, for "must be absent" checks), `dodoFetch(validKeys)`.
- Realms from `test/harness.js`:
  - `H.createStoreRealm({ storageSeed, sharedSync, fetch })` loads `LIB_FILES` into a vm with fake `chrome.storage`. Call `await realm.sandbox.OmniStore.init()` first. Inspect storage with `realm.read(key)` / `realm.readSync(key)`.
  - `H.createAdapterRealm()` loads `content/adapters.js` into a minimal DOM; `realm.sandbox.makeTextarea(value)` gives a textarea with working selection.
- Add a `function testX()` (or `async`) with a numbered `section`, then call it from `main()`.
- Test behaviour by running the real code where possible; string checks on source are the fallback.

## Things the suite asserts that are easy to break
README.md (edit it carefully):
- Every `` `//shortcut` `` in the README must be a real shortcut in `DEFAULT_PROMPTS`, and there must be more than 50.
- It must contain `Alt+K`, `Ctrl+Shift+K` and the literal ``Type `//` ``.
- `NNN built-in prompts` must equal `DEFAULT_PROMPTS.length` (currently 136).
- It must name every permission: `storage`, `unlimitedStorage`, `contextMenus`, `scripting`, `activeTab`, `<all_urls>`.
- Mentioning duplicate, folder, categor(y), favourite or sync requires the matching `OmniStore` API.
- It must not contain `chatbot_pro`.

welcome/welcome.html must contain `Alt+K` and `Ctrl+Shift+K`. HTML pages must have balanced `<div>` tags, and no page may say "all 6 packs".

Library data: ≥110 prompts, unique ids and shortcuts, every prompt has `id`, `title`, `category`, `template`, `shortcut`, at least one variable, and no `|` inside a shipped `{{token}}`. Category counts are hard-coded (Coding 25, Writing 20, Clients 26).

Code: caret is the default insert mode; no `execCommand('delete')`; no marker nodes inserted to measure the caret; the content message listener is registered before `await window.OmniStore.init()`; no file except `lib/promptStore.js` touches legacy keys or makes network calls; `clipboardRead` is not requested; `activeTab` is requested for on-demand injection; host permissions match content scripts.

Repo hygiene: no root files starting with `_` or `scratch`, or ending in `.tmp`. Clean up any temporary files you create.

## When you change behaviour
Update README.md, PRIVACY.md, CHROMEWEBSTORE.md and the welcome page in the same change if they describe it, and keep claims literally true of the code.
