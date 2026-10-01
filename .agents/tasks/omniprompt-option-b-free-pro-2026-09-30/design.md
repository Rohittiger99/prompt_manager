# Design: Option B Permissions & Free/Pro Re-Split

Date: 2026-10-01  
Task: `.agents/tasks/omniprompt-option-b-free-pro-2026-09-30/brief.md`  
Status: Ready for review  

---

## 1. Executive Summary

This design implements the founder's September 30, 2026 decisions:
1. **Option B Permissions:**
   - Replace required `<all_urls>` with a curated list of live AI sites in `host_permissions` and `content_scripts[0].matches` (must be identical sets).
   - Add `"optional_host_permissions": ["<all_urls>"]`.
   - Add `"activeTab"` to `permissions` so `Ctrl+Shift+K` and context menus work on any page via on-demand injection without broad install warnings.
   - Implement dynamic content script registration (`chrome.scripting.registerContentScripts`) when `<all_urls>` or individual sites are granted at runtime.
   - Provide a "Use OmniPrompt on every website" switch in the welcome page and options page (Settings), plus a "Turn on for this site" banner in the popup for uncovered origins.
2. **Pricing:**
   - \$25 one-time lifetime price is final. The \$19/\$39 experiment in `product_research.md` is superseded. `PRO_PRICE`, `DODO_MODE`, product ids, and checkout URLs remain untouched.
3. **Free/Pro Re-Split:**
   - **Moved to Free:** Folders (including nested folders), tags & tag filters, sorting, bulk edit, tidy-up, remembered short answers (`omni.lastValues`), and viewing/copying earlier versions from history.
   - **Stay Pro:** Unlimited custom prompts (Free capped at 20), client workspaces (`omni.workspaces`), saved (named) value sets (`omni.variableSets`), stepped chains (`omni.chains`), folder sync (`omniprompt-folder-sync`), one-click restore of earlier versions (`restoreVersion`), and context blocks (`{{@shortcut}}`).
   - Free users over the 20-prompt limit can still view, search, insert, export, and delete everything; only creating new prompts requires Pro (Principle 3).
4. **Licensing network call:**
   - Confirmed via live and test preflight checks: Dodo Payments returns `Access-Control-Allow-Origin: chrome-extension://<id>` for `OPTIONS /licenses/activate`. Zero host permissions are needed for Dodo Payments.

---

## 2. AI Site List (Option B)

### 2.1 Research and Verification
Every domain was verified for DNS resolution, active HTTP/HTTPS endpoints, and AI prompt/chat/generation functionality.

