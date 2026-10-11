# Chrome Web Store Listing — OmniPrompt

> Last Updated: 2026-09-30
> Extension Version: 2.0.0

---

## Store Listing Metadata

**Extension Name** [REQUIRED]
```
OmniPrompt - Universal AI Prompt Manager
```
*(40 characters / 75 max)*

**Short Description** [REQUIRED]
```
Offline prompt manager for ChatGPT, Claude, Gemini & any text box. Slash commands //, Alt+K palette, variables, and starter packs.
```
*(127 characters / 132 max)*

**Category** [REQUIRED]
```
Productivity
```

**Single Purpose** [REQUIRED]
```
Manages and inserts custom prompt templates with variables across AI chat interfaces using quick slash commands and search.
```

**Primary Language** [REQUIRED]
```
English
```

---

## Detailed Description (CWS Formatted)

*Note for Developer Dashboard: The Chrome Web Store strips markdown formatting like bold asterisks. Use the plain-text formatted text below with unicode bullets (•) and line breaks:*

```text
OmniPrompt is the universal, privacy-first AI prompt manager that works offline in any chat box—ChatGPT, Claude, Gemini, Perplexity, DeepSeek, Copilot, and custom web tools.

Stop switching between notes apps, documents, and chat windows to copy-paste prompts. Type // directly in your chat input to open your prompt library, or hit Alt+K for a universal search palette. Prompts with {{placeholders}} open an interactive form with a live preview before insertion.

WHY OMNIPROMPT?
• Truly Universal: Works across every AI web interface without locking you into a single proprietary ecosystem.
• Caret-Preserving: Never overwrites your existing draft. Inserts cleanly right where your cursor is positioned.
• 100% Offline & Private: Your prompts, custom templates, and categories live in your browser's local storage. Zero analytics, zero telemetry, no accounts required.
• Dynamic Variables: {{topic}}, {{language|Python}}, dropdowns like {{tone:Formal|Friendly}}, and self-filling {{selection}}, {{page_title}}, {{url}} and {{date}}.
• Never Lose a Prompt: Automatic daily backups on your computer, one-click restore, and a clear "last backup" status.
• Never Fails Silently: If a site's text box refuses the text, OmniPrompt copies it to your clipboard and tells you.
• Save From Anywhere: Highlight text on any page, right-click, and save it as a new prompt.
• Role-Based Starter Packs: All 136 built-in prompts are free. Pick your role so your menu stays short.
• Instant Right-Click Modifiers: Highlight any text on any webpage to make it concise, fix grammar, generate test cases, or explain code.
• Portable: Import and export SKILL.md files, the format Claude, ChatGPT and Mistral skills use.

FOUR WAYS TO USE OMNIPROMPT

1. THE SLASH MENU (//)
Type // in any message box to open your prompt menu directly at your cursor. Filter by typing, navigate with arrow keys, and press Enter or Tab to insert. Only the trigger command is replaced—the rest of your draft stays intact.

2. COMMAND PALETTE (Alt+K)
Press Alt+K (or Ctrl+Shift+K) anywhere on the web to open a search overlay. Favourites and recent prompts come first, and a preview panel shows the exact text a prompt will insert before you pick it.

3. DYNAMIC TEMPLATES WITH PLACEHOLDERS
Add placeholders like {{code}} or {{audience|beginners}} to any prompt. OmniPrompt opens a clean input dialog with pre-filled defaults, a live preview, and one-click Insert or Copy.

4. RIGHT-CLICK AI MODIFIERS
Select text anywhere on the web, right-click, and select an action under OmniPrompt (Make Concise, Debug Code, Fix Grammar, Explain Simply, Extract Action Items). The formatted prompt drops directly into your active chat box.

ORGANIZATION & CUSTOMIZATION
• Learn it in a minute: the welcome page has a practice box where you type //, pick a prompt and fill it in before you try it on a real site.
• A library you can read: browse prompts as cards or a list, and open any one to see its full text and the blanks its form will ask for.
• Custom Categories with Curated Emoji Icons: Organize your collection with custom categories and emoji icons.
• Built-In Prompt Library: 136 prompts across Coding, Writing, Marketing, SEO, Productivity, Expert Personas and Client Work.
• Favourites & Usage Ranking: Star your top prompts for instant top-row access; frequently used prompts float to the top automatically.
• Import & Export: Backup your library to JSON, or easily import prompt collections from CSV, Markdown, text, and other prompt tools.

PRICING
• Free, forever: every insertion feature, all 136 built-in prompts, 20 prompts of your own, variables and dropdowns, modifiers, automatic backups and restoring them, folders and tags, bulk edit, tidy-up, remembered answers, version history with one-click restore, Chrome profile sync, import and export. No credit card, no account.
• Pro, $25 once:
  – Unlimited prompts of your own.
  – Compare across AIs: send a prompt to up to 6 AI composers simultaneously (ChatGPT, Claude, Gemini, Copilot, Perplexity, DeepSeek) in tiled windows or tabs.
  – Smart templates: conditionals, date arithmetic, required fields, and repeatable blocks.
  – Custom modifiers: create up to 30 custom right-click and palette modifiers.
  – Site rules: domain-based prompt ranking that puts relevant prompts first for specific sites.
  – Client workspaces: switch client and every name, tone and brief fills in for that client.
  – Saved value sets: refill a form in one click under a named set.
  – Stepped chains: run a sequence of prompts one step at a time. You decide when to move on; nothing is sent for you.
  – Folder sync: keep your library in a folder you choose, such as Dropbox or OneDrive, and share it between computers with no size limit. No account and no server of ours.
  – Context blocks ({{@client-brief}} drops one saved prompt into another).
  Future updates included. No subscription.
• Over the free limit, nothing is taken away. Every prompt keeps working and exporting.

PRIVACY & DATA SECURITY
• All prompt data and settings are stored locally on your device.
• OmniPrompt never reads your chats. It only types the text you choose into the box you are using.
• No tracking, no user profiling, no analytics.
• The only network request is to Dodo Payments, and only when you activate or deactivate a Pro licence key. It sends the key and the label "OmniPrompt Extension", nothing else.
• Folder sync (Pro) only writes a file to a folder you pick. OmniPrompt uploads nothing; a cloud drive's own app moves the file if you choose one.
• Compare across AIs opens tabs and types text only. It never reads answers, and there is no new network traffic.
• Site rules use only the site address, evaluated locally on your computer.

SUPPORT & FEEDBACK
Have a question, feedback, or prompt pack suggestion? 
Contact us at: support@omniprompt.app (or open an issue on GitHub)
```

