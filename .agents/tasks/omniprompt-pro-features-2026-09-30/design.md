# Design: OmniPrompt Pro Features (Four New Features & Folder Sync Setup)

**Date:** 2026-10-01  
**Task:** `.agents/tasks/omniprompt-pro-features-2026-09-30/brief.md`  
**Status:** Ready for review  

---

## 1. Executive Summary

This design specifies the implementation of the four new Pro features and the folder sync setup overhaul approved in the founder decision of September 30, 2026:
1. **Compare across AIs:** Dispatch a filled prompt simultaneously to up to 6 AI chat composers (ChatGPT, Claude, Gemini, Copilot, Perplexity, DeepSeek, Grok, etc.) in a tiled side-by-side window or background tabs without reading transcripts.
2. **Smart templates:** Enhance `lib/template.js` with conditionals (`{{#if}}...{{#else}}...{{/if}}`), date arithmetic (`{{date+7d}}`, `{{date-1w}}`, `{{date+1m}}`, `{{date+1y}}`), required fields (`{{field!}}`), and repeatable blocks (`{{#repeat item}}...{{/repeat}}`), with full backwards compatibility and strict ES5 compliance.
3. **Custom right-click modifiers:** Allow Pro users to author up to 30 custom context menu modifiers stored in `omni.customModifiers`, registered dynamically into the native browser context menu alongside the 12 built-in modifiers.
4. **Site rules:** Domain-aware prompt ranking stored in `omni.siteRules` that elevates site-relevant prompts to a "For this site" group (or applies a score boost) on specified hostnames (exact or `*.` wildcard).
5. **Folder sync setup clarification:** Clear, actionable in-app guidance for OneDrive, Google Drive, Dropbox, and iCloud Drive desktop folders, explicit disclosure of sync timing, and backlog documentation for direct Google Drive integration post-launch.

---

## 2. Updated Free / Pro Matrix

Following this implementation, the Pro tier consists of:
- **Unlimited custom prompts** (Free holds 20)
- **Client workspaces** (`omni.workspaces`)
- **Saved value sets** (`omni.variableSets`)
- **Stepped chains** (`omni.chains`)
- **Folder sync** (`omniprompt-folder-sync`)
- **One-click restore of earlier versions** (`omni.history`)
- **Context blocks** (`{{@shortcut}}`)
- **Compare across AIs** (New)
- **Smart templates authoring** (New: saving/editing smart templates requires Pro; inserting existing smart templates remains free)
- **Custom right-click modifiers** (New: creating, editing, and using custom modifiers requires Pro; viewing/exporting/deleting remains free)
- **Site rules** (New: creating, editing, and applying site rules requires Pro; viewing/exporting/deleting remains free)

The price remains **$25 one-time lifetime**. `PRO_FEATURES` in `lib/promptStore.js` will be updated to include the four new features, and `OmniStore.getProInfo()` will supply them to all surfaces.

---

## 3. Feature 1: Compare Across AIs

### 3.1 User Experience & Starting Points
- **Entry Points:**
  - **Command Palette (`content/commandPalette.js`):** "Compare in several AIs" action item in the action list for the currently highlighted/selected prompt.
  - **Popup (`popup/popup.js`):** "Compare" action button on prompt cards/actions.
  - **Options Page (`options/options.js`):** "Compare" action in prompt library table row actions menu.
- **Workflow (Principle 9 - Never destroy or hide the draft):**
  1. Triggering Compare opens `VariableModal` with the selected prompt so the user fills any variables and sees the exact rendered text.
  2. The modal presents a "Compare across AIs" section with target checkboxes and options:
     - Target checkboxes: ChatGPT, Claude, Gemini, Copilot, Perplexity, DeepSeek, Grok, Mistral Le Chat, Meta AI, Qwen, Kimi, Poe (capped at 6 selected targets).
     - Default selection: ChatGPT, Claude, Gemini. Last selected targets are persisted in `omni.compareTargets` in local storage.
     - Target accessibility indicator: If a target host is not enabled under Option B permissions, it displays a badge indicating permission is required, with a one-click "Enable" link calling `chrome.permissions.request`.
     - Layout option: "Tiled window" (default) vs "Tabs in current window" (persisted in settings).
     - Send option: "Send automatically in each tab" (unchecked by default; insert-only unless explicitly checked).
  3. Clicking "Compare" creates a transient batch job and dispatches message `start_compare` to the background service worker.

### 3.2 Target List & Endpoints
The target registry will be defined in a clean table `COMPARE_TARGETS` in `content/adapters.js` (and mirrored/exported for options/popup use):

