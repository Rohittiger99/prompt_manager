# Design: Workspaces, Chains, and Forms UI/UX Improvements

Date: 2026-10-01  
Task: `.agents/tasks/omniprompt-ux-workspaces-chains-forms-2026-09-30/brief.md`  
Status: Proposal & Architecture Review  

---

## 1. Executive Summary & Audit Findings

The user request is: *"improve the ui ux experience of workspace , chains and all the forms"*.
This audit examines three core pillars across all extension surfaces (Options page, Popup, In-page Content Scripts, Welcome guide, and Shared Styles):
1. **Workspaces (Client Workspaces, Pro)**
2. **Chains (Stepped Chains, Pro)**
3. **All Forms (Every form, modal, and input surface across the extension)**

### 1.1 Key Audit Findings & Deficiencies

| Surface / Feature | Severity | Finding | Impact |
|---|---|---|---|
| **Chains (In-Page Runner)** | **High** | When running a multi-step chain in-page, there is **no persistent runner UI**. The tab only displays a transient toast for 3 seconds after step 1. If the user returns to the tab or reads the AI response, there is zero visible indication that a chain is active or what step is next unless they recall the `//next` shortcut or open Alt+K. | Users lose track of chain state; high abandonment; confusing if composer focus changes. |
| **Chains (Builder Reordering)** | **High** | Chains builder only supports discrete ↑ and ↓ click buttons. There is no **drag-and-drop reordering** of steps. Move buttons lack `aria-live` position feedback for screen readers. | Friction when structuring longer multi-step chains (e.g. 4-6 steps). |
| **Chains (Step Previews & Counts)** | **Medium** | In the chains editor, steps only display raw multiline textareas without a rendered preview of variables or step summaries. The chain card and editor lack a visible step count meter. | Hard to scan what placeholders a chain requires before running it. |
| **Workspaces (Visibility & Active Indicator)** | **High** | No persistent active-workspace indicator in the Options library or main navigation. In the Popup, the workspace selector is hidden completely if Free users have existing workspace data. In the Alt+K palette, workspaces are only searchable via keywords and not surfaced as a distinct, glanceable state. | Users forget which client workspace is active, leading to wrong client data being inserted into drafts. |
| **Workspaces (Free State & Editing)** | **Medium** | When Free users view existing workspaces (from previous Pro or import), clicking an item opens an editor that looks interactive, but pressing "Save" or "Use" triggers an upgrade modal without explaining up front why it cannot be edited or activated. | Violates Principle 3/4 expectations: existing Pro data must stay readable, exportable, and deletable on Free with one plain line explaining its state. |
| **Form Validation & Accessibility** | **High** | Across all forms (Prompt editor, Workspace editor, Chain editor, Categories, Settings, Popup quick add, Variable modal), form validation relies on native browser tooltips or generic toasts. There are **no inline error messages**, no `aria-invalid` attributes, and no `aria-describedby` links to error hints. | Poor accessibility, silent or jarring error feedback, broken keyboard focus on invalid fields. |
| **Unsaved Changes Protection** | **Medium** | Navigating between tabs or closing the editor in Options discards in-progress prompt, workspace, or chain edits without warning. | Risk of user losing extensive prompt or chain drafts (violates Principle 1 spirit). |
| **Required Field Clarity & Feedback** | **Medium** | Required inputs (e.g. prompt title, template, chain title, workspace name) lack consistent visual required marks (`*`). Disabled action buttons lack clear explanatory tooltips or aria attributes. | Users have to guess why a form action failed or what is missing. |
| **Content Variable Modal Form** | **Medium** | In the fill-in form (`variableModal.js`), required fields (marked in templates) do not prevent submission with an inline accessible alert. The workspace chip does not display how many values it filled or offer a quick way to switch or clear workspace. | Incomplete prompts can be submitted accidentally. |

---

## 2. Proposed Changes & Scope Decision

### 2.1 Scope Decision

We recommend implementing:
1. **Core Workspaces Polish:**
   - Active workspace header badge & quick indicator in Options and Popup.
   - Enhanced workspace list with field count, preview of keys, and clear active state.
   - Clean Free-mode banner on existing workspaces: *"Client workspaces are part of OmniPrompt Pro. Existing workspaces are readable, exportable, and deletable on Free; editing and switching require Pro."*
   - Inline validation for workspace name and duplicate detection.
   - Unsaved changes confirmation when switching items or navigating away.
