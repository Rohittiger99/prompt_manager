# Chrome Web Store Listing — OmniPrompt

> Last Updated: 2026-09-29
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
• Role-Based Starter Packs: All 110 built-in prompts are free. Pick your role so your menu stays short.
• Instant Right-Click Modifiers: Highlight any text on any webpage to make it concise, fix grammar, generate test cases, or explain code.
• Portable: Import and export SKILL.md files, the format Claude, ChatGPT and Mistral skills use.

FOUR WAYS TO USE OMNIPROMPT

1. THE SLASH MENU (//)
Type // in any message box to open your prompt menu directly at your cursor. Filter by typing, navigate with arrow keys, and press Enter or Tab to insert. Only the trigger command is replaced—the rest of your draft stays intact.

2. COMMAND PALETTE (Alt+K)
Press Alt+K (or Ctrl+Shift+K) anywhere on the web to open a lightning-fast search overlay. Search through your prompts, favourite frequent prompts with a star, or filter by category.

3. DYNAMIC TEMPLATES WITH PLACEHOLDERS
Add placeholders like {{code}} or {{audience|beginners}} to any prompt. OmniPrompt opens a clean input dialog with pre-filled defaults, a live preview, and one-click Insert or Copy.

4. RIGHT-CLICK AI MODIFIERS
Select text anywhere on the web, right-click, and select an action under OmniPrompt (Make Concise, Debug Code, Fix Grammar, Explain Simply, Extract Action Items). The formatted prompt drops directly into your active chat box.

ORGANIZATION & CUSTOMIZATION
• Custom Categories with Curated Emoji Icons: Organize your collection with custom categories and emoji icons.
• Built-In Prompt Library: 110 expertly crafted prompts across Coding, Writing, Marketing, SEO, Productivity, and Expert Personas.
• Favourites & Usage Ranking: Star your top prompts for instant top-row access; frequently used prompts float to the top automatically.
• Import & Export: Backup your library to JSON, or easily import prompt collections from CSV, Markdown, text, and other prompt tools.

PRICING
• Free, forever: every insertion feature, all 110 built-in prompts, 25 prompts of your own, variables and dropdowns, modifiers, automatic backups, import and export. No credit card, no account.
• Pro, $25 once: unlimited prompts of your own, version history (restore any of the last 20 versions of a prompt), and context blocks ({{@client-brief}} drops one saved prompt into another). Future updates included. No subscription.
• Over the free limit, nothing is taken away. Every prompt keeps working and exporting.

PRIVACY & DATA SECURITY
• All prompt data and settings are stored locally on your device.
• OmniPrompt never reads your chats. It only types the text you choose into the box you are using.
• No tracking, no user profiling, no analytics.
• The only network request is to Dodo Payments, and only when you activate or deactivate a Pro licence key. It sends the key and the label "OmniPrompt Extension", nothing else.

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
| `storage` | permissions | Used to save the user's custom prompts, folder categories, starred favourites, and UI settings locally in the browser. |
| `unlimitedStorage` | permissions | Used to allow users to save large, multi-paragraph AI prompts, system instructions, and extensive prompt libraries locally without encountering browser storage quota caps. |
| `contextMenus` | permissions | Used to display the right-click "OmniPrompt" menu options (e.g. "Make Concise", "Fix Grammar", "Explain This Code") when a user highlights text on a webpage. |
| `scripting` | permissions | Used during extension install or update to inject the slash command listener and command palette into already-open tabs, ensuring functionality without forcing the user to manually reload all active tabs. |
| `<all_urls>` | host_permissions | Required so the slash command menu (`//`) and keyboard palette (`Alt+K`) can detect text input areas and insert prompts across any AI chat interface (including ChatGPT, Claude, Gemini, Perplexity, DeepSeek, Copilot, HuggingChat, Poe, and internal corporate AI tools) rather than restricting the user to a hardcoded domain whitelist. |

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
   - **Headline**: "Search 110+ Prompts in Milliseconds"
   - **Visual**: Dark-mode overlay (`Alt+K`) centered over a browser tab with a search box, starred favourites, and category tags.
   - **Callout**: "Press Alt+K anytime. Filter by category, star favourites, keyboard navigable."

3. **Screenshot 3 — Dynamic Templates with Live Preview**
   - **Headline**: "Fill-in-the-Blank Placeholders"
   - **Visual**: Variable modal showing fields for `{{code}}` and `{{language|TypeScript}}`, with real-time rendered prompt output below and action buttons ("Insert", "Insert & Send", "Copy").
   - **Callout**: "Never hand-edit prompt brackets again. Live preview before sending."

4. **Screenshot 4 — Role-Based Starter Packs & Emoji Icons**
   - **Headline**: "Curated for Developers, Marketers & Founders"
   - **Visual**: Options dashboard showcasing the Role Picker and custom categories styled with modern emoji badges.
   - **Callout**: "110 built-in prompts + custom categories. One-click role onboarding."

5. **Screenshot 5 — 100% Offline Privacy & No Monthly Fee**
   - **Headline**: "Zero Monthly Subscriptions. Zero Cloud Tracking."
   - **Visual**: Side-by-side comparison badge: "Competitors: $10-20/mo subscription + cloud tracking" vs "OmniPrompt: 100% Local Storage + $25 Pro, once".
   - **Callout**: "Your prompts stay in your browser. No account needed."

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
- [ ] Set `PRO_CHECKOUT_URL` in `lib/promptStore.js` to the real Dodo checkout link.
- [ ] ZIP packaged excluding `test/`, `.git/`, and dev scratch files.
- [ ] Privacy Policy hosted at public URL.

### Naming note

Keep AI brand names (ChatGPT, Claude, Gemini) out of the extension name. Put them in the description only. At least one competitor's listing was pulled over a brand name in its title.
