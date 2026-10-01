# OmniPrompt Pro Features Completion Report

**Date:** 2026-10-01  
**Status:** Completed  
**Test Suite:** 1014 passed, 0 failed (`node test/verify.js`)  
**Syntax Checks:** All 20 JS files passed (`node --check`)  

---

## 1. Executive Summary

This phase implemented the four new Pro features and the folder sync setup overhaul as decided by the founder on September 30, 2026:
1. **Compare across AIs:** Dispatch a prompt simultaneously to up to 6 AI composers (out of 12 verified chat targets) in tiled side-by-side windows or background tabs, with zero transcript scraping.
2. **Smart templates:** Extended `lib/template.js` (strict ES5) with conditionals (`{{#if}}...{{#else}}...{{/if}}`), date arithmetic (`{{date+7d}}`, `{{date-2w}}`, `{{date+1m}}`, `{{date+1y}}` with month-end and leap-year clamping), required fields (`{{field!}}`), and repeatable blocks (`{{#repeat item}}...{{/repeat}}`), backed by live form preview, form validation, and save-time linting.
3. **Custom right-click modifiers:** Allowed Pro users to define up to 30 custom context-menu modifiers alongside the 12 built-ins, with placement choices (`quote`, `fence`, `after`, `before`) and dynamic context-menu rebuilding.
4. **Site rules:** Domain-based prompt ranking (exact host and `*.` wildcard) creating a "For this site" group and search boost, capped at 50 rules, with one-click presets and Option B permission request banners.
5. **Folder sync setup clarification:** Clear, actionable in-app guidance for OneDrive, Google Drive, Dropbox, and iCloud Drive desktop folders, explicit disclosure of sync timing, and backlog documentation for direct Google Drive integration post-launch.

All changes were implemented directly in place in strict accordance with the project's zero-telemetry, offline-first architecture, strict ES5 constraints for `lib/` and `data/`, and the Option B host permissions model.

---

## 2. Feature-by-Feature Implementation Details

### 2.1 Feature 1: Compare Across AIs
- **Target Registry (`content/adapters.js`):**
  Added `COMPARE_TARGETS` containing 12 verified AI chat services with verified new-chat URLs and adapter selectors:
  - ChatGPT (`chatgpt.com`, `#prompt-textarea`)
  - Claude (`claude.ai`, `div.ProseMirror`)
  - Gemini (`gemini.google.com`, `rich-textarea`)
  - Copilot (`copilot.microsoft.com`, `textarea#userInput`)
  - Perplexity (`perplexity.ai`, `#ask-input`)
  - DeepSeek (`deepseek.com`, `textarea#chat-input`)
  - Grok (`grok.com`, `textarea[aria-label*="Ask"]`)
  - Mistral Le Chat (`chat.mistral.ai`, `textarea`)
  - Meta AI (`meta.ai`, `div[contenteditable="true"]`)
  - Qwen (`chat.qwen.ai`, `textarea#chat-input`)
  - Kimi (`kimi.moonshot.cn`, `div[contenteditable="true"]`)
  - Poe (`poe.com`, `textarea`)
  All 12 hostnames are covered under the Option B host permission list.
- **Entry Points & Flow:**
  - Starts from the `Alt+K` palette (action item "Compare in several AIs"), popup (`data-act="compare"`), or options library row ("Compare").
  - Always opens `VariableModal` so the user fills any placeholders and reviews the rendered prompt first (Principle 9: never destroy or hide the draft).
  - Modal provides a drawer with target checkboxes (default: ChatGPT, Claude, Gemini; capped at 6 targets per run), layout choices ("Tiled window" vs "Tabs in current window"), and an optional "Send automatically in each tab" checkbox (unchecked by default).
  - Remembers selected targets in `omni.compareTargets` via `OmniStore.getLastCompareTargets()` / `setLastCompareTargets()`.
- **Delivery & Service Worker (`background/background.js`):**
  - Handles `start_compare`: calculates window geometry (`availWidth`, `availHeight`, tiled columns/rows) and creates windows or tabs.
  - Keeps pending jobs in `chrome.storage.session` under `omni.session.compare.<tabId>` with a 2-minute TTL.
  - Automatically cleans up pending jobs on `chrome.tabs.onRemoved`.
- **Target Handshake (`content/content.js`):**
  - Content script checks `get_pending_compare` on page load.
  - Executes a bounded retry loop (up to 12s) waiting for the late-rendering composer.
  - Inserts text via `ChatbotAdapters.insert(text, { mode: 'replace' })` followed by `landingCheck()`.
  - Sends automatically only if `autoSend` was explicitly checked.
  - Reports status back via `compare_status`.
