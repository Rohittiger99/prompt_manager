# OmniPrompt Option B Permissions & Free/Pro Re-split Report

**Date:** 2026-10-01  
**Status:** Completed  
**Test Suite:** 902 passed, 0 failed (`node test/verify.js`)  
**Syntax Checks:** All 19 JS files passed (`node --check`)

---

## 1. Executive Summary

This phase delivered two major architectural transitions for OmniPrompt:
1. **Option B Permissions Model**: Replaced the previous broad `<all_urls>` required host permission with a curated, DNS/HTTP-verified list of 133 AI chat domain patterns, eliminating broad Chrome Web Store installation warnings. Provided an accessible toggle ("Use OmniPrompt on every website") backed by optional `<all_urls>` permission, dynamic content script registration (`chrome.scripting.registerContentScripts`), on-demand injection via `activeTab` for keyboard commands (`Ctrl+Shift+K`) and context menus, an actionable "Turn on for this site" banner in the popup for uncovered sites, and a dedicated website/URL paste input in Settings.
2. **Free / Pro Re-split**: Repositioned the product according to founder decisions. Moved folders, tag filters, sorting, bulk edit, tidy-up suggestions, remembered short answers (`omni.lastValues`), and viewing/copying version history to the Free tier. Focused Pro on power workflows: custom prompt cap (20 Free vs Unlimited Pro), client workspaces, saved value sets, stepped chains, folder sync, context blocks (`{{@shortcut}}`), and one-click version restore. Confirmed $25 one-time lifetime license price across all documentation, steering files, and code.

---

## 2. Key Architectural Changes

### 2.1 Manifest V3 Permissions (`manifest.json`)
- **Required permissions:** `["storage", "unlimitedStorage", "contextMenus", "scripting", "activeTab"]`.
- **Optional host permissions:** `["<all_urls>"]`.
- **Host permissions & Content script matches:** 133 curated AI chat host patterns covering OpenAI, Anthropic, Google, Microsoft, Perplexity, DeepSeek, Mistral, Meta, Quora Poe, HuggingFace, Alibaba Qwen/Tongyi, Moonshot Kimi, Zhipu, Baidu, MiniMax/Hailuo, You.com, Phind, DuckDuckGo, Inflection, Character.ai, LMSYS Arena, OpenRouter, Groq, Cohere, Vercel v0, Bolt.new, Lovable, Replit, Midjourney, Ideogram, Leonardo, Krea, Runway, Suno, Udio, Adobe Firefly, Kling, Pika, Luma, Jasper, Copy.ai, and Writesonic.
- **Content script exclude matches:** Chrome Web Store and Edge Add-ons galleries.

### 2.2 Background Service Worker (`background/background.js`)
- **Dynamic Content Script Registration:**
  - Registered `omniprompt-everywhere` when `<all_urls>` is granted.
  - Registered `omniprompt-site-<hash>` when individual site origins are granted.
  - Handled `chrome.permissions.onAdded` and `chrome.permissions.onRemoved` dynamically.
  - Implemented `reconcileDynamicScripts()` on `onInstalled` and `onStartup`.
- **On-Demand Injection via `activeTab`:**
  - `commands.onCommand ('toggle-command-palette')`: if active tab lacks a content script, dynamically injects `CONTENT_SCRIPTS` via `chrome.scripting.executeScript` and opens the palette.
  - `contextMenus.onClicked`: handles `saveSelectionAsPrompt` and quick modifiers on any webpage with on-demand injection.
  - Added message handler `inject_into_tab` for immediate injection when permissions are granted from UI.

### 2.3 Store Layer (`lib/promptStore.js`)
- Strictly maintained ES5 compatibility across all helper libraries.
- Removed `library` from `PRO_FEATURES`. Updated descriptions for `sets` and `history`.
- Removed Pro restriction checks (`isPro()`) from `createFolder`, `renameFolder`, `moveFolder`, `bulkUpdate`, and `bulkDelete`.
- Allowed Free users to save and retrieve remembered short answers via `rememberValues` and `getValueSources`.

### 2.4 User Interface Surfaces
- **Options Page (`options/options.html`, `options/options.js`):**
  - Removed Pro badges from Folders and Tags sidebars, Tidy-up button, and Editor folder picker.
  - Added "Website access" group containing:
    - "Use OmniPrompt on every website" toggle.
    - "Enable a website" URL/domain input with automatic URL parsing (cleaning protocols, paths, and www prefixes) and permission requests.
    - Individually enabled sites pill list with instant removal buttons.
  - Updated Pro comparison table and copy.
  - Added "Copy" button to version history modal for Free users while keeping "Restore" gated to Pro.
