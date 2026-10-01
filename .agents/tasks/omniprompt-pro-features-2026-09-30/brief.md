# Brief: four new Pro features (founder decision, Sept 30, 2026)

This is heavy: four features that span template syntax (`lib/template.js`), the fill-in form (`content/variableModal.js`), the palette, the popup, the options editor, the service worker (tabs and windows), context menus, storage, Pro gating, docs and tests. Front-load a design step with a design review before implementation. Implement the features one at a time, in the order below, with the suite green after each one.

Repo root (absolute): `c:\Zmy_work\1my_apps\1Extensions\prompt_manager`. Work in place, no worktree, no git commits (the founder reviews the diff). Shell is PowerShell on Windows. No zip and no packaging script.

## Read first
- Steering (binding): `c:\Zmy_work\1my_apps\1Extensions\prompt_manager\.kiro\steering\*.md`. The previous run should have updated it for Option B permissions and the new Free/Pro split; follow the updated version.
- Reports from the two earlier runs, which this one builds on (do not undo their work):
  - `c:\Zmy_work\1my_apps\1Extensions\prompt_manager\.agents\tasks\omniprompt-submission-audit-2026-09-30\report.md`
  - `c:\Zmy_work\1my_apps\1Extensions\prompt_manager\.agents\tasks\omniprompt-option-b-free-pro-2026-09-30\report.md` and `design.md`
- Code:
  - `lib/template.js`, `lib/modifiers.js`, `lib/promptStore.js` (`K`, `PRO_FEATURES`, `getProInfo()`, and the existing Pro checks)
  - `content/adapters.js` (`SITES` table, caret-safe insertion, landing check, auto-send), `content/variableModal.js`, `content/commandPalette.js`, `content/slashTrigger.js`, `content/content.js`
  - `background/background.js`, `popup/*`, `options/*`, `welcome/*`
  - `test/verify.js`, `test/harness.js`
  - `README.md`, `PRIVACY.md`, `CHROMEWEBSTORE.md`, `CHANGELOG.md`

## Pro after this run
Pro becomes:
- unlimited custom prompts (Free keeps 20)
- client workspaces
- saved value sets
- stepped chains
- folder sync
- one-click restore of an earlier version
- context blocks
- the four features below

The founder considered and dropped batch fill from CSV and encrypted backups. Do not build them.

The price stays $25 one-time. Do not touch `PRO_PRICE`, `DODO_MODE`, product ids or checkout URLs. Add the four features to `PRO_FEATURES` in `lib/promptStore.js`. Every surface must keep reading the list through `OmniStore.getProInfo()`. Upgrade prompts appear only when a Free user tries one of these features (principle 4); never as a nag.

## Feature 1: Compare across AIs
**What the user gets.** Pick a prompt, fill its placeholders once, tick the AIs to send it to (for example ChatGPT, Claude, Gemini), and click once. OmniPrompt opens a fresh chat on each site and puts the same text in each composer. The user then reads the answers side by side.

**Where it starts:**
- a "Compare in several AIs" action in the Alt+K palette for the highlighted prompt
- the same action in the popup
- the same action in the options library row

The flow always goes through the existing fill-in form first, so the user sees the exact final text (principle 9).

**Targets:**
- A list of chat sites with a known "new chat" URL and a working `SITES` adapter. Verify each URL: ChatGPT, Claude, Gemini, Copilot, Perplexity, Grok, DeepSeek, Mistral Le Chat, Meta AI, Qwen, Kimi, Poe, and more if the adapters support them.
- Keep the list in one place, next to `SITES` in `content/adapters.js` or in a small lib table, and document where.
- Remember the user's last choice locally. The default is ChatGPT, Claude and Gemini.
- Cap it at 6 targets per run.
- Every target must be a host that OmniPrompt already has access to under Option B. If one is not granted, say so in the picker instead of failing.

**Layout:**
- The default is one new window with the targets tiled side by side. Pass screen size from the page that starts the run (`screen.availWidth` and `screen.availHeight`) to the service worker, and use `chrome.windows.create` / `chrome.windows.update` with left, top, width and height.
- Alternatively, open the targets as tabs in the current window. This is a remembered choice.
- Do not add permissions. `tabs.create`, `windows.create` and `tabs.sendMessage` need none. No `tabs` and no `system.display`.

**Delivery:**
- The service worker keeps a pending-insert job per tab in `chrome.storage.session` (transient). Follow the storage rule in steering: keys go in `K` or are documented as session-only.
- The content script, once loaded on the new chat page, asks for its job. Suggested content action `get_pending_insert`; use the existing messaging conventions and document any new action in steering `tech.md`.
- The content script waits for the composer: a bounded retry with a timeout, because these apps render late.
- It inserts through the existing caret-safe adapter, with its landing check.