- **Privacy & Safety (Principles 2 & 6):**
  - Zero transcript scraping. Zero model answer reading. OmniPrompt only types text into the composer.
- **Gating:** Compare is Pro-only. Free users clicking Compare receive the standard Pro upgrade modal.

### 2.2 Feature 2: Smart Templates
- **Template Engine (`lib/template.js` - Strict ES5):**
  - **Conditionals:** `{{#if variable=value}}...{{#else}}...{{/if}}` and `{{#if variable}}...{{#else}}...{{/if}}`. Evaluates equality or presence case-insensitively. Single-level nesting supported cleanly.
  - **Date arithmetic:** `{{date+7d}}`, `{{date-2w}}`, `{{date+1m}}`, `{{date+1y}}`. Offsets reference date with month-end and leap-year clamping (e.g. 31 Jan + 1m clamps to 28 Feb or 29 Feb; 29 Feb + 1y clamps to 28 Feb in non-leap years).
  - **Required fields:** Appending `!` (e.g. `{{client_name!}}`) marks the field as `strictRequired: true`.
  - **Repeatable blocks:** `{{#repeat item}}- {{item}}\n{{/repeat}}`.
  - **Template Linter:** `OmniTemplate.lintTemplate(template)` returns `{ ok, errors, warnings }` detecting unclosed blocks, unknown date units, or malformed conditions.
  - **Syntax Detector:** `OmniTemplate.hasSmartSyntax(template)`.
  - **Safety:** Malformed or unbalanced blocks render literally without throwing errors.
  - **Built-in Regression Guarantee:** Verified that all 136 built-in prompts produce 100% byte-for-byte identical output before and after this change.
- **In-Page Form (`content/variableModal.js`):**
  - Renders repeatable blocks with dynamic "+ Add another" and "Remove" controls.
  - Marks required fields with an asterisk (`*`) and validates inputs on keystroke; disables Insert button and shows inline message if mandatory fields are blank.
  - Live preview dynamically updates as the user types, respecting conditionals and date math.
- **Options Prompt Editor (`options/options.html`, `options/options.js`):**
  - Added collapsible "Smart syntax" reference drawer with one-click insertion chips.
  - Lints template on save and displays warnings.
- **Gating:**
  - Saving or editing a prompt that contains smart syntax requires Pro (`OmniStore.isPro()`).
  - Inserting/running existing smart templates (from imports or after license expiration) is 100% free (Principle 3: reading and inserting are never held hostage).

