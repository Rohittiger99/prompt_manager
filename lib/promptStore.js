/**
 * OmniPrompt - Unified Prompt Store (schema v2)
 *
 * This is the single source of truth for prompts, folders, favourites, usage
 * statistics and settings. Content scripts, the popup, the options dashboard
 * and the service worker all read and write through this module, so there is
 * exactly one storage layout to reason about.
 *
 * Why schema v2 exists
 * --------------------
 * Schema v1 kept two competing keys: `custom_prompts` (written by the popup)
 * and `prompts_override` (written by the options page). Readers preferred
 * `prompts_override`, so a prompt saved by the popup became invisible, and
 * "restore defaults" deleted every prompt created in the options page because
 * it removed the very key those prompts lived in.
 *
 * Schema v2 stores the built-in library as immutable code and keeps only user
 * *deltas* on disk:
 *
 *   userPrompts     - prompts the user authored (never touched by a reset)
 *   defaultPatches  - per-id edits layered over a built-in prompt
 *   hiddenDefaults  - ids of built-in prompts the user deleted
 *
 * A "restore defaults" therefore clears the two delta maps and leaves
 * userPrompts alone. Shipping new built-in prompts in an update also keeps
 * working, because the built-ins are always read from code.
 *
 * Beyond prompts and folders, this module manages automatic local backups,
 * per-prompt version history, opt-in Chrome sync, offline lifetime licensing,
 * the 20-prompt free limit, and Pro features (workspaces, variable sets,
 * stepped chains, and folder sync).
 *
 * Loads as a classic script so the same file works in content scripts, in
 * extension pages via <script src>, and in the MV3 service worker via
 * importScripts().
 */