**Sending:**
- The default is insert only. The user presses send in each tab.
- A "Send in each tab" checkbox in the picker is remembered and uses the existing adapter auto-send.
- Nothing is sent without that explicit choice.

**Never fail silently (principle 2):**
- If a site shows a login wall or the composer is missing, that tab shows the usual toast explaining why and keeps the text ready. Clipboard write may fail in a background tab; handle that honestly.
- The window or tab that started the run gets a short summary, such as "Inserted in 2 of 3. Claude: sign-in page, text not inserted."

**Hard rules:**
- Never read or scrape the AI answers or the chat transcript (principle 6). "Compare" means the user compares by looking. No auto-reading, no scoring.
- Jobs expire, for example after 2 minutes, and are removed once used.
- Closing a tab clears its job.

**Gate.** Free users see the action. On click they get the standard Pro prompt with no side effects.

## Feature 2: Smart templates
Extend `lib/template.js` (strict ES5) with four additions. Propose the final syntax in the design, and make it:
- backwards compatible with `{{var}}`, `{{var|default}}`, `{{var:A|B|C}}`, the auto-fill tokens and `{{@shortcut}}` context blocks
- safe for the "no `|` inside a shipped `{{token}}`" test

The additions, with suggested syntax:
1. **Conditional sections:** `{{#if tone=Formal}} ... {{#else}} ... {{/if}}`. The condition is on a dropdown or text variable; allow equals and "is filled". Nesting may be limited to one level if that keeps it simple; say so.
2. **Date maths:** `{{date+7d}}`, `{{date-1w}}`, `{{date+1m}}`, `{{date+1y}}`, using the same output format as the existing `{{date}}`. Handle month-end and leap years correctly.
3. **Required fields:** for example `{{client_name!}}`. The form marks the field, and Insert stays disabled until it is filled, with an accessible inline message. Optional fields keep today's behaviour.
4. **Repeatable blocks:** for example `{{#repeat step}}- {{step}}\n{{/repeat}}`. The form shows "Add another" and "Remove" for each block. The output joins the entries in order.

**Form (`content/variableModal.js`):**
- The live preview updates as the user fills the form and shows exactly what will be inserted.
- Keyboard and screen-reader friendly.
- Keeps IME composition handling.

**Editor (options):**
- A small syntax help panel with insert buttons.
- A lint on save for unbalanced blocks, unknown conditions and bad date units. Show a warning, never a silent failure.

**Safety:**
- Malformed syntax must never throw or eat text. Render it literally and show the lint warning.
- Imported text (AIPRM, SKILL.md, Markdown, CSV) that happens to contain `{{#` must not break. Decide in the design whether importers leave it literal or mark it.

**Gate.** Writing or saving a new or edited prompt that uses smart syntax in the options editor needs Pro. Inserting a prompt that already uses smart syntax, for example from an imported pack or after a licence lapse, always works on Free. This keeps principle 3 (reading and inserting are never held hostage). Importing stays free, and that loophole is accepted; do not add DRM.
- Check how context blocks behave on Free today and keep the two features consistent. If they conflict, report it to the orchestrator rather than silently changing context blocks.

**Built-ins.** Do not change any of the 136 built-in prompts to use smart syntax. Add a regression test that every built-in renders exactly as before, byte for byte, using default or sample values.

## Feature 3: Custom right-click modifiers
**Where they come from.** The 12 built-in modifiers in `lib/modifiers.js` stay free and unchanged. Pro users can create, edit, reorder and delete their own in a new "Modifiers" section of the options page.

**Shape:**
- A custom modifier has the same shape and behaviour as a built-in one, so it applies the same way from the right-click menu. Read `lib/modifiers.js` and reuse its apply path rather than writing a second one.
- Fields: name, instruction text, and the same placement options built-ins support.
- Ids: `mod-custom-<id>`.
- Cap at 30, and explain the cap in the UI.

**Menus:**
- Custom modifiers appear under the existing OmniPrompt context-menu parent, after the built-ins, with a separator.
- Menus rebuild through the existing `rebuild_menus` action whenever custom modifiers change.

**Storage:**
- A new key in `K` (suggested `omni.customModifiers`), handled everywhere `omni.userPrompts` is: sync (if user prompts sync), backups and snapshots, JSON export and import, restore.
- Add the key to the README storage table and steering `structure.md`.
- Importing never overwrites a built-in modifier.

**Gate:**
- Creating, editing and using a custom modifier needs Pro.
- On Free, existing custom modifiers stay listed in options, stay exportable, backed up and deletable (the Pro-data rule). They do not appear in the right-click menu, and the options page says why in one plain line.