---

## Keywords & ASO Strategy

Target search queries in the Chrome Web Store:

| Priority | Target Keywords | Search Intent |
|----------|-----------------|---------------|
| Primary | `prompt manager`, `ai prompts`, `chatgpt prompts`, `claude prompts`, `gemini prompts` | Users looking to organize and save prompts for major LLMs |
| Secondary | `slash commands`, `prompt templates`, `ai text expander`, `prompt library`, `deepseek prompts` | Power users looking for fast text expansion and snippet workflows |
| Long-tail | `offline prompt manager`, `ai prompt snippet`, `chatgpt shortcuts`, `prompt variables` | Privacy-conscious developers and professionals looking for local storage |

---

## Permissions Justification (For CWS Review)

*Copy each justification directly into the "Permissions Justifications" fields in the Developer Dashboard:*

| Permission | Type | Justification for Review Team |
|------------|------|-------------------------------|
| `storage` | permissions | Used to save the user's custom prompts, folders, categories, starred favourites, and UI settings locally in the browser. |
| `unlimitedStorage` | permissions | Used to allow users to save large, multi-paragraph AI prompts, system instructions, and extensive prompt libraries locally without encountering browser storage quota caps. |
| `contextMenus` | permissions | Used to display the right-click "OmniPrompt" menu options (e.g. "Make Concise", "Fix Grammar", "Explain This Code") when a user highlights text on a webpage, and "Save selection as a new prompt...". |
| `scripting` | permissions | Used during extension install or update to inject the slash command listener and command palette into already-open tabs, ensuring functionality without forcing the user to manually reload all active tabs, and inject on demand. |
| `activeTab` | permissions | Used to provide temporary on-demand access to the current tab when the user invokes the browser command (Ctrl+Shift+K) or a right-click context menu item on any page without requiring broad host permissions. |
| Host permissions (AI sites) | host_permissions | Pre-configured access to curated AI chat and assistant domains (ChatGPT, Claude, Gemini, Perplexity, DeepSeek, Copilot, Grok, etc.) so OmniPrompt works immediately out of the box. |
| `<all_urls>` | optional_host_permissions | Requested only when the user explicitly enables "Use OmniPrompt on every website" in Settings, allowing the slash command menu (`//`) and keyboard palette (`Alt+K`) to detect text inputs and insert prompts on any site (e.g. Gmail, Slack, Jira, Notion). |

