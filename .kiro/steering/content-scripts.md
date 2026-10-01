---
inclusion: fileMatch
fileMatchPattern: 'content/**'
---

# Content-script rules

These scripts run on every page, including ChatGPT, Claude, Gemini and arbitrary sites. The host page is hostile territory: its CSS, frameworks and mutation observers must not break us, and we must not break it.

## Insertion
- All writes go through `ChatbotAdapters` (`insert`, `writeText`, `replaceBeforeCaret`, `replaceRange`). Do not write to page editors anywhere else.
- Default mode is `caret`. `append` joins with a blank line. `replace` only when explicitly requested by setting or caller.
- The slash menu removes only the typed `//token` (`replaceLength` + `replaceBeforeCaret`); the rest of the draft stays untouched.
- Textareas and inputs: set via the native prototype `value` setter (`setNativeValue`) then `fireInput`, so React and similar frameworks see the change.
- contenteditable (ProseMirror, Lexical, Quill, Slate): use `document.execCommand('insertText')` so the editor model and native undo stay in sync. Direct DOM writes are a last resort.
- Never delete character by character with `execCommand('delete')`, and never insert marker nodes to measure the caret (it trips editor observers).
- Capture the caret (`captureCaret`) before any overlay takes focus and restore it (`restoreCaret`) before writing.
- After writing, confirm the text landed (`landingCheck`, `confirmLanded` with its short retry). If it did not, call the clipboard fallback and show a toast. Only press send (`submit`) after the text is confirmed.

## Site support
- Per-site selectors and send-button logic live in the `SITES` table in `adapters.js`, with a generic fallback to the largest visible editable. Add a site there rather than branching elsewhere.
- Respect `disabledSites` via `isSiteDisabled`; a disabled site gets no menu, palette or insertion.

## UI
- All UI lives in the open shadow root on `#omniprompt-root`, styled only by `content/content.css`. Never add elements or styles to the host document outside it.
- Build overlay DOM once and reuse it (`if (!backdrop) build();`). Register global listeners once, not per open.
- Close with `Esc` and return focus to the composer. A dismissed slash menu stays closed until a new trigger (`dismissedToken`).
- The slash menu is `position: fixed` and repositions on scroll and resize.

## Page context and privacy
- Capture selection, title and URL (`capturePageContext`) before an overlay steals the selection.
- Read the composer only to insert text and to verify it landed. Never read chat transcripts or other page content.
- Read the clipboard only from the explicit Paste button or when `clipboardAutofill` is on.
- No network calls from content scripts.

## Startup
- Keep the `__OMNIPROMPT_LOADED__` guard.
- Register `chrome.runtime.onMessage` synchronously, before `await window.OmniStore.init()`, so a command arriving during boot is not reported as "no content script".
