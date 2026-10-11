/**
 * OmniPrompt - Service worker (Manifest V3)
 *
 * Owns install and update lifecycle, the right-click modifier menu, the
 * browser-level keyboard command, and injecting the content script into tabs
 * that were already open.
 *
 * Fixes carried in this rewrite
 * -----------------------------
 * - Context menus are cleared before being rebuilt. The old code called
 *   contextMenus.create with fixed ids on every install and update with no
 *   removeAll first, which throws a duplicate-id error on update.
 * - Every chrome.* call checks runtime.lastError, so failures are handled
 *   instead of logging "Unchecked runtime.lastError".
 * - Tabs open at install time get the content script injected, so the extension
 *   works immediately instead of needing a manual reload of every tab.
 * - The modifier list comes from lib/modifiers.js rather than a third hand-kept
 *   copy of the titles.
 */

'use strict';

// lib/importers.js is left out here and in CONTENT_SCRIPTS: only the popup and
// the library page import files, and they load it themselves.
importScripts(
  '../data/defaultPrompts.js',
  '../lib/template.js',
  '../lib/modifiers.js',
  '../lib/promptStore.js'
);

const ROOT_MENU_ID = 'omniprompt-root-menu';
const OPEN_LIBRARY_ID = 'omniprompt-open-library';
const SAVE_SELECTION_ID = 'omniprompt-save-selection';

/* =====================================================================
   Context menus
   ===================================================================== */

/**
 * Rebuild the menu from scratch.
 *
 * removeAll first is what makes this safe to call on both install and update.
 * Menu registrations persist across an extension update, so creating the same
 * ids again without clearing them fails.
 */
let menuQueue = Promise.resolve();
function buildContextMenus() {
  menuQueue = menuQueue.then(buildContextMenusNow, buildContextMenusNow);
  return menuQueue;
}

function buildContextMenusNow() {
  return new Promise((resolve) => {
    chrome.contextMenus.removeAll(() => {
      void chrome.runtime.lastError;

      chrome.contextMenus.create(
        {
          id: ROOT_MENU_ID,
          title: 'OmniPrompt',
          contexts: ['selection', 'editable']
        },
        () => void chrome.runtime.lastError
      );

      const customMods =
        self.OmniStore && self.OmniStore.isPro && self.OmniStore.isPro() && self.OmniStore.getCustomModifiers
          ? self.OmniStore.getCustomModifiers()
          : [];

      self.OmniModifiers.contextMenuItems(customMods).forEach((item) => {
        chrome.contextMenus.create(
          {
            id: item.id,
            parentId: ROOT_MENU_ID,
            title: item.title,
            contexts: ['selection', 'editable']
          },
          () => void chrome.runtime.lastError
        );
      });

      chrome.contextMenus.create(
        {
          id: 'omniprompt-separator',
          parentId: ROOT_MENU_ID,
          type: 'separator',
          contexts: ['selection', 'editable']
        },
        () => void chrome.runtime.lastError
      );

      chrome.contextMenus.create(
        {
          id: SAVE_SELECTION_ID,
          parentId: ROOT_MENU_ID,
          title: 'Save selection as a new prompt…',
          contexts: ['selection']
        },
        () => void chrome.runtime.lastError
      );

      chrome.contextMenus.create(
        {
          id: OPEN_LIBRARY_ID,
          parentId: ROOT_MENU_ID,
          title: 'Open prompt library…',
          contexts: ['selection', 'editable']
        },
        () => void chrome.runtime.lastError
      );

      resolve();
    });
  });
}

/** Open the full editor, pre-filled with the pending draft. */
function openEditorWithDraft() {
  chrome.tabs.create(
    { url: chrome.runtime.getURL('options/options.html?view=editor&draft=1') },
    () => void chrome.runtime.lastError
  );
}

/**
 * Save highlighted text as a prompt. The page is asked first, because its own
 * selection keeps line breaks and Chrome's selectionText flattens them. A page
 * with no content script falls back to selectionText.
 */