---

## Privacy & Data Use Declarations

*Answers to match the Chrome Web Store Data Safety Form:*

- **Does the extension collect user data?** `No`
- **Data Collection Table:**
  - Personally identifiable info: `Not collected`
  - Health info: `Not collected`
  - Financial & payment info: `Not collected` (Payments handled externally via Dodo Payments checkout)
  - Authentication info: `Not collected`
  - Personal communications: `Not collected`
  - Location: `Not collected`
  - Web history: `Not collected`
  - User activity: `Not collected`
  - Website content: `Not collected`
- **Data Use Certifications:**
  - [x] The extension does not sell user data to third parties.
  - [x] The extension does not use or transfer user data for purposes unrelated to the item's core functionality.
  - [x] The extension does not use or transfer user data for creditworthiness or lending purposes.

---

## Graphics & Asset Plan

| Asset | Dimensions | File Path | Status |
|-------|------------|-----------|--------|
| Store Icon | 128×128 PNG | `icons/icon128.png` | ✅ Ready |
| Extension Icon 16 | 16×16 PNG | `icons/icon16.png` | ✅ Ready |
| Extension Icon 48 | 48×48 PNG | `icons/icon48.png` | ✅ Ready |
| Screenshot 1: Universal Slash Menu | 1280×800 PNG | `assets/store/screenshot1-slash-menu.png` | 🟡 Specified below |
| Screenshot 2: Command Palette | 1280×800 PNG | `assets/store/screenshot2-palette.png` | 🟡 Specified below |
| Screenshot 3: Interactive Variables | 1280×800 PNG | `assets/store/screenshot3-variables.png` | 🟡 Specified below |
| Screenshot 4: Role Packs & Categories | 1280×800 PNG | `assets/store/screenshot4-categories.png` | 🟡 Specified below |
| Screenshot 5: Offline & Lifetime Pro | 1280×800 PNG | `assets/store/screenshot5-pro-privacy.png` | 🟡 Specified below |
| Small Promo Tile | 440×280 PNG | `assets/store/promo-small-440x280.png` | 🟡 Specified below |
| Marquee Banner | 1400×560 PNG | `assets/store/promo-marquee-1400x560.png` | 🟡 Specified below |

### Screenshot Layout Specifications

1. **Screenshot 1 — Universal Slash Command**
   - **Headline**: "Instant Prompts Anywhere You Type"
   - **Visual**: ChatGPT or Claude composer with `//review` typed in. The OmniPrompt popup menu floats neatly right above the cursor showing "Rigorous Code Review", "Bug & Root Cause", etc.
   - **Callout**: "Type // to trigger. Works in ChatGPT, Claude, Gemini, and any text box."

2. **Screenshot 2 — Command Palette Search**
   - **Headline**: "Search 136 Prompts in Milliseconds"
   - **Visual**: Dark-mode overlay (`Alt+K`) centered over a browser tab: search box and results on the left, the preview panel with the full prompt text on the right.
   - **Callout**: "Press Alt+K anytime. See the exact text before you insert it."

3. **Screenshot 3 — Dynamic Templates with Live Preview**
   - **Headline**: "Fill-in-the-Blank Placeholders"
   - **Visual**: Variable modal showing fields for `{{code}}` and `{{language|TypeScript}}`, with real-time rendered prompt output below and action buttons ("Insert", "Insert & send", "Copy").
   - **Callout**: "Never hand-edit prompt brackets again. Live preview before sending."

4. **Screenshot 4 — Role-Based Starter Packs & Emoji Icons**
   - **Headline**: "Curated for Developers, Marketers & Founders"
   - **Visual**: The welcome page starter-pack picker next to the library page in card view, with the preview panel open.
   - **Callout**: "136 built-in prompts + custom categories. One-click role onboarding."

