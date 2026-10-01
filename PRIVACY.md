# Privacy Policy for OmniPrompt

> Last Updated: September 30, 2026  
> Effective Date: September 30, 2026

OmniPrompt ("we", "our", or "the extension") is designed with a strict privacy-first, offline-first architecture. We believe your prompts, thoughts, and intellectual work belong to you and should remain entirely on your own device.

This Privacy Policy explains what information is handled by OmniPrompt and how your privacy is protected.

---

## 1. What Information We Handle

- **Your Prompts and Templates**: All prompts, templates, placeholders, categories, starred favourites, and usage statistics you create or customize are stored **locally in your browser** using Google Chrome's local storage engine (`chrome.storage.local`). Chrome sync storage (`chrome.storage.sync`) is used only if you explicitly turn on sync in Settings.
- **Pro data**: Client workspaces, saved values, stepped chains and folder sync are stored the same way. OmniPrompt also remembers short answers you typed into a form (such as a tone or a language) so the form can start from them next time. Long fields and anything filled from the page are never remembered, remembered answers are never synced, and **Forget them** in Settings clears them.
- **No Personal Identifiable Information (PII)**: OmniPrompt does not collect your name, email address, IP address, browsing history, or physical location.
- **No Prompt Telemetry**: We never log, track, inspect, or transmit the contents of the prompts you create, edit, or insert.
- **No Page Reading or Scraping**: OmniPrompt only interacts with text input fields when you explicitly trigger it (by typing the `//` slash command prefix, opening the `Alt+K` command palette, or selecting text to apply a right-click modifier). It does not monitor, read, or record your web browsing activity.
- **Compare across AIs (Pro)**: Compare only opens tabs and types text. It never reads answers, and there is no new network traffic.
- **Site rules (Pro)**: Site rules use only the site's address, checked on the device.

---

## 2. Network Requests & Third-Party Services

OmniPrompt functions 100% offline for all free features, custom prompt creation, and template insertion.

- **Zero Analytics**: There are no Google Analytics, tracking pixels, crash reporting trackers, or behavioral telemetry embedded in the extension.
- **Optional License Verification (Pro Users)**: If you choose to purchase an optional Pro lifetime license, you may enter a license key on the Plan page of the extension. The extension sends a direct HTTPS request to our payment infrastructure provider, **Dodo Payments** (`https://live.dodopayments.com`; development builds use `https://test.dodopayments.com`), solely to activate your license key, and again if you deactivate it. The request contains only the license key and the label "OmniPrompt Extension". No prompt data, personal data, or browsing activity is included. The extension's content security policy blocks its pages from contacting any other server.
- **Payments**: Checkout happens on Dodo Payments' own website, under Dodo Payments' privacy policy. OmniPrompt never sees your card or payment details.
- **Chrome Profile Sync (Optional)**: If you explicitly turn on "Sync with your Chrome profile" in OmniPrompt Settings, your prompt library is synced across your signed-in Chrome browsers using Google's native Chrome Sync infrastructure (`chrome.storage.sync`). This sync is managed entirely by Google and your Google Account, without routing through any external third-party servers.
- **Folder Sync (Optional, Pro)**: If you choose a folder for folder sync, OmniPrompt reads and writes one file there, `omniprompt-library.json`, containing your own prompts, workspaces, chains, saved values and folders (not your settings, licence or remembered answers). OmniPrompt makes no network request for this. If the folder belongs to a cloud drive such as Dropbox, OneDrive or iCloud Drive, that service's own app uploads the file under its own privacy policy. Folder access uses Chrome's standard folder picker and needs no extra extension permission.

---

## 3. Permissions We Request and Why

OmniPrompt requests the minimum permissions required to perform its functions:

| Permission | Purpose |
|------------|---------|
| `storage` | Saves your custom prompts, categories, favourites, folders, and settings locally in your browser. |
| `unlimitedStorage` | Prevents browser quota limits from truncating long, detailed AI prompts or large prompt collections stored locally. |
| `contextMenus` | Adds the right-click "OmniPrompt" menu options (e.g., "Make Concise", "Fix Grammar") when you highlight text on a webpage, and "Save selection as a new prompt...". |
| `scripting` | Enables the extension to inject the slash menu and command palette into tabs already open at the time of installation or update without requiring a browser restart, and inject on demand. |
| `activeTab` | Grants temporary access to the active tab when you press `Ctrl+Shift+K` or use a right-click context menu item on any page, allowing on-demand injection without broad host permissions. |
| Host Permissions (AI Chat Sites) | Pre-configured access to curated AI chat and assistant domains (ChatGPT, Claude, Gemini, Perplexity, DeepSeek, Copilot, Grok, Poe, etc.) so OmniPrompt works immediately out of the box. |
| `<all_urls>` (Optional Host Permission) | Requested only when you toggle "Use OmniPrompt on every website", allowing the slash menu (`//`) and keyboard shortcut (`Alt+K`) to work on any web page (e.g., Gmail, Slack, Jira, Notion). |

---

## 4. Clipboard Data

OmniPrompt **reads** the system clipboard only when you explicitly click a "Paste" button inside a prompt variable dialog. It **writes** to the clipboard only when you click Copy, or when a text box refuses the prompt you chose, so your text is not lost; a message tells you when that happens. It does not listen to, read, or upload clipboard contents in the background.

---

## 5. Data Retention, Export, and Deletion

You retain full ownership and control of all your data at all times:

- **Export**: You can export your entire prompt library, categories, and settings as a clean JSON file at any time from the Options page.
- **Automatic backups and version history**: OmniPrompt keeps up to 7 backup copies of your own prompts and up to 20 earlier versions of each prompt, in the same local browser storage. They never leave your device.
- **Deletion**: You can delete individual prompts, restore default prompts, or completely erase all stored data by clicking "Erase all my data" in OmniPrompt Settings. Erasing also deletes the automatic backups, version history, workspaces, chains, saved values and remembered answers. It does not touch a folder sync file, which lives in your own folder.
- **Uninstallation**: Uninstalling the extension immediately purges all local extension storage from your device.

---

## 6. Changes to this Policy

If we update our privacy practices, we will post the revised policy with an updated date in this document and in our Chrome Web Store listing.

---

## 7. Contact Us

If you have questions about this Privacy Policy or OmniPrompt's privacy practices, please contact us:

- **Email**: privacy@omniprompt.app (or support@omniprompt.app)
- **Project Repository**: https://github.com/omniprompt/omniprompt