async function saveSelectionAsPrompt(info, tab) {
  if (tab && typeof tab.id === 'number') {
    let res = await sendToTab(tab.id, { action: 'save_as_prompt' });
    if (!res.ok && res.reason === 'no-content-script') {
      const injected = await injectInto(tab.id);
      if (injected) res = await sendToTab(tab.id, { action: 'save_as_prompt' });
    }
    if (res.ok) return;
  }
  const text = info.selectionText || '';
  if (!text.trim()) return;
  await self.OmniStore.setPendingDraft({ template: text, source: (tab && tab.title) || '' });
  openEditorWithDraft();
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === OPEN_LIBRARY_ID) {
    chrome.runtime.openOptionsPage(() => void chrome.runtime.lastError);
    return;
  }

  if (info.menuItemId === SAVE_SELECTION_ID) {
    await saveSelectionAsPrompt(info, tab);
    return;
  }

  if (!tab || typeof tab.id !== 'number') return;
  if (typeof info.menuItemId !== 'string' || info.menuItemId.indexOf('mod-') !== 0) return;

  let res = await sendToTab(tab.id, {
    action: 'apply_modifier',
    modifierId: info.menuItemId,
    text: info.selectionText || ''
  });
  if (!res.ok && res.reason === 'no-content-script') {
    const injected = await injectInto(tab.id);
    if (injected) {
      res = await sendToTab(tab.id, {
        action: 'apply_modifier',
        modifierId: info.menuItemId,
        text: info.selectionText || ''
      });
    }
  }
  if (!res.ok) notifyUnavailable(tab.id);
});

/* =====================================================================
   Messaging
   ===================================================================== */

/**
 * Send a message to a tab and resolve with a plain result instead of throwing.
 *
 * A tab with no content script (a chrome:// page, the web store, a PDF viewer)
 * rejects the message. Treating that as data rather than an error keeps the
 * callers simple.
 */
function sendToTab(tabId, message) {
  return new Promise((resolve) => {
    try {
      chrome.tabs.sendMessage(tabId, message, (response) => {
        const err = chrome.runtime.lastError;
        if (err) {
          resolve({ ok: false, reason: 'no-content-script', error: err.message });
          return;
        }
        resolve({ ok: !!(response && response.ok !== false), response });
      });
    } catch (e) {
      resolve({ ok: false, reason: 'send-failed', error: String(e && e.message ? e.message : e) });
    }
  });
}

function getActiveTab() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      void chrome.runtime.lastError;
      resolve(tabs && tabs[0] ? tabs[0] : null);
    });
  });
}

/** Tell the user why nothing happened, using the badge as a quiet channel. */
function notifyUnavailable(tabId) {
  const options = typeof tabId === 'number' ? { tabId } : {};
  chrome.action.setBadgeText(Object.assign({ text: '—' }, options), () => void chrome.runtime.lastError);
  chrome.action.setBadgeBackgroundColor(
    Object.assign({ color: '#7f1d1d' }, options),
    () => void chrome.runtime.lastError
  );
  setTimeout(() => {
    chrome.action.setBadgeText(Object.assign({ text: '' }, options), () => void chrome.runtime.lastError);
  }, 2500);
}

/* =====================================================================
   Injecting into already-open tabs
   ===================================================================== */

const CONTENT_SCRIPTS = [
  'data/defaultPrompts.js',
  'lib/theme.js',
  'lib/template.js',
  'lib/modifiers.js',
  'lib/promptStore.js',
  'content/adapters.js',
  'content/variableModal.js',
  'content/slashTrigger.js',
  'content/commandPalette.js',
  'content/content.js'
];

/**
 * Inject into a single tab. The content script sets a guard flag, so a double
 * injection is harmless.
 */
function injectInto(tabId) {
  return new Promise((resolve) => {
    if (!chrome.scripting || !chrome.scripting.executeScript) return resolve(false);
    chrome.scripting.executeScript(
      { target: { tabId }, files: CONTENT_SCRIPTS },
      () => {
        // Restricted pages reject injection; that is expected, not an error.
        void chrome.runtime.lastError;
        resolve(!chrome.runtime.lastError);
      }
    );
  });
}

/**
 * After install or update, bring every eligible open tab up to date.
 *
 * Without this, a fresh install does nothing in the ChatGPT tab the user
 * already had open, and they have no way to know a reload is needed.
 */
function injectIntoOpenTabs() {
  return new Promise((resolve) => {
    chrome.tabs.query({ url: ['http://*/*', 'https://*/*'] }, (tabs) => {
      void chrome.runtime.lastError;
      const list = tabs || [];
      let remaining = list.length;
      if (!remaining) return resolve(0);

      let injected = 0;
      list.forEach((tab) => {
        if (typeof tab.id !== 'number') {
          remaining -= 1;
          if (!remaining) resolve(injected);
          return;
        }
        injectInto(tab.id).then((ok) => {
          if (ok) injected += 1;
          remaining -= 1;
          if (!remaining) resolve(injected);
        });
      });
    });
  });
}

