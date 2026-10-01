# Product: OmniPrompt

OmniPrompt is a Manifest V3 Chromium extension (v2.0.0) that manages reusable prompts and inserts them into any text box, on AI chat sites and everywhere else. It works offline, needs no account, and keeps all data in `chrome.storage.local`.

Positioning: "Your reusable text actions, in every AI and every text box. No account. Nothing leaves your browser." It is not a prompt store. The full strategy lives in `product_research.md`.

## Ways in
- Slash menu: type `//` (configurable: `//`, `/`, `;;`, `!!`) in any editable field.
- Command palette: `Alt+K` in the page, `Ctrl+Shift+K` / `Cmd+Shift+K` from the browser (manifest command).
- Placeholder form: `{{var}}`, `{{var|default}}`, `{{var:A|B|C}}`, auto-fill `{{selection}}` `{{page_title}}` `{{url}}` `{{date}}` `{{clipboard}}`, Pro context blocks `{{@shortcut}}`.
- Right-click modifiers (12, in `lib/modifiers.js`) and "Save selection as a new prompt".

## Product principles (non-negotiable)
Each one comes from a competitor's 1-star reviews. Do not ship changes that break them.
1. Never destroy the user's draft. Insertion defaults to the caret; `replace` only when explicitly asked.
2. Never fail silently. If insertion does not land, copy to the clipboard and show a toast saying why.
3. The user's data is never held hostage. Reading, inserting, exporting, backups and restoring backups stay free even over the limit. Going over the free limit never locks or deletes anything; only creating a new prompt asks for Pro.
4. No nags, ads, self-opening tabs, newsletters or popups that imitate the host site. Upgrade prompts only appear when the user tries a Pro feature.
5. No account, no analytics, no third-party SDKs, no telemetry. Usage counters stay local.
6. The only network traffic is Dodo Payments licence activate/validate/deactivate, triggered by the user. Folder sync writes a local file and makes no request. Never read chat transcripts; only touch the composer. Chains advance only when the user asks for the next step.
7. Clipboard is read only on an explicit Paste click or when the user enables clipboard auto-fill.
8. Small and fast. Say no to "AI platform" features (prompt enhancers on our API key, agents, memory, sidebars).
9. Show the exact text that will be inserted. No hidden prompts.
10. No jailbreak or guardrail-bypass prompt content (Chrome Web Store policy, July 2026).

## Free and Pro
- Free: every insertion feature except chains, all 136 built-ins (including the Client Work pack), 20 custom prompts, import/export, automatic backups and restoring them, folders, tag filters, bulk edit, tidy-up, remembered short answers, version history view and copy.
- Pro ($25 one-time, lifetime): unlimited custom prompts, client workspaces, saved value sets, stepped chains, folder sync, one-click restore for earlier versions, context blocks (`{{@shortcut}}`), compare across AIs, smart templates (conditionals, date maths, required fields, repeatable blocks), custom right-click modifiers, and site rules.
- Pro data (workspaces, chains, value sets, custom modifiers, site rules) stays readable, exportable, backed up and deletable on Free; only creating or using it needs Pro.
- Price, checkout links and the feature list live only in `lib/promptStore.js` (`PRO_PRICE`, `PRO_CHECKOUT_URLS`, `PRO_FEATURES`). Every surface must read them via `OmniStore.getProInfo()`, never hard-code them.
- Licences are verified with Dodo Payments. Never add offline bypass or test keys to shipped code.

## Post-launch backlog
- Direct Google Drive API connection: Direct Google Drive API connection (via `chrome.identity` with user's own client ID or zero-backend OAuth) considered for a post-launch update. Trade-offs evaluated: requires additional manifest permission `identity`, Google OAuth consent screen, and token refresh logic vs. the current zero-permission, zero-network approach where Google Drive for Desktop syncs the local file (`omniprompt-library.json`). The local sync folder approach upholds Principles 1, 5, and 6 cleanly without introducing network dependencies.

## Open items before publishing
- `DODO_MODE` in `lib/promptStore.js` is `'test'` (test product `pdt_0NoiqA74MQN0ZbtDNA8tq`). Switch it to `'live'` and fill `PRO_PRODUCT_IDS.live` and `PRO_CHECKOUT_URLS.live` after creating the live product.
- Shipped price is $25 final (one-time lifetime). Earlier $19 / $39 notes in `product_research.md` are superseded.
- The store-listing checklist is in `CHROMEWEBSTORE.md`; the privacy policy is `PRIVACY.md`.

## Writing style for user-facing text
Plain, short sentences. British spelling in prose (favourites, licence, summarise). No hype or exclamation marks. Claims must be true of the code (the test suite checks several of them).