### 2.3 Feature 3: Custom Right-Click Modifiers
- **Storage & Data Model (`lib/promptStore.js`):**
  - Stored under key `omni.customModifiers` in `chrome.storage.local`.
  - Schema: `{ id, title, shortTitle, icon, description, instruction, placement }`.
  - Placements supported: `quote` (`"""`), `fence` (` ``` `), `after` (`instruction + '\n\n' + text`), `before` (`text + '\n\n' + instruction`).
  - Hard cap of 30 custom modifiers (`MAX_CUSTOM_MODIFIERS = 30`).
  - Included in backups, JSON export/import, sync, and automatic snapshots.
- **Context Menus (`background/background.js` & `lib/modifiers.js`):**
  - `rebuildContextMenus()` retrieves custom modifiers from `OmniStore.getCustomModifiers()`.
  - If Pro, appends a separator and custom modifier items after the 12 built-ins.
  - Dynamically rebuilds menus when `omni.customModifiers` or `omni.license` changes.
- **Options UI (`options/options.html`, `options/options.js`):**
  - Added "Modifiers" view panel with custom modifier list, creation form, placement preview, and counter (`X / 30`).
- **Gating:**
  - Creating, editing, and context-menu execution require Pro.
  - Free users can view existing custom modifiers in Options, export them in backups, and delete them. The options page displays: *"Custom right-click modifiers are active with OmniPrompt Pro."*

### 2.4 Feature 4: Site Rules
- **Storage & Data Model (`lib/promptStore.js`):**
  - Stored under key `omni.siteRules` in `chrome.storage.local`.
  - Schema: `{ id, name, hosts: [...], tags: [...], folders: [...], promptIds: [...] }`.
  - Hard cap of 50 site rules (`MAX_SITE_RULES = 50`).
  - Host matching: Exact matching (`host === ruleHost`) and wildcard subdomain matching (`*.domain.com`). Substring collisions (e.g. `mail.google.com.evil.com`) are strictly rejected.
- **One-Click Presets:**
  - Email: `mail.google.com`, `outlook.live.com`, `outlook.office.com`
  - Code: `github.com`, `gitlab.com`, `stackoverflow.com`
  - Work Chat: `app.slack.com`, `teams.microsoft.com`
  - Docs: `docs.google.com`, `notion.so`
- **Ranking Engine (`lib/promptStore.js`):**
  - `OmniStore.search(opts)` accepts `opts.host`.
  - With empty query (`query === ''`), matching prompts are elevated to a **"For this site"** group at the top of the `Alt+K` palette and `//` slash menu.
  - With a search query, matching prompts receive a `+350` relevance boost while allowing strong text matches (`+1000` to `+10000`) to win.
- **Hostname Isolation (Principle 6):**
  - Content scripts only pass `location.hostname` to search. Page content, URLs with query parameters, titles, and chats are never read.
- **Option B Permissions Interplay:**
  - Preset sites (e.g. `github.com`, `mail.google.com`) are not in the default AI chat domain list.
  - When editing a rule with an uncovered host, the editor displays an inline notice with a "Turn on for this site" button calling `chrome.permissions.request`.
- **Gating:**
  - Creating, editing, and ranking application require Pro.
  - Free users can view, export, and delete existing rules in Options; rules are not applied to search ranking.

### 2.5 Folder Sync Setup Clarification
- **Options UI Guidance (`options/options.html`, `options/options.js`):**
  - Overhauled folder sync setup panel with explicit tabs/cards for OneDrive, Google Drive, Dropbox, iCloud Drive, and Another folder.
  - Provides default desktop paths for Windows and macOS and instructions to create an `OmniPrompt` subfolder.
  - Informs the user: *"OmniPrompt can't see where this folder is. Make sure it is inside your cloud drive's folder."*
  - Clarified multi-device workflow: *"On your other computer: Install OmniPrompt, activate Pro, and select this exact same folder."*
- **Sync Timing Disclosure:**
  - Explicitly states: *"OmniPrompt syncs whenever this Options page is open, after any local edit in Options, and when you click 'Sync now'. Chrome security rules require the Options tab to access your local folder handle; syncing does not run in the background when Options is closed."*
- **Post-Launch Backlog Recording:**
  - Documented direct Google Drive API sync (`drive.appdata` scope via optional `identity` permission) in `.kiro/steering/product.md` and `product_research.md`.

---

## 3. Files Modified and Added

| File | Changes Made |
|---|---|
| `lib/promptStore.js` | Added `customModifiers`, `siteRules`, `compareTargets` to `K` and `DELTA_KEYS`. Added CRUD methods for modifiers and rules, host matching logic, `search({ host })` ranking, and compare targets persistence. |
| `lib/template.js` | Strict ES5 implementation of conditionals, date arithmetic, required fields, repeatable blocks, linter, and smart syntax detection. |
| `lib/modifiers.js` | Dynamic inclusion of custom modifiers in `getAll()`, `getById()`, and `apply()`, with 4 placement transforms. |
| `content/adapters.js` | Added `COMPARE_TARGETS` table for 12 verified chat targets. |
| `content/variableModal.js` | Added Compare footer drawer, target checkboxes, repeatable block form controls, required field validation, and live preview. |
| `content/commandPalette.js` | Passes `location.hostname` to search; renders "For this site" group; added "Compare in several AIs" action item. |
| `content/slashTrigger.js` | Passes `location.hostname` to search; renders "For this site" group. |
| `content/content.js` | Handled pending compare insertion on boot with bounded retry loop; handled `open_compare` message. |
| `content/content.css` | Styles for compare drawer, repeatable block buttons, and required field indicators. |
| `background/background.js` | Added handlers for `start_compare`, `get_pending_compare`, `compare_status`, and tab cleanup. Dynamic context menu rebuild for custom modifiers. |
| `popup/popup.html` / `popup.js` | Added Compare button and action handler. |
| `options/options.html` | Added Modifiers and Site Rules view panels, preset buttons, smart syntax chips, folder sync cloud instructions, and compare modal. |
| `options/options.js` | Wired navigation and CRUD for Modifiers and Site Rules, Option B permission requests, smart template linting, and compare modal. |
| `options/options.css` | Styles for Modifiers, Site Rules, and Folder Sync setup cards. |
| `README.md` | Documented 4 Pro features, smart syntax examples, Free/Pro comparison table, and storage layout table. |
| `PRIVACY.md` | Added Compare and Site Rules privacy declarations. |
| `CHROMEWEBSTORE.md` | Updated Pro features list and privacy declarations. |
| `CHANGELOG.md` | Added release notes under Unreleased. |
| `.kiro/steering/*.md` | Updated `product.md`, `tech.md`, `structure.md`, and `testing.md`. |
| `product_research.md` | Added post-launch Google Drive API backlog note. |
| `test/verify.js` | Added regression test sections 34-38 covering all new features and constraints. |

---

## 4. Verification and Test Results

1. **Automated Test Suite (`node test/verify.js`):**
   - 38 total sections evaluated.
   - **1014 passed, 0 failed.**
   - Verified:
     - Section 34: Compare across AIs (12 targets, defaults, max 6, session storage, adapter safety).
     - Section 35: Smart templates (conditionals, date arithmetic with month-end and leap-year clamping, required fields, repeat blocks, linter, 136 built-in byte-for-byte regression).
     - Section 36: Custom modifiers (CRUD, max 30, execution placements, context menus, Free tier retention).
     - Section 37: Site rules (exact and `*.` wildcard host matching, search boost, empty query grouping, max 50, hostname isolation).
     - Section 38: Folder sync setup copy and steering backlog notes.
2. **JavaScript Syntax Verification (`node --check`):**
   - All 20 shipped JavaScript files passed syntax verification with zero errors.
3. **ES5 Conformance:**
   - All files in `lib/` and `data/` strictly conform to ES5 syntax.

---

## 5. Manual Verification Walkthrough for the Founder

To manually verify the newly implemented features in Chrome:

### Step 1: Load the Extension
1. Open Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** (top-right toggle).
3. Click **Load unpacked** and select `c:\Zmy_work\1my_apps\1Extensions\prompt_manager`.
4. Pin the OmniPrompt icon to your toolbar.

### Step 2: Compare Across AIs (Pro vs Free)
1. **Free Tier Test:**
   - In Settings -> Plan, ensure the extension is on the Free plan (or click "Remove license").
   - Press `Alt+K` on any webpage. Highlight a prompt and choose "Compare in several AIs".
   - **Result:** The standard Pro upgrade modal opens; no tabs or windows are launched.
2. **Pro Tier Test:**
   - In Settings -> Plan, activate a Pro license using test key `test_license_key_12345` (in Dodo test mode).
   - Press `Alt+K`, select `//review` (Code Review), and choose "Compare in several AIs".
   - In the modal drawer, select ChatGPT, Claude, and Gemini. Choose "Tiled window" layout.
   - Click "Compare".
   - **Result:** OmniPrompt opens a new tiled window with three side-by-side tabs/windows for `chatgpt.com`, `claude.ai`, and `gemini.google.com`. Once the page composers render, the filled prompt text is inserted cleanly at the cursor in each composer.

### Step 3: Smart Templates Form Behavior
1. In the Options library, create a new prompt with template:
   ```
   {{#if tone=Formal}}Dear Sir/Madam,{{#else}}Hi {{name!}},{{/if}}
   Please review the project due on {{date+7d}}.
   {{#repeat deliverable}}- Deliverable: {{deliverable}}
   {{/repeat}}
   ```
2. Save the prompt.
3. Trigger this prompt via `//` or `Alt+K`.
4. **Result:**
   - The form displays `tone`, `name` (with an asterisk `*`), and a repeatable block for `deliverable`.
   - The "Insert" button is disabled until `name` is entered.
   - Changing `tone` to "Formal" immediately updates the live preview to "Dear Sir/Madam,".
   - Changing `tone` to "Friendly" updates the live preview to "Hi [name],".
   - Clicking "+ Add another" under Deliverable adds a second deliverable field.
   - The date shows exactly 7 days from today.

### Step 4: Custom Right-Click Modifier
1. Open Options -> **Modifiers**.
2. Click **Add modifier**. Set Title: "Bulletize", Instruction: "Convert the following text into 3 crisp bullet points:\n\n", Placement: "quote".
3. Save the modifier.
4. On any webpage (e.g. Wikipedia or an article), highlight a paragraph of text, right-click, and open **OmniPrompt**.
5. **Result:** "Bulletize" appears in the context menu after the 12 built-ins. Clicking it wraps the highlighted text in triple quotes and inserts it into the active text box (or copies it to clipboard).

### Step 5: Site Rule for Gmail
1. Open Options -> **Site rules**.
2. Click the **Email** preset button. The hostnames `mail.google.com`, `outlook.live.com`, and `outlook.office.com` populate automatically.
3. Link the rule to tag `email` or select email prompts.
4. If `mail.google.com` is not yet granted under Option B permissions, click "Turn on for this site" to grant permission.
5. Save the rule.
6. Open Gmail (`mail.google.com`) and start composing an email.
7. Press `Alt+K` or type `//`.
8. **Result:** With an empty search query, your email prompts appear at the very top of the list in a dedicated **"For this site"** group. Typing a search query applies a ranking boost to those prompts.