const EXCLUDE_MATCHES = [
  '*://chrome.google.com/webstore/*',
  '*://chromewebstore.google.com/*',
  '*://microsoftedge.microsoft.com/addons/*',
  '*://addons.opera.com/*'
];

const DYNAMIC_EVERYWHERE_ID = 'omniprompt-everywhere';
const DYNAMIC_SITE_PREFIX = 'omniprompt-site-';

function originToScriptId(origin) {
  return (
    DYNAMIC_SITE_PREFIX +
    String(origin || '')
      .replace(/[^a-zA-Z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 32)
  );
}

function registerDynamicScript(id, matches) {
  return new Promise((resolve) => {
    if (!chrome.scripting || !chrome.scripting.registerContentScripts) return resolve(false);
    chrome.scripting.registerContentScripts(
      [
        {
          id: id,
          matches: matches,
          excludeMatches: EXCLUDE_MATCHES,
          js: CONTENT_SCRIPTS,
          runAt: 'document_idle',
          allFrames: false,
          persistAcrossSessions: true
        }
      ],
      () => {
        void chrome.runtime.lastError;
        resolve(!chrome.runtime.lastError);
      }
    );
  });
}

function unregisterDynamicScript(id) {
  return new Promise((resolve) => {
    if (!chrome.scripting || !chrome.scripting.unregisterContentScripts) return resolve(false);
    chrome.scripting.unregisterContentScripts({ ids: [id] }, () => {
      void chrome.runtime.lastError;
      resolve(!chrome.runtime.lastError);
    });
  });
}

function reconcileDynamicScripts() {
  return new Promise((resolve) => {
    if (
      !chrome.permissions ||
      !chrome.permissions.getAll ||
      !chrome.scripting ||
      !chrome.scripting.getRegisteredContentScripts
    ) {
      return resolve();
    }
    chrome.permissions.getAll((perms) => {
      void chrome.runtime.lastError;
      const origins = (perms && perms.origins) || [];
      const hasAllUrls = origins.indexOf('<all_urls>') !== -1;

      chrome.scripting.getRegisteredContentScripts((scripts) => {
        void chrome.runtime.lastError;
        const currentIds = (scripts || []).map((s) => s.id);
        const promises = [];

        if (hasAllUrls) {
          if (currentIds.indexOf(DYNAMIC_EVERYWHERE_ID) === -1) {
            promises.push(registerDynamicScript(DYNAMIC_EVERYWHERE_ID, ['<all_urls>']));
          }
        } else {
          if (currentIds.indexOf(DYNAMIC_EVERYWHERE_ID) !== -1) {
            promises.push(unregisterDynamicScript(DYNAMIC_EVERYWHERE_ID));
          }
          const activeOriginIds = [];
          origins.forEach((orig) => {
            if (orig === '<all_urls>') return;
            const sId = originToScriptId(orig);
            activeOriginIds.push(sId);
            if (currentIds.indexOf(sId) === -1) {
              const match = orig.endsWith('/*') ? orig : orig.endsWith('/') ? orig + '*' : orig + '/*';
              promises.push(registerDynamicScript(sId, [match]));
            }
          });

          currentIds.forEach((id) => {
            if (id.startsWith(DYNAMIC_SITE_PREFIX) && activeOriginIds.indexOf(id) === -1) {
              promises.push(unregisterDynamicScript(id));
            }
          });
        }

        Promise.all(promises).then(() => resolve());
      });
    });
  });
}

if (chrome.permissions && chrome.permissions.onAdded) {
  chrome.permissions.onAdded.addListener((perms) => {
    const origins = (perms && perms.origins) || [];
    const promises = [];
    if (origins.indexOf('<all_urls>') !== -1) {
      promises.push(registerDynamicScript(DYNAMIC_EVERYWHERE_ID, ['<all_urls>']));
    }
    origins.forEach((orig) => {
      if (orig === '<all_urls>') return;
      const sId = originToScriptId(orig);
      const match = orig.endsWith('/*') ? orig : orig.endsWith('/') ? orig + '*' : orig + '/*';
      promises.push(registerDynamicScript(sId, [match]));
    });
    Promise.all(promises).then(() => injectIntoOpenTabs());
  });
}

if (chrome.permissions && chrome.permissions.onRemoved) {
  chrome.permissions.onRemoved.addListener((perms) => {
    const origins = (perms && perms.origins) || [];
    const ids = [];
    if (origins.indexOf('<all_urls>') !== -1) {
      ids.push(DYNAMIC_EVERYWHERE_ID);
    }
    origins.forEach((orig) => {
      if (orig !== '<all_urls>') {
        ids.push(originToScriptId(orig));
      }
    });
    if (ids.length && chrome.scripting && chrome.scripting.unregisterContentScripts) {
      chrome.scripting.unregisterContentScripts({ ids }, () => void chrome.runtime.lastError);
    }
  });
}

/* =====================================================================
   Lifecycle
   ===================================================================== */

chrome.runtime.onInstalled.addListener((details) => {
  // Runs the schema-v2 migration once, before any surface reads storage.
  self.OmniStore.init()
    .then(() => buildContextMenus())
    .then(() => reconcileDynamicScripts())
    // An update is a good moment for a restorable copy of the user's work.
    .then(() => self.OmniStore.takeSnapshot(details.reason === 'update' ? 'before-update' : 'daily'))
    .then(() => injectIntoOpenTabs())
    .then(() => {
      if (details.reason === 'install') {
        chrome.tabs.create({ url: chrome.runtime.getURL('welcome/welcome.html') }, () => {
          void chrome.runtime.lastError;
        });
      }
    })
    .catch(() => {
      // Never leave the worker without its menu or its opt-in site scripts.
      buildContextMenus();
      reconcileDynamicScripts();
    });
});

// Menus live in the browser profile, not the worker, but rebuilding on startup
// costs nothing and repairs a profile whose registrations were lost.
chrome.runtime.onStartup.addListener(() => {
  self.OmniStore.init()
    .then(() => buildContextMenus())
    .then(() => reconcileDynamicScripts())
    .then(() => self.OmniStore.maybeDailySnapshot());
});

/* =====================================================================
   Keyboard command
   ===================================================================== */

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'toggle-command-palette') return;

  const tab = await getActiveTab();
  if (!tab || typeof tab.id !== 'number') return;

  let result = await sendToTab(tab.id, { action: 'open_palette' });

  // The tab may predate the install, or the worker may have woken before the
  // script loaded. Inject once, then retry.
  if (!result.ok && result.reason === 'no-content-script') {
    const injected = await injectInto(tab.id);
    if (injected) result = await sendToTab(tab.id, { action: 'open_palette' });
  }

  if (!result.ok) notifyUnavailable(tab.id);
});