| Domain / Pattern | Service / Brand | Function & Reason |
|---|---|---|
| `https://chatgpt.com/*`, `https://*.chatgpt.com/*` | OpenAI ChatGPT | Primary web interface and subdomains (e.g. `sora.chatgpt.com`) |
| `https://chat.openai.com/*` | OpenAI ChatGPT | Legacy URL still visited and redirected by millions of users |
| `https://platform.openai.com/*` | OpenAI Platform | Developer playground and prompt experimentation |
| `https://sora.com/*` | OpenAI Sora | Video generation prompt interface |
| `https://claude.ai/*`, `https://*.claude.ai/*` | Anthropic Claude | Claude conversational AI composer |
| `https://console.anthropic.com/*`, `https://platform.claude.com/*` | Anthropic Console | Workbench prompts and evaluations |
| `https://gemini.google.com/*` | Google Gemini | Google's flagship consumer AI chat |
| `https://aistudio.google.com/*` | Google AI Studio | Developer system prompt and model prototyping interface |
| `https://notebooklm.google.com/*`, `https://notebook.google.com/*` | Google NotebookLM | AI notebook grounding and source chat |
| `https://labs.google/*`, `https://*.labs.google/*` | Google Labs | Experimental AI generation tools |
| `https://copilot.microsoft.com/*` | Microsoft Copilot | Consumer AI chat and web assistant |
| `https://copilot.cloud.microsoft/*` | Microsoft 365 Copilot | Enterprise Copilot workspace chat |
| `https://m365.cloud.microsoft/*` | Microsoft 365 Cloud | Enterprise AI assistant portal |
| `https://perplexity.ai/*`, `https://*.perplexity.ai/*` | Perplexity AI | AI conversational search engine |
| `https://grok.com/*`, `https://*.grok.com/*` | xAI Grok | Direct Grok conversational interface |
| `https://chat.deepseek.com/*`, `https://deepseek.com/*`, `https://*.deepseek.com/*` | DeepSeek | DeepSeek-V3 / R1 reasoning chat |
| `https://chat.mistral.ai/*`, `https://console.mistral.ai/*`, `https://*.mistral.ai/*` | Mistral AI | Le Chat and Mistral platform playground |
| `https://meta.ai/*`, `https://*.meta.ai/*` | Meta AI | Llama-powered web assistant |
| `https://poe.com/*`, `https://*.poe.com/*` | Quora Poe | Multi-bot hub and prompt generator |
| `https://huggingface.co/*`, `https://*.huggingface.co/*` | Hugging Face | HuggingChat and model spaces with prompt inputs |
| `https://chat.qwen.ai/*`, `https://*.qwen.ai/*` | Alibaba Qwen | Qwen chat interface |
| `https://tongyi.com/*`, `https://*.tongyi.com/*`, `https://tongyi.aliyun.com/*` | Alibaba Tongyi | Tongyi Qianwen chat |
| `https://kimi.com/*`, `https://*.kimi.com/*`, `https://kimi.moonshot.cn/*` | Moonshot Kimi | Kimi long-context chat |
| `https://chat.z.ai/*`, `https://*.z.ai/*` | Zhipu AI | Z.ai chat assistant |
| `https://chatglm.cn/*`, `https://*.chatglm.cn/*` | Zhipu AI | GLM conversational model |
| `https://doubao.com/*`, `https://*.doubao.com/*` | ByteDance Doubao | Doubao AI assistant |
| `https://yiyan.baidu.com/*`, `https://wenxin.baidu.com/*` | Baidu Wenxin | ERNIE Bot / Wenxin Yiyan chat |
| `https://chat.minimax.io/*`, `https://agent.minimaxi.com/*`, `https://hailuoai.com/*`, `https://*.hailuoai.com/*` | MiniMax Hailuo | Hailuo AI text and video generation |
| `https://you.com/*`, `https://*.you.com/*` | You.com | Multi-model AI search and chat |
| `https://phind.com/*`, `https://*.phind.com/*` | Phind | Developer AI search and answer composer |
| `https://duck.ai/*` | DuckDuckGo Duck.ai | Privacy-focused AI chat |
| `https://pi.ai/*`, `https://*.pi.ai/*` | Inflection Pi | Personal AI conversational companion |
| `https://character.ai/*`, `https://*.character.ai/*` | Character.ai | Persona and roleplay conversational chat |
| `https://lmarena.ai/*`, `https://*.lmarena.ai/*`, `https://arena.ai/*`, `https://*.arena.ai/*` | LMSYS Chatbot Arena | Model benchmark testing and comparison chat |
| `https://openrouter.ai/*`, `https://*.openrouter.ai/*` | OpenRouter | Multi-provider unified chat interface |
| `https://groq.com/*`, `https://*.groq.com/*`, `https://console.groq.com/*` | Groq | Ultra-low latency LPU chat and console |
| `https://dashboard.cohere.com/*`, `https://coral.cohere.com/*` | Cohere | Coral conversational assistant and playground |
| `https://t3.chat/*` | T3 Chat | Multi-model chat app |
| `https://typingmind.com/*`, `https://*.typingmind.com/*` | TypingMind | Advanced UI for AI models |
| `https://genspark.ai/*`, `https://*.genspark.ai/*` | Genspark | AI sparkpage and agent composer |
| `https://manus.im/*`, `https://*.manus.im/*` | Manus AI | Autonomous general agent workspace |
| `https://felo.ai/*`, `https://*.felo.ai/*` | Felo AI | AI research and search chat |
| `https://chat.reka.ai/*`, `https://app.reka.ai/*` | Reka AI | Multimodal conversational model |
| `https://v0.dev/*`, `https://v0.app/*`, `https://*.v0.app/*` | Vercel v0 | Generative UI prompt interface |
| `https://bolt.new/*`, `https://*.bolt.new/*` | StackBlitz Bolt.new | Full-stack application generation prompt |
| `https://lovable.dev/*`, `https://*.lovable.dev/*` | Lovable | Full-stack web app generation prompt |
| `https://replit.com/*`, `https://*.replit.com/*` | Replit | AI Agent prompt and IDE prompt box |
| `https://midjourney.com/*`, `https://*.midjourney.com/*` | Midjourney | Image prompt creator and gallery |
| `https://ideogram.ai/*`, `https://*.ideogram.ai/*` | Ideogram | Typography-accurate image prompt generation |
| `https://leonardo.ai/*`, `https://*.leonardo.ai/*` | Leonardo AI | Asset and concept art prompt generator |
| `https://krea.ai/*`, `https://*.krea.ai/*` | Krea AI | Real-time AI canvas and prompt generation |
| `https://runwayml.com/*`, `https://*.runwayml.com/*`, `https://app.runwayml.com/*`, `https://runway.com/*` | Runway | Gen-2 / Gen-3 video prompt generators |
| `https://suno.com/*`, `https://*.suno.com/*` | Suno | AI music lyrics and style prompt box |
| `https://udio.com/*`, `https://*.udio.com/*` | Udio | AI music generation and prompt editor |
| `https://firefly.adobe.com/*` | Adobe Firefly | Creative generative AI prompt tool |
| `https://klingai.com/*`, `https://*.klingai.com/*`, `https://kling.ai/*`, `https://*.kling.ai/*` | Kling AI | High-fidelity video generation prompt |
| `https://pika.art/*`, `https://*.pika.art/*` | Pika | Generative video prompt composer |
| `https://lumalabs.ai/*`, `https://*.lumalabs.ai/*` | Luma Labs | Dream Machine video and 3D prompt generator |
| `https://app.jasper.ai/*`, `https://jasper.ai/*`, `https://*.jasper.ai/*` | Jasper | Marketing copy and workflow prompt generator |
| `https://copy.ai/*`, `https://*.copy.ai/*` | Copy.ai | GTM and marketing prompt composer |
| `https://app.writesonic.com/*`, `https://writesonic.com/*`, `https://*.writesonic.com/*` | Writesonic | Content and Chatsonic prompt box |

