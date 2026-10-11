# ⚡ OmniPrompt

A prompt manager for AI chats that works offline, keeps your data in your own browser, and never overwrites what you have already typed.

Type `//` in any text box to reach 136 built-in prompts plus your own. Press `Alt+K` for a search overlay on any page. Prompts with `{{placeholders}}` open a small form with a live preview.

Works on ChatGPT, Claude, Gemini, Perplexity, DeepSeek, Copilot, Grok, Le Chat, Poe, Qwen, Kimi, Meta AI, HuggingChat, OpenRouter, LMArena, Phind, You.com, T3 Chat, and any other page with a text box.

---

## Install

1. Open a Chromium browser (Chrome, Brave, Edge, Arc, Opera).
2. Go to `chrome://extensions/` (or `edge://extensions/`).
3. Turn on **Developer mode**, top right.
4. Click **Load unpacked** and pick this folder.
5. Pin OmniPrompt to the toolbar.

Tabs you already had open are updated automatically on install, so you do not need to reload them.

Folder sync (Pro) needs the File System Access API, which Chrome and Edge support; Brave turns this off by default.

## Where things are

- **The quick start guide** opens once, after install. Its practice box lets you type `//`, pick a prompt, fill in the blanks and insert it, all on the page, before you try it on a real site. It uses the real built-in library and template engine, and stores nothing. Pick a starter pack there to keep the menu short.
- **The toolbar popup** is a launcher. Search, arrow to a prompt and press `↵` to insert it where your cursor is, or `Shift+↵` to copy it. The row you are on shows the text it will insert. Tabs: **Prompts**, **Transform** (the right-click modifiers), **+ New**, and **More** (switch off for this site, theme, export, import). Until you use your first prompt, a short card at the top shows the three ways in.
- **The library page** (the popup's **Library** button) shows every prompt as a card or a list. Click one to read it in a side panel with the exact text, what its form will ask for, and Copy, Edit, Duplicate and Delete. Press `/` to jump to search. In the editor, `Ctrl+S` saves. **Settings**, **Backup & sync** and **Plan** (Free or Pro, and the licence key) are icons at the bottom of the sidebar, next to the theme switch.

---

## The four ways in

### 1. The slash menu

Type `//` in any text box. A list appears at your cursor. Keep typing to filter, use `↑` `↓`, then press `↵` or `Tab`.

Only the trigger and the word you typed after it are replaced. Everything else in the box stays exactly where it was.

`Esc` dismisses the menu and it stays closed until you start a new trigger.

The prefix is configurable in Settings: `//` (default), `/`, `;;` or `!!`. You can also turn the menu off entirely.

### 2. The command palette

Press `Alt+K` on any page.

- `↵` inserts
- `Shift+↵` inserts and sends
- `Esc` closes and returns focus to the chat box

With an empty search it shows your favourites first, then recent prompts, then the library by category. Once you type, everything is ranked together. The panel on the right shows the exact text the selected prompt will insert, with its blanks marked, so you never pick blind. On narrow windows the preview is hidden and the list takes the full width.

There are two separate shortcuts and both open the palette:

| Shortcut | Scope | Where to change it |
| --- | --- | --- |
| `Alt+K` (`⌥K` on macOS) | Inside the page | OmniPrompt → Settings → Search palette shortcut |
| `Ctrl+Shift+K` (`Cmd+Shift+K` on macOS) | Browser level | `chrome://extensions/shortcuts` |

### 3. Placeholders

A prompt containing `{{code}}` or `{{language}}` opens a form. You see the finished prompt below the fields as you type, then choose **Insert**, **Insert & send**, or **Copy**. `Ctrl+↵` (`⌘↵` on macOS) inserts from any field.

Long fields get a multi-line box automatically. Anything you paste is inserted literally, including `$&`, `$1` and other characters that regular expressions treat as special.

### 4. Right-click

Highlight text anywhere, right-click, and pick a modifier under **OmniPrompt**. The wrapped prompt goes into the chat box. If the page has no text box, it is copied to your clipboard and a message says so.

The 12 modifiers: Make Concise, Debug & Explain Root Cause, Fix Grammar, Markdown Table, Explain Simply (ELI5), Critique & 3 Improvements, Extract Action Items, Translate to Natural English, Steelman the Opposing View, Write Tests, Explain This Code, Draft a Reply.

---

## Placeholders

OmniPrompt supports these placeholder patterns:

| Placeholder | Syntax | Behavior | Example |
| --- | --- | --- | --- |
| **Blank Input** | `{{variable}}` | Asks for new information every time you run the prompt | `{{topic}}`, `{{code}}`, `{{order_id}}` |
| **Default Value** | `{{field\|default}}` | Pre-fills your usual choice. Keep it or edit it in the form | `{{language\|Python}}`, `{{tone\|friendly}}` |
| **Dropdown** | `{{field:One\|Two\|Three}}` | Shows a list to pick from. The first choice is the default | `{{tone:Formal\|Friendly\|Direct}}` |
| **Page context** | `{{selection}}`, `{{page_title}}`, `{{url}}` | Fills itself with the text you highlighted, the page title, or the address | `Summarise: {{selection}}` |
| **Today's Date** | `{{date}}` | Auto-fills with your computer's local date (zero clicks) | `{{date}}` $\rightarrow$ `2026-09-15` |
| **Context block** (Pro) | `{{@shortcut}}` | Inserts the text of your prompt with that shortcut, so a brief or style guide is written once | `{{@client-brief}}` |

A colon only makes a dropdown when it comes before any `|`, so a default such as `{{time|10:30}}` still works.

If a text box refuses the text (a site changed its page, or the editor rejected it), OmniPrompt copies the finished prompt to your clipboard and says so. It checks that the text arrived before it presses send.

### Default values (`{{field|default}}`)

Using a vertical bar `|` sets a pre-filled fallback.
- **Left of the `|`**: The field label (e.g., `language`, `tone`).
- **Right of the `|`**: The pre-filled answer (e.g., `Python`, `friendly`).

When the prompt form opens, your default answer is already typed in. Hit **Enter** to keep it, or quickly edit it if you need something different.

### Labels

Placeholder names are turned into readable labels, and an `_e_g_` part becomes the field's hint:

| Placeholder | Label | Hint |
| --- | --- | --- |
| `{{target_keyword}}` | Target keyword | |
| `{{api_url}}` | API URL | |
| `{{scale_requirements_e_g_100k_rps}}` | Scale requirements | e.g. 100k RPS |

### Smart template syntax (Pro)

OmniPrompt Pro extends templates with dynamic logic:

- **Conditionals**: `{{#if tone=Formal}}Please maintain a professional tone.{{#else}}Keep it conversational.{{/if}}`. Evaluates variable value or simple presence (`{{#if notes}}Notes: {{notes}}{{/if}}`).
- **Date arithmetic**: `{{date+7d}}`, `{{date-2w}}`, `{{date+1m}}`, `{{date+1y}}`. Offsets today's date by days, weeks, months, or years with automatic month-end and leap-year clamping.
- **Required fields**: `{{client_name!}}`. Appending an exclamation mark makes the field mandatory in the fill-in form before insertion.
- **Repeatable blocks**: `{{#repeat item}}- {{item}}\n{{/repeat}}`. Adds "Add another" and "Remove" controls in the form to generate lists.

---

## The built-in prompts

136 prompts across seven categories. Every shortcut below is real; type the prefix plus the shortcut.

### Coding (25)
`//review` `//debug` `//tests` `//hld` `//refactor` `//regex` `//sqlopt` `//apidoc` `//pr` `//docker` `//algo` `//sec` `//tstypes` `//twcomp` `//cicd` `//gql` `//bash` `//cron` `//state` `//perf` `//monolith` `//env` `//proto` `//errors` `//readme`

### Writing (20)
`//execsum` `//coldemail` `//tone` `//article` `//linkedin` `//proofread` `//prnews` `//meeting` `//speech` `//faq` `//newsletter` `//casestudy` `//thread` `//coverletter` `//podcast` `//youtube` `//booksum` `//explain` `//apology` `//productcopy`

### Marketing (20)
`//hero` `//valprop` `//googleads` `//metaads` `//funnel` `//phlaunch` `//pricing` `//onboarding` `//icp` `//coldcall` `//battlecard` `//hooks` `//influencer` `//referral` `//leadmagnet` `//webinar` `//storybrand` `//eventplan` `//survey` `//aso`

### SEO (15)
`//seocluster` `//metatags` `//seogap` `//schema` `//internallinks` `//progseo` `//backlinks` `//alttext` `//robotstxt` `//paa` `//localseo` `//seoaudit` `//seorefresh` `//seopr` `//glossary`

### Productivity (15)
`//firstprinciples` `//prioritize` `//feynman` `//decide` `//standup` `//socratic` `//gtd` `//negotiate` `//inboxzero` `//smartgoals` `//deepwork` `//nvc` `//scamper` `//habits` `//swot`

### Expert personas (15)
`//p-architect` `//p-cmo` `//p-ux` `//p-redteam` `//p-datascientist` `//p-vc` `//p-lawyer` `//p-finance` `//p-stoic` `//p-tutor` `//p-coach` `//p-copychief` `//p-agile` `//p-pm` `//p-biotech`

### Client Work (26)
For freelancers, agencies and consultants who repeat the same work for many clients. It is free to read, edit and insert like every other built-in.

Profile blocks (6). Edit each one once with your real details, or duplicate `//client-brief` per client:
`//client-brief` `//brand-voice` `//my-offer` `//about-me` `//audience` `//project-context`

Workflows (20). Each pulls in the blocks it needs with `{{@shortcut}}`, and many read the text you have selected on the page:
`//c-proposal` `//c-scope` `//c-status` `//c-scopecreep` `//c-invoice` `//c-kickoff` `//c-actions` `//c-blog` `//c-linkedin` `//c-repurpose` `//c-ads` `//c-onbrand` `//c-casestudy` `//c-coldemail` `//c-coverletter` `//c-objection` `//c-support` `//c-review` `//c-pr` `//c-triage`

With Pro, the blocks are filled in, so a proposal already knows the client, your offer and your voice. On Free, the `{{@client-brief}}` tokens are inserted as written and a message says why. Library rows that use blocks are marked **Pro · context** on Free.

---

## Your own library

Add prompts from the toolbar popup (**+ New**) or the full library page.

- **Folders & custom categories**: Organize your prompts with lightweight custom categories and nested folders. Pick from a curated multi-tab emoji icon pack (Work, Tech, Writing, Goals, Communication, Science) or paste your own emoji.
- **Favourites** are pinned to the top of every list. Tap the star.
- **Recently used** prompts float upward automatically. Both behaviours can be turned off in Settings.
- **Shortcut clash warnings** appear as you type, so two prompts never share a trigger.
- **Editing a built-in prompt** saves your change as an overlay. **Restore built-ins** puts the original back, and future updates to the shipped library still reach you.
- **Duplicate** makes an editable copy of any prompt, including a built-in.
- **Notes** on each prompt record why it works, which model it suits, or an example answer. Search reads them.
- **Save from anywhere**: highlight text on a page, right-click **OmniPrompt → Save selection as a new prompt…**, or choose **Save as a new prompt** in the `Alt+K` palette to capture the draft in the chat box.
- **Search** matches titles, shortcuts, tags, descriptions, notes and prompt text. Several words match in any order, so `email cold` finds "Cold email".
- **Version history** keeps the last 20 versions of every prompt you edit. You can view, copy or restore any earlier version from the **History** button, on Free and Pro. A restore keeps the text it replaced, so it can be undone.
- **SKILL.md export** writes a prompt in the skill format Claude, ChatGPT and Mistral read. SKILL.md files also import.

### Restore points (automatic backups)

OmniPrompt keeps a copy of your own prompts, edits, categories and favourites once a day, and before anything that replaces them: a replace-mode import, **Restore built-ins**, restoring an older backup, or an extension update. The last 7 are kept in local storage and can be restored from **Backup & sync**. The page shows when the last backup and the last file download happened.

These copies live in the browser. Uninstalling removes them, so download a file backup now and then.

### Free and Pro

| | Free | Pro ($25, once) |
| --- | --- | --- |
| Slash menu, palette, modifiers, variables, dropdowns | ✓ | ✓ |
| All 136 built-in prompts, including Client Work | ✓ | ✓ |
| Prompts of your own | 20 | Unlimited |
| Automatic backups and restoring them, import, export | ✓ | ✓ |
| Folders, tag filters, bulk edit, tidy-up | ✓ | ✓ |
| Remembered short answers | ✓ | ✓ |
| Version history, with one-click restore | ✓ | ✓ |
| Context blocks (`{{@shortcut}}`) | | ✓ |
| Client workspaces | | ✓ |
| Saved value sets | | ✓ |
| Stepped chains | | ✓ |
| Sync with your Chrome profile (about 100KB) | ✓ | ✓ |
| Folder sync (no size limit) | | ✓ |
| Compare across AIs | | ✓ |
| Smart templates (conditionals, date maths, repeats) | | ✓ |
| Custom right-click modifiers | | ✓ |
| Site rules | | ✓ |

Going over the free limit never deletes or locks anything. Every prompt still inserts, copies and exports; only creating a new one asks for Pro. An import on Free adds prompts up to the limit and says how many were left out. A replace-mode import can always bring back as many prompts as you already had, so re-importing your own backup never shrinks your library. The **+ New** tab in the popup shows how many of the 20 you have used.

Backups stay free on purpose: your data is never held hostage. If a Pro licence is removed, workspaces, chains and saved values stay in your library and in your backups. You can still see, export and delete them; using them needs Pro again.

The **History** button appears on every saved prompt in the editor, even before there is anything in it, so you can see that edits are kept. The price and checkout link live in one place, `PRO_PRICE` and `PRO_CHECKOUT_URL` in `lib/promptStore.js`.

### Pro features

**Compare across AIs.** Send a prompt to up to 6 AI composers simultaneously (ChatGPT, Claude, Gemini, Copilot, Perplexity, DeepSeek, Grok, Mistral, Meta AI, Qwen, Kimi, Poe) in new tabs, which is the default, or in tiled side-by-side windows. Fill placeholders once in the preview modal, pick your targets, and insert. Each tab waits for its chat box, checks the text arrived, and only presses send if you ticked "Send in each tab". If a site shows a sign-in page instead, the text goes to your clipboard and the tab you started from shows a summary, such as "inserted in 2 of 3". OmniPrompt never reads or scrapes AI responses.

**Smart templates.** Add dynamic logic to prompts with conditionals (`{{#if}}...{{#else}}...{{/if}}`), date arithmetic (`{{date+7d}}`), required fields (`{{field!}}`), and repeatable blocks (`{{#repeat item}}...{{/repeat}}`). Free users can always insert existing smart templates.

**Custom right-click modifiers.** Create up to 30 custom modifiers alongside the 12 built-ins. Choose placement (`quote`, `fence`, `after`, or `before`) to wrap selected text in the right-click menu or palette.

**Site rules.** Link hostnames (exact or `*.` wildcards) to prompts, tags, or folders to prioritize relevant prompts (e.g. email prompts on `mail.google.com`) in a "For this site" group and search boost.

**Client workspaces.** A workspace is a named set of values for one client or project, such as `client_name`, `tone` and `client_brief`. Pick a workspace in **Workspaces**, in the popup, or from the `Alt+K` palette, and any field with the same name fills itself in every prompt. A workspace value also fills the matching context block, so `{{@client-brief}}` uses the active client's brief instead of the prompt with that shortcut. Spaces and dashes in names count as underscores.

**Saved values.** In any fill-in form, **Save values** keeps what you typed under a name, and **Fill from saved values** puts it back in one click. OmniPrompt also remembers short answers, such as a tone or a language, so a form starts where you left it. Long fields and anything filled from the page are never remembered. Remembered answers stay on this computer and can be cleared in Settings.

**Stepped chains.** A chain is a list of prompts you use in order, such as research, then draft, then review. Start one from the slash menu, the palette or the popup. OmniPrompt inserts step 1 and waits. When you are ready, open the slash menu or the palette and pick **Next** (or type `//` then `next`). A value typed in one step fills the same field in later steps. OmniPrompt never reads the AI's reply and never sends anything by itself.

**Folder sync.** Choose a folder, for example inside Dropbox, OneDrive or iCloud Drive, and OmniPrompt keeps one file there, `omniprompt-library.json`, which is also a normal backup file. Point OmniPrompt on another computer at the same folder and the two libraries merge, newest edit winning. A prompt deleted on one computer is removed on the others unless it was edited there since, and a backup is taken first. Your cloud drive's own app moves the file; OmniPrompt has no server. Sync runs when the library page opens, after changes you make there, and when you press **Sync now**. Settings stay per computer. Chrome may ask again for permission to use the folder after a restart.

**Library tools.** Folders inside folders and a tag list that filters the library (the sidebar shows Categories, Folders and Tags as tabs, one list at a time), tick boxes for bulk moving, tagging, favouriting and deleting, and a **Tidy up** list of prompts you never use, prompts you stopped using, and prompts with the same text. Bulk changes and tidy-up deletions take a backup first. Folders, tags, bulk actions and tidy-up are available on both Free and Pro.

### Deleting and restoring

| Action | What happens to your own prompts |
| --- | --- |
| Delete one of your prompts | It is gone. Export first if unsure. |
| Delete a built-in prompt | Hidden, not destroyed. **Restore built-ins** brings it back. |
| **Restore built-ins** | Untouched. It only clears your edits and un-hides built-ins. |
| **Erase all my data** | Deleted. Needs a confirmation and then typing `ERASE`. |

---

## Import and export

**Export** writes your own prompts, custom categories, favourites and your edits to built-ins. Legacy folders in backups are gracefully translated into categories. Re-importing the file adds nothing new because duplicates are matched on title and template, which is what you want from a backup. Built-ins ship with the extension, so they are not in the file.

**Import** reads:

- OmniPrompt backups
- a plain JSON array of prompt objects
- AIPRM exports
- CSV or TSV with a header row, including quoted multi-line templates
- `SKILL.md` skill files (front matter with `name` and `description`, then the instructions)
- Markdown, where each heading becomes a prompt and its body the template, and a leading `> quote` becomes the description
- plain text split on `---` separator lines
- a flat JSON object of `"name": "prompt text"` pairs

Column and field names are matched loosely, so `title`/`name`/`Title` and `template`/`prompt`/`text`/`content` all work. Malformed rows are skipped rather than breaking the import, and an import can never overwrite a built-in prompt.

---

## Settings

| Setting | Default | Notes |
| --- | --- | --- |
| Slash menu | On, `//` | Prefix choices: `//` `/` `;;` `!!` |
| Search palette shortcut | `Alt+K` | Record your own, or pick a preset |
| Starter pack | All prompts | Which built-in pack shows in the menu and palette; every pack is free |
| Prioritise favourites | On | Favourites sit at the top of every list |
| Prioritise recently used | On | Prompts you use often float upward |
| Theme | System | Light, dark, or follow the operating system. Always in the library sidebar, the popup's **More** tab and the guide |
| Sync with your Chrome profile | Off | Uses Chrome profile sync, about a 100KB ceiling |
| Folder sync (Pro) | Not set up | One file in a folder you choose |
| Remembered answers | On | Short answers only; **Forget them** clears the lot |
| Use OmniPrompt on every website | Off | Optional access to all websites beyond the curated AI sites |
| Sites where OmniPrompt is off | None | Per-hostname, also toggleable from the popup |

---

## Privacy

- No server, no account, no analytics, no API keys.
- One network request, and only when you ask for it: activating or deactivating a Pro licence sends the key and the label "OmniPrompt Extension" to Dodo Payments (`https://live.dodopayments.com/licenses` in published builds, `https://test.dodopayments.com/licenses` in development builds). Everything else works offline.
- Folder sync (Pro) writes one file to a folder you pick. OmniPrompt sends nothing anywhere; if the folder is a cloud drive, that drive's own app uploads the file under its own terms.
- The extension pages' content security policy only allows connections to Dodo Payments, so no other server can be contacted from them.
- OmniPrompt never reads your chats. It reads the text box only to insert text and to check the text arrived.
- Prompts live in `chrome.storage.local`, which is your browser's own storage.
- Sync is off by default. Switching it on uses Chrome's profile sync to move your prompts between your own machines.
- The clipboard is only read when you press **Paste** in a form.

### Permissions and why each one is needed

| Permission | Why |
| --- | --- |
| `storage` | Save your prompts and settings |
| `unlimitedStorage` | Store unlimited custom prompts locally without hitting browser quota limits |
| `contextMenus` | The right-click modifier menu and saving selections as prompts |
| `scripting` | Activate in tabs that were already open when you installed or updated, and inject on demand |
| `activeTab` | Temporary access when you press Ctrl+Shift+K or click a context menu item on any page |
| Host permissions | Access to curated AI chat domains (such as ChatGPT, Claude, Gemini, Perplexity) so OmniPrompt works out of the box |
| `<all_urls>` | Optional host permission requested only when you turn on "Use OmniPrompt on every website" |

---

## Testing

```
node test/verify.js
```

The suite covers manifest integrity, the prompt library schema, storage migration from the previous version, delta storage, ranking, template rendering, the import adapters, and the documentation claims in this file. It is written to catch behaviour, not just to check that files parse.

There is also an offline sandbox that needs no AI site. It exercises the real extension rather than a copy of its wiring, so it tells you the truth about what is shipping.

1. Load the extension unpacked.
2. Open OmniPrompt's details at `chrome://extensions` and turn on **Allow access to file URLs**. Without this, Chrome does not run content scripts on local files and the page will look dead. The page says so if it cannot find the extension.
3. Open `test/test-page.html` and work through the seven checks it lists, including the draft-preservation test, the `Esc` test, the scrolled-position test and the `$&` paste test.

It provides a plain textarea, a rich contenteditable, a single-line input, and a box below a long scroll gap.

---

## Project layout

```
manifest.json                Manifest V3 configuration
CHANGELOG.md                 Release history
data/defaultPrompts.js       The 136 built-in prompts
lib/
  promptStore.js             Storage, migration, ranking, folders, favourites, sync, licensing, Pro data
  template.js                Placeholder parsing, labels, auto-fill, rendering
  modifiers.js               The 12 quick modifiers
  importers.js               JSON, AIPRM, CSV, Markdown and text adapters (used by the popup and library page)
  theme.js                   Resolves light / dark / system into one skin
content/
  adapters.js                Composer detection and caret-safe insertion per site
  slashTrigger.js            The // menu
  commandPalette.js          The Alt+K overlay
  variableModal.js           The fill-in form
  content.js                 Coordinator
  content.css                Shadow-DOM styles
styles/base.css              Shared design tokens, light and dark skins
popup/                       Toolbar popup
options/                     Library, editor, settings, backup
background/background.js     Service worker: menus, commands, injection
welcome/                     First-run guide
test/
  harness.js                 Loads the extension into a Node realm with fake chrome.storage
  verify.js                  Regression suite
  test-page.html             Offline sandbox
  test-page.js               Sandbox page script
```

The `lib/` files are plain scripts with no build step, so the same code runs in content scripts, extension pages, the service worker and Node.

---

## Storage layout

The built-in library is code, not data. Only your changes are stored:

| Key | Contents |
| --- | --- |
| `omni.userPrompts` | Prompts you wrote |
| `omni.defaultPatches` | Your edits to built-ins, as small per-prompt patches |
| `omni.hiddenDefaults` | Built-ins you deleted |
| `omni.folders` | Your folders |
| `omni.favorites` | Starred prompt ids |
| `omni.usage` | Local use counts, for ranking |
| `omni.settings` | Your settings |
| `omni.history` | Up to 20 earlier versions per edited prompt |
| `omni.snapshots` | Up to 7 automatic backups of your own work |
| `omni.backupMeta` | When you last downloaded a backup file |
| `omni.license` | Your Pro licence key and activation id, if you have one |
| `omni.pendingDraft` | Text on its way from "Save as a new prompt" to the editor; cleared on read |
| `omni.customCategories` | Your custom categories and their icons |
| `omni.customModifiers` | Pro custom right-click modifiers |
| `omni.siteRules` | Pro site rules for host-based prompt ranking |
| `omni.compareTargets` | Remembered target choices for Compare across AIs |
| `omni.workspaces` | Pro client workspaces and their values |
| `omni.variableSets` | Pro saved values, per prompt |
| `omni.chains` | Pro stepped chains |
| `omni.tombstones` | When your own items were deleted, so sync does not bring them back (kept 120 days) |
| `omni.lastValues` | Remembered short answers, per prompt |
| `omni.folderSyncMeta` | Folder sync status: folder name and last sync time |

History, backups, the licence, remembered answers and folder sync status are never synced. The chosen sync folder itself is a browser file handle, kept in the library page's own IndexedDB because `chrome.storage` cannot hold it.

Editing one built-in prompt writes about 90 bytes rather than a copy of the whole library, so a future release can still ship new prompts to you. **Restore built-ins** clears the two delta maps and cannot touch `omni.userPrompts`.

Data from version 1.x is migrated once on update. The old keys are left on disk untouched as a manual recovery path.

---

## Version 2.0.0

Rewritten from 1.0.0. The changes users will notice:

- **Your draft survives.** Inserting a prompt no longer replaces the whole text box.
- **Prompts you save stay visible.** The two competing storage keys are gone.
- **Restore no longer deletes your work,** and no longer claims otherwise.
- **Delete works** in the library table. It previously threw an error and did nothing.
- **Pasted code is not corrupted.** Values containing `$&` or `$1` render literally.
- **The slash menu lands in the right place** on scrolled pages, and `Esc` keeps it closed.
- **The clipboard is not read behind your back.**
- **One documented shortcut per scope.** The old build had three conflicting values.
- **Auto-send exists** and is opt-in. The old README promised it; the code did not have it.
- Added folders, favourites, usage ranking, per-site disable, opt-in sync, duplicate, shortcut clash warnings, competitor import, and four more quick modifiers.