- **Toolbar Popup (`popup/popup.html`, `popup/popup.css`, `popup/popup.js`):**
  - Added `#site-permission-banner` displayed when visiting a site not covered by default AI rules or granted permissions.
  - Action buttons: "Turn on for this site" (requests origin permission and immediately injects content script) and "Turn on everywhere".
- **Welcome Page (`welcome/welcome.html`, `welcome/welcome.css`, `welcome/welcome.js`):**
  - Added "Use OmniPrompt on every website" section with accessible switch and real-time permission status.

### 2.5 Documentation & Steering Files
- `README.md`: Updated permissions table (added `activeTab` and optional `<all_urls>`), Free vs Pro comparison table, and storage layout.
- `PRIVACY.md` & `CHROMEWEBSTORE.md`: Updated permission justifications for CWS review and privacy declarations.
- `product_research.md`: Added founder decision banner noting $25 final lifetime price and superseding earlier $19/$39 notes.
- Steering files (`.kiro/steering/tech.md`, `structure.md`, `testing.md`, `product.md`): Aligned all rules, architecture, and feature definitions.
- `CHANGELOG.md`: Added Unreleased release notes.

---

## 3. Verification & Test Results

1. **Full Test Suite (`node test/verify.js`):**
   - 33 sections evaluated.
   - **902 passed, 0 failed.**
   - All assertions for permissions, set equality between `host_permissions` and `content_scripts[0].matches`, absence of broad platforms in host permissions, Free folders/tags/bulk/tidy-up/remembered answers, and Pro gating verified.

2. **JavaScript Syntax Verification (`node --check`):**
   - All 19 scripts verified without errors.

3. **ES5 Conformance (`lib/promptStore.js`):**
   - Verified 0 ES6 syntax keywords (`const`, `let`, `=>`, `class`) in executable code.

---

## 4. Manual Verification Steps

1. **Test Installation & Default Host Permissions:**
   - In Chrome, navigate to `chrome://extensions/` and load unpacked extension.
   - Confirm install dialog does NOT show "Read and change all your data on all websites" warning. It only requests permissions on listed AI domains.
2. **Test Default AI Site:**
   - Open `https://chatgpt.com` or `https://claude.ai`.
   - Verify `//` triggers the menu and `Alt+K` opens the command palette immediately without extra permission prompts.
3. **Test Uncovered Site via Popup:**
   - Open a non-AI site such as `https://news.ycombinator.com` or `https://linear.app`.
   - Click the OmniPrompt toolbar icon.
   - Verify the top banner displays: *"OmniPrompt isn't turned on for this site yet."*
   - Click *"Turn on for this site"*, approve the browser permission prompt.
   - Verify OmniPrompt injects immediately without page reload, allowing `//` and `Alt+K`.
4. **Test On-Demand Injection via `Ctrl+Shift+K` and Right-Click:**
   - On an uncovered page where permission was not granted, press `Ctrl+Shift+K`.
   - Verify the palette opens via `activeTab` on-demand injection.
   - Highlight text, right-click, and select an OmniPrompt modifier. Verify text wraps and inserts.
5. **Test Custom Website Enablement in Settings:**
   - Open the full library settings page (`options/options.html`).
   - Scroll to "Website access" -> "Enable a website".
   - Paste a URL like `https://mycompany.internal/docs` or `github.com`. Click "Enable site".
   - Verify origin is added to the "Individually enabled sites" list and removable via ✕ button.
6. **Test "Use on every website" Switch:**
   - Toggle switch on in Settings or Welcome page.
   - Confirm browser prompts for `<all_urls>` permission. Once accepted, verify switch reflects Active status.
7. **Test Free Features:**
   - Ensure license is inactive (Free plan).
   - Create a folder, move a prompt into it, add tags, perform a bulk edit, and run tidy-up. All must succeed without an upgrade prompt.
   - Type a short answer in a variable form and insert. Open form again and confirm "Last used" remembered answer is prefilled.
   - View version history on an edited prompt; verify full version can be copied. Verify clicking "Restore" opens the upgrade modal for Pro.
