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
 * - Pro: lists chains, pins "Next step" while one is running, and switches
 *   the client workspace.
 */

const CommandPalette = (() => {
  'use strict';

  let shadowRoot = null;
  let onSelectPrompt = null;
  let onRunModifier = null;

  let backdrop = null;
  let inputEl = null;
  let listEl = null;
  let countEl = null;
  let previewEl = null;

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
  let onChainAction = null;
  let getActiveChain = null;
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
    onChainAction = handlers && handlers.onChainAction;
    getActiveChain = handlers && handlers.getActiveChain;
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
    // Keys pressed while an IME is composing belong to the IME.
    if (e.isComposing || e.keyCode === 229) return;
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
      '<div class="omni-palette-body">' +
      '<div class="omni-palette-content" id="omni-palette-items" role="listbox"></div>' +
      '<div class="omni-palette-preview" id="omni-palette-preview" aria-live="polite"></div>' +
      '</div>' +
      '<div class="omni-palette-footer">' +
      '<div><span><span class="omni-kbd">↑</span><span class="omni-kbd">↓</span> move</span>' +
      '<span><span class="omni-kbd">↵</span> insert</span>' +
      '<span><span class="omni-kbd">⇧↵</span> insert &amp; send</span>' +
      '<span><span class="omni-kbd">Alt+C</span> compare</span></div>' +
      '<div><span><span class="omni-kbd">Esc</span> close</span></div>' +
      '</div>' +
      '</div>';

    shadowRoot.appendChild(backdrop);

    inputEl = backdrop.querySelector('.omni-palette-input');
    listEl = backdrop.querySelector('#omni-palette-items');
    countEl = backdrop.querySelector('#omni-palette-count');
    previewEl = backdrop.querySelector('#omni-palette-preview');

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

    const running = chainInProgressRows(q);
    if (running.length) groups.push({ label: 'Chain in progress', items: running });

    const chains = store.searchChains ? store.searchChains({ query: q, limit: q ? 10 : 8 }) : [];
    const workspaces = workspaceRows(q);

    const host = typeof location !== 'undefined' ? location.hostname : '';

    if (!q) {
      const sitePrompts = store.search({ query: '', limit: 40, host: host }).filter((p) => p.forSite);
      if (sitePrompts.length) {
        groups.push({ label: 'For this site', items: sitePrompts.map(asPromptRow) });
      }

      const favourites = store.getFavorites().filter((p) => !sitePrompts.some((sp) => sp.id === p.id));
      if (favourites.length) {
        groups.push({ label: 'Favourites', items: favourites.map(asPromptRow) });
      }

      const recents = store
        .getRecent(6)
        .filter((p) => !store.isFavorite(p.id) && !sitePrompts.some((sp) => sp.id === p.id));
      if (recents.length) {
        groups.push({ label: 'Recent', items: recents.map(asPromptRow) });
      }

      if (chains.length) groups.push({ label: 'Chains', items: chains.map(asChainRow) });
      if (workspaces.length) groups.push({ label: 'Workspace', items: workspaces });

      const seen = {};
      sitePrompts.concat(favourites).concat(recents).forEach((p) => {
        seen[p.id] = true;
      });

      const rest = store.search({ query: '', limit: 40, host: host }).filter((p) => !seen[p.id]);
      byCategory(rest).forEach((g) => groups.push(g));

      groups.push({ label: 'Quick Modifiers', items: modifiers.map(asModifierRow) });
      groups.push({ label: 'Actions', items: actionRows() });
      return groups;
    }

    const prompts = store.search({ query: q, limit: 60, host: host });
    const matchedModifiers = modifiers.filter((m) => scoreModifier(m, q) > 0);
    const matchedActions = actionRows().filter((a) => scoreAction(a, q) > 0);

    // Ranked results stay in score order under one heading. Splitting them by
    // category would reorder them and produce the repeated-header bug.
    if (prompts.length) {
      groups.push({ label: 'Prompts', items: prompts.map(asPromptRow) });
    }
    if (chains.length) groups.push({ label: 'Chains', items: chains.map(asChainRow) });
    if (workspaces.length) groups.push({ label: 'Workspace', items: workspaces });
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
        icon: '💾',
        title: 'Save as a new prompt',
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
    const meta = store && store.getCategoryMeta ? store.getCategoryMeta(p.category || 'Custom') : null;
    return {
      kind: 'prompt',
      id: p.id,
      icon: (meta && meta.icon) || '📝',
      category: p.category || 'Custom',
      title: p.title,
      description: p.description || '',
      shortcut: p.shortcut || '',
      tags: (p.tags || []).slice(0, 2),
      favourite: store ? store.isFavorite(p.id) : false,
      varCount,
      payload: p
    };
  }

  /** "Next step" and "End chain" while a Pro chain is running in this tab. */
  function chainInProgressRows(q) {
    const chain = getActiveChain ? getActiveChain() : null;
    if (!chain) return [];
    const needle = q.toLowerCase();
    if (needle && ['next', 'end', 'chain', 'step'].every((w) => w.indexOf(needle) !== 0)) return [];
    return [
      {
        kind: 'next',
        id: chain.chainId,
        icon: '▶',
        title: 'Next: step ' + (chain.next + 1) + ' of ' + chain.total + ' · ' + chain.stepTitle,
        description: chain.title,
        shortcut: '',
        tags: [],
        favourite: false,
        varCount: 0
      },
      {
        kind: 'end',
        id: chain.chainId,
        icon: '■',
        title: 'End this chain',
        description: 'Stops “' + chain.title + '”. Nothing is deleted.',
        shortcut: '',
        tags: [],
        favourite: false,
        varCount: 0
      }
    ];
  }

  function asChainRow(c) {
    return {
      kind: 'chain',
      id: c.id,
      icon: '⛓',
      title: c.title,
      description: c.description || c.steps.length + ' steps, one at a time',
      shortcut: c.shortcut || '',
      tags: [c.steps.length + ' steps'],
      favourite: false,
      varCount: 0
    };
  }

  /**
   * Switch client from the palette (Pro). Listed with no query, or when the
   * query names a workspace or says "workspace" or "client".
   */
  function workspaceRows(q) {
    const store = window.OmniStore;
    if (!store || !store.isPro || !store.isPro() || !store.getWorkspaces) return [];
    const list = store.getWorkspaces();
    if (!list.length) return [];
    const needle = q.toLowerCase();
    const generic = !needle || 'workspace'.indexOf(needle) === 0 || 'client'.indexOf(needle) === 0;
    const active = store.getActiveWorkspace();
    const activeId = active ? active.id : '';

    const rows = list
      .filter((w) => generic || w.name.toLowerCase().indexOf(needle) !== -1)
      .map((w) => ({
        kind: 'workspace',
        id: w.id,
        icon: w.id === activeId ? '✓' : '💼',
        title: w.name,
        description: w.id === activeId ? 'In use. Fields and blocks fill from here.' : 'Switch to this workspace',
        shortcut: '',
        tags: [w.fields.length + ' values'],
        favourite: false,
        varCount: 0
      }));
    if (rows.length && activeId && generic) {
      rows.push({
        kind: 'workspace',
        id: '',
        icon: '○',
        title: 'No workspace',
        description: 'Stop filling values from a workspace',
        shortcut: '',
        tags: [],
        favourite: false,
        varCount: 0
      });
    }
    return rows;
  }

  function asModifierRow(m) {
    return {
      kind: 'modifier',
      id: m.id,
      icon: m.icon || '✦',
      title: m.title,
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
    if (row.favourite) flags.push('<span class="omni-slash-flag is-fav" title="Favourite">★</span>');
    if (row.varCount) {
      flags.push(
        '<span class="omni-slash-flag" title="A short form asks for ' +
          row.varCount +
          ' value' +
          (row.varCount === 1 ? '' : 's') +
          ' first">' +
          row.varCount +
          ' field' +
          (row.varCount === 1 ? '' : 's') +
          '</span>'
      );
    }

    return (
      '<div class="omni-palette-item' +
      (row.kind === 'next' ? ' omni-row-next' : '') +
      '" data-index="' +
      index +
      '" id="omni-palette-row-' +
      index +
      '" role="option" aria-selected="false">' +
      '<span class="omni-row-icon" aria-hidden="true">' +
      escapeHtml(row.icon || '•') +
      '</span>' +
      '<div class="omni-palette-item-left">' +
      '<span class="omni-palette-item-title"><span>' +
      escapeHtml(row.title) +
      '</span>' +
      flags.join('') +
      '</span>' +
      '<span class="omni-palette-item-desc">' +
      escapeHtml(row.description) +
      '</span>' +
      '</div>' +
      '<div class="omni-palette-item-right">' +
      (row.kind === 'prompt' ? '' : row.tags.map((t) => '<span class="omni-tag-pill">' + escapeHtml(t) + '</span>').join('')) +
      (row.shortcut ? '<span class="omni-kbd">' + escapeHtml(slashPrefix() + row.shortcut) + '</span>' : '') +
      '</div>' +
      '</div>'
    );
  }

  /** The trigger the user types, so shortcuts read the way they are used. */
  function slashPrefix() {
    const store = window.OmniStore;
    const s = store && store.getSettings ? store.getSettings() : null;
    return s && s.slashEnabled && s.slashTriggerChar ? s.slashTriggerChar : '';
  }

  /* =====================================================================
     Preview: the exact text the selected row will insert
     ===================================================================== */

  function paintPreview() {
    if (!previewEl) return;
    const row = rows[selectedIndex];
    if (!row) {
      previewEl.innerHTML = '';
      return;
    }

    let label = '';
    let text = '';
    let head = '';
    const meta = [];

    if (row.kind === 'prompt' && row.payload) {
      head = row.category;
      label = row.varCount ? 'Inserts this, after a short form' : 'Inserts exactly this';
      text = String(row.payload.template || '');
      if (row.shortcut && slashPrefix()) meta.push('<span class="omni-kbd">' + escapeHtml(slashPrefix() + row.shortcut) + '</span>');
      if (row.varCount) meta.push('<span class="omni-tag-pill">' + row.varCount + ' field' + (row.varCount === 1 ? '' : 's') + '</span>');
      (row.payload.tags || []).slice(0, 3).forEach((t) => meta.push('<span class="omni-tag-pill">#' + escapeHtml(t) + '</span>'));
    } else if (row.kind === 'modifier') {
      head = 'Quick modifier';
      label = openSelection ? 'Wraps the text you selected' : 'Wraps your selection, or the draft in the box';
      const mod = window.OmniModifiers && window.OmniModifiers.getById ? window.OmniModifiers.getById(row.id) : null;
      try {
        text = mod && typeof mod.transform === 'function' ? mod.transform(openSelection ? clip(openSelection, 280) : '…your text…') : '';
      } catch (e) {
        text = '';
      }
    } else if (row.kind === 'chain') {
      head = 'Chain';
      label = 'Inserts step 1, then waits for you';
    } else if (row.kind === 'next' || row.kind === 'end') {
      head = 'Chain in progress';
    } else if (row.kind === 'workspace') {
      head = 'Workspace';
    } else if (row.kind === 'action') {
      head = 'Action';
    }

    previewEl.innerHTML =
      '<div class="omni-pv-head"><span class="omni-row-icon" aria-hidden="true">' +
      escapeHtml(row.icon || '•') +
      '</span><span>' +
      escapeHtml(head) +
      '</span>' +
      (row.kind === 'prompt' ? '<button type="button" class="omni-field-action omni-pv-compare-act" id="omni-pv-compare-act" title="Compare in several AIs (Alt+C)">Compare…</button>' : '') +
      '</div>' +
      '<div class="omni-pv-title">' +
      escapeHtml(row.title) +
      '</div>' +
      (row.description ? '<div class="omni-pv-desc">' + escapeHtml(row.description) + '</div>' : '') +
      (meta.length ? '<div class="omni-pv-meta">' + meta.join('') + '</div>' : '') +
      (text
        ? '<div class="omni-pv-label">' +
          escapeHtml(label) +
          '</div><div class="omni-pv-text">' +
          markFields(clip(text, 1600)) +
          '</div>'
        : label
        ? '<div class="omni-pv-label">' + escapeHtml(label) + '</div>'
        : '');

    const compBtn = previewEl.querySelector('#omni-pv-compare-act');
    if (compBtn) {
      compBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        activateCompare(selectedIndex);
      });
    }
  }

  function clip(text, max) {
    const s = String(text || '');
    return s.length > max ? s.slice(0, max) + '…' : s;
  }

  /** Escape, then mark {{fields}} so the blanks stand out. */
  function markFields(text) {
    return escapeHtml(text).replace(/\{\{[^{}]{1,80}\}\}/g, (m) => '<span class="omni-pv-mark">' + m + '</span>');
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
    if (inputEl) {
      if (rows.length) inputEl.setAttribute('aria-activedescendant', 'omni-palette-row-' + selectedIndex);
      else inputEl.removeAttribute('aria-activedescendant');
    }
    paintPreview();
  }

  /* =====================================================================
     Keyboard
     ===================================================================== */

  function handlePaletteKeydown(e) {
    // The Enter that confirms an IME search term must not activate a row.
    // Safari reports it as keyCode 229 with isComposing already false.
    if (e.isComposing || e.keyCode === 229) return;
    if (e.altKey && (e.key === 'c' || e.key === 'C')) {
      if (!rows.length) return;
      e.preventDefault();
      activateCompare(selectedIndex);
      return;
    }
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

  function activateCompare(index) {
    const row = rows[index];
    if (!row || row.kind !== 'prompt') return;

    const target = restoreTarget;
    const caret = restoreCaret;
    const selection = openSelection;
    close();

    if (onSelectPrompt) {
      onSelectPrompt(row.payload, { target, caret, selection, compareMode: true, onBack: reopen });
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
    if (row.kind === 'chain' || row.kind === 'next' || row.kind === 'end' || row.kind === 'workspace') {
      if (onChainAction) {
        onChainAction(row.kind, row.id, { target, caret, selection, submit: !!alsoSend, onBack: reopen });
      }
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
    isOpen: () => isOpen
  };
})();

if (typeof window !== 'undefined') {
  window.CommandPalette = CommandPalette;
}