2. **Core Chains Polish & In-Page Runner:**
   - **In-Page Floating Runner (`omni-chain-runner`)**: A lightweight, non-intrusive floating pill/card in the bottom corner inside the open shadow root `#omniprompt-root` while a chain is active.
     - Displays: Chain title, *"Step 2 of 4 · Draft"*, progress dots.
     - Actions: **Next step** (primary), **Stop** (secondary/cancel), and minimize button.
     - Detects composer presence: if no composer is focused, displays *"Click into a text box, then press Next"*.
   - **Chains Editor Polish**:
     - HTML5 Drag-and-drop step reordering with visual drag handles (`:::`) and keyboard ↑/↓ buttons with `aria-live` announcement.
     - Step counter badge (*"3 steps"*).
     - Inline step template preview chips showing detected `{{variables}}` and `{{@blocks}}`.
     - Free-mode banner for existing chains explaining that running/editing requires Pro.
     - Unsaved changes protection.
3. **All Forms Consistency & Accessibility Pass:**
   - Shared design token styles in `styles/base.css`: `.form-group.has-error`, `.field-error`, `[aria-invalid="true"]`, `.req-mark`.
   - Update all forms with consistent labels, field hints, inline error spans, and keyboard focus:
     1. Prompt Editor (`#editor-form`)
     2. Workspace Form (`#workspace-editor`)
     3. Chain Editor (`#chain-editor`)
     4. Content Variable Modal (`content/variableModal.js`)
     5. Options Variable Modal (`#options-variable-modal`)
     6. Category Creation Modal (`#category-modal`, `#popup-category-modal`)
     7. Popup Quick Prompt Form (`#new-prompt-form`)
     8. Site Rules Form (Settings > Disabled sites)
     9. Licence Activation Form (Plan & Upgrade modal)
     10. Text Input Modal (`#text-input-modal` for folders)
     11. Welcome Role Onboarding & Practice Box

*Optional / Out of scope for this pass*: Completely replacing classic CSS with a heavy external framework (forbidden by tech steering) or building cloud-synced team workspaces (violates offline privacy principle).

---

## 3. Surface-by-Surface Detailed Design

### 3.1 Workspaces Surface Design

#### Options Page (`options/options.html`, `options/options.js`, `options/options.css`)
- **Active Workspace Status**:
  - In the sidebar under navigation or in the top toolbar, display an active workspace pill: e.g. `💼 Active: Northwind Studio (3 values)` with a quick "Switch" or "Clear" button.
- **Split List View**:
  - Each item card shows: Workspace Name, badge *"Active"* (with cobalt outline), number of values (*"4 values"*), and a preview list of up to 3 keys (`client_name`, `tone`, `client_brief`).
- **Workspace Editor**:
  - Visible label for each field row with placeholders: Key (`client_name`), Value (`Acme Corp`).
  - Key normalization helper and duplicate key warning.
  - Inline error for blank name with `aria-invalid="true"` and `aria-describedby="ws-name-error"`.
  - Free State Banner: If `!isPro()`, display a clean info box:
    *"Client workspaces are part of OmniPrompt Pro. You can view, export, back up, or delete your existing workspaces on Free. To edit or activate a workspace, upgrade to Pro."*
    Buttons: "Delete" remains active; "Save workspace" and "Use this workspace" display a `PRO` badge and open the upgrade modal on click without corrupting form state.
  - Empty State: When no workspaces exist, display a dedicated card with an illustration/icon, clear explanation of how workspaces auto-populate `{{placeholders}}` and `{{@blocks}}`, and a "+ Create first workspace" button.

#### Popup (`popup/popup.html`, `popup/popup.js`, `popup/popup.css`)
- **Workspace Bar**:
  - Always render workspace bar when workspaces exist, even on Free. On Free, show a subtle note `(Pro)` next to the select or in the label.
  - If a workspace is active, highlight the bar with a subtle accent background and display a *"Clear"* (✕) button for instant deactivation.
  - Show active workspace name in the footer or top header bar.

#### Content Scripts (`commandPalette.js`, `variableModal.js`)
- **Palette**:
  - Display the currently active workspace as a pinned item or status indicator at the top of the palette when opened.
  - Allow typing `workspace` or `client` to switch or clear active workspace.