| Service | Target ID | Hostname | New Chat URL | Adapter Status |
|---|---|---|---|---|
| ChatGPT | `chatgpt` | `chatgpt.com` | `https://chatgpt.com/` | Verified (`#prompt-textarea`) |
| Claude | `claude` | `claude.ai` | `https://claude.ai/new` | Verified (`div.ProseMirror`) |
| Gemini | `gemini` | `gemini.google.com` | `https://gemini.google.com/app` | Verified (`rich-textarea`) |
| Perplexity | `perplexity` | `perplexity.ai` | `https://www.perplexity.ai/` | Verified (`#ask-input`) |
| DeepSeek | `deepseek` | `deepseek.com` | `https://chat.deepseek.com/` | Verified (`textarea#chat-input`) |
| Copilot | `copilot` | `copilot.microsoft.com` | `https://copilot.microsoft.com/` | Verified (`textarea#userInput`) |
| Grok | `grok` | `grok.com` | `https://grok.com/` | Verified (`textarea[aria-label*="Ask"]`) |
| Le Chat | `mistral` | `chat.mistral.ai` | `https://chat.mistral.ai/chat` | Verified (`textarea`) |
| Meta AI | `metaai` | `meta.ai` | `https://www.meta.ai/` | Verified (`div[contenteditable="true"]`) |
| Qwen | `qwen` | `chat.qwen.ai` | `https://chat.qwen.ai/` | Verified (`textarea#chat-input`) |
| Kimi | `kimi` | `kimi.moonshot.cn` | `https://kimi.moonshot.cn/` | Verified (`div[contenteditable="true"]`) |
| Poe | `poe` | `poe.com` | `https://poe.com/` | Verified (`textarea`) |

All hostnames belong to the DNS/HTTP-verified Option B curated list in `manifest.json`.

### 3.3 Delivery & Service Worker Architecture
1. **Window / Tab Creation:**
   - The originating page passes `screenWidth: screen.availWidth` and `screenHeight: screen.availHeight`.
   - If "Tiled window" is chosen:
     - For $N$ targets ($1 \le N \le 6$):
       - If $N \le 3$: Single row of $N$ columns. Width per window = $\lfloor \text{availWidth} / N \rfloor$, height = $\text{availHeight}$.
       - If $N \ge 4$: 2 rows $\times \lceil N / 2 \rceil$ columns grid.
     - Uses `chrome.windows.create` with `left`, `top`, `width`, `height`, and `url`.
     - No new permissions are required (`tabs.create` and `windows.create` require no special manifest permission).
2. **Transient Job Queue in `chrome.storage.session`:**
   - Storage key prefix: `omni.session.compare.<tabId>`.
   - Payload: `{ id, text, autoSend, createdAt: Date.now() }`.
   - TTL: 2 minutes (120,000 ms). Expired jobs are discarded.
   - `chrome.tabs.onRemoved` removes any pending session job for that tab ID immediately.
3. **Content Script Handshake & Composer Insertion:**
   - Content script on the target page checks `chrome.runtime.sendMessage({ action: 'get_pending_compare' })`.
   - If a job exists, the content script acknowledges and clears the job.
   - Bounded retry loop: Polling interval 250ms, timeout 12,000ms.
   - Upon finding the composer, calls `ChatbotAdapters.insert(text, { mode: 'replace' })` followed by landing check `ChatbotAdapters.landingCheck()`.
   - If `autoSend` is true, calls `ChatbotAdapters.submit()`.
   - If timeout occurs or login wall is detected, displays toast: *"OmniPrompt: Composer not found (sign-in may be required). Your prompt was kept ready."*
   - Sends status report back to background: `{ action: 'compare_status', success: boolean, targetId, message }`.
4. **Principle 6 Compliance:**
   - Zero transcript scraping. Zero answer reading. Zero DOM surveillance of model responses.

### 3.4 Gating
- Free users see the Compare action and modal trigger.
- When clicked by a Free user, `openUpgradeModal('compare')` is invoked without creating any windows or tabs.

---

## 4. Feature 2: Smart Templates

### 4.1 Syntax Specification
The template engine in `lib/template.js` (strict ES5) will be extended to support four features while preserving 100% backwards compatibility:

