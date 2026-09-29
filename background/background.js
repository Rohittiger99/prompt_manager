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

importScripts(
  '../data/defaultPrompts.js',
  '../lib/template.js',
  '../lib/modifiers.js',
  '../lib/importers.js',
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
function buildContextMenus() {
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

      self.OmniModifiers.contextMenuItems().forEach((item) => {
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
    const res = await sendToTab(tab.id, { action: 'save_as_prompt' });
    if (res.ok) return;
  }
  const text = info.selectionText || '';
  if (!text.trim()) return;
  await self.OmniStore.setPendingDraft({ template: text, source: (tab && tab.title) || '' });
  openEditorWithDraft();
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === OPEN_LIBRARY_ID) {
    chrome.runtime.openOptionsPage(() => void chrome.runtime.lastError);
    return;
  }

  if (info.menuItemId === SAVE_SELECTION_ID) {
    saveSelectionAsPrompt(info, tab);
    return;
  }

  if (!tab || typeof tab.id !== 'number') return;
  if (typeof info.menuItemId !== 'string' || info.menuItemId.indexOf('mod-') !== 0) return;

  sendToTab(tab.id, {
    action: 'apply_modifier',
    modifierId: info.menuItemId,
    text: info.selectionText || ''
  }).then((res) => {
    if (!res.ok) notifyUnavailable(tab.id);
  });
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
  'lib/importers.js',
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

/* =====================================================================
   Lifecycle
   ===================================================================== */

chrome.runtime.onInstalled.addListener((details) => {
  // Runs the schema-v2 migration once, before any surface reads storage.
  self.OmniStore.init()
    .then(() => buildContextMenus())
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
      // Never leave the worker in a state where the menu is missing.
      buildContextMenus();
    });
});

// Menus live in the browser profile, not the worker, but rebuilding on startup
// costs nothing and repairs a profile whose registrations were lost.
chrome.runtime.onStartup.addListener(() => {
  self.OmniStore.init()
    .then(() => buildContextMenus())
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

    case 'rebuild_menus':
      buildContextMenus().then(() => sendResponse({ ok: true }));
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

    default:
      return false;
  }
});