### 2.2 Sites Excluded or Dropped
- `chat.lmsys.org`: DNS failed (ENOTFOUND). Dropped; LMSYS now points to `lmarena.ai` / `arena.ai`.
- `chatllm.abacus.ai`: Returned 404. Dropped; main Abacus is not dedicated purely to consumer prompt chat.
- **General Platforms (Excluded by design):** `bing.com`, `google.com`, `x.com`, `github.com`, `slack.com`, `notion.so`, `mail.google.com`, `duckduckgo.com`. These are general productivity/search sites. Under Option B, they work via the "Use on every website" switch, "Turn on for this site", or via `activeTab` on-demand injection (`Ctrl+Shift+K`, right-click menu). Keeping them out of required `host_permissions` avoids broader install permission warnings.

---

## 3. Architecture & Implementation

### 3.1 Manifest V3 Changes (`manifest.json`)
- `permissions`: `["storage", "unlimitedStorage", "contextMenus", "scripting", "activeTab"]`.
- `optional_host_permissions`: `["<all_urls>"]`.
- `host_permissions`: Array of exact AI site patterns above.
- `content_scripts[0].matches`: Exact same array of AI site patterns.
- `content_scripts[0].exclude_matches`:
  - `*://chrome.google.com/webstore/*`
  - `*://chromewebstore.google.com/*`
  - `*://microsoftedge.microsoft.com/addons/*`

