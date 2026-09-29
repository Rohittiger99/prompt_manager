/**
 * OmniPrompt - Content script coordinator
 *
 * Creates the shadow-DOM host, boots the store and the four in-page modules,
 * and owns the one path that turns "user picked a prompt" into "text is in the
 * composer".
 *
 * Notable behaviour
 * -----------------
 * - Insertion preserves the draft. Prompts chosen from the slash menu replace
 *   only the typed `//token`; everything else inserts at the caret. The old
 *   coordinator called an insert that overwrote the whole field.
 * - Page context (selection, URL, title) is captured before any overlay opens,
 *   because opening one collapses the selection.
 * - The clipboard is never read unless the user has turned that on.
 * - Honours a per-site disable so the extension can be silenced on a site
 *   without uninstalling it.
 */

(function () {
  'use strict';

  if (window.__OMNIPROMPT_LOADED__) return;
  window.__OMNIPROMPT_LOADED__ = true;

  const HOST_ID = 'omniprompt-root';

  let shadowRoot = null;
  let hostElement = null;
  let settings = null;
  let disabledHere = false;

  /* =====================================================================
     Shadow host
     ===================================================================== */

  /**
   * All UI lives in a closed-off shadow root attached to documentElement, so
   * page CSS cannot reach in and our CSS cannot leak out.
   */
  function createHost() {
    let host = document.getElementById(HOST_ID);
    if (host && host.shadowRoot) {
      hostElement = host;
      return host.shadowRoot;
    }

    if (!host) {
      host = document.createElement('div');
      host.id = HOST_ID;
      // The host must not affect page layout.
      host.style.setProperty('all', 'initial', 'important');
      host.style.setProperty('position', 'fixed', 'important');
      host.style.setProperty('z-index', '2147483647', 'important');
      host.style.setProperty('top', '0', 'important');
      host.style.setProperty('left', '0', 'important');
      host.style.setProperty('width', '0', 'important');
      host.style.setProperty('height', '0', 'important');
      (document.body || document.documentElement).appendChild(host);
    }

    hostElement = host;
    const root = host.attachShadow({ mode: 'open' });

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = chrome.runtime.getURL('content/content.css');
    root.appendChild(link);

    return root;
  }

  /* =====================================================================
     Page context
     ===================================================================== */

  /**
   * Snapshot what a template might want to auto-fill. Captured up front
   * because focusing an overlay clears the page selection.
   */
  function capturePageContext() {
    let selection = '';
    try {
      const sel = window.getSelection();
      if (sel) selection = String(sel.toString() || '').trim();
    } catch (e) {
      selection = '';
    }

    // Text highlighted inside the composer counts too.
    if (!selection && window.ChatbotAdapters) {
      const el = window.ChatbotAdapters.getInputElement();
      if (el && !el.isContentEditable && typeof el.selectionStart === 'number') {
        const start = el.selectionStart;
        const end = el.selectionEnd;
        if (end > start) selection = (el.value || '').slice(start, end).trim();
      }
    }

    return {
      selection,
      url: window.location.href,
      title: document.title
    };
  }

  /* =====================================================================
     The single insertion path
     ===================================================================== */

  /**
   * Wait for the editor to show the text. Plain text areas update at once;
   * some rich editors (Lexical, for one) commit a moment later, so a miss is
   * checked again after a short pause before it counts as a failure.
   */
  function confirmLanded(result) {
    return new Promise((resolve) => {
      if (!result || !result.ok) return resolve(false);
      if (typeof result.check !== 'function') return resolve(true);
      let landed = false;
      try {
        landed = result.check();
      } catch (e) {
        landed = true;
      }
      if (landed) return resolve(true);
      window.setTimeout(() => {
        try {
          resolve(result.check());
        } catch (e) {
          resolve(true);
        }
      }, 180);
    });
  }

  function pasteKeyLabel() {
    const platform = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || '';
    return /mac/i.test(platform) ? '⌘V' : 'Ctrl+V';
  }

  /**
   * Put the text on the clipboard and say exactly why. The work is never
   * lost, even when the page has no usable text box.
   */
  function fallBackToClipboard(text, reason) {
    return copyText(text).then((copied) => {
      const where =
        reason === 'not-landed'
          ? "This text box didn't accept the text."
          : 'No text box found here.';
      showToast(
        copied
          ? where + ' It is on your clipboard: click the box and press ' + pasteKeyLabel() + '.'
          : where + ' The clipboard was blocked too, so nothing was copied.',
        'warn'
      );
      return copied;
    });
  }

  /**
   * Write finished text into the page, confirm it arrived, and only then send.
   *
   * @param {string} text
   * @param {object} options
   *   target        the element to write into
   *   caret         a snapshot from adapters.captureCaret, restored before
   *                 writing so a modal stealing focus cannot lose the position
   *   replaceLength when set, swap this many characters before the caret
   *                 (the slash menu's `//query`) instead of inserting
   *   submit        send the message afterwards, once the text is confirmed
   *   mode          override the user's default insert mode
   * @returns {Promise<{ok: boolean, reason?: string, submitted: boolean}>}
   */
  async function writeToPage(text, options) {
    const opts = options || {};
    const adapters = window.ChatbotAdapters;
    if (!adapters) return { ok: false, reason: 'no-adapters' };

    const submit = Boolean(opts.submit);

    // Sending waits until the text is confirmed, so a failed write never sends
    // a half-empty message.
    let result;
    if (opts.replaceLength) {
      result = adapters.replaceRange(opts.replaceLength, text, {
        target: opts.target,
        caret: opts.caret,
        submit: false
      });
    } else {
      result = adapters.insert(text, {
        target: opts.target,
        caret: opts.caret,
        mode: opts.mode || settings.insertMode,
        submit: false
      });
    }

    if (!result.ok) {
      await fallBackToClipboard(text, result.reason);
      return { ok: false, reason: result.reason, submitted: false };
    }

    const landed = await confirmLanded(result);
    if (!landed) {
      await fallBackToClipboard(text, 'not-landed');
      return { ok: false, reason: 'not-landed', submitted: false };
    }

    let submitted = false;
    if (submit) submitted = adapters.submit(result.target);
    return { ok: true, submitted };
  }

  /** Tell a free user, once per prompt run, why a {{@block}} stayed as written. */
  function explainLockedBlocks(prepared) {
    if (!prepared || !prepared.locked || !prepared.locked.length) return;
    showToast(
      'Context blocks ({{@' + prepared.locked[0] + '}}) are part of OmniPrompt Pro. They were left as written.',
      'info'
    );
  }

  /**
   * Run a prompt end to end: expand context blocks, collect variables if
   * needed, then write.
   */
  function runPrompt(prompt, options) {
    const opts = options || {};
    const context = capturePageContext();
    // The palette snapshots the selection before its search box takes focus.
    if (!context.selection && opts.selection) context.selection = opts.selection;

    const prepared =
      window.OmniStore && window.OmniStore.prepareForUse
        ? window.OmniStore.prepareForUse(prompt)
        : { prompt, locked: [] };
    const ready = prepared.prompt || prompt;

    window.VariableModal.processPrompt(
      ready,
      context,
      (renderedText, meta) => {
        writeToPage(renderedText, {
          target: opts.target,
          caret: opts.caret,
          replaceLength: opts.replaceLength,
          submit: meta && typeof meta.submit === 'boolean' ? meta.submit : Boolean(opts.submit),
          mode: opts.mode
        }).then((result) => {
          if (!result.ok) return;
          if (window.OmniStore) window.OmniStore.recordUse(prompt.id);
          explainLockedBlocks(prepared);
        });
      },
      {
        submit: opts.submit,
        allowClipboard: !!settings.clipboardAutofill,
        allowSubmit: true,
        // A prompt whose fields all resolved themselves goes straight in.
        skipWhenComplete: false,
        // Lets the user return to wherever they picked this prompt from
        // (the palette or the slash menu) instead of losing that state.
        onBack: opts.onBack
      }
    );
  }

  /**
   * Apply a quick modifier to the current draft or the page selection.
   */
  function runModifier(modifierId, options) {
    const opts = options || {};
    const modifiers = window.OmniModifiers;
    const adapters = window.ChatbotAdapters;
    if (!modifiers || !adapters) return;

    const modifier = modifiers.getById(modifierId);
    if (!modifier) return;

    const target =
      (opts.caret && opts.caret.el && adapters.isEditable(opts.caret.el) ? opts.caret.el : null) ||
      (opts.target && adapters.isEditable(opts.target) ? opts.target : adapters.getInputElement());

    // Priority: text the caller passed in, then the page selection, then
    // whatever is already in the composer.
    let source = typeof opts.text === 'string' ? opts.text.trim() : '';
    if (!source) source = capturePageContext().selection;
    if (!source && target) source = adapters.readValue(target).trim();

    if (!source) {
      showToast('Select some text, or type a draft first, then apply a modifier.', 'warn');
      return;
    }

    const transformed = modifier.transform(source);

    // Wrapping the user's own draft means replacing it; wrapping a page
    // selection means inserting alongside whatever is in the box.
    const draft = target ? adapters.readValue(target).trim() : '';
    const wrappedTheDraft = draft && draft === source;

    const result = adapters.insert(transformed, {
      target,
      caret: opts.caret,
      mode: wrappedTheDraft ? 'replace' : settings.insertMode,
      submit: false
    });

    const copyInstead = () =>
      copyText(transformed).then((copied) => {
        showToast(
          copied
            ? modifier.title + ' is on your clipboard. Click a text box and press ' + pasteKeyLabel() + '.'
            : 'Could not insert or copy on this page.',
          copied ? 'info' : 'warn'
        );
      });

    if (!result.ok) {
      copyInstead();
      return;
    }
    confirmLanded(result).then((landed) => {
      if (landed) showToast(modifier.icon + ' ' + modifier.title + ' applied.', 'ok');
      else copyInstead();
    });
  }

  /* =====================================================================
     Capture: save a selection or the current draft as a new prompt
     ===================================================================== */

  /**
   * Hand text to the full editor. The service worker opens the options page,
   * which reads the draft once and clears it.
   */
  function saveAsPrompt(opts) {
    const o = opts || {};
    const adapters = window.ChatbotAdapters;
    let text = typeof o.text === 'string' ? o.text : '';
    if (!text.trim()) text = o.selection || capturePageContext().selection;
    if (!text.trim() && adapters) {
      const target = (o.target && adapters.isEditable(o.target) ? o.target : null) || adapters.getInputElement();
      if (target) text = adapters.readValue(target);
    }
    if (!String(text || '').trim()) {
      showToast('Select some text, or type a draft in the chat box, then save it as a prompt.', 'warn');
      return Promise.resolve(false);
    }
    if (!window.OmniStore || !window.OmniStore.setPendingDraft) return Promise.resolve(false);

    return window.OmniStore.setPendingDraft({
      template: text,
      source: document.title || window.location.hostname
    }).then(() => {
      try {
        chrome.runtime.sendMessage({ action: 'open_editor_with_draft' }, () => void chrome.runtime.lastError);
      } catch (e) {
        showToast('Could not open the editor. Reload the page and try again.', 'warn');
        return false;
      }
      showToast('Opening the editor with your text…', 'ok');
      return true;
    });
  }

  /* =====================================================================
     Clipboard and toast
     ===================================================================== */

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
      area.setAttribute('readonly', 'readonly');
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

  function showToast(message, kind) {
    if (!shadowRoot) return;

    let toast = shadowRoot.querySelector('.omni-floating-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'omni-floating-toast omni-textured';
      toast.setAttribute('role', 'status');
      shadowRoot.appendChild(toast);
    }

    const icon = kind === 'warn' ? '⚠️' : kind === 'ok' ? '✓' : '⚡';
    toast.innerHTML =
      '<span class="toast-icon">' + icon + '</span><span></span>';
    toast.querySelector('span:last-child').textContent = message;

    toast.classList.remove('omni-toast-hiding');
    toast.style.display = 'flex';

    if (toastTimer) window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      toast.classList.add('omni-toast-hiding');
      window.setTimeout(() => {
        if (toast) toast.style.display = 'none';
      }, 250);
    }, 2800);
  }

  /* =====================================================================
     Wiring
     ===================================================================== */

  /**
   * Paint the injected overlays in the user's chosen skin. The attribute goes
   * on the host element rather than the page, so the shadow styles can react
   * without the page ever seeing it.
   */
  function applyTheme() {
    if (!hostElement || !window.OmniTheme) return;
    window.OmniTheme.apply(hostElement, settings ? settings.theme : 'system');
  }

  function applySettings() {
    settings = window.OmniStore.getSettings();
    disabledHere = window.OmniStore.isSiteDisabled(window.location.hostname);
    applyTheme();

    window.SlashTrigger.configure({
      triggerChar: settings.slashTriggerChar,
      enabled: settings.slashEnabled && !disabledHere,
      maxResults: settings.maxSlashResults
    });

    window.CommandPalette.configure({
      hotkey: settings.paletteHotkey,
      enabled: settings.enablePalette && !disabledHere
    });
  }

  function handleMessage(request, sender, sendResponse) {
    switch (request && request.action) {
      case 'ping':
        sendResponse({ ok: true, version: 2, site: window.ChatbotAdapters.siteLabel() });
        return false;

      case 'open_palette':
        if (disabledHere) {
          sendResponse({ ok: false, reason: 'site-disabled' });
          return false;
        }
        window.CommandPalette.toggle();
        sendResponse({ ok: true });
        return false;

      case 'insert_prompt': {
        // Text that the popup already rendered goes in as-is.
        if (typeof request.text === 'string') {
          writeToPage(request.text, {
            submit: request.submit,
            mode: request.mode
          }).then((result) => {
            if (result.ok && request.promptId && window.OmniStore) {
              window.OmniStore.recordUse(request.promptId);
            }
            // The page already fell back to the clipboard and said so; the
            // popup must not report "cannot reach this page" on top of that.
            sendResponse({ ok: result.ok, reason: result.reason, handled: true });
          });
          return true;
        }
        // Otherwise resolve it here so variables can use page context.
        const prompt = request.prompt || (window.OmniStore && window.OmniStore.getById(request.promptId));
        if (!prompt) {
          sendResponse({ ok: false, reason: 'unknown-prompt' });
          return false;
        }
        runPrompt(prompt, { submit: request.submit, mode: request.mode });
        sendResponse({ ok: true });
        return false;
      }

      case 'apply_modifier':
        runModifier(request.modifierId, { text: request.text });
        sendResponse({ ok: true });
        return false;

      case 'save_as_prompt':
        saveAsPrompt({ text: request.text }).then((saved) => sendResponse({ ok: !!saved }));
        return true;

      case 'settings_changed':
        window.OmniStore.reload().then(() => {
          applySettings();
          sendResponse({ ok: true });
        });
        return true;

      default:
        sendResponse({ ok: false, reason: 'unknown-action' });
        return false;
    }
  }

  /**
   * Start up.
   *
   * Everything up to and including the message listener is registered
   * synchronously, before any await. Reading storage takes a tick, and a command
   * sent during that tick would otherwise find no listener and be reported as
   * "no content script". The modules start on the built-in defaults and are
   * reconfigured once the user's real settings arrive.
   */
  async function boot() {
    // The adapters start watching focus immediately, so the composer is known
    // even if the user opens the palette before typing anything.
    window.ChatbotAdapters.trackFocus();

    shadowRoot = createHost();

    // Defaults are available before storage has been read.
    settings = window.OmniStore.getSettings();
    disabledHere = false;
    applyTheme();

    // Follow the operating system while the choice is 'system'.
    if (window.OmniTheme) {
      window.OmniTheme.watchSystem(
        () => (settings ? settings.theme : 'system'),
        () => applyTheme()
      );
    }

    window.VariableModal.init(shadowRoot);

    window.SlashTrigger.init(
      shadowRoot,
      (prompt, ctx) => {
        runPrompt(prompt, {
          target: ctx && ctx.target,
          caret: ctx && ctx.caret,
          replaceLength: ctx && ctx.replaceLength,
          onBack: ctx && ctx.onBack
        });
      },
      {
        triggerChar: settings.slashTriggerChar,
        enabled: settings.slashEnabled && !disabledHere,
        maxResults: settings.maxSlashResults
      }
    );

    window.CommandPalette.init(
      shadowRoot,
      {
        onSelectPrompt: (prompt, ctx) => {
          runPrompt(prompt, {
            target: ctx && ctx.target,
            caret: ctx && ctx.caret,
            selection: ctx && ctx.selection,
            submit: ctx && ctx.submit,
            onBack: ctx && ctx.onBack
          });
        },
        onRunModifier: (id, ctx) => {
          runModifier(id, { target: ctx && ctx.target, caret: ctx && ctx.caret, text: ctx && ctx.text });
        },
        onAction: (id, ctx) => {
          if (id === 'save-as-prompt') {
            saveAsPrompt({ target: ctx && ctx.target, selection: ctx && ctx.selection });
          }
        }
      },
      {
        hotkey: settings.paletteHotkey,
        enabled: settings.enablePalette && !disabledHere
      }
    );

    // Registered before the first await, so a keyboard command that arrives
    // while storage is still loading is still answered.
    if (chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener(handleMessage);
    }

    // A small surface for the offline sandbox page and for debugging.
    window.OmniPrompt = {
      version: 2,
      runPrompt,
      runModifier,
      openPalette: () => window.CommandPalette.open(),
      getContext: capturePageContext,
      isDisabledHere: () => disabledHere,
      isReady: () => window.OmniStore.isReady()
    };

    // Now pick up the user's stored prompts and settings.
    await window.OmniStore.init();
    window.OmniStore.watchStorage();
    window.OmniStore.onChange(() => applySettings());
    applySettings();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
