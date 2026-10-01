/**
 * OmniPrompt - Inline slash trigger
 *
 * Watches editable fields for the trigger prefix (`//` by default), shows a
 * ranked autocomplete at the caret, and swaps the typed token for the chosen
 * prompt.
 *
 * Fixes carried in this rewrite
 * -----------------------------
 * - Escape now sticks. The old menu had no dismissed flag, so pressing Escape
 *   and typing one more character brought it straight back.
 * - The menu is positioned in viewport coordinates against a fixed-position
 *   element. It was previously absolute inside a host attached to
 *   documentElement, so on any scrolled page it was offset by scrollY.
 * - Selecting a prompt replaces only the `//query` token. The old code deleted
 *   the token and then called an insert that overwrote the whole field, so the
 *   careful token removal was pointless and the draft was lost.
 * - It repositions on scroll and resize instead of hanging in mid-air.
 * - Results are ranked by the shared store ranking, so favourites and
 *   frequently used prompts come first.
 * - Pro chains appear as rows too. While one runs, "Next step" is pinned at
 *   the top (type //next) and "End this chain" sits under it.
 */

const SlashTrigger = (() => {
  'use strict';

  const MENU_WIDTH = 400;
  const MENU_MAX_HEIGHT = 360;
  const MAX_QUERY_LENGTH = 32;

  let shadowRoot = null;
  let onSelect = null;
  let onChainAction = null;
  let getActiveChain = null;
  let menu = null;

  let isOpen = false;
  let activeElement = null;
  let triggerChar = '//';
  let enabled = true;
  let maxResults = 100;

  let query = '';
  let tokenLength = 0; // characters to replace: prefix + query
  let items = [];
  let selectedIndex = 0;

  // Set when the user dismisses the menu for the current token. Cleared once
  // they move the caret elsewhere or start a new trigger.
  let dismissedToken = null;

  let scrollHandler = null;
  let resizeHandler = null;

  /* =====================================================================
     Setup
     ===================================================================== */

  function init(root, selectCallback, options) {
    const opts = options || {};
    shadowRoot = root;
    onSelect = selectCallback;
    if (typeof opts.onChainAction === 'function') onChainAction = opts.onChainAction;
    if (typeof opts.getActiveChain === 'function') getActiveChain = opts.getActiveChain;
    if (typeof opts.triggerChar === 'string') triggerChar = opts.triggerChar;
    if (typeof opts.enabled === 'boolean') enabled = opts.enabled;
    if (typeof opts.maxResults === 'number') maxResults = opts.maxResults;

    document.addEventListener('input', handleInput, true);
    // Input events during IME composition are skipped, so look again once the
    // text is committed.
    document.addEventListener('compositionend', handleInput, true);
    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('focusout', handleFocusOut, true);
  }

  function configure(options) {
    const opts = options || {};
    if (typeof opts.triggerChar === 'string' && opts.triggerChar) triggerChar = opts.triggerChar;
    if (typeof opts.enabled === 'boolean') enabled = opts.enabled;
    if (typeof opts.maxResults === 'number' && opts.maxResults > 0) maxResults = opts.maxResults;
    if (!enabled && isOpen) close();
  }

  /* =====================================================================
     Trigger detection
     ===================================================================== */

  function isCandidate(el) {
    if (!el || !window.ChatbotAdapters) return false;
    // Never fire inside our own shadow UI.
    if (el.getRootNode && el.getRootNode() === shadowRoot) return false;
    return window.ChatbotAdapters.isEditable(el);
  }

  /**
   * Look for the trigger immediately before the caret.
   *
   * The prefix must start the field or follow whitespace, so a URL like
   * `https://example.com` never opens the menu. The query stops at whitespace,
   * which keeps the menu from staying open across a sentence.
   */
  function detect(el) {
    const { text } = window.ChatbotAdapters.getTextBeforeCaret(el);
    const idx = text.lastIndexOf(triggerChar);
    if (idx === -1) return null;

    const charBefore = idx > 0 ? text.charAt(idx - 1) : '';
    if (idx !== 0 && !/\s/.test(charBefore)) return null;

    const raw = text.slice(idx + triggerChar.length);
    if (/\s/.test(raw)) return null;
    if (raw.length > MAX_QUERY_LENGTH) return null;

    return {
      query: raw,
      tokenLength: triggerChar.length + raw.length,
      tokenStart: idx
    };
  }

  function handleInput(e) {
    // Half-typed IME text (Chinese, Japanese, Korean) is not the user's query
    // yet; compositionend runs this again with the committed text.
    if (e.isComposing) return;
    if (!enabled || !triggerChar) {
      if (isOpen) close();
      return;
    }

    const el = e.target;
    if (!isCandidate(el)) return;

    const hit = detect(el);
    if (!hit) {
      dismissedToken = null;
      if (isOpen) close();
      return;
    }

    // Respect an Escape for this exact token, but let a changed query reopen.
    if (dismissedToken !== null && dismissedToken === hit.query) return;
    dismissedToken = null;

    activeElement = el;
    query = hit.query;
    tokenLength = hit.tokenLength;
    open();
  }

  function handleFocusOut(e) {
    if (!isOpen) return;
    if (e.target === activeElement) {
      // Focus may be moving into our own menu; check on the next tick.
      window.setTimeout(() => {
        if (!isOpen) return;
        if (activeElement && activeElement.isConnected) {
          const active = document.activeElement;
          if (active === activeElement) return;
        }
        close();
      }, 0);
    }
  }

  function handlePointerDown(e) {
    if (!isOpen) return;
    const path = typeof e.composedPath === 'function' ? e.composedPath() : [];
    if (menu && path.indexOf(menu) !== -1) return;
    close();
  }

  /* =====================================================================
     Keyboard
     ===================================================================== */

  function handleKeyDown(e) {
    if (!isOpen) return;
    // While an IME is composing, Enter, Tab and the arrows belong to its
    // candidate window. Safari reports the confirming Enter as keyCode 229
    // with isComposing already false.
    if (e.isComposing || e.keyCode === 229) return;

    switch (e.key) {
      case 'ArrowDown':
        if (!items.length) return;
        e.preventDefault();
        e.stopPropagation();
        selectedIndex = (selectedIndex + 1) % items.length;
        paintSelection();
        return;

      case 'ArrowUp':
        if (!items.length) return;
        e.preventDefault();
        e.stopPropagation();
        selectedIndex = (selectedIndex - 1 + items.length) % items.length;
        paintSelection();
        return;

      case 'Home':
        if (!items.length) return;
        e.preventDefault();
        selectedIndex = 0;
        paintSelection();
        return;

      case 'End':
        if (!items.length) return;
        e.preventDefault();
        selectedIndex = items.length - 1;
        paintSelection();
        return;

      case 'Enter':
      case 'Tab':
        if (!items.length) {
          // Nothing to choose. Close so Enter reaches the page and sends the
          // message rather than being swallowed.
          close();
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        choose(items[selectedIndex]);
        return;

      case 'Escape':
        e.preventDefault();
        e.stopPropagation();
        dismissedToken = query;
        close();
        return;

      default:
        return;
    }
  }

  /* =====================================================================
     Opening and positioning
     ===================================================================== */

  /**
   * The rows to show. Prompts as before; with Pro chains, a running chain's
   * next step comes first (type //next), then chains whose shortcut matches.
   */
  function currentResults() {
    const store = window.OmniStore;
    if (!store) return [];
    const rows = [];
    const q = String(query || '').toLowerCase();

    const chain = getActiveChain ? getActiveChain() : null;
    if (chain && (!q || 'next'.indexOf(q) === 0 || 'end'.indexOf(q) === 0)) {
      rows.push({
        kind: 'next',
        id: chain.chainId,
        title: 'Next: step ' + (chain.next + 1) + ' of ' + chain.total + ' · ' + chain.stepTitle,
        description: chain.title,
        shortcut: 'next'
      });
      rows.push({
        kind: 'end',
        id: chain.chainId,
        title: 'End this chain',
        description: 'Stops “' + chain.title + '”. Nothing is deleted.',
        shortcut: 'end'
      });
    }

    const chains = store.searchChains ? store.searchChains({ query, limit: 8 }) : [];
    const exact = chains.filter((c) => c.shortcut && c.shortcut === q);
    exact.forEach((c) => rows.push(chainRow(c)));

    const host = typeof location !== 'undefined' ? location.hostname : '';
    store.search({ query, limit: maxResults, host: host }).forEach((p) => {
      rows.push({
        kind: 'prompt',
        id: p.id,
        title: p.title,
        description: p.description || '',
        shortcut: p.shortcut || '',
        payload: p
      });
    });

    chains.filter((c) => exact.indexOf(c) === -1).forEach((c) => rows.push(chainRow(c)));
    return rows;
  }

  function chainRow(c) {
    return {
      kind: 'chain',
      id: c.id,
      title: c.title,
      description: c.description || c.steps.length + ' steps, one at a time',
      shortcut: c.shortcut || '',
      steps: c.steps.length
    };
  }

  function open() {
    if (!shadowRoot) return;

    items = currentResults();
    selectedIndex = 0;

    if (!menu) {
      menu = document.createElement('div');
      menu.className = 'omni-slash-menu';
      menu.setAttribute('role', 'listbox');
      menu.setAttribute('aria-label', 'OmniPrompt prompt suggestions');
      shadowRoot.appendChild(menu);
    }

    render();
    menu.style.display = 'flex';
    isOpen = true;
    position();
    attachViewportHandlers();
  }

  function close() {
    if (menu) menu.style.display = 'none';
    isOpen = false;
    items = [];
    detachViewportHandlers();
  }

  function attachViewportHandlers() {
    if (scrollHandler) return;
    scrollHandler = () => {
      if (isOpen) position();
    };
    resizeHandler = () => {
      if (isOpen) position();
    };
    // Capture phase catches scrolling inside the chat container too.
    window.addEventListener('scroll', scrollHandler, true);
    window.addEventListener('resize', resizeHandler);
  }

  function detachViewportHandlers() {
    if (!scrollHandler) return;
    window.removeEventListener('scroll', scrollHandler, true);
    window.removeEventListener('resize', resizeHandler);
    scrollHandler = null;
    resizeHandler = null;
  }

  /**
   * Place the menu just above the caret, flipping below when there is no room.
   *
   * Coordinates come from getBoundingClientRect, which is viewport-relative,
   * and `.omni-slash-menu` is position:fixed, so the two agree. That is the
   * fix for the menu drifting off-screen on scrolled pages.
   */
  function position() {
    if (!menu || !activeElement) return;

    const caret = window.ChatbotAdapters.getCaretRect(activeElement);
    if (!caret) return;

    const height = Math.min(menu.offsetHeight || MENU_MAX_HEIGHT, MENU_MAX_HEIGHT);
    const width = menu.offsetWidth || MENU_WIDTH;
    const margin = 8;

    let left = caret.left;
    if (left + width > window.innerWidth - margin) left = window.innerWidth - width - margin;
    if (left < margin) left = margin;

    const spaceAbove = caret.top;
    const spaceBelow = window.innerHeight - caret.bottom;

    let top;
    if (spaceAbove >= height + margin) {
      top = caret.top - height - margin;
      menu.dataset.placement = 'above';
    } else if (spaceBelow >= height + margin) {
      top = caret.bottom + margin;
      menu.dataset.placement = 'below';
    } else if (spaceBelow >= spaceAbove) {
      top = Math.max(margin, window.innerHeight - height - margin);
      menu.dataset.placement = 'below';
    } else {
      top = margin;
      menu.dataset.placement = 'above';
    }

    menu.style.top = Math.round(top) + 'px';
    menu.style.left = Math.round(left) + 'px';
  }

  /* =====================================================================
     Rendering
     ===================================================================== */

  function render() {
    if (!menu) return;

    const prefix = triggerChar || '/';

    if (!items.length) {
      menu.innerHTML =
        '<div class="omni-slash-header">' +
        '<span class="omni-slash-title">No matches</span>' +
        '<span class="omni-slash-hint">Esc to dismiss</span>' +
        '</div>' +
        '<div class="omni-empty-state">Nothing matches <strong>' +
        escapeHtml(prefix + query) +
        '</strong>.<br>Keep typing, or press Esc to carry on writing.</div>';
      return;
    }

    const rows = items
      .map((p, idx) => {
        const isPrompt = p.kind === 'prompt';
        const fav = isPrompt && window.OmniStore && window.OmniStore.isFavorite(p.id);
        const varCount = isPrompt && window.OmniTemplate ? window.OmniTemplate.variableCount(p.payload) : 0;
        const badges = [];
        if (fav) badges.push('<span class="omni-slash-flag is-fav" title="Favourite">★</span>');
        if (p.kind === 'chain') {
          badges.push('<span class="omni-slash-flag" title="A chain of ' + p.steps + ' prompts">' + p.steps + ' steps</span>');
        }
        if (varCount) {
          badges.push(
            '<span class="omni-slash-flag" title="A short form asks for ' +
              varCount +
              ' value' +
              (varCount === 1 ? '' : 's') +
              ' first">' +
              varCount +
              ' field' +
              (varCount === 1 ? '' : 's') +
              '</span>'
          );
        }

        return (
          '<li class="omni-slash-item' +
          (idx === selectedIndex ? ' selected' : '') +
          (p.kind === 'next' ? ' omni-row-next' : '') +
          '" data-index="' +
          idx +
          '" role="option" aria-selected="' +
          (idx === selectedIndex) +
          '">' +
          '<span class="omni-row-icon" aria-hidden="true">' +
          escapeHtml(rowIcon(p)) +
          '</span>' +
          '<div class="omni-slash-item-top">' +
          '<span class="omni-slash-item-name"><span>' +
          escapeHtml(p.title) +
          '</span>' +
          badges.join('') +
          '</span>' +
          (p.shortcut
            ? '<span class="omni-slash-item-shortcut">' + escapeHtml(prefix + p.shortcut) + '</span>'
            : '') +
          '</div>' +
          '<div class="omni-slash-item-desc">' +
          escapeHtml(p.description || '') +
          '</div>' +
          '</li>'
        );
      })
      .join('');

    const headerTitle = query
      ? items.length + ' match' + (items.length === 1 ? '' : 'es') + ' for ' + prefix + query
      : 'Your prompts (' + items.length + ')';

    menu.innerHTML =
      '<div class="omni-slash-header">' +
      '<span class="omni-slash-title">' +
      escapeHtml(headerTitle) +
      '</span>' +
      '<span class="omni-slash-hint"><span class="omni-kbd">↑</span><span class="omni-kbd">↓</span> <span class="omni-kbd">↵</span> insert · <span class="omni-kbd">Esc</span></span>' +
      '</div>' +
      '<ul class="omni-slash-list">' +
      rows +
      '</ul>';

    bindRows();
  }

  /** A category icon for prompts, a symbol for chain rows. */
  function rowIcon(p) {
    if (p.kind === 'chain') return '⛓';
    if (p.kind === 'next') return '▶';
    if (p.kind === 'end') return '■';
    const store = window.OmniStore;
    const category = p.payload && p.payload.category ? p.payload.category : 'Custom';
    const meta = store && store.getCategoryMeta ? store.getCategoryMeta(category) : null;
    return (meta && meta.icon) || '📝';
  }

  function bindRows() {
    const rows = menu.querySelectorAll('.omni-slash-item');
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      // Mousedown rather than click: click would land after focusout has
      // already closed the menu on some editors.
      row.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const idx = parseInt(row.getAttribute('data-index'), 10);
        choose(items[idx]);
      });
      row.addEventListener('mouseenter', () => {
        selectedIndex = parseInt(row.getAttribute('data-index'), 10);
        paintSelection();
      });
    }
  }

  /** Repaint selection without rebuilding the list, so scroll position holds. */
  function paintSelection() {
    if (!menu) return;
    const rows = menu.querySelectorAll('.omni-slash-item');
    for (let i = 0; i < rows.length; i++) {
      const on = i === selectedIndex;
      rows[i].classList.toggle('selected', on);
      rows[i].setAttribute('aria-selected', String(on));
      if (on) rows[i].scrollIntoView({ block: 'nearest' });
    }
  }

  /* =====================================================================
     Selection
     ===================================================================== */

  function choose(row) {
    if (!row) return;

    const target = activeElement;
    const length = tokenLength;
    const savedQuery = query;

    // Snapshot the caret before anything else. If the prompt has placeholders,
    // a modal is about to take focus, and a contenteditable will not remember
    // where the caret was. Without this the `//token` would be left behind.
    const caret = window.ChatbotAdapters ? window.ChatbotAdapters.captureCaret(target) : null;

    close();
    dismissedToken = null;

    // The `//token` is still sitting in the field at this point, since nothing
    // has been written yet. Going back just means reopening this same menu
    // for the same token, so picking the wrong prompt costs nothing.
    const reopenThisMenu = () => {
      if (!target || !target.isConnected) return;
      activeElement = target;
      query = savedQuery;
      tokenLength = length;
      open();
    };

    const ctx = { target, replaceLength: length, caret, onBack: reopenThisMenu };

    // Chains, the next step and "end chain" go to the coordinator's runner,
    // which replaces the same typed token.
    if (row.kind !== 'prompt') {
      if (onChainAction) onChainAction(row.kind, row.id, ctx);
      return;
    }

    if (onSelect) {
      // The coordinator collects any variables, then replaces exactly the token
      // the user typed and nothing else.
      onSelect(row.payload, ctx);
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
    isOpen: () => isOpen
  };
})();

if (typeof window !== 'undefined') {
  window.SlashTrigger = SlashTrigger;
}