### 3.2 Service Worker (`background/background.js`)
1. **Dynamic Content Script Registration:**
   - Id: `omniprompt-everywhere` for `<all_urls>`, and `omniprompt-site-<hash/slug>` for specific origins.
   - Script array: exactly matches `CONTENT_SCRIPTS`.
   - Options: `runAt: 'document_idle'`, `allFrames: false`, `persistAcrossSessions: true`, `excludeMatches` as above.
   - Event listeners:
     - `chrome.permissions.onAdded`: If `<all_urls>` is added, register `omniprompt-everywhere`. If specific origins are added, register scripts for those origins. Re-inject into newly accessible open tabs (`injectIntoOpenTabs`).
     - `chrome.permissions.onRemoved`: Unregister matching dynamic scripts via `chrome.scripting.unregisterContentScripts`.
     - `chrome.runtime.onInstalled` & `chrome.runtime.onStartup`: Call `reconcileDynamicScripts()` checking `chrome.permissions.contains({ origins: ['<all_urls>'] })` and individual origins.
2. **On-Demand Injection via `activeTab`:**
   - `commands.onCommand ('toggle-command-palette')`:
     - Ping the active tab (`sendToTab(tab.id, { action: 'open_palette' })`).
     - If `res.reason === 'no-content-script'`, run `injectInto(tab.id)` (allowed under `activeTab`) and re-send.
     - If injection fails (restricted chrome:// or store pages), show badge warning (`notifyUnavailable`).
   - Context menus (`chrome.contextMenus.onClicked`):
     - `SAVE_SELECTION_ID`: Send `save_as_prompt`. If `no-content-script`, inject and re-send. If still unavailable, fallback to `info.selectionText` and open editor.
     - `mod-*` (quick modifiers): Send `apply_modifier`. If `no-content-script`, inject and re-send. If unavailable, notify.
3. **Open Tab Re-Injection on Install/Update:**
   - `injectIntoOpenTabs()`: Query tabs matching `http://*/*` and `https://*/*`. Under MV3, this only matches tabs the extension has host permissions for. Safely inject each tab with try/catch, ignoring restricted tabs.

### 3.3 UI Surfaces

#### 3.3.1 Welcome Page (`welcome/welcome.html`, `welcome/welcome.js`)
- Add a dedicated "Every website" section directly below the practice box or starter packs.
- Accessible switch with `role="switch"` or `<input type="checkbox" id="setting-everywhere" />` with `<label>`.
- Copy:
  - Title: "Use OmniPrompt on every website"
  - Description: "Out of the box, OmniPrompt works on AI chat sites. Turn this on to use // and Alt+K in any text box, such as Gmail, Slack, Jira or Docs. Chrome will ask you to allow access to all sites. OmniPrompt works offline and has no account. It only acts when you type // or use a shortcut. It never reads your chats and never sends your prompts to us. The only request it makes is licence activation, when you enter a Pro key."
- Click handler directly invokes `chrome.permissions.request({ origins: ['<all_urls>'] })` ensuring valid user gesture. Reflects state accurately whether granted or rejected.

#### 3.3.2 Options Page (`options/options.html`, `options/options.js`)
- Add "Website access" in Settings:
  - "Use OmniPrompt on every website" switch (bound to `chrome.permissions.request` and `chrome.permissions.remove`).
  - "Enable a website" input field: users can type or paste any link (e.g., `https://linear.app/team/issue` or `mywiki.internal`) and click "Enable site". The handler parses the URL/hostname, formats the origin match pattern (`https://<hostname>/*`), requests host permission via `chrome.permissions.request` (user gesture), and registers the dynamic script.
  - "Individually enabled sites" list: renders origins granted via per-site popup or the custom site input, with a "Remove" button calling `chrome.permissions.remove({ origins: [origin] })`.
- Remove Pro locks/tags from:
  - Folders sidebar title & folder selector in prompt editor.
  - Tags sidebar title.
  - Tidy-up button (`#btn-tidy-up`) and modal.
  - Remembered answers setting item (`#btn-forget-remembered`).
- Update Pro comparison table:
  - Folders, tag filters, bulk edit, tidy-up: `Free: ✓`, `Pro: ✓`.
  - Remembered short answers: `Free: ✓`, `Pro: ✓`.
  - Saved (named) value sets: `Free: —`, `Pro: ✓`.
  - Version history: `Free: View and copy`, `Pro: One-click restore`.
- History modal (`openHistoryModal`):
  - Add a "Copy" button to each version item that writes the version's template to clipboard (`navigator.clipboard.writeText`) with a toast notification.
  - Free users can view full version text and copy.
  - "Restore" button remains gated with `🔒 Restore (Pro)` triggering `openUpgradeModal('history')`.

#### 3.3.3 Popup (`popup/popup.html`, `popup/popup.js`)
- On open, inspect `activeTab` URL.
- If current hostname is not covered by the default AI list or granted permissions, display an actionable banner at the top of the popup:
  - "OmniPrompt isn't turned on for this site yet."
  - Button 1: "Turn on for this site" -> calls `chrome.permissions.request({ origins: [siteOriginPattern] })`.
  - Button 2: "Turn on everywhere" -> calls `chrome.permissions.request({ origins: ['<all_urls>'] })`.
  - On approval, immediately inject `CONTENT_SCRIPTS` into current tab so the page works without reload.
- Remove any Pro badges from folder/tag selection.

### 3.4 Pro Gating Changes (`lib/promptStore.js`)
- Update `PRO_FEATURES`:
  - Remove `{ id: 'library', ... }`.
  - Update `sets`: title: "Saved value sets", text: "Save filled-in values under a name and refill a form in one click."
  - Update `history`: title: "Restore earlier versions", text: "Roll back any of your last 20 edits in one click."
- Remove `if (!isPro()) return proRequired('library');` from:
  - `createFolder(name, parentId)` (line ~1668)
  - `renameFolder(id, name)` (line ~1688)
  - `moveFolder(id, parentId)` (line ~3378)
  - `bulkUpdate(ids, changes)` (line ~3428)
  - `bulkDelete(ids)` (line ~3528)
- Update `rememberValues` (line ~3135):
  - Remove `!isPro()`, allowing Free users to remember short values.
- Update `getValueSources` (line ~3185):
  - Return `{ workspace: isPro() ? getActiveWorkspace() : null, remembered: clone(state.lastValues[promptId]?.values || {}) }`.
- Keep gated:
  - `savePrompt` limit (line 1231, 20 custom prompts).
  - `duplicatePrompt` limit (line 1325).
  - `importBundle` room check (line 2352).
  - `saveWorkspace`, `setActiveWorkspace`, `getActiveWorkspace` (lines 2976, 2981, 3036).
  - `saveVariableSet` (line 3090).
  - `saveChain` (line 3252).
  - `folderSyncMerge` (line 3622).
  - `prepareForUse` context blocks (line 3844).
  - `restoreVersion` (line 1159).

---

## 4. Documentation & Steering Updates

1. `README.md`:
   - State permissions: `storage`, `unlimitedStorage`, `contextMenus`, `scripting`, `activeTab`, AI host permissions, and optional `<all_urls>`.
   - Update Free vs Pro feature tables (folders, tags, bulk edit, tidy-up, remembered answers, view/copy history are Free; 20 prompt limit, workspaces, named value sets, chains, folder sync, one-click restore, context blocks are Pro).
   - Ensure all verified mandatory strings remain (`Alt+K`, `Ctrl+Shift+K`, "Type `//`", "136 built-in prompts", real `//` shortcuts).
2. `PRIVACY.md` & `CHROMEWEBSTORE.md`:
   - Per-permission justifications including `activeTab` and specific AI hosts.
   - Reaffirm "works offline, no account, never reads your chats".
   - Confirm remote code declaration is "No".
3. `product_research.md`:
   - Add note at top: "Founder decisions, Sept 30, 2026: price \$25 final (one-time lifetime), Option B permissions adopted, Free/Pro re-split approved. Sections 9 and 10 pricing/packaging ideas are superseded."
4. Steering files:
   - `tech.md`: Update permission rules (`activeTab` required for on-demand injection; `clipboardRead` forbidden; Option B permission model).
   - `structure.md`: Document static AI site list in manifest and dynamic script registration in `background.js`.
   - `testing.md`: Document permission assertions and Free/Pro gating assertions.
   - `product.md`: Update Free and Pro feature lists and note \$25 price is final.
5. `CHANGELOG.md`:
   - Add Unreleased section detailing Option B permissions and the new Free/Pro split.

---

## 5. Test Plan (`test/verify.js`)

1. **Permission tests:**
   - Verify `perms.indexOf('activeTab') !== -1` (activeTab is present).
   - Verify `perms.indexOf('clipboardRead') === -1` (clipboardRead is absent).
   - Verify `manifest.optional_host_permissions` equals `['<all_urls>']`.
   - Verify `manifest.host_permissions` equals `manifest.content_scripts[0].matches` as sets.
   - Verify no general-platform domains (`bing.com`, `x.com`, `google.com`, `notion.so`, etc.) or `<all_urls>` are in `host_permissions`.
2. **Dynamic Script Registration & On-Demand Injection tests:**
   - Verify `background/background.js` handles `chrome.permissions.onAdded`, `chrome.permissions.onRemoved`, `chrome.scripting.registerContentScripts`, `unregisterContentScripts`.
   - Verify keyboard command and context menu click handlers inject on demand via `scripting.executeScript` before messaging.
3. **Free/Pro Gating tests:**
   - In `H.createStoreRealm()` with Free user:
     - `createFolder`, `renameFolder`, `moveFolder` succeed.
     - `bulkUpdate` and `bulkDelete` succeed.
     - `rememberValues` stores short answers and `getValueSources` returns them.
     - `getTidySuggestions` succeeds.
     - History is recorded, and `restoreVersion` rejects with `PRO_REQUIRED` code.
     - `saveVariableSet` rejects with `PRO_REQUIRED` code.
     - `saveWorkspace` rejects with `PRO_REQUIRED` code.
     - `saveChain` rejects with `PRO_REQUIRED` code.
4. **Regression test run:**
   - Execute `node test/verify.js` ensuring all tests pass (0 failures).
   - Run `node --check` on every shipped `.js` file.

---

## 6. Verification Steps (Manual Checks for Founder)

1. Load unpacked extension at `chrome://extensions`.
2. Visit a covered AI site (e.g. `https://chatgpt.com` or `https://claude.ai`):
   - Content script loads with zero permission prompts. `//` and `Alt+K` work immediately.
3. Visit an uncovered site (e.g. `https://en.wikipedia.org`):
   - `//` does not appear automatically.
   - Press `Ctrl+Shift+K`: command palette opens via `activeTab` on-demand injection.
   - Right-click text -> OmniPrompt -> "Fix Grammar": modifier applies via `activeTab`.
   - Click toolbar popup: shows "Turn on for this site" and "Turn on everywhere".
   - Click "Turn on for this site": Chrome prompts to allow this origin; after granting, `//` works on that site.
4. Welcome / Settings page:
   - Toggle "Use OmniPrompt on every website": Chrome prompts to allow all sites. When accepted, dynamic content script registers and `//` works on every site. Revoking in Settings unregisters it.
