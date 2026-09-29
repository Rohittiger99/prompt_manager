/**
 * OmniPrompt - Command palette
 *
 * A spotlight-style overlay that searches every prompt, favourite and quick
 * modifier on any page.
 *
 * Fixes carried in this rewrite
 * -----------------------------
 * - Category headers are grouped properly. Results are ranked by score, but the
 *   old renderer emitted a header whenever the category differed from the
 *   previous row, so a single search produced "Coding, Writing, Coding,
 *   Personas, Coding" as five separate headings.
 * - Listeners no longer accumulate. `renderPalette` used to add a fresh click
 *   handler to the container on every open.
 * - Focus returns to the composer. Opening the palette moves focus into the
 *   shadow DOM; the adapter's remembered target is used on close so text lands
 *   where the user was typing.
 * - One hotkey definition, read from settings. The old file's default (Alt+K),
 *   its own header comment (Ctrl+K) and the manifest command (Ctrl+Shift+K) all
 *   disagreed.
 */

const CommandPalette = (() => {
  'use strict';

  const GROUP_ORDER = ['Favourites', 'Recent', 'Quick Modifiers'];

  let shadowRoot = null;
  let onSelectPrompt = null;
  let onRunModifier = null;

  let backdrop = null;
  let inputEl = null;
  let listEl = null;
  let countEl = null;

  let isOpen = false;
  let enabled = true;
  let hotkey = null;

  let rows = []; // flat, selectable entries
  let selectedIndex = 0;
  let restoreTarget = null;
  let restoreCaret = null;
  // The page selection at the moment the palette opened. Focusing the search
  // box clears it, so {{selection}} would otherwise always come up empty.
  let openSelection = '';
  let onAction = null;
  let lastToggleAt = 0;
  let lastQuery = '';

  /* =====================================================================
     Setup
     ===================================================================== */

  function init(root, handlers, options) {
    const opts = options || {};
    shadowRoot = root;
    onSelectPrompt = handlers && handlers.onSelectPrompt;
    onRunModifier = handlers && handlers.onRunModifier;
    onAction = handlers && handlers.onAction;
    if (opts.hotkey) hotkey = opts.hotkey;
    if (typeof opts.enabled === 'boolean') enabled = opts.enabled;

    window.addEventListener('keydown', handleGlobalKeydown, true);
  }

  function configure(options) {
    const opts = options || {};
    if (opts.hotkey) hotkey = opts.hotkey;
    if (typeof opts.enabled === 'boolean') {
      enabled = opts.enabled;
      if (!enabled && isOpen) close();
    }
  }

  /* =====================================================================
     Hotkey
     ===================================================================== */

  function matchesHotkey(e) {
    if (!hotkey) return false;

    // `code` survives keyboard layouts and Option-key remapping on macOS,
    // where Alt+K produces "˚" rather than "k".
    const codeMatch = hotkey.code && e.code === hotkey.code;
    const keyMatch = hotkey.key && (e.key || '').toLowerCase() === String(hotkey.key).toLowerCase();
    if (!codeMatch && !keyMatch) return false;

    if (Boolean(hotkey.altKey) !== Boolean(e.altKey)) return false;
    if (Boolean(hotkey.shiftKey) !== Boolean(e.shiftKey)) return false;

    // Treat Ctrl and Cmd as interchangeable when both are requested, so one
    // setting works on Windows and macOS.
    if (hotkey.ctrlKey && hotkey.metaKey) {
      if (!e.ctrlKey && !e.metaKey) return false;
    } else {
      if (Boolean(hotkey.ctrlKey) !== Boolean(e.ctrlKey)) return false;
      if (Boolean(hotkey.metaKey) !== Boolean(e.metaKey)) return false;
    }
    return true;
  }

  function handleGlobalKeydown(e) {
    if (!enabled) return;
    if (!matchesHotkey(e)) return;
    e.preventDefault();
    e.stopPropagation();
    toggle();
  }

  /**
   * Guard against a double open when the in-page hotkey and the browser-level
   * command fire for the same physical keypress.
   */
  function toggle() {
    const now = Date.now();
    if (now - lastToggleAt < 300) return;
    lastToggleAt = now;
    if (isOpen) close();
    else open();
  }

  /* =====================================================================
     Open / close
     ===================================================================== */

  function open() {
    if (!shadowRoot || !enabled) return;

    // Capture the composer and the caret before focus moves into the overlay,
    // so the prompt lands where the user was typing rather than at the end.
    restoreTarget = window.ChatbotAdapters ? window.ChatbotAdapters.getInputElement() : null;
    restoreCaret = window.ChatbotAdapters ? window.ChatbotAdapters.captureCaret(restoreTarget) : null;
    openSelection = readPageSelection();

    if (!backdrop) build();

    backdrop.style.display = 'flex';
    isOpen = true;

    inputEl.value = '';
    lastQuery = '';
    refresh('');
    // Focus after paint so the browser does not scroll the page.
    window.requestAnimationFrame(() => {
      if (inputEl) inputEl.focus();
    });
  }

  /**
   * Reopen with whatever the user had typed before a prompt's variable form
   * took over. Used as the "back" target so picking the wrong prompt does not
   * mean redoing the search.
   */
  function reopen() {
    if (!shadowRoot || !enabled) return;
    if (!backdrop) build();

    backdrop.style.display = 'flex';
    isOpen = true;

    inputEl.value = lastQuery;
    refresh(lastQuery);
    window.requestAnimationFrame(() => {
      if (inputEl) inputEl.focus();
    });
  }

  function close() {
    if (backdrop) backdrop.style.display = 'none';
    isOpen = false;
    rows = [];

    // Hand focus back so the next keystroke goes to the chat box. Cleared by
    // the caller after it has read them, not here, because activate() closes
    // the palette before it inserts.
    const target = restoreTarget;
    if (target && target.isConnected) {
      try {
        target.focus();
      } catch (e) {
        /* ignore */
      }
    }
  }

  /**
   * Build the overlay once. Everything below binds its listeners here rather
   * than on each open, which is what used to leak.
   */
  function build() {
    backdrop = document.createElement('div');
    backdrop.className = 'omni-backdrop';
    backdrop.innerHTML =
      '<div class="omni-palette-modal omni-textured" role="dialog" aria-modal="true" aria-label="OmniPrompt command palette">' +
      '<div class="omni-palette-searchbox">' +
      '<svg class="omni-palette-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
      '<circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>' +
      '</svg>' +
      '<input type="text" class="omni-palette-input" placeholder="Search prompts, favourites and modifiers…" ' +
      'autocomplete="off" spellcheck="false" role="combobox" aria-expanded="true" aria-controls="omni-palette-items" />' +
      '<span class="omni-palette-count" id="omni-palette-count"></span>' +
      '</div>' +
      '<div class="omni-palette-content" id="omni-palette-items" role="listbox"></div>' +
      '<div class="omni-palette-footer">' +
      '<div><span><span class="omni-kbd">↑</span><span class="omni-kbd">↓</span> move</span>' +
      '<span style="margin-left:12px;"><span class="omni-kbd">↵</span> insert</span>' +
      '<span style="margin-left:12px;"><span class="omni-kbd">⇧↵</span> insert &amp; send</span></div>' +
      '<div><span class="omni-kbd">Esc</span> close</div>' +
      '</div>' +
      '</div>';

    shadowRoot.appendChild(backdrop);

    inputEl = backdrop.querySelector('.omni-palette-input');
    listEl = backdrop.querySelector('#omni-palette-items');
    countEl = backdrop.querySelector('#omni-palette-count');

    inputEl.addEventListener('input', () => {
      lastQuery = inputEl.value;
      refresh(inputEl.value);
    });
    inputEl.addEventListener('keydown', handlePaletteKeydown);

    backdrop.addEventListener('mousedown', (e) => {
      if (e.target === backdrop) close();
    });
  }

  /* =====================================================================
     Data
     ===================================================================== */

  /**
   * Build the candidate list.
   *
   * With no query, the palette shows favourites and recents first because that
   * is what someone reaching for a launcher usually wants. With a query, it
   * ranks the whole library through the shared store scorer so the slash menu,
   * popup and palette all agree on relevance.
   */
  function collect(query) {
    const q = String(query || '').trim();
    const store = window.OmniStore;
    const modifiers = window.OmniModifiers ? window.OmniModifiers.asPaletteItems() : [];
    const groups = [];

    if (!store) return groups;

    if (!q) {
      const favourites = store.getFavorites();
      if (favourites.length) {
        groups.push({ label: 'Favourites', items: favourites.map(asPromptRow) });
      }

      const recents = store.getRecent(6).filter((p) => !store.isFavorite(p.id));
      if (recents.length) {
        groups.push({ label: 'Recent', items: recents.map(asPromptRow) });
      }

      const seen = {};
      favourites.concat(recents).forEach((p) => {
        seen[p.id] = true;
      });

      const rest = store.search({ query: '', limit: 40 }).filter((p) => !seen[p.id]);
      byCategory(rest).forEach((g) => groups.push(g));

      groups.push({ label: 'Quick Modifiers', items: modifiers.map(asModifierRow) });
      groups.push({ label: 'Actions', items: actionRows() });
      return groups;
    }

    const prompts = store.search({ query: q, limit: 60 });
    const matchedModifiers = modifiers.filter((m) => scoreModifier(m, q) > 0);
    const matchedActions = actionRows().filter((a) => scoreAction(a, q) > 0);

    // Ranked results stay in score order under one heading. Splitting them by
    // category would reorder them and produce the repeated-header bug.
    if (prompts.length) {
      groups.push({ label: 'Prompts', items: prompts.map(asPromptRow) });
    }
    if (matchedModifiers.length) {
      groups.push({ label: 'Quick Modifiers', items: matchedModifiers.map(asModifierRow) });
    }
    if (matchedActions.length) {
      groups.push({ label: 'Actions', items: matchedActions });
    }
    return groups;
  }

  /**
   * Things the palette can do besides inserting. "Save as a prompt" turns
   * whatever the user selected, or the draft in the chat box, into a new
   * prompt in the full editor.
   */
  function actionRows() {
    return [
      {
        kind: 'action',
        id: 'save-as-prompt',
        title: '💾 Save as a new prompt',
        description: openSelection
          ? 'Opens the editor with the text you selected on this page.'
          : 'Opens the editor with what is in the chat box now.',
        shortcut: '',
        tags: [],
        favourite: false,
        varCount: 0,
        keywords: 'save new prompt capture draft selection template',
        payload: null
      }
    ];
  }

  function scoreAction(a, q) {
    const needle = q.toLowerCase();
    if (a.title.toLowerCase().indexOf(needle) !== -1) return 800;
    return a.keywords.indexOf(needle) !== -1 ? 300 : 0;
  }

  function readPageSelection() {
    try {
      const sel = window.getSelection();
      return sel ? String(sel.toString() || '').trim() : '';
    } catch (e) {
      return '';
    }
  }

  /** Group unfiltered prompts under their category, each heading appearing once. */
  function byCategory(list) {
    const order = [];
    const buckets = {};
    list.forEach((p) => {
      const key = p.category || 'Other';
      if (!buckets[key]) {
        buckets[key] = [];
        order.push(key);
      }
      buckets[key].push(p);
    });
    return order.map((key) => ({
      label: key,
      items: buckets[key].map(asPromptRow)
    }));
  }

  function scoreModifier(m, q) {
    const needle = q.toLowerCase();
    if (m.title.toLowerCase().indexOf(needle) !== -1) return 900;
    if ((m.description || '').toLowerCase().indexOf(needle) !== -1) return 400;
    if ((m.tags || []).some((t) => t.indexOf(needle) !== -1)) return 200;
    return 0;
  }

  function asPromptRow(p) {
    const store = window.OmniStore;
    const varCount = window.OmniTemplate ? window.OmniTemplate.variableCount(p) : 0;
    return {
      kind: 'prompt',
      id: p.id,
      title: p.title,
      description: p.description || '',
      shortcut: p.shortcut || '',
      tags: (p.tags || []).slice(0, 2),
      favourite: store ? store.isFavorite(p.id) : false,
      varCount,
      payload: p
    };
  }

  function asModifierRow(m) {
    return {
      kind: 'modifier',
      id: m.id,
      title: (m.icon ? m.icon + ' ' : '') + m.title,
      description: m.description || '',
      shortcut: '',
      tags: [],
      favourite: false,
      varCount: 0,
      payload: m
    };
  }

  /* =====================================================================
     Rendering
     ===================================================================== */

  function refresh(query) {
    const groups = collect(query);

    rows = [];
    let html = '';

    groups.forEach((group) => {
      if (!group.items.length) return;
      html += '<div class="omni-category-badge">' + escapeHtml(group.label) + '</div>';
      group.items.forEach((row) => {
        const index = rows.length;
        rows.push(row);
        html += renderRow(row, index);
      });
    });

    if (!rows.length) {
      html =
        '<div class="omni-empty-state">No prompts or modifiers match that.<br>' +
        'Try a shorter word, or open the library to add one.</div>';
    }

    listEl.innerHTML = html;
    countEl.textContent = rows.length ? String(rows.length) : '';
    selectedIndex = 0;
    bindRows();
    paintSelection();
  }

  function renderRow(row, index) {
    const flags = [];
    if (row.favourite) flags.push('<span class="omni-slash-flag" title="Favourite">★</span>');
    if (row.varCount) {
      flags.push(
        '<span class="omni-slash-flag" title="' +
          row.varCount +
          ' field' +
          (row.varCount === 1 ? '' : 's') +
          ' to fill">' +
          row.varCount +
          ' ⌨</span>'
      );
    }

    return (
      '<div class="omni-palette-item" data-index="' +
      index +
      '" role="option" aria-selected="false">' +
      '<div class="omni-palette-item-left">' +
      '<span class="omni-palette-item-title">' +
      escapeHtml(row.title) +
      flags.join('') +
      '</span>' +
      '<span class="omni-palette-item-desc">' +
      escapeHtml(row.description) +
      '</span>' +
      '</div>' +
      '<div class="omni-palette-item-right">' +
      row.tags.map((t) => '<span class="omni-tag-pill">' + escapeHtml(t) + '</span>').join('') +
      (row.shortcut ? '<span class="omni-kbd">' + escapeHtml(row.shortcut) + '</span>' : '') +
      '</div>' +
      '</div>'
    );
  }

  function bindRows() {
    const nodes = listEl.querySelectorAll('.omni-palette-item');
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      node.addEventListener('mousedown', (e) => {
        e.preventDefault();
        const idx = parseInt(node.getAttribute('data-index'), 10);
        activate(idx, e.shiftKey);
      });
      node.addEventListener('mouseenter', () => {
        selectedIndex = parseInt(node.getAttribute('data-index'), 10);
        paintSelection();
      });
    }
  }

  function paintSelection() {
    const nodes = listEl.querySelectorAll('.omni-palette-item');
    for (let i = 0; i < nodes.length; i++) {
      const on = i === selectedIndex;
      nodes[i].classList.toggle('selected', on);
      nodes[i].setAttribute('aria-selected', String(on));
      if (on) nodes[i].scrollIntoView({ block: 'nearest' });
    }
  }

  /* =====================================================================
     Keyboard
     ===================================================================== */

  function handlePaletteKeydown(e) {
    switch (e.key) {
      case 'ArrowDown':
        if (!rows.length) return;
        e.preventDefault();
        selectedIndex = (selectedIndex + 1) % rows.length;
        paintSelection();
        return;
      case 'ArrowUp':
        if (!rows.length) return;
        e.preventDefault();
        selectedIndex = (selectedIndex - 1 + rows.length) % rows.length;
        paintSelection();
        return;
      case 'Home':
        if (!rows.length) return;
        e.preventDefault();
        selectedIndex = 0;
        paintSelection();
        return;
      case 'End':
        if (!rows.length) return;
        e.preventDefault();
        selectedIndex = rows.length - 1;
        paintSelection();
        return;
      case 'Enter':
        if (!rows.length) return;
        e.preventDefault();
        activate(selectedIndex, e.shiftKey);
        return;
      case 'Escape':
        e.preventDefault();
        e.stopPropagation();
        close();
        return;
      default:
        return;
    }
  }

  function activate(index, alsoSend) {
    const row = rows[index];
    if (!row) return;

    const target = restoreTarget;
    const caret = restoreCaret;
    const selection = openSelection;
    close();

    if (row.kind === 'modifier') {
      if (onRunModifier) onRunModifier(row.id, { target, caret, text: selection });
      return;
    }
    if (row.kind === 'action') {
      if (onAction) onAction(row.id, { target, caret, selection });
      return;
    }
    if (onSelectPrompt) {
      onSelectPrompt(row.payload, { target, caret, selection, submit: !!alsoSend, onBack: reopen });
    }
  }

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  return {
    init,
    configure,
    open,
    close,
    reopen,
    toggle,
    isOpen: () => isOpen,
    getHotkey: () => hotkey,
    setHotkey(hk) {
      configure({ hotkey: hk });
    }
  };
})();

if (typeof window !== 'undefined') {
  window.CommandPalette = CommandPalette;
}
