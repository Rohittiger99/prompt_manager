# Brief: permissions Option B + Free/Pro re-split (founder decisions, Sept 30, 2026)

This is heavy: it spans permissions and injection (manifest, service worker, popup, welcome, options), Pro gating in `lib/promptStore.js` and every UI surface that shows Pro, plus docs, steering and tests. Front-load a design step and have it reviewed before implementation.

Repo root (absolute): `c:\Zmy_work\1my_apps\1Extensions\prompt_manager`. Work in place, no worktree, no git commits (the founder reviews the diff). Shell is PowerShell on Windows. Do not build a release zip and do not add a packaging script (the founder asked for neither yet).

## Read first
- Steering (binding except where this brief records a newer founder decision): `c:\Zmy_work\1my_apps\1Extensions\prompt_manager\.kiro\steering\*.md` (tech, structure, testing, product).
- The previous run's audit, which already analysed Option B and the free-limit facts: `c:\Zmy_work\1my_apps\1Extensions\prompt_manager\.agents\tasks\omniprompt-submission-audit-2026-09-30\report.md` (sections A1 and A5), and its `review.md` if present. That run has already finished its cleanup; build on its result, do not undo it.
- `c:\Zmy_work\1my_apps\1Extensions\prompt_manager\product_research.md` (sections 6, 9, 10).
- Code: `manifest.json`, `background\background.js`, `popup\*`, `welcome\*`, `options\*`, `lib\promptStore.js`, `content\content.js`, `test\verify.js`, `test\harness.js`, `README.md`, `PRIVACY.md`, `CHROMEWEBSTORE.md`, `CHANGELOG.md` (if the previous run created it).

## Founder decisions (these supersede older steering lines)
1. Permissions: Option B.
   - Required host access and static content scripts only on AI sites, with as complete a list as possible.
   - An optional "Use on every website" switch that grants `<all_urls>` at runtime.
   - `activeTab`, so Ctrl+Shift+K and the right-click menu still work on any page when the user asks.
   - The extension is not published yet, so changing permissions now affects no existing users.
2. Price: $25 one-time is final. The $19/$39 idea in `product_research.md` is dropped. Mark it as superseded there; do not delete the research. Do not touch `PRO_PRICE`, `DODO_MODE`, product ids or checkout URLs.
3. Free/Pro re-split. These move to Free:
   - folders, including nested folders
   - tags and tag filters
   - sorting
   - bulk edit
   - tidy-up
   - remembered short answers (`omni.lastValues`)
   - viewing and copying earlier versions of a prompt

   These stay Pro:
   - unlimited custom prompts (Free keeps 20)
   - client workspaces
   - saved (named) value sets
   - stepped chains
   - folder sync
   - one-click restore of an earlier version
   - context blocks `{{@shortcut}}`

   Everything already free stays free.
4. No zip, no packaging script for now.

## Part 1: Option B permissions

### What the audit already found (report A1.2 and A1.5; line numbers may have moved after the cleanup run)
- `chrome.scripting.executeScript` in `injectInto` (used on install/update, the command fallback and `relay_to_active_tab`) needs host access for the tab: from `host_permissions` or `activeTab`.
- `chrome.tabs.query({ url: [...] })` in `background.js` only matches tabs the extension can access. Under Option B it will only match AI-site tabs and granted origins. Check each caller still does the right thing.
- `popup/popup.js` reads `tab.url` for the per-site switch. Opening the popup grants `activeTab`, so this should still work; verify.
- The audit found Dodo's licence endpoints allow CORS from extension origins, so the licence fetch should work without host access. Confirm with the preflight below; if it ever fails, the fallback is an optional host permission requested when the user presses Activate, never a required one.
- The current `SITES` table in `content/adapters.js` includes `bing.com` and `x.ai`. Do not put `bing.com` in the required list (general platform). Keep the adapters themselves.