- **Variable Modal**:
  - Display active workspace badge prominently: `💼 Northwind Studio` with a tooltip listing populated fields.
  - Add an inline "Change" button next to the workspace badge so users can switch workspace without leaving the fill-in form.

---

### 3.2 Chains Surface Design

#### Options Page (`options/options.html`, `options/options.js`, `options/options.css`)
- **Chain List**:
  - Cards show Chain Title, Step Count badge (`N steps`), Shortcut pill (`//shortcut`), and a truncated step flow: *"1. Research → 2. Outline → 3. Draft"*.
- **Chain Editor**:
  - **Step Reordering**:
    - Add drag handles (`<span class="chain-drag-handle" draggable="true" title="Drag to reorder">⋮⋮</span>`).
    - Drag events (`dragstart`, `dragover`, `drop`, `dragend`) with smooth CSS drop-indicator line.
    - Keyboard move buttons (↑ and ↓) announce new position via an `aria-live` region (`"Moved step to position 2 of 4"`).
  - **Step Summary & Variable Tokens**:
    - Under each step template, show parsed variable tokens (`{{topic}}`, `{{tone}}`) as chips so the user can verify placeholder continuity across steps.
  - **Validation**:
    - Inline error if chain title is empty or if all steps are empty.
    - Inline warning if chain shortcut clashes with an existing prompt or chain.
  - **Empty State**:
    - Clear explanation: *"Stepped chains run multi-prompt workflows in sequence, carrying filled values forward between steps."*
    - One-click template starters (e.g. *"Create a 3-step Research & Draft chain"*).

#### In-Page Chain Runner (`content/content.js`, `content/content.css`)
- **UI Structure**:
  - Element: `#omni-chain-runner` inside `#omniprompt-root` shadow DOM.
  - Position: Fixed at bottom-right of viewport (`bottom: 20px; right: 20px; z-index: 10000;`).
  - Layout:
    - Header: Drag handle / Chain icon `⛓️`, Chain Title, Close (Stop) button.
    - Progress Bar: Dots / segmented track showing completed steps, current step, and upcoming steps.
    - Status Text: *"Step 2 of 4: Drafting"*.
    - Context Hint: If composer is detected: *"Ready to insert"*; if composer is not detected: *"Click inside a text box to insert"*.
    - Actions:
      - `[ Stop chain ]` (ghost button, calls `endChain()`)
      - `[ Next step → ]` (primary button, calls `continueChain()`)
      - Collapse/expand icon toggle to minimize to a tiny badge if screen space is needed.
- **Tab / Navigation Safety**:
  - State is tracked in content coordinator. If page reloads or user navigates to another site with access, runner can be re-instantiated if session holds state, or gracefully report status.

---

### 3.3 "All the Forms" Consistency & Accessibility Pass

#### Global Design Tokens & Styles (`styles/base.css`, `options/options.css`)
```css
/* Standardised Form Validation Tokens */
.form-group { position: relative; }
.form-group.has-error input,
.form-group.has-error select,
.form-group.has-error textarea,
.form-group input[aria-invalid="true"],
.form-group select[aria-invalid="true"],
.form-group textarea[aria-invalid="true"] {
  border-color: var(--danger);
  box-shadow: 0 0 0 3px var(--danger-soft);
}
.field-error {
  display: none;
  color: var(--danger);
  font-size: 11.5px;
  font-weight: 550;
  margin-top: 2px;
  line-height: 1.4;
}
.form-group.has-error .field-error,
.field-error:not(:empty) {
  display: block;
}
.req-mark {
  color: var(--danger);
  margin-left: 2px;
  font-weight: 700;
}
```

#### Detailed Form-by-Form Enhancements:
1. **Prompt Editor (`#editor-form`)**:
   - Add required indicators to Name and Prompt Text.
   - Real-time or submit-time inline validation with `aria-invalid` and `aria-describedby="edit-title-error"`.
   - Shortcut validation inline: displays clash message directly under the shortcut field without needing a toast.
   - Dirty-state tracking: warn user if closing editor with unsaved changes.
2. **Workspace Form (`#workspace-editor`)**:
   - Required indicator on Workspace Name.
   - Row-level keys with visible accessible labels and autocomplete suggestions.
   - Prevent duplicate keys inline with clear warning.
