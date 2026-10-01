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
 * - The clipboard is only read when the user presses Paste in a form.
 * - Honours a per-site disable so the extension can be silenced on a site
 *   without uninstalling it.
 * - Runs Pro stepped chains one step at a time. The user asks for the next
 *   step; the page is never watched for the AI's reply.
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
   * All UI lives in an open shadow root attached to documentElement, so
   * page CSS cannot reach in.
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
        compareMode: !!opts.compareMode,
        // A prompt whose fields all resolved themselves goes straight in.
        skipWhenComplete: false,
        // Lets the user return to wherever they picked this prompt from
        // (the palette or the slash menu) instead of losing that state.
        onBack: opts.onBack
      }
    );
  }

  /* =====================================================================
     Stepped chains (Pro)
     ===================================================================== */

  /**
   * The chain running in this tab, in memory only: { chainId, next, values }.
   *
   * OmniPrompt never reads the AI's reply to decide when a step is done. The
   * user moves on by picking "Next step" from the slash menu or the palette,
   * so nothing on the page is watched and nothing is sent on its own.
   */
  let activeChain = null;

  /** What the menus show as the next step, or null when no chain is running. */
  function getActiveChain() {
    if (!activeChain || !window.OmniStore || !window.OmniStore.getChainStep) return null;
    const step = window.OmniStore.getChainStep(activeChain.chainId, activeChain.next);
    if (!step) {
      activeChain = null;
      return null;
    }
    return {
      chainId: step.chainId,
      title: step.chainTitle,
      next: step.index,
      total: step.total,
      stepTitle: step.stepTitle
    };
  }

  function openMenusLabel() {
    const ways = [];
    if (settings.slashEnabled && settings.slashTriggerChar) ways.push(settings.slashTriggerChar);
    if (settings.enablePalette && settings.paletteHotkey) ways.push(window.OmniStore.formatHotkey(settings.paletteHotkey, window.OmniStore.isMacPlatform()));
    return ways.length ? ways.join(' or ') : 'the OmniPrompt menu';
  }

  function startChain(chainId, options) {
    const store = window.OmniStore;
    if (!store || !store.isPro()) {
      activeChain = null;
      updateChainRunner();
      showToast('Stepped chains are part of OmniPrompt Pro. Your chain is safe in OmniPrompt settings.', 'info');
      return;
    }
    activeChain = null;
    updateChainRunner();
    runChainStep(chainId, 0, {}, options);
  }

  function continueChain(options) {
    if (!activeChain) return;
    if (!window.OmniStore.isPro()) {
      activeChain = null;
      updateChainRunner();
      showToast('Stepped chains are part of OmniPrompt Pro.', 'info');
      return;
    }
    runChainStep(activeChain.chainId, activeChain.next, activeChain.values, options);
  }

  /** Stop the chain. From the slash menu, the typed //token goes too. */
  function endChain(options) {
    const opts = options || {};
    const had = !!activeChain;
    activeChain = null;
    updateChainRunner();
    if (opts.replaceLength && window.ChatbotAdapters) {
      window.ChatbotAdapters.replaceRange(opts.replaceLength, '', { target: opts.target, caret: opts.caret });
    }
    if (had) showToast('Chain ended.', 'ok');
  }

  function runChainStep(chainId, index, carried, options) {
    const opts = options || {};
    const store = window.OmniStore;
    const step = store.getChainStep(chainId, index);
    if (!step) {
      activeChain = null;
      updateChainRunner();
      showToast('That chain no longer exists.', 'warn');
      return;
    }

    const context = capturePageContext();
    if (!context.selection && opts.selection) context.selection = opts.selection;
    const prepared = store.prepareForUse(step.prompt);
    const ready = prepared.prompt || step.prompt;

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
          // Values typed in one step carry into the next, so a name asked for
          // in step 1 is not asked for again.
          const values = Object.assign({}, carried, (meta && meta.values) || {});
          if (!result.ok) {
            // The text went to the clipboard instead. Stay on this step so
            // "Next step" offers it again.
            activeChain = { chainId, next: index, values: carried };
            updateChainRunner();
            return;
          }
          if (index === 0) store.recordUse(chainId);
          explainLockedBlocks(prepared);
          if (step.isLast) {
            activeChain = null;
            updateChainRunner();
            showToast('Chain finished: all ' + step.total + ' steps inserted.', 'ok');
            return;
          }
          activeChain = { chainId, next: index + 1, values };
          updateChainRunner();
          showToast(
            'Step ' + (index + 1) + ' of ' + step.total + ' inserted. When you are ready, open ' +
              openMenusLabel() + ' for step ' + (index + 2) + '.',
            'ok'
          );
        });
      },
      {
        submit: opts.submit,
        allowClipboard: !!settings.clipboardAutofill,
        allowSubmit: true,
        skipWhenComplete: false,
        onBack: opts.onBack,
        seed: carried
      }
    );
  }

  /** Floating persistent in-page runner card while a stepped chain is running. */
  function updateChainRunner() {
    if (!shadowRoot) return;
    let runner = shadowRoot.getElementById('omni-chain-runner');
    if (!activeChain) {
      if (runner) runner.remove();
      return;
    }
    const store = window.OmniStore;
    if (!store || !store.getChainStep) {
      if (runner) runner.remove();
      return;
    }
    const step = store.getChainStep(activeChain.chainId, activeChain.next);
    if (!step) {
      if (runner) runner.remove();
      return;
    }

    if (!runner) {
      runner = document.createElement('div');
      runner.id = 'omni-chain-runner';
      runner.className = 'omni-chain-runner';
      runner.setAttribute('role', 'region');
      runner.setAttribute('aria-label', 'Stepped chain in progress');
      shadowRoot.appendChild(runner);
    }

    runner.textContent = '';

    const head = document.createElement('div');
    head.className = 'omni-chain-runner-head';

    const badge = document.createElement('span');
    badge.className = 'omni-runner-badge';
    badge.textContent = '⛓️ Chain';
    head.appendChild(badge);

    const title = document.createElement('strong');
    title.className = 'omni-runner-title';
    title.textContent = step.chainTitle;
    head.appendChild(title);

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'omni-runner-close';
    closeBtn.title = 'Stop chain';
    closeBtn.setAttribute('aria-label', 'Stop chain');
    closeBtn.textContent = '✕';
    closeBtn.addEventListener('click', () => endChain());
    head.appendChild(closeBtn);

    runner.appendChild(head);

    const stepRow = document.createElement('div');
    stepRow.className = 'omni-runner-step-row';

    const stepNum = document.createElement('span');
    stepNum.className = 'omni-runner-step-num';
    stepNum.textContent = 'Step ' + (step.index + 1) + ' of ' + step.total;
    stepRow.appendChild(stepNum);

    if (step.stepTitle) {
      const stepName = document.createElement('span');
      stepName.className = 'omni-runner-step-name';
      stepName.textContent = step.stepTitle;
      stepRow.appendChild(stepName);
    }

    runner.appendChild(stepRow);

    const progress = document.createElement('div');
    progress.className = 'omni-runner-progress';
    for (let i = 0; i < step.total; i++) {
      const dot = document.createElement('span');
      dot.className = 'omni-runner-dot' + (i < step.index ? ' done' : i === step.index ? ' active' : '');
      progress.appendChild(dot);
    }
    runner.appendChild(progress);

    const hint = document.createElement('div');
    hint.className = 'omni-runner-hint';
    const comp = window.ChatbotAdapters && window.ChatbotAdapters.findActiveComposer ? window.ChatbotAdapters.findActiveComposer() : null;
    if (comp) {
      hint.textContent = 'Ready to insert into active composer.';
    } else {
      hint.textContent = 'Click inside a text box, then press Next step.';
      hint.classList.add('is-warn');
    }
    runner.appendChild(hint);

    const actions = document.createElement('div');
    actions.className = 'omni-runner-actions';

    const stopBtn = document.createElement('button');
    stopBtn.type = 'button';
    stopBtn.className = 'omni-btn omni-btn-ghost omni-btn-sm';
    stopBtn.textContent = 'Stop';
    stopBtn.addEventListener('click', () => endChain());
    actions.appendChild(stopBtn);

    const nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className = 'omni-btn omni-btn-primary omni-btn-sm';
    nextBtn.textContent = 'Next step →';
    nextBtn.addEventListener('click', () => {
      const currentComp = window.ChatbotAdapters && window.ChatbotAdapters.findActiveComposer ? window.ChatbotAdapters.findActiveComposer() : null;
      continueChain({ target: currentComp ? currentComp.element : null });
    });
    actions.appendChild(nextBtn);

    runner.appendChild(actions);
  }

  /** Chain rows and workspace switches chosen in the slash menu or palette. */
  function handleChainAction(kind, id, ctx) {
    const c = ctx || {};
    if (kind === 'chain') startChain(id, c);
    else if (kind === 'next') continueChain(c);
    else if (kind === 'end') endChain(c);
    else if (kind === 'workspace') switchWorkspace(id);
  }

  function switchWorkspace(id) {
    const store = window.OmniStore;
    if (!store || !store.setActiveWorkspace) return;
    store
      .setActiveWorkspace(id || '')
      .then(() => {
        const ws = id ? store.getWorkspace(id) : null;
        showToast(ws ? 'Workspace: ' + ws.name + '.' : 'No workspace. Fields fill as usual.', 'ok');
      })
      .catch((err) => {
        showToast((err && err.message) || 'Could not switch workspace.', 'info');
      });
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

      case 'open_compare': {
        if (disabledHere) {
          sendResponse({ ok: false, reason: 'site-disabled' });
          return false;
        }
        const prompt = request.prompt || (window.OmniStore && window.OmniStore.getById(request.promptId));
        if (!prompt) {
          sendResponse({ ok: false, reason: 'unknown-prompt' });
          return false;
        }
        runPrompt(prompt, { compareMode: true });
        sendResponse({ ok: true });
        return false;
      }

      // The popup's "Run chain" button. Starts step 1 here, where the page is.
      case 'start_chain':
        if (disabledHere) {
          sendResponse({ ok: false, reason: 'site-disabled' });
          return false;
        }
        startChain(request.chainId, {});
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
        maxResults: settings.maxSlashResults,
        getActiveChain,
        onChainAction: handleChainAction
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
        },
        getActiveChain,
        onChainAction: handleChainAction
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

    // Now pick up the user's stored prompts and settings.
    await window.OmniStore.init();
    window.OmniStore.watchStorage();
    window.OmniStore.onChange(() => applySettings());
    applySettings();
    checkPendingCompare();
  }

  async function checkPendingCompare() {
    if (!chrome.runtime || !chrome.runtime.sendMessage) return;
    try {
      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({ action: 'get_pending_compare' }, (res) => {
          void chrome.runtime.lastError;
          resolve(res || null);
        });
      });
      if (!response || !response.ok || !response.job) return;
      const job = response.job;
      const startTime = Date.now();
      const timeoutMs = 12000;
      const checkInterval = 250;

      async function attemptInsert() {
        const target =
          window.ChatbotAdapters && window.ChatbotAdapters.getInputElement
            ? window.ChatbotAdapters.getInputElement()
            : null;

        if (!target) {
          if (Date.now() - startTime < timeoutMs) {
            setTimeout(attemptInsert, checkInterval);
            return;
          }
          showToast('OmniPrompt: Composer not found. Check if sign-in is required.', 'warn');
          chrome.runtime.sendMessage({
            action: 'compare_status',
            success: false,
            targetId: job.targetId,
            message: 'Composer not found or sign-in required'
          });
          return;
        }

        const inserted = await window.ChatbotAdapters.insert(job.text, { mode: 'replace' });
        const landed = window.ChatbotAdapters.landingCheck ? window.ChatbotAdapters.landingCheck() : true;

        if (inserted && landed) {
          if (job.autoSend && window.ChatbotAdapters.submit) {
            setTimeout(() => {
              window.ChatbotAdapters.submit();
            }, 300);
          } else {
            showToast('OmniPrompt: Prompt inserted for comparison.', 'ok');
          }
          chrome.runtime.sendMessage({
            action: 'compare_status',
            success: true,
            targetId: job.targetId,
            message: 'Inserted successfully'
          });
        } else {
          showToast('OmniPrompt: Insertion failed. Your prompt was kept ready.', 'warn');
          chrome.runtime.sendMessage({
            action: 'compare_status',
            success: false,
            targetId: job.targetId,
            message: 'Landing check failed'
          });
        }
      }

      attemptInsert();
    } catch (e) {
      // Ignored
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