## Feature 4: Site rules
**What the user gets.** On a given site, the prompts that suit it come first. For example, email prompts sit at the top of the `//` menu and the Alt+K palette on Gmail and Outlook, and code prompts sit at the top on GitHub. Nothing else is hidden; the rest of the library stays one keystroke away.

**Rules:**
- A rule links one or more sites to prompts. It can target tags, folders, categories or single prompts; the design picks the smallest model that covers these. Suggested shape: `{ id, name, hosts: ['mail.google.com'], tags: [], folders: [], promptIds: [] }`.
- Sites are matched on hostname only. Support an exact host and a `*.` subdomain wildcard (for example `*.atlassian.net`). No substring matching: `mail.google.com.evil.com` and `notmail.google.com` must not match `mail.google.com`.
- The prompt editor also gets a "Show first on these sites" field that writes into the same rules, so the user can set it from either place.
- Offer a few one-click presets. They are suggestions only; nothing is active until the user adds it. Verify each hostname:
  - Email: mail.google.com, outlook.live.com, outlook.office.com
  - Code: github.com, gitlab.com, stackoverflow.com
  - Work chat: app.slack.com, teams.microsoft.com
  - Docs: docs.google.com, notion.so
- Cap at 50 rules, and explain the cap in the UI.

**Ranking:**
- Ranking lives in `lib/promptStore.js`. Add the current hostname as an input to the existing ranking rather than writing a second ranker.
- With an empty query, matched prompts appear in a "For this site" group at the top of the `//` menu and the palette.
- When the user types a query, matched prompts get a boost, but a clearly better text match still wins. Put the exact rule in the design.
- The content script reads `location.hostname` and nothing else for this. Never read page content, titles or chats for site rules (principle 6).
- Keep it fast: work out the matched set once per page load and again on `settings_changed`, not on every keystroke.

**Option B interplay.** Gmail, GitHub and most preset sites are not in the default AI-site list, so OmniPrompt only runs there once the user turns on "every website" or that site. When a rule's site is not enabled, the rules editor says so in one line and offers "Turn on for this site", which calls `chrome.permissions.request` directly in the click handler. No new permissions.

**Storage.** A new key in `K` (suggested `omni.siteRules`), handled like the other Pro data: sync (if Pro data syncs), backups and snapshots, JSON export and import, restore. Add it to the README storage table and steering `structure.md`.

**Gate:**
- Creating and editing rules, and ranking by rules, needs Pro. A Free user who clicks "Add rule" or a preset gets the standard Pro prompt with no side effects.
- On Free, existing rules stay listed, exportable, backed up and deletable, but they are not applied. The options page says why in one plain line.

## Also in this run: clearer folder sync setup (existing Pro feature, not a new one)
The founder expected folder sync to connect to cloud drives. It works through the drive's desktop app folder, but the UI does not explain that, and picking an ordinary folder syncs nothing without saying so. Fix the setup, not the mechanism.

- In the folder sync section of the options page, add four choices: OneDrive, Google Drive, Dropbox, iCloud Drive, plus "Another folder".
  - Use text names with a generic local cloud or folder icon. Do not ship official brand logos (trademark rules), and nothing remote.
  - Each choice shows two or three short lines: install that drive's desktop app, where its folder usually is on Windows and on macOS, and "Make a folder called OmniPrompt inside it and choose that." Then a "Choose folder" button opens the picker.
  - Verify the usual paths with web search before writing them. Starting points: OneDrive `C:\Users\<you>\OneDrive` and `~/Library/CloudStorage/OneDrive-*`; Google Drive for desktop, a `G:` drive "My Drive" on Windows and `~/Library/CloudStorage/GoogleDrive-*/My Drive`; Dropbox `C:\Users\<you>\Dropbox` and `~/Library/CloudStorage/Dropbox`; iCloud Drive `C:\Users\<you>\iCloudDrive` and "iCloud Drive" in Finder.
- After a folder is chosen, the extension only learns the folder's name, not its path. Say plainly: "OmniPrompt can't see where this folder is. Make sure it is inside your cloud drive's folder." If an `omniprompt-library.json` is already there, say "Found a library from another computer" and show the existing merge step.
- Add a short "On your other computer" line: install OmniPrompt, activate Pro, choose the same folder.
- Find out and document exactly when folder sync writes and reads today (options page open, on changes, "Sync now", on a schedule?). Check whether it can run when the options page is closed; research Chrome's rules for stored `FileSystemDirectoryHandle` permissions in extension pages and service workers. Do not build background sync unless it needs no new permission and is small. Whatever the answer, the UI text must say exactly when syncing happens, so it is never silently stale.
- Keep the existing message for browsers without `showDirectoryPicker` (Firefox, Safari, Brave by default).
- Update the README and CHROMEWEBSTORE.md folder sync text to match. Add a test for the new copy or states where feasible.