3. **Chain Editor (`#chain-editor`)**:
   - Required indicator on Chain Title.
   - Step title and step text validation inline.
   - Drag & drop reordering handles with accessible keyboard alternatives.
4. **Content Fill-In Modal (`variableModal.js`)**:
   - Required placeholder support (`{{var!}}` or required rules): highlight missing required fields with `.omni-field-required` and alert in `#omni-var-warning`.
   - Active workspace switcher button inside the modal tools bar.
   - Enhanced live preview with highlighted unresolved tokens.
   - Enter on single-line inputs submits; Ctrl+Enter on textareas submits.
5. **Options Variable Modal (`#options-variable-modal`)**:
   - Mirror content variable modal's inline validation and live preview warnings.
6. **Category Modals (`options.html` and `popup.html`)**:
   - Name input required with inline error `#cat-modal-error` bound via `aria-describedby`.
   - Keyboard accessible emoji selection.
7. **Site Rules Form (Settings > Privacy)**:
   - Hostname validation (regex for domain without protocol or path) before adding.
   - Inline feedback if already in list.
8. **Licence Activation Form (Plan tab & Upgrade modal)**:
   - Clear loading feedback: *"Verifying licence with Dodo Payments..."*.
   - Inline error display with `aria-live="polite"` and British English messages.
   - Enter key submits form cleanly.
9. **Import & Export Form**:
   - Replace mode confirmation dialog explaining impact.
   - Clear feedback summary of prompts, workspaces, and chains processed.
10. **Folder Sync Setup Form**:
    - Explains browser support (e.g. File System Access API) inline before button click.
    - Clear status badge: Synced, Syncing, or Error.
11. **Popup Quick Add Form (`#new-prompt-form`)**:
    - Compact vertical rhythm for narrow popup width (360px).
    - Inline errors for title and template.
    - Pro limit banner cleanly integrated without disrupting inputs.
12. **Text Input Modal (`#text-input-modal`)**:
    - Used for folder creation/rename: required validation, Enter to submit, Esc to close.
13. **Welcome Guide Role Onboarding & Practice Box**:
    - Role cards marked with `role="button"`, `aria-pressed`, and keyboard enter/space selection.
    - Practice fill-in form with live preview and keyboard shortcuts.

---

## 4. Implementation Slices & Verification Plan

We will implement this in small, strictly verified slices:

### Slice 1: Design Tokens & Shared Form Controls (`styles/base.css`)
- Add form validation classes, error containers, required marks, focus-visible styles.
- Verify `node test/verify.js` (0 FAIL).

### Slice 2: Workspaces UI & UX Overhaul (`options/options.*`, `popup/popup.*`, `variableModal.js`)
- Options: Enhanced split list, active workspace indicator, Free-mode explanation banner, inline validation, unsaved changes check.
- Popup: Workspace bar always accessible for existing workspaces; active workspace indicator and quick-clear.
- VariableModal: Active workspace badge with switcher, field counter.
- Verify `node test/verify.js` and `node --check`.

### Slice 3: Chains UI & UX Overhaul (`options/options.*`, `popup/popup.*`)
- Options: Chains builder drag-and-drop reordering + keyboard accessible move buttons, step count, step variable token preview chips, Free-mode banner, inline validation.
- Popup: Chain cards presentation and shortcut display.
- Verify `node test/verify.js` and `node --check`.

### Slice 4: In-Page Chain Runner (`content/content.js`, `content/content.css`)
- Implement `#omni-chain-runner` inside `#omniprompt-root` shadow root.
- Persistent display during chain runs: Step X of Y, Chain Title, Next Step button, Stop chain button, composer missing detector.
- Verify `node test/verify.js` and `node --check`.

### Slice 5: Comprehensive Forms Accessibility & Validation Pass
- Update Prompt Editor, Category Modals, Site Rules, Licence Forms, Text Input Modal, and Welcome page practice form with inline validation and aria attributes.
- Unsaved changes confirmation on Prompt, Workspace, and Chain editors.
- Verify `node test/verify.js` and `node --check`.

### Slice 6: Regression Testing, Verification & Final Report
- Add regression tests in `test/verify.js` for any new/modified store or UI contracts.
- Run full automated test suite `node test/verify.js`.
- Generate `report.md` detailing all modified files, manual test instructions for the founder, and verification summary.

---