5. **Screenshot 5 — 100% Offline Privacy & No Monthly Fee**
   - **Headline**: "Zero Monthly Subscriptions. Zero Cloud Tracking."
   - **Visual**: Side-by-side comparison badge: "Competitors: $10-20/mo subscription + cloud tracking" vs "OmniPrompt: 100% Local Storage + $25 Pro, once".
   - **Callout**: "Your prompts stay in your browser. No account needed."

---

## Submission Answers

### Single-Purpose Description
```
OmniPrompt saves reusable text prompts and inserts them at the cursor in any text box, through a // menu, a keyboard palette and the right-click menu.
```

### Permission Justifications
- **`storage`**: Saves the user's prompts, categories, favourites, backups and settings in the browser's own storage. If the user switches on sync, a copy is kept in Chrome sync storage for their own signed-in browsers. Nothing is sent to a server.
- **`unlimitedStorage`**: Prompt libraries, the seven automatic local backups and the per-prompt version history can exceed the 10 MB local storage limit. Without this permission a backup or an edit could fail to save. Everything stays on the device.
- **`contextMenus`**: Adds an OmniPrompt entry to the right-click menu on selected text and text boxes: 12 text modifiers (for example Make Concise, Fix Grammar), Save selection as a new prompt, and Open prompt library.
- **`scripting`**: After install or update, injects the extension's own packaged content scripts into tabs that are already open, so the prompt menu works without reloading every tab. Also used to recover a tab when the user presses the keyboard shortcut and the script is missing. No remote code is injected.
- **`<all_urls>`**: The core feature is typing // or pressing Alt+K in any text box to insert a saved prompt at the cursor. Users do this in AI chat sites and in any other text box they choose (email, issue trackers, documents), so the content script must run on all sites. It only reads the focused text box to insert text and to check the text arrived. It never reads chat transcripts or page content, and sends nothing anywhere. Users can switch it off per site in Settings.

### Remote Code Declaration
- **Are you using remote code?**: No, I am not using remote code.
- **Justification**: All JavaScript is packaged in the extension. There is no remote script, eval, or dynamically fetched code. The only network request is a JSON call to Dodo Payments to activate or deactivate a licence key the user enters.

### Data Use Declarations
- **Data collected**: No data is collected. The only network transmission is the licence key sent to Dodo Payments when the user activates or deactivates Pro; this is disclosed under the privacy policy.

> Note: `dist/` must be rebuilt after switching `DODO_MODE` to `'live'` before final submission.

---

## Release Checklist

- [x] Manifest V3 compliant.
- [x] Manifest description strictly under 132 characters (127 characters).
- [x] Icons generated at 16x16, 48x48, and 128x128.
- [x] Unlimited local storage configured (`unlimitedStorage` in manifest).
- [x] Dodo Payments license activation wired client-side (no backend server required).
- [x] No hard-coded licence keys in shipped code.
- [x] Extension-page CSP limits network access to Dodo Payments (`connect-src`).
- [x] Zero telemetry or unexpected network requests in content scripts or UI.
- [x] Automated regression suite passing (`node test/verify.js`).
- [x] Test-mode product "OmniPrompt Pro - Lifetime" created in Dodo (`pdt_0NoiqA74MQN0ZbtDNA8tq`, $25 one-time, licence key, 5 activations). `PRO_PRODUCT_IDS.test` and `PRO_CHECKOUT_URLS.test` point at it.
- [ ] Create the same product in Dodo **live** mode. Put its `pdt_` id in `PRO_PRODUCT_IDS.live` and its checkout link in `PRO_CHECKOUT_URLS.live` in `lib/promptStore.js`. Until then no live key activates Pro, and keys sold for your other products must stay refused.
- [ ] Set `DODO_MODE` to `'live'` in `lib/promptStore.js` before packaging. In `'test'` mode anyone can buy a key with a test card. A live build ignores test licences.
- [ ] ZIP packaged excluding `test/`, `.git/`, and dev scratch files.
- [ ] Rebuild dist zip (current one predates Pro features).
- [ ] Privacy Policy hosted at public URL.

### Naming note

Keep AI brand names (ChatGPT, Claude, Gemini) out of the extension name. Put them in the description only. At least one competitor's listing was pulled over a brand name in its title.