**Not in this run (record it, do not build it):** a direct "Connect Google Drive" option is on the post-launch backlog. Add it to the "Open items" or backlog in steering `product.md` and a dated line in `product_research.md`, with the agreed shape:
- Pro, off by default.
- Optional `identity` permission, requested only when the user clicks Connect (an optional permission does not disable the extension for existing users).
- Google Drive's hidden app folder (`drive.appdata`, a non-sensitive scope), so OmniPrompt sees only its own file.
- Access token kept in memory or `chrome.storage.session` only; no refresh token, nothing written to disk, nothing sent to us.
- A Disconnect button that revokes access.
- The privacy text changes to "your library also goes to the Google account you connect".
- OneDrive only if users ask.

**Chrome profile sync:** the audit found that merging two browsers can take a Free user past 20 prompts. The founder is leaving this uncapped (sync merges are the user's own data). Do not change it; make sure the docs do not claim otherwise.

## Docs, steering, tests
**Docs:**
- `README.md`: describe each feature briefly and document the smart syntax with examples, noting it is Pro. Keep every string the tests require (`Alt+K`, `Ctrl+Shift+K`, "Type `//`", "136 built-in prompts", only real `//shortcut`s, the permission names including `<all_urls>`). British spelling, plain short sentences, no hype.
- Update the Free/Pro sections in `README.md`, `CHROMEWEBSTORE.md` and the options Pro tab.
- `PRIVACY.md`: Compare only opens tabs and types text. It never reads answers, and there is no new network traffic. Site rules use only the site's address, checked on the device.
- `CHANGELOG.md`: add the changes under Unreleased.
- Update the welcome page if it lists Pro features.

**Steering:**
- `product.md`: update the Pro list.
- `structure.md`: the new storage key, where the compare target table lives, and any new script.
- `tech.md`: new message actions.
- `testing.md`: the new assertions.

**Tests (`test/verify.js`). Run the real code in realms where possible:**
- Template: conditionals (true, false, else, "is filled"), date maths including 31 Jan +1m and 29 Feb +1y, required fields, repeat blocks, malformed input rendering literally without throwing, and the built-in byte-for-byte regression.
- Gating: in `H.createStoreRealm`, a Free user cannot save a smart-syntax prompt from the editor path, can insert one, cannot create or use custom modifiers, and can still export and delete them. A Pro user can do all of it.
- Custom modifiers: included in backup, export and restore, and the cap is enforced.
- Compare: the job store expires and cleans up, the target cap is 6, source checks that nothing reads transcripts, and no new permission appears in the manifest.
- Site rules: in the store realm, a Pro user with a `mail.google.com` rule gets the matching prompts first for that host and normal order elsewhere; wildcard matching works; the no-substring cases above do not match; a Free user's rules are kept but not applied; rules are included in backup, export and restore; the cap is enforced. Add a source check that the site-rule code in content scripts reads only `location.hostname`.

## Hard constraints (unchanged)
- `node test/verify.js` ends with 0 FAIL after each feature. Also run `node --check` on every shipped .js file.
- `lib/*.js` and `data/*.js` are strict ES5. No npm, package.json, bundler or dependencies. Classic scripts only.
- No network calls outside `lib/promptStore.js`. No eval, remote code, inline scripts or `innerHTML` with untrusted text.
- No new permissions beyond the Option B set.
- Content UI stays inside the shadow root, with `omni-*` ids and classes.
- Product principles hold: never destroy the draft, never fail silently, data never held hostage, no nags, no telemetry, never read chats, clipboard read only on explicit action, show the exact text.
- Do not edit `backups/` or `dist/`. No temp files left behind.
- If a shipped script is added, update every list in steering `structure.md` ("Script load order").

## Report and final output
- Write `design.md` and `report.md` in `c:\Zmy_work\1my_apps\1Extensions\prompt_manager\.agents\tasks\omniprompt-pro-features-2026-09-30\`.
- Include manual load-unpacked test steps for the founder: Compare on 3 sites, smart template form behaviour, a custom modifier and a Gmail site rule, each on a Free vs a Pro licence using the Dodo test mode.
- Final message to the orchestrator, under 40 lines:
  - files changed
  - the final smart syntax
  - the compare target list
  - how each feature is gated
  - the site-rule presets
  - when folder sync actually runs, and what the new setup shows
  - the suite summary line
  - open decisions
