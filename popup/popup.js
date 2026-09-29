/**
 * OmniPrompt - Popup controller
 *
 * Search, favourites, recents, quick create, modifiers and backup.
 *
 * Fixes carried in this rewrite
 * -----------------------------
 * - One storage layer. The popup used to write `custom_prompts` while the
 *   options page wrote `prompts_override`, and readers preferred the latter, so
 *   a prompt saved here could become permanently invisible.
 * - "Restore" is honest. The old button promised custom prompts were safe while
 *   deleting the key the options page stored them in.
 * - Import no longer lies about the count, and no longer silently drops
 *   everything that is not flagged `isCustom`.
 * - No fake auto-fill badges. The popup cannot see the page selection, so
 *   prompts with variables are handed to the in-page modal, which can. The
 *   popup's own form is used for Copy and as a fallback, and only claims the
 *   auto-fill it can actually do.
 * - No native prompt()/confirm() for creating things. Those dialogs can close
 *   the popup and lose the work.
 */

'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const store = window.OmniStore;
  const template = window.OmniTemplate;
  const modifiers = window.OmniModifiers;
  const importers = window.OmniImporters;

  const FAVOURITES = '__favourites__';

  let currentCategory = 'All';
  let searchQuery = '';
  let settings = null;
  let activeHost = '';

  /* =====================================================================
     Element handles
     ===================================================================== */

  const el = {
    search: document.getElementById('search-input'),
    clearSearch: document.getElementById('clear-search'),
    list: document.getElementById('prompts-list'),
    count: document.getElementById('prompt-count'),
    hotkeyHint: document.getElementById('footer-shortcut-hint'),
    toast: document.getElementById('toast'),
    categoryBar: document.getElementById('category-bar'),
    catScrollLeft: document.getElementById('cat-scroll-left'),
    catScrollRight: document.getElementById('cat-scroll-right'),
    pills: document.getElementById('category-pills'),
    tabs: document.querySelectorAll('.tab-btn'),
    panes: document.querySelectorAll('.tab-pane'),

    modifiersList: document.getElementById('modifiers-list'),

    form: document.getElementById('new-prompt-form'),
    fId: document.getElementById('new-id'),
    fTitle: document.getElementById('new-title'),
    fCategory: document.getElementById('new-category'),
    addCategoryBtn: document.getElementById('btn-popup-add-category'),
    fShortcut: document.getElementById('new-shortcut'),
    fTags: document.getElementById('new-tags'),
    fDescription: document.getElementById('new-description'),
    fTemplate: document.getElementById('new-template'),
    formHeading: document.getElementById('new-prompt-heading'),
    saveBtn: document.getElementById('btn-save-popup-prompt'),
    cancelBtn: document.getElementById('btn-cancel-edit-popup'),
    fullEditorBtn: document.getElementById('btn-open-full-editor'),
    shortcutPreview: document.getElementById('shortcut-preview'),
    variableSummary: document.getElementById('variable-summary'),

    siteDisabled: document.getElementById('setting-site-disabled'),
    siteHost: document.getElementById('site-host'),
    exportDesc: document.getElementById('export-desc'),

    modal: document.getElementById('popup-variable-modal'),
    modalTitle: document.getElementById('modal-prompt-title'),
    modalFields: document.getElementById('modal-fields-container'),
    modalPreview: document.getElementById('modal-preview-text'),
    modalWarning: document.getElementById('modal-warning'),
    modalClose: document.getElementById('btn-close-popup-modal'),
    modalCopy: document.getElementById('btn-modal-copy'),
    modalInsert: document.getElementById('btn-modal-insert'),

    catModal: document.getElementById('popup-category-modal'),
    catModalTitle: document.getElementById('popup-cat-modal-title'),
    catModalClose: document.getElementById('btn-close-popup-cat-modal'),
    catModalName: document.getElementById('popup-cat-name'),
    catModalError: document.getElementById('popup-cat-error'),
    catModalPreview: document.getElementById('popup-cat-preview'),
    catModalCustomEmoji: document.getElementById('popup-cat-custom-emoji'),
    catModalEmojiTabs: document.getElementById('popup-cat-emoji-tabs'),
    catModalEmojiGrid: document.getElementById('popup-cat-emoji-grid'),
    catModalCancel: document.getElementById('btn-popup-cat-cancel'),
    catModalSave: document.getElementById('btn-popup-cat-save'),

    tierBadge: document.getElementById('btn-popup-tier'),
    limitBanner: document.getElementById('popup-limit-banner'),
    bannerUpgradeBtn: document.getElementById('btn-popup-banner-upgrade'),

    reviewCard: document.getElementById('review-card'),
    reviewYes: document.getElementById('btn-review-yes'),
    reviewNo: document.getElementById('btn-review-no')
  };

  /* =====================================================================
     Boot
     ===================================================================== */

  init();

  async function init() {
    // Paint the stored theme before the first read finishes, so the panel does
    // not flash the wrong skin on open.
    applyTheme();

    await store.init();
    store.watchStorage();
    settings = store.getSettings();

    applyTheme();
    bindTheme();

    activeHost = await getActiveHost();
    paintSettings();
    renderPills();
    renderCategoryOptions();
    renderList();
    renderModifiers();
    updateFooter();
    updateTierBadge();

    bindTabs();
    bindSearch();
    bindCategoryNav();
    bindForm();
    bindCategoryModal();
    bindDataTab();
    bindModal();
    bindHeader();
    bindReviewCard();

    // Opening the popup is a natural moment for the daily backup.
    store.maybeDailySnapshot().catch(() => {});

    // Live refresh when the options page or another tab changes something.
    store.onChange(() => {
      settings = store.getSettings();
      applyTheme();
      renderPills();
      renderCategoryOptions(el.fCategory.value);
      renderList();
      updateFooter();
      updateTierBadge();
    });
  }

  /* =====================================================================
     One-time review request
     ===================================================================== */

  /**
   * Asked once, only after the user has inserted enough prompts to know
   * whether OmniPrompt is useful, and never inside the page they work on.
   */
  function paintReviewCard() {
    if (!el.reviewCard) return;
    el.reviewCard.style.display = store.shouldAskForReview() ? 'flex' : 'none';
  }

  function bindReviewCard() {
    paintReviewCard();
    if (el.reviewYes) {
      el.reviewYes.addEventListener('click', async () => {
        await store.setSetting('reviewPrompt', 'done');
        chrome.tabs.create({
          url: 'https://chromewebstore.google.com/detail/' + chrome.runtime.id + '/reviews'
        });
        window.close();
      });
    }
    if (el.reviewNo) {
      el.reviewNo.addEventListener('click', async () => {
        await store.setSetting('reviewPrompt', 'dismissed');
        paintReviewCard();
      });
    }
  }

  function updateTierBadge() {
    if (!el.tierBadge) return;
    const isPro = store.isPro && store.isPro();
    if (isPro) {
      el.tierBadge.textContent = '👑 PRO';
      el.tierBadge.title = 'OmniPrompt Pro (Active)';
      el.tierBadge.className = 'popup-tier-badge is-pro';
      if (el.limitBanner) el.limitBanner.style.display = 'none';
    } else {
      const count = store.getCustomCount ? store.getCustomCount() : 0;
      const limit = store.getFreeLimit ? store.getFreeLimit() : 25;
      const price = store.getProInfo().price;
      el.tierBadge.textContent = 'PRO ' + price;
      el.tierBadge.title = 'Free: ' + count + ' of ' + limit + ' prompts of your own · Pro is ' + price + ' once';
      el.tierBadge.className = 'popup-tier-badge';
      if (el.limitBanner) {
        el.limitBanner.style.display = store.isLimitReached && store.isLimitReached() ? 'flex' : 'none';
      }
    }
  }

  /* =====================================================================
     Theme
     ===================================================================== */

  function currentThemeChoice() {
    return settings && settings.theme ? settings.theme : 'system';
  }

  function applyTheme() {
    if (!window.OmniTheme) return;
    window.OmniTheme.apply(document.documentElement, currentThemeChoice());
    paintThemeButtons();
  }

  function paintThemeButtons() {
    const choice = window.OmniTheme ? window.OmniTheme.normalize(currentThemeChoice()) : 'system';
    document.querySelectorAll('.theme-opt').forEach((btn) => {
      const on = btn.getAttribute('data-choice') === choice;
      btn.setAttribute('aria-pressed', String(on));
    });
  }

  function bindTheme() {
    document.querySelectorAll('.theme-opt').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const choice = btn.getAttribute('data-choice');
        await store.setSetting('theme', choice);
        settings = store.getSettings();
        applyTheme();
        broadcastSettings();
        showToast('Theme: ' + window.OmniTheme.label(choice) + '.');
      });
    });

    // Follow the operating system while the choice is 'system'.
    if (window.OmniTheme) {
      window.OmniTheme.watchSystem(currentThemeChoice, () => applyTheme());
    }
  }

  /* =====================================================================
     Header, tabs, search
     ===================================================================== */

  function bindHeader() {
    if (el.tierBadge) {
      el.tierBadge.addEventListener('click', () => {
        chrome.tabs.create({ url: chrome.runtime.getURL('options/options.html?view=settings#license') });
        window.close();
      });
    }
    if (el.bannerUpgradeBtn) {
      el.bannerUpgradeBtn.addEventListener('click', () => {
        chrome.tabs.create({ url: chrome.runtime.getURL('options/options.html?view=settings#license') });
        window.close();
      });
    }
    document.getElementById('btn-open-guide').addEventListener('click', () => {
      chrome.tabs.create({ url: chrome.runtime.getURL('welcome/welcome.html') });
      window.close();
    });
    document.getElementById('btn-open-options').addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
      window.close();
    });
  }

  function bindTabs() {
    el.tabs.forEach((btn) => {
      btn.addEventListener('click', () => selectTab(btn.getAttribute('data-tab')));
    });
  }

  function selectTab(tabId) {
    el.tabs.forEach((b) => {
      const on = b.getAttribute('data-tab') === tabId;
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', String(on));
    });
    el.panes.forEach((p) => p.classList.toggle('active', p.id === tabId));
    if (el.categoryBar) {
      el.categoryBar.style.display = tabId === 'tab-prompts' ? 'flex' : 'none';
      if (tabId === 'tab-prompts' && categoryNav) {
        categoryNav.updateNav();
      }
    } else if (el.pills) {
      el.pills.style.display = tabId === 'tab-prompts' ? 'flex' : 'none';
    }
    if (tabId === 'tab-new') {
      if (el.limitBanner) {
        el.limitBanner.style.display = store.isLimitReached && store.isLimitReached() ? 'flex' : 'none';
      }
      el.fTitle.focus();
    }
  }

  function bindSearch() {
    el.search.addEventListener('input', () => {
      searchQuery = el.search.value.trim();
      el.clearSearch.style.display = searchQuery ? 'block' : 'none';
      renderList();
    });

    el.search.addEventListener('keydown', (e) => {
      // Enter on a search inserts the top hit, which makes the popup usable
      // without touching the mouse.
      if (e.key === 'Enter') {
        const first = el.list.querySelector('.prompt-card');
        if (first) {
          e.preventDefault();
          insertPrompt(first.getAttribute('data-id'));
        }
      }
    });

    el.clearSearch.addEventListener('click', () => {
      el.search.value = '';
      searchQuery = '';
      el.clearSearch.style.display = 'none';
      el.search.focus();
      renderList();
    });
  }

  /* =====================================================================
     Category pills & navigation
     ===================================================================== */

  let categoryNav = null;

  function bindCategoryNav() {
    if (!el.categoryBar || !el.pills || !el.catScrollLeft || !el.catScrollRight) return;

    let isDown = false;
    let startX = 0;
    let scrollStart = 0;
    let hasDragged = false;

    function updateNav() {
      const maxScroll = Math.max(0, el.pills.scrollWidth - el.pills.clientWidth);
      if (maxScroll <= 2) {
        el.catScrollLeft.style.display = 'none';
        el.catScrollRight.style.display = 'none';
        return;
      }
      el.catScrollLeft.style.display = 'inline-flex';
      el.catScrollRight.style.display = 'inline-flex';
      el.catScrollLeft.disabled = el.pills.scrollLeft <= 2;
      el.catScrollRight.disabled = el.pills.scrollLeft >= maxScroll - 2;
    }

    el.pills.addEventListener('scroll', updateNav, { passive: true });

    el.catScrollLeft.addEventListener('click', () => {
      el.pills.scrollBy({ left: -160, behavior: 'smooth' });
    });

    el.catScrollRight.addEventListener('click', () => {
      el.pills.scrollBy({ left: 160, behavior: 'smooth' });
    });

    // Horizontal mouse wheel scrolling
    el.categoryBar.addEventListener(
      'wheel',
      (e) => {
        if (e.deltaY) {
          e.preventDefault();
          let delta = e.deltaY;
          if (e.deltaMode === 1) delta *= 30;
          else if (e.deltaMode === 2) delta *= 300;
          el.pills.scrollLeft += delta;
          updateNav();
        }
      },
      { passive: false }
    );

    // Mouse drag-to-scroll
    el.pills.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      isDown = true;
      hasDragged = false;
      startX = e.pageX;
      scrollStart = el.pills.scrollLeft;
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      const deltaX = e.pageX - startX;
      if (!hasDragged && Math.abs(deltaX) > 4) {
        hasDragged = true;
        el.pills.classList.add('is-dragging');
      }
      if (hasDragged) {
        el.pills.scrollLeft = scrollStart - deltaX;
        updateNav();
      }
    });

    window.addEventListener('mouseup', () => {
      if (!isDown) return;
      isDown = false;
      if (hasDragged) {
        setTimeout(() => {
          el.pills.classList.remove('is-dragging');
          hasDragged = false;
        }, 40);
      }
    });

    categoryNav = {
      updateNav,
      isDragging: () => hasDragged
    };

    updateNav();
  }

  function ensurePillVisible(catPill) {
    if (!catPill || !el.pills) return;
    const pillLeft = catPill.offsetLeft;
    const pillRight = pillLeft + catPill.offsetWidth;
    const containerLeft = el.pills.scrollLeft;
    const containerRight = containerLeft + el.pills.clientWidth;

    if (pillLeft < containerLeft) {
      el.pills.scrollTo({ left: Math.max(0, pillLeft - 8), behavior: 'smooth' });
    } else if (pillRight > containerRight) {
      el.pills.scrollTo({ left: pillRight - el.pills.clientWidth + 8, behavior: 'smooth' });
    }
  }

  function renderPills() {
    const counts = store.countByCategory();
    const favCount = store.getFavorites().length;

    let html =
      '<button class="cat-pill' +
      (currentCategory === FAVOURITES ? ' active' : '') +
      '" data-cat="' +
      FAVOURITES +
      '" title="Your favourites">★ ' +
      favCount +
      '</button>';

    html +=
      '<button class="cat-pill' +
      (currentCategory === 'All' ? ' active' : '') +
      '" data-cat="All">All</button>';

    store.getCategories().forEach((cat) => {
      if (cat === 'Custom') return;
      const meta = store.getCategoryMeta(cat);
      const iconPrefix = meta && meta.icon ? meta.icon + ' ' : '';
      html +=
        '<button class="cat-pill' +
        (currentCategory === cat ? ' active' : '') +
        '" data-cat="' +
        escapeAttr(cat) +
        '">' +
        iconPrefix +
        escapeHtml(cat) +
        (counts[cat] ? ' <span class="pill-count">' + counts[cat] + '</span>' : '') +
        '</button>';
    });

    html +=
      '<button class="cat-pill' +
      (currentCategory === 'Custom' ? ' active' : '') +
      '" data-cat="Custom">Mine</button>';

    el.pills.innerHTML = html;

    el.pills.querySelectorAll('.cat-pill').forEach((pill) => {
      pill.addEventListener('click', () => {
        if (categoryNav && categoryNav.isDragging()) return;
        currentCategory = pill.getAttribute('data-cat');
        renderPills();
        renderList();
        const activePill = el.pills.querySelector('.cat-pill[data-cat="' + cssEscape(currentCategory) + '"]');
        ensurePillVisible(activePill);
      });
    });

    if (categoryNav) {
      categoryNav.updateNav();
      requestAnimationFrame(() => categoryNav.updateNav());
    }
  }

  /* =====================================================================
     Prompt list
     ===================================================================== */

  function currentResults() {
    if (currentCategory === FAVOURITES) {
      const favourites = store.getFavorites();
      if (!searchQuery) return favourites;
      return favourites.filter((p) => store.scoreOne(p, searchQuery) > 0);
    }
    return store.search({ query: searchQuery, category: currentCategory });
  }

  function renderList() {
    const results = currentResults();

    if (!results.length) {
      el.list.innerHTML =
        '<div class="empty-state">' +
        (searchQuery
          ? 'Nothing matches <strong>' + escapeHtml(searchQuery) + '</strong>.'
          : currentCategory === FAVOURITES
          ? 'No favourites yet. Tap the star on any prompt to pin it here.'
          : 'No prompts in this category yet.') +
        '</div>';
      updateFooter(results.length);
      return;
    }

    let html = '';

    // Recents get their own strip when the user is just browsing.
    if (!searchQuery && currentCategory === 'All') {
      const recents = store.getRecent(3);
      if (recents.length) {
        html += '<div class="list-section-label">Recent</div>';
        html += recents.map(cardHtml).join('');
        html += '<div class="list-section-label">All prompts</div>';
        const recentIds = {};
        recents.forEach((r) => {
          recentIds[r.id] = true;
        });
        html += results.filter((p) => !recentIds[p.id]).map(cardHtml).join('');
        el.list.innerHTML = html;
        bindCards();
        updateFooter(results.length);
        return;
      }
    }

    el.list.innerHTML = results.map(cardHtml).join('');
    bindCards();
    updateFooter(results.length);
  }

  function cardHtml(p) {
    const prefix = settings.slashEnabled ? settings.slashTriggerChar : '';
    const varCount = template.variableCount(p);
    const fav = store.isFavorite(p.id);
    const usage = store.getUsage(p.id);

    const meta = [];
    meta.push('<span class="tag-badge">' + escapeHtml(p.category || 'Custom') + '</span>');
    if (varCount) {
      meta.push(
        '<span class="tag-badge" title="' +
          varCount +
          ' field' +
          (varCount === 1 ? '' : 's') +
          ' to fill in">' +
          varCount +
          ' ⌨</span>'
      );
    }
    if (usage.count > 2) {
      meta.push('<span class="tag-badge" title="You use this often">used ' + usage.count + '×</span>');
    }
    if (p.isEdited) meta.push('<span class="tag-badge" title="You edited this built-in prompt">edited</span>');

    return (
      '<div class="prompt-card" data-id="' +
      escapeAttr(p.id) +
      '">' +
      '<div class="prompt-card-top">' +
      '<span class="prompt-card-title">' +
      escapeHtml(p.title) +
      '</span>' +
      (p.shortcut && prefix
        ? '<span class="prompt-card-shortcut">' + escapeHtml(prefix + p.shortcut) + '</span>'
        : '') +
      '</div>' +
      '<div class="prompt-card-desc">' +
      escapeHtml(p.description || '') +
      '</div>' +
      '<div class="prompt-card-bottom">' +
      '<div class="prompt-card-tags">' +
      meta.join('') +
      '</div>' +
      '<div class="prompt-card-actions">' +
      '<button class="btn-action btn-star' +
      (fav ? ' is-fav' : '') +
      '" data-act="fav" title="' +
      (fav ? 'Remove from favourites' : 'Add to favourites') +
      '" aria-label="Toggle favourite">' +
      (fav ? '★' : '☆') +
      '</button>' +
      '<button class="btn-action" data-act="edit" title="Edit this prompt">Edit</button>' +
      '<button class="btn-action" data-act="copy" title="Copy to clipboard">Copy</button>' +
      '<button class="btn-action btn-action-primary" data-act="insert" title="Insert into the page">Insert</button>' +
      '</div>' +
      '</div>' +
      '</div>'
    );
  }

  function bindCards() {
    el.list.querySelectorAll('.prompt-card').forEach((card) => {
      const id = card.getAttribute('data-id');

      card.querySelectorAll('[data-act]').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const act = btn.getAttribute('data-act');
          if (act === 'fav') return toggleFavourite(id);
          if (act === 'edit') return editPrompt(id);
          if (act === 'copy') return copyPrompt(id);
          if (act === 'insert') return insertPrompt(id);
        });
      });

      card.addEventListener('click', () => insertPrompt(id));
    });
  }

  async function toggleFavourite(id) {
    const nowFav = await store.toggleFavorite(id);
    renderPills();
    renderList();
    showToast(nowFav ? 'Added to favourites.' : 'Removed from favourites.');
  }

  /* =====================================================================
     Insert and copy
     ===================================================================== */

  /**
   * Insert into the page.
   *
   * Prompts with variables are handed to the content script rather than filled
   * in here, because only the page can see what the user highlighted. If the
   * tab has no content script (a chrome:// page, the web store, a PDF), fall
   * back to this popup's own form in copy mode.
   */
  /** A prompt with its {{@blocks}} expanded (Pro), exactly as it will be inserted. */
  function readyToUse(id) {
    const found = store.getById(id);
    if (!found) return null;
    return store.prepareForUse(found).prompt || found;
  }

  /**
   * True when the page received the text but chose the clipboard fallback
   * itself (the box refused the text). The page already told the user, so
   * the popup must not copy again or claim the page was unreachable.
   */
  function pageHandledIt(result) {
    return !!(result && result.response && result.response.handled);
  }

  async function insertPrompt(id) {
    const prompt = readyToUse(id);
    if (!prompt) return;

    const hasVars = template.variableCount(prompt) > 0;

    // Prompts with fields go to the page by id, so the page's own copy of the
    // store expands blocks and fills {{selection}} from what is highlighted.
    const payload = hasVars
      ? { action: 'insert_prompt', promptId: prompt.id }
      : { action: 'insert_prompt', text: prompt.template, promptId: prompt.id };

    const result = await relayToTab(payload);

    if (result.ok || pageHandledIt(result)) {
      window.close();
      return;
    }

    if (hasVars) {
      showToast('Cannot reach this page. Fill it in here and copy instead.');
      openModal(prompt, 'copy');
      return;
    }

    const copied = await copyText(prompt.template);
    showToast(copied ? 'Cannot reach this page. Copied instead.' : 'Cannot reach this page.');
  }

  function copyPrompt(id) {
    const prompt = readyToUse(id);
    if (!prompt) return;

    if (template.variableCount(prompt) > 0) {
      openModal(prompt, 'copy');
      return;
    }
    copyText(prompt.template).then((ok) => {
      if (ok) store.recordUse(prompt.id);
      showToast(ok ? 'Copied to clipboard.' : 'Could not copy.');
    });
  }

  /* =====================================================================
     Variable modal (copy path and unreachable-page fallback)
     ===================================================================== */

  let modalPrompt = null;
  let modalVariables = [];
  const modalCache = {};

  function bindModal() {
    el.modalClose.addEventListener('click', closeModal);
    el.modalCopy.addEventListener('click', () => finishModal('copy'));
    el.modalInsert.addEventListener('click', () => finishModal('insert'));
    el.modal.addEventListener('mousedown', (e) => {
      if (e.target === el.modal) closeModal();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (el.catModal && el.catModal.style.display === 'flex') {
          e.preventDefault();
          closePopupCategoryModal();
          return;
        }
        if (el.modal && el.modal.style.display === 'flex') {
          e.preventDefault();
          closeModal();
        }
      }
    });
  }

  /**
   * The popup has no page selection or URL to offer, so only date, time and
   * inline defaults resolve here. Badges reflect that instead of claiming a
   * selection auto-fill that never happens.
   */
  function openModal(prompt, mode) {
    modalPrompt = prompt;
    el.modalTitle.textContent = prompt.title;
    el.modalInsert.textContent = mode === 'insert' ? 'Insert into page' : 'Insert into page';

    const initial = template.buildInitialValues(
      prompt,
      { selection: '', url: '', title: '' },
      { allowClipboard: false, cached: modalCache[prompt.id] || {} }
    );
    modalVariables = initial.variables;

    el.modalFields.innerHTML = modalVariables
      .map((v, idx) => modalFieldHtml(v, initial.values[v.name] || '', initial.filledFrom[v.name], idx))
      .join('');

    el.modalFields.querySelectorAll('[data-var]').forEach((field) => {
      field.addEventListener('input', updateModalPreview);
      field.addEventListener('change', updateModalPreview);
      field.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
          e.preventDefault();
          finishModal(mode);
        }
      });
    });

    el.modalFields.querySelectorAll('[data-paste]').forEach((btn) => {
      btn.addEventListener('click', () => pasteIntoField(btn));
    });

    updateModalPreview();
    el.modal.style.display = 'flex';
    const first = el.modalFields.querySelector('[data-empty="true"]') || el.modalFields.querySelector('[data-var]');
    if (first) first.focus();
  }

  function modalFieldHtml(v, value, filledFrom, idx) {
    const badgeText = template.autofillBadge(filledFrom);
    const badge = badgeText ? '<span class="tag-badge badge-auto">' + escapeHtml(badgeText) + '</span>' : '';
    const id = 'popup-var-' + idx;
    const isEmpty = String(value || '').trim() === '';
    const placeholder = v.hint || 'Enter ' + v.label.toLowerCase();

    let control;
    if (v.type === 'select' && v.options.length) {
      control =
        '<select class="modal-var-input" id="' +
        id +
        '" data-var="' +
        escapeAttr(v.name) +
        '" data-empty="' +
        isEmpty +
        '">' +
        v.options
          .map(
            (o) =>
              '<option value="' + escapeAttr(o) + '"' + (o === value ? ' selected' : '') + '>' + escapeHtml(o) + '</option>'
          )
          .join('') +
        '</select>';
    } else if (v.type === 'textarea') {
      control =
        '<textarea class="modal-var-input" id="' +
        id +
        '" data-var="' +
        escapeAttr(v.name) +
        '" data-empty="' +
        isEmpty +
        '" rows="3" placeholder="' +
        escapeAttr(placeholder) +
        '">' +
        escapeHtml(value) +
        '</textarea>';
    } else {
      control =
        '<input type="text" class="modal-var-input" id="' +
        id +
        '" data-var="' +
        escapeAttr(v.name) +
        '" data-empty="' +
        isEmpty +
        '" value="' +
        escapeAttr(value) +
        '" placeholder="' +
        escapeAttr(placeholder) +
        '" />';
    }

    return (
      '<div class="form-group">' +
      '<label for="' +
      id +
      '" class="modal-field-label">' +
      '<span>' +
      escapeHtml(v.label) +
      '</span>' +
      '<span class="modal-field-label-right">' +
      badge +
      '<button type="button" class="btn-tiny" data-paste="' +
      escapeAttr(v.name) +
      '" title="Paste from your clipboard">Paste</button>' +
      '</span>' +
      '</label>' +
      control +
      '</div>'
    );
  }

  function pasteIntoField(btn) {
    const name = btn.getAttribute('data-paste');
    const field = el.modalFields.querySelector('[data-var="' + cssEscape(name) + '"]');
    if (!field) return;
    const restore = btn.textContent;

    if (!navigator.clipboard || !navigator.clipboard.readText) {
      btn.textContent = 'Ctrl+V';
      field.focus();
      setTimeout(() => {
        btn.textContent = restore;
      }, 1600);
      return;
    }

    navigator.clipboard
      .readText()
      .then((text) => {
        if (text) {
          field.value = text;
          field.setAttribute('data-empty', 'false');
          updateModalPreview();
          btn.textContent = 'Pasted';
        } else {
          btn.textContent = 'Empty';
        }
        setTimeout(() => {
          btn.textContent = restore;
        }, 1400);
      })
      .catch(() => {
        btn.textContent = 'Ctrl+V';
        field.focus();
        setTimeout(() => {
          btn.textContent = restore;
        }, 1600);
      });
  }

  function readModalValues() {
    const values = {};
    el.modalFields.querySelectorAll('[data-var]').forEach((f) => {
      values[f.getAttribute('data-var')] = f.value;
    });
    return values;
  }

  function updateModalPreview() {
    if (!modalPrompt) return;
    const values = readModalValues();
    modalCache[modalPrompt.id] = values;

    const result = template.render(modalPrompt.template, values, { withMeta: true });
    el.modalPreview.textContent = result.text;

    if (result.missing.length) {
      el.modalWarning.textContent =
        result.missing.length +
        ' field' +
        (result.missing.length === 1 ? '' : 's') +
        ' still empty. They will show as placeholders.';
      el.modalWarning.style.display = 'block';
    } else {
      el.modalWarning.style.display = 'none';
    }
  }

  async function finishModal(mode) {
    if (!modalPrompt) return;
    const values = readModalValues();
    modalCache[modalPrompt.id] = values;
    const text = template.render(modalPrompt.template, values);
    const id = modalPrompt.id;

    if (mode === 'insert') {
      // The page records the use itself once the text has landed.
      const result = await relayToTab({ action: 'insert_prompt', text, promptId: id });
      if (result.ok || pageHandledIt(result)) {
        closeModal();
        window.close();
        return;
      }
      const copied = await copyText(text);
      showToast(copied ? 'Cannot reach this page. Copied instead.' : 'Cannot reach this page.');
      closeModal();
      return;
    }

    const copied = await copyText(text);
    if (copied) store.recordUse(id);
    showToast(copied ? 'Copied to clipboard.' : 'Could not copy.');
    closeModal();
  }

  function closeModal() {
    el.modal.style.display = 'none';
    modalPrompt = null;
    modalVariables = [];
  }

  /* =====================================================================
     Modifiers
     ===================================================================== */

  function renderModifiers() {
    el.modifiersList.innerHTML = modifiers
      .getAll()
      .map(
        (m) =>
          '<div class="modifier-card" data-mod-id="' +
          escapeAttr(m.id) +
          '" role="button" tabindex="0">' +
          '<div class="modifier-card-header"><span>' +
          m.icon +
          '</span><span>' +
          escapeHtml(m.shortTitle || m.title) +
          '</span></div>' +
          '<div class="modifier-card-desc">' +
          escapeHtml(m.description) +
          '</div>' +
          '</div>'
      )
      .join('');

    el.modifiersList.querySelectorAll('.modifier-card').forEach((card) => {
      const run = () => applyModifier(card.getAttribute('data-mod-id'));
      card.addEventListener('click', run);
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          run();
        }
      });
    });
  }

  async function applyModifier(id) {
    const result = await relayToTab({ action: 'apply_modifier', modifierId: id });
    if (result.ok) {
      window.close();
      return;
    }
    showToast('Cannot reach this page. Open a chat or web page and try again.');
  }

  /* =====================================================================
     Create and edit
     ===================================================================== */

  function renderCategoryOptions(selected) {
    const cats = store.getCategories();
    if (cats.indexOf('Custom') === -1) cats.push('Custom');
    const pick = selected || 'Custom';
    el.fCategory.innerHTML = cats
      .map((c) => {
        const meta = store.getCategoryMeta(c);
        const iconPrefix = meta && meta.icon ? meta.icon + ' ' : '';
        return (
          '<option value="' +
          escapeAttr(c) +
          '"' +
          (c === pick ? ' selected' : '') +
          '>' +
          iconPrefix +
          escapeHtml(c) +
          '</option>'
        );
      })
      .join('');
  }

  /* =====================================================================
     Category modal with Emoji Icon Pack
     ===================================================================== */

  let selectedCategoryEmoji = '🏷️';
  let activeEmojiTab = 0;

  function openPopupCategoryModal() {
    selectedCategoryEmoji = '🏷️';
    activeEmojiTab = 0;
    el.catModalName.value = '';
    el.catModalError.textContent = '';
    el.catModalTitle.textContent = 'New Category';
    el.catModalPreview.textContent = selectedCategoryEmoji;
    el.catModalCustomEmoji.value = '';
    renderPopupEmojiPicker();
    el.catModal.style.display = 'flex';
    setTimeout(() => el.catModalName.focus(), 50);
  }

  function closePopupCategoryModal() {
    el.catModal.style.display = 'none';
  }

  function renderPopupEmojiPicker() {
    const pack = store.EMOJI_PACK || [];
    if (!pack.length) return;

    el.catModalEmojiTabs.innerHTML = pack
      .map((group, idx) => {
        return (
          '<button type="button" class="emoji-tab-btn' +
          (idx === activeEmojiTab ? ' active' : '') +
          '" data-idx="' +
          idx +
          '">' +
          group.icon +
          ' ' +
          escapeHtml(group.group.split('&')[0].trim()) +
          '</button>'
        );
      })
      .join('');

    el.catModalEmojiTabs.querySelectorAll('.emoji-tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        activeEmojiTab = parseInt(btn.getAttribute('data-idx'), 10) || 0;
        renderPopupEmojiPicker();
      });
    });

    const currentGroup = pack[activeEmojiTab] || pack[0];
    el.catModalEmojiGrid.innerHTML = (currentGroup.emojis || [])
      .map((emoji) => {
        return (
          '<button type="button" class="emoji-btn' +
          (emoji === selectedCategoryEmoji ? ' selected' : '') +
          '" data-emoji="' +
          escapeAttr(emoji) +
          '">' +
          emoji +
          '</button>'
        );
      })
      .join('');

    el.catModalEmojiGrid.querySelectorAll('.emoji-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        selectedCategoryEmoji = btn.getAttribute('data-emoji');
        el.catModalPreview.textContent = selectedCategoryEmoji;
        el.catModalCustomEmoji.value = '';
        el.catModalEmojiGrid.querySelectorAll('.emoji-btn').forEach((b) => b.classList.remove('selected'));
        btn.classList.add('selected');
      });
    });
  }

  function bindCategoryModal() {
    el.addCategoryBtn.addEventListener('click', () => {
      openPopupCategoryModal();
    });

    el.catModalClose.addEventListener('click', closePopupCategoryModal);
    el.catModalCancel.addEventListener('click', closePopupCategoryModal);

    el.catModal.addEventListener('click', (e) => {
      if (e.target === el.catModal) closePopupCategoryModal();
    });

    el.catModalCustomEmoji.addEventListener('input', () => {
      const val = el.catModalCustomEmoji.value.trim();
      if (val) {
        selectedCategoryEmoji = val;
        el.catModalPreview.textContent = val;
        el.catModalEmojiGrid.querySelectorAll('.emoji-btn').forEach((b) => b.classList.remove('selected'));
      }
    });

    el.catModalSave.addEventListener('click', async () => {
      const name = el.catModalName.value.trim();
      if (!name) {
        el.catModalError.textContent = 'Please enter a category name.';
        el.catModalName.focus();
        return;
      }

      const cat = await store.createCategory(name, selectedCategoryEmoji);
      if (!cat) {
        el.catModalError.textContent = 'A category with that name already exists.';
        return;
      }

      closePopupCategoryModal();
      renderPills();
      renderCategoryOptions(cat.name);
      showToast('Category "' + cat.name + '" created.');
    });
  }

  function bindForm() {
    el.fShortcut.addEventListener('input', updateShortcutPreview);
    el.fTemplate.addEventListener('input', updateVariableSummary);
    updateShortcutPreview();
    updateVariableSummary();

    document.querySelectorAll('.token-chips-bar .token-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        insertAtCursor(el.fTemplate, chip.getAttribute('data-insert'));
        updateVariableSummary();
      });
    });

    el.cancelBtn.addEventListener('click', () => {
      resetForm();
      selectTab('tab-prompts');
    });

    el.fullEditorBtn.addEventListener('click', () => {
      const params = new URLSearchParams();
      const id = el.fId.value.trim();
      if (id) params.set('edit', id);
      else params.set('create', '1');
      if (el.fTitle.value.trim()) params.set('title', el.fTitle.value.trim());
      if (el.fCategory.value) params.set('category', el.fCategory.value);
      if (el.fShortcut.value.trim()) params.set('shortcut', el.fShortcut.value.trim());
      if (el.fTags.value.trim()) params.set('tags', el.fTags.value.trim());
      if (el.fDescription.value.trim()) params.set('description', el.fDescription.value.trim());
      if (el.fTemplate.value.trim()) params.set('template', el.fTemplate.value.trim());
      chrome.tabs.create({ url: chrome.runtime.getURL('options/options.html?' + params.toString()) });
      window.close();
    });

    el.form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const draft = {
        title: el.fTitle.value.trim(),
        category: el.fCategory.value,
        shortcut: el.fShortcut.value.trim(),
        tags: el.fTags.value,
        description: el.fDescription.value.trim(),
        template: el.fTemplate.value
      };

      const id = el.fId.value.trim();
      if (id) draft.id = id;

      const clash = findShortcutClash(draft.shortcut, id);
      if (clash) {
        showToast('Shortcut ' + settings.slashTriggerChar + draft.shortcut + ' is already used by "' + clash.title + '".');
        el.fShortcut.focus();
        return;
      }

      try {
        const saved = await store.savePrompt(draft);
        resetForm();
        renderPills();
        renderList();
        selectTab('tab-prompts');
        showToast(id ? 'Prompt updated.' : 'Prompt saved.' + (saved && saved.shortcut ? ' Try ' + settings.slashTriggerChar + saved.shortcut : ''));
      } catch (err) {
        if (err && err.code === 'LIMIT_REACHED') {
          showToast('Free limit reached (25 prompts). Upgrade to Pro for unlimited prompts.');
          if (el.limitBanner) el.limitBanner.hidden = false;
          return;
        }
        showToast('Error saving prompt: ' + (err ? err.message : 'Unknown error'));
      }
    });
  }

  /** Two prompts sharing a shortcut makes the slash menu ambiguous. */
  function findShortcutClash(shortcut, ignoreId) {
    const clean = String(shortcut || '').trim().toLowerCase().replace(/^\/+/, '');
    if (!clean) return null;
    const hits = store.getAll().filter((p) => p.shortcut === clean && p.id !== ignoreId);
    return hits.length ? hits[0] : null;
  }

  function updateShortcutPreview() {
    const value = el.fShortcut.value.trim().toLowerCase().replace(/^\/+/, '');
    const prefix = settings.slashTriggerChar || '//';
    el.shortcutPreview.textContent = value ? prefix + value : prefix + 'shortcut';
  }

  function updateVariableSummary() {
    const vars = template.parseVariables(el.fTemplate.value);
    if (!vars.length) {
      el.variableSummary.textContent = 'No placeholders yet. This prompt will insert as-is.';
      return;
    }
    el.variableSummary.textContent =
      'You will be asked for: ' + vars.map((v) => v.label).join(', ') + '.';
  }

  function editPrompt(id) {
    const p = store.getById(id);
    if (!p) return;

    el.fId.value = p.id;
    el.fTitle.value = p.title || '';
    renderCategoryOptions(p.category);
    el.fShortcut.value = p.shortcut || '';
    el.fTags.value = (p.tags || []).join(', ');
    el.fDescription.value = p.description || '';
    el.fTemplate.value = p.template || '';

    el.formHeading.textContent = store.isBuiltin(p.id) ? 'Edit built-in prompt' : 'Edit prompt';
    el.saveBtn.textContent = 'Save changes';
    el.cancelBtn.style.display = '';

    updateShortcutPreview();
    updateVariableSummary();
    selectTab('tab-new');
  }

  function resetForm() {
    el.form.reset();
    el.fId.value = '';
    renderCategoryOptions();
    el.formHeading.textContent = 'Create a prompt';
    el.saveBtn.textContent = 'Save prompt';
    el.cancelBtn.style.display = 'none';
    updateShortcutPreview();
    updateVariableSummary();
  }

  function insertAtCursor(field, text) {
    const start = field.selectionStart || 0;
    const end = field.selectionEnd || 0;
    const value = field.value;
    field.value = value.slice(0, start) + text + value.slice(end);
    field.focus();
    const caret = start + text.length;
    field.setSelectionRange(caret, caret);
  }

  /* =====================================================================
     Data tab
     ===================================================================== */

  function paintSettings() {
    el.siteHost.textContent = activeHost || 'No page detected';
    el.siteDisabled.checked = activeHost ? store.isSiteDisabled(activeHost) : false;
    el.siteDisabled.disabled = !activeHost;
  }

  function bindDataTab() {
    el.siteDisabled.addEventListener('change', async () => {
      if (!activeHost) return;
      await store.setSiteDisabled(activeHost, el.siteDisabled.checked);
      broadcastSettings();
      showToast(el.siteDisabled.checked ? 'Off on ' + activeHost + '.' : 'On again on ' + activeHost + '.');
    });

    document.getElementById('btn-export-json').addEventListener('click', exportLibrary);

    const fileInput = document.getElementById('import-file-input');
    fileInput.setAttribute('accept', importers.ACCEPT);
    fileInput.addEventListener('change', handleImportFile);

    document.getElementById('btn-reset-defaults').addEventListener('click', restoreDefaults);
  }

  function exportLibrary() {
    const bundle = store.exportBundle({ includeLibrary: false });
    const json = JSON.stringify(bundle, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'omniprompt-backup-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Revoking immediately can cancel the download in some builds.
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    showToast('Exported ' + bundle.counts.prompts + ' prompt' + (bundle.counts.prompts === 1 ? '' : 's') + '.');
  }

  function handleImportFile(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const result = await store.importBundle(String(ev.target.result || ''), { mode: 'merge' });
      e.target.value = '';

      if (!result.ok) {
        showToast(result.error || 'Could not read that file.');
        return;
      }
      renderPills();
      renderList();
      const parts = [];
      parts.push('Added ' + result.added);
      if (result.skipped) parts.push(result.skipped + ' already there');
      showToast(parts.join(', ') + '.');
    };
    reader.onerror = () => {
      e.target.value = '';
      showToast('Could not read that file.');
    };
    reader.readAsText(file);
  }

  async function restoreDefaults() {
    const mine = store.getAll().filter((p) => p.isCustom).length;
    const message =
      'Restore the built-in library?\n\n' +
      'This undoes your edits to built-in prompts and brings back any you deleted.\n' +
      'Your own ' +
      mine +
      ' prompt' +
      (mine === 1 ? '' : 's') +
      ', custom categories and favourites are not affected.';

    if (!window.confirm(message)) return;

    const result = await store.restoreDefaultLibrary();
    renderPills();
    renderList();
    showToast('Library restored. ' + result.promptsRestored + ' brought back, ' + result.patchesCleared + ' edit(s) undone.');
  }

  /* =====================================================================
     Plumbing
     ===================================================================== */

  /**
   * Talk to the page through the service worker, which handles a missing
   * content script by injecting and retrying.
   */
  function relayToTab(payload) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'relay_to_active_tab', payload }, (response) => {
        if (chrome.runtime.lastError || !response) {
          resolve({ ok: false, reason: 'no-response' });
          return;
        }
        resolve(response);
      });
    });
  }

  function broadcastSettings() {
    chrome.runtime.sendMessage({ action: 'broadcast_settings' }, () => void chrome.runtime.lastError);
  }

  function getActiveHost() {
    return new Promise((resolve) => {
      if (typeof chrome === 'undefined' || !chrome.tabs || !chrome.tabs.query) {
        return resolve('');
      }
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        void chrome.runtime.lastError;
        const tab = tabs && tabs[0];
        if (!tab || !tab.url) return resolve('');
        try {
          const url = new URL(tab.url);
          resolve(url.protocol === 'http:' || url.protocol === 'https:' ? url.hostname : '');
        } catch (e) {
          resolve('');
        }
      });
    });
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(
        () => true,
        () => false
      );
    }
    return Promise.resolve(false);
  }

  function updateFooter(shown) {
    const total = store.getAll().length;
    const mine = store.getAll().filter((p) => p.isCustom).length;
    if (typeof shown === 'number' && shown !== total) {
      el.count.textContent = shown + ' of ' + total + ' prompts';
    } else {
      el.count.textContent = total + ' prompts' + (mine ? ' · ' + mine + ' yours' : '');
    }

    const hk = settings.paletteHotkey.display;
    el.hotkeyHint.innerHTML = settings.slashEnabled
      ? 'Type <kbd>' + escapeHtml(settings.slashTriggerChar) + '</kbd> or press <kbd>' + escapeHtml(hk) + '</kbd>'
      : 'Press <kbd>' + escapeHtml(hk) + '</kbd> in any chat';

    if (el.exportDesc) {
      el.exportDesc.textContent =
        mine === 0
          ? 'You have no prompts of your own yet.'
          : 'Your ' + mine + ' prompt' + (mine === 1 ? '' : 's') + ', plus custom categories and favourites.';
    }
  }

  let toastTimer = null;

  function showToast(message) {
    el.toast.textContent = message;
    el.toast.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.toast.classList.remove('show'), 2600);
  }

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escapeAttr(str) {
    return escapeHtml(str);
  }

  function cssEscape(str) {
    return String(str).replace(/["\\]/g, '\\$&');
  }
});
