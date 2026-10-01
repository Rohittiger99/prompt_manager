# Brief: improve the UI and UX of workspaces, chains and all forms

User request (verbatim): "improve the ui ux experience of workspace , chains and all the forms".

This is heavy: the request is open-ended ("improve"), and it spans the options page, the popup, the content-script UI (fill-in form, palette, chain runner), the welcome page and shared styles. Start with an audit and a design, get the design reviewed, then implement in small slices with the suite green after each one.

Repo root (absolute): `c:\Zmy_work\1my_apps\1Extensions\prompt_manager`. Work in place, no worktree, no git commits (the founder reviews the diff). Shell is PowerShell on Windows.

## Read first
- Steering (binding): `c:\Zmy_work\1my_apps\1Extensions\prompt_manager\.kiro\steering\*.md` (product principles, tech conventions, structure, testing rules).
- Earlier run reports that this builds on (do not undo their work):
  - `c:\Zmy_work\1my_apps\1Extensions\prompt_manager\.agents\tasks\omniprompt-pro-features-2026-09-30\` (brief.md, and design.md / report.md if present)
  - `c:\Zmy_work\1my_apps\1Extensions\prompt_manager\.agents\tasks\omniprompt-option-b-free-pro-2026-09-30\`
  - `c:\Zmy_work\1my_apps\1Extensions\prompt_manager\.agents\tasks\omniprompt-submission-audit-2026-09-30\report.md`
- Code to audit:
  - `options/options.html`, `options/options.js`, `options/options.css` (library, prompt editor, workspaces, chains, value sets, custom modifiers, site rules, folder sync, backup and import, settings, Pro/licence)
  - `popup/popup.html`, `popup/popup.js`, `popup/popup.css`
  - `content/variableModal.js` (fill-in form), `content/commandPalette.js`, `content/slashTrigger.js`, `content/content.js` (chain runner, save-as-prompt, toasts), `content/content.css`
  - `welcome/welcome.html`, `welcome/welcome.js`, `welcome/welcome.css` (role onboarding)
  - `styles/base.css` (design tokens and shared controls)
  - `lib/promptStore.js` (workspaces, chains, value sets APIs, `getProInfo()`, Pro checks) — read it to understand the data model; change it only if a UX fix genuinely needs a store change.

## Scope
1. Workspaces (client workspaces, Pro): how a user understands, creates, edits, switches, and deletes a workspace; how the active workspace is shown in the popup, palette and fill-in form; empty states; the Free state for existing workspace data.
2. Chains (stepped chains, Pro): building a chain (adding, editing, reordering, removing steps), previewing it, starting it, the in-page runner (progress, "next step", cancel, what happens if the tab changes or the composer is missing), empty states, and the Free state.
3. "All the forms": every form in the extension. Interpret broadly and list them in the audit. At minimum: the prompt editor, workspace form, chain editor, value sets, custom modifiers, site rules, folder sync setup, licence activation, import, settings, the popup's forms (search / quick add if present), the content fill-in form (variableModal), save-selection-as-prompt, and the welcome role onboarding.

Decision point for the planner: the request does not say how far to go. Recommend a scope in the design (for example: consistency pass across all forms plus deeper redesign of workspaces and chains), flag anything large or risky as optional, and keep the rest. Do not drop any existing feature or behaviour.

## What "better" means here (starting ideas, not a prescription)
Audit each surface against these and fix what is actually weak. Use the `web-design-guidelines`, `emil-design-eng` or `impeccable-design-polish` skills if they help.
- Clarity: every field has a visible label tied to its input, short helper text where the meaning is not obvious, sensible placeholders (never used as the label), and a clear primary action. Consistent button order and wording across forms.
- Validation: inline, next to the field, with `aria-invalid` and `aria-describedby`; required fields marked; a disabled submit always says why; no silent failures (principle 2). Errors in plain, short British English.
- Feedback: saving, deleting, importing and activating show a clear result (toast or inline status). Destructive actions ask for confirmation or offer undo. Warn about unsaved changes when leaving the editor.
- Keyboard and screen readers: logical tab order, focus moved sensibly when a form or dialog opens, closes or errors, `Escape` closes, `Enter` / `Ctrl+Enter` submits where expected, visible `:focus-visible` styles, correct roles and live regions. Keep the IME composition handling in the fill-in form.
- Empty states: explain what the feature is and give one clear first action.
- Chains: reorder steps by drag and by keyboard (move up / move down buttons), a step count, a preview of each step's text, and a runner that clearly shows "Step 2 of 4" with Next and Stop.
- Workspaces: a visible active-workspace indicator and a quick switcher where prompts are picked; clear what a workspace changes (for example, its saved values).
- Layout: consistent spacing, field widths and section headings using the tokens in `styles/base.css`; works in the narrow popup; light and dark themes both have good contrast.
- Pro gating: Free users still see Pro features; the standard Pro prompt appears only when they try one (principle 4, no nags). Existing Pro data stays readable, exportable, backed up and deletable on Free, with one plain line saying why it is not active.

## Hard constraints
- `node test/verify.js` ends with 0 FAIL after every slice. Run `node --check` on every changed `.js` file.
- Plain JS/HTML/CSS. No npm, package.json, bundler, frameworks or dependencies. Classic scripts only. `lib/*.js` and `data/*.js` stay strict ES5.
- No new permissions. No network calls outside `lib/promptStore.js`. No `eval`, remote code, inline scripts or `innerHTML` with untrusted text (build DOM with `createElement` / `textContent`).
- Content UI stays inside the shadow root on `#omniprompt-root`, with `omni-*` ids and classes. Theme via tokens and `OmniTheme`; no `prefers-color-scheme` media blocks.
- HTML pages keep balanced `<div>` tags. welcome.html keeps `Alt+K` and `Ctrl+Shift+K`. No page says "all 6 packs".
- Price, checkout links and the Pro feature list are read only via `OmniStore.getProInfo()`; never hard-code them.
- Do not change the Free/Pro split or gating rules. Do not change built-in prompts.
- Product principles hold: never destroy the draft, never fail silently, data never held hostage, no nags, no telemetry, never read chats, clipboard read only on explicit action, show the exact text that will be inserted.
- User-facing text: plain short sentences, British spelling, no hype or exclamation marks, claims literally true of the code.
- Do not edit `backups/` or `dist/`. No temp files left behind, and none in the repo root (no root files starting with `_` or `scratch`, or ending in `.tmp`).
- If behaviour described in README.md, PRIVACY.md, CHROMEWEBSTORE.md or the welcome page changes, update them in the same change and keep every string the tests require. Add a line to `CHANGELOG.md` under Unreleased.

## Verification
- Logic: run `node test/verify.js`. Add regression tests for any store-level or behaviour change (for example a new store API or a changed validation rule). Pure styling changes do not need new tests.
- Visual: render `options/options.html`, `popup/popup.html`, `welcome/welcome.html` and the fill-in form in a real browser (the `agent-browser` or `full-page-screenshot` skill, or headless Chrome) with a small stubbed `chrome` API loaded before the page scripts. Put any stub and screenshots under `c:\Zmy_work\1my_apps\1Extensions\prompt_manager\.agents\tasks\omniprompt-ux-workspaces-chains-forms-2026-09-30\` and delete the stub when done. Take before and after screenshots of the workspace, chain and main form surfaces in light and dark themes, check the popup at its real width, and walk each form with the keyboard only. "The code looks right" is not verification.
- If a browser cannot be run, say so plainly in the report and list what was checked instead.

## Output
- `design.md` (audit findings per surface, ranked, plus the proposed changes and scope decision) and `report.md` in `c:\Zmy_work\1my_apps\1Extensions\prompt_manager\.agents\tasks\omniprompt-ux-workspaces-chains-forms-2026-09-30\`.
- report.md: files changed, what changed per surface, screenshot paths, the suite summary line, manual load-unpacked test steps for the founder (workspaces, chains and forms on Free and on Pro via Dodo test mode), and open decisions.
- Final message to the orchestrator under 30 lines.
