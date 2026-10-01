# Tech stack and conventions

## Stack
- Chrome Extension, Manifest V3. Service worker background, content scripts, popup, options page, welcome page.
- Plain JavaScript, HTML and CSS. No build step, no bundler, no npm, no `package.json`, no dependencies. Do not introduce any without asking.
- Every file is a classic script (no ES modules). The same `lib/` code runs in content scripts, extension pages (`<script src>`), the service worker (`importScripts`) and Node (tests).

## Commands (PowerShell, from the repo root)
- Run the full test suite: `node test/verify.js` (exits non-zero on any FAIL). Run it after every change.
- Regenerate icons: `node generate-icons.js` (writes `icons/icon16|48|128.png`).
- Manual check: load unpacked at `chrome://extensions`, enable "Allow access to file URLs", open `test/test-page.html`.
- Packaging is manual: zip the shipped folders (`manifest.json`, `background/`, `content/`, `data/`, `icons/`, `lib/`, `options/`, `popup/`, `styles/`, `welcome/`) into `dist/omniprompt-v<version>.zip`. Exclude `test/`, docs, `generate-icons.js`, `backups/`, `.git/`.

## Module patterns
`lib/template.js`, `lib/promptStore.js` (and similar libs): ES5 UMD-lite IIFE that publishes one `Omni*` global and a Node export.
```js
(function (root, factory) {
  'use strict';
  var api = factory();
  root.OmniStore = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  // ...
  return { /* public API */ };
});
```

`content/*.js` modules: ES2015+ revealing-module IIFE, then attach to `window`.
```js
const SlashTrigger = (() => {
  'use strict';
  // ...
  return { init, /* ... */ };
})();
if (typeof window !== 'undefined') { window.SlashTrigger = SlashTrigger; }
```

`content/content.js` is the coordinator: an anonymous IIFE guarded by `window.__OMNIPROMPT_LOADED__` so double injection is harmless.

`data/defaultPrompts.js` declares `const DEFAULT_PROMPTS` and assigns it explicitly to `window`, `self` and `globalThis`, plus `module.exports`.

Globals: `DEFAULT_PROMPTS`, `OmniTemplate`, `OmniStore`, `OmniModifiers`, `OmniImporters`, `OmniTheme`, `ChatbotAdapters`, `VariableModal`, `SlashTrigger`, `CommandPalette`. Read them as `window.X` in pages/content and `self.X` in the service worker.

## Language level
- `lib/*.js` and `data/*.js`: strict ES5. `var`, `function`, `.forEach(function () {})`. No arrows, `let`/`const`, template literals, classes or async/await. This keeps them safe in every realm.
- `content/`, `popup/`, `options/`, `welcome/`, `background/`, `test/`: modern JS is fine (`const`/`let`, arrows, template literals, async/await).

## Style
- 2-space indent, single quotes, semicolons, no trailing commas, `'use strict'` in every file or IIFE.
- camelCase functions and variables, UPPER_SNAKE constants, PascalCase module globals, `Omni` prefix on lib globals.
- Prefixes: storage keys `omni.*`, CSS classes and element ids `omni-*`, context-menu ids and the shadow host `omniprompt-*`, modifier ids `mod-*`.
- Each file opens with a `/** OmniPrompt - <Name> ... */` block explaining its purpose and any bug it was written to fix. Section banners use `/* ===== Title ===== */`. Function comments explain why, not what.
- Wrap DOM and `chrome.*` calls in try/catch where a page or editor may throw; leave a short comment in empty catch blocks.

## chrome.* APIs
- Use the callback form wrapped in `new Promise(resolve => ...)`. Always touch `chrome.runtime.lastError` (`void chrome.runtime.lastError`) in callbacks.
- Resolve failures to data (`{ ok: false, reason }`, `{}`, `false`) rather than rejecting.
- Fire-and-forget calls pass `() => void chrome.runtime.lastError`.

## Messaging
- Messages are `{ action: 'snake_case', ...payload }`, dispatched with `switch (request && request.action)`.
- Background actions: `relay_to_active_tab`, `open_editor_with_draft`, `broadcast_settings`, `inject_into_tab`, `start_compare`, `get_pending_compare`, `compare_status`.
- Content actions: `open_palette`, `insert_prompt`, `apply_modifier`, `save_as_prompt`, `settings_changed`, `start_chain`.
- Return `true` from the listener only when `sendResponse` is called asynchronously.

## Network and security
- The only allowed network calls are the Dodo Payments licence endpoints in `lib/promptStore.js` (`live.` and `test.dodopayments.com/licenses`). The manifest CSP `connect-src` enforces this for extension pages, and a test fails if `fetch(`, `XMLHttpRequest`, `WebSocket` or `sendBeacon` appears anywhere else.
- No `eval`, remote code, inline scripts in extension pages, or `innerHTML` with untrusted text. Prompt and page text is inserted as text.
- Permission architecture (Option B):
  - Required permissions: `storage`, `unlimitedStorage`, `contextMenus`, `scripting`, `activeTab`. `activeTab` is required for on-demand injection when shortcuts or context menus are used on non-AI pages. `clipboardRead` is strictly forbidden.
  - Required host permissions: Curated list of verified AI chat domains matching content scripts.
  - Optional host permissions: `<all_urls>` (requested only on user opt-in for "every website") or per-site origins. Dynamic content scripts are registered via `chrome.scripting.registerContentScripts`.