(function (root, factory) {
  'use strict';
  var api = factory();
  root.OmniStore = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var SCHEMA_VERSION = 2;

  /* =====================================================================
     Storage keys
     ===================================================================== */

  var K = {
    schemaVersion: 'omni.schemaVersion',
    userPrompts: 'omni.userPrompts',
    defaultPatches: 'omni.defaultPatches',
    hiddenDefaults: 'omni.hiddenDefaults',
    customCategories: 'omni.customCategories',
    folders: 'omni.folders',
    favorites: 'omni.favorites',
    usage: 'omni.usage',
    settings: 'omni.settings',
    settingsUpdatedAt: 'omni.settingsUpdatedAt',
    migratedFrom: 'omni.migratedFrom',
    syncMeta: 'omni.syncMeta',
    license: 'omni.license',
    // Pro: client workspaces, saved value sets per prompt, stepped chains,
    // and records of deletions so folder sync does not bring them back.
    workspaces: 'omni.workspaces',
    variableSets: 'omni.variableSets',
    chains: 'omni.chains',
    tombstones: 'omni.tombstones',
    // Local-only safety nets. None of these are synced.
    snapshots: 'omni.snapshots',
    history: 'omni.history',
    backupMeta: 'omni.backupMeta',
    pendingDraft: 'omni.pendingDraft',
    // Local-only Pro data: last values typed per prompt, folder sync status.
    lastValues: 'omni.lastValues',
    folderSyncMeta: 'omni.folderSyncMeta',
    // Pro: custom right-click modifiers and site rules.
    customModifiers: 'omni.customModifiers',
    siteRules: 'omni.siteRules',
    // Local-only: remembered compare target selection.
    compareTargets: 'omni.compareTargets'
  };

  var FREE_CUSTOM_LIMIT = 20;

  // Which Dodo Payments environment this build talks to.
  //
  // 'test' while developing: checkout takes Dodo's test cards and keys are
  // checked against test.dodopayments.com. Anyone can "buy" a test key with a
  // test card, so a build that ships to users MUST say 'live'. In 'live' mode
  // test-mode licences are ignored completely (see isPro), so a key bought
  // with a test card can never unlock a published build.
  var DODO_MODE = 'test';

  // One place for the price and the checkout link, so every surface agrees.
  var PRO_PRICE = '$25';
  var PRO_CHECKOUT_URLS = {
    // "OmniPrompt Pro - Lifetime" in the Dodo test business.
    test: 'https://test.checkout.dodopayments.com/buy/pdt_0NoiqA74MQN0ZbtDNA8tq?quantity=1',
    // Create the same product in live mode, then paste its link here.
    live: 'https://checkout.dodopayments.com/buy/pdt_REPLACE_WITH_LIVE_OMNIPROMPT_PRO_ID?quantity=1'
  };
  var PRO_CHECKOUT_URL = PRO_CHECKOUT_URLS[DODO_MODE];

  var DODO_ENDPOINTS = {
    live: 'https://live.dodopayments.com/licenses',
    test: 'https://test.dodopayments.com/licenses'
  };

  // The Dodo product ids that unlock OmniPrompt Pro, per mode.
  //
  // Dodo's public activate endpoint accepts any valid key issued by the same
  // Dodo business, whichever product it was sold for. Without this list a key
  // bought for another product would unlock OmniPrompt. The activate response
  // names the product (`product.product_id`); only ids listed here are
  // accepted. Copy them from Dodo dashboard > Products (they start `pdt_`).
  // Add more than one if Pro is sold under several products or bundles.
  var PRO_PRODUCT_IDS = {
    live: ['pdt_REPLACE_WITH_LIVE_OMNIPROMPT_PRO_ID'],
    test: ['pdt_0NoiqA74MQN0ZbtDNA8tq']
  };

  // Automatic local backups: one a day, the last seven kept.
  var SNAPSHOT_LIMIT = 7;
  var SNAPSHOT_INTERVAL_MS = 20 * 60 * 60 * 1000;

  // Version history kept per prompt.
  var HISTORY_LIMIT = 20;

  // Ask for a store review once, after this many successful inserts.
  var REVIEW_AFTER_USES = 15;

  // Schema v1 keys. Read once during migration, then never again. They are
  // deliberately left on disk as a manual recovery path.
  var LEGACY = {
    customPrompts: 'custom_prompts',
    promptsOverride: 'prompts_override',
    customCategories: 'custom_categories',
    settings: 'settings'
  };

  var DELTA_KEYS = [
    K.userPrompts,
    K.defaultPatches,
    K.hiddenDefaults,
    K.customCategories,
    K.folders,
    K.favorites,
    K.settings,
    K.workspaces,
    K.variableSets,
    K.chains,
    K.tombstones,
    K.customModifiers,
    K.siteRules
  ];

  // Limits that keep one library from outgrowing local storage by accident.
  var MAX_WORKSPACES = 50;
  var MAX_WORKSPACE_FIELDS = 60;
  var MAX_VALUE_LENGTH = 20000;
  var MAX_SETS_PER_PROMPT = 30;
  var MAX_CHAIN_STEPS = 20;
  var MAX_REMEMBERED_PROMPTS = 300;
  var MAX_REMEMBERED_LENGTH = 300;
  // Deletions are remembered this long so a second computer can catch up.
  var TOMBSTONE_TTL_MS = 120 * 86400000;
  var MAX_CUSTOM_MODIFIERS = 30;
  var MAX_SITE_RULES = 50;
  var MAX_COMPARE_TARGETS = 6;

  // What Pro adds, in one place so the options page, popup and welcome page
  // describe the same thing.
  var PRO_FEATURES = [
    { id: 'limit', title: 'Unlimited prompts', text: 'No cap on prompts of your own.' },
    { id: 'workspaces', title: 'Client workspaces', text: 'Switch client and every brief, tone and name fills in for that client.' },
    { id: 'sets', title: 'Saved value sets', text: 'Save filled-in values under a name and refill a form in one click.' },
    { id: 'chains', title: 'Stepped chains', text: 'Run a sequence of prompts one step at a time. You decide when to move on.' },
    { id: 'sync', title: 'Folder sync', text: 'Keep your library in a folder you choose, such as Dropbox or OneDrive, and share it between computers.' },
    { id: 'blocks', title: 'Context blocks', text: 'Write a brief once and drop it into any prompt with {{@shortcut}}.' },
    { id: 'compare', title: 'Compare across AIs', text: 'Send one prompt to several AIs and compare answers side by side.' },
    { id: 'smartTemplates', title: 'Smart templates', text: 'Conditionals, date maths, required fields and repeatable blocks in your prompts.' },
    { id: 'customModifiers', title: 'Custom modifiers', text: 'Create your own right-click modifiers alongside the 12 built-in ones.' },
    { id: 'siteRules', title: 'Site rules', text: 'Pin the right prompts to the top on specific sites like Gmail or GitHub.' }
  ];

  /* =====================================================================
     Defaults
     ===================================================================== */

  var BUILTIN_CATEGORIES = [
    'Coding',
    'Writing',
    'Marketing',
    'SEO',
    'Productivity',
    'Personas',
    'Clients'
  ];

  var CATEGORY_META = {
    Coding: { icon: '💻', label: 'Coding & Architecture' },
    Writing: { icon: '✍️', label: 'Writing & Editing' },
    Marketing: { icon: '📈', label: 'Growth & Marketing' },
    SEO: { icon: '🔍', label: 'SEO & Content' },
    Productivity: { icon: '⚡', label: 'Productivity & Decisions' },
    Personas: { icon: '🎭', label: 'Expert Personas' },
    // Profile blocks plus workflows that reuse them through {{@shortcut}}.
    Clients: { icon: '💼', label: 'Client Work' },
    Custom: { icon: '⭐', label: 'Custom' }
  };

  var EMOJI_PACK = [
    {
      group: 'Work & Business',
      icon: '💼',
      emojis: ['💼', '📊', '📈', '🏢', '🤝', '📑', '📁', '📌', '🎯', '💰', '💡', '🏆', '⚖️', '📋', '🏷️', '📦']
    },
    {
      group: 'Tech & Code',
      icon: '💻',
      emojis: ['💻', '⚙️', '🛠️', '🚀', '🤖', '⚡', '🔌', '📦', '🧪', '🐛', '🔒', '🌐', '📱', '💾', '🖥️', '📡']
    },
    {
      group: 'Writing & Creative',
      icon: '✍️',
      emojis: ['✍️', '📝', '📚', '📰', '🎨', '📣', '✉️', '🎙️', '📖', '🖋️', '🎭', '🎬', '📸', '💡', '🔍', '🗞️']
    },
    {
      group: 'Productivity & Goals',
      icon: '⚡',
      emojis: ['⚡', '⏱️', '📅', '🎯', '📋', '🧘', '☕', '🌟', '✨', '🔥', '🧠', '🍎', '🏁', '💎', '🔑', '🌈']
    },
    {
      group: 'Communication',
      icon: '💬',
      emojis: ['💬', '🗣️', '💌', '📢', '👥', '🌐', '🗨️', '🛎️', '📬', '📞', '🔔', '📮', '💭', '🤝', '🎉', '👋']
    },
    {
      group: 'Science & Study',
      icon: '🎓',
      emojis: ['🎓', '🔬', '🔭', '📐', '🧬', '🧪', '🪐', '📖', '🏛️', '🌍', '🎒', '🧩', '💡', '📜', '🔍', '💊']
    }
  ];

  var DEFAULT_HOTKEY = {
    key: 'k',
    code: 'KeyK',
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    altKey: true,
    display: 'Alt+K'
  };

  var DEFAULT_SETTINGS = {
    // Slash menu
    slashTriggerChar: '//',
    slashEnabled: true,
    maxSlashResults: 100,

    // Command palette
    enablePalette: true,
    paletteHotkey: cloneHotkey(DEFAULT_HOTKEY),

    // Insertion behaviour. 'caret' preserves whatever the user already typed.
    insertMode: 'caret', // 'caret' | 'append' | 'replace'
    autoSubmit: false,

    // Privacy: never read the clipboard unless the user turns this on.
    clipboardAutofill: false,

    // Per-site opt out, matched against location.hostname.
    disabledSites: [],

    // Cross-device sync of user deltas (off by default, opt-in).
    syncEnabled: false,

    // Ranking weights
    rankFavorites: true,
    rankRecents: true,

    // Appearance. 'system' follows the operating system setting.
    theme: 'system', // 'light' | 'dark' | 'system'

    // Role & Starter pack
    selectedRole: 'all', // 'all' | 'Coding' | 'Writing' | 'Marketing' | 'SEO' | 'Productivity' | 'Personas' | 'Clients'
    activePacks: ['all'],
    onboardingCompleted: false,

    // The one-time review request: 'pending' until shown, then 'dismissed' or 'done'.
    reviewPrompt: 'pending',

    // The popup's "how to use it" card. It also hides by itself after the
    // first insert; this records an explicit "Got it".
    quickStartDismissed: false,

    // How the library page lays out prompts: 'grid' (cards) or 'list' (rows).
    libraryLayout: 'grid',

    // Pro: the client workspace whose values fill in forms and {{@blocks}}.
    // '' means none. A per-device choice, so sync does not flip it.
    activeWorkspaceId: ''
  };

  var THEMES = ['light', 'dark', 'system'];

  function cloneHotkey(h) {
    return {
      key: h.key,
      code: h.code,
      ctrlKey: !!h.ctrlKey,
      metaKey: !!h.metaKey,
      shiftKey: !!h.shiftKey,
      altKey: !!h.altKey,
      display: h.display
    };
  }

  /* =====================================================================
     Environment helpers
     ===================================================================== */

  function hasChromeStorage() {
    return (
      typeof chrome !== 'undefined' &&
      chrome.storage &&
      chrome.storage.local &&
      typeof chrome.storage.local.get === 'function'
    );
  }

  function localGet(keys) {
    return new Promise(function (resolve) {
      if (!hasChromeStorage()) return resolve({});
      try {
        chrome.storage.local.get(keys, function (res) {
          void chrome.runtime.lastError;
          resolve(res || {});
        });
      } catch (e) {
        resolve({});
      }
    });
  }

  function localSet(obj) {
    return new Promise(function (resolve) {
      if (!hasChromeStorage()) return resolve(false);
      try {
        chrome.storage.local.set(obj, function () {
          var err = chrome.runtime.lastError;
          resolve(!err);
        });
      } catch (e) {
        resolve(false);
      }
    });
  }

  function localRemove(keys) {
    return new Promise(function (resolve) {
      if (!hasChromeStorage()) return resolve(false);
      try {
        chrome.storage.local.remove(keys, function () {
          void chrome.runtime.lastError;
          resolve(true);
        });
      } catch (e) {
        resolve(false);
      }
    });
  }

  function hasSyncStorage() {
    return (
      typeof chrome !== 'undefined' &&
      chrome.storage &&
      chrome.storage.sync &&
      typeof chrome.storage.sync.get === 'function'
    );
  }

  function syncGet(keys) {
    return new Promise(function (resolve) {
      if (!hasSyncStorage()) return resolve({});
      try {
        chrome.storage.sync.get(keys, function (res) {
          void chrome.runtime.lastError;
          resolve(res || {});
        });
      } catch (e) {
        resolve({});
      }
    });
  }

  function syncSet(obj) {
    return new Promise(function (resolve) {
      if (!hasSyncStorage()) return resolve({ ok: false, error: 'unavailable' });
      try {
        chrome.storage.sync.set(obj, function () {
          var err = chrome.runtime.lastError;
          resolve({ ok: !err, error: err ? err.message : null });
        });
      } catch (e) {
        resolve({ ok: false, error: String(e && e.message ? e.message : e) });
      }
    });
  }

  function syncRemove(keys) {
    return new Promise(function (resolve) {
      if (!hasSyncStorage()) return resolve(false);
      try {
        chrome.storage.sync.remove(keys, function () {
          void chrome.runtime.lastError;
          resolve(true);
        });
      } catch (e) {
        resolve(false);
      }
    });
  }

  function getBuiltins() {
    var g = typeof self !== 'undefined' ? self : {};
    var list = g.DEFAULT_PROMPTS;
    if (!Array.isArray(list) && typeof DEFAULT_PROMPTS !== 'undefined') {
      list = DEFAULT_PROMPTS;
    }
    return Array.isArray(list) ? list : [];
  }

  function normalize(prompt) {
    var g = typeof self !== 'undefined' ? self : {};
    if (g.OmniTemplate && typeof g.OmniTemplate.normalizePrompt === 'function') {
      return g.OmniTemplate.normalizePrompt(prompt);
    }
    return prompt;
  }

  /* =====================================================================
     In-memory state
     ===================================================================== */

  var state = {
    ready: false,
    loading: null,
    userPrompts: [],
    defaultPatches: {},
    hiddenDefaults: [],
    customCategories: [],
    folders: [],
    favorites: [],
    usage: {},
    settings: cloneSettings(DEFAULT_SETTINGS),
    settingsUpdatedAt: 0,
    resolved: null, // memoised getAll() output
    syncStatus: { lastError: null, lastPushAt: 0, bytes: 0 },
    license: null,
    history: {}, // prompt id -> [older versions, newest first]
    workspaces: [],
    variableSets: {}, // prompt id -> [{ id, name, values, updatedAt }]
    chains: [],
    tombstones: {}, // item id -> time it was deleted
    lastValues: {}, // prompt id -> { at, values } (local only)
    customModifiers: [], // Pro: user-authored right-click modifiers
    siteRules: [] // Pro: domain-based prompt ranking rules
  };

  var listeners = [];

  function cloneSettings(s) {
    var out = {};
    Object.keys(s).forEach(function (k) {
      var v = s[k];
      if (Array.isArray(v)) out[k] = v.slice();
      else if (v && typeof v === 'object') out[k] = JSON.parse(JSON.stringify(v));
      else out[k] = v;
    });
    return out;
  }

  function invalidate() {
    state.resolved = null;
  }

  function emit(reason) {
    listeners.forEach(function (fn) {
      try {
        fn(reason);
      } catch (e) {
        /* a bad listener must not break the store */
      }
    });
  }

  /* =====================================================================
     Migration from schema v1
     ===================================================================== */

  function isBuiltinId(id, builtinMap) {
    return Object.prototype.hasOwnProperty.call(builtinMap, id);
  }

  /**
   * Turn the v1 two-key layout into v2 deltas.
   *
   * `prompts_override` was a full snapshot of the library. Anything in it that
   * is not a built-in id becomes a user prompt. Anything that is a built-in id
   * but differs from the shipped version becomes a patch. Built-in ids absent
   * from the snapshot were deleted by the user, so they become hidden.
   */
  function buildMigration(legacy, builtins) {
    var builtinMap = {};
    builtins.forEach(function (p) {
      builtinMap[p.id] = p;
    });

    var userPrompts = [];
    var seenUserIds = {};
    var defaultPatches = {};
    var hiddenDefaults = [];

    function pushUser(p) {
      if (!p || !p.id) return;
      if (seenUserIds[p.id]) return;
      seenUserIds[p.id] = true;
      userPrompts.push(normalize(sanitisePrompt(p, true)));
    }

    // 1. Everything the popup saved is unambiguously user-authored.
    (Array.isArray(legacy[LEGACY.customPrompts]) ? legacy[LEGACY.customPrompts] : []).forEach(pushUser);

    // 2. Walk the options-page snapshot, if there was one.
    var snapshot = legacy[LEGACY.promptsOverride];
    if (Array.isArray(snapshot)) {
      var presentBuiltins = {};

      snapshot.forEach(function (p) {
        if (!p || !p.id) return;
        if (isBuiltinId(p.id, builtinMap)) {
          presentBuiltins[p.id] = true;
          var patch = diffAgainstBuiltin(p, builtinMap[p.id]);
          if (patch) defaultPatches[p.id] = patch;
        } else {
          pushUser(p);
        }
      });

      builtins.forEach(function (p) {
        if (!presentBuiltins[p.id]) hiddenDefaults.push(p.id);
      });
    }

    // 3. Old categories become folders (for legacy compat) and customCategories so nothing is lost.
    var folders = [];
    var customCategories = [];
    var cats = legacy[LEGACY.customCategories];
    if (Array.isArray(cats)) {
      cats.forEach(function (name) {
        if (typeof name !== 'string' || !name.trim()) return;
        var clean = name.trim();
        folders.push({
          id: 'folder-' + slug(clean) + '-' + folders.length,
          name: clean,
          parentId: null
        });
        customCategories.push({
          id: 'cat-' + slug(clean) + '-' + customCategories.length,
          name: clean,
          icon: '⭐'
        });
      });
    }

    var settings = migrateSettings(legacy[LEGACY.settings]);

    return {
      userPrompts: userPrompts,
      defaultPatches: defaultPatches,
      hiddenDefaults: hiddenDefaults,
      customCategories: customCategories,
      folders: folders,
      settings: settings
    };
  }

  var PATCHABLE_FIELDS = [
    'title',
    'category',
    'subCategory',
    'icon',
    'shortcut',
    'tags',
    'description',
    'template',
    'notes',
    'variables',
    'folderId',
    'outputFormat',
    'difficulty'
  ];

  function diffAgainstBuiltin(edited, builtin) {
    var patch = {};
    var changed = false;
    PATCHABLE_FIELDS.forEach(function (f) {
      if (!Object.prototype.hasOwnProperty.call(edited, f)) return;
      var a = edited[f];
      var b = builtin[f];
      if (JSON.stringify(a) !== JSON.stringify(b)) {
        patch[f] = a;
        changed = true;
      }
    });
    return changed ? patch : null;
  }

  function migrateSettings(old) {
    var s = cloneSettings(DEFAULT_SETTINGS);
    if (!old || typeof old !== 'object') return s;

    if (typeof old.slashTriggerChar === 'string') {
      if (old.slashTriggerChar === 'none' || old.slashTriggerChar === '') {
        s.slashEnabled = false;
        s.slashTriggerChar = '//';
      } else {
        s.slashTriggerChar = old.slashTriggerChar;
        s.slashEnabled = true;
      }
    }
    // v1 called it commandPaletteHotkey.
    var hk = old.commandPaletteHotkey || old.paletteHotkey;
    if (hk && typeof hk === 'object' && hk.key) {
      s.paletteHotkey = normalizeHotkey(hk);
    }
    if (typeof old.enableCommandPalette === 'boolean') {
      s.enablePalette = old.enableCommandPalette;
    }
    if (typeof old.enablePalette === 'boolean') s.enablePalette = old.enablePalette;
    if (typeof old.insertMode === 'string') s.insertMode = old.insertMode;
    s.autoSubmit = false;
    return s;
  }

  function normalizeHotkey(hk) {
    var out = cloneHotkey(DEFAULT_HOTKEY);
    if (!hk || typeof hk !== 'object') return out;
    if (typeof hk.key === 'string' && hk.key) out.key = hk.key.toLowerCase();
    if (typeof hk.code === 'string') out.code = hk.code;
    out.ctrlKey = !!hk.ctrlKey;
    out.metaKey = !!hk.metaKey;
    out.shiftKey = !!hk.shiftKey;
    out.altKey = !!hk.altKey;
    out.display = typeof hk.display === 'string' && hk.display ? hk.display : describeHotkey(out);
    return out;
  }

  /**
   * The key label for a hotkey, taken from the physical key where possible.
   * On macOS Option+K types "˚", and AltGr or dead keys on other layouts type
   * other characters, so `key` alone would label the shortcut "Alt+˚".
   */
  function hotkeyKeyLabel(hk) {
    var code = typeof hk.code === 'string' ? hk.code : '';
    var m = /^Key([A-Z])$/.exec(code) || /^Digit([0-9])$/.exec(code);
    if (m) return m[1];
    if (code === 'Space') return 'Space';
    var key = hk.key || '';
    if (key.length === 1) return key.toUpperCase();
    return key.charAt(0).toUpperCase() + key.slice(1);
  }

  function describeHotkey(hk) {
    var parts = [];
    if (hk.ctrlKey) parts.push('Ctrl');
    if (hk.altKey) parts.push('Alt');
    if (hk.shiftKey) parts.push('Shift');
    if (hk.metaKey) parts.push('Cmd');
    parts.push(hotkeyKeyLabel(hk));
    return parts.join('+');
  }

  /**
   * The label to show the user. The stored `display` ("Alt+K") is kept as it
   * is; on a Mac the same shortcut is shown with the key symbols printed on a
   * Mac keyboard (⌃ ⌥ ⇧ ⌘), so Alt+K reads ⌥K. A hotkey that asks for Ctrl
   * and Cmd accepts either, so a Mac shows only ⌘.
   */
  function formatHotkey(hk, mac) {
    if (!hk || typeof hk !== 'object') return '';
    if (!mac) return typeof hk.display === 'string' && hk.display ? hk.display : describeHotkey(hk);
    var out = '';
    if (hk.ctrlKey && !hk.metaKey) out += '\u2303';
    if (hk.altKey) out += '\u2325';
    if (hk.shiftKey) out += '\u21E7';
    if (hk.metaKey) out += '\u2318';
    return out + hotkeyKeyLabel(hk);
  }

  /** True on macOS, in pages, content scripts and the worker alike. */
  function isMacPlatform() {
    try {
      var nav = typeof navigator !== 'undefined' ? navigator : null;
      if (!nav) return false;
      var p = (nav.userAgentData && nav.userAgentData.platform) || nav.platform || '';
      return /mac/i.test(p);
    } catch (e) {
      return false;
    }
  }

  function slug(str) {
    return String(str)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 24) || 'x';
  }

  /* =====================================================================
     Prompt sanitising
     ===================================================================== */

  function asArray(v) {
    if (Array.isArray(v)) return v;
    if (typeof v === 'string') {
      return v
        .split(',')
        .map(function (t) {
          return t.trim();
        })
        .filter(Boolean);
    }
    return [];
  }

  /**
   * Coerce arbitrary input into a shape the UI can render without throwing.
   * Imported files are the main source of malformed prompts; a single entry
   * missing `template` used to break the whole list render.
   */
  function sanitisePrompt(raw, markCustom) {
    var p = raw && typeof raw === 'object' ? raw : {};
    var title = typeof p.title === 'string' ? p.title.trim() : '';
    var template = typeof p.template === 'string' ? p.template : '';

    if (!title && template) title = template.slice(0, 60).replace(/\s+/g, ' ').trim();
    if (!title) title = 'Untitled prompt';

    var shortcut = typeof p.shortcut === 'string' ? p.shortcut : '';
    shortcut = shortcut.trim().toLowerCase().replace(/^\/+/, '').replace(/\s+/g, '-');

    var out = {
      id: typeof p.id === 'string' && p.id.trim() ? p.id.trim() : newId(),
      title: title,
      category: typeof p.category === 'string' && p.category.trim() ? p.category.trim() : 'Custom',
      shortcut: shortcut,
      tags: asArray(p.tags)
        .map(function (t) {
          return String(t).trim().toLowerCase();
        })
        .filter(Boolean),
      description:
        typeof p.description === 'string' && p.description.trim()
          ? p.description.trim()
          : truncate(template, 110),
      template: template,
      folderId: typeof p.folderId === 'string' ? p.folderId : null
    };

    if (typeof p.subCategory === 'string') out.subCategory = p.subCategory;
    if (typeof p.icon === 'string') out.icon = p.icon;
    if (typeof p.outputFormat === 'string') out.outputFormat = p.outputFormat;
    if (typeof p.difficulty === 'string') out.difficulty = p.difficulty;
    if (Array.isArray(p.variables)) out.variables = p.variables;
    // Free-form notes: why it works, best model, an example output.
    if (typeof p.notes === 'string' && p.notes.trim()) out.notes = p.notes;

    if (markCustom || p.isCustom) out.isCustom = true;
    out.createdAt = typeof p.createdAt === 'number' ? p.createdAt : Date.now();
    out.updatedAt = typeof p.updatedAt === 'number' ? p.updatedAt : out.createdAt;
    return out;
  }

  function truncate(str, n) {
    var s = String(str || '').replace(/\s+/g, ' ').trim();
    if (s.length <= n) return s;
    return s.slice(0, n - 1) + '…';
  }

  var idCounter = 0;
  function newId() {
    idCounter += 1;
    return (
      'user-' +
      Date.now().toString(36) +
      '-' +
      idCounter.toString(36) +
      Math.random().toString(36).slice(2, 6)
    );
  }

  /* =====================================================================
     Load / init
     ===================================================================== */

  function init(options) {
    var force = options && options.force;
    if (state.ready && !force) return Promise.resolve(publicSnapshot());
    if (state.loading && !force) return state.loading;

    state.loading = load().then(function (snap) {
      state.loading = null;
      return snap;
    });
    return state.loading;
  }

  // Every key applyLoaded() reads. applyLoaded resets an absent key to its
  // empty value, so load() and watchStorage() must both fetch this exact list;
  // a key missing here is silently wiped in memory and then written back as
  // empty by the next save.
  var STATE_KEYS = [
    K.schemaVersion,
    K.userPrompts,
    K.defaultPatches,
    K.hiddenDefaults,
    K.customCategories,
    K.folders,
    K.favorites,
    K.usage,
    K.settings,
    K.settingsUpdatedAt,
    K.license,
    K.history,
    K.workspaces,
    K.variableSets,
    K.chains,
    K.tombstones,
    K.lastValues,
    K.customModifiers,
    K.siteRules
  ];

  function load() {
    var wanted = STATE_KEYS.concat([
      LEGACY.customPrompts,
      LEGACY.promptsOverride,
      LEGACY.customCategories,
      LEGACY.settings
    ]);

    return localGet(wanted).then(function (res) {
      var version = typeof res[K.schemaVersion] === 'number' ? res[K.schemaVersion] : 0;

      if (version >= SCHEMA_VERSION) {
        applyLoaded(res);
        state.ready = true;
        return maybePullSync().then(function () {
          return publicSnapshot();
        });
      }

      // Fresh install or v1 data waiting to be migrated.
      var builtins = getBuiltins();
      var hasLegacy =
        Array.isArray(res[LEGACY.customPrompts]) ||
        Array.isArray(res[LEGACY.promptsOverride]) ||
        Array.isArray(res[LEGACY.customCategories]) ||
        (res[LEGACY.settings] && typeof res[LEGACY.settings] === 'object');

      var migrated = hasLegacy
        ? buildMigration(res, builtins)
        : {
            userPrompts: [],
            defaultPatches: {},
            hiddenDefaults: [],
            customCategories: [],
            folders: [],
            settings: cloneSettings(DEFAULT_SETTINGS)
          };

      state.userPrompts = migrated.userPrompts;
      state.defaultPatches = migrated.defaultPatches;
      state.hiddenDefaults = migrated.hiddenDefaults;
      state.customCategories = migrated.customCategories || [];
      state.folders = migrated.folders;
      state.favorites = Array.isArray(res[K.favorites]) ? res[K.favorites] : [];
      state.usage = res[K.usage] && typeof res[K.usage] === 'object' ? res[K.usage] : {};
      state.settings = migrated.settings;
      invalidate();

      var toWrite = {};
      toWrite[K.schemaVersion] = SCHEMA_VERSION;
      toWrite[K.userPrompts] = state.userPrompts;
      toWrite[K.defaultPatches] = state.defaultPatches;
      toWrite[K.hiddenDefaults] = state.hiddenDefaults;
      toWrite[K.customCategories] = state.customCategories;
      toWrite[K.folders] = state.folders;
      toWrite[K.favorites] = state.favorites;
      toWrite[K.usage] = state.usage;
      toWrite[K.settings] = state.settings;
      if (hasLegacy) toWrite[K.migratedFrom] = 1;

      return localSet(toWrite).then(function () {
        state.ready = true;
        emit('migrated');
        return publicSnapshot();
      });
    });
  }

  function applyLoaded(res) {
    state.license = res[K.license] && typeof res[K.license] === 'object' ? res[K.license] : null;
    state.history = res[K.history] && typeof res[K.history] === 'object' ? res[K.history] : {};
    state.workspaces = (Array.isArray(res[K.workspaces]) ? res[K.workspaces] : [])
      .map(sanitiseWorkspace)
      .filter(Boolean);
    state.variableSets = sanitiseVariableSets(res[K.variableSets]);
    state.chains = (Array.isArray(res[K.chains]) ? res[K.chains] : []).map(sanitiseChain).filter(Boolean);
    state.tombstones = sanitiseTombstones(res[K.tombstones]);
    state.lastValues = res[K.lastValues] && typeof res[K.lastValues] === 'object' ? res[K.lastValues] : {};
    state.customModifiers = (Array.isArray(res[K.customModifiers]) ? res[K.customModifiers] : [])
      .filter(function (m) { return m && typeof m === 'object' && m.id && m.title; });
    state.siteRules = (Array.isArray(res[K.siteRules]) ? res[K.siteRules] : [])
      .filter(function (r) { return r && typeof r === 'object' && r.id && Array.isArray(r.hosts); });
    state.userPrompts = (Array.isArray(res[K.userPrompts]) ? res[K.userPrompts] : []).map(function (p) {
      return normalize(sanitisePrompt(p, true));
    });
    state.defaultPatches =
      res[K.defaultPatches] && typeof res[K.defaultPatches] === 'object' ? res[K.defaultPatches] : {};
    state.hiddenDefaults = Array.isArray(res[K.hiddenDefaults]) ? res[K.hiddenDefaults] : [];
    state.customCategories = Array.isArray(res[K.customCategories]) ? res[K.customCategories] : [];
    state.folders = Array.isArray(res[K.folders]) ? res[K.folders] : [];
    if (state.customCategories.length === 0 && state.folders.length > 0) {
      state.folders.forEach(function (f) {
        if (!f || !f.name) return;
        state.customCategories.push({
          id: f.id || ('cat-' + slug(f.name) + '-' + Date.now().toString(36)),
          name: f.name,
          icon: '📁'
        });
      });
    }
    state.favorites = Array.isArray(res[K.favorites]) ? res[K.favorites] : [];
    state.usage = res[K.usage] && typeof res[K.usage] === 'object' ? res[K.usage] : {};

    var s = cloneSettings(DEFAULT_SETTINGS);
    var stored = res[K.settings];
    if (stored && typeof stored === 'object') {
      Object.keys(s).forEach(function (k) {
        if (Object.prototype.hasOwnProperty.call(stored, k)) s[k] = stored[k];
      });
    }
    s.paletteHotkey = normalizeHotkey(s.paletteHotkey);
    if (!Array.isArray(s.disabledSites)) s.disabledSites = [];
    if (['caret', 'append', 'replace'].indexOf(s.insertMode) === -1) s.insertMode = 'caret';
    if (THEMES.indexOf(s.theme) === -1) s.theme = 'system';
    if (typeof s.activeWorkspaceId !== 'string') s.activeWorkspaceId = '';
    s.quickStartDismissed = s.quickStartDismissed === true;
    if (s.libraryLayout !== 'list') s.libraryLayout = 'grid';
    s.autoSubmit = false;
    state.settings = s;
    state.settingsUpdatedAt =
      typeof res[K.settingsUpdatedAt] === 'number' ? res[K.settingsUpdatedAt] : 0;
    invalidate();
  }

  /* =====================================================================
     Resolution: built-ins + patches + user prompts
     ===================================================================== */

  function resolveAll(opts) {
    var o = opts || {};
    var ignorePackFilter = !!o.allBuiltins;
    if (state.resolved && !ignorePackFilter) return state.resolved;

    var hidden = {};
    state.hiddenDefaults.forEach(function (id) {
      hidden[id] = true;
    });

    var activePacks = state.settings.activePacks || ['all'];
    var filterPacks = !ignorePackFilter && Array.isArray(activePacks) && activePacks.indexOf('all') === -1;

    var out = [];

    // User prompts first so a user's own work sorts above the library.
    state.userPrompts.forEach(function (p) {
      out.push(p);
    });

    getBuiltins().forEach(function (b) {
      if (hidden[b.id]) return;
      if (filterPacks && activePacks.indexOf(b.category) === -1) return;
      var patch = state.defaultPatches[b.id];
      if (patch) {
        var merged = {};
        Object.keys(b).forEach(function (k) {
          merged[k] = b[k];
        });
        Object.keys(patch).forEach(function (k) {
          merged[k] = patch[k];
        });
        merged.isEdited = true;
        out.push(normalize(merged));
      } else {
        out.push(normalize(b));
      }
    });

    if (!ignorePackFilter) state.resolved = out;
    return out;
  }

  function getAll(opts) {
    return resolveAll(opts).slice();
  }

  function setRole(role) {
    var cleanRole = String(role || 'all').trim();
    var validRoles = ['all'].concat(BUILTIN_CATEGORIES);
    var matchedRole = validRoles.find(function (r) {
      return r.toLowerCase() === cleanRole.toLowerCase();
    }) || 'all';

    state.settings.selectedRole = matchedRole;
    state.settings.activePacks = matchedRole === 'all' ? ['all'] : [matchedRole];
    state.settings.onboardingCompleted = true;
    state.settingsUpdatedAt = Date.now();
    invalidate();
    return persist([K.settings], 'role-changed').then(function () {
      return matchedRole;
    });
  }

  function getSelectedRole() {
    return state.settings.selectedRole || 'all';
  }

  function getActivePacks() {
    return (state.settings.activePacks || ['all']).slice();
  }

  function setActivePacks(packs) {
    var list = Array.isArray(packs) ? packs : [packs];
    state.settings.activePacks = list;
    if (list.length === 1 && BUILTIN_CATEGORIES.indexOf(list[0]) !== -1) {
      state.settings.selectedRole = list[0];
    } else if (list.indexOf('all') !== -1 || list.length === BUILTIN_CATEGORIES.length) {
      state.settings.selectedRole = 'all';
    } else {
      state.settings.selectedRole = 'custom';
    }
    state.settings.onboardingCompleted = true;
    state.settingsUpdatedAt = Date.now();
    invalidate();
    return persist([K.settings], 'packs-changed').then(function () {
      return state.settings.activePacks;
    });
  }

  function getById(id) {
    var all = resolveAll();
    for (var i = 0; i < all.length; i++) {
      if (all[i].id === id) return all[i];
    }
    return null;
  }

  function isBuiltin(id) {
    var builtins = getBuiltins();
    for (var i = 0; i < builtins.length; i++) {
      if (builtins[i].id === id) return true;
    }
    return false;
  }

  /* =====================================================================
     Write paths
     ===================================================================== */

  function persist(keys, reason) {
    var obj = {};
    (keys || DELTA_KEYS).forEach(function (k) {
      obj[k] = pick(k);
    });
    obj[K.schemaVersion] = SCHEMA_VERSION;
    obj[K.settingsUpdatedAt] = state.settingsUpdatedAt;
    invalidate();
    return localSet(obj).then(function () {
      emit(reason || 'write');
      return maybePushSync();
    });
  }

  function pick(key) {
    switch (key) {
      case K.userPrompts:
        return state.userPrompts;
      case K.defaultPatches:
        return state.defaultPatches;
      case K.hiddenDefaults:
        return state.hiddenDefaults;
      case K.customCategories:
        return state.customCategories;
      case K.folders:
        return state.folders;
      case K.favorites:
        return state.favorites;
      case K.usage:
        return state.usage;
      case K.settings:
        return state.settings;
      case K.history:
        return state.history;
      case K.workspaces:
        return state.workspaces;
      case K.variableSets:
        return state.variableSets;
      case K.chains:
        return state.chains;
      case K.tombstones:
        return state.tombstones;
      case K.customModifiers:
        return state.customModifiers;
      case K.siteRules:
        return state.siteRules;
      default:
        return null;
    }
  }

  /* =====================================================================
     Version history
     ===================================================================== */

  var HISTORY_FIELDS = ['title', 'shortcut', 'category', 'tags', 'description', 'notes', 'template'];

  function versionOf(prompt) {
    var v = { at: typeof prompt.updatedAt === 'number' ? prompt.updatedAt : Date.now() };
    HISTORY_FIELDS.forEach(function (f) {
      if (prompt[f] === undefined) return;
      v[f] = Array.isArray(prompt[f]) ? prompt[f].slice() : prompt[f];
    });
    return v;
  }

  function contentDiffers(a, b) {
    for (var i = 0; i < HISTORY_FIELDS.length; i++) {
      var f = HISTORY_FIELDS[i];
      if (JSON.stringify(a ? a[f] : undefined) !== JSON.stringify(b ? b[f] : undefined)) return true;
    }
    return false;
  }

  /**
   * Remember the version that is about to be replaced. Returns true when a
   * version was recorded, so the caller knows to persist the history key.
   */
  function recordVersion(id, previous, next) {
    if (!id || !previous || !contentDiffers(previous, next)) return false;
    var list = Array.isArray(state.history[id]) ? state.history[id].slice() : [];
    var entry = versionOf(previous);
    // `at` is when that version was saved; `replacedAt` is when it was edited away.
    entry.replacedAt = Date.now();
    list.unshift(entry);
    state.history[id] = list.slice(0, HISTORY_LIMIT);
    return true;
  }

  function getHistory(id) {
    var list = state.history[id];
    return Array.isArray(list) ? JSON.parse(JSON.stringify(list)) : [];
  }

  /**
   * Put an older version back. This is the user's own data, so it is free:
   * restoring a whole backup is free too, and one prompt should not cost more.
   * Restoring saves the current text as a new version first, so it can be undone.
   */
  function restoreVersion(id, index) {
    var list = state.history[id];
    var version = Array.isArray(list) ? list[index] : null;
    if (!version) return Promise.resolve(null);
    var draft = { id: id };
    HISTORY_FIELDS.forEach(function (f) {
      draft[f] = version[f] !== undefined ? version[f] : f === 'tags' ? [] : '';
    });
    return savePrompt(draft);
  }

  /**
   * Create or update a prompt.
   *
   * Editing a built-in writes a small patch instead of cloning the whole
   * built-in library into storage, so future library updates still reach
   * the user.
   */
  function savePrompt(input, options) {
    var draft = input && typeof input === 'object' ? input : {};
    var id = typeof draft.id === 'string' ? draft.id.trim() : '';
    var opts = options || {};

    if (id && isBuiltin(id)) {
      var builtin = null;
      getBuiltins().forEach(function (b) {
        if (b.id === id) builtin = b;
      });
      var before = resolveBuiltinWithPatch(builtin);
      var candidate = sanitisePrompt(
        mergeForDiff(builtin, draft),
        false
      );
      var patch = diffAgainstBuiltin(candidate, builtin);
      if (patch) {
        patch.updatedAt = Date.now();
        state.defaultPatches[id] = patch;
      } else {
        delete state.defaultPatches[id];
      }
      // Un-hide if the user edits a prompt they had deleted.
      state.hiddenDefaults = state.hiddenDefaults.filter(function (h) {
        return h !== id;
      });
      var builtinKeys = [K.defaultPatches, K.hiddenDefaults];
      if (recordVersion(id, before, candidate)) builtinKeys.push(K.history);
      return persist(builtinKeys, 'prompt-saved').then(function () {
        return getById(id);
      });
    }

    if (id) {
      var idx = indexOfUser(id);
      if (idx !== -1) {
        var existing = state.userPrompts[idx];
        var updated = sanitisePrompt(mergeForDiff(existing, draft), true);
        updated.id = id;
        updated.createdAt = existing.createdAt;
        updated.updatedAt = Date.now();
        var userKeys = [K.userPrompts];
        if (recordVersion(id, existing, updated)) userKeys.push(K.history);
        state.userPrompts[idx] = normalize(updated);
        return persist(userKeys, 'prompt-saved').then(function () {
          return getById(id);
        });
      }
    }

    if (!isPro() && isLimitReached() && !opts.bypassLimit) {
      var err = new Error(
        'Free tier limit reached (' +
          FREE_CUSTOM_LIMIT +
          ' custom prompts). Upgrade to Pro for unlimited prompts.'
      );
      err.code = 'LIMIT_REACHED';
      return Promise.reject(err);
    }

    var created = sanitisePrompt(draft, true);
    if (!id) created.id = newId();
    created.createdAt = Date.now();
    created.updatedAt = created.createdAt;
    state.userPrompts.unshift(normalize(created));
    return persist([K.userPrompts], 'prompt-saved').then(function () {
      return getById(created.id);
    });
  }

  /** A built-in as the user currently sees it, ignoring pack filters. */
  function resolveBuiltinWithPatch(builtin) {
    if (!builtin) return null;
    var patch = state.defaultPatches[builtin.id];
    return patch ? mergeForDiff(builtin, patch) : mergeForDiff(builtin, {});
  }

  function mergeForDiff(base, draft) {
    var out = {};
    if (base) {
      Object.keys(base).forEach(function (k) {
        out[k] = base[k];
      });
    }
    Object.keys(draft).forEach(function (k) {
      if (draft[k] !== undefined) out[k] = draft[k];
    });
    return out;
  }

  function indexOfUser(id) {
    for (var i = 0; i < state.userPrompts.length; i++) {
      if (state.userPrompts[i].id === id) return i;
    }
    return -1;
  }

  /**
   * Delete a prompt. User prompts are removed; built-ins are hidden so they
   * can be brought back by "restore defaults".
   */
  function deletePrompt(id) {
    var changed = [];

    var idx = indexOfUser(id);
    if (idx !== -1) {
      state.userPrompts.splice(idx, 1);
      changed.push(K.userPrompts);
      // A deleted prompt's versions go with it; daily snapshots still cover it.
      if (state.history[id]) {
        delete state.history[id];
        changed.push(K.history);
      }
      if (state.variableSets[id]) {
        delete state.variableSets[id];
        changed.push(K.variableSets);
      }
      forgetRemembered(id);
      addTombstone(id);
      changed.push(K.tombstones);
    } else if (isBuiltin(id)) {
      if (state.hiddenDefaults.indexOf(id) === -1) state.hiddenDefaults.push(id);
      changed.push(K.hiddenDefaults);
      if (state.defaultPatches[id]) {
        delete state.defaultPatches[id];
        changed.push(K.defaultPatches);
      }
    } else {
      return Promise.resolve(false);
    }

    if (state.favorites.indexOf(id) !== -1) {
      state.favorites = state.favorites.filter(function (f) {
        return f !== id;
      });
      changed.push(K.favorites);
    }

    return persist(changed, 'prompt-deleted').then(function () {
      return true;
    });
  }

  function duplicatePrompt(id) {
    if (!isPro() && isLimitReached()) {
      var err = new Error(
        'Free tier limit reached (' +
          FREE_CUSTOM_LIMIT +
          ' custom prompts). Upgrade to Pro for unlimited prompts.'
      );
      err.code = 'LIMIT_REACHED';
      return Promise.reject(err);
    }
    var src = getById(id);
    if (!src) return Promise.resolve(null);
    var copy = JSON.parse(JSON.stringify(src));
    delete copy.isEdited;
    copy.id = newId();
    copy.title = src.title + ' (copy)';
    copy.shortcut = src.shortcut ? (src.shortcut + '2').slice(0, 24) : '';
    copy.isCustom = true;
    return savePrompt(copy);
  }

  /**
   * Undo library customisation only. User-authored prompts, folders,
   * favourites and settings are untouched. This is the fix for the reset that
   * used to silently delete everything the options page had saved.
   */
  function restoreDefaultLibrary() {
    var removedPatches = Object.keys(state.defaultPatches).length;
    var restoredHidden = state.hiddenDefaults.length;
    return takeSnapshot('before-restore-built-ins').then(function () {
      state.defaultPatches = {};
      state.hiddenDefaults = [];
      return persist([K.defaultPatches, K.hiddenDefaults], 'defaults-restored');
    }).then(function () {
      return { patchesCleared: removedPatches, promptsRestored: restoredHidden };
    });
  }

  /**
   * Wipe everything, including user prompts. Callers must confirm first.
   * Backups and version history go too: "erase" has to mean erase.
   */
  function eraseAllData() {
    state.history = {};
    state.workspaces = [];
    state.variableSets = {};
    state.chains = [];
    state.tombstones = {};
    state.lastValues = {};
    state.customModifiers = [];
    state.siteRules = [];
    state.userPrompts = [];
    state.defaultPatches = {};
    state.hiddenDefaults = [];
    state.customCategories = [];
    state.folders = [];
    state.favorites = [];
    state.usage = {};
    state.settings = cloneSettings(DEFAULT_SETTINGS);
    invalidate();
    var obj = {};
    DELTA_KEYS.forEach(function (k) {
      obj[k] = pick(k);
    });
    obj[K.usage] = {};
    obj[K.schemaVersion] = SCHEMA_VERSION;
    return localSet(obj)
      .then(function () {
        return localRemove([
          K.history,
          K.snapshots,
          K.backupMeta,
          K.pendingDraft,
          K.lastValues,
          K.folderSyncMeta
        ]);
      })
      .then(function () {
        return clearSyncPayload();
      })
      .then(function () {
        emit('erased');
        return true;
      });
  }

  /* =====================================================================
     Favourites, usage, ranking
     ===================================================================== */

  function isFavorite(id) {
    return state.favorites.indexOf(id) !== -1;
  }

  function toggleFavorite(id) {
    if (isFavorite(id)) {
      state.favorites = state.favorites.filter(function (f) {
        return f !== id;
      });
    } else {
      state.favorites = state.favorites.concat([id]);
    }
    return persist([K.favorites], 'favorites').then(function () {
      return isFavorite(id);
    });
  }

  function getFavorites() {
    return state.favorites
      .map(function (id) {
        return getById(id);
      })
      .filter(Boolean);
  }

  function recordUse(id) {
    if (!id) return Promise.resolve();
    var entry = state.usage[id] || { count: 0, last: 0 };
    entry.count += 1;
    entry.last = Date.now();
    state.usage[id] = entry;
    var obj = {};
    obj[K.usage] = state.usage;
    // Usage is local-only and high frequency, so it skips the sync push.
    return localSet(obj).then(function () {
      emit('usage');
    });
  }

  function getRecent(limit) {
    var n = typeof limit === 'number' ? limit : 8;
    return Object.keys(state.usage)
      .map(function (id) {
        return { id: id, last: state.usage[id].last || 0 };
      })
      .filter(function (e) {
        return e.last > 0;
      })
      .sort(function (a, b) {
        return b.last - a.last;
      })
      .map(function (e) {
        return getById(e.id);
      })
      .filter(Boolean)
      .slice(0, n);
  }

  function getMostUsed(limit) {
    var n = typeof limit === 'number' ? limit : 8;
    return Object.keys(state.usage)
      .map(function (id) {
        return { id: id, count: state.usage[id].count || 0 };
      })
      .filter(function (e) {
        return e.count > 0;
      })
      .sort(function (a, b) {
        return b.count - a.count;
      })
      .map(function (e) {
        return getById(e.id);
      })
      .filter(Boolean)
      .slice(0, n);
  }

  function getUsage(id) {
    return state.usage[id] || { count: 0, last: 0 };
  }

  /**
   * One ranking function for the slash menu, the palette, the popup and the
   * options table. Previously four near-identical copies drifted apart.
   */
  function scoreOne(item, query) {
    var q = String(query || '').toLowerCase().trim();
    if (!q) return 1;

    var shortcut = String(item.shortcut || '').toLowerCase().trim();
    var title = String(item.title || '').toLowerCase().trim();
    var tags = (item.tags || []).map(function (t) {
      return String(t).toLowerCase();
    });
    var category = String(item.category || '').toLowerCase();

    if (shortcut && shortcut === q) return 10000;
    if (shortcut && shortcut.indexOf(q) === 0) return 8000 - (shortcut.length - q.length);
    if (shortcut && shortcut.indexOf(q) !== -1) return 6000;
    if (title === q) return 4000;
    if (title.indexOf(q) === 0) return 3000;

    var words = title.split(/\s+/);
    for (var i = 0; i < words.length; i++) {
      if (words[i].indexOf(q) === 0) return 2000;
    }
    if (title.indexOf(q) !== -1) return 1000;

    for (var j = 0; j < tags.length; j++) {
      if (tags[j] === q) return 800;
    }
    for (var k = 0; k < tags.length; k++) {
      if (tags[k].indexOf(q) === 0) return 600;
    }
    for (var l = 0; l < tags.length; l++) {
      if (tags[l].indexOf(q) !== -1) return 400;
    }

    if (category === q) return 300;
    if (category.indexOf(q) !== -1) return 200;

    if (String(item.description || '').toLowerCase().indexOf(q) !== -1) return 120;
    if (String(item.notes || '').toLowerCase().indexOf(q) !== -1) return 110;
    if (String(item.template || '').toLowerCase().indexOf(q) !== -1) return 100;

    // Half-remembered searches: "email cold" should still find "Cold email".
    // Every word must appear somewhere; more words in the title rank higher.
    var parts = q.split(/\s+/).filter(Boolean);
    if (parts.length > 1) {
      var haystack = [
        shortcut,
        title,
        tags.join(' '),
        category,
        String(item.description || '').toLowerCase(),
        String(item.notes || '').toLowerCase(),
        String(item.template || '').toLowerCase()
      ].join('\n');
      var inTitle = 0;
      for (var w = 0; w < parts.length; w++) {
        if (haystack.indexOf(parts[w]) === -1) return 0;
        if (title.indexOf(parts[w]) !== -1 || shortcut.indexOf(parts[w]) !== -1) inTitle += 1;
      }
      return 90 + inTitle * 200;
    }

    return 0;
  }

  /** Small additive nudges so favourites and habits float to the top. */
  function affinityBonus(item) {
    var bonus = 0;
    if (state.settings.rankFavorites && isFavorite(item.id)) bonus += 500;
    if (state.settings.rankRecents) {
      var u = state.usage[item.id];
      if (u && u.count) {
        bonus += Math.min(u.count, 20) * 12;
        var ageDays = (Date.now() - (u.last || 0)) / 86400000;
        if (ageDays < 1) bonus += 120;
        else if (ageDays < 7) bonus += 60;
        else if (ageDays < 30) bonus += 20;
      }
    }
    return bonus;
  }

  /**
   * Filter + rank. When the query is empty the result is ordered by
   * favourite, then recent use, then library order, which is a far more
   * useful default list than the first N prompts alphabetically.
   */
  function search(opts) {
    var o = opts || {};
    var query = String(o.query || '').trim();
    var limit = typeof o.limit === 'number' ? o.limit : 0;
    var matchedPromptIds = o.host ? getMatchedPromptIdsForHost(o.host) : {};

    var pool = resolveAll().filter(function (p) {
      if (o.favoritesOnly && !isFavorite(p.id)) return false;
      if (o.category && o.category !== 'All') {
        if (o.category === 'Custom') {
          if (!p.isCustom) return false;
        } else if (p.category !== o.category) {
          return false;
        }
      }
      if (o.folderId) {
        if (o.folderId === '__none__') {
          if (p.folderId) return false;
        } else if (p.folderId !== o.folderId) {
          return false;
        }
      }
      if (o.tag) {
        var t = String(o.tag).toLowerCase();
        if ((p.tags || []).indexOf(t) === -1) return false;
      }
      return true;
    });

    var scored = [];
    pool.forEach(function (p) {
      var base = scoreOne(p, query);
      if (query && base <= 0) return;
      var score = base + affinityBonus(p);
      var isSiteMatch = !!matchedPromptIds[p.id];
      if (isSiteMatch) {
        if (query) score += 350;
        else score += 100000;
      }
      var resPrompt = isSiteMatch ? clone(p) : p;
      if (isSiteMatch) resPrompt.forSite = true;
      scored.push({ p: resPrompt, s: score });
    });

    if (!query) {
      scored.sort(function (a, b) {
        if (b.s !== a.s) return b.s - a.s;
        return 0; // stable: keeps resolveAll order (user prompts, then library)
      });
    } else {
      scored.sort(function (a, b) {
        return b.s - a.s;
      });
    }

    var out = scored.map(function (e) {
      return e.p;
    });
    return limit > 0 ? out.slice(0, limit) : out;
  }

  /* =====================================================================
     Folders
     ===================================================================== */

  function getFolders() {
    return state.folders.slice();
  }

  function getFolderTree() {
    var byParent = {};
    state.folders.forEach(function (f) {
      var key = f.parentId || '__root__';
      if (!byParent[key]) byParent[key] = [];
      byParent[key].push(f);
    });
    function build(parentKey, depth) {
      var kids = byParent[parentKey] || [];
      var out = [];
      kids.forEach(function (f) {
        out.push({ folder: f, depth: depth });
        // Guard against a cycle produced by hand-edited storage.
        if (depth < 6) out = out.concat(build(f.id, depth + 1));
      });
      return out;
    }
    return build('__root__', 0);
  }

  /**
   * Folders are part of Pro's library tools. Deleting one stays free, and
   * folders that arrived by import or migration keep working for everyone.
   */
  function createFolder(name, parentId) {
    var clean = String(name || '').trim();
    if (!clean) return Promise.resolve(null);
    if (parentId && !folderById(parentId)) return Promise.resolve(null);
    var exists = state.folders.some(function (f) {
      return f.name.toLowerCase() === clean.toLowerCase() && (f.parentId || null) === (parentId || null);
    });
    if (exists) return Promise.resolve(null);
    var folder = {
      id: 'folder-' + slug(clean) + '-' + Date.now().toString(36),
      name: clean,
      parentId: parentId || null
    };
    state.folders.push(folder);
    return persist([K.folders], 'folders').then(function () {
      return folder;
    });
  }

  function renameFolder(id, name) {
    var clean = String(name || '').trim();
    if (!clean) return Promise.resolve(false);
    var hit = false;
    state.folders.forEach(function (f) {
      if (f.id === id) {
        f.name = clean;
        hit = true;
      }
    });
    if (!hit) return Promise.resolve(false);
    return persist([K.folders], 'folders').then(function () {
      return true;
    });
  }

  /** Deleting a folder re-parents its children and orphans its prompts. */
  function deleteFolder(id) {
    var target = null;
    state.folders.forEach(function (f) {
      if (f.id === id) target = f;
    });
    if (!target) return Promise.resolve(false);

    var newParent = target.parentId || null;
    state.folders = state.folders.filter(function (f) {
      return f.id !== id;
    });
    state.folders.forEach(function (f) {
      if (f.parentId === id) f.parentId = newParent;
    });

    var touchedPrompts = false;
    state.userPrompts.forEach(function (p) {
      if (p.folderId === id) {
        p.folderId = newParent;
        touchedPrompts = true;
      }
    });
    Object.keys(state.defaultPatches).forEach(function (pid) {
      if (state.defaultPatches[pid].folderId === id) {
        state.defaultPatches[pid].folderId = newParent;
        touchedPrompts = true;
      }
    });

    var keys = [K.folders];
    if (touchedPrompts) keys.push(K.userPrompts, K.defaultPatches);
    return persist(keys, 'folders').then(function () {
      return true;
    });
  }

  /* =====================================================================
     Categories
     ===================================================================== */

  function getCustomCategories() {
    return (state.customCategories || []).map(function (c) {
      return { id: c.id, name: c.name, icon: c.icon || '🏷️' };
    });
  }

  function createCategory(name, icon) {
    if (typeof name !== 'string') return Promise.resolve(null);
    var clean = name.trim();
    if (!clean) return Promise.resolve(null);

    var cleanLower = clean.toLowerCase();
    var conflictBuiltin = BUILTIN_CATEGORIES.some(function (b) {
      return b.toLowerCase() === cleanLower;
    });
    if (conflictBuiltin || cleanLower === 'all' || cleanLower === 'custom') {
      return Promise.resolve(null);
    }

    var exists = (state.customCategories || []).some(function (c) {
      return c.name.toLowerCase() === cleanLower;
    });
    if (exists) return Promise.resolve(null);

    var cat = {
      id: 'cat-' + slug(clean) + '-' + Date.now().toString(36),
      name: clean,
      icon: (icon && typeof icon === 'string' && icon.trim()) ? icon.trim() : '🏷️'
    };

    if (!Array.isArray(state.customCategories)) state.customCategories = [];
    state.customCategories.push(cat);
    invalidate();

    return persist([K.customCategories], 'categories').then(function () {
      return cat;
    });
  }

  function updateCategory(id, updates) {
    if (!id || !updates || typeof updates !== 'object') return Promise.resolve(null);
    var cat = (state.customCategories || []).find(function (c) {
      return c.id === id || c.name.toLowerCase() === String(id).toLowerCase();
    });
    if (!cat) return Promise.resolve(null);

    var oldName = cat.name;
    var newName = (typeof updates.name === 'string' && updates.name.trim()) ? updates.name.trim() : cat.name;
    var newIcon = (typeof updates.icon === 'string' && updates.icon.trim()) ? updates.icon.trim() : (cat.icon || '🏷️');

    if (newName.toLowerCase() !== oldName.toLowerCase()) {
      var conflictBuiltin = BUILTIN_CATEGORIES.some(function (b) {
        return b.toLowerCase() === newName.toLowerCase();
      });
      if (conflictBuiltin || newName.toLowerCase() === 'all' || newName.toLowerCase() === 'custom') {
        return Promise.resolve(null);
      }
      var exists = state.customCategories.some(function (c) {
        return c.id !== cat.id && c.name.toLowerCase() === newName.toLowerCase();
      });
      if (exists) return Promise.resolve(null);
    }

    cat.name = newName;
    cat.icon = newIcon;

    var keysToPersist = [K.customCategories];
    if (oldName !== newName) {
      var userChanged = false;
      state.userPrompts.forEach(function (p) {
        if (p.category === oldName) {
          p.category = newName;
          userChanged = true;
        }
      });
      if (userChanged) keysToPersist.push(K.userPrompts);

      var patchChanged = false;
      Object.keys(state.defaultPatches).forEach(function (pid) {
        if (state.defaultPatches[pid].category === oldName) {
          state.defaultPatches[pid].category = newName;
          patchChanged = true;
        }
      });
      if (patchChanged) keysToPersist.push(K.defaultPatches);
    }

    invalidate();
    return persist(keysToPersist, 'categories').then(function () {
      return cat;
    });
  }

  function deleteCategory(id) {
    var idx = -1;
    for (var i = 0; i < (state.customCategories || []).length; i++) {
      if (
        state.customCategories[i].id === id ||
        state.customCategories[i].name.toLowerCase() === String(id).toLowerCase()
      ) {
        idx = i;
        break;
      }
    }
    if (idx === -1) return Promise.resolve(false);

    var removed = state.customCategories.splice(idx, 1)[0];
    var keysToPersist = [K.customCategories];

    var userChanged = false;
    state.userPrompts.forEach(function (p) {
      if (p.category === removed.name) {
        p.category = 'Custom';
        userChanged = true;
      }
    });
    if (userChanged) keysToPersist.push(K.userPrompts);

    var patchChanged = false;
    Object.keys(state.defaultPatches).forEach(function (pid) {
      if (state.defaultPatches[pid].category === removed.name) {
        state.defaultPatches[pid].category = 'Custom';
        patchChanged = true;
      }
    });
    if (patchChanged) keysToPersist.push(K.defaultPatches);

    invalidate();
    return persist(keysToPersist, 'categories').then(function () {
      return true;
    });
  }

  function getCategories() {
    var set = {};
    BUILTIN_CATEGORIES.forEach(function (c) {
      set[c] = true;
    });
    (state.customCategories || []).forEach(function (c) {
      set[c.name] = true;
    });
    resolveAll().forEach(function (p) {
      if (p.category && p.category !== 'All') set[p.category] = true;
    });
    return Object.keys(set);
  }

  function getCategoryMeta(name) {
    if (CATEGORY_META[name]) return CATEGORY_META[name];
    var found = (state.customCategories || []).find(function (c) {
      return c.name.toLowerCase() === String(name).toLowerCase();
    });
    if (found) {
      return { icon: found.icon || '🏷️', label: found.name };
    }
    return { icon: '🏷️', label: name };
  }

  function countByCategory() {
    var counts = {};
    resolveAll().forEach(function (p) {
      var c = p.category || 'Custom';
      counts[c] = (counts[c] || 0) + 1;
    });
    return counts;
  }

  /* =====================================================================
     Settings
     ===================================================================== */

  function getSettings() {
    return cloneSettings(state.settings);
  }

  function setSetting(key, value) {
    if (!Object.prototype.hasOwnProperty.call(DEFAULT_SETTINGS, key)) {
      return Promise.resolve(false);
    }
    // Flipping sync has an ordering requirement, so it only has one entry point.
    if (key === 'syncEnabled') {
      return setSyncEnabled(value).then(function () {
        return true;
      });
    }
    if (key === 'paletteHotkey') value = normalizeHotkey(value);
    if (key === 'insertMode' && ['caret', 'append', 'replace'].indexOf(value) === -1) {
      value = 'caret';
    }
    if (key === 'theme' && THEMES.indexOf(value) === -1) value = 'system';
    if (key === 'reviewPrompt' && ['pending', 'dismissed', 'done'].indexOf(value) === -1) value = 'pending';
    if (key === 'quickStartDismissed') value = value === true;
    if (key === 'libraryLayout' && value !== 'list') value = 'grid';
    state.settings[key] = value;
    state.settingsUpdatedAt = Date.now();
    return persist([K.settings], 'settings').then(function () {
      return true;
    });
  }

  function setSettings(patch) {
    if (!patch || typeof patch !== 'object') return Promise.resolve(false);

    var flipSync = null;
    Object.keys(patch).forEach(function (k) {
      if (!Object.prototype.hasOwnProperty.call(DEFAULT_SETTINGS, k)) return;
      if (k === 'syncEnabled') {
        flipSync = !!patch[k];
        return;
      }
      var v = patch[k];
      if (k === 'paletteHotkey') v = normalizeHotkey(v);
      state.settings[k] = v;
    });
    state.settingsUpdatedAt = Date.now();

    return persist([K.settings], 'settings').then(function () {
      if (flipSync === null) return true;
      return setSyncEnabled(flipSync).then(function () {
        return true;
      });
    });
  }

  function isSiteDisabled(hostname) {
    var h = String(hostname || '').toLowerCase();
    if (!h) return false;
    return state.settings.disabledSites.some(function (d) {
      var dd = String(d).toLowerCase();
      return h === dd || h.slice(-(dd.length + 1)) === '.' + dd;
    });
  }

  function setSiteDisabled(hostname, disabled) {
    var h = String(hostname || '').toLowerCase();
    if (!h) return Promise.resolve(false);
    var list = state.settings.disabledSites.filter(function (d) {
      return String(d).toLowerCase() !== h;
    });
    if (disabled) list.push(h);
    state.settings.disabledSites = list;
    return persist([K.settings], 'settings').then(function () {
      return true;
    });
  }

  /* =====================================================================
     OmniPrompt Pro & License Management (Dodo Payments)
     ===================================================================== */

  /** The product id Dodo reported for a licence, from any stored shape. */
  function licenseProductId(lic) {
    if (!lic) return null;
    if (typeof lic.productId === 'string' && lic.productId) return lic.productId;
    var d = lic.data;
    if (d && d.product && typeof d.product.product_id === 'string') return d.product.product_id;
    if (d && typeof d.product_id === 'string') return d.product_id;
    return null;
  }

  function isAllowedProduct(productId, testMode) {
    if (!productId) return false;
    var list = testMode ? PRO_PRODUCT_IDS.test : PRO_PRODUCT_IDS.live;
    return list.indexOf(productId) !== -1;
  }

  function isTestMode() {
    return DODO_MODE === 'test';
  }

  function isPro() {
    // A licence only counts when it belongs to an OmniPrompt Pro product, and
    // only in the Dodo environment this build uses. A key bought with a test
    // card never unlocks a live build, and the reverse.
    return !!(
      state.license &&
      (state.license.status === 'active' || state.license.status === 'valid') &&
      !!state.license.testMode === isTestMode() &&
      isAllowedProduct(licenseProductId(state.license), isTestMode())
    );
  }

  function getLicense() {
    return state.license ? JSON.parse(JSON.stringify(state.license)) : null;
  }

  function getFreeLimit() {
    return FREE_CUSTOM_LIMIT;
  }

  function getCustomCount() {
    return state.userPrompts.length;
  }

  function isLimitReached() {
    return !isPro() && state.userPrompts.length >= FREE_CUSTOM_LIMIT;
  }

  function canCreatePrompt() {
    return isPro() || state.userPrompts.length < FREE_CUSTOM_LIMIT;
  }

  /**
   * Activate a Dodo Payments license key.
   *
   * Dodo's client-side activation endpoint is public and requires no API secret,
   * making it safe to call directly from the browser extension without a proxy server.
   */
  function activateLicense(key, opts) {
    var o = opts || {};
    var cleanKey = String(key || '').trim();
    if (!cleanKey) {
      return Promise.resolve({ success: false, error: 'Please enter a license key.' });
    }

    // Every key is checked with Dodo Payments. There is no offline bypass:
    // a hard-coded key in shipped code is a free Pro licence for anyone who
    // reads the source. The environment comes from DODO_MODE only; callers
    // cannot switch a live build to the test endpoint.
    if (typeof fetch === 'undefined') {
      return Promise.resolve({
        success: false,
        error: 'Network fetch is unavailable in this environment.'
      });
    }

    var testMode = isTestMode();
    var base = testMode ? DODO_ENDPOINTS.test : DODO_ENDPOINTS.live;
    var url = base + '/activate';
    var payload = {
      license_key: cleanKey,
      name: o.name || 'OmniPrompt Extension'
    };

    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (res) {
        // A non-JSON error page must not be reported as "no connection".
        return res.json().catch(function () {
          return {};
        }).then(function (data) {
          if (res.ok) {
            var instanceId = data.id || data.license_key_instance_id || null;
            var productId = licenseProductId({ data: data });

            // A real key, but for a different product in the same Dodo
            // account. Refuse it, and give back the activation slot we just
            // used so the buyer's other product is not affected.
            if (!isAllowedProduct(productId, testMode)) {
              if (instanceId) {
                try {
                  fetch(base + '/deactivate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      license_key: cleanKey,
                      license_key_instance_id: instanceId
                    })
                  }).catch(function () {});
                } catch (e) {
                  /* best effort: the key stays unusable here either way */
                }
              }
              return {
                success: false,
                code: 'WRONG_PRODUCT',
                error: 'This key is for a different product. Use the key from your OmniPrompt Pro receipt.'
              };
            }

            state.license = {
              key: cleanKey,
              status: 'active',
              activatedAt: Date.now(),
              instanceId: instanceId,
              productId: productId,
              data: data,
              testMode: testMode
            };
            var toStore = {};
            toStore[K.license] = state.license;
            return localSet(toStore).then(function () {
              emit('license-changed');
              return { success: true, license: getLicense() };
            });
          } else {
            var msg =
              (data && data.message) ||
              (res.status === 404
                ? 'License key not found. Check it matches the key in your receipt email.'
                : res.status === 403 || res.status === 422
                ? 'This key is not active, or it has reached its activation limit.'
                : 'Activation failed (HTTP ' + res.status + ').');
            return { success: false, error: msg };
          }
        });
      })
      .catch(function () {
        return {
          success: false,
          error: 'Could not connect to license server. Please check your internet connection.'
        };
      });
  }

  /**
   * Validate the currently active license key against Dodo Payments.
   */
  function validateLicense() {
    if (!state.license || !state.license.key) {
      return Promise.resolve({ valid: false });
    }
    if (typeof fetch === 'undefined') {
      return Promise.resolve({ valid: isPro() });
    }

    // A licence is always checked where it was issued.
    var base = state.license.testMode ? DODO_ENDPOINTS.test : DODO_ENDPOINTS.live;
    var url = base + '/validate';

    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // Checking the instance too means a key deactivated from Dodo's side
      // stops working here, not just a key that was deleted.
      body: JSON.stringify(
        state.license.instanceId
          ? { license_key: state.license.key, license_key_instance_id: state.license.instanceId }
          : { license_key: state.license.key }
      )
    })
      .then(function (res) {
        if (!res.ok) {
          if (res.status === 404) {
            state.license.status = 'invalid';
            var toStore = {};
            toStore[K.license] = state.license;
            return localSet(toStore).then(function () {
              emit('license-changed');
              return { valid: false };
            });
          }
          return { valid: isPro() };
        }
        return res.json().then(function (data) {
          if (data && data.valid === false) {
            state.license.status = 'invalid';
            var toStore = {};
            toStore[K.license] = state.license;
            return localSet(toStore).then(function () {
              emit('license-changed');
              return { valid: false };
            });
          }
          state.license.lastValidatedAt = Date.now();
          var toStore = {};
          toStore[K.license] = state.license;
          return localSet(toStore).then(function () {
            return { valid: true };
          });
        });
      })
      .catch(function () {
        return { valid: isPro() };
      });
  }

  /**
   * Deactivate current license and revert to Free tier.
   */
  function deactivateLicense() {
    var current = state.license;
    if (!current || !current.key) {
      state.license = null;
      return localRemove([K.license]).then(function () {
        emit('license-changed');
        return { success: true };
      });
    }

    if (typeof fetch !== 'undefined') {
      var base = current.testMode ? DODO_ENDPOINTS.test : DODO_ENDPOINTS.live;
      var url = base + '/deactivate';
      try {
        fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            license_key: current.key,
            license_key_instance_id: current.instanceId || ''
          })
        }).catch(function () {});
      } catch (e) {}
    }

    state.license = null;
    return localRemove([K.license]).then(function () {
      emit('license-changed');
      return { success: true };
    });
  }

  /* =====================================================================
     Export / import
     ===================================================================== */

  var BUNDLE_FORMAT = 'omniprompt.bundle';

  /**
   * Export the user's own work by default. Re-exporting the built-in library
   * produced 95KB backups that then failed to import, so `includeLibrary` is
   * opt-in and clearly labelled in the UI.
   */
  function exportBundle(opts) {
    var o = opts || {};
    var prompts;
    if (o.includeLibrary) {
      prompts = resolveAll().map(stripRuntimeFields);
    } else {
      prompts = state.userPrompts.map(stripRuntimeFields);
    }
    return {
      format: BUNDLE_FORMAT,
      schemaVersion: SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      includesLibrary: !!o.includeLibrary,
      counts: {
        prompts: prompts.length,
        customCategories: (state.customCategories || []).length,
        folders: state.folders.length,
        workspaces: state.workspaces.length,
        chains: state.chains.length
      },
      prompts: prompts,
      customCategories: (state.customCategories || []).slice(),
      folders: state.folders.slice(),
      favorites: state.favorites.slice(),
      defaultPatches: o.includeLibrary ? {} : state.defaultPatches,
      hiddenDefaults: o.includeLibrary ? [] : state.hiddenDefaults.slice(),
      // Pro data is exported for everyone: a backup is never held hostage.
      workspaces: clone(state.workspaces),
      variableSets: clone(state.variableSets),
      chains: clone(state.chains),
      customModifiers: clone(state.customModifiers),
      siteRules: clone(state.siteRules),
      tombstones: o.includeTombstones ? clone(state.tombstones) : undefined,
      settings: o.includeSettings === false ? null : getSettings()
    };
  }

  function clone(v) {
    return v === undefined ? undefined : JSON.parse(JSON.stringify(v));
  }

  function stripRuntimeFields(p) {
    var out = {};
    Object.keys(p).forEach(function (k) {
      if (k === 'isEdited') return;
      out[k] = p[k];
    });
    return out;
  }

  /**
   * Import prompts from an OmniPrompt bundle, a bare array, or any of the
   * third-party shapes lib/importers.js recognises.
   *
   * mode 'merge'   - keep existing prompts, skip duplicates
   * mode 'replace' - drop existing user prompts first
   */
  function importBundle(raw, opts) {
    var o = opts || {};
    // Replacing the library is destructive, so keep a restorable copy first.
    if (o.mode === 'replace' && parseImportPayload(raw).ok) {
      return takeSnapshot('before-import').then(function () {
        return importBundleNow(raw, o);
      });
    }
    return importBundleNow(raw, o);
  }

  function importBundleNow(raw, opts) {
    var o = opts || {};
    var mode = o.mode === 'replace' ? 'replace' : 'merge';

    var parsed = parseImportPayload(raw);
    if (!parsed.ok) return Promise.resolve({ ok: false, error: parsed.error, added: 0, skipped: 0 });

    var incoming = parsed.prompts;
    // A backup may hold only workspaces or chains; that is still worth importing.
    var b = parsed.bundle;
    var hasProData = !!(
      b &&
      ((Array.isArray(b.workspaces) && b.workspaces.length) ||
        (Array.isArray(b.chains) && b.chains.length) ||
        (Array.isArray(b.customModifiers) && b.customModifiers.length) ||
        (Array.isArray(b.siteRules) && b.siteRules.length) ||
        (b.variableSets && typeof b.variableSets === 'object' && Object.keys(b.variableSets).length))
    );
    if (!incoming.length && !hasProData) {
      return Promise.resolve({ ok: false, error: 'No prompts found in that file.', added: 0, skipped: 0 });
    }

    // The Free limit applies to imports too, or any file would get round it.
    // A replace import may always bring back as many prompts as the user
    // already had, so re-importing their own backup never shrinks a library
    // that grew while they were on Pro.
    var before = state.userPrompts.length;
    var room = isPro()
      ? Infinity
      : mode === 'replace'
        ? Math.max(FREE_CUSTOM_LIMIT, before)
        : Math.max(0, FREE_CUSTOM_LIMIT - before);

    // A file with no prompts (only workspaces or chains) never empties the library.
    if (mode === 'replace' && incoming.length) state.userPrompts = [];

    var builtinIds = {};
    getBuiltins().forEach(function (b) {
      builtinIds[b.id] = true;
    });

    var seenIds = {};
    var seenSignature = {};
    state.userPrompts.forEach(function (p) {
      seenIds[p.id] = true;
      seenSignature[signatureOf(p)] = true;
    });

    var added = 0;
    var skipped = 0;
    var overLimit = 0;
    // Where each imported prompt ended up, so its saved value sets follow it.
    var idMap = {};
    var sigToId = {};
    state.userPrompts.forEach(function (p) {
      sigToId[signatureOf(p)] = p.id;
    });

    incoming.forEach(function (rawPrompt) {
      var p = normalize(sanitisePrompt(rawPrompt, true));
      var originalId = p.id;

      // Never let an import silently overwrite a shipped prompt.
      if (builtinIds[p.id] || seenIds[p.id]) p.id = newId();

      var sig = signatureOf(p);
      if (seenSignature[sig]) {
        if (sigToId[sig]) idMap[originalId] = sigToId[sig];
        skipped += 1;
        return;
      }
      if (added >= room) {
        overLimit += 1;
        return;
      }
      seenIds[p.id] = true;
      seenSignature[sig] = true;
      sigToId[sig] = p.id;
      idMap[originalId] = p.id;
      state.userPrompts.push(p);
      added += 1;
    });

    var keys = [K.userPrompts];

    // Workspaces, chains, value sets, custom modifiers and site rules travel with a backup.
    // They are the user's own data, so they come back on Free too; using them needs Pro.
    var proAdded = { workspaces: 0, chains: 0, sets: 0, customModifiers: 0, siteRules: 0 };
    if (parsed.bundle) {
      proAdded = importProData(parsed.bundle, idMap, builtinIds);
      if (proAdded.workspaces) keys.push(K.workspaces);
      if (proAdded.chains) keys.push(K.chains);
      if (proAdded.sets) keys.push(K.variableSets);
      if (proAdded.customModifiers) keys.push(K.customModifiers);
      if (proAdded.siteRules) keys.push(K.siteRules);
    }
    // Prompts the user deleted before and has now imported again stay.
    // Every list is revived (no short-circuit), so an imported workspace,
    // chain, modifier or rule is not buried again by an older deletion record.
    var revivedAny = false;
    [
      [state.userPrompts, K.userPrompts],
      [state.workspaces, K.workspaces],
      [state.chains, K.chains],
      [state.customModifiers, K.customModifiers],
      [state.siteRules, K.siteRules]
    ].forEach(function (pair) {
      if (reviveItems(pair[0])) {
        revivedAny = true;
        if (keys.indexOf(pair[1]) === -1) keys.push(pair[1]);
      }
    });
    if (revivedAny || proAdded.workspaces || proAdded.chains || proAdded.customModifiers || proAdded.siteRules) {
      keys.push(K.tombstones);
    }

    if (parsed.customCategories && parsed.customCategories.length) {
      var existingCatNames = {};
      (state.customCategories || []).forEach(function (c) {
        existingCatNames[c.name.toLowerCase()] = true;
      });
      parsed.customCategories.forEach(function (c) {
        if (!c || typeof c.name !== 'string') return;
        if (existingCatNames[c.name.toLowerCase()]) return;
        existingCatNames[c.name.toLowerCase()] = true;
        state.customCategories.push({
          id: typeof c.id === 'string' ? c.id : 'cat-' + slug(c.name) + '-' + Date.now().toString(36),
          name: c.name,
          icon: c.icon || '🏷️'
        });
      });
      keys.push(K.customCategories);
    }

    if (parsed.folders && parsed.folders.length) {
      var existingNames = {};
      state.folders.forEach(function (f) {
        existingNames[f.name.toLowerCase()] = true;
      });
      var existingCustomCatNames = {};
      (state.customCategories || []).forEach(function (c) {
        existingCustomCatNames[c.name.toLowerCase()] = true;
      });
      parsed.folders.forEach(function (f) {
        if (!f || typeof f.name !== 'string') return;
        if (!existingNames[f.name.toLowerCase()]) {
          existingNames[f.name.toLowerCase()] = true;
          state.folders.push({
            id: typeof f.id === 'string' ? f.id : 'folder-' + slug(f.name) + '-' + Date.now().toString(36),
            name: f.name,
            parentId: f.parentId || null
          });
        }
        if (!existingCustomCatNames[f.name.toLowerCase()]) {
          existingCustomCatNames[f.name.toLowerCase()] = true;
          state.customCategories.push({
            id: 'cat-' + slug(f.name) + '-' + Date.now().toString(36),
            name: f.name,
            icon: '📁'
          });
          if (keys.indexOf(K.customCategories) === -1) keys.push(K.customCategories);
        }
      });
      keys.push(K.folders);
    }

    if (o.applyLibraryDeltas && parsed.bundle) {
      if (parsed.bundle.defaultPatches && typeof parsed.bundle.defaultPatches === 'object') {
        state.defaultPatches = parsed.bundle.defaultPatches;
        keys.push(K.defaultPatches);
      }
      if (Array.isArray(parsed.bundle.hiddenDefaults)) {
        state.hiddenDefaults = parsed.bundle.hiddenDefaults;
        keys.push(K.hiddenDefaults);
      }
    }

    if (o.applySettings && parsed.bundle && parsed.bundle.settings) {
      Object.keys(DEFAULT_SETTINGS).forEach(function (k) {
        if (Object.prototype.hasOwnProperty.call(parsed.bundle.settings, k)) {
          state.settings[k] = parsed.bundle.settings[k];
        }
      });
      state.settings.paletteHotkey = normalizeHotkey(state.settings.paletteHotkey);
      keys.push(K.settings);
    }

    return persist(keys, 'imported').then(function () {
      return {
        ok: true,
        added: added,
        skipped: skipped,
        overLimit: overLimit,
        limit: FREE_CUSTOM_LIMIT,
        workspaces: proAdded.workspaces,
        chains: proAdded.chains,
        source: parsed.source
      };
    });
  }

  function signatureOf(p) {
    return (
      String(p.title || '').trim().toLowerCase() +
      '\u0000' +
      String(p.template || '').trim()
    );
  }

  function parseImportPayload(raw) {
    var data = raw;

    if (typeof raw === 'string') {
      var text = raw.replace(/^\uFEFF/, '').trim();
      if (!text) return { ok: false, error: 'The file is empty.' };
      // Delegate non-JSON text (CSV and friends) to the importers module.
      if (text.charAt(0) !== '{' && text.charAt(0) !== '[') {
        return delegateToImporters(text);
      }
      try {
        data = JSON.parse(text);
      } catch (e) {
        return { ok: false, error: 'That file is not valid JSON.' };
      }
    }

    if (Array.isArray(data)) {
      var viaImporters = delegateToImporters(data);
      if (viaImporters.ok) return viaImporters;
      return { ok: true, prompts: data, folders: [], bundle: null, source: 'json-array' };
    }

    if (data && typeof data === 'object') {
      if (data.format === BUNDLE_FORMAT && Array.isArray(data.prompts)) {
        return {
          ok: true,
          prompts: data.prompts,
          customCategories: Array.isArray(data.customCategories) ? data.customCategories : [],
          folders: Array.isArray(data.folders) ? data.folders : [],
          bundle: data,
          source: 'omniprompt-bundle'
        };
      }
      var nested = delegateToImporters(data);
      if (nested.ok) return nested;
      if (Array.isArray(data.prompts)) {
        return {
          ok: true,
          prompts: data.prompts,
          customCategories: Array.isArray(data.customCategories) ? data.customCategories : [],
          folders: Array.isArray(data.folders) ? data.folders : [],
          bundle: data,
          source: 'json-object'
        };
      }
    }

    return { ok: false, error: 'Unrecognised file shape. Expected a prompt list.' };
  }

  function delegateToImporters(payload) {
    var g = typeof self !== 'undefined' ? self : {};
    if (!g.OmniImporters || typeof g.OmniImporters.detectAndParse !== 'function') {
      return { ok: false, error: 'unavailable' };
    }
    try {
      var res = g.OmniImporters.detectAndParse(payload);
      if (res && res.ok && Array.isArray(res.prompts) && res.prompts.length) {
        return {
          ok: true,
          prompts: res.prompts,
          folders: res.folders || [],
          bundle: null,
          source: res.source || 'external'
        };
      }
      return { ok: false, error: (res && res.error) || 'No prompts found.' };
    } catch (e) {
      return { ok: false, error: String(e && e.message ? e.message : e) };
    }
  }

  /* =====================================================================
     Automatic local backups (snapshots)
     ===================================================================== */

  /**
   * A snapshot is a full copy of the user's own work, taken once a day and
   * before anything destructive (replace-import, restoring built-ins,
   * restoring an older snapshot). It lives in local storage only.
   */
  function hasUserData() {
    return (
      state.userPrompts.length > 0 ||
      Object.keys(state.defaultPatches).length > 0 ||
      state.hiddenDefaults.length > 0 ||
      (state.customCategories || []).length > 0 ||
      state.favorites.length > 0 ||
      state.workspaces.length > 0 ||
      state.chains.length > 0 ||
      Object.keys(state.variableSets).length > 0
    );
  }

  function snapshotBundle() {
    var bundle = exportBundle({ includeSettings: false });
    bundle.settings = null;
    return bundle;
  }

  function snapshotFingerprint(bundle) {
    if (!bundle) return '';
    return JSON.stringify([
      bundle.prompts,
      bundle.defaultPatches,
      bundle.hiddenDefaults,
      bundle.customCategories,
      bundle.folders,
      bundle.favorites,
      bundle.workspaces,
      bundle.variableSets,
      bundle.chains
    ]);
  }

  function readSnapshots() {
    return localGet([K.snapshots]).then(function (res) {
      var list = res[K.snapshots];
      return Array.isArray(list) ? list : [];
    });
  }

  function summariseSnapshot(s) {
    return {
      id: s.id,
      at: s.at,
      reason: s.reason,
      prompts: s.bundle && Array.isArray(s.bundle.prompts) ? s.bundle.prompts.length : 0,
      edits: s.bundle && s.bundle.defaultPatches ? Object.keys(s.bundle.defaultPatches).length : 0
    };
  }

  function takeSnapshot(reason) {
    if (!hasUserData()) return Promise.resolve(null);
    var bundle = snapshotBundle();
    return readSnapshots().then(function (list) {
      var latest = list[0];
      // Nothing changed since the last one: keep the list meaningful.
      if (latest && snapshotFingerprint(latest.bundle) === snapshotFingerprint(bundle)) {
        return summariseSnapshot(latest);
      }
      var now = Date.now();
      var entry = {
        id: 'snap-' + now.toString(36) + '-' + Math.random().toString(36).slice(2, 6),
        at: now,
        reason: String(reason || 'manual'),
        bundle: bundle
      };
      var next = [entry].concat(list).slice(0, SNAPSHOT_LIMIT);
      var obj = {};
      obj[K.snapshots] = next;
      return localSet(obj).then(function () {
        emit('snapshot');
        return summariseSnapshot(entry);
      });
    });
  }

  /** Take the daily snapshot if the newest one is older than about a day. */
  function maybeDailySnapshot() {
    if (!hasUserData()) return Promise.resolve(null);
    return readSnapshots().then(function (list) {
      var latest = list[0];
      if (latest && Date.now() - (latest.at || 0) < SNAPSHOT_INTERVAL_MS) return null;
      return takeSnapshot('daily');
    });
  }

  function getSnapshots() {
    return readSnapshots().then(function (list) {
      return list.map(summariseSnapshot);
    });
  }

  /** Replace the user's own work with a snapshot. The current state is saved first. */
  function restoreSnapshot(id) {
    return readSnapshots().then(function (list) {
      var target = null;
      list.forEach(function (s) {
        if (s.id === id) target = s;
      });
      if (!target || !target.bundle) return { ok: false, error: 'That backup no longer exists.' };

      return takeSnapshot('before-restore').then(function () {
        var b = target.bundle;
        state.userPrompts = (Array.isArray(b.prompts) ? b.prompts : []).map(function (p) {
          return normalize(sanitisePrompt(p, true));
        });
        state.defaultPatches = b.defaultPatches && typeof b.defaultPatches === 'object' ? b.defaultPatches : {};
        state.hiddenDefaults = Array.isArray(b.hiddenDefaults) ? b.hiddenDefaults : [];
        state.customCategories = Array.isArray(b.customCategories) ? b.customCategories : [];
        state.folders = Array.isArray(b.folders) ? b.folders : [];
        state.favorites = Array.isArray(b.favorites) ? b.favorites : [];
        // Older snapshots have no Pro data; keep what is there rather than
        // wiping workspaces and chains the snapshot never knew about.
        if (Array.isArray(b.workspaces)) {
          state.workspaces = b.workspaces.map(sanitiseWorkspace).filter(Boolean);
        }
        if (b.variableSets && typeof b.variableSets === 'object') {
          state.variableSets = sanitiseVariableSets(b.variableSets);
        }
        if (Array.isArray(b.chains)) {
          state.chains = b.chains.map(sanitiseChain).filter(Boolean);
        }
        if (Array.isArray(b.customModifiers)) {
          state.customModifiers = b.customModifiers.map(sanitiseCustomModifier).filter(Boolean);
        }
        if (Array.isArray(b.siteRules)) {
          state.siteRules = b.siteRules.map(sanitiseSiteRule).filter(Boolean);
        }
        // What the backup brings back must not be removed again by sync.
        reviveItems(state.userPrompts);
        reviveItems(state.workspaces);
        reviveItems(state.chains);
        reviveItems(state.customModifiers);
        reviveItems(state.siteRules);
        invalidate();
        return persist(
          [
            K.tombstones,
            K.userPrompts,
            K.defaultPatches,
            K.hiddenDefaults,
            K.customCategories,
            K.folders,
            K.favorites,
            K.workspaces,
            K.variableSets,
            K.chains,
            K.customModifiers,
            K.siteRules
          ],
          'snapshot-restored'
        ).then(function () {
          return { ok: true, prompts: state.userPrompts.length };
        });
      });
    });
  }

  function readBackupMeta() {
    return localGet([K.backupMeta]).then(function (res) {
      var meta = res[K.backupMeta];
      return meta && typeof meta === 'object' ? meta : {};
    });
  }

  /** Record that the user downloaded a backup file. */
  function markExported() {
    return readBackupMeta().then(function (meta) {
      meta.lastExportAt = Date.now();
      var obj = {};
      obj[K.backupMeta] = meta;
      return localSet(obj).then(function () {
        return meta.lastExportAt;
      });
    });
  }

  function getBackupStatus() {
    return Promise.all([readSnapshots(), readBackupMeta()]).then(function (res) {
      var list = res[0];
      var meta = res[1];
      return {
        lastSnapshotAt: list[0] ? list[0].at : 0,
        snapshotCount: list.length,
        snapshotLimit: SNAPSHOT_LIMIT,
        lastExportAt: meta.lastExportAt || 0,
        hasUserData: hasUserData()
      };
    });
  }

  /* =====================================================================
     Drafts handed to the editor (save selection / save draft as prompt)
     ===================================================================== */

  var PENDING_DRAFT_MAX = 100000;

  function setPendingDraft(draft) {
    var d = draft && typeof draft === 'object' ? draft : {};
    var text = String(d.template || '').slice(0, PENDING_DRAFT_MAX);
    if (!text.trim()) return Promise.resolve(false);
    var obj = {};
    obj[K.pendingDraft] = {
      template: text,
      title: typeof d.title === 'string' ? d.title.slice(0, 200) : '',
      source: typeof d.source === 'string' ? d.source.slice(0, 500) : '',
      at: Date.now()
    };
    return localSet(obj);
  }

  /** Read and clear the pending draft. Drafts older than 10 minutes are ignored. */
  function takePendingDraft() {
    return localGet([K.pendingDraft]).then(function (res) {
      var d = res[K.pendingDraft];
      return localRemove([K.pendingDraft]).then(function () {
        if (!d || typeof d.template !== 'string') return null;
        if (Date.now() - (d.at || 0) > 10 * 60 * 1000) return null;
        return d;
      });
    });
  }

  /* =====================================================================
     Pro helpers
     ===================================================================== */

  var PRO_FEATURE_LABELS = {
    workspaces: 'Client workspaces are',
    sets: 'Saved values are',
    chains: 'Stepped chains are',
    sync: 'Folder sync is',
    library: 'Folders, tag filters and bulk edit are',
    blocks: 'Context blocks are',
    compare: 'Compare across AIs is',
    smartTemplates: 'Smart templates are',
    customModifiers: 'Custom right-click modifiers are',
    siteRules: 'Site rules are'
  };

  /** A rejected promise the UI can recognise and answer with the upgrade dialog. */
  function proRequired(feature) {
    var err = new Error((PRO_FEATURE_LABELS[feature] || 'This is') + ' part of OmniPrompt Pro.');
    err.code = 'PRO_REQUIRED';
    err.feature = feature;
    return Promise.reject(err);
  }

  function failWith(code, message) {
    var err = new Error(message);
    err.code = code;
    return Promise.reject(err);
  }

  function uid() {
    return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  }

  function num(v, fallback) {
    return typeof v === 'number' && isFinite(v) ? v : fallback;
  }

  /**
   * One spelling for a value's name, shared with lib/template.js, so a
   * workspace field "Client name" fills {{client_name}} and {{@client-name}}.
   */
  function fieldKey(name) {
    var g = typeof self !== 'undefined' ? self : {};
    if (g.OmniTemplate && typeof g.OmniTemplate.normaliseKey === 'function') {
      return g.OmniTemplate.normaliseKey(name);
    }
    return String(name == null ? '' : name)
      .trim()
      .replace(/^\{\{\s*|\s*\}\}$/g, '')
      .replace(/^@/, '')
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, '_');
  }

  function normaliseShortcut(value) {
    return typeof value === 'string'
      ? value.trim().toLowerCase().replace(/^\/+/, '').replace(/\s+/g, '-').slice(0, 40)
      : '';
  }

  /* =====================================================================
     Deletion records (tombstones)
     ===================================================================== */

  function sanitiseTombstones(raw) {
    var out = {};
    if (!raw || typeof raw !== 'object') return out;
    Object.keys(raw).forEach(function (id) {
      if (typeof raw[id] === 'number' && isFinite(raw[id])) out[id] = raw[id];
    });
    return out;
  }

  function addTombstone(id) {
    if (id) state.tombstones[id] = Date.now();
  }

  function clearTombstone(id) {
    if (id && state.tombstones[id]) delete state.tombstones[id];
  }

  function pruneTombstones() {
    var cutoff = Date.now() - TOMBSTONE_TTL_MS;
    Object.keys(state.tombstones).forEach(function (id) {
      if (state.tombstones[id] < cutoff) delete state.tombstones[id];
    });
  }

  /**
   * Something the user brought back on purpose (a restored backup, an
   * import) must not be removed again by an older deletion record.
   */
  function reviveItems(list) {
    var touched = false;
    list.forEach(function (item) {
      if (item && item.id && state.tombstones[item.id]) {
        delete state.tombstones[item.id];
        item.updatedAt = Date.now();
        touched = true;
      }
    });
    return touched;
  }

  /* =====================================================================
     Client workspaces (Pro)
     ===================================================================== */

  /**
   * A workspace is a named set of values, one per client or project. The
   * active workspace fills any field or {{@block}} with the same name.
   */
  function sanitiseWorkspace(raw) {
    if (!raw || typeof raw !== 'object') return null;
    var name = typeof raw.name === 'string' ? raw.name.trim().slice(0, 80) : '';
    if (!name) return null;
    var fields = [];
    var seen = {};
    (Array.isArray(raw.fields) ? raw.fields : []).forEach(function (f) {
      if (!f || typeof f !== 'object' || fields.length >= MAX_WORKSPACE_FIELDS) return;
      var key = fieldKey(f.key);
      if (!key || seen[key]) return;
      seen[key] = true;
      fields.push({
        key: key,
        value: String(f.value == null ? '' : f.value).slice(0, MAX_VALUE_LENGTH)
      });
    });
    var now = Date.now();
    return {
      id: typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : 'ws-' + uid(),
      name: name,
      fields: fields,
      createdAt: num(raw.createdAt, now),
      updatedAt: num(raw.updatedAt, now)
    };
  }

  function workspaceById(id) {
    if (!id) return null;
    for (var i = 0; i < state.workspaces.length; i++) {
      if (state.workspaces[i].id === id) return state.workspaces[i];
    }
    return null;
  }

  function workspaceValueMap(ws) {
    var out = {};
    ((ws && ws.fields) || []).forEach(function (f) {
      out[f.key] = f.value;
    });
    return out;
  }

  function getWorkspaces() {
    return clone(state.workspaces);
  }

  function getWorkspace(id) {
    var ws = workspaceById(id);
    return ws ? clone(ws) : null;
  }

  /** The workspace in use, or null. Only Pro fills values from it. */
  function getActiveWorkspace() {
    if (!isPro()) return null;
    return workspaceById(state.settings.activeWorkspaceId);
  }

  function saveWorkspace(input) {
    if (!isPro()) return proRequired('workspaces');
    var draft = input && typeof input === 'object' ? input : {};
    var clean = sanitiseWorkspace(draft);
    if (!clean) return failWith('INVALID', 'Give the workspace a name.');

    var existing = draft.id ? workspaceById(draft.id) : null;
    var clash = state.workspaces.some(function (w) {
      return w.name.toLowerCase() === clean.name.toLowerCase() && (!existing || w.id !== existing.id);
    });
    if (clash) return failWith('DUPLICATE', 'A workspace called "' + clean.name + '" already exists.');

    var now = Date.now();
    if (existing) {
      existing.name = clean.name;
      existing.fields = clean.fields;
      existing.updatedAt = now;
      clearTombstone(existing.id);
      return persist([K.workspaces, K.tombstones], 'workspaces').then(function () {
        return clone(existing);
      });
    }

    if (state.workspaces.length >= MAX_WORKSPACES) {
      return failWith('TOO_MANY', 'You can keep up to ' + MAX_WORKSPACES + ' workspaces.');
    }
    clean.id = 'ws-' + uid();
    clean.createdAt = now;
    clean.updatedAt = now;
    state.workspaces.push(clean);
    return persist([K.workspaces], 'workspaces').then(function () {
      return clone(clean);
    });
  }

  /** Deleting stays free, so a lapsed licence never traps anyone's data. */
  function deleteWorkspace(id) {
    var before = state.workspaces.length;
    state.workspaces = state.workspaces.filter(function (w) {
      return w.id !== id;
    });
    if (state.workspaces.length === before) return Promise.resolve(false);
    addTombstone(id);
    var keys = [K.workspaces, K.tombstones];
    if (state.settings.activeWorkspaceId === id) {
      state.settings.activeWorkspaceId = '';
      keys.push(K.settings);
    }
    return persist(keys, 'workspaces').then(function () {
      return true;
    });
  }

  /** Switch client. Switching off ('') is always allowed. */
  function setActiveWorkspace(id) {
    var clean = typeof id === 'string' ? id : '';
    if (clean && !isPro()) return proRequired('workspaces');
    if (clean && !workspaceById(clean)) return Promise.resolve(false);
    state.settings.activeWorkspaceId = clean;
    // Not counted as a settings edit: it is a per-device choice.
    return persist([K.settings], 'workspace-switched').then(function () {
      return true;
    });
  }

  /* =====================================================================
     Saved value sets and remembered values (Pro)
     ===================================================================== */

  function sanitiseValues(raw) {
    var out = {};
    if (!raw || typeof raw !== 'object') return out;
    Object.keys(raw)
      .slice(0, 100)
      .forEach(function (k) {
        if (!k) return;
        out[k] = String(raw[k] == null ? '' : raw[k]).slice(0, MAX_VALUE_LENGTH);
      });
    return out;
  }

  function sanitiseVariableSets(raw) {
    var out = {};
    if (!raw || typeof raw !== 'object') return out;
    Object.keys(raw).forEach(function (pid) {
      if (!Array.isArray(raw[pid])) return;
      var list = raw[pid]
        .map(function (s) {
          if (!s || typeof s.name !== 'string' || !s.name.trim()) return null;
          return {
            id: typeof s.id === 'string' && s.id ? s.id : 'set-' + uid(),
            name: s.name.trim().slice(0, 60),
            values: sanitiseValues(s.values),
            updatedAt: num(s.updatedAt, Date.now())
          };
        })
        .filter(Boolean)
        .slice(0, MAX_SETS_PER_PROMPT);
      if (list.length) out[pid] = list;
    });
    return out;
  }

  /** Reading saved sets is free; saving and filling from them is Pro. */
  function getVariableSets(promptId) {
    return clone(state.variableSets[promptId] || []);
  }

  /** Save values under a name. The same name replaces the older set. */
  function saveVariableSet(promptId, name, values) {
    if (!isPro()) return proRequired('sets');
    var cleanName = String(name || '').trim().slice(0, 60);
    if (!promptId || !cleanName) return failWith('INVALID', 'Give the saved values a name.');
    var list = (state.variableSets[promptId] || []).slice();
    var now = Date.now();
    var entry = null;
    list.forEach(function (s) {
      if (s.name.toLowerCase() === cleanName.toLowerCase()) entry = s;
    });
    if (entry) {
      entry.values = sanitiseValues(values);
      entry.updatedAt = now;
    } else {
      if (list.length >= MAX_SETS_PER_PROMPT) {
        return failWith('TOO_MANY', 'A prompt can keep up to ' + MAX_SETS_PER_PROMPT + ' saved sets.');
      }
      entry = { id: 'set-' + uid(), name: cleanName, values: sanitiseValues(values), updatedAt: now };
      list.push(entry);
    }
    state.variableSets[promptId] = list;
    return persist([K.variableSets], 'variable-sets').then(function () {
      return clone(entry);
    });
  }

  function deleteVariableSet(promptId, setId) {
    var list = state.variableSets[promptId];
    if (!Array.isArray(list)) return Promise.resolve(false);
    var next = list.filter(function (s) {
      return s.id !== setId;
    });
    if (next.length === list.length) return Promise.resolve(false);
    if (next.length) state.variableSets[promptId] = next;
    else delete state.variableSets[promptId];
    return persist([K.variableSets], 'variable-sets').then(function () {
      return true;
    });
  }

  /**
   * Remember short answers (a tone, a language, a client name) for next
   * time. Long fields, which hold pasted code or text, and anything filled
   * from the page are never kept. Local only, never synced.
   */
  function rememberValues(promptId, values, variables) {
    if (!promptId) return Promise.resolve(false);
    var vals = values || {};
    var keep = {};
    var count = 0;
    (Array.isArray(variables) ? variables : []).forEach(function (v) {
      if (!v || !v.name || v.type === 'textarea' || v.autofill) return;
      var value = vals[v.name];
      if (typeof value !== 'string') return;
      var trimmed = value.trim();
      if (!trimmed || trimmed.length > MAX_REMEMBERED_LENGTH) return;
      keep[v.name] = trimmed;
      count += 1;
    });
    if (!count) return Promise.resolve(false);

    state.lastValues[promptId] = { at: Date.now(), values: keep };
    var ids = Object.keys(state.lastValues);
    if (ids.length > MAX_REMEMBERED_PROMPTS) {
      ids
        .sort(function (a, b) {
          return (state.lastValues[a].at || 0) - (state.lastValues[b].at || 0);
        })
        .slice(0, ids.length - MAX_REMEMBERED_PROMPTS)
        .forEach(function (id) {
          delete state.lastValues[id];
        });
    }
    var obj = {};
    obj[K.lastValues] = state.lastValues;
    return localSet(obj);
  }

  function forgetRemembered(promptId) {
    if (!state.lastValues[promptId]) return;
    delete state.lastValues[promptId];
    var obj = {};
    obj[K.lastValues] = state.lastValues;
    localSet(obj);
  }

  function clearRememberedValues() {
    state.lastValues = {};
    return localRemove([K.lastValues]);
  }

  /**
   * What a fill-in form may start from, besides the page itself: the active
   * workspace (Pro) and the answers remembered for this prompt (Free).
   */
  function getValueSources(promptId) {
    var ws = isPro() ? getActiveWorkspace() : null;
    var remembered = state.lastValues[promptId];
    return {
      workspace: ws ? { id: ws.id, name: ws.name, values: workspaceValueMap(ws) } : null,
      remembered: remembered && remembered.values ? clone(remembered.values) : {}
    };
  }

  /* =====================================================================
     Stepped chains (Pro)
     ===================================================================== */

  function sanitiseChain(raw) {
    if (!raw || typeof raw !== 'object') return null;
    var steps = (Array.isArray(raw.steps) ? raw.steps : [])
      .map(function (s) {
        if (!s || typeof s !== 'object') return null;
        var tpl = typeof s.template === 'string' ? s.template.slice(0, 100000) : '';
        if (!tpl.trim()) return null;
        return {
          id: typeof s.id === 'string' && s.id ? s.id : 'step-' + uid(),
          title: typeof s.title === 'string' ? s.title.trim().slice(0, 80) : '',
          template: tpl
        };
      })
      .filter(Boolean)
      .slice(0, MAX_CHAIN_STEPS);
    if (!steps.length) return null;
    var now = Date.now();
    return {
      id: typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : 'chain-' + uid(),
      title: (typeof raw.title === 'string' && raw.title.trim() ? raw.title.trim() : 'Untitled chain').slice(0, 120),
      shortcut: normaliseShortcut(raw.shortcut),
      description: typeof raw.description === 'string' ? raw.description.trim().slice(0, 300) : '',
      steps: steps,
      createdAt: num(raw.createdAt, now),
      updatedAt: num(raw.updatedAt, now)
    };
  }

  function chainById(id) {
    for (var i = 0; i < state.chains.length; i++) {
      if (state.chains[i].id === id) return state.chains[i];
    }
    return null;
  }

  function getChains() {
    return clone(state.chains);
  }

  function getChain(id) {
    var c = chainById(id);
    return c ? clone(c) : null;
  }

  function findChainByShortcut(shortcut, ignoreId) {
    var clean = normaliseShortcut(shortcut);
    if (!clean) return null;
    for (var i = 0; i < state.chains.length; i++) {
      if (state.chains[i].shortcut === clean && state.chains[i].id !== ignoreId) return state.chains[i];
    }
    return null;
  }

  function saveChain(input) {
    if (!isPro()) return proRequired('chains');
    var draft = input && typeof input === 'object' ? input : {};
    var clean = sanitiseChain(draft);
    if (!clean) return failWith('INVALID', 'A chain needs at least one step with some text.');

    var existing = draft.id ? chainById(draft.id) : null;
    if (clean.shortcut) {
      var promptHit = findByShortcut(clean.shortcut);
      var chainHit = findChainByShortcut(clean.shortcut, existing ? existing.id : null);
      if (promptHit || chainHit) {
        return failWith(
          'SHORTCUT_TAKEN',
          'The shortcut "' + clean.shortcut + '" already belongs to "' + (promptHit || chainHit).title + '".'
        );
      }
    }

    var now = Date.now();
    if (existing) {
      existing.title = clean.title;
      existing.shortcut = clean.shortcut;
      existing.description = clean.description;
      existing.steps = clean.steps;
      existing.updatedAt = now;
      clearTombstone(existing.id);
      return persist([K.chains, K.tombstones], 'chains').then(function () {
        return clone(existing);
      });
    }
    clean.id = 'chain-' + uid();
    clean.createdAt = now;
    clean.updatedAt = now;
    state.chains.unshift(clean);
    return persist([K.chains], 'chains').then(function () {
      return clone(clean);
    });
  }

  function deleteChain(id) {
    var before = state.chains.length;
    state.chains = state.chains.filter(function (c) {
      return c.id !== id;
    });
    if (state.chains.length === before) return Promise.resolve(false);
    addTombstone(id);
    return persist([K.chains, K.tombstones], 'chains').then(function () {
      return true;
    });
  }

  /**
   * One step of a chain, shaped like a prompt so the fill-in form and the
   * insertion path treat it exactly like any other prompt.
   */
  function getChainStep(chainId, index) {
    var chain = chainById(chainId);
    if (!chain) return null;
    var i = typeof index === 'number' ? index : 0;
    var step = chain.steps[i];
    if (!step) return null;
    var total = chain.steps.length;
    return {
      chainId: chain.id,
      chainTitle: chain.title,
      index: i,
      total: total,
      isLast: i === total - 1,
      stepTitle: step.title || 'Step ' + (i + 1),
      prompt: {
        id: 'chain:' + chain.id + ':' + i,
        title: chain.title + ' · step ' + (i + 1) + ' of ' + total + (step.title ? ': ' + step.title : ''),
        template: step.template,
        description: step.title || chain.description || '',
        category: 'Chains',
        shortcut: '',
        tags: [],
        isChainStep: true
      }
    };
  }

  /** Chains ranked with the same scorer as prompts. */
  function searchChains(opts) {
    var o = opts || {};
    var query = String(o.query || '').trim();
    var scored = [];
    state.chains.forEach(function (c) {
      var probe = {
        id: c.id,
        title: c.title,
        shortcut: c.shortcut,
        description: c.description,
        tags: ['chain'],
        category: 'Chains',
        template: c.steps
          .map(function (s) {
            return (s.title || '') + '\n' + s.template;
          })
          .join('\n')
      };
      var base = scoreOne(probe, query);
      if (query && base <= 0) return;
      scored.push({ c: c, s: base + affinityBonus(probe) });
    });
    scored.sort(function (a, b) {
      return b.s - a.s;
    });
    var out = scored.map(function (e) {
      return clone(e.c);
    });
    return o.limit > 0 ? out.slice(0, o.limit) : out;
  }

  /* =====================================================================
     Custom modifiers (Pro)
     ===================================================================== */

  // keepTime: true when the item comes from sync or a folder file, so its own
  // updatedAt decides which copy is newer. Saving from the editor stamps now.
  function sanitiseCustomModifier(raw, keepTime) {
    if (!raw || typeof raw !== 'object') return null;
    var title = String(raw.title || '').trim();
    if (!title) return null;
    var id = typeof raw.id === 'string' && raw.id ? raw.id : 'mod-custom-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
    if (id.indexOf('mod-custom-') !== 0) {
      id = 'mod-custom-' + slug(title) + '-' + Date.now().toString(36);
    }
    var placement = ['quote', 'fence', 'after', 'before'].indexOf(raw.placement) !== -1 ? raw.placement : 'quote';
    return {
      id: id,
      title: title.slice(0, 100),
      shortTitle: String(raw.shortTitle || title).trim().slice(0, 40),
      icon: String(raw.icon || '📌').trim().slice(0, 4),
      description: String(raw.description || '').trim().slice(0, 200),
      contextMenuTitle: String(raw.contextMenuTitle || (String(raw.icon || '📌').trim() + ' ' + title)).trim().slice(0, 100),
      instruction: String(raw.instruction || '').slice(0, 10000),
      placement: placement,
      createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : Date.now(),
      updatedAt: keepTime && typeof raw.updatedAt === 'number' ? raw.updatedAt : Date.now()
    };
  }

  function getCustomModifiers() {
    return state.customModifiers.slice();
  }

  function getCustomModifier(id) {
    for (var i = 0; i < state.customModifiers.length; i++) {
      if (state.customModifiers[i].id === id) return clone(state.customModifiers[i]);
    }
    return null;
  }

  function saveCustomModifier(input) {
    if (!isPro()) return proRequired('customModifiers');
    var draft = input && typeof input === 'object' ? input : {};
    var clean = sanitiseCustomModifier(draft);
    if (!clean) return failWith('INVALID', 'Give the modifier a title.');

    var existingIdx = -1;
    if (draft.id) {
      for (var i = 0; i < state.customModifiers.length; i++) {
        if (state.customModifiers[i].id === draft.id) {
          existingIdx = i;
          break;
        }
      }
    }

    if (existingIdx === -1 && state.customModifiers.length >= MAX_CUSTOM_MODIFIERS) {
      return failWith('LIMIT_REACHED', 'You can have up to ' + MAX_CUSTOM_MODIFIERS + ' custom modifiers.');
    }

    if (existingIdx !== -1) {
      state.customModifiers[existingIdx] = clean;
    } else {
      state.customModifiers.push(clean);
    }

    return persist([K.customModifiers], 'custom-modifiers').then(function () {
      emit('custom-modifiers-changed');
      return clone(clean);
    });
  }

  function deleteCustomModifier(id) {
    var before = state.customModifiers.length;
    state.customModifiers = state.customModifiers.filter(function (m) {
      return m.id !== id;
    });
    if (state.customModifiers.length === before) return Promise.resolve(false);
    addTombstone(id);
    return persist([K.customModifiers, K.tombstones], 'custom-modifiers').then(function () {
      emit('custom-modifiers-changed');
      return true;
    });
  }

  function reorderCustomModifiers(ids) {
    if (!isPro()) return proRequired('customModifiers');
    var order = Array.isArray(ids) ? ids : [];
    var byId = {};
    state.customModifiers.forEach(function (m) {
      byId[m.id] = m;
    });
    var next = [];
    order.forEach(function (id) {
      if (byId[id]) {
        next.push(byId[id]);
        delete byId[id];
      }
    });
    state.customModifiers.forEach(function (m) {
      if (byId[m.id]) next.push(m);
    });
    state.customModifiers = next;
    return persist([K.customModifiers], 'custom-modifiers').then(function () {
      emit('custom-modifiers-changed');
      return true;
    });
  }

  /* =====================================================================
     Site rules (Pro)
     ===================================================================== */

  function sanitiseSiteRule(raw, keepTime) {
    if (!raw || typeof raw !== 'object') return null;
    var name = String(raw.name || '').trim();
    if (!name) return null;
    var id = typeof raw.id === 'string' && raw.id ? raw.id : 'rule-' + slug(name) + '-' + Date.now().toString(36);
    var hosts = (Array.isArray(raw.hosts) ? raw.hosts : [])
      .map(function (h) {
        return String(h || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
      })
      .filter(Boolean);
    var tags = (Array.isArray(raw.tags) ? raw.tags : [])
      .map(function (t) { return String(t || '').trim().toLowerCase(); })
      .filter(Boolean);
    var folders = (Array.isArray(raw.folders) ? raw.folders : [])
      .map(function (f) { return String(f || '').trim(); })
      .filter(Boolean);
    var promptIds = (Array.isArray(raw.promptIds) ? raw.promptIds : [])
      .map(function (p) { return String(p || '').trim(); })
      .filter(Boolean);
    return {
      id: id,
      name: name.slice(0, 100),
      hosts: hosts,
      tags: tags,
      folders: folders,
      promptIds: promptIds,
      createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : Date.now(),
      updatedAt: keepTime && typeof raw.updatedAt === 'number' ? raw.updatedAt : Date.now()
    };
  }

  function hostMatchesRule(host, ruleHost) {
    var h = String(host || '').toLowerCase().trim();
    var r = String(ruleHost || '').toLowerCase().trim();
    if (!h || !r) return false;
    if (r.indexOf('*.') === 0) {
      var base = r.slice(2);
      return h === base || (h.length > base.length && h.slice(-(base.length + 1)) === '.' + base);
    }
    return h === r;
  }

  function getSiteRules() {
    return state.siteRules.slice();
  }

  function getSiteRule(id) {
    for (var i = 0; i < state.siteRules.length; i++) {
      if (state.siteRules[i].id === id) return clone(state.siteRules[i]);
    }
    return null;
  }

  function saveSiteRule(input) {
    if (!isPro()) return proRequired('siteRules');
    var draft = input && typeof input === 'object' ? input : {};
    var clean = sanitiseSiteRule(draft);
    if (!clean) return failWith('INVALID', 'Give the rule a name.');

    var existingIdx = -1;
    if (draft.id) {
      for (var i = 0; i < state.siteRules.length; i++) {
        if (state.siteRules[i].id === draft.id) {
          existingIdx = i;
          break;
        }
      }
    }

    if (existingIdx === -1 && state.siteRules.length >= MAX_SITE_RULES) {
      return failWith('LIMIT_REACHED', 'You can have up to ' + MAX_SITE_RULES + ' site rules.');
    }

    if (existingIdx !== -1) {
      state.siteRules[existingIdx] = clean;
    } else {
      state.siteRules.push(clean);
    }

    return persist([K.siteRules], 'site-rules').then(function () {
      emit('site-rules-changed');
      return clone(clean);
    });
  }

  function deleteSiteRule(id) {
    var before = state.siteRules.length;
    state.siteRules = state.siteRules.filter(function (r) {
      return r.id !== id;
    });
    if (state.siteRules.length === before) return Promise.resolve(false);
    addTombstone(id);
    return persist([K.siteRules, K.tombstones], 'site-rules').then(function () {
      emit('site-rules-changed');
      return true;
    });
  }

  function getRulesForHost(host) {
    if (!host) return [];
    var cleanHost = String(host).toLowerCase().trim();
    return state.siteRules.filter(function (rule) {
      return (rule.hosts || []).some(function (rh) {
        return hostMatchesRule(cleanHost, rh);
      });
    });
  }

  function getMatchedPromptIdsForHost(host) {
    if (!host || !isPro()) return {};
    var matchingRules = getRulesForHost(host);
    if (!matchingRules.length) return {};
    var matchedIds = {};
    var allPrompts = resolveAll();
    matchingRules.forEach(function (rule) {
      (rule.promptIds || []).forEach(function (pid) {
        matchedIds[pid] = true;
      });
      var ruleTags = (rule.tags || []).map(function (t) { return t.toLowerCase(); });
      var ruleFolders = rule.folders || [];
      if (ruleTags.length || ruleFolders.length) {
        allPrompts.forEach(function (p) {
          if (ruleFolders.indexOf(p.folderId) !== -1) {
            matchedIds[p.id] = true;
          }
          if (ruleTags.length && p.tags && p.tags.length) {
            for (var i = 0; i < p.tags.length; i++) {
              if (ruleTags.indexOf(p.tags[i].toLowerCase()) !== -1) {
                matchedIds[p.id] = true;
                break;
              }
            }
          }
        });
      }
    });
    return matchedIds;
  }

  /* =====================================================================
     Compare across AIs (Pro)
     ===================================================================== */

  var COMPARE_TARGETS = [
    { id: 'chatgpt', label: 'ChatGPT', host: 'chatgpt.com', url: 'https://chatgpt.com/', icon: '🤖' },
    { id: 'claude', label: 'Claude', host: 'claude.ai', url: 'https://claude.ai/new', icon: '🎭' },
    { id: 'gemini', label: 'Gemini', host: 'gemini.google.com', url: 'https://gemini.google.com/app', icon: '✨' },
    { id: 'copilot', label: 'Microsoft Copilot', host: 'copilot.microsoft.com', url: 'https://copilot.microsoft.com/', icon: '🪟' },
    { id: 'perplexity', label: 'Perplexity', host: 'perplexity.ai', url: 'https://www.perplexity.ai/', icon: '🔍' },
    { id: 'deepseek', label: 'DeepSeek', host: 'deepseek.com', url: 'https://chat.deepseek.com/', icon: '🐋' },
    { id: 'grok', label: 'Grok', host: 'grok.com', url: 'https://grok.com/', icon: '⚡' },
    { id: 'mistral', label: 'Le Chat', host: 'chat.mistral.ai', url: 'https://chat.mistral.ai/chat', icon: '🌪️' },
    { id: 'metaai', label: 'Meta AI', host: 'meta.ai', url: 'https://www.meta.ai/', icon: '🌐' },
    { id: 'qwen', label: 'Qwen', host: 'chat.qwen.ai', url: 'https://chat.qwen.ai/', icon: '💬' },
    { id: 'kimi', label: 'Kimi', host: 'kimi.com', url: 'https://www.kimi.com/', icon: '🌙' },
    { id: 'poe', label: 'Poe', host: 'poe.com', url: 'https://poe.com/', icon: '🪶' }
  ];

  function getCompareTargets() {
    return COMPARE_TARGETS.slice();
  }

  function getLastCompareTargets() {
    return localGet([K.compareTargets]).then(function (res) {
      var saved = res[K.compareTargets];
      if (Array.isArray(saved) && saved.length > 0) {
        return saved.slice(0, MAX_COMPARE_TARGETS);
      }
      return ['chatgpt', 'claude', 'gemini'];
    });
  }

  function setLastCompareTargets(ids) {
    var clean = (Array.isArray(ids) ? ids : [])
      .map(String)
      .filter(function (id) {
        return COMPARE_TARGETS.some(function (t) { return t.id === id; });
      })
      .slice(0, MAX_COMPARE_TARGETS);
    if (!clean.length) clean = ['chatgpt', 'claude', 'gemini'];
    var obj = {};
    obj[K.compareTargets] = clean;
    return localSet(obj).then(function () {
      return clean;
    });
  }

  /* =====================================================================
     Library tools (Pro): folders, tags, bulk edit, tidy-up
     ===================================================================== */

  function folderById(id) {
    for (var i = 0; i < state.folders.length; i++) {
      if (state.folders[i].id === id) return state.folders[i];
    }
    return null;
  }

  /** Move a folder under another one, refusing moves that would loop. */
  function moveFolder(id, parentId) {
    var folder = folderById(id);
    var target = parentId || null;
    if (!folder || (target && !folderById(target))) return Promise.resolve(false);
    var cursor = target;
    var guard = 0;
    while (cursor && guard < 50) {
      if (cursor === id) return Promise.resolve(false);
      var parent = folderById(cursor);
      cursor = parent ? parent.parentId : null;
      guard += 1;
    }
    folder.parentId = target;
    return persist([K.folders], 'folders').then(function () {
      return true;
    });
  }

  /** Every tag in use, with how many prompts carry it. Most used first. */
  function getAllTags() {
    var counts = {};
    resolveAll().forEach(function (p) {
      (p.tags || []).forEach(function (t) {
        counts[t] = (counts[t] || 0) + 1;
      });
    });
    return Object.keys(counts)
      .map(function (t) {
        return { tag: t, count: counts[t] };
      })
      .sort(function (a, b) {
        return b.count - a.count || (a.tag < b.tag ? -1 : 1);
      });
  }

  function cleanTagList(list) {
    return asArray(list)
      .map(function (t) {
        return String(t).trim().toLowerCase();
      })
      .filter(Boolean);
  }

  /**
   * Change many prompts at once: move to a folder, set a category, add or
   * remove tags, favourite or unfavourite. A backup is taken first.
   *
   * changes: { folderId?, category?, addTags?, removeTags?, favorite? }
   */
  function bulkUpdate(ids, changes) {
    var list = Array.isArray(ids) ? ids.filter(Boolean) : [];
    var c = changes || {};
    if (!list.length) return Promise.resolve({ updated: 0 });
    if (c.folderId && !folderById(c.folderId)) return failWith('INVALID', 'That folder no longer exists.');
    var addTags = cleanTagList(c.addTags);
    var removeTags = cleanTagList(c.removeTags);

    return takeSnapshot('before-bulk-edit').then(function () {
      var keys = {};
      var updated = 0;
      var now = Date.now();

      function nextTags(current) {
        var out = (current || []).filter(function (t) {
          return removeTags.indexOf(t) === -1;
        });
        addTags.forEach(function (t) {
          if (out.indexOf(t) === -1) out.push(t);
        });
        return out;
      }

      list.forEach(function (id) {
        var touched = false;
        var idx = indexOfUser(id);
        if (idx !== -1) {
          var p = state.userPrompts[idx];
          if (c.folderId !== undefined) {
            p.folderId = c.folderId || null;
            touched = true;
          }
          if (typeof c.category === 'string' && c.category.trim()) {
            p.category = c.category.trim();
            touched = true;
          }
          if (addTags.length || removeTags.length) {
            p.tags = nextTags(p.tags);
            touched = true;
          }
          if (touched) {
            p.updatedAt = now;
            keys[K.userPrompts] = true;
          }
        } else if (isBuiltin(id)) {
          var current = getById(id) || resolveBuiltinWithPatch(builtinOf(id));
          var patch = state.defaultPatches[id] ? mergeForDiff(state.defaultPatches[id], {}) : {};
          if (c.folderId !== undefined) {
            patch.folderId = c.folderId || null;
            touched = true;
          }
          if (typeof c.category === 'string' && c.category.trim()) {
            patch.category = c.category.trim();
            touched = true;
          }
          if (addTags.length || removeTags.length) {
            patch.tags = nextTags(current ? current.tags : []);
            touched = true;
          }
          if (touched) {
            patch.updatedAt = now;
            state.defaultPatches[id] = patch;
            keys[K.defaultPatches] = true;
          }
        }

        if (typeof c.favorite === 'boolean') {
          var fav = isFavorite(id);
          if (c.favorite && !fav) state.favorites = state.favorites.concat([id]);
          if (!c.favorite && fav) {
            state.favorites = state.favorites.filter(function (f) {
              return f !== id;
            });
          }
          if (c.favorite !== fav) {
            keys[K.favorites] = true;
            touched = true;
          }
        }
        if (touched) updated += 1;
      });

      var keyList = Object.keys(keys);
      if (!keyList.length) return { updated: 0 };
      return persist(keyList, 'bulk-updated').then(function () {
        return { updated: updated };
      });
    });
  }

  function builtinOf(id) {
    var found = null;
    getBuiltins().forEach(function (b) {
      if (b.id === id) found = b;
    });
    return found;
  }

  /** Delete many at once. Built-ins are hidden, as with a single delete. */
  function bulkDelete(ids) {
    var list = Array.isArray(ids) ? ids.filter(Boolean) : [];
    if (!list.length) return Promise.resolve({ deleted: 0 });
    return takeSnapshot('before-bulk-edit').then(function () {
      var deleted = 0;
      return list
        .reduce(function (chain, id) {
          return chain.then(function () {
            return deletePrompt(id).then(function (ok) {
              if (ok) deleted += 1;
            });
          });
        }, Promise.resolve())
        .then(function () {
          return { deleted: deleted };
        });
    });
  }

  function normalisedText(t) {
    return String(t || '').replace(/\s+/g, ' ').trim().toLowerCase();
  }

  /**
   * Suggestions for a cleaner library. Nothing is changed here; the user
   * decides what to delete, and deleting takes a backup first.
   */
  function getTidySuggestions(opts) {
    var o = opts || {};
    var now = Date.now();
    var unusedAfter = (typeof o.unusedDays === 'number' ? o.unusedDays : 14) * 86400000;
    var staleAfter = (typeof o.staleDays === 'number' ? o.staleDays : 90) * 86400000;

    var neverUsed = [];
    var stale = [];
    state.userPrompts.forEach(function (p) {
      var u = state.usage[p.id];
      if (!u || !u.count) {
        if (now - (p.createdAt || now) >= unusedAfter) neverUsed.push(clone(p));
      } else if (now - (u.last || 0) >= staleAfter) {
        stale.push(clone(p));
      }
    });

    var groups = {};
    resolveAll({ allBuiltins: true }).forEach(function (p) {
      var key = normalisedText(p.template);
      if (!key) return;
      if (!groups[key]) groups[key] = [];
      groups[key].push(p);
    });
    var duplicates = [];
    Object.keys(groups).forEach(function (key) {
      var g = groups[key];
      if (g.length < 2) return;
      var hasOwn = g.some(function (p) {
        return p.isCustom;
      });
      if (!hasOwn) return;
      duplicates.push(g.map(clone));
    });

    var used = {};
    resolveAll({ allBuiltins: true }).forEach(function (p) {
      if (p.folderId) used[p.folderId] = true;
    });
    state.folders.forEach(function (f) {
      if (f.parentId) used[f.parentId] = true;
    });
    var emptyFolders = state.folders
      .filter(function (f) {
        return !used[f.id];
      })
      .map(clone);

    return { neverUsed: neverUsed, stale: stale, duplicates: duplicates, emptyFolders: emptyFolders };
  }

  /* =====================================================================
     Folder sync (Pro)
     ===================================================================== */

  var FOLDER_SYNC_FILE = 'omniprompt-library.json';

  /**
   * Merge the library file found in the user's chosen folder, then return
   * the text to write back. The page does the file reading and writing; this
   * keeps every decision about the data in the store.
   *
   * The file is an ordinary OmniPrompt backup (it imports anywhere), plus
   * deletion records so a prompt deleted on one computer is not brought back
   * by another. Settings stay per computer.
   */
  function folderSyncMerge(fileText) {
    if (!isPro()) return proRequired('sync');
    var text = typeof fileText === 'string' ? fileText.replace(/^\uFEFF/, '').trim() : '';

    var merge = Promise.resolve({ changed: false, removed: 0 });
    var data = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch (e) {
        return Promise.resolve({
          ok: false,
          error: FOLDER_SYNC_FILE + ' in that folder is not valid JSON, so it was left alone.'
        });
      }
      if (!data || data.format !== BUNDLE_FORMAT || !Array.isArray(data.prompts)) {
        return Promise.resolve({
          ok: false,
          error: FOLDER_SYNC_FILE + ' in that folder is not an OmniPrompt library, so it was left alone.'
        });
      }
      merge = mergeRemote(
        {
          userPrompts: data.prompts,
          defaultPatches: data.defaultPatches,
          hiddenDefaults: data.hiddenDefaults,
          customCategories: data.customCategories,
          folders: data.folders,
          favorites: data.favorites,
          workspaces: data.workspaces,
          variableSets: data.variableSets,
          chains: data.chains,
          customModifiers: data.customModifiers,
          siteRules: data.siteRules,
          tombstones: data.tombstones
        },
        { settings: false, reason: 'folder-synced' }
      );
    }

    return merge.then(function (res) {
      var bundle = exportBundle({ includeSettings: false, includeTombstones: true });
      bundle.settings = null;
      var out = JSON.stringify(bundle, null, 2);
      // Tell the page when the file already says the same thing, apart from
      // its timestamp, so it can skip rewriting it.
      var upToDate = false;
      if (data) {
        var a = clone(data);
        var b = JSON.parse(out);
        delete a.exportedAt;
        delete b.exportedAt;
        upToDate = JSON.stringify(a) === JSON.stringify(b);
      }
      return {
        ok: true,
        changed: res.changed,
        removed: res.removed,
        upToDate: upToDate,
        prompts: state.userPrompts.length,
        text: out
      };
    });
  }

  function getFolderSyncMeta() {
    return localGet([K.folderSyncMeta]).then(function (res) {
      var meta = res[K.folderSyncMeta];
      return meta && typeof meta === 'object' ? meta : {};
    });
  }

  function setFolderSyncMeta(patch) {
    return getFolderSyncMeta().then(function (meta) {
      var next = mergeForDiff(meta, patch || {});
      var obj = {};
      obj[K.folderSyncMeta] = next;
      return localSet(obj).then(function () {
        emit('folder-sync-meta');
        return next;
      });
    });
  }

  function clearFolderSyncMeta() {
    return localRemove([K.folderSyncMeta]).then(function () {
      emit('folder-sync-meta');
      return true;
    });
  }

  /* =====================================================================
     Pro data in backups
     ===================================================================== */

  /**
   * Bring workspaces, chains and value sets in from a backup without
   * duplicating what is already here. Returns how many of each were added.
   */
  function importProData(bundle, idMap, builtinIds) {
    var out = { workspaces: 0, chains: 0, sets: 0 };

    if (Array.isArray(bundle.workspaces)) {
      var names = {};
      var wsIds = {};
      state.workspaces.forEach(function (w) {
        names[w.name.toLowerCase()] = true;
        wsIds[w.id] = true;
      });
      bundle.workspaces.forEach(function (raw) {
        var w = sanitiseWorkspace(raw);
        if (!w || names[w.name.toLowerCase()] || state.workspaces.length >= MAX_WORKSPACES) return;
        if (wsIds[w.id]) w.id = 'ws-' + uid();
        names[w.name.toLowerCase()] = true;
        wsIds[w.id] = true;
        reviveItems([w]);
        state.workspaces.push(w);
        out.workspaces += 1;
      });
    }

    if (Array.isArray(bundle.chains)) {
      var sigs = {};
      var chainIds = {};
      var chainSig = function (c) {
        return (
          c.title.toLowerCase() +
          '\u0000' +
          c.steps
            .map(function (s) {
              return normalisedText(s.template);
            })
            .join('\u0001')
        );
      };
      state.chains.forEach(function (c) {
        sigs[chainSig(c)] = true;
        chainIds[c.id] = true;
      });
      bundle.chains.forEach(function (raw) {
        var c = sanitiseChain(raw);
        if (!c || sigs[chainSig(c)]) return;
        if (chainIds[c.id]) c.id = 'chain-' + uid();
        // An imported shortcut that clashes is dropped rather than refused.
        if (c.shortcut && (findByShortcut(c.shortcut) || findChainByShortcut(c.shortcut))) c.shortcut = '';
        sigs[chainSig(c)] = true;
        chainIds[c.id] = true;
        reviveItems([c]);
        state.chains.push(c);
        out.chains += 1;
      });
    }

    if (bundle.variableSets && typeof bundle.variableSets === 'object') {
      var incoming = sanitiseVariableSets(bundle.variableSets);
      Object.keys(incoming).forEach(function (pid) {
        var target = idMap[pid] || (builtinIds[pid] ? pid : null) || (indexOfUser(pid) !== -1 ? pid : null);
        if (!target) return;
        var list = state.variableSets[target] || [];
        var have = {};
        list.forEach(function (s) {
          have[s.name.toLowerCase()] = true;
        });
        incoming[pid].forEach(function (s) {
          if (have[s.name.toLowerCase()] || list.length >= MAX_SETS_PER_PROMPT) return;
          have[s.name.toLowerCase()] = true;
          list.push(s);
          out.sets += 1;
        });
        if (list.length) state.variableSets[target] = list;
      });
    }

    return out;
  }

  /* =====================================================================
     Context blocks: {{@shortcut}} inside a template
     ===================================================================== */

  function findByShortcut(name) {
    var clean = String(name || '').trim().toLowerCase().replace(/^\/+/, '');
    if (!clean) return null;
    var all = resolveAll({ allBuiltins: true });
    for (var i = 0; i < all.length; i++) {
      if (String(all[i].shortcut || '').toLowerCase() === clean) return all[i];
    }
    return null;
  }

  /**
   * Where a {{@name}} block comes from. The active workspace wins over a
   * prompt with that shortcut, which is what makes one "client brief"
   * prompt fill in differently for each client.
   */
  function resolveBlockSource(name) {
    var key = fieldKey(name);
    if (!key) return null;
    var ws = getActiveWorkspace();
    if (ws) {
      var values = workspaceValueMap(ws);
      if (Object.prototype.hasOwnProperty.call(values, key)) {
        return { kind: 'workspace', id: ws.id, title: ws.name, text: values[key] };
      }
    }
    var hit = findByShortcut(name);
    if (hit) return { kind: 'prompt', id: hit.id, title: hit.title, text: hit.template };
    return null;
  }

  /**
   * Return a copy of the prompt that is ready to insert.
   *
   * Pro users get every {{@shortcut}} replaced by that prompt's text. Free
   * users get the prompt unchanged, plus the list of blocks that were left
   * in place, so the caller can say why.
   */
  function prepareForUse(prompt) {
    if (!prompt) return { prompt: prompt, blocks: [], missing: [], locked: [] };
    var tpl = typeof prompt.template === 'string' ? prompt.template : '';
    var T = typeof self !== 'undefined' ? self.OmniTemplate : null;
    var names = T && T.listBlocks ? T.listBlocks(tpl) : [];
    var copy = mergeForDiff(prompt, {});
    if (!names.length || !T) return { prompt: copy, blocks: [], missing: [], locked: [] };

    if (!isPro()) return { prompt: copy, blocks: names, missing: [], locked: names };

    var expanded = T.expandBlocks(tpl, function (name) {
      var source = resolveBlockSource(name);
      if (!source) return null;
      if (source.kind === 'prompt' && source.id === prompt.id) return null;
      return source.text;
    });
    copy.template = expanded.text;
    return { prompt: copy, blocks: expanded.used, missing: expanded.missing, locked: [] };
  }

  /* =====================================================================
     Review request
     ===================================================================== */

  function getTotalUses() {
    var total = 0;
    Object.keys(state.usage).forEach(function (id) {
      total += (state.usage[id] && state.usage[id].count) || 0;
    });
    return total;
  }

  function shouldAskForReview() {
    return state.settings.reviewPrompt === 'pending' && getTotalUses() >= REVIEW_AFTER_USES;
  }

  function getProInfo() {
    return {
      price: PRO_PRICE,
      checkoutUrl: PRO_CHECKOUT_URL,
      freeLimit: FREE_CUSTOM_LIMIT,
      historyLimit: HISTORY_LIMIT,
      mode: DODO_MODE,
      features: clone(PRO_FEATURES)
    };
  }

  /* =====================================================================
     Optional cross-device sync
     ===================================================================== */

  var SYNC_CHUNK_PREFIX = 'omni.sync.c';
  var SYNC_INDEX_KEY = 'omni.sync.index';
  var SYNC_ITEM_LIMIT = 3500; // safe chunk size well under QUOTA_BYTES_PER_ITEM (8192)
  var SYNC_TOTAL_LIMIT = 98000; // headroom under QUOTA_BYTES (102400)

  function getUtf8Bytes(str) {
    if (typeof TextEncoder !== 'undefined') {
      return new TextEncoder().encode(str).length;
    }
    if (typeof Buffer !== 'undefined') {
      return Buffer.byteLength(str, 'utf8');
    }
    return unescape(encodeURIComponent(str)).length;
  }

  function syncPayload() {
    return {
      v: SCHEMA_VERSION,
      at: Date.now(),
      settingsAt: state.settingsUpdatedAt || 0,
      userPrompts: state.userPrompts.map(stripRuntimeFields),
      defaultPatches: state.defaultPatches,
      hiddenDefaults: state.hiddenDefaults,
      customCategories: state.customCategories || [],
      folders: state.folders,
      favorites: state.favorites,
      workspaces: state.workspaces,
      variableSets: state.variableSets,
      chains: state.chains,
      customModifiers: state.customModifiers,
      siteRules: state.siteRules,
      tombstones: state.tombstones,
      settings: state.settings
    };
  }

  function chunkString(str, size) {
    var limit = size || SYNC_ITEM_LIMIT;
    var out = [];
    for (var i = 0; i < str.length; i += limit) {
      out.push(str.slice(i, i + limit));
    }
    return out;
  }

  function maybePushSync() {
    if (!state.settings.syncEnabled || !hasSyncStorage()) return Promise.resolve(null);

    var json = JSON.stringify(syncPayload());
    var bytes = getUtf8Bytes(json);
    state.syncStatus.bytes = bytes;

    if (bytes > SYNC_TOTAL_LIMIT) {
      state.syncStatus.lastError =
        'Library is ' +
        Math.round(bytes / 1024) +
        'KB, over the ' +
        Math.round(SYNC_TOTAL_LIMIT / 1024) +
        'KB Chrome sync limit. Sync paused; local data is safe.';
      emit('sync-error');
      return Promise.resolve({ ok: false, error: state.syncStatus.lastError });
    }

    var chunks = chunkString(json, SYNC_ITEM_LIMIT);
    var payload = {};
    payload[SYNC_INDEX_KEY] = { count: chunks.length, at: Date.now(), v: SCHEMA_VERSION };
    chunks.forEach(function (c, i) {
      payload[SYNC_CHUNK_PREFIX + i] = c;
    });

    return syncGet([SYNC_INDEX_KEY]).then(function (prev) {
      var prevIndex = prev && prev[SYNC_INDEX_KEY];
      var prevCount = prevIndex && typeof prevIndex.count === 'number' ? prevIndex.count : 0;
      var staleKeys = [];
      if (prevCount > chunks.length) {
        for (var k = chunks.length; k < prevCount; k++) {
          staleKeys.push(SYNC_CHUNK_PREFIX + k);
        }
      }
      var cleanPromise = staleKeys.length > 0 ? syncRemove(staleKeys) : Promise.resolve(true);
      return cleanPromise.then(function () {
        return syncSet(payload);
      });
    }).then(function (res) {
      if (res.ok) {
        state.syncStatus.lastError = null;
        state.syncStatus.lastPushAt = Date.now();
      } else {
        var rawErr = res.error || 'Sync write failed.';
        if (/quota/i.test(rawErr)) {
          state.syncStatus.lastError = 'Chrome sync quota reached. Sync paused; local data is safe.';
        } else {
          state.syncStatus.lastError = rawErr;
        }
        emit('sync-error');
      }
      return res;
    });
  }

  function readRemote() {
    return syncGet(null).then(function (res) {
      var index = res && res[SYNC_INDEX_KEY];
      if (!index || typeof index.count !== 'number' || index.count < 1) return null;

      var parts = [];
      for (var i = 0; i < index.count; i++) {
        var piece = res[SYNC_CHUNK_PREFIX + i];
        // A partial write is unusable; ignoring it is safer than importing half.
        if (typeof piece !== 'string') return null;
        parts.push(piece);
      }

      var remote;
      try {
        remote = JSON.parse(parts.join(''));
      } catch (e) {
        return null;
      }
      return remote && typeof remote === 'object' ? remote : null;
    });
  }

  /**
   * Merge the remote copy into the local one.
   *
   * This deliberately merges rather than letting one side win outright. A
   * whole-payload "last write wins" loses real work: switching sync on from a
   * second machine would replace the library that was already there, and a
   * newer local edit would discard every prompt written elsewhere.
   *
   * Per item, the newer `updatedAt` wins. Lists are unioned.
   */
  function maybePullSync() {
    if (!state.settings.syncEnabled || !hasSyncStorage()) return Promise.resolve(false);

    return readRemote().then(function (remote) {
      if (!remote) return false;
      return mergeRemote(remote, { settings: true, reason: 'sync-pulled' }).then(function (res) {
        return res.changed;
      });
    });
  }

  /** Local items a remote deletion record would remove. */
  function countBuriedByRemote(remoteTombs) {
    var n = 0;
    function check(item) {
      var t = remoteTombs[item.id];
      if (typeof t === 'number' && t >= (item.updatedAt || 0)) n += 1;
    }
    state.userPrompts.forEach(check);
    state.workspaces.forEach(check);
    state.chains.forEach(check);
    return n;
  }

  /**
   * Merge another copy of the library into this one. Used by Chrome sync and
   * by folder sync (Pro), which is why it is shaped around the sync payload.
   *
   * A deletion made elsewhere travels as a tombstone. It only removes a local
   * item that has not been edited since, and a backup is taken first, so the
   * item can be brought back from Backup & sync.
   */
  function mergeRemote(remote, opts) {
    var o = opts || {};
    var remoteTombs = sanitiseTombstones(remote.tombstones);
    var willRemove = countBuriedByRemote(remoteTombs);
    var before = willRemove ? takeSnapshot('before-sync') : Promise.resolve(null);

    return before.then(function () {
      var changed = false;
      var removed = 0;

      Object.keys(remoteTombs).forEach(function (id) {
        var local = state.tombstones[id];
        if (typeof local !== 'number' || remoteTombs[id] > local) {
          state.tombstones[id] = remoteTombs[id];
          changed = true;
        }
      });

      function buried(item) {
        var t = state.tombstones[item.id];
        return typeof t === 'number' && t >= (item.updatedAt || 0);
      }

      // Local items deleted elsewhere after their last edit here.
      var keepPrompts = state.userPrompts.filter(function (p) {
        return !buried(p);
      });
      if (keepPrompts.length !== state.userPrompts.length) {
        removed += state.userPrompts.length - keepPrompts.length;
        state.userPrompts = keepPrompts;
        changed = true;
      }
      var keepWorkspaces = state.workspaces.filter(function (w) {
        return !buried(w);
      });
      if (keepWorkspaces.length !== state.workspaces.length) {
        removed += state.workspaces.length - keepWorkspaces.length;
        state.workspaces = keepWorkspaces;
        changed = true;
      }
      var keepChains = state.chains.filter(function (c) {
        return !buried(c);
      });
      if (keepChains.length !== state.chains.length) {
        removed += state.chains.length - keepChains.length;
        state.chains = keepChains;
        changed = true;
      }
      var keepMods = state.customModifiers.filter(function (m) {
        return !buried(m);
      });
      if (keepMods.length !== state.customModifiers.length) {
        removed += state.customModifiers.length - keepMods.length;
        state.customModifiers = keepMods;
        changed = true;
      }
      var keepRules = state.siteRules.filter(function (r) {
        return !buried(r);
      });
      if (keepRules.length !== state.siteRules.length) {
        removed += state.siteRules.length - keepRules.length;
        state.siteRules = keepRules;
        changed = true;
      }

      if (Array.isArray(remote.userPrompts)) {
        var byId = {};
        state.userPrompts.forEach(function (p) {
          byId[p.id] = p;
        });

        remote.userPrompts.forEach(function (raw) {
          var incoming = normalize(sanitisePrompt(raw, true));
          if (buried(incoming)) return;
          var existing = byId[incoming.id];
          if (!existing) {
            byId[incoming.id] = incoming;
            changed = true;
            return;
          }
          if ((incoming.updatedAt || 0) > (existing.updatedAt || 0)) {
            byId[incoming.id] = incoming;
            changed = true;
          }
        });

        var merged = Object.keys(byId).map(function (id) {
          return byId[id];
        });
        merged.sort(function (a, b) {
          return (b.updatedAt || 0) - (a.updatedAt || 0);
        });
        state.userPrompts = merged;
      }

      if (remote.defaultPatches && typeof remote.defaultPatches === 'object') {
        Object.keys(remote.defaultPatches).forEach(function (id) {
          var incoming = remote.defaultPatches[id];
          var existing = state.defaultPatches[id];
          if (!existing || (incoming.updatedAt || 0) > (existing.updatedAt || 0)) {
            state.defaultPatches[id] = incoming;
            changed = true;
          }
        });
      }

      if (Array.isArray(remote.hiddenDefaults)) {
        remote.hiddenDefaults.forEach(function (id) {
          if (state.hiddenDefaults.indexOf(id) === -1) {
            state.hiddenDefaults.push(id);
            changed = true;
          }
        });
      }

      if (Array.isArray(remote.customCategories)) {
        var haveCatNames = {};
        (state.customCategories || []).forEach(function (c) {
          haveCatNames[String(c.name).toLowerCase()] = true;
        });
        remote.customCategories.forEach(function (c) {
          if (!c || !c.name || haveCatNames[String(c.name).toLowerCase()]) return;
          state.customCategories.push(c);
          changed = true;
        });
      }

      if (Array.isArray(remote.folders)) {
        var haveFolderIds = {};
        var haveFolderNames = {};
        state.folders.forEach(function (f) {
          haveFolderIds[f.id] = true;
          haveFolderNames[String(f.name).toLowerCase()] = true;
        });
        remote.folders.forEach(function (f) {
          if (!f || !f.id || haveFolderIds[f.id]) return;
          if (haveFolderNames[String(f.name).toLowerCase()]) return;
          state.folders.push(f);
          changed = true;
        });
      }

      if (Array.isArray(remote.favorites)) {
        remote.favorites.forEach(function (id) {
          if (state.favorites.indexOf(id) === -1) {
            state.favorites.push(id);
            changed = true;
          }
        });
      }

      // Workspaces and chains: per item, the newer edit wins.
      if (Array.isArray(remote.workspaces)) {
        if (mergeById(state.workspaces, remote.workspaces, sanitiseWorkspace, buried)) changed = true;
      }
      if (Array.isArray(remote.chains)) {
        if (mergeById(state.chains, remote.chains, sanitiseChain, buried)) changed = true;
      }
      // Custom modifiers and site rules: same rule. A merge never pushes the
      // list past its cap; anything beyond it stays in the other copy.
      if (Array.isArray(remote.customModifiers)) {
        var modCap = Math.max(MAX_CUSTOM_MODIFIERS, state.customModifiers.length);
        if (mergeById(state.customModifiers, remote.customModifiers, function (raw) {
          return sanitiseCustomModifier(raw, true);
        }, buried)) changed = true;
        if (state.customModifiers.length > modCap) state.customModifiers = state.customModifiers.slice(0, modCap);
      }
      if (Array.isArray(remote.siteRules)) {
        var ruleCap = Math.max(MAX_SITE_RULES, state.siteRules.length);
        if (mergeById(state.siteRules, remote.siteRules, function (raw) {
          return sanitiseSiteRule(raw, true);
        }, buried)) changed = true;
        if (state.siteRules.length > ruleCap) state.siteRules = state.siteRules.slice(0, ruleCap);
      }
      if (remote.variableSets && typeof remote.variableSets === 'object') {
        var incomingSets = sanitiseVariableSets(remote.variableSets);
        Object.keys(incomingSets).forEach(function (pid) {
          var list = state.variableSets[pid] || [];
          if (mergeById(list, incomingSets[pid], null, null)) {
            state.variableSets[pid] = list.slice(0, MAX_SETS_PER_PROMPT);
            changed = true;
          }
        });
      }

      // Settings only move when the remote copy is genuinely newer, so a device
      // does not have its preferences rewritten by an older sibling. Folder
      // sync leaves settings alone: each computer keeps its own.
      if (o.settings && remote.settings && typeof remote.settings === 'object') {
        var remoteSettingsAt = typeof remote.settingsAt === 'number' ? remote.settingsAt : 0;
        if (remoteSettingsAt > (state.settingsUpdatedAt || 0)) {
          Object.keys(DEFAULT_SETTINGS).forEach(function (k) {
            // These stay per-device choices.
            if (k === 'syncEnabled' || k === 'disabledSites' || k === 'activeWorkspaceId') return;
            if (Object.prototype.hasOwnProperty.call(remote.settings, k)) {
              state.settings[k] = remote.settings[k];
            }
          });
          state.settings.paletteHotkey = normalizeHotkey(state.settings.paletteHotkey);
          state.settingsUpdatedAt = remoteSettingsAt;
          changed = true;
        }
      }

      pruneTombstones();

      if (!changed) return { changed: false, removed: 0 };

      invalidate();

      var obj = {};
      DELTA_KEYS.forEach(function (k) {
        obj[k] = pick(k);
      });
      obj[K.settingsUpdatedAt] = state.settingsUpdatedAt;
      return localSet(obj).then(function () {
        emit(o.reason || 'sync-pulled');
        return { changed: true, removed: removed };
      });
    });
  }

  /**
   * Fold `incoming` into `list` in place. An item wins when it is new here or
   * was edited more recently. Returns true when anything changed.
   */
  function mergeById(list, incoming, clean, isBuried) {
    var changed = false;
    var index = {};
    list.forEach(function (item, i) {
      if (item && item.id) index[item.id] = i;
    });
    incoming.forEach(function (raw) {
      var item = clean ? clean(raw) : raw;
      if (!item || !item.id) return;
      if (isBuried && isBuried(item)) return;
      var at = index[item.id];
      if (at === undefined) {
        index[item.id] = list.length;
        list.push(item);
        changed = true;
      } else if ((item.updatedAt || 0) > (list[at].updatedAt || 0)) {
        list[at] = item;
        changed = true;
      }
    });
    return changed;
  }

  function clearSyncPayload() {
    if (!hasSyncStorage()) return Promise.resolve(false);
    return syncGet(null).then(function (res) {
      var keys = Object.keys(res || {}).filter(function (k) {
        return k === SYNC_INDEX_KEY || k.indexOf(SYNC_CHUNK_PREFIX) === 0;
      });
      if (!keys.length) return true;
      return syncRemove(keys);
    });
  }

  /**
   * Turn sync on or off.
   *
   * Turning it on adopts whatever is already in the cloud *before* uploading.
   * Pushing first would let a freshly installed second device overwrite the
   * library it was supposed to receive.
   */
  function setSyncEnabled(enabled) {
    state.settings.syncEnabled = !!enabled;

    // Written directly rather than through persist(), because persist() ends in
    // a push and the ordering above is the entire point.
    var settingsWrite = {};
    settingsWrite[K.settings] = state.settings;
    settingsWrite[K.schemaVersion] = SCHEMA_VERSION;
    invalidate();

    return localSet(settingsWrite).then(function () {
      emit('settings');

      if (!enabled) {
        return clearSyncPayload().then(function () {
          return { ok: true, enabled: false };
        });
      }

      return maybePullSync().then(function (pulled) {
        return maybePushSync().then(function (res) {
          var out = res && typeof res.ok === 'boolean' ? res : { ok: true };
          out.pulled = !!pulled;
          out.enabled = true;
          return out;
        });
      });
    });
  }

  function getSyncStatus() {
    return {
      enabled: !!state.settings.syncEnabled,
      available: hasSyncStorage(),
      lastError: state.syncStatus.lastError,
      lastPushAt: state.syncStatus.lastPushAt,
      bytes: state.syncStatus.bytes,
      limitBytes: SYNC_TOTAL_LIMIT
    };
  }

  /* =====================================================================
     Change notification
     ===================================================================== */

  function onChange(fn) {
    if (typeof fn !== 'function') return function () {};
    listeners.push(fn);
    return function () {
      listeners = listeners.filter(function (l) {
        return l !== fn;
      });
    };
  }

  var storageHookAttached = false;

  /**
   * Keep every surface live. When the options page writes, the popup and all
   * open tabs refresh without a reload.
   */
  function watchStorage() {
    if (storageHookAttached) return;
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.onChanged) return;
    storageHookAttached = true;
    chrome.storage.onChanged.addListener(function (changes, area) {
      if (area !== 'local') return;
      var relevant = Object.keys(changes).some(function (k) {
        return k.indexOf('omni.') === 0;
      });
      if (!relevant) return;
      localGet(STATE_KEYS).then(function (res) {
        applyLoaded(res);
        emit('external');
      });
    });
  }

  function publicSnapshot() {
    return {
      prompts: getAll(),
      settings: getSettings(),
      customCategories: getCustomCategories(),
      folders: getFolders(),
      favorites: state.favorites.slice()
    };
  }

  /* =====================================================================
     Public API
     ===================================================================== */

  return {
    SCHEMA_VERSION: SCHEMA_VERSION,
    KEYS: K,
    LEGACY_KEYS: LEGACY,
    DEFAULT_SETTINGS: DEFAULT_SETTINGS,
    DEFAULT_HOTKEY: DEFAULT_HOTKEY,
    BUILTIN_CATEGORIES: BUILTIN_CATEGORIES,
    EMOJI_PACK: EMOJI_PACK,
    BUNDLE_FORMAT: BUNDLE_FORMAT,

    init: init,
    reload: function () {
      return init({ force: true });
    },
    isReady: function () {
      return state.ready;
    },
    watchStorage: watchStorage,
    onChange: onChange,

    getAll: getAll,
    getById: getById,
    isBuiltin: isBuiltin,
    getBuiltins: getBuiltins,
    search: search,
    scoreOne: scoreOne,

    savePrompt: savePrompt,
    deletePrompt: deletePrompt,
    duplicatePrompt: duplicatePrompt,
    restoreDefaultLibrary: restoreDefaultLibrary,
    eraseAllData: eraseAllData,

    isFavorite: isFavorite,
    toggleFavorite: toggleFavorite,
    getFavorites: getFavorites,
    recordUse: recordUse,
    getRecent: getRecent,
    getMostUsed: getMostUsed,
    getUsage: getUsage,

    getFolders: getFolders,
    getFolderTree: getFolderTree,
    createFolder: createFolder,
    renameFolder: renameFolder,
    deleteFolder: deleteFolder,

    getCategories: getCategories,
    getCustomCategories: getCustomCategories,
    createCategory: createCategory,
    updateCategory: updateCategory,
    deleteCategory: deleteCategory,
    getCategoryMeta: getCategoryMeta,
    countByCategory: countByCategory,

    getSettings: getSettings,
    setSetting: setSetting,
    setSettings: setSettings,
    setRole: setRole,
    getSelectedRole: getSelectedRole,
    getActivePacks: getActivePacks,
    setActivePacks: setActivePacks,
    isSiteDisabled: isSiteDisabled,
    setSiteDisabled: setSiteDisabled,
    describeHotkey: describeHotkey,
    formatHotkey: formatHotkey,
    isMacPlatform: isMacPlatform,
    normalizeHotkey: normalizeHotkey,

    exportBundle: exportBundle,
    importBundle: importBundle,
    parseImportPayload: parseImportPayload,

    setSyncEnabled: setSyncEnabled,
    getSyncStatus: getSyncStatus,
    pullSync: maybePullSync,
    pushSync: maybePushSync,

    getHistory: getHistory,
    restoreVersion: restoreVersion,

    takeSnapshot: takeSnapshot,
    maybeDailySnapshot: maybeDailySnapshot,
    getSnapshots: getSnapshots,
    restoreSnapshot: restoreSnapshot,
    markExported: markExported,
    getBackupStatus: getBackupStatus,

    setPendingDraft: setPendingDraft,
    takePendingDraft: takePendingDraft,

    prepareForUse: prepareForUse,
    findByShortcut: findByShortcut,
    resolveBlockSource: resolveBlockSource,

    // Pro: client workspaces
    getWorkspaces: getWorkspaces,
    getWorkspace: getWorkspace,
    getActiveWorkspace: function () {
      var ws = getActiveWorkspace();
      return ws ? clone(ws) : null;
    },
    saveWorkspace: saveWorkspace,
    deleteWorkspace: deleteWorkspace,
    setActiveWorkspace: setActiveWorkspace,

    // Pro: saved value sets and remembered values
    getVariableSets: getVariableSets,
    saveVariableSet: saveVariableSet,
    deleteVariableSet: deleteVariableSet,
    rememberValues: rememberValues,
    clearRememberedValues: clearRememberedValues,
    getValueSources: getValueSources,

    // Pro: stepped chains
    getChains: getChains,
    getChain: getChain,
    saveChain: saveChain,
    deleteChain: deleteChain,
    getChainStep: getChainStep,
    searchChains: searchChains,
    findChainByShortcut: function (shortcut, ignoreId) {
      var c = findChainByShortcut(shortcut, ignoreId);
      return c ? clone(c) : null;
    },

    // Pro: library tools
    moveFolder: moveFolder,
    getAllTags: getAllTags,
    bulkUpdate: bulkUpdate,
    bulkDelete: bulkDelete,
    getTidySuggestions: getTidySuggestions,

    // Pro: custom modifiers
    getCustomModifiers: getCustomModifiers,
    getCustomModifier: getCustomModifier,
    saveCustomModifier: saveCustomModifier,
    deleteCustomModifier: deleteCustomModifier,
    reorderCustomModifiers: reorderCustomModifiers,
    MAX_CUSTOM_MODIFIERS: MAX_CUSTOM_MODIFIERS,

    // Pro: site rules
    getSiteRules: getSiteRules,
    getSiteRule: getSiteRule,
    saveSiteRule: saveSiteRule,
    deleteSiteRule: deleteSiteRule,
    getRulesForHost: getRulesForHost,
    hostMatchesRule: hostMatchesRule,
    MAX_SITE_RULES: MAX_SITE_RULES,

    // Pro: compare across AIs
    getCompareTargets: getCompareTargets,
    getLastCompareTargets: getLastCompareTargets,
    setLastCompareTargets: setLastCompareTargets,
    MAX_COMPARE_TARGETS: MAX_COMPARE_TARGETS,

    // Pro: folder sync
    FOLDER_SYNC_FILE: FOLDER_SYNC_FILE,
    folderSyncMerge: folderSyncMerge,
    getFolderSyncMeta: getFolderSyncMeta,
    setFolderSyncMeta: setFolderSyncMeta,
    clearFolderSyncMeta: clearFolderSyncMeta,

    getTotalUses: getTotalUses,
    shouldAskForReview: shouldAskForReview,
    REVIEW_AFTER_USES: REVIEW_AFTER_USES,

    FREE_CUSTOM_LIMIT: FREE_CUSTOM_LIMIT,
    PRO_PRICE: PRO_PRICE,
    DODO_MODE: DODO_MODE,
    // Read-only copies, so tests and the release check can see which
    // products unlock Pro without being able to change the list.
    PRO_PRODUCT_IDS: {
      live: PRO_PRODUCT_IDS.live.slice(),
      test: PRO_PRODUCT_IDS.test.slice()
    },
    getProInfo: getProInfo,
    isPro: isPro,
    getLicense: getLicense,
    getFreeLimit: getFreeLimit,
    getCustomCount: getCustomCount,
    isLimitReached: isLimitReached,
    canCreatePrompt: canCreatePrompt,
    activateLicense: activateLicense,
    validateLicense: validateLicense,
    deactivateLicense: deactivateLicense,

    // Exposed for the regression suite.
    _internals: {
      buildMigration: buildMigration,
      sanitisePrompt: sanitisePrompt,
      diffAgainstBuiltin: diffAgainstBuiltin,
      migrateSettings: migrateSettings,
      state: state,
      signatureOf: signatureOf,
      mergeRemote: mergeRemote,
      fieldKey: fieldKey
    }
  };
});