### Manifest
- `permissions`: `storage`, `unlimitedStorage`, `contextMenus`, `scripting`, `activeTab`. Still no `clipboardRead`, no `tabs` unless proven necessary (prefer not; `activeTab` gives the popup the current tab URL after the user clicks the icon).
- `host_permissions` and `content_scripts[0].matches`: the curated AI-site list, identical in both places. Keep the existing content-script file order exactly.
- `optional_host_permissions`: `["<all_urls>"]`, so the user can grant everything or a single origin at runtime.
- Keep or extend `exclude_matches` for store pages (Chrome Web Store, and Edge Add-ons `microsoftedge.microsoft.com/addons` if not already there).

### AI site list
Research and verify each domain is live and serves a chat, prompt or generation box. Use web search where unsure, and drop dead or redirected ones. Use exact host patterns (`https://chatgpt.com/*`, `https://*.chatgpt.com/*`, and so on); include `www.` or apex variants where the site uses them.
- Only include sites whose main purpose is AI. General platforms (x.com, github.com, bing.com, google.com, duckduckgo.com, notion.so, slack.com, mail.google.com) belong to "every website" or per-site enable, not the required list, because they would make the install warning broader.
- Seed list to verify and extend:
  - OpenAI: chatgpt.com (+ subdomains such as sora.chatgpt.com), chat.openai.com, platform.openai.com, sora.com
  - Anthropic: claude.ai, console.anthropic.com
  - Google: gemini.google.com, aistudio.google.com, notebooklm.google.com, labs.google
  - Microsoft: copilot.microsoft.com, copilot.cloud.microsoft, m365.cloud.microsoft
  - Others: perplexity.ai, grok.com, chat.deepseek.com, chat.mistral.ai, console.mistral.ai, meta.ai, poe.com, huggingface.co, chat.qwen.ai, tongyi.com, kimi.com, kimi.moonshot.cn, chat.z.ai, chatglm.cn, doubao.com, yiyan.baidu.com, chat.minimax.io, hailuoai.com, you.com, phind.com, duck.ai, pi.ai, character.ai, lmarena.ai, openrouter.ai, groq.com, console.groq.com, dashboard.cohere.com, t3.chat, typingmind.com, chatllm.abacus.ai, genspark.ai, manus.im, felo.ai, chat.reka.ai
  - Builders: v0.dev, v0.app, bolt.new, lovable.dev, replit.com
  - Image, video and music: midjourney.com, ideogram.ai, leonardo.ai, krea.ai, app.runwayml.com, suno.com, udio.com, firefly.adobe.com, klingai.com, pika.art, lumalabs.ai
  - Writing: app.jasper.ai, copy.ai, app.writesonic.com
- Record the final list with a one-line reason per site in the design doc.
- Add a test that `host_permissions` equals `content_scripts[0].matches` (as sets). Also check that the list contains no general-platform hosts from the list above and no `<all_urls>` or `*://*/*`.

### Service worker (`background\background.js`)
- **Dynamic registration.** When `<all_urls>` or individual origins are granted, register content scripts with `chrome.scripting.registerContentScripts`:
  - Use the same file list as `CONTENT_SCRIPTS` and the same order.
  - Use `runAt: 'document_idle'`, `allFrames: false`, `persistAcrossSessions: true`, and store-page excludes.
  - Use stable ids with the `omniprompt-*` prefix.
  - Update or unregister on `chrome.permissions.onAdded` / `onRemoved`.
  - Reconcile with `chrome.permissions.getAll()` on `onInstalled` and `onStartup`, because users can also change site access in `chrome://extensions`.
  - Double injection is already harmless (`window.__OMNIPROMPT_LOADED__` guard), but avoid it where easy.
