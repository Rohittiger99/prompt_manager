/**
 * OmniPrompt - Offline sandbox page script
 *
 * Provides the mock composers and the event log. It deliberately does not load
 * any of the extension's own scripts: the point is to exercise the code that
 * actually ships, injected the same way it is on a real site.
 *
 * Content scripts run in an isolated world, so this page script can never see
 * their globals (OmniStore, CommandPalette and so on). It detects the
 * extension by the one thing the content script adds to the shared DOM: the
 * shadow host `#omniprompt-root`. Everything else is driven with the real keys
 * and the right-click menu, as a user would.
 *
 * Kept in a separate file rather than inline so the page works unchanged if it
 * is ever served from a context with a strict CSP.
 */

(function () {
  'use strict';

  const logBox = document.getElementById('sim-log');
  const banner = document.getElementById('status-banner');

  function log(message, kind) {
    const line = document.createElement('div');
    if (kind) line.className = kind;
    line.textContent = '[' + new Date().toLocaleTimeString() + '] ' + message;
    logBox.appendChild(line);
    logBox.scrollTop = logBox.scrollHeight;
  }

  /* =====================================================================
     Is the extension actually here?
     ===================================================================== */

  function extensionPresent() {
    return !!document.getElementById('omniprompt-root');
  }

  /**
   * Content scripts only run on pages the extension is allowed to touch. Over
   * file:// that needs "Allow access to file URLs" to be switched on, which is
   * the most common reason this page looks dead.
   */
  function reportStatus() {
    if (extensionPresent()) {
      banner.className = 'status-banner ok';
      banner.innerHTML =
        '<strong>OmniPrompt is active.</strong> Type <code>//</code> in a box below, or press ' +
        '<code>Alt+K</code> (<code>\u2325K</code> on a Mac). Settings and prompt counts are in the popup.';
      log('Extension detected.', 'good');
      return;
    }

    banner.className = 'status-banner bad';
    const isFile = window.location.protocol === 'file:';
    banner.innerHTML =
      '<strong>OmniPrompt was not detected on this page.</strong><br>' +
      (isFile
        ? 'You opened this file directly. Go to <code>chrome://extensions</code>, open OmniPrompt\u2019s ' +
          'details, and turn on <strong>Allow access to file URLs</strong>. Then reload this page.'
        : 'Load the extension unpacked at <code>chrome://extensions</code>, then reload this page.') +
      '<br>Either way, reloading the page after enabling it is what makes the content script run.';
    log('Extension not detected. See the banner above.', 'warn');
  }

  /* =====================================================================
     Mock send buttons
     ===================================================================== */

  const sendTargets = [
    ['mock-send-btn-1', 'mock-textarea', 'textarea'],
    ['mock-send-btn-2', 'mock-contenteditable', 'contenteditable'],
    ['mock-send-btn-3', 'mock-input', 'input'],
    ['mock-send-btn-4', 'mock-textarea-bottom', 'textarea (bottom)']
  ];

  sendTargets.forEach(([buttonId, fieldId, label]) => {
    const button = document.getElementById(buttonId);
    const field = document.getElementById(fieldId);
    if (!button || !field) return;

    button.addEventListener('click', () => {
      const value = field.isContentEditable ? field.innerText : field.value;
      const trimmed = value.replace(/\s+/g, ' ').trim();
      log(
        'SENT from ' + label + ' (' + value.length + ' chars): ' + trimmed.slice(0, 100) + (trimmed.length > 100 ? '…' : '')
      );
    });
  });

  document.getElementById('btn-clear-logs').addEventListener('click', () => {
    logBox.innerHTML = '';
    log('Log cleared.');
  });

  /* =====================================================================
     Boot
     ===================================================================== */

  // The content script runs at document_idle, so give it a moment before
  // declaring it missing.
  log('Sandbox ready. Waiting for the content script…');
  let attempts = 0;
  const poll = window.setInterval(() => {
    attempts += 1;
    if (extensionPresent() || attempts > 12) {
      window.clearInterval(poll);
      reportStatus();
    }
  }, 250);
})();