1. **Conditionals:**
   ```
   {{#if variable=value}}Content when equal{{#else}}Content when not equal{{/if}}
   {{#if variable}}Content when variable is filled{{#else}}Content when empty{{/if}}
   ```
   - Supports `=` equality comparison (case-insensitive string comparison) and presence check (filled/truthy).
   - `#else` branch is optional.
   - Single-level nesting supported cleanly without complex backtracking.
   - Unbalanced blocks or malformed syntax render literally without throwing.
2. **Date Mathematics:**
   ```
   {{date+7d}}    7 days in the future
   {{date-1w}}    1 week in the past
   {{date+1m}}    1 month in the future (handles 31 Jan -> 28/29 Feb)
   {{date+1y}}    1 year in the future (handles 29 Feb -> 28 Feb in non-leap year)
   ```
   - Supported units: `d` (days), `w` (weeks), `m` (months), `y` (years).
   - Sign: `+` or `-`.
   - Uses the exact same formatting as `{{date}}` (`toLocaleDateString()`).
3. **Required Fields:**
   ```
   {{client_name!}}
   {{role!:Developer|Designer|Product}}
   {{summary!|Default summary}}
   ```
   - An exclamation mark `!` immediately following the variable identifier marks the field as strictly required.
   - In `variableModal.js`, required fields display an asterisk `*` and `required` attribute. The "Insert" button remains disabled with inline validation if any required field without a default is blank.
4. **Repeatable Blocks:**
   ```
   {{#repeat step}}
   - Step: {{step}}
   {{/repeat}}
   ```
   - Repeats the inner content for each item in an array/list.
   - In `variableModal.js`, renders dynamic "+ Add another" and "Remove" buttons for the repeated block.
   - Joins rendered blocks with newlines.

### 4.2 Parser & AST Design (Strict ES5)
- All new regexes and parsers will reside in `lib/template.js`.
- `hasSmartSyntax(template)`: Detects presence of `{{#if`, `{{#repeat`, `{{date[+-]`, or `{{[a-zA-Z0-9_]+!`.
- `parseVariables(template)`: Extracts both flat variables and repeated variables, correctly tagging `required: true` when `!` is present.
- `render(template, values, opts)`:
  - First expands conditionals based on provided values.
  - Expands repeatable blocks.
  - Evaluates date mathematics against the reference date.
  - Substitutes remaining variables and context blocks.
- Safety: If syntax is unbalanced or malformed, the parser does not throw; it leaves the unparseable tokens literal in the output.
- Byte-for-byte regression: A dedicated test will verify that all 136 built-in prompts render identical byte-for-byte output before and after this change.

### 4.3 Options Page & Editor Integration
- **Syntax Help Panel:** A collapsible "Smart Syntax" reference card in the prompt editor with one-click insertion buttons for conditionals, date maths, required markers, and repeatable blocks.
- **Save-Time Linter:** When saving a prompt, checks for unbalanced `{{#if}}...{{/if}}` or `{{#repeat}}...{{/repeat}}`, unknown date units, or malformed conditions. Displays a clear warning modal/banner.
- **Gating:**
  - Saving or editing a prompt that contains smart syntax requires Pro (`OmniStore.isPro()`).
  - Inserting/running a prompt containing smart syntax works 100% on Free (Principle 3: reading and inserting are never held hostage).
  - Importers leave smart syntax intact without requiring Pro.

---

## 5. Feature 3: Custom Right-Click Modifiers

### 5.1 Data Model & Storage
- Custom modifiers are stored in `omni.customModifiers` in `chrome.storage.local`.
- Item schema:
  ```javascript
  {
    id: 'mod-custom-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6),
    title: 'Summarize Key Takeaways',
    shortTitle: 'Summarize',
    icon: '📌',
    description: 'Extract 3 main bullets.',
    instruction: 'Extract the 3 main takeaways from the text below:\n\n',
    placement: 'quote' // 'quote' | 'fence' | 'after' | 'before'
  }
  ```
- Placement formatting:
  - `'quote'`: `instruction + '\n\n"""\n' + text + '\n"""'`
  - `'fence'`: `instruction + '\n\n```\n' + text + '\n```'`
  - `'after'`: `instruction + '\n\n' + text`
  - `'before'`: `text + '\n\n' + instruction`
- **Cap:** Hard limit of 30 custom modifiers (enforced in `promptStore.js` and displayed in UI).

### 5.2 Context Menu Integration
- In `background/background.js`:
  - `rebuildContextMenus()` fetches both built-in modifiers (`OmniModifiers.getAll()`) and custom modifiers (`OmniStore.getCustomModifiers()`).
  - Checks if user is Pro (`OmniStore.isPro()`). If Free, custom modifiers are excluded from context menus.
  - If Pro and custom modifiers exist, adds a separator followed by each custom modifier.
  - Context menu click handler: If `menuItemId` starts with `mod-custom-`, resolves modifier from `OmniStore.getCustomModifier(id)` and applies placement transform to the selected text.