- **Existing re-injection into open tabs** on install and update: only inject where permitted. Catch and ignore failures per tab. Never throw.
- **On-demand injection via `activeTab`.** For the `toggle-command-palette` command and every context-menu action on a page without the content script:
  - `ping`; if there is no reply, `chrome.scripting.executeScript` the `CONTENT_SCRIPTS` files; then send the original message (`open_palette`, `apply_modifier`, `save_as_prompt`, and so on).
  - If injection is impossible (chrome://, store pages, PDF viewer), fall back per principle 2 where possible and never fail silently. Check what the code does today and keep that behaviour.
- Follow the steering chrome.* conventions: callback form in a Promise, `void chrome.runtime.lastError`, resolve failures to data.

### Licence network call
With `<all_urls>` no longer required, check that the Dodo licence activate/validate/deactivate fetch from extension pages still works.
- It will only work if Dodo returns CORS headers for a `chrome-extension://` origin. Check Dodo's docs first.
- If still unsure, run a preflight with `curl.exe` from PowerShell (no user data or keys are sent):
  `curl.exe -i -X OPTIONS https://test.dodopayments.com/licenses/activate -H "Origin: chrome-extension://abcdefghijklmnopabcdefghijklmnop" -H "Access-Control-Request-Method: POST" -H "Access-Control-Request-Headers: content-type"`
- If CORS is not allowed, stop and report to the orchestrator with options (for example, adding `https://live.dodopayments.com/*` to `host_permissions`, which adds that host to the install warning). Do not pick silently.
- Keep the manifest CSP `connect-src` as it is.

### UI
- **Welcome page (first run).** Add a clear section with an accessible switch (`role="switch"` or a labelled checkbox, keyboard operable). `chrome.permissions.request({ origins: ['<all_urls>'] })` must run directly in the click handler (user gesture). The UI reflects the real permission state, including when the user cancels Chrome's prompt.
- **Options page (Settings).** Show the same switch, plus a list of individually enabled sites with a Remove button for each (`chrome.permissions.remove`).
- **Popup.** When the current tab's site is not covered, show a short line with two buttons:
  - "Turn on for this site" requests just that origin. This is how new AI sites get support later without an update that disables the extension for existing users.
  - "Turn on everywhere".
- **Copy for the switch.** Plain British English, short sentences, literally true of the code, no hype. The founder wants the message "works everywhere, private, offline". Do NOT write "100% secure" or "nothing ever leaves your device": licence activation talks to Dodo Payments, and Chrome sync (if the library uses `chrome.storage.sync`; verify) goes through the user's Google account. Suggested wording, adjust to match the code:
  - Title: "Use OmniPrompt on every website"
  - Body: "Out of the box, OmniPrompt works on AI chat sites. Turn this on to use // and Alt+K in any text box, such as Gmail, Slack, Jira or Docs. Chrome will ask you to allow access to all sites. OmniPrompt works offline and has no account. It only acts when you type // or use a shortcut. It never reads your chats and never sends your prompts to us. The only request it makes is licence activation, when you enter a Pro key."
  - Adjust the last sentences if sync is on by default.
- Keep all content UI inside the shadow root, and use `omni-*` ids and classes.

## Part 2: Free/Pro re-split
- Find every Pro check (file:line) for the features moving to Free: in `lib/promptStore.js` and in options, popup, content (`variableModal.js` for remembered answers) and welcome. Remove the gate. Keep "restore an earlier version" gated, while viewing and copying an old version work on Free. Make sure a Free user can actually reach the version list and copy from it.
- Split "saved value sets and remembered short answers":
  - Remembered short answers (`omni.lastValues`) become Free.
  - Named value sets (`omni.variableSets`) stay Pro.
- Update `PRO_FEATURES` in `lib/promptStore.js` so it lists only what is still Pro. Every surface already reads it via `OmniStore.getProInfo()`; keep it that way and remove any hard-coded Pro lists, lock icons or "Pro" badges on features that are now free.
- Principle 3 still holds: over the limit, nothing is locked or deleted, and only creating a new prompt asks for Pro.

## Part 3: Docs and steering
- `README.md`: the permission section must now name `storage`, `unlimitedStorage`, `contextMenus`, `scripting`, `activeTab`, and the AI-site host access plus optional `<all_urls>`. The literal `<all_urls>` must stay because a test requires it. Also update Free vs Pro and describe the switch. Keep every string the tests require (`Alt+K`, `Ctrl+Shift+K`, "Type `//`", "136 built-in prompts", real `//shortcut`s only, more than 50 of them). British spelling.
- `PRIVACY.md`, `CHROMEWEBSTORE.md`:
  - Per-permission justifications, including why each AI host is needed and why `activeTab` is needed.
  - The single-purpose statement.
  - Remote code answer "No".
  - Data-use disclosures.
  - Listing copy that leads with "works offline, no account, never reads your chats".
- `welcome\welcome.html`: keep `Alt+K` and `Ctrl+Shift+K`.
- `CHANGELOG.md`: add the changes under Unreleased.
- `product_research.md`: add a short dated "Founder decisions, Sept 30, 2026" note near the top (price $25 final, Option B, new Free/Pro split) and mark section 10's prices and gating as superseded.
- Steering, so future work follows the new rules:
  - `tech.md`: `activeTab` is now required and used only for on-demand injection; `clipboardRead` is still forbidden; the permission model.
  - `testing.md`: the permission assertions.
  - `structure.md`: static AI-site content scripts plus dynamic registration, and where the AI-site list lives and must be kept in sync.
  - `product.md`: the Free/Pro lists, price final, "Open items" updated. The orchestrator may already have edited `product.md` before this run; if so, keep its wording and only fix what the code makes untrue.

## Part 4: Tests (`test\verify.js`)
- Update the `activeTab`-absent assertion to the new rule (`activeTab` present; `clipboardRead` absent; no `tabs` unless justified).
- Add the host-list equality and no-general-platform tests.
- Add tests that `optional_host_permissions` contains `<all_urls>`, that background registers and unregisters dynamic scripts on permission events (behaviour if feasible, source check as fallback), and that command and context-menu paths inject on demand before messaging.
- Add gating tests: each feature moved to Free works for a Free user in the store realm. Run the real `OmniStore` code with `H.createStoreRealm`, create more than 20 prompts where relevant, and check that restore stays Pro while view/copy is Free.
- Keep every existing assertion that is still true.

## Hard constraints (unchanged)
- `node test/verify.js` from the repo root ends with 0 FAIL. Also run `node --check` on every shipped .js file.
- `lib/*.js` and `data/*.js` are strict ES5. No npm, package.json, bundler or dependencies. Classic scripts only.
- No network calls outside `lib/promptStore.js`. No eval, remote code, inline scripts or `innerHTML` with untrusted text.
- Product principles in `.kiro/steering/product.md` hold: never destroy the draft, never fail silently, data never held hostage, no nags, no telemetry, only Dodo network traffic, clipboard read only on explicit action.
- Do not edit `backups/` or `dist/`. No temp files left behind.
- If a shipped script is added or renamed, update every list in steering `structure.md` ("Script load order").

## Verification
- Run the suite (0 FAIL) and paste the summary line into the report.
- Walk through the manual load-unpacked checks and write down the steps for the founder, because an agent cannot click Chrome's permission prompt:
  - a covered AI site works with no prompt
  - an uncovered site: popup shows "Turn on for this site"
  - Ctrl+Shift+K and right-click still work there via `activeTab`
  - the switch grants and revokes `<all_urls>`
  - `test/test-page.html` works after enabling file access and the switch
- Update the manual-check line in steering `tech.md` accordingly.

## Report and final output
- Write the design and the final report to `c:\Zmy_work\1my_apps\1Extensions\prompt_manager\.agents\tasks\omniprompt-option-b-free-pro-2026-09-30\` (`design.md`, `report.md`).
- Final message to the orchestrator, under 40 lines:
  - files changed
  - the final AI-site list count, and any sites dropped with the reason
  - the Dodo CORS result
  - Free/Pro changes with file:line of the gates removed
  - the new install warning text
  - the manual test steps
  - any open decisions