/* =====================================================================
   Messages from the popup and options page
   ===================================================================== */

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request && request.action) {
    // The popup asks the worker to reach the page so it does not need its own
    // tab-permission handling or retry logic.
    case 'relay_to_active_tab':
      getActiveTab().then(async (tab) => {
        if (!tab || typeof tab.id !== 'number') {
          sendResponse({ ok: false, reason: 'no-tab' });
          return;
        }
        let result = await sendToTab(tab.id, request.payload || {});
        if (!result.ok && result.reason === 'no-content-script') {
          const injected = await injectInto(tab.id);
          if (injected) result = await sendToTab(tab.id, request.payload || {});
        }
        sendResponse(result);
      });
      return true;

    // A content script stored a draft and wants the editor opened on it.
    case 'open_editor_with_draft':
      openEditorWithDraft();
      sendResponse({ ok: true });
      return false;

    case 'broadcast_settings':
      chrome.tabs.query({ url: ['http://*/*', 'https://*/*'] }, (tabs) => {
        void chrome.runtime.lastError;
        (tabs || []).forEach((tab) => {
          if (typeof tab.id === 'number') sendToTab(tab.id, { action: 'settings_changed' });
        });
        sendResponse({ ok: true });
      });
      return true;

    case 'inject_into_tab':
      if (typeof request.tabId === 'number') {
        injectInto(request.tabId).then((ok) => sendResponse({ ok }));
        return true;
      }
      getActiveTab().then((tab) => {
        if (tab && typeof tab.id === 'number') {
          injectInto(tab.id).then((ok) => sendResponse({ ok }));
        } else {
          sendResponse({ ok: false });
        }
      });
      return true;

    case 'start_compare':
      startCompare(request, sender).then(sendResponse);
      return true;

    // A compare tab asks for its text. The job stays until that tab reports
    // back (compare_status), so a reload inside the TTL can try again.
    case 'get_pending_compare':
      (async () => {
        const tabId = sender.tab && sender.tab.id;
        if (typeof tabId !== 'number') {
          sendResponse({ ok: false });
          return;
        }
        const key = COMPARE_JOB_PREFIX + tabId;
        const job = await sessionGet(key);
        if (!job) {
          sendResponse({ ok: false });
          return;
        }
        if (Date.now() - (job.createdAt || 0) > COMPARE_TTL_MS) {
          await sessionRemove(key);
          await recordCompareResult(job, false, 'the page took too long to open');
          sendResponse({ ok: false, expired: true });
          return;
        }
        sendResponse({ ok: true, job });
      })();
      return true;

    case 'compare_status':
      (async () => {
        const tabId = sender.tab && sender.tab.id;
        if (typeof tabId === 'number') {
          const job = await sessionGet(COMPARE_JOB_PREFIX + tabId);
          await sessionRemove(COMPARE_JOB_PREFIX + tabId);
          if (job) await recordCompareResult(job, !!request.success, String(request.message || ''));
        }
        sendResponse({ ok: true });
      })();
      return true;

    default:
      return false;
  }
});

