/**
 * OmniPrompt - Options dashboard
 *
 * Library table, prompt editor, folders, settings, backup and import,
 * plan and licence, workspaces, chains, folder sync and library tools.
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

  // Shortcut labels use the Mac key symbols on a Mac (Alt+K reads ⌥K). The
  // stored display string stays "Alt+K".
  const hotkeyLabel = (hk) => store.formatHotkey(hk, store.isMacPlatform());

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

  // Shown where folder sync cannot work: there is no window.showDirectoryPicker.
  const UNSUPPORTED_FOLDER_SYNC =
    'Folder sync needs a browser that lets extensions use a folder, such as Chrome or Edge. ' +
    'Brave turns this off by default. Export and automatic backups still work.';

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
    sidebarToggleBtn: document.getElementById('btn-toggle-sidebar'),
    sidebarSearchTrigger: document.getElementById('sidebar-search-trigger'),
    sidebarSectionToggles: document.querySelectorAll('.sidebar-section-toggle'),

    search: document.getElementById('options-search'),
    activeFilter: document.getElementById('active-filter'),
    tableBody: document.getElementById('prompt-table-body'),
    createBtn: document.getElementById('btn-create-new-prompt'),

    form: document.getElementById('editor-form'),
    heading: document.getElementById('editor-heading'),
    builtinNotice: document.getElementById('builtin-notice'),
    fId: document.getElementById('edit-id'),
    fTitle: document.getElementById('edit-title'),
    editTitleError: document.getElementById('edit-title-error'),
    fCategory: document.getElementById('edit-category'),
    editAddCategory: document.getElementById('btn-edit-add-category'),
    fShortcut: document.getElementById('edit-shortcut'),
    editShortcutError: document.getElementById('edit-shortcut-error'),
    fTags: document.getElementById('edit-tags'),
    fDescription: document.getElementById('edit-description'),
    fNotes: document.getElementById('edit-notes'),
    fTemplate: document.getElementById('edit-template'),
    editTemplateError: document.getElementById('edit-template-error'),
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
    newDisabledSiteError: document.getElementById('new-disabled-site-error'),
    addDisabledSite: document.getElementById('btn-add-disabled-site'),

    everywhereEnabled: document.getElementById('setting-everywhere-enabled'),
    everywhereStatus: document.getElementById('everywhere-status'),
    newEnabledSite: document.getElementById('new-enabled-site'),
    newEnabledSiteError: document.getElementById('new-enabled-site-error'),
    btnAddEnabledSite: document.getElementById('btn-add-enabled-site'),
    enabledSitesList: document.getElementById('enabled-sites-list'),

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
    buyProLabel: document.getElementById('buy-pro-label'),
    licenseFeedback: document.getElementById('license-feedback'),

    upgradeModal: document.getElementById('upgrade-modal'),
    upgradeModalTitle: document.getElementById('upgrade-modal-title'),
    upgradeModalReason: document.getElementById('upgrade-modal-reason'),
    upgradeModalClose: document.getElementById('btn-close-upgrade-modal'),
    upgradeModalKey: document.getElementById('upgrade-modal-key'),
    upgradeModalActivate: document.getElementById('btn-upgrade-modal-activate'),
    upgradeModalFeedback: document.getElementById('upgrade-modal-feedback'),
    upgradeModalCancel: document.getElementById('btn-upgrade-modal-cancel'),
    upgradeModalBuy: document.getElementById('link-upgrade-modal-buy'),
    upgradeModalContent: document.querySelector('#upgrade-modal .upgrade-modal-content'),
    upgradeModalHeadline: document.getElementById('upgrade-modal-headline'),
    upgradeModalMeter: document.getElementById('upgrade-modal-meter'),
    upgradeModalMeterFill: document.getElementById('upgrade-modal-meter-fill'),
    upgradeModalMeterLabel: document.getElementById('upgrade-modal-meter-label'),
    upgradeModalProof: document.getElementById('upgrade-modal-proof'),
    upgradeModalBenefits: document.getElementById('upgrade-modal-benefits'),
    upgradeModalPrice: document.getElementById('upgrade-modal-price'),
    upgradeModalKeepFree: document.getElementById('upgrade-modal-keep-free'),
    upgradeModalKeyBox: document.getElementById('upgrade-modal-key-box'),

    // Pro: library tools
    folderList: document.getElementById('sidebar-folder-list'),
    addFolder: document.getElementById('btn-add-folder'),
    tagList: document.getElementById('sidebar-tag-list'),
    tidyBtn: document.getElementById('btn-tidy-up'),
    selectAll: document.getElementById('select-all-rows'),
    bulkBar: document.getElementById('bulk-bar'),
    bulkCount: document.getElementById('bulk-count'),
    bulkFolder: document.getElementById('bulk-folder'),
    bulkCategory: document.getElementById('bulk-category'),
    bulkAddTag: document.getElementById('bulk-add-tag'),
    bulkRemoveTag: document.getElementById('bulk-remove-tag'),
    bulkFavourite: document.getElementById('bulk-favourite'),
    bulkDelete: document.getElementById('bulk-delete'),
    bulkClear: document.getElementById('bulk-clear'),
    fFolder: document.getElementById('edit-folder'),
    tidyModal: document.getElementById('tidy-modal'),
    tidySections: document.getElementById('tidy-sections'),
    tidyClose: document.getElementById('btn-close-tidy-modal'),
    tidyCancel: document.getElementById('btn-tidy-cancel'),
    tidyDelete: document.getElementById('btn-tidy-delete'),

    // Pro: workspaces
    newWorkspace: document.getElementById('btn-new-workspace'),
    workspaceList: document.getElementById('workspace-list'),
    workspaceEditor: document.getElementById('workspace-editor'),
    workspaceEmpty: document.getElementById('workspace-empty'),
    wsActiveBanner: document.getElementById('ws-active-banner'),
    wsActiveName: document.getElementById('ws-active-name'),
    wsActiveCount: document.getElementById('ws-active-count'),
    wsDeactivateBanner: document.getElementById('btn-ws-deactivate-banner'),
    wsFreeNotice: document.getElementById('ws-free-notice'),
    wsFreeUpgrade: document.getElementById('btn-ws-free-upgrade'),
    wsId: document.getElementById('ws-id'),
    wsNameGroup: document.getElementById('ws-name-group'),
    wsName: document.getElementById('ws-name'),
    wsNameError: document.getElementById('ws-name-error'),
    wsFields: document.getElementById('ws-fields'),
    wsFieldsError: document.getElementById('ws-fields-error'),
    wsKeySuggestions: document.getElementById('ws-key-suggestions'),
    wsAddField: document.getElementById('btn-ws-add-field'),
    wsDelete: document.getElementById('btn-ws-delete'),
    wsUse: document.getElementById('btn-ws-use'),

    // Pro: chains
    newChain: document.getElementById('btn-new-chain'),
    chainList: document.getElementById('chain-list'),
    chainEditor: document.getElementById('chain-editor'),
    chainEmpty: document.getElementById('chain-empty'),
    chainFreeNotice: document.getElementById('chain-free-notice'),
    chainId: document.getElementById('chain-id'),
    chainTitle: document.getElementById('chain-title'),
    chainTitleError: document.getElementById('chain-title-error'),
    chainShortcut: document.getElementById('chain-shortcut'),
    chainShortcutNote: document.getElementById('chain-shortcut-note'),
    chainDescription: document.getElementById('chain-description'),
    chainStepsCount: document.getElementById('chain-steps-count'),
    chainStepsError: document.getElementById('chain-steps-error'),
    chainLiveRegion: document.getElementById('chain-live-region'),
    chainSteps: document.getElementById('chain-steps'),
    chainAddStep: document.getElementById('btn-chain-add-step'),
    chainAddFromPrompt: document.getElementById('chain-add-from-prompt'),
    chainDelete: document.getElementById('btn-chain-delete'),
    chainSaveBtn: document.getElementById('btn-chain-save'),

    // Pro: folder sync and remembered answers
    folderSyncStatus: document.getElementById('folder-sync-status'),
    folderSyncChoose: document.getElementById('btn-folder-sync-choose'),
    folderSyncNow: document.getElementById('btn-folder-sync-now'),
    folderSyncStop: document.getElementById('btn-folder-sync-stop'),
    forgetRemembered: document.getElementById('btn-forget-remembered'),

    modalTools: document.getElementById('opt-modal-tools'),

    // Custom modifiers (Pro)
    newModifier: document.getElementById('btn-new-modifier'),
    modifierList: document.getElementById('modifier-list'),
    modifierEditor: document.getElementById('modifier-editor'),
    modifierEmpty: document.getElementById('modifier-empty'),
    modifierFreeNotice: document.getElementById('modifier-free-notice'),
    modId: document.getElementById('mod-id'),
    modTitle: document.getElementById('mod-title'),
    modTitleError: document.getElementById('mod-title-error'),
    modPlacement: document.getElementById('mod-placement'),
    modDesc: document.getElementById('mod-desc'),
    modInstruction: document.getElementById('mod-instruction'),
    modInstructionError: document.getElementById('mod-instruction-error'),
    modDelete: document.getElementById('btn-mod-delete'),
    modSave: document.getElementById('btn-mod-save'),

    // Site rules (Pro)
    newRule: document.getElementById('btn-new-rule'),
    ruleList: document.getElementById('rule-list'),
    ruleEditor: document.getElementById('rule-editor'),
    ruleEmpty: document.getElementById('rule-empty'),
    ruleFreeNotice: document.getElementById('rule-free-notice'),
    ruleId: document.getElementById('rule-id'),
    ruleName: document.getElementById('rule-name'),
    ruleNameError: document.getElementById('rule-name-error'),
    ruleHosts: document.getElementById('rule-hosts'),
    ruleHostsError: document.getElementById('rule-hosts-error'),
    ruleHostPermBanner: document.getElementById('rule-host-perm-banner'),
    ruleHostPermText: document.getElementById('rule-host-perm-text'),
    btnRuleGrantHost: document.getElementById('btn-rule-grant-host'),
    ruleTags: document.getElementById('rule-tags'),
    ruleFolders: document.getElementById('rule-folders'),
    ruleDelete: document.getElementById('btn-rule-delete'),
    ruleSave: document.getElementById('btn-rule-save'),
    editSiteRules: document.getElementById('edit-site-rules'),

    // Compare across AIs modal
    compareModal: document.getElementById('options-compare-modal'),
    compareModalTitle: document.getElementById('opt-compare-title'),
    compareModalClose: document.getElementById('btn-close-compare-modal'),
    compareModalTargets: document.getElementById('opt-compare-targets'),
    compareModalAutosend: document.getElementById('opt-compare-autosend'),
    compareModalPreview: document.getElementById('opt-compare-preview'),
    compareModalWarning: document.getElementById('opt-compare-warning'),
    compareModalCancel: document.getElementById('btn-opt-compare-cancel'),
    compareModalStart: document.getElementById('btn-opt-compare-start'),

    // Library layout and the read-only preview drawer
    appLayout: document.getElementById('app-layout'),
    libraryTitle: document.getElementById('library-title'),
    viewOpts: document.querySelectorAll('.view-opt'),
    drawer: document.getElementById('prompt-drawer'),
    drawerCat: document.getElementById('drawer-cat'),
    drawerFav: document.getElementById('drawer-fav'),
    drawerClose: document.getElementById('btn-close-drawer'),
    drawerTitle: document.getElementById('drawer-title'),
    drawerDesc: document.getElementById('drawer-desc'),
    drawerMeta: document.getElementById('drawer-meta'),
    drawerTemplate: document.getElementById('drawer-template'),
    drawerFields: document.getElementById('drawer-fields'),
    drawerNotes: document.getElementById('drawer-notes'),
    drawerDelete: document.getElementById('drawer-delete'),
    drawerDuplicate: document.getElementById('drawer-duplicate'),
    drawerEdit: document.getElementById('drawer-edit'),
    drawerCopy: document.getElementById('drawer-copy'),
    drawerCompare: document.getElementById('drawer-compare')
  };

  // Small inline icons for generated markup. One stroke weight (.ico in base.css).
  const ICONS = {
    star: '<svg class="ico ico-sm" viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3.2 2.7 5.5 6 .9-4.4 4.2 1 6-5.3-2.8-5.4 2.8 1-6-4.3-4.2 6-.9z"></path></svg>',
    edit: '<svg class="ico ico-sm" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h8.5"></path><path d="M16.4 3.6a2.1 2.1 0 0 1 3 3L7.2 18.8 3.5 19.7l.9-3.7Z"></path></svg>',
    copy: '<svg class="ico ico-sm" viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="11.5" height="11.5" rx="2.2"></rect><path d="M15 9V5.7A2.2 2.2 0 0 0 12.8 3.5H5.7a2.2 2.2 0 0 0-2.2 2.2v7.1A2.2 2.2 0 0 0 5.7 15H9"></path></svg>',
    duplicate: '<svg class="ico ico-sm" viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12.5" height="12.5" rx="2.2"></rect><path d="M16 8V5.7a2.2 2.2 0 0 0-2.2-2.2H5.7a2.2 2.2 0 0 0-2.2 2.2v8.1A2.2 2.2 0 0 0 5.7 16H8"></path><path d="M14.2 11.5v5.5M11.5 14.2H17"></path></svg>',
    trash: '<svg class="ico ico-sm" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16"></path><path d="M10 11v6M14 11v6"></path><path d="M5.5 7l1 12a2 2 0 0 0 2 1.8h7a2 2 0 0 0 2-1.8l1-12"></path><path d="M9 7V4.8A1.3 1.3 0 0 1 10.3 3.5h3.4A1.3 1.3 0 0 1 15 4.8V7"></path></svg>',
    search: '<svg class="ico ico-lg" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.6-3.6"></path></svg>',
    starLg: '<svg class="ico ico-lg" viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3.2 2.7 5.5 6 .9-4.4 4.2 1 6-5.3-2.8-5.4 2.8 1-6-4.3-4.2 6-.9z"></path></svg>',
    folderLg: '<svg class="ico ico-lg" viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 7.5a2 2 0 0 1 2-2h3.7l2 2.2h7.3a2 2 0 0 1 2 2v7.8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2Z"></path></svg>',
    folder: '<svg class="ico ico-sm" viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 7.5a2 2 0 0 1 2-2h3.7l2 2.2h7.3a2 2 0 0 1 2 2v7.8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2Z"></path></svg>',
    compare: '<svg class="ico ico-sm" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="7" height="16" rx="1.5"></rect><rect x="14" y="4" width="7" height="16" rx="1.5"></rect></svg>'
  };

  // The prompt shown in the preview drawer, or '' when it is closed.
  let drawerId = '';

  // Rows ticked for bulk edit, by prompt id.
  const selected = new Set();

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
    bindSidebarUX();
    bindLibrary();
    bindLibraryTools();
    bindEditor();
    bindWorkspaces();
    bindChains();
    bindModifiers();
    bindRules();
    bindCompareModal();
    bindSettings();
    bindFolderSync();
    bindDataView();
    bindModals();
    bindDrawer();
    bindLayoutToggle();
    bindPageKeys();

    paintLayout();
    paintSettings();
    renderSidebar();
    renderCategoryOptions();
    renderTable();
    updateCounts();
    paintCheckoutLinks();
    renderWorkspaces();
    renderChains();
    renderModifiers();
    renderRules();

    handleUrlParams();

    // Opening the library is a natural moment for the daily backup.
    store.maybeDailySnapshot().then(renderBackups, renderBackups);

    // Pro: pick up changes made on other computers. Quiet if not set up.
    folderSync({ interactive: false, quiet: true });

    store.onChange((reason) => {
      settings = store.getSettings();
      applyTheme();
      renderSidebar();
      renderTable();
      updateCounts();
      renderDisabledSites();
      renderEverywhereStatus();
      renderEnabledSites();
      renderSyncStatus();
      renderWorkspaces();
      renderChains();
      renderModifiers();
      renderRules();
      paintDrawer();
      paintLayout();
      if (
        reason === 'snapshot' ||
        reason === 'snapshot-restored' ||
        reason === 'imported' ||
        reason === 'folder-synced'
      ) {
        renderBackups();
      }
      if (reason === 'folder-sync-meta' || reason === 'license-changed') renderFolderSyncStatus();
      if (LOCAL_EDIT_REASONS.indexOf(reason) !== -1) scheduleFolderSync();
    });
  }

  // Changes made on this page that folder sync should write out. Changes
  // that arrive from elsewhere ('external', 'folder-synced') are left out so
  // a sync never triggers another sync.
  const LOCAL_EDIT_REASONS = [
    'prompt-saved',
    'prompt-deleted',
    'imported',
    'favorites',
    'folders',
    'categories',
    'defaults-restored',
    'snapshot-restored',
    'bulk-updated',
    'workspaces',
    'chains',
    'variable-sets',
    'custom-modifiers',
    'site-rules'
  ];

  /** Every "buy" link points at the one checkout URL the store defines. */
  function paintCheckoutLinks() {
    const info = store.getProInfo();
    [el.buyProLink, el.upgradeModalBuy].forEach((link) => {
      if (link) link.href = info.checkoutUrl;
    });
    if (el.buyProLabel) {
      el.buyProLabel.textContent = 'Get Pro for ' + info.price + ', once';
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
          filter = { category: 'All' };
          searchQuery = '';
          el.search.value = '';
          renderSidebar();
          renderTable();
        }
        showView(view);
      });
    });
  }

  function bindSidebarUX() {
    const COLLAPSED_KEY = 'omni.sidebar_collapsed';
    const SECTIONS_KEY = 'omni.sidebar.collapsed_sections';

    function setSidebarCollapsed(collapsed) {
      if (!el.appLayout) return;
      el.appLayout.classList.toggle('sidebar-collapsed', !!collapsed);
      try {
        localStorage.setItem(COLLAPSED_KEY, collapsed ? '1' : '0');
      } catch (_) {}
      if (el.sidebarToggleBtn) {
        el.sidebarToggleBtn.setAttribute('title', collapsed ? 'Expand sidebar ([)' : 'Collapse sidebar ([)');
        el.sidebarToggleBtn.setAttribute('aria-label', collapsed ? 'Expand sidebar' : 'Collapse sidebar');
      }
    }

    try {
      if (localStorage.getItem(COLLAPSED_KEY) === '1') {
        setSidebarCollapsed(true);
      }
    } catch (_) {}

    if (el.sidebarToggleBtn) {
      el.sidebarToggleBtn.addEventListener('click', () => {
        const isCollapsed = el.appLayout && el.appLayout.classList.contains('sidebar-collapsed');
        setSidebarCollapsed(!isCollapsed);
      });
    }

    // Keyboard shortcut '[' to toggle sidebar when not typing in an input
    document.addEventListener('keydown', (e) => {
      if (isImeKey(e)) return;
      if (e.key === '[' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const target = e.target;
        const tag = target && target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || (target && target.isContentEditable)) return;
        e.preventDefault();
        const isCollapsed = el.appLayout && el.appLayout.classList.contains('sidebar-collapsed');
        setSidebarCollapsed(!isCollapsed);
      }
    });

    // Quick search trigger in sidebar
    if (el.sidebarSearchTrigger) {
      el.sidebarSearchTrigger.addEventListener('click', () => {
        showView('prompts');
        if (el.search) {
          el.search.focus();
          el.search.select();
        }
      });
    }

    // Collapsible section headers (Categories, Folders, Tags)
    let collapsedSections = {};
    try {
      collapsedSections = JSON.parse(localStorage.getItem(SECTIONS_KEY) || '{}');
    } catch (_) {}

    function updateSectionState(sectionId, isCollapsed) {
      const listMap = {
        categories: el.catList,
        folders: el.folderList,
        tags: el.tagList
      };
      const listEl = listMap[sectionId];
      if (listEl) {
        listEl.classList.toggle('is-collapsed', isCollapsed);
      }
      const btn = document.querySelector('.sidebar-section-toggle[data-section="' + sectionId + '"]');
      if (btn) {
        btn.setAttribute('aria-expanded', isCollapsed ? 'false' : 'true');
      }
    }

    // Restore stored collapse states
    Object.keys(collapsedSections).forEach((sectionId) => {
      if (collapsedSections[sectionId]) {
        updateSectionState(sectionId, true);
      }
    });

    if (el.sidebarSectionToggles) {
      el.sidebarSectionToggles.forEach((btn) => {
        btn.addEventListener('click', () => {
          const sectionId = btn.getAttribute('data-section');
          if (!sectionId) return;
          collapsedSections[sectionId] = !collapsedSections[sectionId];
          updateSectionState(sectionId, !!collapsedSections[sectionId]);
          try {
            localStorage.setItem(SECTIONS_KEY, JSON.stringify(collapsedSections));
          } catch (_) {}
        });
      });
    }
  }

  function showView(view) {
    if (view !== 'editor' && isEditorDirty()) {
      if (!window.confirm('You have unsaved changes in this prompt. Discard them?')) return;
      editorInitialSnapshot = null;
    }
    if (view !== 'workspaces' && isWorkspaceDirty()) {
      if (!window.confirm('You have unsaved changes in this workspace. Discard them?')) return;
      wsInitialSnapshot = null;
    }
    if (view !== 'chains' && isChainDirty()) {
      if (!window.confirm('You have unsaved changes in this chain. Discard them?')) return;
      chainInitialSnapshot = null;
    }
    if (view !== 'modifiers' && isModifierDirty()) {
      if (!window.confirm('You have unsaved changes in this modifier. Discard them?')) return;
      modInitialSnapshot = null;
    }
    if (view !== 'rules' && isRuleDirty()) {
      if (!window.confirm('You have unsaved changes in this site rule. Discard them?')) return;
      ruleInitialSnapshot = null;
    }
    // The editor belongs to the library, so the library stays lit while editing.
    const navView = view === 'editor' ? 'prompts' : view;
    el.navItems.forEach((b) => {
      const on = b.getAttribute('data-view') === navView;
      b.classList.toggle('active', on);
      if (on) b.setAttribute('aria-current', 'page');
      else b.removeAttribute('aria-current');
    });
    el.panels.forEach((p) => p.classList.toggle('active', p.id === 'view-' + view));
    if (el.appLayout) el.appLayout.setAttribute('data-view', view);
    if (view !== 'prompts') closeDrawer();
    if (view === 'modifiers') renderModifiers();
    if (view === 'rules') renderRules();
    if (window.scrollY > 0) window.scrollTo({ top: 0 });
  }

  /**
   * Accept ?edit=<id>, ?create=1 and draft fields, so the popup's
   * "Full editor" button can hand over a half-written prompt.
   */
  function handleUrlParams() {
    const params = new URLSearchParams(window.location.search);
    if (!params.toString()) return;

    if (params.has('upgrade') || params.get('view') === 'plan' || params.has('license')) {
      showView('plan');
      // ?upgrade=limit|history|blocks opens the paywall for that reason.
      if (params.has('upgrade')) openUpgradeModal(params.get('upgrade') || 'pro');
      return;
    }

    if (params.get('view') === 'settings') {
      showView('settings');
      return;
    }

    // "Save selection as a new prompt" from the page or the palette.
    if (params.has('draft')) {
      openDraftFromPage();
      return;
    }

    if (['data', 'workspaces', 'chains', 'modifiers', 'rules'].indexOf(params.get('view')) !== -1) {
      showView(params.get('view'));
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

    const noSubFilter = !filter.folderId && !filter.tag;
    let html = '';
    html += catButton(
      'All',
      '<svg class="ico ico-sm" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h10"></path></svg>',
      'All prompts',
      store.getAll().length,
      filter.category === 'All' && noSubFilter
    );
    html += catButton(FAVOURITES, ICONS.star, 'Favourites', favourites, filter.category === FAVOURITES);

    store.BUILTIN_CATEGORIES.forEach((cat) => {
      const meta = store.getCategoryMeta(cat);
      html += catButton(cat, escapeHtml(meta.icon), meta.label, counts[cat] || 0, filter.category === cat);
    });

    const customCats = store.getCustomCategories();
    if (customCats.length) {
      customCats.forEach((cat) => {
        const count = counts[cat.name] || 0;
        html +=
          '<div class="folder-row">' +
          '<button type="button" class="cat-filter-btn folder-btn' +
          (filter.category === cat.name ? ' active' : '') +
          '" data-cat="' +
          escapeAttr(cat.name) +
          '">' +
          '<span class="cat-icon" aria-hidden="true">' +
          escapeHtml(cat.icon || '🏷️') +
          '</span>' +
          '<span class="cat-label">' +
          escapeHtml(cat.name) +
          '</span><span class="cat-count">' +
          count +
          '</span>' +
          '</button>' +
          '<button type="button" class="btn-folder-act" data-edit-cat="' +
          escapeAttr(cat.id) +
          '" title="Edit category" aria-label="Edit category ' +
          escapeAttr(cat.name) +
          '">✎</button>' +
          '<button type="button" class="btn-folder-act" data-delete-cat="' +
          escapeAttr(cat.id) +
          '" title="Delete category" aria-label="Delete category ' +
          escapeAttr(cat.name) +
          '">✕</button>' +
          '</div>';
      });
    }

    const generalCustomCount = store.getAll().filter((p) => p.category === 'Custom').length;
    if (generalCustomCount || !customCats.length) {
      html += catButton(
        'Custom',
        escapeHtml(store.getCategoryMeta('Custom').icon || '⭐'),
        'Custom',
        generalCustomCount,
        filter.category === 'Custom'
      );
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

    renderFolderTree();
    renderTagCloud();
  }

  /* =====================================================================
     Folders and tags in the sidebar (Pro)
     ===================================================================== */

  function isPro() {
    return !!(store.isPro && store.isPro());
  }

  function countInFolder(folderId) {
    return store.getAll({ allBuiltins: true }).filter((p) => p.folderId === folderId).length;
  }

  function renderFolderTree() {
    if (!el.folderList) return;
    const tree = store.getFolderTree();
    const pro = isPro();
    if (!tree.length) {
      el.folderList.innerHTML =
        '<div class="sidebar-empty-note">' +
        (pro ? 'No folders yet. Folders can sit inside folders.' : 'Folders inside folders are part of Pro.') +
        '</div>';
      return;
    }
    el.folderList.innerHTML = tree
      .map(({ folder, depth }) => {
        const active = filter.folderId === folder.id;
        return (
          '<div class="folder-row" style="padding-left:' +
          depth * 14 +
          'px">' +
          '<button type="button" class="cat-filter-btn folder-btn' +
          (active ? ' active' : '') +
          '" data-folder="' +
          escapeAttr(folder.id) +
          '"><span class="cat-icon" aria-hidden="true">' +
          ICONS.folder +
          '</span><span class="cat-label">' +
          escapeHtml(folder.name) +
          '</span><span class="cat-count">' +
          countInFolder(folder.id) +
          '</span></button>' +
          '<button type="button" class="btn-folder-act" data-sub-folder="' +
          escapeAttr(folder.id) +
          '" title="Add a folder inside" aria-label="Add a folder inside ' +
          escapeAttr(folder.name) +
          '">+</button>' +
          '<button type="button" class="btn-folder-act" data-rename-folder="' +
          escapeAttr(folder.id) +
          '" title="Rename folder" aria-label="Rename ' +
          escapeAttr(folder.name) +
          '">✎</button>' +
          '<button type="button" class="btn-folder-act" data-delete-folder="' +
          escapeAttr(folder.id) +
          '" title="Delete folder (its prompts are kept)" aria-label="Delete ' +
          escapeAttr(folder.name) +
          '">✕</button>' +
          '</div>'
        );
      })
      .join('');

    el.folderList.querySelectorAll('[data-folder]').forEach((btn) => {
      btn.addEventListener('click', () => {
        filter = { category: 'All', folderId: btn.getAttribute('data-folder') };
        renderSidebar();
        renderTable();
        showView('prompts');
      });
    });
    el.folderList.querySelectorAll('[data-sub-folder]').forEach((btn) => {
      btn.addEventListener('click', () => addFolder(btn.getAttribute('data-sub-folder')));
    });
    el.folderList.querySelectorAll('[data-rename-folder]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-rename-folder');
        const folder = store.getFolders().filter((f) => f.id === id)[0];
        if (!folder) return;
        const name = await askForText({ title: 'Rename folder', label: 'Folder name', value: folder.name });
        if (!name) return;
        try {
          await store.renameFolder(id, name);
          showToast('Folder renamed.');
        } catch (err) {
          handleProError(err);
        }
      });
    });
    el.folderList.querySelectorAll('[data-delete-folder]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-delete-folder');
        const folder = store.getFolders().filter((f) => f.id === id)[0];
        if (!folder) return;
        if (!window.confirm('Delete the folder "' + folder.name + '"?\n\nIts prompts and sub-folders move up a level. No prompts are deleted.')) return;
        await store.deleteFolder(id);
        if (filter.folderId === id) filter = { category: 'All' };
        renderSidebar();
        renderTable();
        showToast('Folder deleted. Prompts kept.');
      });
    });
  }

  async function addFolder(parentId) {
    const name = await askForText({
      title: parentId ? 'New folder inside' : 'New folder',
      label: 'Folder name',
      confirm: 'Create'
    });
    if (!name) return;
    try {
      const folder = await store.createFolder(name, parentId || null);
      if (!folder) {
        showToast('A folder with that name is already there.');
        return;
      }
      renderSidebar();
      renderFolderOptions();
      showToast('Folder created.');
    } catch (err) {
      handleProError(err);
    }
  }

  function renderTagCloud() {
    if (!el.tagList) return;
    const tags = store.getAllTags().slice(0, 40);
    if (!tags.length) {
      el.tagList.innerHTML = '<div class="sidebar-empty-note">Tags you add to prompts show up here.</div>';
      return;
    }
    el.tagList.innerHTML = tags
      .map(
        (t) =>
          '<button type="button" class="tag-chip' +
          (filter.tag === t.tag ? ' active' : '') +
          '" data-tag="' +
          escapeAttr(t.tag) +
          '" title="' +
          t.count +
          ' prompt' +
          (t.count === 1 ? '' : 's') +
          '">#' +
          escapeHtml(t.tag) +
          '</button>'
      )
      .join('');
    el.tagList.querySelectorAll('[data-tag]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const tag = btn.getAttribute('data-tag');
        filter = filter.tag === tag ? { category: 'All' } : { category: 'All', tag };
        renderSidebar();
        renderTable();
        showView('prompts');
      });
    });
  }

  /** Pro-only actions answer a Free user with the upgrade dialog, nothing else. */
  function handleProError(err) {
    if (err && err.code === 'PRO_REQUIRED') {
      openUpgradeModal(err.feature || 'pro');
      return true;
    }
    showToast((err && err.message) || 'That did not work.');
    return false;
  }

  /** A sidebar filter. `iconHtml` is already safe: an escaped emoji or one of ICONS. */
  function catButton(value, iconHtml, label, count, active) {
    return (
      '<button type="button" class="cat-filter-btn' +
      (active ? ' active' : '') +
      '" data-cat="' +
      escapeAttr(value) +
      '"' +
      (active ? ' aria-current="true"' : '') +
      '>' +
      '<span class="cat-icon" aria-hidden="true">' +
      iconHtml +
      '</span>' +
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
    el.catModalName.removeAttribute('aria-invalid');
    el.catModalError.textContent = '';
    el.catModalTitle.textContent = o.id ? 'Edit category' : 'New category';
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

    el.catModalName.addEventListener('input', () => {
      if (el.catModalName.value.trim()) {
        el.catModalName.removeAttribute('aria-invalid');
        el.catModalError.textContent = '';
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
      const id = el.catModalId.value.trim();
      const name = el.catModalName.value.trim();
      if (!name) {
        el.catModalError.textContent = 'Please enter a category name.';
        el.catModalName.setAttribute('aria-invalid', 'true');
        el.catModalName.focus();
        return;
      }

      let cat;
      if (id) {
        cat = await store.updateCategory(id, { name: name, icon: selectedCategoryEmoji });
        if (!cat) {
          el.catModalError.textContent = 'A category with that name already exists.';
          el.catModalName.setAttribute('aria-invalid', 'true');
          el.catModalName.focus();
          return;
        }
        showToast('Category updated.');
      } else {
        cat = await store.createCategory(name, selectedCategoryEmoji);
        if (!cat) {
          el.catModalError.textContent = 'A category with that name already exists.';
          el.catModalName.setAttribute('aria-invalid', 'true');
          el.catModalName.focus();
          return;
        }
        showToast('Category created.');
      }

      el.catModalName.removeAttribute('aria-invalid');
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
      category: filter.category,
      folderId: filter.folderId || undefined,
      tag: filter.tag || undefined
    });
  }

  let shownIds = [];

  function renderTable() {
    const rows = currentRows();
    shownIds = rows.map((p) => p.id);
    updateFilterChip(rows.length);

    // Ticks only count for prompts that still exist.
    Array.from(selected).forEach((id) => {
      if (!store.getById(id)) selected.delete(id);
    });
    paintBulkBar();

    el.tableBody.classList.toggle('has-selection', selected.size > 0);

    if (!rows.length) {
      el.tableBody.innerHTML = libraryEmptyHtml();
      el.tableBody.querySelectorAll('[data-empty-act]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const act = btn.getAttribute('data-empty-act');
          if (act === 'clear') {
            searchQuery = '';
            el.search.value = '';
            filter = { category: 'All' };
            renderSidebar();
            renderTable();
            el.search.focus();
          } else if (act === 'create') {
            el.createBtn.click();
            if (searchQuery && !el.fTitle.value) el.fTitle.value = searchQuery;
          } else if (act === 'import') {
            showView('data');
          }
        });
      });
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
              ' to fill in">' +
              varCount +
              ' field' +
              (varCount === 1 ? '' : 's') +
              '</span>'
          );
        }
        if (p.isCustom) tags.push('<span class="row-chip row-chip-mine">yours</span>');
        if (p.isEdited) tags.push('<span class="row-chip row-chip-edited">edited</span>');
        if (template.listBlocks(p.template).length) tags.push(blockChip());
        if (usage.count) tags.push('<span class="row-chip row-chip-usage">used ' + usage.count + '×</span>');

        const isSel = selected.has(p.id);
        const isOpen = drawerId === p.id;
        const builtin = store.isBuiltin(p.id);
        return (
          '<article class="prompt-tile' +
          (isSel ? ' is-selected' : '') +
          (isOpen ? ' is-open' : '') +
          '" data-id="' +
          escapeAttr(p.id) +
          '" role="listitem">' +
          '<div class="tile-top">' +
          '<label class="tile-check" title="Select for bulk edit"><input type="checkbox" data-select="1" aria-label="Select ' +
          escapeAttr(p.title) +
          '"' +
          (isSel ? ' checked' : '') +
          ' /></label>' +
          '<span class="tile-cat"><span class="tile-cat-icon" aria-hidden="true">' +
          escapeHtml(catMeta.icon || '🏷️') +
          '</span><span class="tile-cat-name">' +
          escapeHtml(p.category || 'Custom') +
          '</span></span>' +
          '<button type="button" class="tile-star' +
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
          '</div>' +
          '<h3 class="tile-title"><button type="button" class="tile-open" data-act="open" title="Preview ' +
          escapeAttr(p.title) +
          '">' +
          escapeHtml(p.title) +
          '</button></h3>' +
          '<p class="tile-desc">' +
          escapeHtml(p.description || '') +
          '</p>' +
          '<div class="tile-preview" aria-hidden="true">' +
          templatePreviewHtml(p.template, 260) +
          '</div>' +
          '<div class="tile-foot">' +
          '<div class="row-chips">' +
          tags.join('') +
          '</div>' +
          '<div class="tile-actions">' +
          '<button type="button" class="tile-btn" data-act="copy" title="Copy" aria-label="Copy ' +
          escapeAttr(p.title) +
          '">' +
          ICONS.copy +
          '</button>' +
          '<button type="button" class="tile-btn" data-act="compare" title="Compare across AIs" aria-label="Compare ' +
          escapeAttr(p.title) +
          '">' +
          ICONS.compare +
          '</button>' +
          '<button type="button" class="tile-btn" data-act="edit" title="Edit" aria-label="Edit ' +
          escapeAttr(p.title) +
          '">' +
          ICONS.edit +
          '</button>' +
          '<button type="button" class="tile-btn" data-act="duplicate" title="Duplicate" aria-label="Duplicate ' +
          escapeAttr(p.title) +
          '">' +
          ICONS.duplicate +
          '</button>' +
          '<button type="button" class="tile-btn is-danger" data-act="delete" title="' +
          (builtin ? 'Hide this built-in' : 'Delete') +
          '" aria-label="' +
          (builtin ? 'Hide ' : 'Delete ') +
          escapeAttr(p.title) +
          '">' +
          ICONS.trash +
          '</button>' +
          '</div>' +
          '</div>' +
          '</article>'
        );
      })
      .join('');

    bindRows();
  }

  /** The start of a template, escaped, with {{fields}} marked. */
  function templatePreviewHtml(text, max) {
    const source = String(text || '');
    const limit = max || 260;
    const clipped = source.length > limit ? source.slice(0, limit) + '…' : source;
    return escapeHtml(clipped).replace(/\{\{[^{}]{1,80}\}\}/g, (m) => '<span class="tpl-mark">' + m + '</span>');
  }

  /** Empty results say why, and offer the next useful step. */
  function libraryEmptyHtml() {
    const filtered = filter.category !== 'All' || filter.folderId || filter.tag;
    let icon = ICONS.folderLg;
    let title = 'Nothing here yet';
    let text = 'This view is empty.';
    let actions = '';
    if (searchQuery) {
      icon = ICONS.search;
      title = 'No prompt matches “' + (searchQuery.length > 40 ? searchQuery.slice(0, 40) + '…' : searchQuery) + '”';
      text = 'Search looks at names, shortcuts, tags, notes and the prompt text' + (filtered ? ' inside the current filter.' : '.');
      actions =
        '<button type="button" class="btn-secondary" data-empty-act="clear">Clear search' + (filtered ? ' and filter' : '') + '</button>' +
        '<button type="button" class="btn-primary" data-empty-act="create">Create this prompt</button>';
    } else if (filter.category === FAVOURITES) {
      icon = ICONS.starLg;
      title = 'No favourites yet';
      text = 'Hover any prompt and press its star. Favourites come first in the slash menu, the palette and the popup.';
      actions = '<button type="button" class="btn-secondary" data-empty-act="clear">Browse all prompts</button>';
    } else if (filter.category === 'Custom') {
      title = 'Your own prompts live here';
      text = 'Write one from scratch, save a selection from any page with a right-click, or import a file you already have.';
      actions =
        '<button type="button" class="btn-secondary" data-empty-act="import">Import a file</button>' +
        '<button type="button" class="btn-primary" data-empty-act="create">New prompt</button>';
    } else if (filtered) {
      text = filter.folderId
        ? 'Move prompts here with bulk edit, or pick this folder in the editor.'
        : filter.tag
        ? 'No prompt has this tag any more.'
        : 'This category is empty, or its starter pack is switched off in Settings.';
      actions = '<button type="button" class="btn-secondary" data-empty-act="clear">Show all prompts</button>';
    }
    return (
      '<div class="library-empty">' +
      '<span class="library-empty-icon">' + icon + '</span>' +
      '<h3>' + escapeHtml(title) + '</h3>' +
      '<p>' + escapeHtml(text) + '</p>' +
      (actions ? '<div class="library-empty-actions">' + actions + '</div>' : '') +
      '</div>'
    );
  }

  function bindRows() {
    el.tableBody.querySelectorAll('.prompt-tile[data-id]').forEach((tr) => {
      const id = tr.getAttribute('data-id');
      const tick = tr.querySelector('[data-select]');
      if (tick) {
        tick.addEventListener('change', () => {
          if (tick.checked) selected.add(id);
          else selected.delete(id);
          tr.classList.toggle('is-selected', tick.checked);
          el.tableBody.classList.toggle('has-selection', selected.size > 0);
          paintBulkBar();
        });
      }
      tr.querySelectorAll('[data-act]').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const act = btn.getAttribute('data-act');

          if (act === 'open') {
            openDrawer(id);
            return;
          }
          if (act === 'fav') {
            await store.toggleFavorite(id);
            renderSidebar();
            renderTable();
            paintDrawer();
            return;
          }
          if (act === 'compare') {
            openOptionsCompareModal(id);
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
            await duplicateAndEdit(id);
            return;
          }
          if (act === 'delete') {
            await deletePrompt(id);
          }
        });
      });
    });
  }

  async function duplicateAndEdit(id) {
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
  }

  /* =====================================================================
     Preview drawer
     Reading a prompt should not mean opening the editor. The drawer shows
     the exact text, what the form will ask for, and the actions.
     ===================================================================== */

  function openDrawer(id) {
    if (!el.drawer || !store.getById(id)) return;
    drawerId = id;
    el.drawer.hidden = false;
    if (el.appLayout) el.appLayout.classList.add('has-drawer');
    paintDrawer();
    el.tableBody.querySelectorAll('.prompt-tile').forEach((t) => {
      t.classList.toggle('is-open', t.getAttribute('data-id') === id);
    });
    if (el.drawerCopy) el.drawerCopy.focus({ preventScroll: true });
  }

  function closeDrawer() {
    if (!el.drawer || el.drawer.hidden) return;
    const was = drawerId;
    drawerId = '';
    el.drawer.hidden = true;
    if (el.appLayout) el.appLayout.classList.remove('has-drawer');
    el.tableBody.querySelectorAll('.prompt-tile.is-open').forEach((t) => t.classList.remove('is-open'));
    // Return focus to the card that opened the drawer.
    const tile = was ? el.tableBody.querySelector('.prompt-tile[data-id="' + cssEscape(was) + '"] .tile-open') : null;
    if (tile) tile.focus({ preventScroll: true });
  }

  function paintDrawer() {
    if (!el.drawer || !drawerId) return;
    const p = store.getById(drawerId);
    if (!p) {
      closeDrawer();
      return;
    }
    const prefix = settings.slashEnabled ? settings.slashTriggerChar : '';
    const catMeta = store.getCategoryMeta(p.category || 'Custom');
    const fav = store.isFavorite(p.id);
    const usage = store.getUsage(p.id);
    const builtin = store.isBuiltin(p.id);

    el.drawerCat.innerHTML =
      '<span class="tile-cat-icon" aria-hidden="true">' +
      escapeHtml(catMeta.icon || '🏷️') +
      '</span><span>' +
      escapeHtml(p.category || 'Custom') +
      (builtin ? ' · built-in' : ' · yours') +
      '</span>';
    el.drawerTitle.textContent = p.title;
    el.drawerDesc.textContent = p.description || '';

    const meta = [];
    if (p.shortcut && prefix) meta.push('<span class="table-shortcut" title="Type this in any text box">' + escapeHtml(prefix + p.shortcut) + '</span>');
    (p.tags || []).forEach((t) => meta.push('<span class="row-chip">#' + escapeHtml(t) + '</span>'));
    if (p.isEdited) meta.push('<span class="row-chip row-chip-edited">edited</span>');
    meta.push('<span class="row-chip row-chip-usage">' + (usage.count ? 'Used ' + usage.count + '×' : 'Not used yet') + '</span>');
    el.drawerMeta.innerHTML = meta.join('');

    el.drawerTemplate.innerHTML = templatePreviewHtml(p.template, 20000);

    const vars = template.parseVariables(p.template);
    el.drawerFields.innerHTML = vars.length
      ? '<div class="drawer-label">The form asks for</div>' +
        vars
          .map((v) => {
            const kind = v.autofill
              ? 'fills itself: ' + String(template.AUTOFILL_LABELS[v.autofill] || v.autofill).toLowerCase()
              : v.type === 'select'
              ? 'a choice of ' + (v.options || []).length
              : v.default
              ? 'starts as “' + v.default + '”'
              : v.type === 'textarea'
              ? 'long text'
              : 'short text';
            return (
              '<div class="drawer-field"><strong>' +
              escapeHtml(v.label) +
              '</strong><code>' +
              escapeHtml('{{' + v.name + '}}') +
              '</code><span class="field-kind">' +
              escapeHtml(kind) +
              '</span></div>'
            );
          })
          .join('')
      : '';

    if (el.drawerNotes) {
      el.drawerNotes.hidden = !p.notes;
      el.drawerNotes.textContent = p.notes || '';
    }

    el.drawerFav.setAttribute('aria-pressed', String(fav));
    el.drawerFav.title = fav ? 'Remove from favourites' : 'Add to favourites';
    el.drawerFav.setAttribute('aria-label', el.drawerFav.title);
    el.drawerDelete.textContent = builtin ? 'Hide' : 'Delete';
    el.drawerCopy.textContent = vars.length ? 'Fill in and copy' : 'Copy';
  }

  function bindDrawer() {
    if (!el.drawer) return;
    el.drawerClose.addEventListener('click', closeDrawer);
    el.drawerFav.addEventListener('click', async () => {
      if (!drawerId) return;
      await store.toggleFavorite(drawerId);
      renderSidebar();
      renderTable();
      paintDrawer();
    });
    el.drawerCopy.addEventListener('click', () => drawerId && copyPrompt(drawerId));
    el.drawerEdit.addEventListener('click', () => {
      if (!drawerId) return;
      openEditor(store.getById(drawerId));
      showView('editor');
    });
    el.drawerDuplicate.addEventListener('click', () => drawerId && duplicateAndEdit(drawerId));
    if (el.drawerCompare) {
      el.drawerCompare.addEventListener('click', () => drawerId && openOptionsCompareModal(drawerId));
    }
    el.drawerDelete.addEventListener('click', () => drawerId && deletePrompt(drawerId));
  }

  /* =====================================================================
     Layout toggle and page keys
     ===================================================================== */

  function paintLayout() {
    const layout = settings && settings.libraryLayout === 'list' ? 'list' : 'grid';
    el.tableBody.classList.toggle('is-grid', layout === 'grid');
    el.tableBody.classList.toggle('is-list', layout === 'list');
    el.viewOpts.forEach((b) => b.setAttribute('aria-pressed', String(b.getAttribute('data-layout') === layout)));
  }

  function bindLayoutToggle() {
    el.viewOpts.forEach((btn) => {
      btn.addEventListener('click', async () => {
        const layout = btn.getAttribute('data-layout') === 'list' ? 'list' : 'grid';
        // Paint first so the switch feels instant; the choice is saved after.
        settings.libraryLayout = layout;
        paintLayout();
        await saveSetting('libraryLayout', layout);
      });
    });
  }

  function anyDialogOpen() {
    return Array.from(document.querySelectorAll('.modal-backdrop')).some((m) => m.style.display === 'flex');
  }

  /** "/" jumps to search, Ctrl+S saves in the editor, Esc closes the drawer. */
  function bindPageKeys() {
    document.addEventListener('keydown', (e) => {
      if (isImeKey(e)) return;
      // A dialog handler that already used this key (Esc closing a modal) wins.
      if (e.defaultPrevented || anyDialogOpen()) return;
      const target = e.target;
      const typing =
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable);

      if ((e.ctrlKey || e.metaKey) && !e.altKey && (e.key === 's' || e.key === 'S')) {
        const editor = document.getElementById('view-editor');
        if (editor && editor.classList.contains('active')) {
          e.preventDefault();
          if (typeof el.form.requestSubmit === 'function') el.form.requestSubmit();
          else el.form.dispatchEvent(new Event('submit', { cancelable: true }));
        }
        return;
      }

      if (e.key === '/' && !typing && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const library = document.getElementById('view-prompts');
        if (library && library.classList.contains('active')) {
          e.preventDefault();
          el.search.focus();
          el.search.select();
        }
        return;
      }

      if (e.key === 'Escape') {
        if (drawerId) {
          e.preventDefault();
          closeDrawer();
          return;
        }
        if (target === el.search && el.search.value) {
          e.preventDefault();
          el.search.value = '';
          searchQuery = '';
          renderTable();
        }
      }
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

  /* =====================================================================
     Bulk edit and tidy-up (Pro)
     ===================================================================== */

  function bindLibraryTools() {
    if (el.addFolder) el.addFolder.addEventListener('click', () => addFolder(null));

    if (el.selectAll) {
      el.selectAll.addEventListener('change', () => {
        shownIds.forEach((id) => {
          if (el.selectAll.checked) selected.add(id);
          else selected.delete(id);
        });
        renderTable();
      });
    }

    if (el.bulkClear) {
      el.bulkClear.addEventListener('click', () => {
        selected.clear();
        renderTable();
      });
    }

    if (el.bulkFolder) {
      el.bulkFolder.addEventListener('change', async () => {
        const value = el.bulkFolder.value;
        el.bulkFolder.value = '';
        if (!value) return;
        await runBulk({ folderId: value === '__none__' ? null : value }, 'Moved');
      });
    }

    if (el.bulkCategory) {
      el.bulkCategory.addEventListener('change', async () => {
        const value = el.bulkCategory.value;
        el.bulkCategory.value = '';
        if (!value) return;
        await runBulk({ category: value }, 'Category set for');
      });
    }

    if (el.bulkAddTag) {
      el.bulkAddTag.addEventListener('click', async () => {
        const tag = await askForText({ title: 'Add a tag', label: 'Tag', note: 'Separate several tags with commas.', confirm: 'Add' });
        if (tag) await runBulk({ addTags: tag }, 'Tagged');
      });
    }

    if (el.bulkRemoveTag) {
      el.bulkRemoveTag.addEventListener('click', async () => {
        const tag = await askForText({ title: 'Remove a tag', label: 'Tag', confirm: 'Remove' });
        if (tag) await runBulk({ removeTags: tag }, 'Untagged');
      });
    }

    if (el.bulkFavourite) {
      el.bulkFavourite.addEventListener('click', () => runBulk({ favorite: true }, 'Favourited'));
    }

    if (el.bulkDelete) {
      el.bulkDelete.addEventListener('click', async () => {
        const ids = Array.from(selected);
        const builtins = ids.filter((id) => store.isBuiltin(id)).length;
        const own = ids.length - builtins;
        const message =
          'Delete ' + ids.length + ' prompt' + (ids.length === 1 ? '' : 's') + '?\n\n' +
          (own ? '• ' + own + ' of your own will be deleted\n' : '') +
          (builtins ? '• ' + builtins + ' built-in(s) will be hidden\n' : '') +
          'A backup is taken first, so you can undo this from Backup & import.';
        if (!window.confirm(message)) return;
        try {
          const res = await store.bulkDelete(ids);
          selected.clear();
          renderSidebar();
          renderTable();
          updateCounts();
          showToast('Deleted ' + res.deleted + '. A backup was taken first.');
        } catch (err) {
          handleProError(err);
        }
      });
    }

    if (el.tidyBtn) el.tidyBtn.addEventListener('click', openTidyModal);
    if (el.tidyClose) el.tidyClose.addEventListener('click', closeTidyModal);
    if (el.tidyCancel) el.tidyCancel.addEventListener('click', closeTidyModal);
    if (el.tidyDelete) el.tidyDelete.addEventListener('click', deleteTicked);
    if (el.tidyModal) {
      el.tidyModal.addEventListener('mousedown', (e) => {
        if (e.target === el.tidyModal) closeTidyModal();
      });
    }
  }

  async function runBulk(changes, verb) {
    const ids = Array.from(selected);
    if (!ids.length) return;
    try {
      const res = await store.bulkUpdate(ids, changes);
      renderSidebar();
      renderTable();
      showToast(verb + ' ' + res.updated + ' prompt' + (res.updated === 1 ? '' : 's') + '.');
    } catch (err) {
      handleProError(err);
    }
  }

  function paintBulkBar() {
    if (!el.bulkBar) return;
    const count = selected.size;
    el.bulkBar.hidden = count === 0;
    if (el.bulkCount) el.bulkCount.textContent = count + ' selected';
    if (el.selectAll) {
      const allShown = shownIds.length > 0 && shownIds.every((id) => selected.has(id));
      el.selectAll.checked = allShown;
      el.selectAll.indeterminate = !allShown && shownIds.some((id) => selected.has(id));
    }
    if (count) renderBulkOptions();
  }

  function folderOptionsHtml(selectedId, emptyLabel) {
    return (
      '<option value="">' +
      escapeHtml(emptyLabel) +
      '</option>' +
      store
        .getFolderTree()
        .map(
          ({ folder, depth }) =>
            '<option value="' +
            escapeAttr(folder.id) +
            '"' +
            (folder.id === selectedId ? ' selected' : '') +
            '>' +
            '\u00a0\u00a0'.repeat(depth) +
            '📁 ' +
            escapeHtml(folder.name) +
            '</option>'
        )
        .join('')
    );
  }

  function renderBulkOptions() {
    if (el.bulkFolder) {
      el.bulkFolder.innerHTML =
        folderOptionsHtml('', 'Move to folder…') + '<option value="__none__">No folder</option>';
    }
    if (el.bulkCategory) {
      const cats = store.getCategories();
      if (cats.indexOf('Custom') === -1) cats.push('Custom');
      el.bulkCategory.innerHTML =
        '<option value="">Set category…</option>' +
        cats
          .map((c) => '<option value="' + escapeAttr(c) + '">' + escapeHtml(store.getCategoryMeta(c).icon + ' ' + c) + '</option>')
          .join('');
    }
  }

  /** The editor's folder picker. */
  function renderFolderOptions(selectedId) {
    if (!el.fFolder) return;
    el.fFolder.innerHTML = folderOptionsHtml(selectedId || '', 'No folder');
    el.fFolder.disabled = false;
    el.fFolder.title = 'Put this prompt in a folder';
  }

  function openTidyModal() {
    const s = store.getTidySuggestions();
    const section = (title, note, list) => {
      if (!list.length) return '';
      return (
        '<div class="tidy-section"><h4>' +
        escapeHtml(title) +
        ' <span class="cat-count">' +
        list.length +
        '</span></h4><p class="field-note">' +
        escapeHtml(note) +
        '</p><ul class="tidy-list">' +
        list
          .map(
            (p) =>
              '<li><label class="checkbox-row"><input type="checkbox" data-tidy="' +
              escapeAttr(p.id) +
              '"' +
              (p.isCustom ? '' : ' disabled title="Built-ins are kept. Hide them from the library instead."') +
              ' /><span><strong>' +
              escapeHtml(p.title) +
              '</strong>' +
              (p.isCustom ? '' : ' <em>(built-in)</em>') +
              '</span></label></li>'
          )
          .join('') +
        '</ul></div>'
      );
    };

    let html = '';
    html += section('Never used', 'Your prompts that have not been inserted or copied since you made them, two weeks or more ago.', s.neverUsed);
    html += section('Not used for 90 days', 'Your prompts you used before but not lately.', s.stale);
    s.duplicates.forEach((group, i) => {
      html += section(
        'Same text' + (s.duplicates.length > 1 ? ' (' + (i + 1) + ')' : ''),
        'These prompts have the same template. Keep one.',
        group
      );
    });
    if (s.emptyFolders.length) {
      html +=
        '<div class="tidy-section"><h4>Empty folders <span class="cat-count">' +
        s.emptyFolders.length +
        '</span></h4><ul class="tidy-list">' +
        s.emptyFolders
          .map(
            (f) =>
              '<li><label class="checkbox-row"><input type="checkbox" data-tidy-folder="' +
              escapeAttr(f.id) +
              '" /><span>📁 ' +
              escapeHtml(f.name) +
              '</span></label></li>'
          )
          .join('') +
        '</ul></div>';
    }
    el.tidySections.innerHTML = html || '<p class="history-empty">Nothing to tidy. Your library looks good.</p>';
    el.tidyModal.style.display = 'flex';
  }

  function closeTidyModal() {
    if (el.tidyModal) el.tidyModal.style.display = 'none';
  }

  async function deleteTicked() {
    const ids = Array.from(new Set(Array.from(el.tidySections.querySelectorAll('[data-tidy]:checked')).map((c) => c.getAttribute('data-tidy'))));
    const folderIds = Array.from(el.tidySections.querySelectorAll('[data-tidy-folder]:checked')).map((c) =>
      c.getAttribute('data-tidy-folder')
    );
    if (!ids.length && !folderIds.length) {
      showToast('Tick something to delete first.');
      return;
    }
    if (!window.confirm('Delete ' + (ids.length + folderIds.length) + ' ticked item(s)? A backup is taken first.')) return;
    try {
      const res = ids.length ? await store.bulkDelete(ids) : { deleted: 0 };
      for (const id of folderIds) await store.deleteFolder(id);
      closeTidyModal();
      renderSidebar();
      renderTable();
      updateCounts();
      showToast('Tidied: ' + (res.deleted + folderIds.length) + ' removed. A backup was taken first.');
    } catch (err) {
      handleProError(err);
    }
  }

  /** The page title names the view; the line under it counts what is shown. */
  function updateFilterChip(count) {
    let title = 'All prompts';
    if (filter.category === FAVOURITES) {
      title = 'Favourites';
    } else if (filter.category !== 'All') {
      const meta = store.getCategoryMeta(filter.category);
      title = (meta.icon ? meta.icon + ' ' : '') + (meta.label || filter.category);
    }
    if (filter.folderId) {
      const folder = store.getFolders().filter((f) => f.id === filter.folderId)[0];
      title = folder ? folder.name : 'Folder';
    }
    if (filter.tag) title = '#' + filter.tag;
    if (el.libraryTitle) el.libraryTitle.textContent = title;

    const noun = count === 1 ? ' prompt' : ' prompts';
    el.activeFilter.textContent = searchQuery
      ? count + noun + ' match “' + searchQuery + '”'
      : count + noun;
  }

  function updateCounts() {
    const all = store.getAll();
    const mine = store.getCustomCount ? store.getCustomCount() : all.filter((p) => p.isCustom).length;
    const edited = all.filter((p) => p.isEdited).length;
    const hidden = store.getBuiltins().length - all.filter((p) => !p.isCustom).length;

    el.sidebarCount.textContent = String(all.length);
    // The plan item says where you are, never more than that.
    if (store.isPro && store.isPro()) {
      el.sidebarStat.textContent = 'Pro';
      el.sidebarStat.className = 'nav-status is-pro';
      el.sidebarStat.title = 'OmniPrompt Pro is active';
    } else {
      const limit = store.getFreeLimit ? store.getFreeLimit() : 20;
      el.sidebarStat.textContent = 'Free · ' + Math.min(mine, limit) + '/' + limit;
      el.sidebarStat.className = 'nav-status';
      el.sidebarStat.title = mine + ' of ' + limit + ' prompts of your own on Free';
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

  let editorInitialSnapshot = null;

  function getEditorSnapshot() {
    return JSON.stringify({
      id: (el.fId && el.fId.value) || '',
      title: (el.fTitle && el.fTitle.value) || '',
      category: (el.fCategory && el.fCategory.value) || '',
      folder: (el.fFolder && el.fFolder.value) || '',
      shortcut: (el.fShortcut && el.fShortcut.value) || '',
      tags: (el.fTags && el.fTags.value) || '',
      description: (el.fDescription && el.fDescription.value) || '',
      notes: (el.fNotes && el.fNotes.value) || '',
      template: (el.fTemplate && el.fTemplate.value) || '',
      siteRules: (el.editSiteRules && el.editSiteRules.value) || ''
    });
  }

  function isEditorDirty() {
    const editor = document.getElementById('view-editor');
    if (!editor || !editor.classList.contains('active')) return false;
    if (!editorInitialSnapshot) return false;
    return getEditorSnapshot() !== editorInitialSnapshot;
  }

  function clearEditorErrors() {
    if (el.editTitleError) el.editTitleError.textContent = '';
    if (el.editTemplateError) el.editTemplateError.textContent = '';
    if (el.editShortcutError) el.editShortcutError.textContent = '';
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

  function openEditor(prompt) {
    if (isEditorDirty()) {
      if (!window.confirm('You have unsaved changes in this prompt. Discard them?')) return;
    }
    clearEditorErrors();

    const p = prompt || {};
    const isBuiltin = p.id ? store.isBuiltin(p.id) : false;

    el.fId.value = p.id || '';
    el.fTitle.value = p.title || '';
    renderCategoryOptions(p.category);
    renderFolderOptions(p.folderId || filter.folderId || '');
    el.fShortcut.value = p.shortcut || '';
    el.fTags.value = Array.isArray(p.tags) ? p.tags.join(', ') : p.tags || '';
    el.fDescription.value = p.description || '';
    if (el.fNotes) el.fNotes.value = p.notes || '';
    el.fTemplate.value = p.template || '';

    if (el.editSiteRules) {
      if (p.id) {
        const rules = store.getSiteRules().filter(function (r) {
          return (r.promptIds || []).indexOf(p.id) !== -1;
        });
        const allHosts = [];
        rules.forEach(function (r) {
          (r.hosts || []).forEach(function (h) {
            if (allHosts.indexOf(h) === -1) allHosts.push(h);
          });
        });
        el.editSiteRules.value = allHosts.join(', ');
      } else {
        el.editSiteRules.value = '';
      }
    }

    el.heading.textContent = p.id ? p.title || 'Edit prompt' : 'New prompt';
    el.builtinNotice.style.display = isBuiltin ? 'block' : 'none';
    el.deleteBtn.style.display = p.id ? '' : 'none';
    el.deleteBtn.textContent = isBuiltin ? 'Hide built-in' : 'Delete';
    el.duplicateBtn.style.display = p.id ? '' : 'none';
    el.revertBtn.style.display = isBuiltin && p.isEdited ? '' : 'none';
    paintHistoryButton(p.id);

    updateShortcutPreview();
    updateVariablePreview();
    editorInitialSnapshot = getEditorSnapshot();
    el.fTitle.focus();
  }

  function bindEditor() {
    el.fTitle.addEventListener('input', () => {
      if (el.fTitle.value.trim()) {
        if (el.editTitleError) el.editTitleError.textContent = '';
        el.fTitle.removeAttribute('aria-invalid');
        const g = el.fTitle.closest('.form-group');
        if (g) g.classList.remove('has-error');
      }
    });

    el.fTemplate.addEventListener('input', () => {
      updateVariablePreview();
      if (el.fTemplate.value.trim()) {
        if (el.editTemplateError) el.editTemplateError.textContent = '';
        el.fTemplate.removeAttribute('aria-invalid');
        const g = el.fTemplate.closest('.form-group');
        if (g) g.classList.remove('has-error');
      }
    });

    el.fShortcut.addEventListener('input', () => {
      updateShortcutPreview();
      if (el.editShortcutError) el.editShortcutError.textContent = '';
      el.fShortcut.removeAttribute('aria-invalid');
      const g = el.fShortcut.closest('.form-group');
      if (g) g.classList.remove('has-error');
    });

    el.editAddCategory.addEventListener('click', () => {
      openCategoryModal({
        onSaved: (cat) => {
          renderCategoryOptions(cat.name);
        }
      });
    });

    // The block row's "Unlock with Pro" opens the paywall only when clicked,
    // so writing a prompt is never interrupted.
    if (el.variablePreview) {
      el.variablePreview.addEventListener('click', (e) => {
        const btn = e.target.closest && e.target.closest('[data-upgrade]');
        if (btn) openUpgradeModal(btn.getAttribute('data-upgrade'));
      });
    }

    document.querySelectorAll('#options-token-chips .token-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        insertAtCursor(el.fTemplate, chip.getAttribute('data-insert'));
        updateVariablePreview();
      });
    });

    el.cancelEdit.addEventListener('click', () => {
      if (isEditorDirty()) {
        if (!window.confirm('Discard unsaved changes to this prompt?')) return;
      }
      editorInitialSnapshot = null;
      clearEditorErrors();
      showView('prompts');
    });

    el.form.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearEditorErrors();

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
      if (el.fFolder) draft.folderId = el.fFolder.value || null;

      let hasError = false;
      let firstErrorEl = null;

      if (!draft.title) {
        if (el.editTitleError) el.editTitleError.textContent = 'Please enter a prompt title.';
        el.fTitle.setAttribute('aria-invalid', 'true');
        const g = el.fTitle.closest('.form-group');
        if (g) g.classList.add('has-error');
        hasError = true;
        if (!firstErrorEl) firstErrorEl = el.fTitle;
      }

      if (!draft.template.trim()) {
        if (el.editTemplateError) el.editTemplateError.textContent = 'Please write some prompt text.';
        el.fTemplate.setAttribute('aria-invalid', 'true');
        const g = el.fTemplate.closest('.form-group');
        if (g) g.classList.add('has-error');
        hasError = true;
        if (!firstErrorEl) firstErrorEl = el.fTemplate;
      }

      // Pro check: Smart Templates syntax
      if (window.OmniTemplate && window.OmniTemplate.hasSmartSyntax && window.OmniTemplate.hasSmartSyntax(draft.template)) {
        if (!store.isPro()) {
          openUpgradeModal('smartTemplates');
          return;
        }
        const lint = window.OmniTemplate.lintTemplate(draft.template);
        if (lint && lint.errors && lint.errors.length) {
          if (el.editTemplateError) el.editTemplateError.textContent = lint.errors[0];
          el.fTemplate.setAttribute('aria-invalid', 'true');
          const g = el.fTemplate.closest('.form-group');
          if (g) g.classList.add('has-error');
          el.fTemplate.focus();
          return;
        }
      }

      const clash = findShortcutClash(draft.shortcut, id);
      if (clash) {
        if (el.editShortcutError) el.editShortcutError.textContent = 'That shortcut already belongs to "' + clash.title + '". Pick another.';
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

      const versionsBefore = id ? store.getHistory(id).length : 0;
      let savedPrompt = null;
      try {
        savedPrompt = await store.savePrompt(draft);
      } catch (err) {
        if (err && err.code === 'LIMIT_REACHED') {
          openUpgradeModal('limit');
          return;
        }
        showToast((err && err.message) || 'Could not save prompt.');
        return;
      }

      // Save or update site rules for this prompt if specified
      if (el.editSiteRules) {
        const hostVal = el.editSiteRules.value.trim();
        const targetId = (savedPrompt && savedPrompt.id) || id;
        if (targetId) {
          if (hostVal) {
            if (!store.isPro()) {
              openUpgradeModal('siteRules');
            } else {
              const hosts = hostVal.split(',').map(function (s) { return s.trim().toLowerCase(); }).filter(Boolean);
              const existingRule = store.getSiteRules().find(function (r) {
                return (r.promptIds || []).indexOf(targetId) !== -1;
              });
              try {
                await store.saveSiteRule({
                  id: existingRule ? existingRule.id : undefined,
                  name: draft.title + ' (Site Rule)',
                  hosts: hosts,
                  promptIds: [targetId]
                });
              } catch (e) {
                console.warn('Failed to save site rule', e);
              }
            }
          } else {
            const existingRule = store.getSiteRules().find(function (r) {
              return (r.promptIds || []).indexOf(targetId) !== -1 && (r.promptIds.length === 1);
            });
            if (existingRule) {
              await store.deleteSiteRule(existingRule.id);
            }
          }
        }
      }

      editorInitialSnapshot = null;
      renderSidebar();
      renderTable();
      updateCounts();
      showView('prompts');
      const versionKept = !!id && store.getHistory(id).length > versionsBefore;
      showToast(id ? savedMessage(versionKept) : 'Prompt created.');
    });

    el.deleteBtn.addEventListener('click', async () => {
      editorInitialSnapshot = null;
      const id = el.fId.value.trim();
      if (!id) return;
      await deletePrompt(id);
      if (!store.getById(id)) showView('prompts');
    });

    el.duplicateBtn.addEventListener('click', async () => {
      editorInitialSnapshot = null;
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
      editorInitialSnapshot = null;
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

  // Marks prompts that pull in {{@blocks}}, so Free users know before they
  // insert one that the blocks stay as written.
  function blockChip() {
    return store.isPro()
      ? '<span class="row-chip row-chip-blocks" title="Uses context blocks">context</span>'
      : '<span class="row-chip row-chip-blocks" title="Uses context blocks. On Free they are inserted as written; Pro fills them in.">Pro · context</span>';
  }

  // Free users hear once per visit that the old text was kept. Repeating it on
  // every save would turn a useful fact into a nag.
  let toldAboutHistory = false;

  function savedMessage(versionKept) {
    if (!versionKept) return 'Saved.';
    if (store.isPro()) return 'Saved. The earlier version is in History.';
    if (toldAboutHistory) return 'Saved.';
    toldAboutHistory = true;
    return 'Saved. The earlier version is kept in History; Pro can restore it.';
  }

  function paintHistoryButton(id) {
    if (!el.historyBtn) return;
    // Shown for every saved prompt, even with no versions yet, so people
    // know their edits are being kept before they ever need one back.
    const count = id ? store.getHistory(id).length : 0;
    el.historyBtn.style.display = id ? '' : 'none';
    el.historyBtn.textContent = 'History (' + count + ')';
  }

  function openHistoryModal(id) {
    const versions = store.getHistory(id);
    const current = store.getById(id);
    const pro = store.isPro();
    el.historyTitle.textContent = 'Earlier versions of ' + (current ? '“' + current.title + '”' : 'this prompt');
    el.historyNote.textContent = pro
      ? 'Restoring puts that version back and keeps the current text as a new version, so you can undo it.'
      : 'OmniPrompt keeps these for you. You can view and copy any version; one-click restore is part of Pro.';

    if (!versions.length) {
      el.historyList.innerHTML = '<li class="history-empty">No earlier versions yet. They appear after you edit and save.</li>';
    } else {
      el.historyList.innerHTML = versions
        .map((v, idx) => {
          const when = 'Saved ' + new Date(v.at).toLocaleString();
          return (
            '<li class="history-item">' +
            '<div class="history-meta"><strong>' +
            escapeHtml(v.title || 'Untitled') +
            '</strong><span>' +
            escapeHtml(when) +
            '</span></div>' +
            '<div class="history-preview" style="white-space: pre-wrap; max-height: 120px; overflow-y: auto;">' +
            escapeHtml(v.template || '') +
            '</div>' +
            '<div class="history-item-actions" style="margin-top: 8px; display: flex; gap: 8px;">' +
            '<button type="button" class="btn-secondary btn-mini" data-copy-version="' +
            idx +
            '">Copy</button>' +
            '<button type="button" class="btn-secondary btn-mini" data-restore="' +
            idx +
            '">' +
            (pro ? 'Restore' : '🔒 Restore (Pro)') +
            '</button>' +
            '</div>' +
            '</li>'
          );
        })
        .join('');
    }

    el.historyList.querySelectorAll('[data-copy-version]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const index = parseInt(btn.getAttribute('data-copy-version'), 10);
        const v = versions[index];
        if (v && v.template) {
          const ok = await copyText(v.template);
          showToast(ok ? 'Version text copied to clipboard.' : 'Could not copy to clipboard.');
        }
      });
    });

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
    'before-update': 'Before an update',
    'before-bulk-edit': 'Before a bulk edit or delete',
    'before-sync': 'Before sync removed items deleted elsewhere'
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
        (pro
          ? ''
          : '<button type="button" class="var-pro var-pro-unlock" data-upgrade="blocks" title="Stays as written on Free">Unlock with Pro</button>') +
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
     Client workspaces (Pro)
     ===================================================================== */

  let editingWorkspaceId = null;

  function renderWorkspaces() {
    if (!el.workspaceList) return;
    const list = store.getWorkspaces();
    const pro = isPro();
    const active = store.getActiveWorkspace();
    const activeId = active ? active.id : '';

    if (el.wsActiveBanner) {
      if (active) {
        el.wsActiveBanner.hidden = false;
        if (el.wsActiveName) el.wsActiveName.textContent = active.name;
        if (el.wsActiveCount) {
          el.wsActiveCount.textContent = '· ' + active.fields.length + ' value' + (active.fields.length === 1 ? '' : 's');
        }
      } else {
        el.wsActiveBanner.hidden = true;
      }
    }

    el.workspaceList.innerHTML = list
      .map(
        (w) => {
          const previewKeys = (w.fields || [])
            .slice(0, 3)
            .map((f) => '<span class="ws-key-chip">' + escapeHtml(f.key) + '</span>')
            .join('');
          return (
            '<li class="item-row' +
            (w.id === editingWorkspaceId ? ' active' : '') +
            '"><button type="button" class="item-main" data-ws="' +
            escapeAttr(w.id) +
            '"><strong>' +
            escapeHtml(w.name) +
            '</strong><span>' +
            w.fields.length +
            ' value' +
            (w.fields.length === 1 ? '' : 's') +
            '</span>' +
            (previewKeys ? '<div class="ws-preview-keys">' + previewKeys + '</div>' : '') +
            '</button>' +
            (w.id === activeId ? '<span class="item-badge item-badge-active">In use</span>' : '') +
            '</li>'
          );
        }
      )
      .join('');

    el.workspaceList.querySelectorAll('[data-ws]').forEach((btn) => {
      btn.addEventListener('click', () => openWorkspaceEditor(store.getWorkspace(btn.getAttribute('data-ws'))));
    });

    const editing = !el.workspaceEditor.hidden;
    el.workspaceEmpty.style.display = editing ? 'none' : '';
    if (!editing) {
      el.workspaceEmpty.innerHTML = !pro
        ? '<p>Client workspaces are part of OmniPrompt Pro. ' +
          (list.length ? 'Your ' + list.length + ' saved workspace' + (list.length === 1 ? '' : 's') + ' are kept here and in your backups.' : '') +
          '</p><button type="button" class="btn-secondary" data-upgrade="workspaces">What Pro adds</button>'
        : list.length
        ? '<p>Pick a workspace to edit it.' + (activeId ? '' : ' None is in use right now.') + '</p>'
        : '<p>No workspaces yet. Make one per client, with values such as <code>client_name</code>, <code>tone</code> and <code>client_brief</code>.</p>' +
          '<button type="button" class="btn-primary btn-mini" id="btn-ws-create-empty">+ Create workspace</button>';
      const emptyCreate = el.workspaceEmpty.querySelector('#btn-ws-create-empty');
      if (emptyCreate) {
        emptyCreate.addEventListener('click', () => openWorkspaceEditor(null));
      }
    }
  }

  function workspaceKeySuggestions() {
    const names = new Set();
    store.getAll({ allBuiltins: true }).forEach((p) => {
      template.parseVariables(p.template).forEach((v) => {
        if (!v.autofill) names.add(template.normaliseKey(v.name));
      });
      template.listBlocks(p.template).forEach((b) => names.add(template.normaliseKey(b)));
    });
    return Array.from(names).sort().slice(0, 400);
  }

  function workspaceFieldRow(field) {
    return (
      '<div class="ws-field-row">' +
      '<input type="text" class="ws-key" list="ws-key-suggestions" maxlength="60" placeholder="client_name" aria-label="Value name" value="' +
      escapeAttr(field.key || '') +
      '" />' +
      '<textarea class="ws-value" rows="2" placeholder="The value" aria-label="Value">' +
      escapeHtml(field.value || '') +
      '</textarea>' +
      '<button type="button" class="btn-table btn-mini" data-remove-field title="Remove this value" aria-label="Remove this value">✕</button>' +
      '</div>'
    );
  }

  function bindWorkspaceFieldRows() {
    el.wsFields.querySelectorAll('[data-remove-field]').forEach((btn) => {
      btn.addEventListener('click', () => btn.closest('.ws-field-row').remove());
    });
  }

  let wsInitialSnapshot = null;

  function getWorkspaceSnapshot() {
    return JSON.stringify({
      id: (el.wsId && el.wsId.value) || '',
      name: (el.wsName && el.wsName.value) || '',
      fields: readWorkspaceFields()
    });
  }

  function isWorkspaceDirty() {
    if (!el.workspaceEditor || el.workspaceEditor.hidden) return false;
    if (!wsInitialSnapshot) return false;
    return getWorkspaceSnapshot() !== wsInitialSnapshot;
  }

  function openWorkspaceEditor(ws) {
    if (!ws && !isPro()) {
      openUpgradeModal('workspaces');
      return;
    }
    if (isWorkspaceDirty()) {
      if (!window.confirm('You have unsaved changes in this workspace. Discard them?')) return;
    }
    const w = ws || { name: '', fields: [{ key: 'client_name', value: '' }, { key: 'tone', value: '' }, { key: 'client_brief', value: '' }] };
    editingWorkspaceId = w.id || null;
    el.wsId.value = w.id || '';
    el.wsName.value = w.name || '';
    if (el.wsNameGroup) el.wsNameGroup.classList.remove('has-error');
    if (el.wsName) el.wsName.removeAttribute('aria-invalid');
    if (el.wsNameError) el.wsNameError.textContent = '';
    if (el.wsFieldsError) el.wsFieldsError.textContent = '';
    if (el.wsFreeNotice) {
      el.wsFreeNotice.hidden = isPro();
    }
    el.wsFields.innerHTML = (w.fields.length ? w.fields : [{ key: '', value: '' }]).map(workspaceFieldRow).join('');
    bindWorkspaceFieldRows();
    el.wsKeySuggestions.innerHTML = workspaceKeySuggestions()
      .map((k) => '<option value="' + escapeAttr(k) + '"></option>')
      .join('');
    el.wsDelete.style.display = w.id ? '' : 'none';
    paintWorkspaceUseButton();
    el.workspaceEditor.hidden = false;
    renderWorkspaces();
    wsInitialSnapshot = getWorkspaceSnapshot();
    el.wsName.focus();
  }

  function paintWorkspaceUseButton() {
    const active = store.getActiveWorkspace();
    const id = el.wsId.value;
    el.wsUse.style.display = id ? '' : 'none';
    el.wsUse.textContent = active && active.id === id ? 'Stop using it' : 'Use this workspace';
  }

  function readWorkspaceFields() {
    return Array.from(el.wsFields.querySelectorAll('.ws-field-row'))
      .map((row) => ({
        key: row.querySelector('.ws-key').value.trim(),
        value: row.querySelector('.ws-value').value
      }))
      .filter((f) => f.key);
  }

  function bindWorkspaces() {
    if (!el.workspaceEditor) return;

    el.newWorkspace.addEventListener('click', () => openWorkspaceEditor(null));

    if (el.wsDeactivateBanner) {
      el.wsDeactivateBanner.addEventListener('click', async () => {
        try {
          await store.setActiveWorkspace('');
          renderWorkspaces();
          paintWorkspaceUseButton();
          showToast('No workspace in use.');
        } catch (err) {
          handleProError(err);
        }
      });
    }

    if (el.wsFreeUpgrade) {
      el.wsFreeUpgrade.addEventListener('click', () => openUpgradeModal('workspaces'));
    }

    if (el.wsName) {
      el.wsName.addEventListener('input', () => {
        if (el.wsName.value.trim()) {
          if (el.wsNameGroup) el.wsNameGroup.classList.remove('has-error');
          el.wsName.removeAttribute('aria-invalid');
          if (el.wsNameError) el.wsNameError.textContent = '';
        }
      });
    }

    el.workspaceEmpty.addEventListener('click', (e) => {
      const btn = e.target.closest && e.target.closest('[data-upgrade]');
      if (btn) openUpgradeModal(btn.getAttribute('data-upgrade'));
    });

    el.wsAddField.addEventListener('click', () => {
      el.wsFields.insertAdjacentHTML('beforeend', workspaceFieldRow({ key: '', value: '' }));
      bindWorkspaceFieldRows();
      const keys = el.wsFields.querySelectorAll('.ws-key');
      if (keys.length) keys[keys.length - 1].focus();
    });

    el.workspaceEditor.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = el.wsName.value.trim();
      if (!name) {
        if (el.wsNameGroup) el.wsNameGroup.classList.add('has-error');
        el.wsName.setAttribute('aria-invalid', 'true');
        if (el.wsNameError) el.wsNameError.textContent = 'Give the workspace a name.';
        el.wsName.focus();
        return;
      }

      if (!isPro()) {
        openUpgradeModal('workspaces');
        return;
      }

      const existing = el.wsId.value ? store.getWorkspace(el.wsId.value) : null;
      const clash = store.getWorkspaces().some((w) => {
        return w.name.toLowerCase() === name.toLowerCase() && (!existing || w.id !== existing.id);
      });
      if (clash) {
        if (el.wsNameGroup) el.wsNameGroup.classList.add('has-error');
        el.wsName.setAttribute('aria-invalid', 'true');
        if (el.wsNameError) el.wsNameError.textContent = 'A workspace called "' + name + '" already exists.';
        el.wsName.focus();
        return;
      }

      try {
        const saved = await store.saveWorkspace({
          id: el.wsId.value || undefined,
          name: name,
          fields: readWorkspaceFields()
        });
        editingWorkspaceId = saved.id;
        el.wsId.value = saved.id;
        el.wsDelete.style.display = '';
        paintWorkspaceUseButton();
        renderWorkspaces();
        wsInitialSnapshot = getWorkspaceSnapshot();
        showToast('Workspace saved.');
      } catch (err) {
        handleProError(err);
      }
    });

    el.wsDelete.addEventListener('click', async () => {
      const id = el.wsId.value;
      const ws = store.getWorkspace(id);
      if (!ws) return;
      if (!window.confirm('Delete the workspace "' + ws.name + '"?\n\nPrompts are not affected. Daily backups keep a copy.')) return;
      await store.deleteWorkspace(id);
      wsInitialSnapshot = null;
      editingWorkspaceId = null;
      el.workspaceEditor.hidden = true;
      renderWorkspaces();
      showToast('Workspace deleted.');
    });

    el.wsUse.addEventListener('click', async () => {
      if (!isPro()) {
        openUpgradeModal('workspaces');
        return;
      }
      const id = el.wsId.value;
      const active = store.getActiveWorkspace();
      const next = active && active.id === id ? '' : id;
      try {
        await store.setActiveWorkspace(next);
        paintWorkspaceUseButton();
        renderWorkspaces();
        showToast(next ? 'Workspace in use. Forms and blocks fill from it.' : 'No workspace in use.');
      } catch (err) {
        handleProError(err);
      }
    });
  }


  /* =====================================================================
     Stepped chains (Pro)
     ===================================================================== */

  let editingChainId = null;

  function renderChains() {
    if (!el.chainList) return;
    const list = store.getChains();
    const pro = isPro();
    const prefix = settings && settings.slashEnabled ? settings.slashTriggerChar : '';

    el.chainList.innerHTML = list
      .map(
        (c) =>
          '<li class="item-row' +
          (c.id === editingChainId ? ' active' : '') +
          '"><button type="button" class="item-main" data-chain="' +
          escapeAttr(c.id) +
          '"><strong>' +
          escapeHtml(c.title) +
          '</strong><span>' +
          c.steps.length +
          ' step' +
          (c.steps.length === 1 ? '' : 's') +
          (c.shortcut && prefix ? ' · ' + escapeHtml(prefix + c.shortcut) : '') +
          '</span></button></li>'
      )
      .join('');

    el.chainList.querySelectorAll('[data-chain]').forEach((btn) => {
      btn.addEventListener('click', () => openChainEditor(store.getChain(btn.getAttribute('data-chain'))));
    });

    const editing = !el.chainEditor.hidden;
    el.chainEmpty.style.display = editing ? 'none' : '';
    if (!editing) {
      el.chainEmpty.innerHTML = !pro
        ? '<p>Stepped chains are part of OmniPrompt Pro. ' +
          (list.length ? 'Your saved chains are kept here and in your backups.' : '') +
          '</p><button type="button" class="btn-secondary" data-upgrade="chains">What Pro adds</button>'
        : list.length
        ? '<p>Pick a chain to edit it.</p>'
        : '<p>No chains yet. Try one for a task you always do in the same order, like research, draft, then review.</p>';
    }
  }

  function extractTokensFromText(text) {
    if (!text) return [];
    const re = /\{\{([^}]+)\}\}/g;
    const tokens = [];
    const seen = {};
    let m;
    while ((m = re.exec(text)) !== null) {
      const raw = m[0];
      if (!seen[raw]) {
        seen[raw] = true;
        const inner = m[1].trim();
        tokens.push({
          raw: raw,
          isBlock: inner.charAt(0) === '@'
        });
      }
    }
    return tokens;
  }

  function chainStepHtml(step, index, total) {
    const tokens = extractTokensFromText(step.template || '');
    const tokensHtml = tokens.length
      ? tokens.map((t) => '<span class="chain-token-chip' + (t.isBlock ? ' is-block' : '') + '">' + escapeHtml(t.raw) + '</span>').join('')
      : '<span class="chain-step-tokens-empty" style="color:var(--text-3); font-size:11px;">No fields yet</span>';

    return (
      '<li class="chain-step" data-step-id="' +
      escapeAttr(step.id || '') +
      '" data-step-index="' +
      index +
      '">' +
      '<div class="chain-step-head">' +
      '<button type="button" class="chain-drag-handle" draggable="true" title="Drag to reorder" aria-label="Drag step ' +
      (index + 1) +
      ' to reorder">⋮⋮</button>' +
      '<span class="chain-step-num">Step ' +
      (index + 1) +
      '</span>' +
      '<input type="text" class="chain-step-title" maxlength="80" placeholder="What this step does" aria-label="Step ' +
      (index + 1) +
      ' title" value="' +
      escapeAttr(step.title || '') +
      '" />' +
      '<button type="button" class="btn-table btn-mini" data-move="-1" title="Move up" aria-label="Move step ' +
      (index + 1) +
      ' up"' +
      (index === 0 ? ' disabled' : '') +
      '>↑</button>' +
      '<button type="button" class="btn-table btn-mini" data-move="1" title="Move down" aria-label="Move step ' +
      (index + 1) +
      ' down"' +
      (index === total - 1 ? ' disabled' : '') +
      '>↓</button>' +
      '<button type="button" class="btn-table btn-mini" data-remove-step title="Remove step ' +
      (index + 1) +
      '" aria-label="Remove step ' +
      (index + 1) +
      '">✕</button>' +
      '</div>' +
      '<textarea class="chain-step-template" rows="5" aria-label="Step ' +
      (index + 1) +
      ' text" placeholder="The prompt for this step. {{fields}} work here.">' +
      escapeHtml(step.template || '') +
      '</textarea>' +
      '<div class="chain-step-tokens" aria-label="Detected variables in step ' +
      (index + 1) +
      '">' +
      tokensHtml +
      '</div>' +
      '</li>'
    );
  }

  function readChainSteps() {
    return Array.from(el.chainSteps.querySelectorAll('.chain-step')).map((li) => ({
      id: li.getAttribute('data-step-id') || undefined,
      title: li.querySelector('.chain-step-title').value,
      template: li.querySelector('.chain-step-template').value
    }));
  }

  let draggedStepIndex = null;

  function renderChainSteps(steps) {
    if (el.chainStepsCount) {
      el.chainStepsCount.textContent = steps.length + ' step' + (steps.length === 1 ? '' : 's');
    }
    if (el.chainStepsError) {
      el.chainStepsError.textContent = '';
      el.chainStepsError.style.display = 'none';
    }

    el.chainSteps.innerHTML = steps.map((s, i) => chainStepHtml(s, i, steps.length)).join('');

    el.chainSteps.querySelectorAll('.chain-step').forEach((li, i) => {
      const handle = li.querySelector('.chain-drag-handle');
      const textarea = li.querySelector('.chain-step-template');
      const tokensContainer = li.querySelector('.chain-step-tokens');

      // Update tokens on typing
      textarea.addEventListener('input', () => {
        const tokens = extractTokensFromText(textarea.value);
        tokensContainer.innerHTML = tokens.length
          ? tokens.map((t) => '<span class="chain-token-chip' + (t.isBlock ? ' is-block' : '') + '">' + escapeHtml(t.raw) + '</span>').join('')
          : '<span class="chain-step-tokens-empty" style="color:var(--text-3); font-size:11px;">No fields yet</span>';
      });

      // Keyboard move
      li.querySelectorAll('[data-move]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const all = readChainSteps();
          const to = i + parseInt(btn.getAttribute('data-move'), 10);
          if (to < 0 || to >= all.length) return;
          const moved = all.splice(i, 1)[0];
          all.splice(to, 0, moved);
          renderChainSteps(all);
          if (el.chainLiveRegion) {
            el.chainLiveRegion.textContent = 'Moved step to position ' + (to + 1) + ' of ' + all.length + '.';
          }
          const fresh = el.chainSteps.querySelectorAll('.chain-step');
          if (fresh[to]) {
            const focusTarget = fresh[to].querySelector('[data-move="' + btn.getAttribute('data-move') + '"]');
            if (focusTarget && !focusTarget.disabled) focusTarget.focus();
          }
        });
      });

      // Remove step
      li.querySelector('[data-remove-step]').addEventListener('click', () => {
        const all = readChainSteps();
        all.splice(i, 1);
        renderChainSteps(all.length ? all : [{ title: '', template: '' }]);
      });

      // HTML5 Drag and drop
      if (handle) {
        handle.addEventListener('dragstart', (e) => {
          draggedStepIndex = i;
          li.classList.add('is-dragging');
          e.dataTransfer.effectAllowed = 'move';
          try {
            e.dataTransfer.setData('text/plain', String(i));
          } catch (err) {}
        });

        handle.addEventListener('dragend', () => {
          li.classList.remove('is-dragging');
          el.chainSteps.querySelectorAll('.chain-step').forEach((s) => {
            s.classList.remove('drop-target-above', 'drop-target-below');
          });
          draggedStepIndex = null;
        });
      }

      li.addEventListener('dragover', (e) => {
        if (draggedStepIndex === null || draggedStepIndex === i) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        const rect = li.getBoundingClientRect();
        const mid = rect.top + rect.height / 2;
        if (e.clientY < mid) {
          li.classList.add('drop-target-above');
          li.classList.remove('drop-target-below');
        } else {
          li.classList.add('drop-target-below');
          li.classList.remove('drop-target-above');
        }
      });

      li.addEventListener('dragleave', () => {
        li.classList.remove('drop-target-above', 'drop-target-below');
      });

      li.addEventListener('drop', (e) => {
        e.preventDefault();
        li.classList.remove('drop-target-above', 'drop-target-below');
        if (draggedStepIndex === null || draggedStepIndex === i) return;
        const rect = li.getBoundingClientRect();
        const mid = rect.top + rect.height / 2;
        const all = readChainSteps();
        const item = all.splice(draggedStepIndex, 1)[0];
        let targetIdx = e.clientY < mid ? i : i + 1;
        if (draggedStepIndex < targetIdx) targetIdx -= 1;
        all.splice(targetIdx, 0, item);
        renderChainSteps(all);
        if (el.chainLiveRegion) {
          el.chainLiveRegion.textContent = 'Moved step to position ' + (targetIdx + 1) + ' of ' + all.length + '.';
        }
      });
    });
  }

  function renderChainPromptPicker() {
    el.chainAddFromPrompt.innerHTML =
      '<option value="">Add a step from a prompt…</option>' +
      store
        .getAll()
        .map((p) => '<option value="' + escapeAttr(p.id) + '">' + escapeHtml(p.title) + '</option>')
        .join('');
  }

  let chainInitialSnapshot = null;

  function getChainSnapshot() {
    return JSON.stringify({
      id: (el.chainId && el.chainId.value) || '',
      title: (el.chainTitle && el.chainTitle.value) || '',
      shortcut: (el.chainShortcut && el.chainShortcut.value) || '',
      description: (el.chainDescription && el.chainDescription.value) || '',
      steps: readChainSteps()
    });
  }

  function isChainDirty() {
    if (!el.chainEditor || el.chainEditor.hidden) return false;
    if (!chainInitialSnapshot) return false;
    return getChainSnapshot() !== chainInitialSnapshot;
  }

  function openChainEditor(chain) {
    if (!chain && !isPro()) {
      openUpgradeModal('chains');
      return;
    }
    if (isChainDirty()) {
      if (!window.confirm('You have unsaved changes in this chain. Discard them?')) return;
    }
    const c = chain || { title: '', shortcut: '', description: '', steps: [{ title: '', template: '' }, { title: '', template: '' }] };
    editingChainId = c.id || null;
    el.chainId.value = c.id || '';
    el.chainTitle.value = c.title || '';
    el.chainShortcut.value = c.shortcut || '';
    el.chainDescription.value = c.description || '';

    if (el.chainTitleError) {
      el.chainTitleError.textContent = '';
      el.chainTitle.removeAttribute('aria-invalid');
    }
    if (el.chainStepsError) {
      el.chainStepsError.textContent = '';
      el.chainStepsError.style.display = 'none';
    }

    if (el.chainFreeNotice) {
      el.chainFreeNotice.hidden = isPro();
    }
    if (el.chainSaveBtn) {
      el.chainSaveBtn.textContent = isPro() ? 'Save chain' : 'Save chain (Pro)';
    }

    renderChainSteps(c.steps);
    renderChainPromptPicker();
    paintChainShortcutNote();
    el.chainDelete.style.display = c.id ? '' : 'none';
    el.chainEditor.hidden = false;
    renderChains();
    chainInitialSnapshot = getChainSnapshot();
    el.chainTitle.focus();
  }

  function paintChainShortcutNote() {
    const value = el.chainShortcut.value.trim().toLowerCase().replace(/^\/+/, '');
    const prefix = settings.slashTriggerChar || '//';
    if (!value) {
      el.chainShortcutNote.textContent = 'Optional. Type it in any text box to start the chain.';
      return;
    }
    const promptClash = findShortcutClash(value, null);
    const chainClash = store.findChainByShortcut(value, el.chainId.value || null);
    const clash = promptClash || chainClash;
    el.chainShortcutNote.textContent = clash
      ? 'Already used by “' + clash.title + '”.'
      : 'Type ' + prefix + value + ' to start it.';
  }

  function bindChains() {
    if (!el.chainEditor) return;

    el.newChain.addEventListener('click', () => openChainEditor(null));

    el.chainEmpty.addEventListener('click', (e) => {
      const btn = e.target.closest && e.target.closest('[data-upgrade]');
      if (btn) openUpgradeModal(btn.getAttribute('data-upgrade'));
    });

    el.chainShortcut.addEventListener('input', paintChainShortcutNote);

    el.chainTitle.addEventListener('input', () => {
      if (el.chainTitleError) {
        el.chainTitleError.textContent = '';
        el.chainTitle.removeAttribute('aria-invalid');
      }
    });

    el.chainAddStep.addEventListener('click', () => {
      const all = readChainSteps();
      all.push({ title: '', template: '' });
      renderChainSteps(all);
      const areas = el.chainSteps.querySelectorAll('.chain-step-template');
      if (areas.length) areas[areas.length - 1].focus();
    });

    el.chainAddFromPrompt.addEventListener('change', () => {
      const p = store.getById(el.chainAddFromPrompt.value);
      el.chainAddFromPrompt.value = '';
      if (!p) return;
      // Drop an empty last step so picking a prompt fills it instead.
      const all = readChainSteps().filter((s, i, arr) => s.template.trim() || i !== arr.length - 1);
      all.push({ title: p.title, template: p.template });
      renderChainSteps(all);
    });

    el.chainEditor.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!isPro()) {
        openUpgradeModal('chains');
        return;
      }

      const title = el.chainTitle.value.trim();
      if (!title) {
        if (el.chainTitleError) el.chainTitleError.textContent = 'Give the chain a title.';
        el.chainTitle.setAttribute('aria-invalid', 'true');
        el.chainTitle.focus();
        return;
      }

      const steps = readChainSteps();
      const validSteps = steps.filter((s) => (s.template && s.template.trim()) || (s.title && s.title.trim()));
      if (!validSteps.length) {
        if (el.chainStepsError) {
          el.chainStepsError.textContent = 'A chain needs at least one step with prompt text.';
          el.chainStepsError.style.display = 'block';
        }
        return;
      }

      try {
        const saved = await store.saveChain({
          id: el.chainId.value || undefined,
          title: title,
          shortcut: el.chainShortcut.value,
          description: el.chainDescription.value,
          steps: steps
        });
        editingChainId = saved.id;
        el.chainId.value = saved.id;
        el.chainDelete.style.display = '';
        renderChainSteps(saved.steps);
        renderChains();
        chainInitialSnapshot = getChainSnapshot();
        showToast('Chain saved with ' + saved.steps.length + ' step' + (saved.steps.length === 1 ? '' : 's') + '.');
      } catch (err) {
        handleProError(err);
      }
    });

    el.chainDelete.addEventListener('click', async () => {
      const id = el.chainId.value;
      const chain = store.getChain(id);
      if (!chain) return;
      if (!window.confirm('Delete the chain "' + chain.title + '"?\n\nThe prompts it was built from are not affected.')) return;
      await store.deleteChain(id);
      chainInitialSnapshot = null;
      editingChainId = null;
      el.chainEditor.hidden = true;
      renderChains();
      showToast('Chain deleted.');
    });
  }

  /* =====================================================================
     Custom right-click modifiers (Pro)
     ===================================================================== */

  let editingModifierId = null;
  let modInitialSnapshot = null;

  function getModifierSnapshot() {
    return JSON.stringify({
      id: (el.modId && el.modId.value) || '',
      title: (el.modTitle && el.modTitle.value) || '',
      placement: (el.modPlacement && el.modPlacement.value) || 'quote',
      desc: (el.modDesc && el.modDesc.value) || '',
      instruction: (el.modInstruction && el.modInstruction.value) || ''
    });
  }

  function isModifierDirty() {
    if (!el.modifierEditor || el.modifierEditor.hidden) return false;
    if (!modInitialSnapshot) return false;
    return getModifierSnapshot() !== modInitialSnapshot;
  }

  function renderModifiers() {
    if (!el.modifierList) return;
    const list = store.getCustomModifiers();
    const pro = store.isPro();

    el.modifierList.innerHTML = list
      .map((m) => {
        const active = m.id === editingModifierId;
        const sub = (m.description || m.instruction || '').slice(0, 50);
        return (
          '<li class="item-row' +
          (active ? ' is-active' : '') +
          '"><button type="button" class="item-main" data-mod="' +
          escapeAttr(m.id) +
          '"><strong>' +
          escapeHtml(m.title) +
          '</strong><span>' +
          escapeHtml(m.placement || 'quote') +
          (sub ? ' · ' + escapeHtml(sub) : '') +
          '</span></button></li>'
        );
      })
      .join('');

    el.modifierList.querySelectorAll('[data-mod]').forEach((btn) => {
      btn.addEventListener('click', () => openModifierEditor(store.getCustomModifier(btn.getAttribute('data-mod'))));
    });

    const editing = !el.modifierEditor.hidden;
    el.modifierEmpty.style.display = editing ? 'none' : '';
    if (!editing) {
      el.modifierEmpty.innerHTML = !pro
        ? '<p>Custom modifiers are part of OmniPrompt Pro. ' +
          (list.length ? 'Your ' + list.length + ' custom modifier' + (list.length === 1 ? '' : 's') + ' can be viewed and exported here.' : 'Create up to 30 custom right-click actions.') +
          '</p><button type="button" class="btn-secondary" data-upgrade="customModifiers">What Pro adds</button>'
        : list.length
        ? '<p>Pick a modifier to edit it, or create a new one.</p>'
        : '<p>No custom modifiers yet. Create actions for your browser right-click menu (e.g. summarize, critique, translate).</p>' +
          '<button type="button" class="btn-primary btn-mini" id="btn-mod-create-empty">+ Create modifier</button>';
      const emptyBtn = el.modifierEmpty.querySelector('#btn-mod-create-empty');
      if (emptyBtn) emptyBtn.addEventListener('click', () => openModifierEditor(null));
      const upgBtn = el.modifierEmpty.querySelector('[data-upgrade]');
      if (upgBtn) upgBtn.addEventListener('click', () => openUpgradeModal('customModifiers'));
    }
  }

  function openModifierEditor(mod) {
    if (!mod && !store.isPro()) {
      openUpgradeModal('customModifiers');
      return;
    }
    if (isModifierDirty()) {
      if (!window.confirm('You have unsaved changes in this modifier. Discard them?')) return;
    }
    const m = mod || { title: '', placement: 'quote', description: '', instruction: '' };
    editingModifierId = m.id || null;
    el.modId.value = m.id || '';
    el.modTitle.value = m.title || '';
    el.modPlacement.value = m.placement || 'quote';
    el.modDesc.value = m.description || '';
    el.modInstruction.value = m.instruction || '';

    if (el.modTitleError) el.modTitleError.textContent = '';
    if (el.modInstructionError) el.modInstructionError.textContent = '';
    el.modTitle.removeAttribute('aria-invalid');
    el.modInstruction.removeAttribute('aria-invalid');

    if (el.modifierFreeNotice) {
      el.modifierFreeNotice.hidden = store.isPro();
    }
    el.modDelete.style.display = m.id ? '' : 'none';
    el.modifierEditor.hidden = false;
    renderModifiers();
    modInitialSnapshot = getModifierSnapshot();
    el.modTitle.focus();
  }

  function bindModifiers() {
    if (!el.modifierEditor) return;

    if (el.newModifier) {
      el.newModifier.addEventListener('click', () => openModifierEditor(null));
    }

    if (el.modDelete) {
      el.modDelete.addEventListener('click', async () => {
        const id = el.modId.value;
        if (!id) return;
        if (!window.confirm('Delete this custom modifier?')) return;
        await store.deleteCustomModifier(id);
        editingModifierId = null;
        el.modifierEditor.hidden = true;
        renderModifiers();
        showToast('Modifier deleted.');
      });
    }

    el.modifierEditor.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!store.isPro()) {
        openUpgradeModal('customModifiers');
        return;
      }
      const title = el.modTitle.value.trim();
      if (!title) {
        if (el.modTitleError) el.modTitleError.textContent = 'Enter a modifier name.';
        el.modTitle.setAttribute('aria-invalid', 'true');
        el.modTitle.focus();
        return;
      }
      const instruction = el.modInstruction.value.trim();
      if (!instruction) {
        if (el.modInstructionError) el.modInstructionError.textContent = 'Enter instructions for this modifier.';
        el.modInstruction.setAttribute('aria-invalid', 'true');
        el.modInstruction.focus();
        return;
      }

      try {
        const saved = await store.saveCustomModifier({
          id: el.modId.value || undefined,
          title: title,
          placement: el.modPlacement.value,
          description: el.modDesc.value.trim(),
          instruction: instruction
        });
        editingModifierId = saved.id;
        el.modId.value = saved.id;
        el.modDelete.style.display = '';
        renderModifiers();
        modInitialSnapshot = getModifierSnapshot();
        showToast('Modifier saved.');
      } catch (err) {
        handleProError(err);
      }
    });
  }

  /* =====================================================================
     Site rules (Pro)
     ===================================================================== */

  let editingRuleId = null;
  let ruleInitialSnapshot = null;

  function getRuleSnapshot() {
    return JSON.stringify({
      id: (el.ruleId && el.ruleId.value) || '',
      name: (el.ruleName && el.ruleName.value) || '',
      hosts: (el.ruleHosts && el.ruleHosts.value) || '',
      tags: (el.ruleTags && el.ruleTags.value) || '',
      folder: (el.ruleFolders && el.ruleFolders.value) || ''
    });
  }

  function isRuleDirty() {
    if (!el.ruleEditor || el.ruleEditor.hidden) return false;
    if (!ruleInitialSnapshot) return false;
    return getRuleSnapshot() !== ruleInitialSnapshot;
  }

  function renderRules() {
    if (!el.ruleList) return;
    const list = store.getSiteRules();
    const pro = store.isPro();

    el.ruleList.innerHTML = list
      .map((r) => {
        const active = r.id === editingRuleId;
        const hostsStr = (r.hosts || []).join(', ');
        return (
          '<li class="item-row' +
          (active ? ' is-active' : '') +
          '"><button type="button" class="item-main" data-rule="' +
          escapeAttr(r.id) +
          '"><strong>' +
          escapeHtml(r.name) +
          '</strong><span>' +
          escapeHtml(hostsStr || 'No domains') +
          '</span></button></li>'
        );
      })
      .join('');

    el.ruleList.querySelectorAll('[data-rule]').forEach((btn) => {
      btn.addEventListener('click', () => openRuleEditor(store.getSiteRule(btn.getAttribute('data-rule'))));
    });

    const editing = !el.ruleEditor.hidden;
    el.ruleEmpty.style.display = editing ? 'none' : '';
    if (!editing) {
      el.ruleEmpty.innerHTML = !pro
        ? '<p>Site rules are part of OmniPrompt Pro. ' +
          (list.length ? 'Your ' + list.length + ' site rule' + (list.length === 1 ? '' : 's') + ' can be viewed and exported here.' : 'Show relevant prompts first on specific websites.') +
          '</p><button type="button" class="btn-secondary" data-upgrade="siteRules">What Pro adds</button>'
        : list.length
        ? '<p>Pick a rule to edit it, or create a new one.</p>'
        : '<p>No site rules yet. Pin email prompts on Gmail, code prompts on GitHub, etc.</p>' +
          '<button type="button" class="btn-primary btn-mini" id="btn-rule-create-empty">+ Create site rule</button>';
      const emptyBtn = el.ruleEmpty.querySelector('#btn-rule-create-empty');
      if (emptyBtn) emptyBtn.addEventListener('click', () => openRuleEditor(null));
      const upgBtn = el.ruleEmpty.querySelector('[data-upgrade]');
      if (upgBtn) upgBtn.addEventListener('click', () => openUpgradeModal('siteRules'));
    }

    renderRuleFoldersOptions();
  }

  function renderRuleFoldersOptions(selectedFolderId) {
    if (!el.ruleFolders) return;
    const folders = store.getFolders();
    el.ruleFolders.innerHTML =
      '<option value="">(None - all folders)</option>' +
      folders
        .map((f) => '<option value="' + escapeAttr(f.id) + '"' + (f.id === selectedFolderId ? ' selected' : '') + '>' + escapeHtml(f.name) + '</option>')
        .join('');
  }

  function checkRuleHostPermissions() {
    if (!el.ruleHostPermBanner || !el.ruleHosts) return;
    const val = el.ruleHosts.value;
    const hosts = val.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
    if (!hosts.length) {
      el.ruleHostPermBanner.style.display = 'none';
      return;
    }
    const currentSettings = store.getSettings();
    if (currentSettings && currentSettings.runOnAllSites) {
      el.ruleHostPermBanner.style.display = 'none';
      return;
    }
    let unpermitted = null;
    for (let i = 0; i < hosts.length; i++) {
      let h = hosts[i].replace(/^\*\./, '');
      if (h && !store.isSitePermitted(h)) {
        unpermitted = h;
        break;
      }
    }
    if (unpermitted) {
      if (el.ruleHostPermText) {
        el.ruleHostPermText.textContent = 'OmniPrompt is not turned on for ' + unpermitted + ' yet.';
      }
      el.ruleHostPermBanner.setAttribute('data-host', unpermitted);
      el.ruleHostPermBanner.style.display = 'flex';
    } else {
      el.ruleHostPermBanner.style.display = 'none';
    }
  }

  function openRuleEditor(rule) {
    if (!rule && !store.isPro()) {
      openUpgradeModal('siteRules');
      return;
    }
    if (isRuleDirty()) {
      if (!window.confirm('You have unsaved changes in this site rule. Discard them?')) return;
    }
    const r = rule || { name: '', hosts: [], tags: [], folders: [] };
    editingRuleId = r.id || null;
    el.ruleId.value = r.id || '';
    el.ruleName.value = r.name || '';
    el.ruleHosts.value = (r.hosts || []).join(', ');
    el.ruleTags.value = (r.tags || []).join(', ');
    renderRuleFoldersOptions((r.folders && r.folders[0]) || '');

    if (el.ruleNameError) el.ruleNameError.textContent = '';
    if (el.ruleHostsError) el.ruleHostsError.textContent = '';
    el.ruleName.removeAttribute('aria-invalid');
    el.ruleHosts.removeAttribute('aria-invalid');

    if (el.ruleFreeNotice) {
      el.ruleFreeNotice.hidden = store.isPro();
    }
    el.ruleDelete.style.display = r.id ? '' : 'none';
    el.ruleEditor.hidden = false;
    checkRuleHostPermissions();
    renderRules();
    ruleInitialSnapshot = getRuleSnapshot();
    el.ruleName.focus();
  }

  function bindRules() {
    if (!el.ruleEditor) return;

    if (el.newRule) {
      el.newRule.addEventListener('click', () => openRuleEditor(null));
    }

    // Presets
    document.querySelectorAll('.site-rule-presets button[data-preset]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const preset = btn.getAttribute('data-preset');
        let pName = '';
        let pHosts = '';
        if (preset === 'email') {
          pName = 'Email';
          pHosts = 'mail.google.com, outlook.live.com, mail.yahoo.com';
        } else if (preset === 'code') {
          pName = 'Code';
          pHosts = 'github.com, gitlab.com, stackoverflow.com';
        } else if (preset === 'chat') {
          pName = 'Work chat';
          pHosts = 'slack.com, discord.com, teams.microsoft.com';
        } else if (preset === 'docs') {
          pName = 'Docs';
          pHosts = 'docs.google.com, notion.so, coda.io';
        }
        if (el.ruleEditor.hidden) {
          openRuleEditor({ name: pName, hosts: pHosts.split(', ') });
        } else {
          if (!el.ruleName.value.trim()) el.ruleName.value = pName;
          el.ruleHosts.value = el.ruleHosts.value ? el.ruleHosts.value + ', ' + pHosts : pHosts;
          checkRuleHostPermissions();
        }
      });
    });

    if (el.ruleHosts) {
      el.ruleHosts.addEventListener('input', checkRuleHostPermissions);
    }

    if (el.btnRuleGrantHost) {
      el.btnRuleGrantHost.addEventListener('click', async () => {
        const host = el.ruleHostPermBanner.getAttribute('data-host');
        if (!host) return;
        const origin = 'https://' + host + '/*';
        chrome.permissions.request({ origins: [origin] }, async (granted) => {
          if (granted) {
            await store.addEnabledSite(host);
            checkRuleHostPermissions();
            showToast('Turned on for ' + host + '.');
          } else {
            showToast('Permission not granted.');
          }
        });
      });
    }

    if (el.ruleDelete) {
      el.ruleDelete.addEventListener('click', async () => {
        const id = el.ruleId.value;
        if (!id) return;
        if (!window.confirm('Delete this site rule?')) return;
        await store.deleteSiteRule(id);
        editingRuleId = null;
        el.ruleEditor.hidden = true;
        renderRules();
        showToast('Site rule deleted.');
      });
    }

    el.ruleEditor.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!store.isPro()) {
        openUpgradeModal('siteRules');
        return;
      }
      const name = el.ruleName.value.trim();
      if (!name) {
        if (el.ruleNameError) el.ruleNameError.textContent = 'Enter a rule name.';
        el.ruleName.setAttribute('aria-invalid', 'true');
        el.ruleName.focus();
        return;
      }
      const hostsVal = el.ruleHosts.value.trim();
      const hosts = hostsVal.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
      if (!hosts.length) {
        if (el.ruleHostsError) el.ruleHostsError.textContent = 'Enter at least one domain.';
        el.ruleHosts.setAttribute('aria-invalid', 'true');
        el.ruleHosts.focus();
        return;
      }
      const tags = el.ruleTags.value.split(',').map((s) => s.trim()).filter(Boolean);
      const folderVal = el.ruleFolders.value;
      const folders = folderVal ? [folderVal] : [];

      try {
        const saved = await store.saveSiteRule({
          id: el.ruleId.value || undefined,
          name: name,
          hosts: hosts,
          tags: tags,
          folders: folders
        });
        editingRuleId = saved.id;
        el.ruleId.value = saved.id;
        el.ruleDelete.style.display = '';
        renderRules();
        ruleInitialSnapshot = getRuleSnapshot();
        showToast('Site rule saved.');
      } catch (err) {
        handleProError(err);
      }
    });
  }

  /* =====================================================================
     Compare across AIs modal (Pro)
     ===================================================================== */

  let compareModalPrompt = null;

  function openOptionsCompareModal(promptId) {
    if (!store.isPro()) {
      openUpgradeModal('compare');
      return;
    }
    const p = store.getById(promptId);
    if (!p) return;
    compareModalPrompt = p;

    if (el.compareModalTitle) {
      el.compareModalTitle.textContent = 'Compare: ' + p.title;
    }

    const allTargets = (window.ChatbotAdapters && window.ChatbotAdapters.COMPARE_TARGETS) ||
      store.getCompareTargets() || [
        { id: 'chatgpt', name: 'ChatGPT' },
        { id: 'claude', name: 'Claude' },
        { id: 'gemini', name: 'Gemini' },
        { id: 'copilot', name: 'Copilot' },
        { id: 'perplexity', name: 'Perplexity' },
        { id: 'deepseek', name: 'DeepSeek' }
      ];

    const lastChosen = store.getLastCompareTargets();

    el.compareModalTargets.innerHTML = allTargets
      .map((t) => {
        const checked = lastChosen.indexOf(t.id) !== -1;
        return (
          '<label class="omni-compare-target-item" style="display:flex; align-items:center; gap:6px; font-size:13px; cursor:pointer;">' +
          '<input type="checkbox" value="' +
          escapeAttr(t.id) +
          '"' +
          (checked ? ' checked' : '') +
          ' />' +
          '<span>' +
          escapeHtml(t.name) +
          '</span>' +
          '</label>'
        );
      })
      .join('');

    el.compareModalTargets.querySelectorAll('input[type="checkbox"]').forEach((box) => {
      box.addEventListener('change', () => {
        const checked = el.compareModalTargets.querySelectorAll('input[type="checkbox"]:checked');
        if (checked.length > 6) {
          box.checked = false;
          showToast('You can compare up to 6 AIs at a time.');
        }
      });
    });

    const vars = template.parseVariables(p.template);
    let previewText = p.template;
    if (vars.length) {
      const defValues = {};
      vars.forEach((v) => {
        if (v.default) defValues[v.name] = v.default;
      });
      previewText = template.render(p.template, defValues);
    }
    if (el.compareModalPreview) {
      el.compareModalPreview.textContent = previewText;
    }
    if (el.compareModalWarning) {
      el.compareModalWarning.style.display = 'none';
      el.compareModalWarning.textContent = '';
    }

    el.compareModal.style.display = 'flex';
  }

  function closeOptionsCompareModal() {
    if (el.compareModal) el.compareModal.style.display = 'none';
    compareModalPrompt = null;
  }

  function bindCompareModal() {
    if (!el.compareModal) return;

    if (el.compareModalClose) el.compareModalClose.addEventListener('click', closeOptionsCompareModal);
    if (el.compareModalCancel) el.compareModalCancel.addEventListener('click', closeOptionsCompareModal);
    el.compareModal.addEventListener('mousedown', (e) => {
      if (e.target === el.compareModal) closeOptionsCompareModal();
    });

    if (el.compareModalStart) {
      el.compareModalStart.addEventListener('click', async () => {
        if (!compareModalPrompt) return;
        const checkedBoxes = Array.from(el.compareModalTargets.querySelectorAll('input[type="checkbox"]:checked'));
        const targets = checkedBoxes.map((b) => b.value);
        if (!targets.length) {
          if (el.compareModalWarning) {
            el.compareModalWarning.textContent = 'Please select at least one AI target.';
            el.compareModalWarning.style.display = 'block';
          }
          return;
        }

        const layoutRadio = document.querySelector('input[name="opt-compare-layout"]:checked');
        const layout = layoutRadio ? layoutRadio.value : 'window';
        const autoSend = el.compareModalAutosend ? el.compareModalAutosend.checked : false;

        store.setLastCompareTargets(targets);

        const promptText = el.compareModalPreview ? el.compareModalPreview.textContent : compareModalPrompt.template;

        el.compareModalStart.disabled = true;
        el.compareModalStart.textContent = 'Starting…';

        chrome.runtime.sendMessage(
          {
            action: 'start_compare',
            text: promptText,
            targets: targets,
            layout: layout,
            autoSend: autoSend
          },
          (res) => {
            el.compareModalStart.disabled = false;
            el.compareModalStart.textContent = 'Start comparison';
            if (res && res.ok) {
              closeOptionsCompareModal();
              showToast('Comparison opened across ' + targets.length + ' AIs.');
            } else {
              if (el.compareModalWarning) {
                el.compareModalWarning.textContent = (res && res.error) || 'Failed to start comparison.';
                el.compareModalWarning.style.display = 'block';
              }
            }
          }
        );
      });
    }
  }

  /* =====================================================================
     Folder sync (Pro)
     ===================================================================== */

  // The chosen folder is a FileSystemDirectoryHandle. chrome.storage cannot
  // hold one, so it lives in this page's IndexedDB. Only the handle is kept
  // there; the library itself goes through OmniStore as everywhere else.
  const FS_DB = 'omniprompt-folder-sync';
  const FS_STORE = 'handles';
  const FS_KEY = 'library-folder';

  function withHandleStore(mode, action) {
    return new Promise((resolve) => {
      let req;
      try {
        req = indexedDB.open(FS_DB, 1);
      } catch (e) {
        resolve(null);
        return;
      }
      req.onupgradeneeded = () => {
        req.result.createObjectStore(FS_STORE);
      };
      req.onerror = () => resolve(null);
      req.onsuccess = () => {
        const db = req.result;
        try {
          const tx = db.transaction(FS_STORE, mode);
          const request = action(tx.objectStore(FS_STORE));
          tx.oncomplete = () => {
            db.close();
            resolve(request && 'result' in request ? request.result : true);
          };
          tx.onerror = () => {
            db.close();
            resolve(null);
          };
        } catch (e) {
          db.close();
          resolve(null);
        }
      };
    });
  }

  const loadSyncFolder = () => withHandleStore('readonly', (os) => os.get(FS_KEY));
  const saveSyncFolder = (handle) => withHandleStore('readwrite', (os) => os.put(handle, FS_KEY));
  const forgetSyncFolder = () => withHandleStore('readwrite', (os) => os.delete(FS_KEY));

  let folderSyncBusy = false;
  let folderSyncAgain = false;
  let folderSyncTimer = null;

  function scheduleFolderSync() {
    if (!isPro()) return;
    if (folderSyncTimer) clearTimeout(folderSyncTimer);
    folderSyncTimer = setTimeout(() => folderSync({ interactive: false, quiet: true }), 2500);
  }

  /**
   * Read the library file in the chosen folder, merge it, and write the
   * result back. `interactive` may ask Chrome for permission again, which
   * needs a click; background runs only use a permission already granted.
   */
  async function folderSync(opts) {
    const o = opts || {};
    if (!isPro()) {
      if (!o.quiet) openUpgradeModal('sync');
      renderFolderSyncStatus();
      return;
    }
    if (folderSyncBusy) {
      folderSyncAgain = true;
      return;
    }
    const folder = await loadSyncFolder();
    if (!folder) {
      if (!o.quiet) showToast('Choose a folder first.');
      renderFolderSyncStatus();
      return;
    }

    folderSyncBusy = true;
    try {
      let permission = await folder.queryPermission({ mode: 'readwrite' });
      if (permission !== 'granted' && o.interactive) permission = await folder.requestPermission({ mode: 'readwrite' });
      if (permission !== 'granted') {
        await store.setFolderSyncMeta({ needsPermission: true, folderName: folder.name });
        return;
      }

      const fileHandle = await folder.getFileHandle(store.FOLDER_SYNC_FILE, { create: true });
      const text = await (await fileHandle.getFile()).text();
      const res = await store.folderSyncMerge(text);
      if (!res.ok) {
        await store.setFolderSyncMeta({ lastError: res.error, needsPermission: false });
        if (!o.quiet) showToast(res.error);
        return;
      }
      // Only write when something differs, so cloud drives are not asked to
      // upload an identical file on every visit.
      if (!res.upToDate) {
        const writable = await fileHandle.createWritable();
        await writable.write(res.text);
        await writable.close();
      }
      await store.setFolderSyncMeta({
        folderName: folder.name,
        lastSyncAt: Date.now(),
        lastError: '',
        needsPermission: false,
        prompts: res.prompts
      });
      if (res.changed) {
        showToast(
          'Synced with “' + folder.name + '”. Changes from the folder were merged in' +
            (res.removed ? ', and ' + res.removed + ' item(s) deleted on another computer were removed. A backup was taken first' : '') +
            '.'
        );
      } else if (!o.quiet) {
        showToast('Synced with “' + folder.name + '”.');
      }
    } catch (err) {
      const message = (err && err.message) || 'Folder sync failed.';
      await store.setFolderSyncMeta({ lastError: message });
      if (!o.quiet) showToast('Folder sync failed: ' + message);
    } finally {
      folderSyncBusy = false;
      renderFolderSyncStatus();
      if (folderSyncAgain) {
        folderSyncAgain = false;
        scheduleFolderSync();
      }
    }
  }

  async function renderFolderSyncStatus() {
    if (!el.folderSyncStatus) return;
    const pro = isPro();
    const [meta, folder] = await Promise.all([store.getFolderSyncMeta(), loadSyncFolder()]);
    const supported = typeof window.showDirectoryPicker === 'function';

    el.folderSyncStop.style.display = folder ? '' : 'none';
    el.folderSyncNow.style.display = folder ? '' : 'none';
    el.folderSyncChoose.textContent = folder ? 'Change folder' : 'Choose folder';
    // Firefox, Safari and Brave (by default) have no folder picker for
    // extensions, so the button would only ever show an error.
    el.folderSyncChoose.disabled = !supported;
    el.folderSyncChoose.title = supported ? '' : UNSUPPORTED_FOLDER_SYNC;

    let text = '';
    let warn = false;
    if (!supported) {
      text = UNSUPPORTED_FOLDER_SYNC;
      warn = true;
    } else if (!pro) {
      text = folder ? 'Paused: folder sync is part of OmniPrompt Pro.' : '';
    } else if (!folder) {
      text = 'Not set up.';
    } else if (meta.needsPermission) {
      text = 'Chrome needs your OK to use “' + folder.name + '” again. Press Sync now.';
      warn = true;
    } else if (meta.lastError) {
      text = meta.lastError;
      warn = true;
    } else {
      text =
        'Syncing with “' + folder.name + '”. Last sync: ' + describeAge(meta.lastSyncAt) + '.' +
        (typeof meta.prompts === 'number' ? ' ' + meta.prompts + ' prompt' + (meta.prompts === 1 ? '' : 's') + ' of your own in the file.' : '');
    }
    el.folderSyncStatus.innerHTML = warn ? '<span class="sync-warn">' + escapeHtml(text) + '</span>' : escapeHtml(text);
  }

  function bindFolderSync() {
    if (!el.folderSyncChoose) return;

    el.folderSyncChoose.addEventListener('click', async () => {
      if (!isPro()) {
        openUpgradeModal('sync');
        return;
      }
      if (typeof window.showDirectoryPicker !== 'function') {
        showToast(UNSUPPORTED_FOLDER_SYNC);
        return;
      }
      let folder;
      try {
        folder = await window.showDirectoryPicker({ id: 'omniprompt-sync', mode: 'readwrite' });
      } catch (e) {
        return; // the user closed the picker
      }
      await saveSyncFolder(folder);
      await store.setFolderSyncMeta({ folderName: folder.name, connectedAt: Date.now(), lastError: '', needsPermission: false });
      await folderSync({ interactive: true });
    });

    el.folderSyncNow.addEventListener('click', () => folderSync({ interactive: true }));

    el.folderSyncStop.addEventListener('click', async () => {
      if (!window.confirm('Stop syncing with this folder?\n\nThe file in the folder and your library here are both left as they are.')) return;
      await forgetSyncFolder();
      await store.clearFolderSyncMeta();
      renderFolderSyncStatus();
      showToast('Folder sync stopped. Nothing was deleted.');
    });

    if (el.forgetRemembered) {
      el.forgetRemembered.addEventListener('click', async () => {
        await store.clearRememberedValues();
        showToast('Remembered answers forgotten on this computer.');
      });
    }

    renderFolderSyncStatus();
  }

  /* =====================================================================
     Settings
     ===================================================================== */

  function paintSettings() {
    el.slashEnabled.checked = !!settings.slashEnabled;
    el.slashChar.value = settings.slashTriggerChar;
    el.slashChar.disabled = !settings.slashEnabled;
    el.paletteEnabled.checked = !!settings.enablePalette;
    el.hotkeyDisplay.textContent = hotkeyLabel(settings.paletteHotkey);
    el.rankFavorites.checked = !!settings.rankFavorites;
    el.rankRecents.checked = !!settings.rankRecents;
    el.syncEnabled.checked = !!settings.syncEnabled;
    if (el.selectedRole && store.getSelectedRole) {
      el.selectedRole.value = store.getSelectedRole();
    }
    paintHotkeyPresets();
    renderDisabledSites();
    renderEverywhereStatus();
    renderEnabledSites();
    renderSyncStatus();
    paintLicenseState();
  }

  function paintLicenseState() {
    if (!el.licenseTierPill) return;
    paintCheckoutLinks();
    const isPro = store.isPro ? store.isPro() : false;
    const count = store.getCustomCount ? store.getCustomCount() : 0;
    const limit = store.getFreeLimit ? store.getFreeLimit() : 20;
    const lic = store.getLicense ? store.getLicense() : null;

    if (el.customPromptCount) el.customPromptCount.textContent = String(count);

    const price = store.getProInfo().price;
    const builtIns = store.getBuiltins().length;

    // The comparison table reads the real numbers, so it cannot drift from the code.
    const setCell = (cellId, text) => {
      const cell = document.getElementById(cellId);
      if (cell) cell.textContent = text;
    };
    setCell('plan-builtins', 'All ' + builtIns);
    setCell('plan-free-limit', String(limit));
    setCell('plan-pro-price', price + ' once');
    const compare = document.getElementById('plan-compare');
    if (compare) compare.setAttribute('data-plan', isPro ? 'pro' : 'free');

    if (isPro) {
      el.licenseTierPill.textContent = 'You are on Pro';
      el.licenseTierPill.className = 'pro-tier-pill pro';
      el.licenseTierDesc.innerHTML =
        'OmniPrompt Pro is <strong>active</strong> for life: unlimited prompts, client workspaces, saved values, ' +
        'stepped chains, folder sync, library tools, earlier versions and context blocks.' +
        (store.getProInfo().mode === 'test' ? ' <em>(Dodo test mode)</em>' : '');
      if (el.licenseActiveDetails) el.licenseActiveDetails.style.display = 'flex';
      if (lic && lic.key && el.licenseMaskedKey) {
        const clean = lic.key;
        const masked = clean.length > 8 ? '••••-••••-' + clean.slice(-4) : clean;
        el.licenseMaskedKey.textContent = masked;
      }
      if (el.licenseFreeActions) el.licenseFreeActions.style.display = 'none';
      if (el.licenseActiveActions) el.licenseActiveActions.style.display = 'block';
    } else {
      el.licenseTierPill.textContent = 'You are on Free';
      el.licenseTierPill.className = 'pro-tier-pill free';
      el.licenseTierDesc.innerHTML =
        'Free includes all ' +
        builtIns +
        ' built-in prompts and <strong>' +
        count +
        ' / ' +
        limit +
        '</strong> of your own, plus backups and restore. Pro is a one-time ' +
        escapeHtml(price) +
        ': unlimited prompts, client workspaces, saved values, stepped chains, folder sync and library tools.';
      if (el.licenseActiveDetails) el.licenseActiveDetails.style.display = 'none';
      if (el.licenseFreeActions) el.licenseFreeActions.style.display = 'flex';
      if (el.licenseActiveActions) el.licenseActiveActions.style.display = 'none';
    }
  }

  function setLicenseFeedback(msg, type) {
    if (!el.licenseFeedback) return;
    el.licenseFeedback.textContent = msg;
    el.licenseFeedback.className = 'field-note license-feedback' + (type ? ' ' + type : '');
  }

  /* =====================================================================
     Paywall
     ===================================================================== */

  /**
   * One message per moment. The headline answers what the user was trying to
   * do when they hit the wall, so the offer reads as the next step rather
   * than an interruption. Every variant says the free prompts keep working.
   */
  function upgradeCopy(reason, limit) {
    const copy = {
      limit: {
        eyebrow: 'Free limit reached',
        headline: 'Keep building your library.',
        sub: 'Your ' + limit + ' prompts stay yours and keep working. Pro removes the cap.'
      },
      history: {
        eyebrow: 'Version history',
        headline: 'Undo any edit in one click.',
        sub: 'Your earlier versions are already saved. Pro brings them back.'
      },
      blocks: {
        eyebrow: 'Context blocks',
        headline: 'Write your brief once. Reuse it everywhere.',
        sub: 'Save a client brief, brand voice or project rules once. The Client Work prompts, and any of yours, fill them in for you.'
      },
      workspaces: {
        eyebrow: 'Client workspaces',
        headline: 'Switch client, and every field follows.',
        sub: "Keep each client's name, tone and brief in a workspace. Every prompt fills in for the client you pick."
      },
      sets: {
        eyebrow: 'Saved values',
        headline: 'Fill a form in one click.',
        sub: 'Save the values you use often under a name. Pro also remembers your short answers for next time.'
      },
      chains: {
        eyebrow: 'Stepped chains',
        headline: 'Run a sequence, one step at a time.',
        sub: 'Build a chain of prompts once. Insert each step when you are ready for it. Nothing is sent for you.'
      },
      sync: {
        eyebrow: 'Folder sync',
        headline: 'One library on every computer.',
        sub: 'Keep your library in a folder you choose, such as Dropbox or OneDrive. No account and no server of ours.'
      },
      library: {
        eyebrow: 'Library tools',
        headline: 'Keep a big library tidy.',
        sub: 'Folders inside folders, tag filters, bulk edit and a tidy-up list for unused and duplicate prompts.'
      },
      compare: {
        eyebrow: 'Compare across AIs',
        headline: 'Ask several AIs at once.',
        sub: 'Fill your prompt once, dispatch it to ChatGPT, Claude, Gemini and more, and read answers side by side.'
      },
      smartTemplates: {
        eyebrow: 'Smart templates',
        headline: 'Dynamic prompts that adapt.',
        sub: 'Conditionals, date maths, required fields and repeatable blocks for powerful workflows.'
      },
      customModifiers: {
        eyebrow: 'Custom modifiers',
        headline: 'Your own right-click actions.',
        sub: 'Create up to 30 custom instructions and run them from your right-click context menu.'
      },
      siteRules: {
        eyebrow: 'Site rules',
        headline: 'The right prompts for the right site.',
        sub: 'Prompts for Gmail, GitHub, or any website sit at the top of the menu automatically.'
      },
      pro: {
        eyebrow: 'OmniPrompt Pro',
        headline: 'Your prompt library, without limits.',
        sub: 'Unlimited prompts, client workspaces, saved values, chains and folder sync. Pay once, keep it for life.'
      }
    };
    return copy[reason] || copy.pro;
  }

  const UPGRADE_REASONS = [
    'limit',
    'history',
    'blocks',
    'workspaces',
    'sets',
    'chains',
    'sync',
    'library',
    'compare',
    'smartTemplates',
    'customModifiers',
    'siteRules'
  ];

  let upgradeReturnFocus = null;

  function openUpgradeModal(reason) {
    if (!el.upgradeModal) return;
    const key = UPGRADE_REASONS.indexOf(reason) !== -1 ? reason : 'pro';
    const info = store.getProInfo();
    const limit = store.getFreeLimit ? store.getFreeLimit() : info.freeLimit;
    const count = store.getCustomCount ? store.getCustomCount() : 0;
    const uses = store.getTotalUses ? store.getTotalUses() : 0;
    const builtIns = Array.isArray(window.DEFAULT_PROMPTS) ? window.DEFAULT_PROMPTS.length : 136;
    const copy = upgradeCopy(key, limit);

    if (el.upgradeModalContent) el.upgradeModalContent.setAttribute('data-reason', key);
    if (el.upgradeModalTitle) el.upgradeModalTitle.textContent = copy.eyebrow;
    if (el.upgradeModalHeadline) el.upgradeModalHeadline.textContent = copy.headline;
    if (el.upgradeModalReason) el.upgradeModalReason.textContent = copy.sub;

    // Show the limit as a full bar: seeing it lands faster than reading it.
    if (el.upgradeModalMeter) {
      const showMeter = key === 'limit';
      el.upgradeModalMeter.hidden = !showMeter;
      if (showMeter) {
        const pct = limit > 0 ? Math.min(100, Math.round((count / limit) * 100)) : 100;
        if (el.upgradeModalMeterFill) el.upgradeModalMeterFill.style.width = pct + '%';
        if (el.upgradeModalMeterLabel) {
          el.upgradeModalMeterLabel.textContent = Math.min(count, limit) + ' of ' + limit + ' prompts used';
        }
      }
    }

    // The user's own numbers are the only proof we show. Nothing invented.
    if (el.upgradeModalProof) {
      el.upgradeModalProof.textContent = '';
      if (uses >= 5) {
        const strong = document.createElement('strong');
        strong.textContent = uses + ' prompts';
        el.upgradeModalProof.append("You've inserted ", strong, ' with OmniPrompt so far.');
        el.upgradeModalProof.hidden = false;
      } else {
        el.upgradeModalProof.hidden = true;
      }
    }

    // The list comes from the store, so it always matches what Pro does.
    // Lead with the benefit that matches what they tried to do.
    if (el.upgradeModalBenefits) {
      const features = (info.features || []).slice();
      features.sort((a, b) => (a.id === key ? -1 : b.id === key ? 1 : 0));
      el.upgradeModalBenefits.innerHTML = features
        .map(
          (f) =>
            '<li class="benefit-item' +
            (f.id === key ? ' is-match' : '') +
            '" data-benefit="' +
            escapeAttr(f.id) +
            '"><span class="benefit-check" aria-hidden="true">✓</span><div><strong>' +
            escapeHtml(f.title) +
            '</strong><p>' +
            escapeHtml(f.text) +
            '</p></div></li>'
        )
        .join('');
    }

    if (el.upgradeModalPrice) el.upgradeModalPrice.textContent = info.price;
    if (el.upgradeModalBuy) {
      el.upgradeModalBuy.href = info.checkoutUrl;
      el.upgradeModalBuy.textContent = 'Get Pro for ' + info.price + ' →';
    }
    if (el.upgradeModalKeepFree) {
      el.upgradeModalKeepFree.textContent =
        'Free stays free: ' + builtIns + ' built-ins, ' + limit + ' of your own, backups and restore, export.';
    }

    if (el.upgradeModalKey) {
      el.upgradeModalKey.value = '';
      el.upgradeModalKey.removeAttribute('aria-invalid');
    }
    if (el.upgradeModalKeyBox) el.upgradeModalKeyBox.open = false;
    if (el.upgradeModalFeedback) {
      el.upgradeModalFeedback.textContent = '';
      el.upgradeModalFeedback.className = 'field-note';
    }

    upgradeReturnFocus = document.activeElement;
    el.upgradeModal.style.display = 'flex';
    // Focus the one action that matters, not the licence field.
    if (el.upgradeModalBuy) setTimeout(() => el.upgradeModalBuy.focus(), 50);
  }

  function closeUpgradeModal() {
    if (!el.upgradeModal) return;
    el.upgradeModal.style.display = 'none';
    if (upgradeReturnFocus && typeof upgradeReturnFocus.focus === 'function' && upgradeReturnFocus.isConnected) {
      upgradeReturnFocus.focus();
    }
    upgradeReturnFocus = null;
  }

  function paintHotkeyPresets() {
    if (el.resetHotkey) el.resetHotkey.textContent = 'Reset to ' + hotkeyLabel(store.DEFAULT_HOTKEY);
    document.querySelectorAll('.btn-preset-hotkey').forEach((btn) => {
      const preset = HOTKEY_PRESETS[btn.getAttribute('data-hotkey')];
      if (preset) btn.textContent = hotkeyLabel(preset);
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
      el.licenseKeyInput.addEventListener('input', () => {
        el.licenseKeyInput.removeAttribute('aria-invalid');
        setLicenseFeedback('', '');
      });

      el.activateLicenseBtn.addEventListener('click', async () => {
        const key = el.licenseKeyInput.value.trim();
        if (!key) {
          setLicenseFeedback('Please enter a license key.', 'error');
          el.licenseKeyInput.setAttribute('aria-invalid', 'true');
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
          el.licenseKeyInput.removeAttribute('aria-invalid');
          el.licenseKeyInput.value = '';
          setLicenseFeedback('', '');
          paintLicenseState();
          updateCounts();
          showToast('OmniPrompt Pro is active. Thank you for supporting it.');
        } else {
          el.licenseKeyInput.setAttribute('aria-invalid', 'true');
          setLicenseFeedback(res.error || 'Invalid license key.', 'error');
        }
      });

      el.licenseKeyInput.addEventListener('keydown', (e) => {
        if (isImeKey(e)) return;
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
      el.hotkeyDisplay.textContent = hotkeyLabel(settings.paletteHotkey);
      paintHotkeyPresets();
      showToast('Shortcut reset to ' + hotkeyLabel(settings.paletteHotkey) + '.');
    });

    document.querySelectorAll('.btn-preset-hotkey').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const preset = HOTKEY_PRESETS[btn.getAttribute('data-hotkey')];
        if (!preset) return;
        await saveSetting('paletteHotkey', preset);
        el.hotkeyDisplay.textContent = hotkeyLabel(settings.paletteHotkey);
        paintHotkeyPresets();
        showToast('Shortcut set to ' + hotkeyLabel(settings.paletteHotkey));
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

    el.newDisabledSite.addEventListener('input', () => {
      if (el.newDisabledSiteError) el.newDisabledSiteError.textContent = '';
      el.newDisabledSite.removeAttribute('aria-invalid');
    });

    el.addDisabledSite.addEventListener('click', addDisabledSite);
    el.newDisabledSite.addEventListener('keydown', (e) => {
      if (isImeKey(e)) return;
      if (e.key === 'Enter') {
        e.preventDefault();
        addDisabledSite();
      }
    });

    if (el.everywhereEnabled) {
      el.everywhereEnabled.addEventListener('change', () => {
        if (typeof chrome === 'undefined' || !chrome.permissions) return;
        if (el.everywhereEnabled.checked) {
          chrome.permissions.request({ origins: ['<all_urls>'] }, (granted) => {
            void chrome.runtime.lastError;
            el.everywhereEnabled.checked = !!granted;
            renderEverywhereStatus();
            if (granted) showToast('OmniPrompt enabled on every website.');
            else showToast('Permission was not granted.');
          });
        } else {
          chrome.permissions.remove({ origins: ['<all_urls>'] }, (removed) => {
            void chrome.runtime.lastError;
            renderEverywhereStatus();
            if (removed) showToast('Every website access removed.');
          });
        }
      });
    }

    if (el.btnAddEnabledSite) {
      el.btnAddEnabledSite.addEventListener('click', addEnabledSite);
    }
    if (el.newEnabledSite) {
      el.newEnabledSite.addEventListener('input', () => {
        if (el.newEnabledSiteError) el.newEnabledSiteError.textContent = '';
        el.newEnabledSite.removeAttribute('aria-invalid');
      });
      el.newEnabledSite.addEventListener('keydown', (e) => {
        if (isImeKey(e)) return;
        if (e.key === 'Enter') {
          e.preventDefault();
          addEnabledSite();
        }
      });
    }
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
    el.hotkeyDisplay.textContent = hotkeyLabel(settings.paletteHotkey);
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

    // Record the physical key. On macOS Option+K reports e.key "˚", and AltGr
    // or dead keys do the same on other layouts, which labelled the shortcut
    // "Alt+˚". The palette matches on e.code first, so this only fixes labels.
    const physical = /^Key([A-Z])$/.exec(e.code || '') || /^Digit([0-9])$/.exec(e.code || '');
    const hotkey = store.normalizeHotkey({
      key: physical ? physical[1].toLowerCase() : e.key.toLowerCase(),
      code: e.code,
      ctrlKey: e.ctrlKey,
      altKey: e.altKey,
      shiftKey: e.shiftKey,
      metaKey: e.metaKey
    });

    await saveSetting('paletteHotkey', hotkey);
    stopRecording();
    paintHotkeyPresets();
    showToast('Shortcut saved: ' + hotkeyLabel(settings.paletteHotkey));
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
    if (!raw) {
      if (el.newDisabledSiteError) el.newDisabledSiteError.textContent = 'Please enter a hostname.';
      el.newDisabledSite.setAttribute('aria-invalid', 'true');
      el.newDisabledSite.focus();
      return;
    }

    // Accept a pasted URL as well as a bare hostname.
    let host = raw.toLowerCase();
    try {
      if (host.indexOf('://') !== -1) host = new URL(host).hostname;
    } catch (e) {
      /* treat it as a hostname */
    }
    host = host.replace(/^www\./, '').replace(/\/.*$/, '');
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(host)) {
      if (el.newDisabledSiteError) el.newDisabledSiteError.textContent = 'That does not look like a hostname. Try example.com';
      el.newDisabledSite.setAttribute('aria-invalid', 'true');
      el.newDisabledSite.focus();
      return;
    }

    if (el.newDisabledSiteError) el.newDisabledSiteError.textContent = '';
    el.newDisabledSite.removeAttribute('aria-invalid');

    await store.setSiteDisabled(host, true);
    settings = store.getSettings();
    el.newDisabledSite.value = '';
    renderDisabledSites();
    broadcastSettings();
    showToast('OmniPrompt is off on ' + host);
  }

  async function renderEverywhereStatus() {
    if (!el.everywhereEnabled) return;
    if (typeof chrome === 'undefined' || !chrome.permissions || !chrome.permissions.contains) {
      el.everywhereEnabled.checked = false;
      if (el.everywhereStatus) el.everywhereStatus.textContent = '';
      return;
    }
    const hasEverywhere = await new Promise((resolve) => {
      chrome.permissions.contains({ origins: ['<all_urls>'] }, (res) => {
        void chrome.runtime.lastError;
        resolve(res);
      });
    });
    el.everywhereEnabled.checked = !!hasEverywhere;
    if (el.everywhereStatus) {
      if (hasEverywhere) {
        el.everywhereStatus.textContent = 'Active. OmniPrompt is enabled on all websites.';
      } else {
        el.everywhereStatus.textContent = 'Off. OmniPrompt is active on AI chat sites and individually enabled sites.';
      }
    }
  }

  async function renderEnabledSites() {
    if (!el.enabledSitesList) return;
    if (typeof chrome === 'undefined' || !chrome.permissions || !chrome.permissions.getAll) {
      el.enabledSitesList.innerHTML = '';
      return;
    }
    const perms = await new Promise((resolve) => {
      chrome.permissions.getAll((res) => {
        void chrome.runtime.lastError;
        resolve(res || {});
      });
    });
    const origins = (perms && perms.origins) || [];
    const manifest = (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getManifest)
      ? chrome.runtime.getManifest()
      : {};
    const staticHosts = new Set(manifest.host_permissions || []);

    const dynamicOrigins = origins.filter((o) => o !== '<all_urls>' && !staticHosts.has(o));

    if (dynamicOrigins.length === 0) {
      el.enabledSitesList.innerHTML = '<span class="field-note">No individual websites enabled yet.</span>';
      return;
    }

    el.enabledSitesList.innerHTML = dynamicOrigins
      .map((origin) => {
        let display = origin.replace(/^https?:\/\//, '').replace(/\/\*?$/, '');
        return (
          '<span class="disabled-site-pill">' +
          escapeHtml(display) +
          '<button type="button" class="btn-ghost btn-mini pill-remove" data-remove-origin="' +
          escapeHtml(origin) +
          '" title="Remove">✕</button></span>'
        );
      })
      .join('');

    el.enabledSitesList.querySelectorAll('[data-remove-origin]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const originToRemove = btn.getAttribute('data-remove-origin');
        chrome.permissions.remove({ origins: [originToRemove] }, (removed) => {
          void chrome.runtime.lastError;
          if (removed) {
            renderEnabledSites();
            showToast('Site access removed.');
          } else {
            showToast('Could not remove site access.');
          }
        });
      });
    });
  }

  async function addEnabledSite() {
    if (!el.newEnabledSite) return;
    const raw = el.newEnabledSite.value.trim();
    if (!raw) {
      if (el.newEnabledSiteError) el.newEnabledSiteError.textContent = 'Please enter a website link or domain.';
      el.newEnabledSite.setAttribute('aria-invalid', 'true');
      el.newEnabledSite.focus();
      return;
    }

    let host = raw.toLowerCase();
    try {
      if (host.indexOf('://') !== -1) host = new URL(host).hostname;
    } catch (e) {
      /* treat it as a hostname */
    }
    host = host.replace(/^www\./, '').replace(/\/.*$/, '');
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(host)) {
      if (el.newEnabledSiteError) el.newEnabledSiteError.textContent = 'That does not look like a hostname. Try example.com or https://linear.app';
      el.newEnabledSite.setAttribute('aria-invalid', 'true');
      el.newEnabledSite.focus();
      return;
    }

    if (el.newEnabledSiteError) el.newEnabledSiteError.textContent = '';
    el.newEnabledSite.removeAttribute('aria-invalid');

    if (typeof chrome === 'undefined' || !chrome.permissions || !chrome.permissions.request) {
      showToast('Permissions API not available.');
      return;
    }

    const pattern = 'https://' + host + '/*';
    chrome.permissions.request({ origins: [pattern] }, (granted) => {
      void chrome.runtime.lastError;
      if (granted) {
        el.newEnabledSite.value = '';
        renderEnabledSites();
        showToast('OmniPrompt enabled on ' + host);
      } else {
        showToast('Permission was not granted.');
      }
    });
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
            '.' +
            (result.workspaces ? ' ' + result.workspaces + ' workspace(s).' : '') +
            (result.chains ? ' ' + result.chains + ' chain(s).' : '') +
            (result.overLimit
              ? ' ' + result.overLimit + ' not added: Free holds ' + result.limit + ' of your own prompts.'
              : '')
        );
        // The user tried to go past the Free limit, so this is the moment to say what Pro does.
        if (result.overLimit) openUpgradeModal('limit');
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
      // Disconnect folder sync too, or the next sync would bring it all back.
      // The file in the folder is the user's own copy and is left alone.
      await forgetSyncFolder();
      renderFolderSyncStatus();
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
  let modalVariables = [];
  const modalCache = {};

  /** Workspace chip and saved values for the copy form, as in the page form. */
  function renderOptModalTools(prompt, sources) {
    if (!el.modalTools) return;
    const sets = store.getVariableSets(prompt.id);
    const pro = isPro();
    let html = '';
    if (sources.workspace) html += '<span class="ws-chip">💼 ' + escapeHtml(sources.workspace.name) + '</span>';
    if (sets.length) {
      html +=
        '<select class="setting-select" id="opt-sets-select" aria-label="Fill from saved values"><option value="">Fill from saved values…</option>' +
        sets.map((s) => '<option value="' + escapeAttr(s.id) + '">' + escapeHtml(s.name) + '</option>').join('') +
        '</select>';
    }
    html +=
      '<button type="button" class="btn-secondary btn-mini" id="opt-sets-save">💾 Save values' +
      (pro ? '' : ' <span class="pro-mini">PRO</span>') +
      '</button>';
    el.modalTools.innerHTML = html;

    const select = el.modalTools.querySelector('#opt-sets-select');
    if (select) {
      select.addEventListener('change', () => {
        const chosen = sets.filter((s) => s.id === select.value)[0];
        select.value = '';
        if (!chosen) return;
        if (!pro) {
          openUpgradeModal('sets');
          return;
        }
        el.modalFields.querySelectorAll('[data-var]').forEach((f) => {
          const name = f.getAttribute('data-var');
          if (Object.prototype.hasOwnProperty.call(chosen.values, name)) f.value = chosen.values[name];
        });
        updateModalPreview();
        showToast('Filled from “' + chosen.name + '”.');
      });
    }

    el.modalTools.querySelector('#opt-sets-save').addEventListener('click', async () => {
      if (!pro) {
        openUpgradeModal('sets');
        return;
      }
      const values = readModalValues();
      const name = await askForText({ title: 'Save these values', label: 'Name', note: 'The same name replaces an older set.', confirm: 'Save' });
      if (!name) return;
      try {
        await store.saveVariableSet(prompt.id, name, values);
        renderOptModalTools(prompt, sources);
        showToast('Saved as “' + name + '”.');
      } catch (err) {
        handleProError(err);
      }
    });
  }

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
      if (isImeKey(e)) return;
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

    // Checkout opens in a new tab. When the buyer comes back with the key from
    // their email, the field is already open and waiting.
    if (el.upgradeModalBuy) {
      el.upgradeModalBuy.addEventListener('click', () => {
        if (el.upgradeModalKeyBox) el.upgradeModalKeyBox.open = true;
        if (el.upgradeModalFeedback) {
          el.upgradeModalFeedback.textContent = 'Paid? Paste the key from your email here.';
          el.upgradeModalFeedback.className = 'field-note license-feedback';
        }
      });
    }

    if (el.upgradeModalActivate && el.upgradeModalKey) {
      el.upgradeModalKey.addEventListener('input', () => {
        el.upgradeModalKey.removeAttribute('aria-invalid');
        if (el.upgradeModalFeedback) {
          el.upgradeModalFeedback.textContent = '';
          el.upgradeModalFeedback.className = 'field-note license-feedback';
        }
      });

      el.upgradeModalActivate.addEventListener('click', async () => {
        const key = el.upgradeModalKey.value.trim();
        if (!key) {
          if (el.upgradeModalFeedback) {
            el.upgradeModalFeedback.textContent = 'Paste your licence key first.';
            el.upgradeModalFeedback.className = 'field-note license-feedback error';
          }
          el.upgradeModalKey.setAttribute('aria-invalid', 'true');
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
          el.upgradeModalKey.removeAttribute('aria-invalid');
          closeUpgradeModal();
          paintLicenseState();
          updateCounts();
          showToast('Pro is active. Workspaces, chains, folder sync and everything else in Pro are unlocked.');
        } else {
          el.upgradeModalKey.setAttribute('aria-invalid', 'true');
          if (el.upgradeModalFeedback) {
            el.upgradeModalFeedback.textContent = res.error || 'That key did not work. Check it matches your receipt email.';
            el.upgradeModalFeedback.className = 'field-note license-feedback error';
          }
        }
      });

      el.upgradeModalKey.addEventListener('keydown', (e) => {
        if (isImeKey(e)) return;
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
      if (isImeKey(e)) return;
      if (e.key !== 'Escape') return;
      if (el.tidyModal && el.tidyModal.style.display === 'flex') {
        e.preventDefault();
        closeTidyModal();
        return;
      }
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

    // This page has no chat selection or URL to offer, so only date, time,
    // inline defaults and (Pro) the workspace and remembered answers
    // resolve. Badges say exactly that.
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
    renderOptModalTools(prompt, sources);

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
        if (isImeKey(e)) return;
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
    if (ok) {
      store.recordUse(id);
      store.rememberValues(id, values, modalVariables);
    }
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

  /**
   * True while an IME (Chinese, Japanese, Korean) is composing. Its Enter and
   * Esc belong to the IME and must not save, submit or close anything.
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
