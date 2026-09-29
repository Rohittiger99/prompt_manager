# Privacy Policy for OmniPrompt

> Last Updated: September 29, 2026  
> Effective Date: September 29, 2026

OmniPrompt ("we", "our", or "the extension") is designed with a strict privacy-first, offline-first architecture. We believe your prompts, thoughts, and intellectual work belong to you and should remain entirely on your own device.

This Privacy Policy explains what information is handled by OmniPrompt and how your privacy is protected.

---

## 1. What Information We Handle

- **Your Prompts and Templates**: All prompts, templates, placeholders, categories, starred favourites, and usage statistics you create or customize are stored **locally in your browser** using Google Chrome's local storage engine (`chrome.storage.local`).
- **No Personal Identifiable Information (PII)**: OmniPrompt does not collect your name, email address, IP address, browsing history, or physical location.
- **No Prompt Telemetry**: We never log, track, inspect, or transmit the contents of the prompts you create, edit, or insert.
- **No Page Reading or Scraping**: OmniPrompt only interacts with text input fields when you explicitly trigger it (by typing the `//` slash command prefix, opening the `Alt+K` command palette, or selecting text to apply a right-click modifier). It does not monitor, read, or record your web browsing activity.

---

## 2. Network Requests & Third-Party Services

OmniPrompt functions 100% offline for all free features, custom prompt creation, and template insertion.

- **Zero Analytics**: There are no Google Analytics, tracking pixels, crash reporting trackers, or behavioral telemetry embedded in the extension.
- **Optional License Verification (Pro Users)**: If you choose to purchase an optional Pro lifetime license, you may enter a license key in the extension settings. The extension sends a direct HTTPS request to our payment infrastructure provider, **Dodo Payments** (`https://live.dodopayments.com`), solely to activate your license key, and again if you deactivate it. The request contains only the license key and the label "OmniPrompt Extension". No prompt data, personal data, or browsing activity is included. The extension's content security policy blocks its pages from contacting any other server.
- **Payments**: Checkout happens on Dodo Payments' own website, under Dodo Payments' privacy policy. OmniPrompt never sees your card or payment details.
- **Chrome Profile Sync (Optional)**: If you explicitly turn on "Sync across devices" in OmniPrompt Settings, your prompt library is synced across your signed-in Chrome browsers using Google's native Chrome Sync infrastructure (`chrome.storage.sync`). This sync is managed entirely by Google and your Google Account, without routing through any external third-party servers.

---

## 3. Permissions We Request and Why

OmniPrompt requests the minimum permissions required to perform its functions:

| Permission | Purpose |
|------------|---------|
| `storage` | Saves your custom prompts, categories, favourites, and settings locally in your browser. |
| `unlimitedStorage` | Prevents browser quota limits from truncating long, detailed AI prompts or large prompt collections stored locally. |
| `contextMenus` | Adds the right-click "OmniPrompt" menu options (e.g., "Make Concise", "Fix Grammar") when you highlight text on a webpage. |
| `scripting` | Enables the extension to inject the slash menu and command palette into tabs already open at the time of installation or update without requiring a browser restart. |
| `<all_urls>` (Host Permission) | Allows the slash menu (`//`) and keyboard shortcut (`Alt+K`) to detect text input areas and insert prompts across any AI chat interface (ChatGPT, Claude, Gemini, Perplexity, DeepSeek, Copilot, Poe, etc.) and custom web apps. |

---

## 4. Clipboard Data

OmniPrompt **reads** the system clipboard only when you explicitly click a "Paste" button inside a prompt variable dialog. It **writes** to the clipboard only when you click Copy, or when a text box refuses the prompt you chose, so your text is not lost; a message tells you when that happens. It does not listen to, read, or upload clipboard contents in the background.

---

## 5. Data Retention, Export, and Deletion

You retain full ownership and control of all your data at all times:

- **Export**: You can export your entire prompt library, categories, and settings as a clean JSON file at any time from the Options page.
- **Automatic backups and version history**: OmniPrompt keeps up to 7 backup copies of your own prompts and up to 20 earlier versions of each prompt, in the same local browser storage. They never leave your device.
- **Deletion**: You can delete individual prompts, restore default prompts, or completely erase all stored data by clicking "Erase all my data" in OmniPrompt Settings. Erasing also deletes the automatic backups and version history.
- **Uninstallation**: Uninstalling the extension immediately purges all local extension storage from your device.

---

## 6. Changes to this Policy

If we update our privacy practices, we will post the revised policy with an updated date in this document and in our Chrome Web Store listing.

---

## 7. Contact Us

If you have questions about this Privacy Policy or OmniPrompt's privacy practices, please contact us:

- **Email**: privacy@omniprompt.app (or support@omniprompt.app)
- **Project Repository**: https://github.com/omniprompt/omniprompt
