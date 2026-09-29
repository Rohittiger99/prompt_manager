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
 *   user presses "Paste" on a field, or when they have explicitly enabled
 *   clipboard auto-fill in settings.
 * - Badges tell the truth. The label used to read "Auto-filled: Selection" even
 *   when nothing had been filled, because the badge came from the field's name
 *   rather than the outcome.
 * - Listeners are bound once. A document-level Escape handler used to be added
 *   on every open and only removed if Escape was actually pressed.
 * - Rendering is `$`-safe and delegated to lib/template.js, so a value
 *   containing `$&` or `$1` is inserted literally.
 * - The footer offers Insert, Insert & Send, and Copy, and honours the user's
 *   default insert mode.
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

  let currentPrompt = null;
  let currentVariables = [];
  let currentContext = null;
  let onComplete = null;
  let onBack = null;
  let escHandler = null;
  let backBtn = null;

  // Values survive an accidental close within the same page session, so a long
  // pasted snippet is not lost.
  const valueCache = {};

  /* =====================================================================
     Setup
     ===================================================================== */

  function init(root) {
    shadowRoot = root;
  }

  function build() {
    backdrop = document.createElement('div');
    backdrop.className = 'omni-backdrop';
    backdrop.innerHTML =
      '<div class="omni-variable-modal omni-textured" role="dialog" aria-modal="true" aria-labelledby="omni-var-title">' +
      '<div class="omni-modal-header">' +
      '<div class="omni-modal-header-left">' +
      '<button class="omni-modal-back" id="omni-var-back" title="Back to prompt list" aria-label="Back to prompt list" style="display:none;">←</button>' +
      '<div class="omni-modal-title"><span>⚡</span><span id="omni-var-title">Fill in the details</span></div>' +
      '</div>' +
      '<button class="omni-modal-close" id="omni-var-close" title="Close (Esc)" aria-label="Close">✕</button>' +
      '</div>' +
      '<div class="omni-modal-body" id="omni-var-body"></div>' +
      '<div class="omni-var-preview">' +
      '<div class="omni-form-label"><span>Preview</span><span class="omni-form-auto-badge">Live</span></div>' +
      '<div class="omni-preview-box" id="omni-var-preview"></div>' +
      '<div class="omni-var-warning" id="omni-var-warning" role="status"></div>' +
      '</div>' +
      '<div class="omni-modal-footer">' +
      '<button class="omni-btn omni-btn-secondary" id="omni-var-copy">Copy</button>' +
      '<button class="omni-btn omni-btn-secondary" id="omni-var-send">Insert &amp; Send</button>' +
      '<button class="omni-btn omni-btn-primary" id="omni-var-insert">Insert  ⌘↵</button>' +
      '</div>' +
      '</div>';

    shadowRoot.appendChild(backdrop);

    bodyEl = backdrop.querySelector('#omni-var-body');
    previewEl = backdrop.querySelector('#omni-var-preview');
    titleEl = backdrop.querySelector('#omni-var-title');
    warnEl = backdrop.querySelector('#omni-var-warning');
    insertBtn = backdrop.querySelector('#omni-var-insert');
    sendBtn = backdrop.querySelector('#omni-var-send');
    backBtn = backdrop.querySelector('#omni-var-back');

    backdrop.querySelector('#omni-var-close').addEventListener('click', close);
    backBtn.addEventListener('click', goBack);
    insertBtn.addEventListener('click', () => finish({ submit: false }));
    sendBtn.addEventListener('click', () => finish({ submit: true }));
    backdrop.querySelector('#omni-var-copy').addEventListener('click', copyToClipboard);

    // Bound once, for the life of the page.
    escHandler = (e) => {
      if (!isOpen()) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        if (onBack) goBack();
        else close();
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
      if (done) done(prompt.template, { submit: !!opts.submit });
      return;
    }

    const initial = template.buildInitialValues(prompt, currentContext, {
      allowClipboard: !!opts.allowClipboard,
      cached: valueCache[prompt.id] || {}
    });

    currentVariables = initial.variables;

    // Nothing to ask: render and go straight through.
    if (!currentVariables.length) {
      if (done) done(prompt.template, { submit: !!opts.submit });
      return;
    }

    // Every field already resolved itself and nothing needs typing: skip the
    // modal rather than making the user press Insert on a finished form.
    const everythingFilled = currentVariables.every(
      (v) => String(initial.values[v.name] || '').trim() !== ''
    );
    if (everythingFilled && opts.skipWhenComplete) {
      const text = template.render(prompt.template, initial.values);
      if (done) done(text, { submit: !!opts.submit });
      return;
    }

    if (!backdrop) build();
    openWith(prompt, initial, opts);
  }

  function openWith(prompt, initial, opts) {
    titleEl.textContent = prompt.title;
    sendBtn.style.display = opts.allowSubmit === false ? 'none' : '';
    backBtn.style.display = onBack ? '' : 'none';

    bodyEl.innerHTML = currentVariables
      .map((v, idx) => renderField(v, initial.values[v.name] || '', initial.filledFrom[v.name], idx))
      .join('');

    bindFields();
    updatePreview();

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

  function renderField(v, value, filledFrom, idx) {
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
      (v.required ? '' : ' <em>(optional)</em>') +
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
     Preview
     ===================================================================== */

  function readValues() {
    const values = {};
    const fields = bodyEl.querySelectorAll('[data-var]');
    for (let i = 0; i < fields.length; i++) {
      values[fields[i].getAttribute('data-var')] = fields[i].value;
    }
    return values;
  }

  function updatePreview() {
    if (!currentPrompt || !window.OmniTemplate) return;
    const values = readValues();
    valueCache[currentPrompt.id] = values;

    const result = window.OmniTemplate.render(currentPrompt.template, values, { withMeta: true });
    previewEl.textContent = result.text;

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

  /* =====================================================================
     Completion
     ===================================================================== */

  function finish(options) {
    const opts = options || {};
    if (!currentPrompt || !window.OmniTemplate) return;

    const values = readValues();
    valueCache[currentPrompt.id] = values;
    const text = window.OmniTemplate.render(currentPrompt.template, values);
    const done = onComplete;

    close();
    if (done) done(text, { submit: !!opts.submit });
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
    if (backdrop) backdrop.style.display = 'none';
    currentPrompt = null;
    currentVariables = [];
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
    isOpen,
    // Kept so older call sites and tests keep working.
    renderTemplate(template, values) {
      return window.OmniTemplate ? window.OmniTemplate.render(template, values) : template;
    },
    extractVariables(template) {
      return window.OmniTemplate ? window.OmniTemplate.extractVariables(template) : [];
    }
  };
})();

if (typeof window !== 'undefined') {
  window.VariableModal = VariableModal;
}