/* =====================================================================
   Compare across AIs (Pro)
   ===================================================================== */

const COMPARE_MIN_W = 520;
const COMPARE_MIN_H = 420;

/**
 * Lay N windows out on the screen the run started from. Columns never get
 * narrower than Chrome's usable minimum; with too many for one row they wrap.
 */
function tileRects(n, area) {
  const maxCols = Math.max(1, Math.floor(area.width / COMPARE_MIN_W));
  const cols = Math.max(1, Math.min(n, n <= 3 ? n : Math.ceil(n / 2), maxCols));
  const rows = Math.ceil(n / cols);
  const w = Math.max(COMPARE_MIN_W, Math.floor(area.width / cols));
  const h = Math.max(COMPARE_MIN_H, Math.floor(area.height / rows));
  const out = [];
  for (let i = 0; i < n; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    out.push({
      left: Math.round(area.left + Math.min(col * w, Math.max(0, area.width - w))),
      top: Math.round(area.top + Math.min(row * h, Math.max(0, area.height - h))),
      width: w,
      height: h
    });
  }
  return out;
}

function createWindow(opts) {
  return new Promise((resolve) => {
    chrome.windows.create(opts, (w) => {
      if (chrome.runtime.lastError) {
        // Some window managers reject a position; open it unplaced instead.
        chrome.windows.create({ url: opts.url, focused: opts.focused }, (w2) => {
          void chrome.runtime.lastError;
          resolve(w2 || null);
        });
        return;
      }
      resolve(w || null);
    });
  });
}

function createTab(opts) {
  return new Promise((resolve) => {
    chrome.tabs.create(opts, (t) => {
      void chrome.runtime.lastError;
      resolve(t || null);
    });
  });
}

