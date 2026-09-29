/**
 * OmniPrompt - Options dashboard
 *
 * Library table, prompt editor, folders, settings, backup and import.
 *
 * Fixes carried in this rewrite
 * -----------------------------
 * - The delete button works. The old row handler called `saveCustomPrompts()`,
 *   which was never defined in this file, so clicking the bin threw a
 *   ReferenceError, nothing persisted and no message appeared.
 * - "Restore" no longer destroys user prompts. It clears the built-in overlay
 *   only. Erasing everything is a separate, clearly labelled action.
 * - Editing a built-in stores a small patch instead of writing a 95KB copy of
 *   the whole library, so future updates still reach the user.
 * - The disabled trigger prefix now displays correctly; the old code compared
 *   against 'none' after having already converted it to an empty string.
 * - window.prompt is replaced with an in-page dialog.
 */

'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const store = window.OmniStore;
  const template = window.OmniTemplate;
  const importers = window.OmniImporters;

  const FAVOURITES = '__favourites__';

  let settings = null;
  let filter = { category: 'All' };
  let searchQuery = '';
  let recordingHotkey = false;

  const HOTKEY_PRESETS = {
    'Alt+K': { key: 'k', code: 'KeyK', altKey: true, display: 'Alt+K' },
    'Alt+P': { key: 'p', code: 'KeyP', altKey: true, display: 'Alt+P' },
    'Alt+O': { key: 'o', code: 'KeyO', altKey: true, display: 'Alt+O' },
    'Alt+Shift+P': { key: 'p', code: 'KeyP', altKey: true, shiftKey: true, display: 'Alt+Shift+P' },
    'Ctrl+Shift+Space': { key: ' ', code: 'Space', ctrlKey: true, shiftKey: true, display: 'Ctrl+Shift+Space' }
  };

  /* =====================================================================
     Element handles
     ===================================================================== */

  const el = {
    navItems: document.querySelectorAll('.nav-item'),
    panels: document.querySelectorAll('.view-panel'),
    sidebarCount: document.getElementById('sidebar-count'),
    sidebarStat: document.getElementById('sidebar-stat'),
    catList: document.getElementById('sidebar-cat-list'),
    addCategory: document.getElementById('btn-add-category'),

    search: document.getElementById('options-search'),
    activeFilter: document.getElementById('active-filter'),
    tableBody: document.getElementById('prompt-table-body'),
    createBtn: document.getElementById('btn-create-new-prompt'),

    form: document.getElementById('editor-form'),
    heading: document.getElementById('editor-heading'),
    builtinNotice: document.getElementById('builtin-notice'),
    fId: document.getElementById('edit-id'),
    fTitle: document.getElementById('edit-title'),
    fCategory: document.getElementById('edit-category'),
    editAddCategory: document.getElementById('btn-edit-add-category'),
    fShortcut: document.getElementById('edit-shortcut'),
    fTags: document.getElementById('edit-tags'),
    fDescription: document.getElementById('edit-description'),
    fNotes: document.getElementById('edit-notes'),
    fTemplate: document.getElementById('edit-template'),
    historyBtn: document.getElementById('btn-prompt-history'),
    exportSkillBtn: document.getElementById('btn-export-skill'),

    historyModal: document.getElementById('history-modal'),
    historyTitle: document.getElementById('history-modal-title'),
    historyNote: document.getElementById('history-modal-note'),
    historyList: document.getElementById('history-list'),
    historyClose: document.getElementById('btn-close-history-modal'),
    historyDone: document.getElementById('btn-history-modal-done'),

    backupStatus: document.getElementById('backup-status'),
    snapshotList: document.getElementById('snapshot-list'),
    snapshotNow: document.getElementById('btn-snapshot-now'),
    shortcutPreview: document.getElementById('edit-shortcut-preview'),
    shortcutClash: document.getElementById('shortcut-clash'),
    variablePreview: document.getElementById('variable-preview'),
    deleteBtn: document.getElementById('btn-delete-prompt'),
    duplicateBtn: document.getElementById('btn-duplicate-prompt'),
    revertBtn: document.getElementById('btn-revert-prompt'),
    cancelEdit: document.getElementById('btn-cancel-edit'),

    selectedRole: document.getElementById('setting-selected-role'),
    slashEnabled: document.getElementById('setting-slash-enabled'),
    slashChar: document.getElementById('setting-slash-char'),
    paletteEnabled: document.getElementById('setting-palette-enabled'),
    hotkeyRecorder: document.getElementById('hotkey-recorder'),
    hotkeyDisplay: document.getElementById('hotkey-display-text'),
    resetHotkey: document.getElementById('btn-reset-hotkey'),
    chromeShortcuts: document.getElementById('btn-open-chrome-shortcuts'),
    rankFavorites: document.getElementById('setting-rank-favorites'),
    rankRecents: document.getElementById('setting-rank-recents'),
    syncEnabled: document.getElementById('setting-sync-enabled'),
    syncStatus: document.getElementById('sync-status'),
    disabledSites: document.getElementById('disabled-sites'),
    newDisabledSite: document.getElementById('new-disabled-site'),
    addDisabledSite: document.getElementById('btn-add-disabled-site'),

    themeStatus: document.getElementById('theme-status'),

    exportSummary: document.getElementById('export-summary'),
    exportIncludeLibrary: document.getElementById('export-include-library'),
    exportBtn: document.getElementById('btn-export-backup'),
    importFile: document.getElementById('options-import-file'),
    importReplace: document.getElementById('import-replace-mode'),
    restoreSummary: document.getElementById('restore-summary'),
    factoryReset: document.getElementById('btn-factory-reset'),
    eraseAll: document.getElementById('btn-erase-all'),

    modal: document.getElementById('options-variable-modal'),
    modalTitle: document.getElementById('opt-modal-prompt-title'),
    modalFields: document.getElementById('opt-modal-fields-container'),
    modalPreview: document.getElementById('opt-modal-preview-text'),
    modalWarning: document.getElementById('opt-modal-warning'),
    modalClose: document.getElementById('btn-close-opt-modal'),
    modalCancel: document.getElementById('btn-opt-modal-cancel'),
    modalCopy: document.getElementById('btn-opt-modal-copy'),

    textModal: document.getElementById('text-input-modal'),
    textModalTitle: document.getElementById('text-modal-title'),
    textModalLabel: document.getElementById('text-modal-label'),
    textModalInput: document.getElementById('text-modal-input'),
    textModalNote: document.getElementById('text-modal-note'),
    textModalClose: document.getElementById('btn-close-text-modal'),
    textModalCancel: document.getElementById('btn-text-modal-cancel'),
    textModalConfirm: document.getElementById('btn-text-modal-confirm'),

    catModal: document.getElementById('category-modal'),
    catModalTitle: document.getElementById('cat-modal-title'),
    catModalClose: document.getElementById('btn-close-cat-modal'),
    catModalId: document.getElementById('cat-modal-id'),
    catModalName: document.getElementById('cat-modal-name'),
    catModalError: document.getElementById('cat-modal-error'),
    catModalPreview: document.getElementById('cat-modal-preview'),
    catModalCustomEmoji: document.getElementById('cat-modal-custom-emoji'),
    catModalEmojiTabs: document.getElementById('cat-modal-emoji-tabs'),
    catModalEmojiGrid: document.getElementById('cat-modal-emoji-grid'),
    catModalCancel: document.getElementById('btn-cat-modal-cancel'),
    catModalSave: document.getElementById('btn-cat-modal-save'),

    toast: document.getElementById('toast'),

    licenseCard: document.getElementById('setting-license-card'),
    licenseTierPill: document.getElementById('license-tier-pill'),
    licenseTierDesc: document.getElementById('license-tier-desc'),
    customPromptCount: document.getElementById('custom-prompt-count'),
    licenseActiveDetails: document.getElementById('license-active-details'),
    licenseMaskedKey: document.getElementById('license-masked-key'),
    licenseFreeActions: document.getElementById('license-free-actions'),
    licenseActiveActions: document.getElementById('license-active-actions'),
    licenseKeyInput: document.getElementById('input-license-key'),
    activateLicenseBtn: document.getElementById('btn-activate-license'),
    deactivateLicenseBtn: document.getElementById('btn-deactivate-license'),
    buyProLink: document.getElementById('link-buy-pro'),
    licenseFeedback: document.getElementById('license-feedback'),

    upgradeModal: document.getElementById('upgrade-modal'),
    upgradeModalTitle: document.getElementById('upgrade-modal-title'),
    upgradeModalReason: document.getElementById('upgrade-modal-reason'),
    upgradeModalClose: document.getElementById('btn-close-upgrade-modal'),
    upgradeModalKey: document.getElementById('upgrade-modal-key'),
    upgradeModalActivate: document.getElementById('btn-upgrade-modal-activate'),
    upgradeModalFeedback: document.getElementById('upgrade-modal-feedback'),
    upgradeModalCancel: document.getElementById('btn-upgrade-modal-cancel'),
    upgradeModalBuy: document.getElementById('link-upgrade-modal-buy')
  };

  /* =====================================================================
     Boot
     ===================================================================== */

  init();

  async function init() {
    // Paint the stored theme before the first storage read resolves, so the
    // page does not flash the wrong skin.
    applyTheme();

    await store.init();
    store.watchStorage();
    settings = store.getSettings();

    applyTheme();
    bindTheme();

    bindNav();
    bindLibrary();
    bindEditor();
    bindSettings();
    bindDataView();
    bindModals();

    paintSettings();
    renderSidebar();
    renderCategoryOptions();
    renderTable();
    updateCounts();
    paintCheckoutLinks();

    handleUrlParams();

    // Opening the library is a natural moment for the daily backup.
    store.maybeDailySnapshot().then(renderBackups, renderBackups);

    store.onChange((reason) => {
      settings = store.getSettings();
      applyTheme();
      renderSidebar();
      renderTable();
      updateCounts();
      renderDisabledSites();
      renderSyncStatus();
      if (reason === 'snapshot' || reason === 'snapshot-restored' || reason === 'imported') renderBackups();
    });
  }

  /** Every "buy" link points at the one checkout URL the store defines. */
  function paintCheckoutLinks() {
    const info = store.getProInfo();
    [el.buyProLink, el.upgradeModalBuy].forEach((link) => {
      if (link) link.href = info.checkoutUrl;
    });
  }

  /* =====================================================================
     Theme
     ===================================================================== */

  function currentThemeChoice() {
    return settings && settings.theme ? settings.theme : 'system';
  }

  function applyTheme() {
    if (!window.OmniTheme) return;
    const resolved = window.OmniTheme.apply(document.documentElement, currentThemeChoice());
    const choice = window.OmniTheme.normalize(currentThemeChoice());

    document.querySelectorAll('.theme-opt').forEach((btn) => {
      btn.setAttribute('aria-pressed', String(btn.getAttribute('data-choice') === choice));
    });

    if (el.themeStatus) {
      el.themeStatus.textContent =
        choice === 'system' ? 'Following your system: ' + resolved + '.' : window.OmniTheme.label(choice) + ' theme.';
    }
  }

  function bindTheme() {
    document.querySelectorAll('.theme-opt').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const choice = btn.getAttribute('data-choice');
        await saveSetting('theme', choice);
        applyTheme();
        showToast('Theme: ' + window.OmniTheme.label(choice) + '.');
      });
    });

    // Follow the operating system while the choice is 'system'.
    if (window.OmniTheme) {
      window.OmniTheme.watchSystem(currentThemeChoice, () => applyTheme());
    }
  }

  /* =====================================================================
     Navigation
     ===================================================================== */

  function bindNav() {
    el.navItems.forEach((btn) => {
      btn.addEventListener('click', () => {
        if (btn.id === 'nav-btn-guide') {
          chrome.tabs.create({ url: chrome.runtime.getURL('welcome/welcome.html') });
          return;
        }
        const view = btn.getAttribute('data-view');
        if (!view) return;
        if (view === 'prompts') {
          filter = { category: 'All', folderId: null };
          searchQuery = '';
          el.search.value = '';
          renderSidebar();
          renderTable();
        }
        if (view === 'editor' && !el.fId.value && !el.fTitle.value) openEditor(null);
        showView(view);
      });
    });
  }

  function showView(view) {
    el.navItems.forEach((b) => b.classList.toggle('active', b.getAttribute('data-view') === view));
    el.panels.forEach((p) => p.classList.toggle('active', p.id === 'view-' + view));
  }

  /**
   * Accept ?edit=<id>, ?create=1 and draft fields, so the popup's
   * "Full editor" button can hand over a half-written prompt.
   */
  function handleUrlParams() {
    const params = new URLSearchParams(window.location.search);
    if (!params.toString()) return;

    if (params.has('upgrade') || params.get('view') === 'settings' || params.has('license')) {
      showView('settings');
      if (params.has('upgrade')) openUpgradeModal('pro');
      return;
    }

    // "Save selection as a new prompt" from the page or the palette.
    if (params.has('draft')) {
      openDraftFromPage();
      return;
    }

    if (params.get('view') === 'data') {
      showView('data');
      return;
    }

    if (params.has('edit')) {
      const existing = store.getById(params.get('edit'));
      const draft = existing ? Object.assign({}, existing) : { id: params.get('edit') };
      applyParamOverrides(draft, params);
      openEditor(draft);
      showView('editor');
      return;
    }

    if (params.has('create') || params.has('title') || params.has('template')) {
      if (store.isLimitReached()) {
        showView('prompts');
        openUpgradeModal('limit');
        return;
      }
      const draft = {};
      applyParamOverrides(draft, params);
      openEditor(draft);
      showView('editor');
      return;
    }

    if (params.has('category')) {
      filter = { category: params.get('category') };
      renderSidebar();
      renderTable();
    }
  }

  async function openDraftFromPage() {
    const pending = await store.takePendingDraft();
    // Drop ?draft=1 so a reload does not look for it again.
    if (window.history && window.history.replaceState) {
      window.history.replaceState(null, '', window.location.pathname);
    }
    if (!pending) {
      showView('prompts');
      showToast('That text was not found. Select it again and choose "Save as a new prompt".');
      return;
    }
    const firstLine = pending.template.split('\n').map((l) => l.trim()).filter(Boolean)[0] || '';
    openEditor({
      title: firstLine.replace(/^#+\s*/, '').slice(0, 60),
      template: pending.template,
      description: pending.source ? 'Saved from ' + pending.source : ''
    });
    showView('editor');
    if (store.isLimitReached()) {
      showToast('You are at the free limit. You can still read and edit this, and saving needs Pro.');
    } else {
      showToast('Check the title, add a shortcut, then save.');
    }
  }

  function applyParamOverrides(draft, params) {
    if (params.has('title')) draft.title = params.get('title');
    if (params.has('category')) draft.category = params.get('category');
    if (params.has('folder')) draft.folderId = params.get('folder');
    if (params.has('shortcut')) draft.shortcut = params.get('shortcut');
    if (params.has('tags')) draft.tags = params.get('tags').split(',').map((t) => t.trim()).filter(Boolean);
    if (params.has('description')) draft.description = params.get('description');
    if (params.has('template')) draft.template = params.get('template');
  }

  /* =====================================================================
     Sidebar
     ===================================================================== */

  function renderSidebar() {
    const counts = store.countByCategory();
    const favourites = store.getFavorites().length;

    let html = '';
    html += catButton('All', 'All prompts', store.getAll().length, filter.category === 'All');
    html += catButton(FAVOURITES, '★ Favourites', favourites, filter.category === FAVOURITES);

    store.BUILTIN_CATEGORIES.forEach((cat) => {
      const meta = store.getCategoryMeta(cat);
      html += catButton(cat, meta.icon + ' ' + meta.label, counts[cat] || 0, filter.category === cat);
    });

    const customCats = store.getCustomCategories();
    if (customCats.length) {
      customCats.forEach((cat) => {
        const count = counts[cat.name] || 0;
        html +=
          '<div class="folder-row">' +
          '<button class="cat-filter-btn folder-btn' +
          (filter.category === cat.name ? ' active' : '') +
          '" data-cat="' +
          escapeAttr(cat.name) +
          '">' +
          '<span class="cat-label">' +
          escapeHtml(cat.icon + ' ' + cat.name) +
          '</span><span class="cat-count">' +
          count +
          '</span>' +
          '</button>' +
          '<button class="btn-folder-act" data-edit-cat="' +
          escapeAttr(cat.id) +
          '" title="Edit category">✎</button>' +
          '<button class="btn-folder-act" data-delete-cat="' +
          escapeAttr(cat.id) +
          '" title="Delete category">✕</button>' +
          '</div>';
      });
    }

    const generalCustomCount = store.getAll().filter((p) => p.category === 'Custom').length;
    if (generalCustomCount || !customCats.length) {
      html += catButton('Custom', '⭐ General Custom', generalCustomCount, filter.category === 'Custom');
    }

    el.catList.innerHTML = html;

    el.catList.querySelectorAll('.cat-filter-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        filter = { category: btn.getAttribute('data-cat') };
        renderSidebar();
        renderTable();
        showView('prompts');
      });
    });

    el.catList.querySelectorAll('[data-edit-cat]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-edit-cat');
        const cat = store.getCustomCategories().find((c) => c.id === id);
        if (!cat) return;
        openCategoryModal(cat);
      });
    });

    el.catList.querySelectorAll('[data-delete-cat]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-delete-cat');
        const cat = store.getCustomCategories().find((c) => c.id === id);
        if (!cat) return;
        const inside = store.getAll().filter((p) => p.category === cat.name).length;
        const message =
          'Delete the category "' +
          cat.name +
          '"?\n\n' +
          (inside
            ? inside + ' prompt' + (inside === 1 ? '' : 's') + ' will move to "Custom". No prompts are deleted.'
            : 'It has no prompts.');
        if (!window.confirm(message)) return;
        await store.deleteCategory(id);
        if (filter.category === cat.name) filter = { category: 'All' };
        renderSidebar();
        renderCategoryOptions();
        renderTable();
        showToast('Category deleted. Prompts kept.');
      });
    });
  }

  function catButton(value, label, count, active) {
    return (
      '<button class="cat-filter-btn' +
      (active ? ' active' : '') +
      '" data-cat="' +
      escapeAttr(value) +
      '">' +
      '<span class="cat-label">' +
      escapeHtml(label) +
      '</span>' +
      '<span class="cat-count">' +
      count +
      '</span>' +
      '</button>'
    );
  }

  /* =====================================================================
     Category modal with Emoji Icon Pack
     ===================================================================== */

  let activeCatCallback = null;
  let selectedCategoryEmoji = '🏷️';
  let activeEmojiTab = 0;

  function openCategoryModal(opts) {
    const o = opts || {};
    activeCatCallback = o.onSaved || null;
    selectedCategoryEmoji = o.icon || '🏷️';
    activeEmojiTab = 0;

    el.catModalId.value = o.id || '';
    el.catModalName.value = o.name || '';
    el.catModalError.textContent = '';
    el.catModalTitle.textContent = o.id ? 'Edit Category' : 'New Category';
    el.catModalPreview.textContent = selectedCategoryEmoji;
    el.catModalCustomEmoji.value = '';

    renderEmojiPicker();

    el.catModal.style.display = 'flex';
    setTimeout(() => el.catModalName.focus(), 50);
  }

  function closeCategoryModal() {
    el.catModal.style.display = 'none';
    activeCatCallback = null;
  }

  function renderEmojiPicker() {
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
        renderEmojiPicker();
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
    el.catModalClose.addEventListener('click', closeCategoryModal);
    el.catModalCancel.addEventListener('click', closeCategoryModal);

    el.catModal.addEventListener('click', (e) => {
      if (e.target === el.catModal) closeCategoryModal();
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
      const id = el.catModalId.value.trim();
      const name = el.catModalName.value.trim();
      if (!name) {
        el.catModalError.textContent = 'Please enter a category name.';
        el.catModalName.focus();
        return;
      }

      let cat;
      if (id) {
        cat = await store.updateCategory(id, { name: name, icon: selectedCategoryEmoji });
        if (!cat) {
          el.catModalError.textContent = 'A category with that name already exists.';
          return;
        }
        showToast('Category updated.');
      } else {
        cat = await store.createCategory(name, selectedCategoryEmoji);
        if (!cat) {
          el.catModalError.textContent = 'A category with that name already exists.';
          return;
        }
        showToast('Category created.');
      }

      closeCategoryModal();
      renderSidebar();
      renderCategoryOptions(cat.name);
      renderTable();

      if (activeCatCallback) {
        activeCatCallback(cat);
      }
    });
  }

  function bindLibrary() {
    el.addCategory.addEventListener('click', () => {
      openCategoryModal({});
    });

    el.search.addEventListener('input', () => {
      searchQuery = el.search.value.trim();
      renderTable();
    });

    el.createBtn.addEventListener('click', () => {
      if (store.isLimitReached()) {
        openUpgradeModal('limit');
        return;
      }
      openEditor(null);
      showView('editor');
    });
  }

  /* =====================================================================
     Library table
     ===================================================================== */

  function currentRows() {
    if (filter.category === FAVOURITES) {
      const favourites = store.getFavorites();
      if (!searchQuery) return favourites;
      return favourites.filter((p) => store.scoreOne(p, searchQuery) > 0);
    }
    return store.search({
      query: searchQuery,
      category: filter.category
    });
  }

  function renderTable() {
    const rows = currentRows();
    updateFilterChip(rows.length);

    if (!rows.length) {
      el.tableBody.innerHTML =
        '<tr><td colspan="5" class="table-empty">' +
        (searchQuery ? 'Nothing matches that search.' : 'Nothing here yet.') +
        '</td></tr>';
      return;
    }

    // The trigger prefix only shows when the slash menu is actually on. The old
    // code tested for the string 'none' after converting it away, so a disabled
    // trigger still displayed "//".
    const prefix = settings.slashEnabled ? settings.slashTriggerChar : '';

    el.tableBody.innerHTML = rows
      .map((p) => {
        const fav = store.isFavorite(p.id);
        const varCount = template.variableCount(p);
        const usage = store.getUsage(p.id);
        const catMeta = store.getCategoryMeta(p.category || 'Custom');

        const tags = [];
        if (p.shortcut && prefix) {
          tags.push(
            '<span class="table-shortcut" title="Slash shortcut: ' +
              escapeAttr(prefix + p.shortcut) +
              '">' +
              escapeHtml(prefix + p.shortcut) +
              '</span>'
          );
        }
        if (varCount) {
          tags.push(
            '<span class="row-chip row-chip-vars" title="' +
              varCount +
              ' field' +
              (varCount === 1 ? '' : 's') +
              ' to fill in">⚡ ' +
              varCount +
              ' field' +
              (varCount === 1 ? '' : 's') +
              '</span>'
          );
        }
        if (p.isCustom) tags.push('<span class="row-chip row-chip-mine">yours</span>');
        if (p.isEdited) tags.push('<span class="row-chip row-chip-edited">edited</span>');
        if (usage.count) tags.push('<span class="row-chip">used ' + usage.count + '×</span>');

        return (
          '<tr data-id="' +
          escapeAttr(p.id) +
          '">' +
          '<td class="cell-fav"><button type="button" class="btn-star-row' +
          (fav ? ' is-fav' : '') +
          '" data-act="fav" title="' +
          (fav ? 'Remove from favourites' : 'Add to favourites') +
          '" aria-label="Toggle favourite">' +
          (fav ? '★' : '☆') +
          '</button></td>' +
          '<td class="cell-title">' +
          '<div class="table-title">' +
          escapeHtml(p.title) +
          '</div>' +
          (p.description ? '<div class="table-desc-subtitle">' + escapeHtml(p.description) + '</div>' : '') +
          (tags.length ? '<div class="row-chips">' + tags.join('') + '</div>' : '') +
          '</td>' +
          '<td class="cell-category"><span class="row-category">' +
          '<span class="row-cat-icon">' +
          escapeHtml(catMeta.icon || '🏷️') +
          '</span> ' +
          '<span class="row-cat-name">' +
          escapeHtml(p.category || 'Custom') +
          '</span>' +
          '</span></td>' +
          '<td class="cell-template"><div class="table-preview" title="Click row or Edit to customize">' +
          escapeHtml(p.template) +
          '</div></td>' +
          '<td class="cell-actions">' +
          '<div class="table-actions">' +
          '<button type="button" class="btn-table btn-table-icon btn-action-edit" data-act="edit" title="Edit prompt" aria-label="Edit prompt">' +
          '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>' +
          '</button>' +
          '<button type="button" class="btn-table btn-table-icon btn-action-copy" data-act="copy" title="Copy to clipboard" aria-label="Copy to clipboard">' +
          '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>' +
          '</button>' +
          '<button type="button" class="btn-table btn-table-icon btn-action-duplicate" data-act="duplicate" title="Make a duplicate copy" aria-label="Duplicate prompt">' +
          '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8" y="8" width="13" height="13" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path><line x1="14.5" y1="11.5" x2="14.5" y2="17.5"></line><line x1="11.5" y1="14.5" x2="17.5" y2="14.5"></line></svg>' +
          '</button>' +
          '<button type="button" class="btn-table btn-table-icon btn-delete-row" data-act="delete" title="Delete prompt" aria-label="Delete prompt">' +
          '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>' +
          '</button>' +
          '</div>' +
          '</td>' +
          '</tr>'
        );
      })
      .join('');

    bindRows();
  }

  function bindRows() {
    el.tableBody.querySelectorAll('tr[data-id]').forEach((tr) => {
      const id = tr.getAttribute('data-id');
      tr.querySelectorAll('[data-act]').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const act = btn.getAttribute('data-act');

          if (act === 'fav') {
            await store.toggleFavorite(id);
            renderSidebar();
            renderTable();
            return;
          }
          if (act === 'edit') {
            openEditor(store.getById(id));
            showView('editor');
            return;
          }
          if (act === 'copy') {
            copyPrompt(id);
            return;
          }
          if (act === 'duplicate') {
            if (store.isLimitReached()) {
              openUpgradeModal('limit');
              return;
            }
            try {
              const copy = await store.duplicatePrompt(id);
              renderSidebar();
              renderTable();
              updateCounts();
              if (copy) {
                openEditor(store.getById(copy.id));
                showView('editor');
                showToast('Duplicated. Edit and save.');
              }
            } catch (err) {
              if (err && err.code === 'LIMIT_REACHED') {
                openUpgradeModal('limit');
                return;
              }
              showToast((err && err.message) || 'Could not duplicate prompt.');
            }
            return;
          }
          if (act === 'delete') {
            await deletePrompt(id);
          }
        });
      });
    });
  }

  /**
   * Delete a prompt.
   *
   * This is the handler that used to throw. It now goes through the store,
   * which removes a user prompt outright and hides a built-in so that
   * "Restore built-ins" can bring it back.
   */
  async function deletePrompt(id) {
    const prompt = store.getById(id);
    if (!prompt) return;

    const builtin = store.isBuiltin(id);
    const message = builtin
      ? 'Hide the built-in prompt "' + prompt.title + '"?\n\nYou can bring it back with "Restore built-ins".'
      : 'Delete your prompt "' + prompt.title + '"?\n\nThis cannot be undone. Export first if you want a copy.';

    if (!window.confirm(message)) return;

    const ok = await store.deletePrompt(id);
    if (!ok) {
      showToast('Could not delete that prompt.');
      return;
    }

    renderSidebar();
    renderTable();
    updateCounts();
    showToast(builtin ? 'Built-in hidden. Restore any time.' : 'Prompt deleted.');
  }

  function updateFilterChip(count) {
    const parts = [];
    if (filter.category === FAVOURITES) {
      parts.push('★ Favourites');
    } else if (filter.category !== 'All') {
      const meta = store.getCategoryMeta(filter.category);
      parts.push(meta.icon + ' ' + filter.category);
    }
    if (searchQuery) parts.push('“' + searchQuery + '”');
    el.activeFilter.textContent = parts.length ? parts.join(' · ') + ' — ' + count : count + ' prompts';
  }

  function updateCounts() {
    const all = store.getAll();
    const mine = store.getCustomCount ? store.getCustomCount() : all.filter((p) => p.isCustom).length;
    const edited = all.filter((p) => p.isEdited).length;
    const hidden = store.getBuiltins().length - all.filter((p) => !p.isCustom).length;

    el.sidebarCount.textContent = String(all.length);
    if (store.isPro && store.isPro()) {
      el.sidebarStat.textContent =
        '👑 Pro · ' + mine + ' custom · ' + store.getFavorites().length + ' favourites';
    } else {
      const limit = store.getFreeLimit ? store.getFreeLimit() : 25;
      el.sidebarStat.textContent =
        'Free: ' + mine + '/' + limit + ' custom · ' + store.getFavorites().length + ' favourites';
    }

    paintLicenseState();

    if (el.exportSummary) {
      el.exportSummary.textContent =
        mine === 0
          ? 'You have no prompts of your own yet. The export will still record your folders, favourites and any edits to built-ins.'
          : 'Exports your ' + mine + ' prompt' + (mine === 1 ? '' : 's') + ', folders, favourites and edits to built-ins.';
    }

    if (el.restoreSummary) {
      el.restoreSummary.textContent =
        'Undoes ' +
        edited +
        ' edit' +
        (edited === 1 ? '' : 's') +
        ' to built-in prompts and brings back ' +
        hidden +
        ' hidden one' +
        (hidden === 1 ? '' : 's') +
        '. Your own ' +
        mine +
        ' prompt' +
        (mine === 1 ? '' : 's') +
        ', folders and favourites are untouched.';
    }
  }

  /* =====================================================================
     Editor
     ===================================================================== */

  function renderCategoryOptions(selected) {
    const cats = store.getCategories();
    if (cats.indexOf('Custom') === -1) cats.push('Custom');
    const pick = selected || 'Custom';
    el.fCategory.innerHTML = cats
      .map((c) => {
        const meta = store.getCategoryMeta(c);
        return (
          '<option value="' +
          escapeAttr(c) +
          '"' +
          (c === pick ? ' selected' : '') +
          '>' +
          meta.icon +
          ' ' +
          escapeHtml(c) +
          '</option>'
        );
      })
      .join('');
  }

  function openEditor(prompt) {
    const p = prompt || {};
    const isBuiltin = p.id ? store.isBuiltin(p.id) : false;

    el.fId.value = p.id || '';
    el.fTitle.value = p.title || '';
    renderCategoryOptions(p.category);
    el.fShortcut.value = p.shortcut || '';
    el.fTags.value = Array.isArray(p.tags) ? p.tags.join(', ') : p.tags || '';
    el.fDescription.value = p.description || '';
    if (el.fNotes) el.fNotes.value = p.notes || '';
    el.fTemplate.value = p.template || '';

    el.heading.textContent = p.id ? 'Edit: ' + (p.title || 'prompt') : 'New prompt';
    el.builtinNotice.style.display = isBuiltin ? 'block' : 'none';
    el.deleteBtn.style.display = p.id ? '' : 'none';
    el.deleteBtn.textContent = isBuiltin ? 'Hide built-in' : 'Delete';
    el.duplicateBtn.style.display = p.id ? '' : 'none';
    el.revertBtn.style.display = isBuiltin && p.isEdited ? '' : 'none';
    paintHistoryButton(p.id);

    updateShortcutPreview();
    updateVariablePreview();
    el.fTitle.focus();
  }

  function bindEditor() {
    el.fShortcut.addEventListener('input', updateShortcutPreview);
    el.fTemplate.addEventListener('input', updateVariablePreview);

    el.editAddCategory.addEventListener('click', () => {
      openCategoryModal({
        onSaved: (cat) => {
          renderCategoryOptions(cat.name);
        }
      });
    });

    document.querySelectorAll('#options-token-chips .token-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        insertAtCursor(el.fTemplate, chip.getAttribute('data-insert'));
        updateVariablePreview();
      });
    });

    el.cancelEdit.addEventListener('click', () => {
      showView('prompts');
    });

    el.form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const id = el.fId.value.trim();
      const draft = {
        title: el.fTitle.value.trim(),
        category: el.fCategory.value,
        shortcut: el.fShortcut.value.trim(),
        tags: el.fTags.value,
        description: el.fDescription.value.trim(),
        notes: el.fNotes ? el.fNotes.value : '',
        template: el.fTemplate.value
      };
      if (id) draft.id = id;

      const clash = findShortcutClash(draft.shortcut, id);
      if (clash) {
        showToast('That shortcut already belongs to "' + clash.title + '". Pick another.');
        el.fShortcut.focus();
        return;
      }

      try {
        await store.savePrompt(draft);
      } catch (err) {
        if (err && err.code === 'LIMIT_REACHED') {
          openUpgradeModal('limit');
          return;
        }
        showToast((err && err.message) || 'Could not save prompt.');
        return;
      }
      renderSidebar();
      renderTable();
      updateCounts();
      showView('prompts');
      showToast(id ? 'Saved.' : 'Prompt created.');
    });

    el.deleteBtn.addEventListener('click', async () => {
      const id = el.fId.value.trim();
      if (!id) return;
      await deletePrompt(id);
      if (!store.getById(id)) showView('prompts');
    });

    el.duplicateBtn.addEventListener('click', async () => {
      const id = el.fId.value.trim();
      if (!id) return;
      if (store.isLimitReached()) {
        openUpgradeModal('limit');
        return;
      }
      try {
        const copy = await store.duplicatePrompt(id);
        renderSidebar();
        renderTable();
        updateCounts();
        if (copy) {
          openEditor(store.getById(copy.id));
          showToast('Duplicated.');
        }
      } catch (err) {
        if (err && err.code === 'LIMIT_REACHED') {
          openUpgradeModal('limit');
          return;
        }
        showToast((err && err.message) || 'Could not duplicate prompt.');
      }
    });

    el.revertBtn.addEventListener('click', async () => {
      const id = el.fId.value.trim();
      if (!id) return;
      if (!window.confirm('Discard your changes to this built-in prompt?')) return;
      // Saving the untouched built-in clears the stored patch.
      const original = store.getBuiltins().filter((b) => b.id === id)[0];
      if (!original) return;
      await store.savePrompt(Object.assign({}, original));
      openEditor(store.getById(id));
      renderTable();
      updateCounts();
      showToast('Reverted to the built-in version.');
    });

    if (el.historyBtn) {
      el.historyBtn.addEventListener('click', () => {
        const id = el.fId.value.trim();
        if (id) openHistoryModal(id);
      });
    }

    if (el.exportSkillBtn) {
      el.exportSkillBtn.addEventListener('click', () => {
        if (!el.fTemplate.value.trim()) {
          showToast('Write the prompt text first, then export it.');
          return;
        }
        const draft = {
          title: el.fTitle.value.trim(),
          shortcut: el.fShortcut.value.trim(),
          description: el.fDescription.value.trim(),
          tags: el.fTags.value
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean),
          template: el.fTemplate.value
        };
        const text = importers.toSkillMd(draft);
        const folder = (text.match(/^name: (.+)$/m) || [])[1] || 'my-skill';
        downloadText(text, 'SKILL.md', 'text/markdown');
        showToast('Downloaded SKILL.md. Put it in a folder named "' + folder + '" to add it as a skill.');
      });
    }
  }

  /* =====================================================================
     Version history
     ===================================================================== */

  function paintHistoryButton(id) {
    if (!el.historyBtn) return;
    const count = id ? store.getHistory(id).length : 0;
    el.historyBtn.style.display = count ? '' : 'none';
    el.historyBtn.textContent = 'History (' + count + ')';
  }

  function openHistoryModal(id) {
    const versions = store.getHistory(id);
    const current = store.getById(id);
    const pro = store.isPro();
    el.historyTitle.textContent = 'Earlier versions of ' + (current ? '“' + current.title + '”' : 'this prompt');
    el.historyNote.textContent = pro
      ? 'Restoring puts that version back and keeps the current text as a new version, so you can undo it.'
      : 'OmniPrompt keeps these for you. Restoring a version is part of Pro.';

    if (!versions.length) {
      el.historyList.innerHTML = '<li class="history-empty">No earlier versions yet. They appear after you edit and save.</li>';
    } else {
      el.historyList.innerHTML = versions
        .map((v, idx) => {
          const when = 'Saved ' + new Date(v.at).toLocaleString();
          const preview = String(v.template || '').replace(/\s+/g, ' ').trim().slice(0, 160);
          return (
            '<li class="history-item">' +
            '<div class="history-meta"><strong>' +
            escapeHtml(v.title || 'Untitled') +
            '</strong><span>' +
            escapeHtml(when) +
            '</span></div>' +
            '<div class="history-preview">' +
            escapeHtml(preview) +
            (String(v.template || '').length > 160 ? '…' : '') +
            '</div>' +
            '<button type="button" class="btn-secondary btn-mini" data-restore="' +
            idx +
            '">' +
            (pro ? 'Restore' : '🔒 Restore (Pro)') +
            '</button>' +
            '</li>'
          );
        })
        .join('');
    }

    el.historyList.querySelectorAll('[data-restore]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const index = parseInt(btn.getAttribute('data-restore'), 10);
        try {
          await store.restoreVersion(id, index);
        } catch (err) {
          if (err && err.code === 'PRO_REQUIRED') {
            closeHistoryModal();
            openUpgradeModal('history');
            return;
          }
          showToast((err && err.message) || 'Could not restore that version.');
          return;
        }
        closeHistoryModal();
        openEditor(store.getById(id));
        renderTable();
        showToast('Version restored. The text you replaced is saved in History.');
      });
    });

    el.historyModal.style.display = 'flex';
  }

  function closeHistoryModal() {
    if (el.historyModal) el.historyModal.style.display = 'none';
  }

  /* =====================================================================
     Automatic backups
     ===================================================================== */

  const SNAPSHOT_REASONS = {
    daily: 'Daily backup',
    manual: 'Backed up by you',
    'before-import': 'Before a replace import',
    'before-restore': 'Before restoring a backup',
    'before-restore-built-ins': 'Before restoring built-ins',
    'before-update': 'Before an update'
  };

  function describeAge(at) {
    if (!at) return 'never';
    const mins = Math.round((Date.now() - at) / 60000);
    if (mins < 2) return 'just now';
    if (mins < 60) return mins + ' minutes ago';
    const hours = Math.round(mins / 60);
    if (hours < 36) return hours + ' hour' + (hours === 1 ? '' : 's') + ' ago';
    const days = Math.round(hours / 24);
    return days + ' days ago';
  }

  async function renderBackups() {
    if (!el.backupStatus || !el.snapshotList) return;
    const [status, snaps] = await Promise.all([store.getBackupStatus(), store.getSnapshots()]);

    if (!status.hasUserData && !snaps.length) {
      el.backupStatus.textContent = 'Nothing to back up yet. Backups start once you write or edit a prompt.';
    } else {
      el.backupStatus.textContent =
        'Last automatic backup: ' +
        describeAge(status.lastSnapshotAt) +
        '. Last file download: ' +
        describeAge(status.lastExportAt) +
        '.';
    }
    el.backupStatus.classList.toggle(
      'is-stale',
      status.hasUserData && (!status.lastExportAt || Date.now() - status.lastExportAt > 30 * 86400000)
    );

    el.snapshotList.innerHTML = snaps
      .map(
        (s) =>
          '<li class="snapshot-item">' +
          '<span class="snapshot-when">' +
          escapeHtml(new Date(s.at).toLocaleString()) +
          '</span>' +
          '<span class="snapshot-what">' +
          escapeHtml(SNAPSHOT_REASONS[s.reason] || s.reason) +
          ' · ' +
          s.prompts +
          ' prompt' +
          (s.prompts === 1 ? '' : 's') +
          (s.edits ? ', ' + s.edits + ' edit' + (s.edits === 1 ? '' : 's') : '') +
          '</span>' +
          '<button type="button" class="btn-table btn-mini" data-snapshot="' +
          escapeAttr(s.id) +
          '">Restore</button>' +
          '</li>'
      )
      .join('');

    el.snapshotList.querySelectorAll('[data-snapshot]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (
          !window.confirm(
            'Restore this backup?\n\nYour own prompts, edits to built-ins, categories and favourites go back to how they were then. ' +
              'What you have now is backed up first, so you can undo this.'
          )
        ) {
          return;
        }
        const res = await store.restoreSnapshot(btn.getAttribute('data-snapshot'));
        if (!res.ok) {
          showToast(res.error || 'Could not restore that backup.');
          return;
        }
        renderSidebar();
        renderCategoryOptions();
        renderTable();
        updateCounts();
        renderBackups();
        showToast('Backup restored: ' + res.prompts + ' prompt' + (res.prompts === 1 ? '' : 's') + '.');
      });
    });
  }

  function downloadText(text, filename, type) {
    const blob = new Blob([text], { type: type || 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

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

    const clash = findShortcutClash(value, el.fId.value.trim());
    el.shortcutClash.textContent = clash ? 'Already used by “' + clash.title + '”.' : '';
  }

  /** Show the author exactly what the fill-in form will ask for. */
  function updateVariablePreview() {
    const vars = template.parseVariables(el.fTemplate.value);
    const blocks = template.listBlocks(el.fTemplate.value);
    if (!vars.length && !blocks.length) {
      el.variablePreview.innerHTML =
        '<div class="variable-empty">No placeholders. This prompt inserts exactly as written.</div>';
      return;
    }

    const pro = store.isPro();
    const blockRows = blocks.map((name) => {
      const hit = store.findByShortcut(name);
      const state = !hit
        ? '<span class="var-missing">no prompt has the shortcut “' + escapeHtml(name) + '”</span>'
        : '<span class="var-auto">inserts “' + escapeHtml(hit.title) + '”</span>';
      return (
        '<div class="variable-row">' +
        '<code>{{@' +
        escapeHtml(name) +
        '}}</code>' +
        '<span class="var-label">Context block</span>' +
        state +
        (pro ? '' : '<span class="var-pro">Pro: left as written on Free</span>') +
        '</div>'
      );
    });

    el.variablePreview.innerHTML = blockRows.join('') + vars
      .map((v) => {
        const bits = [];
        const typeLabel = v.type === 'textarea' ? 'long text' : v.type === 'select' ? 'dropdown' : v.type;
        bits.push('<span class="var-type">' + escapeHtml(typeLabel) + '</span>');
        if (v.type === 'select' && v.options.length) {
          bits.push('<span class="var-default">choices: ' + escapeHtml(v.options.join(' / ')) + '</span>');
        }
        if (v.autofill) {
          bits.push(
            '<span class="var-auto">auto: ' +
              escapeHtml(template.AUTOFILL_LABELS[v.autofill] || v.autofill) +
              '</span>'
          );
        }
        if (v.default && v.type !== 'select') bits.push('<span class="var-default">default: ' + escapeHtml(v.default) + '</span>');
        if (v.hint) bits.push('<span class="var-hint">' + escapeHtml(v.hint) + '</span>');
        return (
          '<div class="variable-row">' +
          '<code>{{' +
          escapeHtml(v.name) +
          '}}</code>' +
          '<span class="var-label">' +
          escapeHtml(v.label) +
          '</span>' +
          bits.join('') +
          '</div>'
        );
      })
      .join('');
  }

  function insertAtCursor(field, text) {
    const start = field.selectionStart || 0;
    const end = field.selectionEnd || 0;
    field.value = field.value.slice(0, start) + text + field.value.slice(end);
    field.focus();
    const caret = start + text.length;
    field.setSelectionRange(caret, caret);
  }

  /* =====================================================================
     Settings
     ===================================================================== */

  function paintSettings() {
    el.slashEnabled.checked = !!settings.slashEnabled;
    el.slashChar.value = settings.slashTriggerChar;
    el.slashChar.disabled = !settings.slashEnabled;
    el.paletteEnabled.checked = !!settings.enablePalette;
    el.hotkeyDisplay.textContent = settings.paletteHotkey.display;
    el.rankFavorites.checked = !!settings.rankFavorites;
    el.rankRecents.checked = !!settings.rankRecents;
    el.syncEnabled.checked = !!settings.syncEnabled;
    if (el.selectedRole && store.getSelectedRole) {
      el.selectedRole.value = store.getSelectedRole();
    }
    paintHotkeyPresets();
    renderDisabledSites();
    renderSyncStatus();
    paintLicenseState();
  }

  function paintLicenseState() {
    if (!el.licenseTierPill) return;
    const isPro = store.isPro ? store.isPro() : false;
    const count = store.getCustomCount ? store.getCustomCount() : 0;
    const limit = store.getFreeLimit ? store.getFreeLimit() : 25;
    const lic = store.getLicense ? store.getLicense() : null;

    if (el.customPromptCount) el.customPromptCount.textContent = String(count);

    const price = store.getProInfo().price;

    if (isPro) {
      el.licenseTierPill.textContent = 'OmniPrompt Pro';
      el.licenseTierPill.className = 'pro-tier-pill pro';
      el.licenseTierDesc.innerHTML =
        'OmniPrompt Pro is <strong>active</strong> for life. You have unlimited prompts, version history and context blocks.';
      if (el.licenseActiveDetails) el.licenseActiveDetails.style.display = 'flex';
      if (lic && lic.key && el.licenseMaskedKey) {
        const clean = lic.key;
        const masked = clean.length > 8 ? '••••-••••-' + clean.slice(-4) : clean;
        el.licenseMaskedKey.textContent = masked;
      }
      if (el.licenseFreeActions) el.licenseFreeActions.style.display = 'none';
      if (el.licenseActiveActions) el.licenseActiveActions.style.display = 'block';
    } else {
      el.licenseTierPill.textContent = 'Free Tier';
      el.licenseTierPill.className = 'pro-tier-pill free';
      el.licenseTierDesc.innerHTML =
        'Free includes all 110 built-in prompts and <strong>' +
        count +
        ' / ' +
        limit +
        '</strong> of your own. Pro is a one-time ' +
        escapeHtml(price) +
        ': unlimited prompts, version history and context blocks.';
      if (el.licenseActiveDetails) el.licenseActiveDetails.style.display = 'none';
      if (el.licenseFreeActions) el.licenseFreeActions.style.display = 'block';
      if (el.licenseActiveActions) el.licenseActiveActions.style.display = 'none';
    }
  }

  function setLicenseFeedback(msg, type) {
    if (!el.licenseFeedback) return;
    el.licenseFeedback.textContent = msg;
    el.licenseFeedback.className = 'field-note license-feedback' + (type ? ' ' + type : '');
  }

  function openUpgradeModal(reason) {
    if (!el.upgradeModal) return;
    if (el.upgradeModalReason) {
      const limit = store.getFreeLimit ? store.getFreeLimit() : 25;
      const reasons = {
        limit: 'You have ' + limit + ' prompts of your own, the most Free keeps. Nothing is deleted: every prompt still works and exports.',
        history: 'Your earlier versions are saved. Pro lets you restore them.',
        blocks: 'Context blocks drop one saved prompt into another, so a client brief or style guide is written once.'
      };
      el.upgradeModalReason.textContent =
        reasons[reason] || 'One payment, yours for life. Unlimited prompts, version history and context blocks.';
    }
    if (el.upgradeModalKey) el.upgradeModalKey.value = '';
    if (el.upgradeModalFeedback) {
      el.upgradeModalFeedback.textContent = '';
      el.upgradeModalFeedback.className = 'field-note';
    }
    el.upgradeModal.style.display = 'flex';
    if (el.upgradeModalKey) {
      setTimeout(() => el.upgradeModalKey.focus(), 50);
    }
  }

  function closeUpgradeModal() {
    if (!el.upgradeModal) return;
    el.upgradeModal.style.display = 'none';
  }

  function paintHotkeyPresets() {
    document.querySelectorAll('.btn-preset-hotkey').forEach((btn) => {
      const preset = HOTKEY_PRESETS[btn.getAttribute('data-hotkey')];
      btn.classList.toggle('active', !!preset && preset.display === settings.paletteHotkey.display);
    });
  }

  async function saveSetting(key, value) {
    await store.setSetting(key, value);
    settings = store.getSettings();
    broadcastSettings();
  }

  function bindSettings() {
    if (el.selectedRole) {
      el.selectedRole.addEventListener('change', async () => {
        await store.setRole(el.selectedRole.value);
        settings = store.getSettings();
        broadcastSettings();
        renderSidebar();
        renderTable();
        const roleLabel = el.selectedRole.options[el.selectedRole.selectedIndex].text;
        showToast('Starter pack updated: ' + roleLabel);
      });
    }

    if (el.activateLicenseBtn && el.licenseKeyInput) {
      el.activateLicenseBtn.addEventListener('click', async () => {
        const key = el.licenseKeyInput.value.trim();
        if (!key) {
          setLicenseFeedback('Please enter a license key.', 'error');
          el.licenseKeyInput.focus();
          return;
        }
        el.activateLicenseBtn.disabled = true;
        el.activateLicenseBtn.textContent = 'Activating…';
        setLicenseFeedback('Validating key with Dodo Payments…', '');

        const res = await store.activateLicense(key);
        el.activateLicenseBtn.disabled = false;
        el.activateLicenseBtn.textContent = 'Activate';

        if (res.success) {
          el.licenseKeyInput.value = '';
          setLicenseFeedback('', '');
          paintLicenseState();
          updateCounts();
          showToast('OmniPrompt Pro activated! Thank you for your support.');
        } else {
          setLicenseFeedback(res.error || 'Invalid license key.', 'error');
        }
      });

      el.licenseKeyInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          el.activateLicenseBtn.click();
        }
      });
    }

    if (el.deactivateLicenseBtn) {
      el.deactivateLicenseBtn.addEventListener('click', async () => {
        if (!window.confirm('Deactivate Pro license on this browser and revert to Free tier?')) return;
        await store.deactivateLicense();
        paintLicenseState();
        updateCounts();
        showToast('License deactivated.');
      });
    }

    el.slashEnabled.addEventListener('change', async () => {
      await saveSetting('slashEnabled', el.slashEnabled.checked);
      el.slashChar.disabled = !el.slashEnabled.checked;
      renderTable();
      showToast(el.slashEnabled.checked ? 'Slash menu on.' : 'Slash menu off.');
    });

    el.slashChar.addEventListener('change', async () => {
      await saveSetting('slashTriggerChar', el.slashChar.value);
      updateShortcutPreview();
      renderTable();
      showToast('Trigger is now ' + el.slashChar.value);
    });

    el.paletteEnabled.addEventListener('change', async () => {
      await saveSetting('enablePalette', el.paletteEnabled.checked);
      showToast(el.paletteEnabled.checked ? 'Palette on.' : 'Palette off.');
    });

    el.rankFavorites.addEventListener('change', async () => {
      await saveSetting('rankFavorites', el.rankFavorites.checked);
      renderTable();
    });

    el.rankRecents.addEventListener('change', async () => {
      await saveSetting('rankRecents', el.rankRecents.checked);
      renderTable();
    });

    el.syncEnabled.addEventListener('change', async () => {
      const result = await store.setSyncEnabled(el.syncEnabled.checked);
      settings = store.getSettings();
      renderSyncStatus();
      if (result && result.ok === false) {
        showToast(result.error || 'Sync could not be turned on.');
      } else {
        showToast(el.syncEnabled.checked ? 'Sync on.' : 'Sync off. Data stays on this computer.');
      }
    });

    el.resetHotkey.addEventListener('click', async () => {
      await saveSetting('paletteHotkey', store.DEFAULT_HOTKEY);
      el.hotkeyDisplay.textContent = settings.paletteHotkey.display;
      paintHotkeyPresets();
      showToast('Shortcut reset to Alt+K.');
    });

    document.querySelectorAll('.btn-preset-hotkey').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const preset = HOTKEY_PRESETS[btn.getAttribute('data-hotkey')];
        if (!preset) return;
        await saveSetting('paletteHotkey', preset);
        el.hotkeyDisplay.textContent = settings.paletteHotkey.display;
        paintHotkeyPresets();
        showToast('Shortcut set to ' + settings.paletteHotkey.display);
      });
    });

    el.hotkeyRecorder.addEventListener('click', startRecording);
    el.hotkeyRecorder.addEventListener('keydown', handleRecorderKey);
    el.hotkeyRecorder.addEventListener('blur', () => {
      if (recordingHotkey) stopRecording();
    });

    el.chromeShortcuts.addEventListener('click', () => {
      // chrome:// URLs cannot be opened by an extension, so give the user the
      // address to paste instead of failing silently.
      chrome.tabs.create({ url: 'chrome://extensions/shortcuts' }, () => {
        if (chrome.runtime.lastError) {
          copyText('chrome://extensions/shortcuts').then((ok) => {
            showToast(
              ok
                ? 'Address copied. Paste chrome://extensions/shortcuts into a new tab.'
                : 'Open chrome://extensions/shortcuts in a new tab.'
            );
          });
        }
      });
    });

    el.addDisabledSite.addEventListener('click', addDisabledSite);
    el.newDisabledSite.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addDisabledSite();
      }
    });
  }

  function startRecording() {
    recordingHotkey = true;
    el.hotkeyRecorder.classList.add('recording');
    el.hotkeyDisplay.textContent = 'Press keys… (Esc to cancel)';
    el.hotkeyRecorder.focus();
  }

  function stopRecording() {
    recordingHotkey = false;
    el.hotkeyRecorder.classList.remove('recording');
    el.hotkeyDisplay.textContent = settings.paletteHotkey.display;
  }

  async function handleRecorderKey(e) {
    if (!recordingHotkey) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        startRecording();
      }
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    if (e.key === 'Escape') {
      stopRecording();
      return;
    }

    // Show the combination building up while modifiers are held.
    if (['Control', 'Shift', 'Alt', 'Meta'].indexOf(e.key) !== -1) {
      const held = [];
      if (e.ctrlKey) held.push('Ctrl');
      if (e.altKey) held.push('Alt');
      if (e.shiftKey) held.push('Shift');
      if (e.metaKey) held.push('Cmd');
      el.hotkeyDisplay.textContent = held.join('+') + '+…';
      return;
    }

    // A bare letter would fire while typing in any text box.
    if (!e.ctrlKey && !e.altKey && !e.metaKey) {
      el.hotkeyDisplay.textContent = 'Add Ctrl, Alt or Cmd';
      return;
    }

    const hotkey = store.normalizeHotkey({
      key: e.key.toLowerCase(),
      code: e.code,
      ctrlKey: e.ctrlKey,
      altKey: e.altKey,
      shiftKey: e.shiftKey,
      metaKey: e.metaKey
    });

    await saveSetting('paletteHotkey', hotkey);
    stopRecording();
    paintHotkeyPresets();
    showToast('Shortcut saved: ' + settings.paletteHotkey.display);
  }

  function renderDisabledSites() {
    const list = settings.disabledSites || [];
    if (!list.length) {
      el.disabledSites.innerHTML = '<span class="muted-note">None. OmniPrompt is active everywhere.</span>';
      return;
    }
    el.disabledSites.innerHTML = list
      .map(
        (host) =>
          '<span class="site-chip">' +
          escapeHtml(host) +
          '<button type="button" data-remove-site="' +
          escapeAttr(host) +
          '" title="Remove">✕</button></span>'
      )
      .join('');

    el.disabledSites.querySelectorAll('[data-remove-site]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        await store.setSiteDisabled(btn.getAttribute('data-remove-site'), false);
        settings = store.getSettings();
        renderDisabledSites();
        broadcastSettings();
        showToast('Site removed.');
      });
    });
  }

  async function addDisabledSite() {
    const raw = el.newDisabledSite.value.trim();
    if (!raw) return;

    // Accept a pasted URL as well as a bare hostname.
    let host = raw.toLowerCase();
    try {
      if (host.indexOf('://') !== -1) host = new URL(host).hostname;
    } catch (e) {
      /* treat it as a hostname */
    }
    host = host.replace(/^www\./, '').replace(/\/.*$/, '');
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(host)) {
      showToast('That does not look like a hostname. Try example.com');
      return;
    }

    await store.setSiteDisabled(host, true);
    settings = store.getSettings();
    el.newDisabledSite.value = '';
    renderDisabledSites();
    broadcastSettings();
    showToast('OmniPrompt is off on ' + host);
  }

  function renderSyncStatus() {
    const status = store.getSyncStatus();
    if (!status.available) {
      el.syncStatus.textContent = 'Chrome sync storage is not available in this browser.';
      return;
    }
    if (!status.enabled) {
      el.syncStatus.textContent = '';
      return;
    }
    if (status.lastError) {
      el.syncStatus.innerHTML = '<span class="sync-warn">' + escapeHtml(status.lastError) + '</span>';
      return;
    }
    const used = Math.round((status.bytes / 1024) * 10) / 10;
    const limit = Math.round(status.limitBytes / 1024);
    el.syncStatus.textContent = 'Syncing. Using about ' + used + 'KB of ' + limit + 'KB.';
  }

  /* =====================================================================
     Backup and import
     ===================================================================== */

  function bindDataView() {
    el.exportBtn.addEventListener('click', () => {
      const includeLibrary = el.exportIncludeLibrary.checked;
      const bundle = store.exportBundle({ includeLibrary });
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download =
        'omniprompt-' +
        (includeLibrary ? 'full-' : 'mine-') +
        new Date().toISOString().slice(0, 10) +
        '.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      store.markExported().then(renderBackups);
      showToast('Exported ' + bundle.counts.prompts + ' prompt' + (bundle.counts.prompts === 1 ? '' : 's') + '.');
    });

    if (el.snapshotNow) {
      el.snapshotNow.addEventListener('click', async () => {
        const snap = await store.takeSnapshot('manual');
        await renderBackups();
        showToast(snap ? 'Backed up ' + snap.prompts + ' prompt' + (snap.prompts === 1 ? '' : 's') + '.' : 'Nothing to back up yet.');
      });
    }

    el.importFile.setAttribute('accept', importers.ACCEPT);
    el.importFile.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      const replace = el.importReplace.checked;
      if (replace) {
        const mine = store.getAll().filter((p) => p.isCustom).length;
        if (
          mine &&
          !window.confirm(
            'Replace mode will delete your existing ' +
              mine +
              ' prompt' +
              (mine === 1 ? '' : 's') +
              ' before importing.\n\nContinue?'
          )
        ) {
          e.target.value = '';
          return;
        }
      }

      const reader = new FileReader();
      reader.onload = async (ev) => {
        const result = await store.importBundle(String(ev.target.result || ''), {
          mode: replace ? 'replace' : 'merge',
          applyLibraryDeltas: true
        });
        e.target.value = '';

        if (!result.ok) {
          showToast(result.error || 'Could not read that file.');
          return;
        }
        renderSidebar();
        renderCategoryOptions();
        renderTable();
        updateCounts();
        showToast(
          'Imported ' +
            result.added +
            ' prompt' +
            (result.added === 1 ? '' : 's') +
            (result.skipped ? ', skipped ' + result.skipped + ' duplicate(s)' : '') +
            ' from ' +
            result.source +
            '.'
        );
      };
      reader.onerror = () => {
        e.target.value = '';
        showToast('Could not read that file.');
      };
      reader.readAsText(file);
    });

    el.factoryReset.addEventListener('click', async () => {
      const all = store.getAll();
      const mine = all.filter((p) => p.isCustom).length;
      const edited = all.filter((p) => p.isEdited).length;
      const hidden = store.getBuiltins().length - all.filter((p) => !p.isCustom).length;

      const message =
        'Restore the built-in library?\n\n' +
        '• Undoes ' + edited + ' edit(s) to built-in prompts\n' +
        '• Brings back ' + hidden + ' hidden built-in prompt(s)\n' +
        '• Keeps all ' + mine + ' of your own prompts, folders and favourites';

      if (!window.confirm(message)) return;

      const result = await store.restoreDefaultLibrary();
      renderSidebar();
      renderTable();
      updateCounts();
      showToast('Restored ' + result.promptsRestored + ', undid ' + result.patchesCleared + ' edit(s).');
    });

    el.eraseAll.addEventListener('click', async () => {
      const mine = store.getAll().filter((p) => p.isCustom).length;
      if (
        !window.confirm(
          'Erase everything?\n\nThis deletes your ' +
            mine +
            ' prompt(s), folders, favourites, usage history and settings from this browser. It cannot be undone.'
        )
      ) {
        return;
      }

      // A second, typed confirmation, because there is no undo.
      const typed = await askForText({
        title: 'Type ERASE to confirm',
        label: 'Confirmation',
        note: 'This permanently deletes your prompts. Export first if you are unsure.',
        confirm: 'Erase everything'
      });
      if (String(typed || '').trim().toUpperCase() !== 'ERASE') {
        showToast('Nothing was deleted.');
        return;
      }

      await store.eraseAllData();
      settings = store.getSettings();
      paintSettings();
      renderSidebar();
      renderCategoryOptions();
      renderTable();
      updateCounts();
      broadcastSettings();
      showToast('Everything erased. The built-in library is back.');
    });
  }

  /* =====================================================================
     Variable modal (copy path)
     ===================================================================== */

  let modalPrompt = null;
  const modalCache = {};

  function bindModals() {
    bindCategoryModal();

    el.modalClose.addEventListener('click', closeVariableModal);
    el.modalCancel.addEventListener('click', closeVariableModal);
    el.modalCopy.addEventListener('click', finishCopy);
    el.modal.addEventListener('mousedown', (e) => {
      if (e.target === el.modal) closeVariableModal();
    });

    el.textModalClose.addEventListener('click', () => resolveTextModal(null));
    el.textModalCancel.addEventListener('click', () => resolveTextModal(null));
    el.textModalConfirm.addEventListener('click', () => resolveTextModal(el.textModalInput.value));
    el.textModalInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        resolveTextModal(el.textModalInput.value);
      }
    });

    if (el.upgradeModalClose) el.upgradeModalClose.addEventListener('click', closeUpgradeModal);
    if (el.upgradeModalCancel) el.upgradeModalCancel.addEventListener('click', closeUpgradeModal);
    if (el.upgradeModal) {
      el.upgradeModal.addEventListener('mousedown', (e) => {
        if (e.target === el.upgradeModal) closeUpgradeModal();
      });
    }

    if (el.upgradeModalActivate && el.upgradeModalKey) {
      el.upgradeModalActivate.addEventListener('click', async () => {
        const key = el.upgradeModalKey.value.trim();
        if (!key) {
          if (el.upgradeModalFeedback) {
            el.upgradeModalFeedback.textContent = 'Please enter a license key.';
            el.upgradeModalFeedback.className = 'field-note license-feedback error';
          }
          el.upgradeModalKey.focus();
          return;
        }
        el.upgradeModalActivate.disabled = true;
        el.upgradeModalActivate.textContent = 'Activating…';
        if (el.upgradeModalFeedback) {
          el.upgradeModalFeedback.textContent = 'Checking key…';
          el.upgradeModalFeedback.className = 'field-note license-feedback';
        }

        const res = await store.activateLicense(key);
        el.upgradeModalActivate.disabled = false;
        el.upgradeModalActivate.textContent = 'Activate';

        if (res.success) {
          closeUpgradeModal();
          paintLicenseState();
          updateCounts();
          showToast('OmniPrompt Pro activated! Unlimited prompts unlocked.');
        } else {
          if (el.upgradeModalFeedback) {
            el.upgradeModalFeedback.textContent = res.error || 'Invalid license key.';
            el.upgradeModalFeedback.className = 'field-note license-feedback error';
          }
        }
      });

      el.upgradeModalKey.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          el.upgradeModalActivate.click();
        }
      });
    }

    if (el.historyClose) el.historyClose.addEventListener('click', closeHistoryModal);
    if (el.historyDone) el.historyDone.addEventListener('click', closeHistoryModal);
    if (el.historyModal) {
      el.historyModal.addEventListener('mousedown', (e) => {
        if (e.target === el.historyModal) closeHistoryModal();
      });
    }

    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      if (el.historyModal && el.historyModal.style.display === 'flex') {
        e.preventDefault();
        closeHistoryModal();
        return;
      }
      if (el.upgradeModal && el.upgradeModal.style.display === 'flex') {
        e.preventDefault();
        closeUpgradeModal();
        return;
      }
      if (el.catModal && el.catModal.style.display === 'flex') {
        e.preventDefault();
        closeCategoryModal();
        return;
      }
      if (el.textModal.style.display === 'flex') {
        e.preventDefault();
        resolveTextModal(null);
        return;
      }
      if (el.modal.style.display === 'flex') {
        e.preventDefault();
        closeVariableModal();
      }
    });
  }

  function copyPrompt(id) {
    const found = store.getById(id);
    if (!found) return;
    // Context blocks are expanded here too, so a copy matches an insert.
    const prompt = store.prepareForUse(found).prompt || found;

    if (template.variableCount(prompt) === 0) {
      copyText(prompt.template).then((ok) => {
        if (ok) store.recordUse(id);
        showToast(ok ? 'Copied to clipboard.' : 'Could not copy.');
      });
      return;
    }
    openVariableModal(prompt);
  }

  function openVariableModal(prompt) {
    modalPrompt = prompt;
    el.modalTitle.textContent = prompt.title;

    // This page has no chat selection or URL to offer, so only date, time and
    // inline defaults resolve. Badges say exactly that.
    const initial = template.buildInitialValues(
      prompt,
      { selection: '', url: '', title: '' },
      { allowClipboard: false, cached: modalCache[prompt.id] || {} }
    );

    el.modalFields.innerHTML = initial.variables
      .map((v, idx) => {
        const badgeText = template.autofillBadge(initial.filledFrom[v.name]);
        const badge = badgeText ? '<span class="tag-badge badge-auto">' + escapeHtml(badgeText) + '</span>' : '';
        const value = initial.values[v.name] || '';
        const id = 'opt-var-' + idx;
        const placeholder = v.hint || 'Enter ' + v.label.toLowerCase();

        const control =
          v.type === 'select' && v.options.length
            ? '<select class="modal-var-input" id="' +
              id +
              '" data-var="' +
              escapeAttr(v.name) +
              '">' +
              v.options
                .map(
                  (o) =>
                    '<option value="' +
                    escapeAttr(o) +
                    '"' +
                    (o === value ? ' selected' : '') +
                    '>' +
                    escapeHtml(o) +
                    '</option>'
                )
                .join('') +
              '</select>'
            : v.type === 'textarea'
            ? '<textarea class="modal-var-input" id="' +
              id +
              '" data-var="' +
              escapeAttr(v.name) +
              '" rows="3" placeholder="' +
              escapeAttr(placeholder) +
              '">' +
              escapeHtml(value) +
              '</textarea>'
            : '<input type="text" class="modal-var-input" id="' +
              id +
              '" data-var="' +
              escapeAttr(v.name) +
              '" value="' +
              escapeAttr(value) +
              '" placeholder="' +
              escapeAttr(placeholder) +
              '" />';

        return (
          '<div class="form-group">' +
          '<label for="' +
          id +
          '" class="modal-field-label"><span>' +
          escapeHtml(v.label) +
          '</span>' +
          badge +
          '</label>' +
          control +
          '</div>'
        );
      })
      .join('');

    el.modalFields.querySelectorAll('[data-var]').forEach((field) => {
      field.addEventListener('input', updateModalPreview);
      field.addEventListener('change', updateModalPreview);
      field.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
          e.preventDefault();
          finishCopy();
        }
      });
    });

    updateModalPreview();
    el.modal.style.display = 'flex';
    const first = el.modalFields.querySelector('[data-var]');
    if (first) first.focus();
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
        result.missing.length + ' field(s) still empty. They will show as placeholders.';
      el.modalWarning.style.display = 'block';
    } else {
      el.modalWarning.style.display = 'none';
    }
  }

  async function finishCopy() {
    if (!modalPrompt) return;
    const values = readModalValues();
    const text = template.render(modalPrompt.template, values);
    const id = modalPrompt.id;
    const ok = await copyText(text);
    if (ok) store.recordUse(id);
    showToast(ok ? 'Copied to clipboard.' : 'Could not copy.');
    closeVariableModal();
  }

  function closeVariableModal() {
    el.modal.style.display = 'none';
    modalPrompt = null;
  }

  /* =====================================================================
     Text input dialog, replacing window.prompt
     ===================================================================== */

  let textModalResolve = null;

  /**
   * An in-page replacement for window.prompt. Native dialogs are blocked in
   * some contexts and cannot be styled or validated.
   */
  function askForText(options) {
    const opts = options || {};
    el.textModalTitle.textContent = opts.title || 'Enter a value';
    el.textModalLabel.textContent = opts.label || 'Value';
    el.textModalNote.textContent = opts.note || '';
    el.textModalConfirm.textContent = opts.confirm || 'Save';
    el.textModalInput.value = opts.value || '';
    el.textModal.style.display = 'flex';
    el.textModalInput.focus();
    el.textModalInput.select();

    return new Promise((resolve) => {
      textModalResolve = resolve;
    });
  }

  function resolveTextModal(value) {
    el.textModal.style.display = 'none';
    const resolve = textModalResolve;
    textModalResolve = null;
    if (resolve) resolve(value === null || value === undefined ? null : String(value).trim() || null);
  }

  /* =====================================================================
     Plumbing
     ===================================================================== */

  function broadcastSettings() {
    chrome.runtime.sendMessage({ action: 'broadcast_settings' }, () => void chrome.runtime.lastError);
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(
        () => true,
        () => fallbackCopy(text)
      );
    }
    return Promise.resolve(fallbackCopy(text));
  }

  function fallbackCopy(text) {
    try {
      const area = document.createElement('textarea');
      area.value = text;
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

  let toastTimer = null;

  function showToast(message) {
    el.toast.textContent = message;
    el.toast.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.toast.classList.remove('show'), 3000);
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
});