### 5.3 Storage & Lifecycle Handling
- `omni.customModifiers` is included in:
  - `DELTA_KEYS`
  - JSON Backup export and restore (`OmniStore.createBackup()`, `OmniStore.restoreBackup()`)
  - Cross-device sync
  - Automatic snapshots
- Importing never overwrites built-in modifiers (they use fixed `mod-*` IDs).

### 5.4 Gating
- Creating, editing, reordering, and context-menu execution require Pro.
- Free users can view existing custom modifiers in the Options "Modifiers" tab, export them in backups, and delete them. The options page displays: *"Custom right-click modifiers are active with OmniPrompt Pro."*

---

## 6. Feature 4: Site Rules

### 6.1 Data Model & Host Matching
- Site rules are stored in `omni.siteRules` in `chrome.storage.local`.
- Schema:
  ```javascript
  {
    id: 'rule-' + slug(name) + '-' + Date.now().toString(36),
    name: 'Email Assistants',
    hosts: ['mail.google.com', 'outlook.live.com', 'outlook.office.com'],
    tags: ['email'],
    folders: [],
    promptIds: []
  }
  ```
- **Host Matching Rules:**
  - Case-insensitive.
  - Exact match: `host === ruleHost` (e.g. `mail.google.com === mail.google.com`).
  - Wildcard match: Rule starts with `*.` (e.g. `*.atlassian.net` matches `jira.atlassian.net` and `confluence.atlassian.net`).
  - Strict boundary checking: Substring matches are strictly rejected (e.g. `mail.google.com.evil.com` or `notmail.google.com` do NOT match `mail.google.com`).
- **Cap:** Hard limit of 50 rules (enforced in `promptStore.js` and displayed in UI).

### 6.2 Preset Suggestions
Four built-in suggestion presets in the rules editor (inactive until user clicks "Add"):
1. **Email:** `mail.google.com`, `outlook.live.com`, `outlook.office.com`
2. **Code:** `github.com`, `gitlab.com`, `stackoverflow.com`
3. **Work Chat:** `app.slack.com`, `teams.microsoft.com`
4. **Docs:** `docs.google.com`, `notion.so`

### 6.3 Ranking Algorithm in `lib/promptStore.js`
`OmniStore.search(opts)` will accept `opts.host`:
- Evaluates active rules matching `opts.host`.
- Collects matched prompt IDs based on rule `promptIds`, `tags`, and `folders`.
- **Empty Query (`query === ''`):**
  - Matched prompts are sorted to the top and flagged with `forSite: true`.
  - In `commandPalette.js` and `slashTrigger.js`, these are rendered in a dedicated **"For this site"** group at the top of the menu.
- **Typed Query (`query !== ''`):**
  - Prompts matching the site rule receive a moderate bonus (`+350`), ensuring site relevance boosts ranking while allowing strong direct text/shortcut matches (`+1000` to `+10000`) to win.
- **Performance:** Matching prompt IDs are precomputed on page load and cached until `settings_changed` is broadcast. Content scripts inspect only `location.hostname` (zero page scraping).

### 6.4 Option B Permissions Interplay
Preset hosts (e.g. `github.com`, `mail.google.com`) are not in the default AI chat domain list.
In the Site Rules editor:
- Checks if the rule's host is covered by default AI rules or granted permissions.
- If not enabled, displays an inline notice: *"OmniPrompt is not enabled on this site yet"* with a *"Turn on for this site"* button invoking `chrome.permissions.request({ origins: ['https://' + host + '/*'] })`.

### 6.5 Gating
- Creating and editing site rules, and applying them to ranking, requires Pro.
- Free users see rules listed in Options, can export and delete them, but they are not applied in content script ranking.

---

## 7. Folder Sync Setup Clarification

### 7.1 UX & Copy Overhaul
In `options/options.html` and `options/options.js`, the folder sync section will present four explicit cloud drive providers plus "Another folder":
1. **OneDrive:**
   - Guidance: *"Install Microsoft OneDrive for Windows or macOS."*
   - Default locations:
     - Windows: `C:\Users\<you>\OneDrive`
     - macOS: `~/Library/CloudStorage/OneDrive-*`
   - Instructions: *"Create a folder named `OmniPrompt` inside your OneDrive folder and choose it below."*