async function startCompare(request, sender) {
  await self.OmniStore.init();
  if (!self.OmniStore.isPro()) return { ok: false, error: 'PRO_REQUIRED' };

  const text = String(request.text || '');
  if (!text.trim()) return { ok: false, error: 'There is no text to send.' };

  const all = self.OmniStore.getCompareTargets ? self.OmniStore.getCompareTargets() : [];
  const wanted = Array.isArray(request.targets) ? request.targets : [];
  const chosen = [];
  wanted.forEach((id) => {
    const t = all.find((x) => x.id === id);
    if (t && chosen.indexOf(t) === -1 && chosen.length < 6) chosen.push(t);
  });
  if (!chosen.length) return { ok: false, error: 'Choose at least one AI.' };

  if (self.OmniStore.setLastCompareTargets) {
    await self.OmniStore.setLastCompareTargets(chosen.map((t) => t.id));
  }

  const autoSend = !!request.autoSend;
  // New tabs unless the page asked for tiled windows.
  const layout = request.layout === 'tiled' ? 'tiled' : 'tabs';
  const runId = 'run-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const originTabId = sender && sender.tab && typeof sender.tab.id === 'number' ? sender.tab.id : null;
  const area = {
    left: Number(request.screenLeft) || 0,
    top: Number(request.screenTop) || 0,
    width: Math.max(COMPARE_MIN_W, Number(request.screenWidth) || 1440),
    height: Math.max(COMPARE_MIN_H, Number(request.screenHeight) || 900)
  };

  const opened = [];
  const rects = layout === 'tiled' ? tileRects(chosen.length, area) : [];
  for (let i = 0; i < chosen.length; i++) {
    const target = chosen[i];
    let tabId = null;
    if (layout === 'tiled') {
      const win = await createWindow(Object.assign({ url: target.url, focused: i === 0, type: 'normal' }, rects[i]));
      if (win && win.tabs && win.tabs[0]) tabId = win.tabs[0].id;
    } else {
      const tab = await createTab({ url: target.url, active: i === 0 });
      if (tab && typeof tab.id === 'number') tabId = tab.id;
    }
    if (typeof tabId !== 'number') continue;
    opened.push({ id: target.id, label: target.label });
    await sessionSet(COMPARE_JOB_PREFIX + tabId, {
      tabId,
      runId,
      targetId: target.id,
      targetLabel: target.label,
      text,
      autoSend,
      createdAt: Date.now()
    });
  }

  if (!opened.length) return { ok: false, error: 'The browser did not open any windows.' };

  await sessionSet(COMPARE_RUN_PREFIX + runId, {
    runId,
    originTabId,
    total: opened.length,
    labels: opened.reduce((m, t) => ((m[t.id] = t.label), m), {}),
    results: {},
    createdAt: Date.now()
  });
  return { ok: true, count: opened.length, runId };
}

/**
 * Note one tab's outcome. When every tab has reported, tell the page that
 * started the run (a content script or an extension page) how it went.
 */
let compareQueue = Promise.resolve();
function recordCompareResult(job, success, message) {
  compareQueue = compareQueue.then(async () => {
    if (!job || !job.runId) return;
    const key = COMPARE_RUN_PREFIX + job.runId;
    const run = await sessionGet(key);
    if (!run) return;
    run.results[job.targetId] = { success, message };
    if (Object.keys(run.results).length < run.total) {
      await sessionSet(key, run);
      return;
    }
    await sessionRemove(key);
    const failed = Object.keys(run.results)
      .filter((id) => !run.results[id].success)
      .map((id) => ({ label: run.labels[id] || id, message: run.results[id].message }));
    const summary = { action: 'compare_summary', runId: run.runId, total: run.total, failed };
    if (typeof run.originTabId === 'number') sendToTab(run.originTabId, summary);
    try {
      chrome.runtime.sendMessage(summary, () => void chrome.runtime.lastError);
    } catch (e) {
      /* no extension page is listening */
    }
  });
  return compareQueue.catch(() => {});
}

/* =====================================================================
   Session storage helpers for Compare jobs
   ===================================================================== */

const COMPARE_JOB_PREFIX = 'omni.compare.';
const COMPARE_RUN_PREFIX = 'omni.compareRun.';
const COMPARE_TTL_MS = 2 * 60 * 1000;

function sessionSet(key, val) {
  return new Promise((resolve) => {
    if (!chrome.storage || !chrome.storage.session) return resolve(false);
    chrome.storage.session.set({ [key]: val }, () => {
      void chrome.runtime.lastError;
      resolve(true);
    });
  });
}

function sessionGet(key) {
  return new Promise((resolve) => {
    if (!chrome.storage || !chrome.storage.session) return resolve(null);
    chrome.storage.session.get([key], (res) => {
      void chrome.runtime.lastError;
      resolve(res ? res[key] : null);
    });
  });
}

function sessionRemove(key) {
  return new Promise((resolve) => {
    if (!chrome.storage || !chrome.storage.session) return resolve(false);
    chrome.storage.session.remove([key], () => {
      void chrome.runtime.lastError;
      resolve(true);
    });
  });
}

chrome.tabs.onRemoved.addListener((tabId) => {
  const key = COMPARE_JOB_PREFIX + tabId;
  sessionGet(key).then((job) => {
    if (!job) return;
    sessionRemove(key);
    recordCompareResult(job, false, 'the tab was closed');
  });
});

// The worker's copy of the store does not watch storage, so reload it first:
// otherwise a worker that just woke up (or one holding old data) would build
// the menu from stale modifiers and licence state.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && (changes['omni.customModifiers'] || changes['omni.license'])) {
    self.OmniStore.init({ force: true })
      .then(() => buildContextMenus())
      .catch(() => buildContextMenus());
  }
});
