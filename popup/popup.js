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

  // Shortcut labels use the Mac key symbols on a Mac (Alt+K reads ⌥K).
  const hotkeyLabel = (hk) => store.formatHotkey(hk, store.isMacPlatform());

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
    fTitleError: document.getElementById('new-title-error'),
    fCategory: document.getElementById('new-category'),
    addCategoryBtn: document.getElementById('btn-popup-add-category'),
    fShortcut: document.getElementById('new-shortcut'),
    fShortcutError: document.getElementById('new-shortcut-error'),
    fTags: document.getElementById('new-tags'),
    fDescription: document.getElementById('new-description'),
    fTemplate: document.getElementById('new-template'),
    fTemplateError: document.getElementById('new-template-error'),
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
    usageMeter: document.getElementById('popup-usage-meter'),
    usageLabel: document.getElementById('popup-usage-label'),
    usageFill: document.getElementById('popup-usage-fill'),
    usageTrack: document.getElementById('popup-usage-track'),
    bannerUpgradeBtn: document.getElementById('btn-popup-banner-upgrade'),

    reviewCard: document.getElementById('review-card'),
    reviewYes: document.getElementById('btn-review-yes'),
    reviewNo: document.getElementById('btn-review-no'),

    workspaceBar: document.getElementById('workspace-bar'),
    workspaceSelect: document.getElementById('workspace-select'),
    workspaceClearBtn: document.getElementById('workspace-clear-btn'),

    searchBox: document.querySelector('.search-box'),
    quickStart: document.getElementById('quick-start'),
    quickStartDismiss: document.getElementById('btn-quick-start-dismiss'),
    quickStartTrigger: document.getElementById('quick-start-trigger'),
    quickStartHotkey: document.getElementById('quick-start-hotkey'),
    moreOpenSettings: document.getElementById('btn-more-open-settings'),

    sitePermBanner: document.getElementById('site-permission-banner'),
    sitePermDomain: document.getElementById('site-perm-domain'),
    btnEnableThisSite: document.getElementById('btn-enable-this-site'),
    btnEnableEverywhere: document.getElementById('btn-enable-everywhere')
  };

  // Small inline icons. One stroke weight, drawn by .ico in base.css.
  const ICONS = {
    star: '<svg class="ico ico-sm" viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3.2 2.7 5.5 6 .9-4.4 4.2 1 6-5.3-2.8-5.4 2.8 1-6-4.3-4.2 6-.9z"></path></svg>',
    edit: '<svg class="ico ico-sm" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h8.5"></path><path d="M16.4 3.6a2.1 2.1 0 0 1 3 3L7.2 18.8 3.5 19.7l.9-3.7Z"></path></svg>',
    copy: '<svg class="ico ico-sm" viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="11.5" height="11.5" rx="2.2"></rect><path d="M15 9V5.7A2.2 2.2 0 0 0 12.8 3.5H5.7a2.2 2.2 0 0 0-2.2 2.2v7.1A2.2 2.2 0 0 0 5.7 15H9"></path></svg>',
    insert: '<svg class="ico ico-sm" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 10.5 4.5 15 9 19.5"></path><path d="M19.5 4.5v6a4.5 4.5 0 0 1-4.5 4.5H4.5"></path></svg>',
    search: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.6-3.6"></path></svg>',
    star24: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3.2 2.7 5.5 6 .9-4.4 4.2 1 6-5.3-2.8-5.4 2.8 1-6-4.3-4.2 6-.9z"></path></svg>',
    folder: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 7.5a2 2 0 0 1 2-2h3.7l2 2.2h7.3a2 2 0 0 1 2 2v7.8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2Z"></path></svg>'
  };

  // The row the keyboard points at. Enter inserts it; -1 means "the first".
  let activeIndex = -1;

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
    checkSiteCoverage();
    renderPills();
    renderCategoryOptions();
    renderList();
    renderModifiers();
    updateFooter();
    updateTierBadge();
    renderWorkspaceBar();

    bindTabs();
    bindWorkspaceBar();
    bindSearch();
    bindCategoryNav();
    bindForm();
    bindCategoryModal();
    bindDataTab();
    bindModal();
    bindHeader();
    bindReviewCard();
    bindQuickStart();
    bindSitePermissionBanner();

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
      renderWorkspaceBar();
      checkSiteCoverage();
    });
  }

  /* =====================================================================
     Quick start
     ===================================================================== */

  /**
   * First-time users see the three ways in, in their own trigger and hotkey.
   * The card leaves by itself after the first prompt is used, or on "Got it".
   */
  function paintQuickStart() {
    if (!el.quickStart) return;
    const used = store.getTotalUses ? store.getTotalUses() : 0;
    const show = !settings.quickStartDismissed && used === 0 && !searchQuery && currentCategory === 'All';
    el.quickStart.hidden = !show;
    if (!show) return;
    if (el.quickStartTrigger) el.quickStartTrigger.textContent = settings.slashEnabled ? settings.slashTriggerChar : 'Off';
    if (el.quickStartHotkey) el.quickStartHotkey.textContent = hotkeyLabel(settings.paletteHotkey);
  }

  function bindQuickStart() {
    if (!el.quickStartDismiss) return;
    el.quickStartDismiss.addEventListener('click', async () => {
      el.quickStart.hidden = true;
      await store.setSetting('quickStartDismissed', true);
      settings = store.getSettings();
      el.search.focus();
    });
  }

  /* =====================================================================
     Client workspace switcher (Pro)
     ===================================================================== */

  /** Shown to Pro users who have workspaces, and to Free users with existing workspaces. */
  function renderWorkspaceBar() {
    if (!el.workspaceBar || !el.workspaceSelect) return;
    const allWorkspaces = store.getWorkspaces ? store.getWorkspaces() : [];
    const isPro = store.isPro && store.isPro();
    const list = isPro ? allWorkspaces : [];

    // If Free user has existing workspaces, keep them visible so they see their data is safe
    if (!isPro && allWorkspaces.length > 0) {
      el.workspaceBar.hidden = false;
      el.workspaceBar.classList.remove('has-active');
      if (el.workspaceClearBtn) el.workspaceClearBtn.hidden = true;
      el.workspaceSelect.innerHTML =
        '<option value="">No workspace (Pro to activate)</option>' +
        allWorkspaces
          .map((w) => '<option value="' + escapeAttr(w.id) + '">' + escapeHtml(w.name) + ' (Pro)</option>')
          .join('');
      return;
    }

    el.workspaceBar.hidden = list.length === 0;
    if (!list.length) return;
    const active = store.getActiveWorkspace();
    const activeId = active ? active.id : '';

    if (activeId) {
      el.workspaceBar.classList.add('has-active');
      if (el.workspaceClearBtn) el.workspaceClearBtn.hidden = false;
    } else {
      el.workspaceBar.classList.remove('has-active');
      if (el.workspaceClearBtn) el.workspaceClearBtn.hidden = true;
    }

    el.workspaceSelect.innerHTML =
      '<option value="">None</option>' +
      list
        .map(
          (w) =>
            '<option value="' +
            escapeAttr(w.id) +
            '"' +
            (w.id === activeId ? ' selected' : '') +
            '>' +
            escapeHtml(w.name) +
            '</option>'
        )
        .join('');
  }

  function bindWorkspaceBar() {
    if (!el.workspaceSelect) return;
    el.workspaceSelect.addEventListener('change', async () => {
      if (!store.isPro()) {
        chrome.tabs.create({ url: chrome.runtime.getURL('options/options.html?upgrade=workspaces') });
        window.close();
        return;
      }
      try {
        await store.setActiveWorkspace(el.workspaceSelect.value);
        renderWorkspaceBar();
        const ws = store.getActiveWorkspace();
        showToast(ws ? 'Workspace: ' + ws.name + '.' : 'No workspace. Fields fill as usual.');
      } catch (err) {
        showToast((err && err.message) || 'Could not switch workspace.');
      }
    });

    if (el.workspaceClearBtn) {
      el.workspaceClearBtn.addEventListener('click', async () => {
        try {
          await store.setActiveWorkspace('');
          renderWorkspaceBar();
          showToast('No workspace. Fields fill as usual.');
        } catch (err) {
          showToast((err && err.message) || 'Could not switch off workspace.');
        }
      });
    }
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
      el.tierBadge.textContent = 'Pro';
      el.tierBadge.title = 'OmniPrompt Pro is active';
      el.tierBadge.className = 'popup-tier-badge is-pro';
      if (el.limitBanner) el.limitBanner.style.display = 'none';
      if (el.usageMeter) el.usageMeter.hidden = true;
    } else {
      const count = store.getCustomCount ? store.getCustomCount() : 0;
      const limit = store.getFreeLimit ? store.getFreeLimit() : 20;
      const price = store.getProInfo().price;
      // A plan status, not an ad: it says where you are and opens the plan page.
      el.tierBadge.textContent = 'Free';
      el.tierBadge.title = 'Free plan: ' + count + ' of ' + limit + ' prompts of your own. Pro is ' + price + ' once.';
      el.tierBadge.className = 'popup-tier-badge';
      if (el.limitBanner) {
        el.limitBanner.style.display = store.isLimitReached && store.isLimitReached() ? 'flex' : 'none';
      }
      if (el.bannerUpgradeBtn) el.bannerUpgradeBtn.textContent = 'Get Pro · ' + price;
      const bannerTitle = document.getElementById('popup-limit-title');
      if (bannerTitle) bannerTitle.textContent = Math.min(count, limit) + ' of ' + limit + ' prompts saved';
      paintUsageMeter(count, limit);
    }
  }

  /** The Free allowance as a bar on the + New tab, so the limit is never a surprise. */
  function paintUsageMeter(count, limit) {
    if (!el.usageMeter) return;
    const used = Math.min(count, limit);
    const pct = limit > 0 ? Math.round((used / limit) * 100) : 100;
    el.usageMeter.hidden = false;
    el.usageMeter.classList.toggle('is-near', pct >= 80);
    if (el.usageLabel) el.usageLabel.textContent = used + ' of ' + limit + ' of your own prompts';
    if (el.usageFill) el.usageFill.style.width = pct + '%';
    if (el.usageTrack) {
      el.usageTrack.setAttribute('aria-valuemax', String(limit));
      el.usageTrack.setAttribute('aria-valuenow', String(used));
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
    // The plan chip opens the plan page, which compares Free and Pro and
    // holds the licence box. The limit banner opens the paywall for its reason.
    if (el.tierBadge) {
      el.tierBadge.addEventListener('click', () => {
        chrome.tabs.create({ url: chrome.runtime.getURL('options/options.html?view=plan') });
        window.close();
      });
    }
    if (el.moreOpenSettings) {
      el.moreOpenSettings.addEventListener('click', () => {
        chrome.tabs.create({ url: chrome.runtime.getURL('options/options.html?view=settings') });
        window.close();
      });
    }
    if (el.bannerUpgradeBtn) {
      el.bannerUpgradeBtn.addEventListener('click', () => {
        chrome.tabs.create({ url: chrome.runtime.getURL('options/options.html?upgrade=limit') });
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

  let formInitialSnapshot = null;

  function getFormSnapshot() {
    return JSON.stringify({
      id: (el.fId && el.fId.value) || '',
      title: (el.fTitle && el.fTitle.value) || '',
      category: (el.fCategory && el.fCategory.value) || '',
      shortcut: (el.fShortcut && el.fShortcut.value) || '',
      tags: (el.fTags && el.fTags.value) || '',
      description: (el.fDescription && el.fDescription.value) || '',
      template: (el.fTemplate && el.fTemplate.value) || ''
    });
  }

  function isFormDirty() {
    const pane = document.getElementById('tab-new');
    if (!pane || !pane.classList.contains('active')) return false;
    if (!formInitialSnapshot) return false;
    return getFormSnapshot() !== formInitialSnapshot;
  }

  function clearFormErrors() {
    if (el.fTitleError) el.fTitleError.textContent = '';
    if (el.fTemplateError) el.fTemplateError.textContent = '';
    if (el.fShortcutError) el.fShortcutError.textContent = '';
    if (el.fTitle) {
      el.fTitle.removeAttribute('aria-invalid');
      const g = el.fTitle.closest('.form-group');
      if (g) g.classList.remove('has-error');
    }
    if (el.fTemplate) {
      el.fTemplate.removeAttribute('aria-invalid');
      const g = el.fTemplate.closest('.form-group');
      if (g) g.classList.remove('has-error');
    }
    if (el.fShortcut) {
      el.fShortcut.removeAttribute('aria-invalid');
      const g = el.fShortcut.closest('.form-group');
      if (g) g.classList.remove('has-error');
    }
  }

  function bindTabs() {
    el.tabs.forEach((btn) => {
      btn.addEventListener('click', () => selectTab(btn.getAttribute('data-tab')));
    });
  }

  function selectTab(tabId) {
    if (tabId !== 'tab-new' && isFormDirty()) {
      if (!window.confirm('Discard unsaved changes to this prompt?')) return;
      formInitialSnapshot = null;
      resetForm();
    }
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
      formInitialSnapshot = getFormSnapshot();
      clearFormErrors();
      el.fTitle.focus();
    }
  }

  function paintSearchState() {
    el.clearSearch.hidden = !searchQuery;
    if (el.searchBox) el.searchBox.classList.toggle('has-query', !!searchQuery);
  }

  function bindSearch() {
    el.search.addEventListener('input', () => {
      searchQuery = el.search.value.trim();
      paintSearchState();
      if (!el.panes[0].classList.contains('active')) selectTab('tab-prompts');
      renderList();
    });

    // The popup is a launcher: type, arrow to the row, Enter to insert it.
    // Shift+Enter copies instead. The row the keyboard is on shows its text.
    el.search.addEventListener('keydown', (e) => {
      if (isImeKey(e)) return;
      const rows = navRows();
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        if (!rows.length) return;
        e.preventDefault();
        const step = e.key === 'ArrowDown' ? 1 : -1;
        const from = activeIndex < 0 ? (step > 0 ? -1 : 0) : activeIndex;
        setActive(Math.max(0, Math.min(rows.length - 1, from + step)), true);
        return;
      }
      if (e.key === 'Enter') {
        const row = rows[activeIndex >= 0 ? activeIndex : 0];
        if (!row) return;
        e.preventDefault();
        activateRow(row, e.shiftKey);
        return;
      }
      if (e.key === 'Escape' && searchQuery) {
        // First Escape clears the search; the next one closes the popup.
        e.preventDefault();
        clearSearch();
      }
    });

    el.clearSearch.addEventListener('click', clearSearch);
  }

  function clearSearch() {
    el.search.value = '';
    searchQuery = '';
    paintSearchState();
    el.search.focus();
    renderList();
  }

  function navRows() {
    return Array.from(el.list.querySelectorAll('.prompt-card'));
  }

  /** Point the keyboard at a row: highlight it, reveal its text, keep it in view. */
  function setActive(index, scroll) {
    const rows = navRows();
    activeIndex = index;
    rows.forEach((row, i) => {
      const on = i === index;
      row.classList.toggle('is-active', on);
      row.setAttribute('aria-selected', String(on));
      if (on && scroll) row.scrollIntoView({ block: 'nearest' });
    });
    const current = rows[index];
    if (current && current.id) el.search.setAttribute('aria-activedescendant', current.id);
    else el.search.removeAttribute('aria-activedescendant');
  }

  function activateRow(row, copyInstead) {
    const chainId = row.getAttribute('data-chain');
    if (chainId) return runChain(chainId);
    const id = row.getAttribute('data-id');
    if (!id) return;
    if (copyInstead) return copyPrompt(id);
    return insertPrompt(id);
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
      '" title="Your favourites" aria-label="Favourites">★' +
      (favCount ? ' <span class="pill-count">' + favCount + '</span>' : '') +
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

  /** Pro chains that match the search, shown above the prompts in "All". */
  function chainCardsHtml() {
    if (currentCategory !== 'All' || !store.searchChains) return '';
    const chains = store.searchChains({ query: searchQuery, limit: 5 });
    if (!chains.length) return '';
    const prefix = settings.slashEnabled ? settings.slashTriggerChar : '';
    return (
      '<div class="list-section-label">Chains</div>' +
      chains
        .map(
          (c) =>
            '<div class="prompt-card chain-card" role="option" aria-selected="false" data-chain="' +
            escapeAttr(c.id) +
            '">' +
            '<span class="row-icon" aria-hidden="true">⛓</span>' +
            '<div class="row-main">' +
            '<div class="row-top"><span class="prompt-card-title">' +
            escapeHtml(c.title) +
            '</span></div>' +
            '<div class="prompt-card-desc">' +
            escapeHtml(c.description || 'Inserts step 1, then waits for you to ask for the next.') +
            '</div>' +
            '<div class="prompt-card-tags"><span class="tag-badge">' +
            c.steps.length +
            ' steps</span></div>' +
            '</div>' +
            '<div class="row-side">' +
            (c.shortcut && prefix ? '<span class="prompt-card-shortcut">' + escapeHtml(prefix + c.shortcut) + '</span>' : '') +
            '</div>' +
            '<div class="prompt-card-actions"><button type="button" class="btn-action btn-action-primary" data-act="run-chain" title="Start this chain in the page">' +
            ICONS.insert +
            'Run</button></div>' +
            '</div>'
        )
        .join('')
    );
  }

  function bindChainCards() {
    el.list.querySelectorAll('.chain-card').forEach((card) => {
      const id = card.getAttribute('data-chain');
      card.addEventListener('click', (e) => {
        e.stopPropagation();
        runChain(id);
      });
    });
  }

  /** Start a chain in the page. The page asks for fields and inserts step 1. */
  async function runChain(id) {
    if (!store.isPro()) {
      chrome.tabs.create({ url: chrome.runtime.getURL('options/options.html?upgrade=chains') });
      window.close();
      return;
    }
    const result = await relayToTab({ action: 'start_chain', chainId: id });
    if (result.ok) {
      window.close();
      return;
    }
    showToast('Cannot reach this page. Chains run in a page with a text box.');
  }

  function renderList() {
    const results = currentResults();
    const chainsHtml = chainCardsHtml();
    paintQuickStart();

    if (!results.length && chainsHtml) {
      el.list.innerHTML = chainsHtml;
      finishList(0);
      return;
    }

    if (!results.length) {
      el.list.innerHTML = emptyStateHtml();
      const create = el.list.querySelector('[data-act="create-from-search"]');
      if (create) {
        create.addEventListener('click', () => {
          resetForm();
          el.fTitle.value = searchQuery.charAt(0).toUpperCase() + searchQuery.slice(1);
          selectTab('tab-new');
          el.fTemplate.focus();
        });
      }
      activeIndex = -1;
      updateFooter(0);
      return;
    }

    let html = '';

    // Recents get their own strip when the user is just browsing.
    if (!searchQuery && currentCategory === 'All') {
      const recents = store.getRecent(3);
      if (recents.length) {
        html += chainsHtml;
        html += '<div class="list-section-label">Recent</div>';
        html += recents.map(cardHtml).join('');
        html += '<div class="list-section-label">All prompts</div>';
        const recentIds = {};
        recents.forEach((r) => {
          recentIds[r.id] = true;
        });
        html += results.filter((p) => !recentIds[p.id]).map(cardHtml).join('');
        el.list.innerHTML = html;
        finishList(results.length);
        return;
      }
    }

    el.list.innerHTML =
      chainsHtml + (chainsHtml ? '<div class="list-section-label">Prompts</div>' : '') + results.map(cardHtml).join('');
    finishList(results.length);
  }

  /** Number the rows for the keyboard, bind them, and point at the top hit while searching. */
  function finishList(count) {
    navRows().forEach((row, i) => {
      row.id = 'prow-' + i;
    });
    bindCards();
    bindChainCards();
    setActive(searchQuery ? 0 : -1, false);
    updateFooter(count);
  }

  function emptyStateHtml() {
    if (searchQuery) {
      return (
        '<div class="empty-state">' +
        '<span class="empty-icon">' + ICONS.search + '</span>' +
        '<div>Nothing matches <strong>' + escapeHtml(searchQuery) + '</strong>' +
        (currentCategory !== 'All' ? ' in this filter.' : '.') + '</div>' +
        '<div class="field-note">Search looks at names, shortcuts, tags and the prompt text.</div>' +
        '<button type="button" class="btn-secondary btn-mini" data-act="create-from-search">Create “' +
        escapeHtml(searchQuery.length > 28 ? searchQuery.slice(0, 28) + '…' : searchQuery) +
        '”</button>' +
        '</div>'
      );
    }
    if (currentCategory === FAVOURITES) {
      return (
        '<div class="empty-state">' +
        '<span class="empty-icon">' + ICONS.star24 + '</span>' +
        '<div><strong>No favourites yet</strong></div>' +
        '<div class="field-note">Hover a prompt and press the star. Favourites come first in the menu and in ' +
        escapeHtml(hotkeyLabel(settings.paletteHotkey)) +
        '.</div>' +
        '</div>'
      );
    }
    return (
      '<div class="empty-state">' +
      '<span class="empty-icon">' + ICONS.folder + '</span>' +
      '<div><strong>Nothing here yet</strong></div>' +
      '<div class="field-note">' +
      (currentCategory === 'Custom'
        ? 'Prompts you write yourself live here. Use + New to add your first.'
        : 'This category is empty, or its starter pack is switched off in Settings.') +
      '</div>' +
      '</div>'
    );
  }

  /** The first lines of a template, with {{fields}} marked, safe to put in the DOM. */
  function previewHtml(text) {
    const clipped = String(text || '').slice(0, 320);
    return escapeHtml(clipped).replace(/\{\{[^{}]{1,80}\}\}/g, (m) => '<mark>' + m + '</mark>') +
      (String(text || '').length > 320 ? '…' : '');
  }

  function cardHtml(p) {
    const prefix = settings.slashEnabled ? settings.slashTriggerChar : '';
    const varCount = template.variableCount(p);
    const fav = store.isFavorite(p.id);
    const usage = store.getUsage(p.id);
    const catMeta = store.getCategoryMeta(p.category || 'Custom');

    // Only the facts that change what happens when you pick it.
    const meta = [];
    if (varCount) {
      meta.push(
        '<span class="tag-badge" title="A short form asks for ' +
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
    if (usage.count > 2) {
      meta.push('<span class="tag-badge" title="You use this often">used ' + usage.count + '×</span>');
    }
    if (p.isCustom) meta.push('<span class="tag-badge" title="You wrote this prompt">yours</span>');
    if (p.isEdited) meta.push('<span class="tag-badge" title="You edited this built-in prompt">edited</span>');
    // Say up front that {{@blocks}} stay as written on Free.
    if (template.listBlocks(p.template).length) {
      meta.push(
        store.isPro()
          ? '<span class="tag-badge" title="Uses context blocks">context</span>'
          : '<span class="tag-badge" title="Uses context blocks. On Free they are inserted as written; Pro fills them in.">Pro · context</span>'
      );
    }

    return (
      '<div class="prompt-card" role="option" aria-selected="false" data-id="' +
      escapeAttr(p.id) +
      '" title="' +
      escapeAttr(p.title + ' (' + (p.category || 'Custom') + ')') +
      '">' +
      '<span class="row-icon" aria-hidden="true">' +
      escapeHtml(catMeta.icon || '🏷️') +
      '</span>' +
      '<div class="row-main">' +
      '<div class="row-top">' +
      '<span class="prompt-card-title">' +
      escapeHtml(p.title) +
      '</span>' +
      (fav ? '<span class="row-fav" title="Favourite">★</span>' : '') +
      '<span class="prompt-card-tags">' +
      meta.join('') +
      '</span>' +
      '</div>' +
      '<div class="prompt-card-desc">' +
      escapeHtml(p.description || '') +
      '</div>' +
      '<div class="row-preview">' +
      previewHtml(p.template) +
      '</div>' +
      '</div>' +
      '<div class="row-side">' +
      (p.shortcut && prefix
        ? '<span class="prompt-card-shortcut">' + escapeHtml(prefix + p.shortcut) + '</span>'
        : '') +
      '</div>' +
      '<div class="prompt-card-actions">' +
      '<button type="button" class="btn-action btn-star' +
      (fav ? ' is-fav' : '') +
      '" data-act="fav" title="' +
      (fav ? 'Remove from favourites' : 'Add to favourites') +
      '" aria-label="' +
      (fav ? 'Remove from favourites' : 'Add to favourites') +
      '" aria-pressed="' +
      fav +
      '">' +
      ICONS.star +
      '</button>' +
      '<button type="button" class="btn-action" data-act="edit" title="Edit" aria-label="Edit this prompt">' +
      ICONS.edit +
      '</button>' +
      '<button type="button" class="btn-action" data-act="copy" title="Copy (Shift+Enter)" aria-label="Copy to clipboard">' +
      ICONS.copy +
      '</button>' +
      '<button type="button" class="btn-action" data-act="compare" title="Compare across AIs" aria-label="Compare across AIs">' +
      '<span style="font-size:12px;line-height:1;">⚖️</span>' +
      '</button>' +
      '<button type="button" class="btn-action btn-action-primary" data-act="insert" title="Insert where your cursor is (Enter)">' +
      ICONS.insert +
      'Insert</button>' +
      '</div>' +
      '</div>'
    );
  }

  function bindCards() {
    el.list.querySelectorAll('.prompt-card[data-id]').forEach((card) => {
      const id = card.getAttribute('data-id');

      card.querySelectorAll('[data-act]').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const act = btn.getAttribute('data-act');
          if (act === 'fav') return toggleFavourite(id);
          if (act === 'edit') return editPrompt(id);
          if (act === 'copy') return copyPrompt(id);
          if (act === 'compare') return comparePrompt(id);
          if (act === 'insert') return insertPrompt(id);
        });
      });

      card.addEventListener('click', () => insertPrompt(id));
    });
  }

  async function comparePrompt(id) {
    if (!store.isPro()) {
      chrome.tabs.create({ url: chrome.runtime.getURL('options/options.html?upgrade=compare') });
      window.close();
      return;
    }
    const result = await relayToTab({ action: 'open_compare', promptId: id });
    if (result.ok) {
      window.close();
      return;
    }
    showToast('Cannot reach this page. Compare runs on pages where OmniPrompt is active.');
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
      if (isImeKey(e)) return;
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

    // Pro: the active workspace and remembered answers fill in here too.
    const sources = store.getValueSources(prompt.id);
    const initial = template.buildInitialValues(
      prompt,
      { selection: '', url: '', title: '' },
      {
        allowClipboard: false,
        cached: modalCache[prompt.id] || {},
        workspace: sources.workspace ? sources.workspace.values : null,
        remembered: sources.remembered
      }
    );
    modalVariables = initial.variables;

    el.modalFields.innerHTML = modalVariables
      .map((v, idx) => modalFieldHtml(v, initial.values[v.name] || '', initial.filledFrom[v.name], idx))
      .join('');

    el.modalFields.querySelectorAll('[data-var]').forEach((field) => {
      field.addEventListener('input', updateModalPreview);
      field.addEventListener('change', updateModalPreview);
      field.addEventListener('keydown', (e) => {
        if (isImeKey(e)) return;
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
    // Pro keeps short answers for next time; nothing happens on Free.
    store.rememberValues(id, values, modalVariables);

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
          '<div class="modifier-card-header"><span class="mod-icon" aria-hidden="true">' +
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
    el.catModalName.removeAttribute('aria-invalid');
    el.catModalError.textContent = '';
    el.catModalTitle.textContent = 'New category';
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

    el.catModalName.addEventListener('input', () => {
      if (el.catModalName.value.trim()) {
        el.catModalError.textContent = '';
        el.catModalName.removeAttribute('aria-invalid');
      }
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
        el.catModalName.setAttribute('aria-invalid', 'true');
        el.catModalName.focus();
        return;
      }

      const cat = await store.createCategory(name, selectedCategoryEmoji);
      if (!cat) {
        el.catModalError.textContent = 'A category with that name already exists.';
        el.catModalName.setAttribute('aria-invalid', 'true');
        el.catModalName.focus();
        return;
      }

      el.catModalName.removeAttribute('aria-invalid');
      closePopupCategoryModal();
      renderPills();
      renderCategoryOptions(cat.name);
      showToast('Category "' + cat.name + '" created.');
    });
  }

  function bindForm() {
    el.fTitle.addEventListener('input', () => {
      if (el.fTitle.value.trim()) {
        if (el.fTitleError) el.fTitleError.textContent = '';
        el.fTitle.removeAttribute('aria-invalid');
        const g = el.fTitle.closest('.form-group');
        if (g) g.classList.remove('has-error');
      }
    });

    el.fTemplate.addEventListener('input', () => {
      updateVariableSummary();
      if (el.fTemplate.value.trim()) {
        if (el.fTemplateError) el.fTemplateError.textContent = '';
        el.fTemplate.removeAttribute('aria-invalid');
        const g = el.fTemplate.closest('.form-group');
        if (g) g.classList.remove('has-error');
      }
    });

    el.fShortcut.addEventListener('input', () => {
      updateShortcutPreview();
      if (el.fShortcutError) el.fShortcutError.textContent = '';
      el.fShortcut.removeAttribute('aria-invalid');
      const g = el.fShortcut.closest('.form-group');
      if (g) g.classList.remove('has-error');
    });

    updateShortcutPreview();
    updateVariableSummary();

    document.querySelectorAll('.token-chips-bar .token-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        insertAtCursor(el.fTemplate, chip.getAttribute('data-insert'));
        updateVariableSummary();
      });
    });

    el.cancelBtn.addEventListener('click', () => {
      if (isFormDirty()) {
        if (!window.confirm('Discard unsaved changes to this prompt?')) return;
      }
      formInitialSnapshot = null;
      clearFormErrors();
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
      clearFormErrors();

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

      let hasError = false;
      let firstErrorEl = null;

      if (!draft.title) {
        if (el.fTitleError) el.fTitleError.textContent = 'Please enter a title.';
        el.fTitle.setAttribute('aria-invalid', 'true');
        const g = el.fTitle.closest('.form-group');
        if (g) g.classList.add('has-error');
        hasError = true;
        if (!firstErrorEl) firstErrorEl = el.fTitle;
      }

      if (!draft.template.trim()) {
        if (el.fTemplateError) el.fTemplateError.textContent = 'Please enter some prompt text.';
        el.fTemplate.setAttribute('aria-invalid', 'true');
        const g = el.fTemplate.closest('.form-group');
        if (g) g.classList.add('has-error');
        hasError = true;
        if (!firstErrorEl) firstErrorEl = el.fTemplate;
      }

      const clash = findShortcutClash(draft.shortcut, id);
      if (clash) {
        if (el.fShortcutError) el.fShortcutError.textContent = 'Shortcut ' + settings.slashTriggerChar + draft.shortcut + ' is already used by "' + clash.title + '".';
        el.fShortcut.setAttribute('aria-invalid', 'true');
        const g = el.fShortcut.closest('.form-group');
        if (g) g.classList.add('has-error');
        hasError = true;
        if (!firstErrorEl) firstErrorEl = el.fShortcut;
      }

      if (hasError) {
        if (firstErrorEl) firstErrorEl.focus();
        return;
      }

      try {
        const saved = await store.savePrompt(draft);
        formInitialSnapshot = null;
        clearFormErrors();
        resetForm();
        renderPills();
        renderList();
        selectTab('tab-prompts');
        showToast(id ? 'Prompt updated.' : 'Prompt saved.' + (saved && saved.shortcut ? ' Try ' + settings.slashTriggerChar + saved.shortcut : ''));
      } catch (err) {
        if (err && err.code === 'LIMIT_REACHED') {
          const limit = store.getFreeLimit ? store.getFreeLimit() : 20;
          showToast('You have ' + limit + ' prompts, the Free maximum. They all still work. Pro removes the cap.');
          if (el.limitBanner) el.limitBanner.style.display = 'flex';
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
      el.variableSummary.textContent = 'No blanks yet, so it inserts exactly as written.';
      return;
    }
    el.variableSummary.textContent =
      'Each time, a short form asks for: ' + vars.map((v) => v.label).join(', ') + '.';
  }

  function paintMoreFields(open) {
    const more = el.form.querySelector('.more-fields');
    if (more) more.open = !!open;
  }

  function editPrompt(id) {
    const p = store.getById(id);
    if (!p) return;
    clearFormErrors();

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
    paintMoreFields((p.tags && p.tags.length) || p.description);

    updateShortcutPreview();
    updateVariableSummary();
    selectTab('tab-new');
    formInitialSnapshot = getFormSnapshot();
  }

  function resetForm() {
    clearFormErrors();
    formInitialSnapshot = null;
    el.form.reset();
    el.fId.value = '';
    renderCategoryOptions();
    el.formHeading.textContent = 'Create a prompt';
    el.saveBtn.textContent = 'Save prompt';
    el.cancelBtn.style.display = 'none';
    paintMoreFields(false);
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
     Site permissions
     ===================================================================== */

  function matchesHost(pattern, host) {
    if (!pattern || !host) return false;
    if (pattern === '<all_urls>') return true;
    try {
      const match = /^(\*|https?):\/\/(\*|\*\.[^/]+|[^/]+)\/.*$/.exec(pattern);
      if (!match) return false;
      const hostPattern = match[2];
      if (hostPattern === '*') return true;
      if (hostPattern.startsWith('*.')) {
        const root = hostPattern.slice(2);
        return host === root || host.endsWith('.' + root);
      }
      return host === hostPattern;
    } catch (e) {
      return false;
    }
  }

  async function checkSiteCoverage() {
    if (!el.sitePermBanner) return;
    if (!activeHost) {
      el.sitePermBanner.hidden = true;
      return;
    }
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(activeHost)) {
      el.sitePermBanner.hidden = true;
      return;
    }
    if (typeof chrome === 'undefined' || !chrome.permissions) {
      el.sitePermBanner.hidden = true;
      return;
    }

    const hasEverywhere = await new Promise((resolve) => {
      chrome.permissions.contains({ origins: ['<all_urls>'] }, (res) => {
        void chrome.runtime.lastError;
        resolve(res);
      });
    });
    if (hasEverywhere) {
      el.sitePermBanner.hidden = true;
      return;
    }

    const manifest = (chrome.runtime && chrome.runtime.getManifest) ? chrome.runtime.getManifest() : {};
    const staticHosts = manifest.host_permissions || [];
    for (let i = 0; i < staticHosts.length; i++) {
      if (matchesHost(staticHosts[i], activeHost)) {
        el.sitePermBanner.hidden = true;
        return;
      }
    }

    const hasSitePerm = await new Promise((resolve) => {
      chrome.permissions.contains({ origins: ['https://' + activeHost + '/*'] }, (res) => {
        void chrome.runtime.lastError;
        resolve(res);
      });
    });
    if (hasSitePerm) {
      el.sitePermBanner.hidden = true;
      return;
    }

    el.sitePermBanner.hidden = false;
    if (el.sitePermDomain) {
      el.sitePermDomain.textContent = 'Turn it on to use shortcuts and prompts on ' + activeHost + '.';
    }
  }

  function bindSitePermissionBanner() {
    if (el.btnEnableThisSite) {
      el.btnEnableThisSite.addEventListener('click', () => {
        if (!activeHost) return;
        const origin = 'https://' + activeHost + '/*';
        chrome.permissions.request({ origins: [origin] }, (granted) => {
          void chrome.runtime.lastError;
          if (granted) {
            el.sitePermBanner.hidden = true;
            showToast('OmniPrompt enabled on ' + activeHost + '.');
            chrome.runtime.sendMessage({ action: 'inject_into_tab' }, () => void chrome.runtime.lastError);
          } else {
            showToast('Permission not granted.');
          }
        });
      });
    }

    if (el.btnEnableEverywhere) {
      el.btnEnableEverywhere.addEventListener('click', () => {
        chrome.permissions.request({ origins: ['<all_urls>'] }, (granted) => {
          void chrome.runtime.lastError;
          if (granted) {
            el.sitePermBanner.hidden = true;
            showToast('OmniPrompt enabled on every website.');
            chrome.runtime.sendMessage({ action: 'inject_into_tab' }, () => void chrome.runtime.lastError);
          } else {
            showToast('Permission not granted.');
          }
        });
      });
    }
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
      if (result.overLimit) {
        parts.push(result.overLimit + ' not added (Free holds ' + result.limit + ' of your own; Pro removes the cap)');
      }
      showToast(parts.join(', ') + '.');
      updateTierBadge();
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

    const hk = hotkeyLabel(settings.paletteHotkey);
    el.hotkeyHint.innerHTML = settings.slashEnabled
      ? 'In any text box: <kbd>' + escapeHtml(settings.slashTriggerChar) + '</kbd> or <kbd>' + escapeHtml(hk) + '</kbd>'
      : 'In any page: <kbd>' + escapeHtml(hk) + '</kbd>';

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

  /**
   * True while an IME (Chinese, Japanese, Korean) is composing. Its Enter and
   * Esc belong to the IME and must not insert a prompt or close anything.
   * Safari reports the confirming Enter as keyCode 229 with isComposing false.
   */
  function isImeKey(e) {
    return !!e.isComposing || e.keyCode === 229;
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