2. **Google Drive:**
   - Guidance: *"Install Google Drive for desktop."*
   - Default locations:
     - Windows: `G:\My Drive` (or your mapped Google Drive letter)
     - macOS: `~/Library/CloudStorage/GoogleDrive-*/My Drive`
   - Instructions: *"Create a folder named `OmniPrompt` inside My Drive and choose it below."*
3. **Dropbox:**
   - Guidance: *"Install the Dropbox desktop app."*
   - Default locations:
     - Windows: `C:\Users\<you>\Dropbox`
     - macOS: `~/Library/CloudStorage/Dropbox`
   - Instructions: *"Create a folder named `OmniPrompt` inside Dropbox and choose it below."*
4. **iCloud Drive:**
   - Guidance: *"Install iCloud for Windows or use iCloud Drive on macOS."*
   - Default locations:
     - Windows: `C:\Users\<you>\iCloudDrive`
     - macOS: `~/Library/Mobile Documents/com~apple~CloudDocs` (iCloud Drive in Finder)
   - Instructions: *"Create a folder named `OmniPrompt` inside iCloud Drive and choose it below."*
5. **Another Folder:** Standard manual picker for custom NAS, Syncthing, or local directories.

### 7.2 Explicit Sync Timing Disclosure
The options page will clearly explain:
> *"OmniPrompt syncs whenever this Options page is open, after any local edit in Options, and when you click 'Sync now'. Chrome security rules require the Options tab to access your local folder handle; syncing does not run in the background when Options is closed."*

### 7.3 Multi-Device Flow
- Once a folder is connected, the UI notes: *"On your other computer: Install OmniPrompt, activate Pro, and select this exact same folder."*
- If `omniprompt-library.json` already exists in the chosen folder, OmniPrompt reports: *"Found a library from another computer"* and merges changes safely.

### 7.4 Post-Launch Backlog Recording
Direct Google Drive API connection (`drive.appdata` scope via optional `identity` permission) will be documented in `product.md` and `product_research.md` as an open backlog item.

---

## 8. Implementation Steps & Sequencing

To maintain test suite green status (`node test/verify.js`) at every stage:
1. **Step 1: Store & Gating Foundation**
   - Update `lib/promptStore.js` with new `K` keys (`customModifiers`, `siteRules`), limits, and expanded `PRO_FEATURES`.
   - Update `PRO_FEATURES` in `lib/promptStore.js`.
   - Add store APIs for custom modifiers, site rules, and compare jobs.
2. **Step 2: Smart Templates (`lib/template.js` & `content/variableModal.js`)**
   - Implement conditionals, date maths, required markers, and repeatable blocks in `lib/template.js` (strict ES5).
   - Update `content/variableModal.js` with live preview and required field validation.
   - Update options prompt editor with syntax help and linter.
   - Add template tests in `test/verify.js` (including built-in byte-for-byte regression).
3. **Step 3: Custom Right-Click Modifiers (`lib/modifiers.js`, `background/background.js`, `options/*`)**
   - Implement custom modifier management in `lib/modifiers.js` and `options/options.js`.
   - Update background context menu builder to append custom modifiers.
   - Add modifier tests in `test/verify.js`.
4. **Step 4: Site Rules (`lib/promptStore.js`, `content/*`, `options/*`)**
   - Implement site rules management and `OmniStore.search({ host })` ranking.
   - Update `content/commandPalette.js` and `content/slashTrigger.js` to render "For this site" group and pass hostname.
   - Update options page with Site Rules editor and presets.
   - Add site rule tests in `test/verify.js`.
5. **Step 5: Compare Across AIs (`content/adapters.js`, `background/background.js`, `popup/*`, `options/*`)**
   - Add target table `COMPARE_TARGETS` in `content/adapters.js`.
   - Add compare dialog to variable modal, palette, popup, and options.
   - Implement background session job dispatcher, window tiling math, and target content script handshake.
   - Add compare tests in `test/verify.js`.
6. **Step 6: Folder Sync Setup Clarification & Backlog Documentation**
   - Update `options/options.html` and `options/options.js` folder sync panel.
   - Document direct Google Drive sync in `product.md` and `product_research.md`.
7. **Step 7: Documentation, Steering, and Comprehensive Verification**
   - Update `README.md`, `PRIVACY.md`, `CHROMEWEBSTORE.md`, `CHANGELOG.md`, and `.kiro/steering/*.md`.
   - Run `node test/verify.js` and `node --check` across all JavaScript files.
   - Produce `report.md`.
