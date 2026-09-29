/**
 * OmniPrompt - Shared theme resolver
 *
 * One source of truth for the three theme choices: 'light', 'dark' and
 * 'system'. 'system' is resolved here into a concrete value, so every
 * stylesheet only ever needs to describe two skins instead of repeating a
 * prefers-color-scheme block for each token.
 *
 * The resolved value is written as an attribute, which works the same on an
 * extension page (documentElement) and inside the injected shadow root (the
 * host element). Nothing here touches storage on its own, so the content
 * script and the extension pages keep their existing single read path.
 */

(function () {
  'use strict';

  var CHOICES = ['light', 'dark', 'system'];
  var DEFAULT_CHOICE = 'system';
  var PAGE_ATTRIBUTE = 'data-theme';
  var HOST_ATTRIBUTE = 'data-omni-theme';

  var listeners = [];
  var query = null;

  /** The media query is only available in a window, not the service worker. */
  function systemQuery() {
    if (query) return query;
    if (typeof window === 'undefined' || !window.matchMedia) return null;
    query = window.matchMedia('(prefers-color-scheme: dark)');
    return query;
  }

  function normalize(choice) {
    return CHOICES.indexOf(choice) === -1 ? DEFAULT_CHOICE : choice;
  }

  /** Turn a stored choice into the concrete skin a stylesheet can act on. */
  function resolve(choice) {
    var wanted = normalize(choice);
    if (wanted !== 'system') return wanted;
    var mq = systemQuery();
    return mq && mq.matches ? 'dark' : 'light';
  }

  /**
   * Apply a choice to a target.
   *
   * @param {Element|Document|null} target element, document, or null for the
   *   current document
   * @param {string} choice 'light', 'dark' or 'system'
   * @returns {string} the resolved skin that was applied
   */
  function apply(target, choice) {
    var resolved = resolve(choice);
    var node = target || (typeof document !== 'undefined' ? document.documentElement : null);
    if (!node) return resolved;

    // A Document was passed rather than an element.
    if (node.nodeType === 9) node = node.documentElement;
    if (!node || !node.setAttribute) return resolved;

    var attribute = node === document.documentElement ? PAGE_ATTRIBUTE : HOST_ATTRIBUTE;
    node.setAttribute(attribute, resolved);
    node.setAttribute('data-theme-choice', normalize(choice));
    return resolved;
  }

  /**
   * Re-apply automatically when the operating system flips between light and
   * dark. Only matters while the choice is 'system', so the callback checks
   * the current choice each time rather than being torn down and rebuilt.
   *
   * @param {function(): string} getChoice reads the user's current choice
   * @param {function(string): void} onChange receives the resolved skin
   */
  function watchSystem(getChoice, onChange) {
    var mq = systemQuery();
    if (!mq) return function () {};

    var handler = function () {
      if (normalize(getChoice()) !== 'system') return;
      onChange(resolve('system'));
    };

    if (mq.addEventListener) mq.addEventListener('change', handler);
    else if (mq.addListener) mq.addListener(handler);

    listeners.push(handler);
    return function () {
      if (mq.removeEventListener) mq.removeEventListener('change', handler);
      else if (mq.removeListener) mq.removeListener(handler);
    };
  }

  /** Human wording for the current choice, used in the popup and options page. */
  function label(choice) {
    var wanted = normalize(choice);
    if (wanted === 'light') return 'Light';
    if (wanted === 'dark') return 'Dark';
    return 'System';
  }

  var api = {
    CHOICES: CHOICES,
    DEFAULT: DEFAULT_CHOICE,
    normalize: normalize,
    resolve: resolve,
    apply: apply,
    watchSystem: watchSystem,
    label: label
  };

  if (typeof window !== 'undefined') window.OmniTheme = api;
  if (typeof self !== 'undefined') self.OmniTheme = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
