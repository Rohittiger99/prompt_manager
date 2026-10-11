/**
 * OmniPrompt - Variable fill modal
 *
 * Collects {{variable}} values with a live preview, then hands the rendered
 * prompt back to the coordinator.
 *
 * Fixes carried in this rewrite
 * -----------------------------
 * - No silent clipboard reads. The old modal called
 *   navigator.clipboard.readText() on every open and pasted the result into any
 *   field named `code` or `text`. Clipboard access now happens only when the
 *   user presses "Paste" on a field (the setting has no switch).
 * - Badges tell the truth. The label used to read "Auto-filled: Selection" even
 *   when nothing had been filled, because the badge came from the field's name
 *   rather than the outcome.
 * - Listeners are bound once. A document-level Escape handler used to be added
 *   on every open and only removed if Escape was actually pressed.
 * - Rendering is `$`-safe and delegated to lib/template.js, so a value
 *   containing `$&` or `$1` is inserted literally.
 * - The footer offers Insert, Insert & Send, and Copy, and honours the user's
 *   default insert mode.
 * - Pro: fields can start from the active client workspace and from the
 *   short answers used last time, and the form can save or refill named
 *   value sets. All of it comes from OmniStore, so Free sees none of it.
 */

const VariableModal = (() => {
  'use strict';

  let shadowRoot = null;
  let backdrop = null;
  let bodyEl = null;
  let previewEl = null;
  let titleEl = null;
  let warnEl = null;
  let insertBtn = null;
  let sendBtn = null;
  let compareBtn = null;
  let comparePanel = null;
  let compareTargetsEl = null;
  let startCompareBtn = null;
  let isCompareOpen = false;

  let currentPrompt = null;
  let currentVariables = [];
  let currentContext = null;
  let currentSources = { workspace: null, remembered: {} };
  let onComplete = null;
  let onBack = null;
  let escHandler = null;
  let backBtn = null;
  let toolsEl = null;

  // Values survive an accidental close within the same page session, so a long
  // pasted snippet is not lost.
  const valueCache = {};

  /* =====================================================================
     Setup
     ===================================================================== */

  function init(root) {
    shadowRoot = root;
  }

  /**
   * True while an IME (Chinese, Japanese, Korean) is composing. Its Enter and
   * Esc confirm or cancel the composition and must not submit or close the
   * form. Safari reports the confirming Enter as keyCode 229 with isComposing
   * already false.
   */
  function isImeKey(e) {
    return !!e.isComposing || e.keyCode === 229;
  }

  /** Keyboard hints name the key the user actually has. */
  function isMac() {
    try {
      const p = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || '';
      return /mac/i.test(p);
    } catch (e) {
      return false;
    }
  }

  function build() {
    backdrop = document.createElement('div');
    backdrop.className = 'omni-backdrop';
    backdrop.innerHTML =
      '<div class="omni-variable-modal omni-textured" role="dialog" aria-modal="true" aria-labelledby="omni-var-title">' +
      '<div class="omni-modal-header">' +
      '<div class="omni-modal-header-left">' +
      '<button class="omni-modal-back" id="omni-var-back" title="Back to prompt list" aria-label="Back to prompt list" style="display:none;">←</button>' +
      '<div class="omni-modal-title"><span id="omni-var-title">Fill in the details</span></div>' +
      '</div>' +
      '<button class="omni-modal-close" id="omni-var-close" title="Close (Esc)" aria-label="Close">✕</button>' +
      '</div>' +
      '<div class="omni-var-tools" id="omni-var-tools"></div>' +
      '<div class="omni-modal-body" id="omni-var-body"></div>' +
      '<div class="omni-var-preview">' +
      '<div class="omni-form-label"><span>This is exactly what will be inserted</span></div>' +
      '<div class="omni-preview-box" id="omni-var-preview"></div>' +
      '<div class="omni-var-warning" id="omni-var-warning" role="status"></div>' +
      '</div>' +
      '<div class="omni-var-compare-panel" id="omni-var-compare-panel" style="display:none;">' +
      '<div class="omni-compare-header">' +
      '<span>Compare across AIs (choose up to 6)</span>' +
      '<span class="omni-form-auto-badge">PRO</span>' +
      '</div>' +
      '<div class="omni-compare-targets" id="omni-compare-targets"></div>' +
      '<div class="omni-compare-options">' +
      '<label class="omni-compare-opt"><input type="radio" name="omni-compare-layout" value="tabs" checked /> New tabs</label>' +
      '<label class="omni-compare-opt"><input type="radio" name="omni-compare-layout" value="window" /> Tiled windows</label>' +
      '<label class="omni-compare-opt"><input type="checkbox" id="omni-compare-autosend" /> Send automatically in each tab</label>' +
      '</div>' +
      '<div class="omni-compare-actions">' +
      '<button type="button" class="omni-btn omni-btn-primary" id="omni-btn-start-compare">Run comparison</button>' +
      '</div>' +
      '</div>' +
      '<div class="omni-modal-footer">' +
      '<span class="omni-modal-foot-hint"><span class="omni-kbd">' +
      (isMac() ? '⌘' : 'Ctrl') +
      '</span><span class="omni-kbd">↵</span> inserts</span>' +
      '<button class="omni-btn omni-btn-secondary" id="omni-var-compare" title="Compare this prompt across multiple AI chats">Compare…</button>' +
      '<button class="omni-btn omni-btn-secondary" id="omni-var-copy">Copy</button>' +
      '<button class="omni-btn omni-btn-secondary" id="omni-var-send">Insert &amp; send</button>' +
      '<button class="omni-btn omni-btn-primary" id="omni-var-insert">Insert</button>' +
      '</div>' +
      '</div>';

    shadowRoot.appendChild(backdrop);

    bodyEl = backdrop.querySelector('#omni-var-body');
    toolsEl = backdrop.querySelector('#omni-var-tools');
    previewEl = backdrop.querySelector('#omni-var-preview');
    titleEl = backdrop.querySelector('#omni-var-title');
    warnEl = backdrop.querySelector('#omni-var-warning');
    insertBtn = backdrop.querySelector('#omni-var-insert');
    sendBtn = backdrop.querySelector('#omni-var-send');
    backBtn = backdrop.querySelector('#omni-var-back');
    compareBtn = backdrop.querySelector('#omni-var-compare');
    comparePanel = backdrop.querySelector('#omni-var-compare-panel');
    compareTargetsEl = backdrop.querySelector('#omni-compare-targets');
    startCompareBtn = backdrop.querySelector('#omni-btn-start-compare');

    backdrop.querySelector('#omni-var-close').addEventListener('click', close);
    backBtn.addEventListener('click', goBack);
    insertBtn.addEventListener('click', () => finish({ submit: false }));
    sendBtn.addEventListener('click', () => finish({ submit: true }));
    backdrop.querySelector('#omni-var-copy').addEventListener('click', copyToClipboard);

    compareBtn.addEventListener('click', () => {
      toggleComparePanel();
    });
    startCompareBtn.addEventListener('click', () => {
      startCompareAction();
    });

    // Bound once, for the life of the page.
    escHandler = (e) => {
      if (!isOpen() || isImeKey(e)) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        if (onBack) goBack();
        else close();
        return;
      }
      // aria-modal: Tab cycles inside the form instead of reaching the page.
      if (e.key === 'Tab') {
        const modal = backdrop.querySelector('.omni-variable-modal');
        const items = Array.prototype.filter.call(
          modal.querySelectorAll('input, button, select, textarea, [tabindex]:not([tabindex="-1"])'),
          (n) => !n.disabled && n.offsetParent !== null
        );
        if (!items.length) return;
        const root = modal.getRootNode();
        const active = root && root.activeElement;
        const first = items[0];
        const last = items[items.length - 1];
        const inside = items.indexOf(active) !== -1;
        if (e.shiftKey && (active === first || !inside)) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && (active === last || !inside)) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', escHandler, true);

    // Clicking the dim area closes, but only on the backdrop itself so a
    // drag-select inside the form does not dismiss the work.
    backdrop.addEventListener('mousedown', (e) => {
      if (e.target === backdrop) close();
    });
  }

  function isOpen() {
    return !!backdrop && backdrop.style.display === 'flex';
  }

  /* =====================================================================
     Entry point
     ===================================================================== */

  /**
   * Render a prompt, asking for values only when the template needs them.
   *
   * @param {object} prompt
   * @param {object} context  { selection, url, title, clipboard? }
   * @param {function} done   called with (renderedText, meta)
   * @param {object} options  { submit, allowClipboard }
   */
  function processPrompt(prompt, context, done, options) {
    const opts = options || {};
    currentPrompt = prompt;
    currentContext = context || {};
    onComplete = done;
    onBack = typeof opts.onBack === 'function' ? opts.onBack : null;

    const template = window.OmniTemplate;
    if (!template) {
      if (done) done(prompt.template, { submit: !!opts.submit, values: {} });
      return;
    }

    // Pro: the active workspace and last time's short answers. Both come
    // back empty on Free, so the form behaves exactly as before.
    const store = window.OmniStore;
    currentSources =
      store && store.getValueSources ? store.getValueSources(prompt.id) : { workspace: null, remembered: {} };

    // `seed` carries values from an earlier step of a chain.
    const cached = Object.assign({}, opts.seed || {}, valueCache[prompt.id] || {});
    const initial = template.buildInitialValues(prompt, currentContext, {
      allowClipboard: !!opts.allowClipboard,
      cached,
      workspace: currentSources.workspace ? currentSources.workspace.values : null,
      remembered: currentSources.remembered
    });

    currentVariables = initial.variables;

    // Nothing to ask: render and go straight through unless in compareMode.
    if (!currentVariables.length && !opts.compareMode) {
      if (done) done(prompt.template, { submit: !!opts.submit, values: {} });
      return;
    }

    // Every field already resolved itself and nothing needs typing: skip the
    // modal rather than making the user press Insert on a finished form.
    const everythingFilled = currentVariables.every(
      (v) => String(initial.values[v.name] || '').trim() !== ''
    );
    if (everythingFilled && opts.skipWhenComplete && !opts.compareMode) {
      const text = template.render(prompt.template, initial.values);
      if (done) done(text, { submit: !!opts.submit, values: initial.values });
      return;
    }

    if (!backdrop) build();
    openWith(prompt, initial, opts);
  }

  function openWith(prompt, initial, opts) {
    titleEl.textContent = prompt.title;
    sendBtn.style.display = opts.allowSubmit === false ? 'none' : '';
    compareBtn.style.display = opts.allowCompare === false ? 'none' : '';
    backBtn.style.display = onBack ? '' : 'none';

    bodyEl.innerHTML = currentVariables
      .map((v, idx) => renderField(v, initial.values[v.name] || '', initial.filledFrom[v.name], idx))
      .join('');

    bindFields();
    renderTools();
    updatePreview();

    if (opts.compareMode && opts.allowCompare !== false) {
      openComparePanel();
    } else {
      closeComparePanel();
    }

    backdrop.style.display = 'flex';

    window.requestAnimationFrame(() => {
      // Focus the first field the user actually has to fill in.
      const firstEmpty = bodyEl.querySelector('[data-var][data-empty="true"]');
      const target = firstEmpty || bodyEl.querySelector('[data-var]');
      if (target) {
        target.focus();
        if (target.setSelectionRange && typeof target.value === 'string') {
          const len = target.value.length;
          try {
            target.setSelectionRange(len, len);
          } catch (e) {
            /* ignore */
          }
        }
      }
    });
  }

  /* =====================================================================
     Fields
     ===================================================================== */

  function renderRepeatField(v, value, idx) {
    const items = Array.isArray(value) ? value : (value ? [String(value)] : ['']);
    const fieldId = 'omni-var-' + idx;
    const itemsHtml = items.map((val, itemIdx) => (
      '<div class="omni-repeat-row" data-repeat-idx="' + itemIdx + '">' +
      '<input type="text" class="omni-form-input omni-repeat-input" data-repeat-var="' + escapeHtml(v.name) + '" value="' + escapeHtml(val) + '" placeholder="Item ' + (itemIdx + 1) + '" />' +
      '<button type="button" class="omni-field-action omni-repeat-remove" title="Remove this item" aria-label="Remove item">✕</button>' +
      '</div>'
    )).join('');

    return (
      '<div class="omni-form-group omni-repeat-group" data-repeat-container="' + escapeHtml(v.name) + '" id="' + fieldId + '">' +
      '<label class="omni-form-label">' +
      '<span>' + escapeHtml(v.label) + ' <em class="omni-repeat-badge">(repeatable)</em></span>' +
      '</label>' +
      '<div class="omni-repeat-items">' + itemsHtml + '</div>' +
      '<div class="omni-repeat-actions">' +
      '<button type="button" class="omni-field-action omni-repeat-add" data-add-repeat="' + escapeHtml(v.name) + '">+ Add another</button>' +
      '</div>' +
      '</div>'
    );
  }

  function renderField(v, value, filledFrom, idx) {
    if (v.type === 'repeat') {
      return renderRepeatField(v, value, idx);
    }

    const badgeText = window.OmniTemplate ? window.OmniTemplate.autofillBadge(filledFrom) : '';
    const badge = badgeText
      ? '<span class="omni-form-auto-badge" title="This value was filled in for you">' +
        escapeHtml(badgeText) +
        '</span>'
      : '';

    const canPaste = v.type === 'textarea' || v.type === 'text';
    const pasteBtn = canPaste
      ? '<button type="button" class="omni-field-action" data-paste="' +
        escapeHtml(v.name) +
        '" title="Paste from clipboard into this field">Paste</button>'
      : '';

    const fieldId = 'omni-var-' + idx;
    const placeholder = v.hint || 'Enter ' + v.label.toLowerCase();
    const isEmpty = String(value || '').trim() === '';
    const isReq = !!v.strictRequired;
    const reqMark = isReq ? ' <span class="omni-req-mark" style="color:var(--danger, #d9383a);" aria-hidden="true">*</span>' : '';
    const optMark = isReq || v.required ? '' : ' <em>(optional)</em>';

    let control;
    if (v.type === 'select' && v.options.length) {
      control =
        '<select class="omni-form-input" id="' +
        fieldId +
        '" data-var="' +
        escapeHtml(v.name) +
        '" data-empty="' +
        isEmpty +
        '">' +
        (v.required ? '' : '<option value="">(leave blank)</option>') +
        v.options
          .map(
            (o) =>
              '<option value="' +
              escapeHtml(o) +
              '"' +
              (o === value ? ' selected' : '') +
              '>' +
              escapeHtml(o) +
              '</option>'
          )
          .join('') +
        '</select>';
    } else if (v.type === 'textarea') {
      control =
        '<textarea class="omni-form-textarea" id="' +
        fieldId +
        '" data-var="' +
        escapeHtml(v.name) +
        '" data-empty="' +
        isEmpty +
        '" placeholder="' +
        escapeHtml(placeholder) +
        '" rows="4">' +
        escapeHtml(value) +
        '</textarea>';
    } else {
      const listId = v.suggestions.length ? fieldId + '-list' : '';
      control =
        '<input type="text" class="omni-form-input" id="' +
        fieldId +
        '" data-var="' +
        escapeHtml(v.name) +
        '" data-empty="' +
        isEmpty +
        '" value="' +
        escapeHtml(value) +
        '" placeholder="' +
        escapeHtml(placeholder) +
        '"' +
        (listId ? ' list="' + listId + '"' : '') +
        ' />' +
        (listId
          ? '<datalist id="' +
            listId +
            '">' +
            v.suggestions.map((s) => '<option value="' + escapeHtml(s) + '"></option>').join('') +
            '</datalist>'
          : '');
    }

    return (
      '<div class="omni-form-group">' +
      '<label class="omni-form-label" for="' +
      fieldId +
      '">' +
      '<span>' +
      escapeHtml(v.label) +
      reqMark +
      optMark +
      '</span>' +
      '<span class="omni-form-label-right">' +
      badge +
      pasteBtn +
      '</span>' +
      '</label>' +
      control +
      '</div>'
    );
  }

  function bindFields() {
    const fields = bodyEl.querySelectorAll('[data-var]');
    for (let i = 0; i < fields.length; i++) {
      const field = fields[i];
      field.addEventListener('input', () => {
        field.setAttribute('data-empty', String(field.value.trim() === ''));
        updatePreview();
      });
      field.addEventListener('change', updatePreview);
      field.addEventListener('keydown', (e) => {
        if (isImeKey(e)) return;
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
          e.preventDefault();
          finish({ submit: e.shiftKey });
          return;
        }
        // Enter submits from single-line fields; textareas keep newlines.
        if (e.key === 'Enter' && field.tagName === 'INPUT') {
          e.preventDefault();
          finish({ submit: false });
        }
      });
    }

    const pasteButtons = bodyEl.querySelectorAll('[data-paste]');
    for (let i = 0; i < pasteButtons.length; i++) {
      const btn = pasteButtons[i];
      btn.addEventListener('click', () => pasteInto(btn.getAttribute('data-paste'), btn));
    }

    const repeatAdds = bodyEl.querySelectorAll('.omni-repeat-add');
    for (let r = 0; r < repeatAdds.length; r++) {
      const addBtn = repeatAdds[r];
      addBtn.addEventListener('click', () => {
        const varName = addBtn.getAttribute('data-add-repeat');
        const container = bodyEl.querySelector('[data-repeat-container="' + cssEscape(varName) + '"] .omni-repeat-items');
        if (container) {
          const count = container.querySelectorAll('.omni-repeat-row').length;
          const row = document.createElement('div');
          row.className = 'omni-repeat-row';
          row.setAttribute('data-repeat-idx', String(count));
          row.innerHTML =
            '<input type="text" class="omni-form-input omni-repeat-input" data-repeat-var="' + escapeHtml(varName) + '" value="" placeholder="Item ' + (count + 1) + '" />' +
            '<button type="button" class="omni-field-action omni-repeat-remove" title="Remove this item" aria-label="Remove item">✕</button>';
          container.appendChild(row);
          const input = row.querySelector('.omni-repeat-input');
          input.addEventListener('input', updatePreview);
          const removeBtn = row.querySelector('.omni-repeat-remove');
          removeBtn.addEventListener('click', () => {
            row.remove();
            updatePreview();
          });
          input.focus();
          updatePreview();
        }
      });
    }

    const repeatRemoves = bodyEl.querySelectorAll('.omni-repeat-remove');
    for (let rm = 0; rm < repeatRemoves.length; rm++) {
      const btn = repeatRemoves[rm];
      btn.addEventListener('click', () => {
        const row = btn.closest('.omni-repeat-row');
        if (row) {
          row.remove();
          updatePreview();
        }
      });
    }

    const repeatInputs = bodyEl.querySelectorAll('.omni-repeat-input');
    for (let ri = 0; ri < repeatInputs.length; ri++) {
      repeatInputs[ri].addEventListener('input', updatePreview);
    }
  }

  /**
   * Read the clipboard, but only from this click.
   *
   * A user gesture is required for clipboard access, and doing it here means
   * the read is visible and intentional rather than a side effect of opening a
   * prompt.
   */
  function pasteInto(name, btn) {
    const field = bodyEl.querySelector('[data-var="' + cssEscape(name) + '"]');
    if (!field) return;

    const restore = btn.textContent;
    if (!navigator.clipboard || !navigator.clipboard.readText) {
      btn.textContent = 'Use Ctrl+V';
      window.setTimeout(() => {
        btn.textContent = restore;
      }, 1600);
      field.focus();
      return;
    }

    navigator.clipboard
      .readText()
      .then((text) => {
        if (!text) {
          btn.textContent = 'Empty';
          window.setTimeout(() => {
            btn.textContent = restore;
          }, 1400);
          return;
        }
        field.value = text;
        field.setAttribute('data-empty', 'false');
        updatePreview();
        btn.textContent = 'Pasted';
        window.setTimeout(() => {
          btn.textContent = restore;
        }, 1400);
      })
      .catch(() => {
        // Denied or unavailable. Tell the user how to do it manually rather
        // than failing silently.
        btn.textContent = 'Use Ctrl+V';
        field.focus();
        window.setTimeout(() => {
          btn.textContent = restore;
        }, 1800);
      });
  }

  /* =====================================================================
     Workspace and saved values (Pro)
     ===================================================================== */

  /**
   * The strip above the fields: which workspace is filling values, and the
   * saved value sets for this prompt. On Free the save button explains
   * itself only when clicked, so nothing here nags.
   */
  function renderTools() {
    if (!toolsEl || !currentPrompt) return;
    const store = window.OmniStore;
    const pro = !!(store && store.isPro && store.isPro());
    const sets = store && store.getVariableSets ? store.getVariableSets(currentPrompt.id) : [];
    const ws = currentSources.workspace;

    let html = '';
    if (ws) {
      html +=
        '<span class="omni-ws-chip" title="Active workspace: ' +
        escapeHtml(ws.name) +
        '. Fields fill from here. Click ✕ to clear.">💼 ' +
        escapeHtml(ws.name) +
        (pro ? ' <button type="button" class="omni-ws-chip-clear" id="omni-ws-chip-clear" title="Clear active workspace" aria-label="Clear active workspace">✕</button>' : '') +
        '</span>';
    }
    if (sets.length) {
      html +=
        '<select class="omni-form-input omni-sets-select" id="omni-sets-select" aria-label="Fill from saved values">' +
        '<option value="">Fill from saved values…</option>' +
        sets.map((s) => '<option value="' + escapeHtml(s.id) + '">' + escapeHtml(s.name) + '</option>').join('') +
        '</select>';
    }
    html +=
      '<button type="button" class="omni-field-action" id="omni-sets-save" title="Save what is in the form under a name">💾 Save values' +
      (pro ? '' : ' <span class="omni-pro-mini">PRO</span>') +
      '</button>' +
      '<span class="omni-sets-save-row" id="omni-sets-save-row" hidden>' +
      '<input type="text" class="omni-form-input" id="omni-sets-name" maxlength="60" placeholder="Name, e.g. Acme, formal" aria-label="Name for these values" />' +
      '<button type="button" class="omni-btn omni-btn-secondary" id="omni-sets-confirm">Save</button>' +
      '</span>' +
      '<span class="omni-sets-note" id="omni-sets-note" role="status"></span>';

    toolsEl.innerHTML = html;

    const note = toolsEl.querySelector('#omni-sets-note');
    const say = (text) => {
      if (note) note.textContent = text;
    };

    const clearWs = toolsEl.querySelector('#omni-ws-chip-clear');
    if (clearWs) {
      clearWs.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (store && store.setActiveWorkspace) {
          try {
            await store.setActiveWorkspace('');
            currentSources = store.getValueSources ? store.getValueSources(currentPrompt.id) : { workspace: null, remembered: {} };
            renderTools();
            say('Workspace cleared. Fields fill as usual.');
          } catch (err) {
            say('Could not clear workspace.');
          }
        }
      });
    }

    const select = toolsEl.querySelector('#omni-sets-select');
    if (select) {
      select.addEventListener('change', () => {
        const chosen = sets.filter((s) => s.id === select.value)[0];
        select.value = '';
        if (!chosen) return;
        if (!pro) {
          say('Filling from saved values is part of OmniPrompt Pro.');
          return;
        }
        applyValues(chosen.values);
        say('Filled from “' + chosen.name + '”.');
      });
    }

    const saveBtn = toolsEl.querySelector('#omni-sets-save');
    const row = toolsEl.querySelector('#omni-sets-save-row');
    const nameInput = toolsEl.querySelector('#omni-sets-name');
    const confirm = toolsEl.querySelector('#omni-sets-confirm');

    saveBtn.addEventListener('click', () => {
      if (!pro) {
        say('Saving values is part of OmniPrompt Pro. Open OmniPrompt settings to upgrade.');
        return;
      }
      row.hidden = false;
      saveBtn.hidden = true;
      nameInput.focus();
    });

    const doSave = () => {
      const name = nameInput.value.trim();
      if (!name) {
        nameInput.focus();
        return;
      }
      store
        .saveVariableSet(currentPrompt.id, name, readValues())
        .then(() => {
          renderTools();
          const fresh = toolsEl.querySelector('#omni-sets-note');
          if (fresh) fresh.textContent = 'Saved as “' + name + '”.';
        })
        .catch((err) => say((err && err.message) || 'Could not save these values.'));
    };
    confirm.addEventListener('click', doSave);
    nameInput.addEventListener('keydown', (e) => {
      if (isImeKey(e)) return;
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        doSave();
      }
    });
  }

  /** Put saved values into the matching fields and refresh the preview. */
  function applyValues(values) {
    const vals = values || {};
    const fields = bodyEl.querySelectorAll('[data-var]');
    for (let i = 0; i < fields.length; i++) {
      const name = fields[i].getAttribute('data-var');
      if (!Object.prototype.hasOwnProperty.call(vals, name)) continue;
      fields[i].value = vals[name];
      fields[i].setAttribute('data-empty', String(String(vals[name]).trim() === ''));
    }
    updatePreview();
  }

  /* =====================================================================
     Preview
     ===================================================================== */

  function readValues() {
    const values = {};
    const fields = bodyEl.querySelectorAll('[data-var]');
    for (let i = 0; i < fields.length; i++) {
      values[fields[i].getAttribute('data-var')] = fields[i].value;
    }
    const repeatContainers = bodyEl.querySelectorAll('[data-repeat-container]');
    for (let j = 0; j < repeatContainers.length; j++) {
      const varName = repeatContainers[j].getAttribute('data-repeat-container');
      const inputs = repeatContainers[j].querySelectorAll('.omni-repeat-input');
      const items = [];
      for (let k = 0; k < inputs.length; k++) {
        if (inputs[k].value.trim()) {
          items.push(inputs[k].value);
        }
      }
      values[varName] = items;
    }
    return values;
  }

  function updatePreview() {
    if (!currentPrompt || !window.OmniTemplate) return;
    const values = readValues();
    valueCache[currentPrompt.id] = values;

    const result = window.OmniTemplate.render(currentPrompt.template, values, { withMeta: true });
    previewEl.textContent = result.text;

    let missingReq = null;
    for (let i = 0; i < currentVariables.length; i++) {
      const v = currentVariables[i];
      if (v.strictRequired) {
        const val = values[v.name];
        const empty = Array.isArray(val) ? val.length === 0 : !String(val || '').trim();
        if (empty) {
          missingReq = v;
          break;
        }
      }
    }

    if (missingReq) {
      if (insertBtn) insertBtn.disabled = true;
      if (sendBtn) sendBtn.disabled = true;
      warnEl.textContent = '“' + (missingReq.label || missingReq.name) + '” is required. Please fill it in to insert.';
      warnEl.style.display = 'block';
    } else {
      if (insertBtn) insertBtn.disabled = false;
      if (sendBtn) sendBtn.disabled = false;

      if (result.missing.length) {
        const labels = result.missing.map((name) => {
          const match = currentVariables.filter((v) => v.name === name)[0];
          return match ? match.label : name;
        });
        warnEl.textContent =
          labels.length === 1
            ? labels[0] + ' is still empty. It will appear as a placeholder.'
            : labels.length + ' fields are still empty. They will appear as placeholders.';
        warnEl.style.display = 'block';
      } else {
        warnEl.textContent = '';
        warnEl.style.display = 'none';
      }
    }
  }

  /* =====================================================================
     Compare across AIs (Pro)
     ===================================================================== */

  function toggleComparePanel() {
    isCompareOpen = !isCompareOpen;
    if (isCompareOpen) openComparePanel();
    else closeComparePanel();
  }

  function openComparePanel() {
    isCompareOpen = true;
    if (comparePanel) comparePanel.style.display = 'flex';
    if (compareBtn) compareBtn.classList.add('is-active');
    renderCompareTargets();
  }

  function closeComparePanel() {
    isCompareOpen = false;
    if (comparePanel) comparePanel.style.display = 'none';
    if (compareBtn) compareBtn.classList.remove('is-active');
  }

  function renderCompareTargets() {
    if (!compareTargetsEl) return;
    const adapters = window.ChatbotAdapters;
    const targets = (adapters && adapters.COMPARE_TARGETS) || [
      { id: 'chatgpt', name: 'ChatGPT' },
      { id: 'claude', name: 'Claude' },
      { id: 'gemini', name: 'Gemini' },
      { id: 'copilot', name: 'Copilot' },
      { id: 'perplexity', name: 'Perplexity' },
      { id: 'deepseek', name: 'DeepSeek' },
      { id: 'grok', name: 'Grok' },
      { id: 'mistral', name: 'Le Chat' },
      { id: 'metaai', name: 'Meta AI' },
      { id: 'qwen', name: 'Qwen' },
      { id: 'kimi', name: 'Kimi' },
      { id: 'poe', name: 'Poe' }
    ];

    compareTargetsEl.innerHTML = targets.map((t) => (
      '<label class="omni-compare-target-label">' +
      '<input type="checkbox" value="' + escapeHtml(t.id) + '" />' +
      '<span>' + escapeHtml(t.label || t.name || t.id) + '</span>' +
      '</label>'
    )).join('');

    const boxes = compareTargetsEl.querySelectorAll('input[type="checkbox"]');

    // The last choice is read from storage, so it arrives a tick later.
    const setChecked = (ids) => {
      const wanted = {};
      (Array.isArray(ids) ? ids : []).forEach((id) => { wanted[id] = true; });
      for (let i = 0; i < boxes.length; i++) boxes[i].checked = !!wanted[boxes[i].value];
    };
    const fallback = ['chatgpt', 'claude', 'gemini'];
    setChecked(fallback);
    const store = window.OmniStore;
    if (store && store.getLastCompareTargets) {
      Promise.resolve(store.getLastCompareTargets())
        .then((ids) => setChecked(Array.isArray(ids) && ids.length ? ids : fallback))
        .catch(() => { /* keep the fallback selection */ });
    }

    for (let i = 0; i < boxes.length; i++) {
      boxes[i].addEventListener('change', (e) => {
        const checkedBoxes = compareTargetsEl.querySelectorAll('input[type="checkbox"]:checked');
        if (checkedBoxes.length > 6) {
          e.target.checked = false;
          if (warnEl) {
            warnEl.textContent = 'Maximum 6 AI targets per comparison.';
            warnEl.style.display = 'block';
          }
        }
      });
    }
  }

  function startCompareAction() {
    const store = window.OmniStore;
    const isPro = store && store.isPro && store.isPro();
    if (!isPro) {
      if (warnEl) {
        warnEl.textContent = 'Compare across AIs is part of OmniPrompt Pro. Open OmniPrompt settings to upgrade.';
        warnEl.style.display = 'block';
      }
      return;
    }

    const values = readValues();
    for (let i = 0; i < currentVariables.length; i++) {
      const v = currentVariables[i];
      if (v.strictRequired) {
        const val = values[v.name];
        const empty = Array.isArray(val) ? val.length === 0 : !String(val || '').trim();
        if (empty) {
          updatePreview();
          return;
        }
      }
    }

    const checkedBoxes = compareTargetsEl ? compareTargetsEl.querySelectorAll('input[type="checkbox"]:checked') : [];
    const selected = [];
    for (let i = 0; i < checkedBoxes.length; i++) {
      selected.push(checkedBoxes[i].value);
    }
    if (!selected.length) {
      if (warnEl) {
        warnEl.textContent = 'Please choose at least 1 AI chat to compare.';
        warnEl.style.display = 'block';
      }
      return;
    }

    if (store && store.setLastCompareTargets) {
      store.setLastCompareTargets(selected);
    }

    const layoutRadio = comparePanel ? comparePanel.querySelector('input[name="omni-compare-layout"]:checked') : null;
    const layout = layoutRadio ? layoutRadio.value : 'tabs';
    const autoSendCb = comparePanel ? comparePanel.querySelector('#omni-compare-autosend') : null;
    const autoSend = autoSendCb ? !!autoSendCb.checked : false;

    valueCache[currentPrompt.id] = values;
    const text = window.OmniTemplate.render(currentPrompt.template, values);

    if (store && store.rememberValues) {
      store.rememberValues(currentPrompt.id, values, currentVariables).catch(() => {});
    }

    // The coordinator (content.js) starts the run, so it can report the
    // result in a toast instead of the modal closing with no word.
    const done = onComplete;
    close();
    if (done) {
      done(text, {
        values,
        compare: { targets: selected, layout: layout === 'tabs' ? 'tabs' : 'tiled', autoSend }
      });
    }
  }

  /* =====================================================================
     Completion
     ===================================================================== */

  function finish(options) {
    const opts = options || {};
    if (!currentPrompt || !window.OmniTemplate) return;

    const values = readValues();
    for (let i = 0; i < currentVariables.length; i++) {
      const v = currentVariables[i];
      if (v.strictRequired) {
        const val = values[v.name];
        const empty = Array.isArray(val) ? val.length === 0 : !String(val || '').trim();
        if (empty) {
          updatePreview();
          return;
        }
      }
    }

    valueCache[currentPrompt.id] = values;
    const text = window.OmniTemplate.render(currentPrompt.template, values);
    const done = onComplete;

    // Pro keeps short answers for next time; this does nothing on Free.
    const store = window.OmniStore;
    if (store && store.rememberValues) {
      store.rememberValues(currentPrompt.id, values, currentVariables).catch(() => {
        /* remembering is a convenience; never block the insert */
      });
    }

    close();
    if (done) done(text, { submit: !!opts.submit, values });
  }

  function copyToClipboard() {
    if (!currentPrompt || !window.OmniTemplate) return;
    const values = readValues();
    valueCache[currentPrompt.id] = values;
    const text = window.OmniTemplate.render(currentPrompt.template, values);
    const btn = backdrop.querySelector('#omni-var-copy');
    const restore = btn.textContent;

    const report = (ok) => {
      btn.textContent = ok ? 'Copied' : 'Copy failed';
      window.setTimeout(() => {
        btn.textContent = restore;
      }, 1500);
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        () => report(true),
        () => report(fallbackCopy(text))
      );
    } else {
      report(fallbackCopy(text));
    }
  }

  /** Last-resort copy for pages that block the async clipboard API. */
  function fallbackCopy(text) {
    try {
      const area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', 'readonly');
      area.style.position = 'fixed';
      area.style.top = '-1000px';
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(area);
      return ok;
    } catch (e) {
      return false;
    }
  }

  function close() {
    closeComparePanel();
    if (backdrop) backdrop.style.display = 'none';
    currentPrompt = null;
    currentVariables = [];
    currentSources = { workspace: null, remembered: {} };
    onComplete = null;
    onBack = null;
  }

  /** Leave this form and return to wherever the prompt was chosen from. */
  function goBack() {
    const back = onBack;
    close();
    if (back) back();
  }

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function cssEscape(str) {
    return String(str).replace(/["\\]/g, '\\$&');
  }

  return {
    init,
    processPrompt,
    close,
    isOpen
  };
})();

if (typeof window !== 'undefined') {
  window.VariableModal = VariableModal;
}
