/**
 * OmniPrompt - Chatbot input adapters
 *
 * Finds the composer on a page and puts text into it without destroying what
 * the user has already typed.
 *
 * The bug this file was rewritten to fix
 * --------------------------------------
 * `insert(text)` used to default to replacing the entire input. Every caller
 * used that default, so typing three paragraphs and then pulling in a prompt
 * silently wiped the three paragraphs. The `shouldAppend` parameter existed but
 * nothing ever passed it. Insertion is now caret-based by default:
 *
 *   caret    insert at the cursor, keep everything around it (default)
 *   append   add to the end of the existing draft
 *   replace  swap the whole draft, only when explicitly asked
 *
 * Two other things live here because they need the same DOM knowledge:
 *   - `replaceRange`, used by the slash menu to swap just the `//query` token.
 *   - `submit`, the opt-in auto-send that the docs previously promised but the
 *     code never implemented.
 */

const ChatbotAdapters = (() => {
  'use strict';

  /* =====================================================================
     Focus tracking
     ===================================================================== */

  // The palette and modals live in a shadow root, so opening one moves focus
  // away from the composer. Remembering the last editable the user touched is
  // more reliable than guessing with querySelector after the fact.
  let lastFocused = null;

  function isEditable(el) {
    if (!el || el.nodeType !== 1) return false;
    if (el.disabled || el.readOnly) return false;
    const tag = el.tagName;
    if (tag === 'TEXTAREA') return true;
    if (tag === 'INPUT') {
      const type = (el.getAttribute('type') || 'text').toLowerCase();
      return ['text', 'search', 'url', 'email', 'tel', 'password', 'number'].indexOf(type) !== -1;
    }
    return !!el.isContentEditable;
  }

  function rememberFocus(el) {
    if (isEditable(el)) lastFocused = el;
  }

  function trackFocus() {
    document.addEventListener(
      'focusin',
      (e) => {
        rememberFocus(e.target);
      },
      true
    );
    // Clicking into an editable without a focus event still counts.
    document.addEventListener(
      'pointerdown',
      (e) => {
        rememberFocus(e.target);
      },
      true
    );
    rememberFocus(document.activeElement);
  }

  function getRememberedTarget() {
    if (lastFocused && lastFocused.isConnected && isEditable(lastFocused)) return lastFocused;
    lastFocused = null;
    return null;
  }

  /* =====================================================================
     Framework-safe value setting
     ===================================================================== */

  /**
   * Write to a React/Vue/Svelte controlled input.
   *
   * Frameworks patch the element's own `value` property to track state, so
   * assigning `el.value` directly can leave the framework's copy stale. Going
   * through the prototype setter and then dispatching a bubbling `input` event
   * is what the framework's own listeners expect to see.
   */
  function setNativeValue(element, value) {
    const descriptor = Object.getOwnPropertyDescriptor(element, 'value');
    const ownSetter = descriptor && descriptor.set;
    const prototype = Object.getPrototypeOf(element);
    const protoDescriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
    const protoSetter = protoDescriptor && protoDescriptor.set;

    if (protoSetter && ownSetter !== protoSetter) {
      protoSetter.call(element, value);
    } else if (ownSetter) {
      ownSetter.call(element, value);
    } else {
      element.value = value;
    }
  }

  function fireInput(element, data) {
    try {
      element.dispatchEvent(
        new InputEvent('input', {
          bubbles: true,
          cancelable: false,
          inputType: 'insertText',
          data: typeof data === 'string' ? data : null
        })
      );
    } catch (e) {
      element.dispatchEvent(new Event('input', { bubbles: true }));
    }
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }

  /* =====================================================================
     Text nodes and ranges inside contenteditable
     ===================================================================== */

  function collectTextNodes(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    const nodes = [];
    let node = walker.nextNode();
    while (node) {
      nodes.push(node);
      node = walker.nextNode();
    }
    return nodes;
  }

  function getSelectionInside(element) {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;
    const range = sel.getRangeAt(0);
    if (!element.contains(range.startContainer)) return null;
    return { sel, range };
  }

  /**
   * Build a Range covering the `count` characters immediately before the
   * caret, walking backwards across text-node boundaries.
   *
   * This replaces the old approach of calling execCommand('delete') in a loop,
   * which fired one deletion event per character and behaved unpredictably in
   * ProseMirror and Lexical.
   */
  function rangeBeforeCaret(element, count) {
    const found = getSelectionInside(element);
    if (!found || count <= 0) return null;

    const caretRange = found.range.cloneRange();
    caretRange.collapse(false);

    const nodes = collectTextNodes(element);
    if (!nodes.length) return null;

    let endNode = caretRange.endContainer;
    let endOffset = caretRange.endOffset;

    // A caret parked on an element boundary needs mapping onto a text node.
    if (endNode.nodeType !== 3) {
      const child = endNode.childNodes[Math.max(0, endOffset - 1)];
      const candidates = child ? collectTextNodes(child.nodeType === 3 ? child.parentNode : child) : nodes;
      const fallback = candidates.length ? candidates[candidates.length - 1] : nodes[nodes.length - 1];
      if (!fallback) return null;
      endNode = fallback;
      endOffset = fallback.nodeValue.length;
    }

    let index = nodes.indexOf(endNode);
    if (index === -1) return null;

    let remaining = count;
    let startNode = endNode;
    let startOffset = endOffset;

    while (remaining > 0) {
      if (startOffset >= remaining) {
        startOffset -= remaining;
        remaining = 0;
        break;
      }
      remaining -= startOffset;
      index -= 1;
      if (index < 0) return null; // asked to go back further than the content
      startNode = nodes[index];
      startOffset = startNode.nodeValue.length;
    }

    const range = document.createRange();
    try {
      range.setStart(startNode, startOffset);
      range.setEnd(endNode, endOffset);
    } catch (e) {
      return null;
    }
    return { range, sel: found.sel };
  }

  /** Plain text of a contenteditable, normalised the way the caret sees it. */
  function readContentEditable(element) {
    return element.innerText || element.textContent || '';
  }

  /**
   * Insert into a contenteditable using execCommand('insertText').
   *
   * Despite being deprecated, this remains the only widely supported way to
   * write into ProseMirror, Lexical, Quill and Slate while preserving their
   * internal model and the browser's native undo stack. A manual DOM write
   * leaves those editors out of sync. The direct-write path below is a last
   * resort for editors that refuse the command.
   */
  function insertTextAtCaret(element, text) {
    element.focus();

    let ok = false;
    try {
      ok = document.execCommand('insertText', false, text);
    } catch (e) {
      ok = false;
    }

    if (!ok) {
      const found = getSelectionInside(element);
      if (found) {
        found.range.deleteContents();
        const node = document.createTextNode(text);
        found.range.insertNode(node);
        found.range.setStartAfter(node);
        found.range.collapse(true);
        found.sel.removeAllRanges();
        found.sel.addRange(found.range);
      } else {
        element.textContent = readContentEditable(element) + text;
      }
      fireInput(element, text);
    }
    return true;
  }

  function selectAllInside(element) {
    element.focus();
    const range = document.createRange();
    range.selectNodeContents(element);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }

  function placeCaretAtEnd(element) {
    element.focus();
    if (!element.isContentEditable) {
      const len = (element.value || '').length;
      try {
        element.setSelectionRange(len, len);
      } catch (e) {
        /* number inputs reject setSelectionRange */
      }
      return;
    }
    const range = document.createRange();
    range.selectNodeContents(element);
    range.collapse(false);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }

  function hasCaretInside(element) {
    return !!getSelectionInside(element);
  }

  /* =====================================================================
     Saving and restoring the caret across a modal
     ===================================================================== */

  /**
   * Remember exactly where the caret is.
   *
   * The variable form and the palette live in a shadow root, so opening either
   * moves the document selection out of the composer. A textarea keeps its
   * selectionStart while unfocused, but a contenteditable does not: the
   * selection simply ends up somewhere else. Without this, choosing a prompt
   * from the slash menu could not find the `//token` afterwards and left it
   * sitting in the message.
   */
  function captureCaret(element) {
    const el = element || getInputElement();
    if (!el) return null;

    if (el.isContentEditable) {
      const found = getSelectionInside(el);
      return {
        el,
        kind: 'contenteditable',
        range: found ? found.range.cloneRange() : null
      };
    }

    return {
      el,
      kind: 'input',
      start: typeof el.selectionStart === 'number' ? el.selectionStart : null,
      end: typeof el.selectionEnd === 'number' ? el.selectionEnd : null
    };
  }

  /** Put the caret back where captureCaret found it. */
  function restoreCaret(saved) {
    if (!saved || !saved.el || !saved.el.isConnected) return false;
    const el = saved.el;

    try {
      el.focus();
    } catch (e) {
      return false;
    }

    if (saved.kind === 'contenteditable') {
      if (!saved.range) {
        placeCaretAtEnd(el);
        return true;
      }
      try {
        // A stored Range stays valid while the surrounding nodes are untouched.
        // If the editor re-rendered underneath us, fall back to the end.
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(saved.range);
        if (!getSelectionInside(el)) placeCaretAtEnd(el);
      } catch (e) {
        placeCaretAtEnd(el);
      }
      return true;
    }

    if (saved.start !== null) {
      const max = (el.value || '').length;
      try {
        el.setSelectionRange(Math.min(saved.start, max), Math.min(saved.end, max));
      } catch (e) {
        /* number inputs reject setSelectionRange */
      }
    }
    return true;
  }

  /* =====================================================================
     Core write operations
     ===================================================================== */

  /**
   * Insert `text` into `element` according to `mode`.
   * Returns true when the element accepted the write.
   */
  function writeText(element, text, mode) {
    if (!element) return false;
    const value = String(text == null ? '' : text);

    if (element.isContentEditable) {
      if (mode === 'replace') {
        selectAllInside(element);
        return insertTextAtCaret(element, value);
      }
      if (mode === 'append') {
        placeCaretAtEnd(element);
        const existing = readContentEditable(element);
        const joiner = existing && !/\s$/.test(existing) ? '\n\n' : '';
        return insertTextAtCaret(element, joiner + value);
      }
      // caret
      if (!hasCaretInside(element)) placeCaretAtEnd(element);
      return insertTextAtCaret(element, value);
    }

    // textarea / input
    const current = element.value || '';

    if (mode === 'replace') {
      setNativeValue(element, value);
      fireInput(element, value);
      element.focus();
      try {
        element.setSelectionRange(value.length, value.length);
      } catch (e) {
        /* ignore */
      }
      return true;
    }

    if (mode === 'append') {
      const joiner = current && !/\s$/.test(current) ? '\n\n' : '';
      const next = current + joiner + value;
      setNativeValue(element, next);
      fireInput(element, value);
      element.focus();
      try {
        element.setSelectionRange(next.length, next.length);
      } catch (e) {
        /* ignore */
      }
      return true;
    }

    // caret
    let start = typeof element.selectionStart === 'number' ? element.selectionStart : current.length;
    let end = typeof element.selectionEnd === 'number' ? element.selectionEnd : current.length;
    if (start > current.length || end > current.length) {
      start = current.length;
      end = current.length;
    }
    const next = current.slice(0, start) + value + current.slice(end);
    setNativeValue(element, next);
    fireInput(element, value);
    element.focus();
    const caret = start + value.length;
    try {
      element.setSelectionRange(caret, caret);
    } catch (e) {
      /* ignore */
    }
    return true;
  }

  /**
   * Swap the `length` characters ending at the caret for `text`.
   *
   * The slash menu uses this so choosing a prompt removes only the `//query`
   * the user typed and leaves the rest of the draft untouched.
   */
  function replaceBeforeCaret(element, length, text) {
    if (!element || length <= 0) return writeText(element, text, 'caret');
    const value = String(text == null ? '' : text);

    if (element.isContentEditable) {
      const found = rangeBeforeCaret(element, length);
      if (!found) return writeText(element, value, 'caret');
      found.sel.removeAllRanges();
      found.sel.addRange(found.range);
      // insertText over a selection replaces it, which keeps one undo step.
      return insertTextAtCaret(element, value);
    }

    const current = element.value || '';
    const caret = typeof element.selectionStart === 'number' ? element.selectionStart : current.length;
    const from = Math.max(0, caret - length);
    const next = current.slice(0, from) + value + current.slice(caret);
    setNativeValue(element, next);
    fireInput(element, value);
    element.focus();
    const newCaret = from + value.length;
    try {
      element.setSelectionRange(newCaret, newCaret);
    } catch (e) {
      /* ignore */
    }
    return true;
  }

  function readValue(element) {
    if (!element) return '';
    return element.isContentEditable ? readContentEditable(element) : element.value || '';
  }

  /* =====================================================================
     Did the text actually land?
     ===================================================================== */

  /**
   * Rich editors can swallow a write and still report success: a site update
   * renames the composer, an editor rejects the command, or a framework
   * re-renders over us. So after writing, look for the text.
   *
   * The comparison uses letters and digits only. Editors turn "# Title" into
   * a heading and collapse whitespace, and that must not count as a failure.
   * Occurrences are counted before and after, so inserting a prompt that is
   * already in the box is still checked honestly.
   */
  function probeOf(text) {
    return String(text == null ? '' : text)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '')
      .slice(0, 32);
  }

  function countProbe(element, probe) {
    if (!probe) return 0;
    const hay = String(readValue(element) || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '');
    let count = 0;
    let from = 0;
    for (;;) {
      const at = hay.indexOf(probe, from);
      if (at === -1) break;
      count += 1;
      from = at + probe.length;
    }
    return count;
  }

  /** Returns a function that reports whether `text` appeared in `element`. */
  function landingCheck(element, text, mode) {
    const probe = probeOf(text);
    // Text with no letters or digits cannot be checked; trust the write.
    if (!probe) return () => true;
    const before = countProbe(element, probe);
    return () => {
      if (!element || !element.isConnected) return false;
      const after = countProbe(element, probe);
      return after > before || (mode === 'replace' && after >= 1);
    };
  }

  /* =====================================================================
     Site table
     ===================================================================== */

  /**
   * Per-site knowledge, ordered most specific first.
   *
   * `input` selectors are tried in order. `submit` selectors are only used by
   * the opt-in auto-send. Every site falls back to the generic resolver, so an
   * unknown or redesigned site degrades instead of breaking.
   */
  const SITES = [
    {
      id: 'chatgpt',
      label: 'ChatGPT',
      hosts: ['chatgpt.com', 'chat.openai.com'],
      input: [
        '#prompt-textarea',
        'div[contenteditable="true"][id="prompt-textarea"]',
        'form div[contenteditable="true"]',
        'textarea[data-id="root"]'
      ],
      submit: ['button[data-testid="send-button"]', 'button[aria-label*="Send" i]', 'form button[type="submit"]']
    },
    {
      id: 'claude',
      label: 'Claude',
      hosts: ['claude.ai'],
      input: [
        'div.ProseMirror[contenteditable="true"]',
        'fieldset div[contenteditable="true"]',
        'div[contenteditable="true"][data-placeholder]'
      ],
      submit: ['button[aria-label*="Send" i]', 'button[type="submit"]']
    },
    {
      id: 'gemini',
      label: 'Gemini',
      hosts: ['gemini.google.com'],
      input: ['rich-textarea div[contenteditable="true"]', 'div.ql-editor[contenteditable="true"]'],
      submit: ['button.send-button', 'button[aria-label*="Send" i]']
    },
    {
      id: 'aistudio',
      label: 'Google AI Studio',
      hosts: ['aistudio.google.com'],
      input: ['textarea[aria-label*="prompt" i]', 'ms-autosize-textarea textarea', 'textarea'],
      submit: ['button[aria-label*="Run" i]', 'button.run-button']
    },
    {
      id: 'perplexity',
      label: 'Perplexity',
      hosts: ['perplexity.ai'],
      input: [
        'div[contenteditable="true"]#ask-input',
        'textarea[placeholder*="Ask" i]',
        'div[contenteditable="true"]',
        'textarea'
      ],
      submit: ['button[aria-label*="Submit" i]', 'button[data-testid="submit-button"]']
    },
    {
      id: 'deepseek',
      label: 'DeepSeek',
      hosts: ['deepseek.com'],
      input: ['textarea#chat-input', 'textarea[placeholder*="DeepSeek" i]', 'textarea'],
      submit: ['div[role="button"][aria-disabled="false"]', 'button[type="submit"]']
    },
    {
      id: 'copilot',
      label: 'Microsoft Copilot',
      hosts: ['copilot.microsoft.com', 'bing.com'],
      input: ['textarea#userInput', 'textarea[placeholder*="Message" i]', 'textarea', 'div[contenteditable="true"]'],
      submit: ['button[title*="Submit" i]', 'button[aria-label*="Submit" i]', 'button[type="submit"]']
    },
    {
      id: 'grok',
      label: 'Grok',
      hosts: ['grok.com', 'x.ai'],
      input: ['textarea[aria-label*="Ask" i]', 'div[contenteditable="true"]', 'textarea'],
      submit: ['button[type="submit"]', 'button[aria-label*="Submit" i]']
    },
    {
      id: 'mistral',
      label: 'Le Chat',
      hosts: ['chat.mistral.ai'],
      input: ['textarea[placeholder]', 'div[contenteditable="true"]', 'textarea'],
      submit: ['button[type="submit"]']
    },
    {
      id: 'poe',
      label: 'Poe',
      hosts: ['poe.com'],
      input: ['textarea[class*="GrowingTextArea"]', 'textarea'],
      submit: ['button[class*="sendButton"]', 'button[type="submit"]']
    },
    {
      id: 'qwen',
      label: 'Qwen',
      hosts: ['chat.qwen.ai', 'tongyi.aliyun.com'],
      input: ['textarea#chat-input', 'div[contenteditable="true"]', 'textarea'],
      submit: ['button[type="submit"]', 'button[aria-label*="Send" i]']
    },
    {
      id: 'kimi',
      label: 'Kimi',
      hosts: ['kimi.moonshot.cn', 'kimi.com'],
      input: ['div[contenteditable="true"]', 'textarea'],
      submit: ['button[type="submit"]']
    },
    {
      id: 'metaai',
      label: 'Meta AI',
      hosts: ['meta.ai'],
      input: ['div[contenteditable="true"]', 'textarea'],
      submit: ['button[aria-label*="Send" i]']
    },
    {
      id: 'huggingchat',
      label: 'HuggingChat',
      hosts: ['huggingface.co'],
      input: ['textarea[placeholder*="Ask" i]', 'textarea[enterkeyhint]', 'textarea'],
      submit: ['button[type="submit"]']
    },
    {
      id: 'openrouter',
      label: 'OpenRouter',
      hosts: ['openrouter.ai'],
      input: ['textarea[placeholder]', 'textarea'],
      submit: ['button[type="submit"]']
    },
    {
      id: 'lmarena',
      label: 'LMArena',
      hosts: ['lmarena.ai', 'chat.lmsys.org'],
      input: ['textarea[placeholder]', 'textarea'],
      submit: ['button[type="submit"]']
    },
    {
      id: 'phind',
      label: 'Phind',
      hosts: ['phind.com'],
      input: ['textarea[name="q"]', 'textarea'],
      submit: ['button[type="submit"]']
    },
    {
      id: 'you',
      label: 'You.com',
      hosts: ['you.com'],
      input: ['textarea#search-input-textarea', 'textarea', 'div[contenteditable="true"]'],
      submit: ['button[type="submit"]']
    },
    {
      id: 't3chat',
      label: 'T3 Chat',
      hosts: ['t3.chat'],
      input: ['textarea[placeholder]', 'textarea'],
      submit: ['button[type="submit"]']
    }
  ];

  /**
   * Targets for the Pro "Compare across AIs" feature.
   * Every target has a known fresh-chat URL and a working SITES adapter above.
   */
  const COMPARE_TARGETS = [
    { id: 'chatgpt', label: 'ChatGPT', host: 'chatgpt.com', url: 'https://chatgpt.com/', icon: '🤖' },
    { id: 'claude', label: 'Claude', host: 'claude.ai', url: 'https://claude.ai/new', icon: '🎭' },
    { id: 'gemini', label: 'Gemini', host: 'gemini.google.com', url: 'https://gemini.google.com/app', icon: '✨' },
    { id: 'copilot', label: 'Copilot', host: 'copilot.microsoft.com', url: 'https://copilot.microsoft.com/', icon: '🪟' },
    { id: 'perplexity', label: 'Perplexity', host: 'perplexity.ai', url: 'https://www.perplexity.ai/', icon: '🔍' },
    { id: 'deepseek', label: 'DeepSeek', host: 'deepseek.com', url: 'https://chat.deepseek.com/', icon: '🐋' },
    { id: 'grok', label: 'Grok', host: 'grok.com', url: 'https://grok.com/', icon: '⚡' },
    { id: 'mistral', label: 'Le Chat', host: 'chat.mistral.ai', url: 'https://chat.mistral.ai/chat', icon: '🌪️' },
    { id: 'metaai', label: 'Meta AI', host: 'meta.ai', url: 'https://meta.ai/', icon: '🌐' },
    { id: 'qwen', label: 'Qwen', host: 'chat.qwen.ai', url: 'https://chat.qwen.ai/', icon: '💬' },
    { id: 'kimi', label: 'Kimi', host: 'kimi.moonshot.cn', url: 'https://kimi.moonshot.cn/', icon: '🌙' },
    { id: 'poe', label: 'Poe', host: 'poe.com', url: 'https://poe.com/', icon: '🪶' }
  ];

  function hostMatches(host, pattern) {
    return host === pattern || host.slice(-(pattern.length + 1)) === '.' + pattern;
  }

  function currentSite() {
    const host = (window.location.hostname || '').toLowerCase();
    for (let i = 0; i < SITES.length; i++) {
      const site = SITES[i];
      for (let j = 0; j < site.hosts.length; j++) {
        if (hostMatches(host, site.hosts[j])) return site;
      }
    }
    return null;
  }

  function isKnownSite() {
    return currentSite() !== null;
  }

  function siteLabel() {
    const site = currentSite();
    return site ? site.label : 'this page';
  }

  /* =====================================================================
     Target resolution
     ===================================================================== */

  function visible(el) {
    if (!el || !el.isConnected) return false;
    const rect = el.getBoundingClientRect();
    if (rect.width < 8 || rect.height < 8) return false;
    const style = window.getComputedStyle(el);
    if (style.visibility === 'hidden' || style.display === 'none' || style.opacity === '0') return false;
    return true;
  }

  function firstVisible(selectors) {
    for (let i = 0; i < selectors.length; i++) {
      let nodes;
      try {
        nodes = document.querySelectorAll(selectors[i]);
      } catch (e) {
        continue;
      }
      for (let j = 0; j < nodes.length; j++) {
        if (isEditable(nodes[j]) && visible(nodes[j])) return nodes[j];
      }
    }
    return null;
  }

  /**
   * Pick the largest visible editable on the page. Composers are usually the
   * biggest text surface, which beats "first textarea in the DOM" on pages
   * with hidden or decorative inputs.
   */
  function largestEditable() {
    const candidates = document.querySelectorAll(
      'textarea, div[contenteditable="true"], [role="textbox"][contenteditable="true"], p[contenteditable="true"]'
    );
    let best = null;
    let bestArea = 0;
    for (let i = 0; i < candidates.length; i++) {
      const el = candidates[i];
      if (!isEditable(el) || !visible(el)) continue;
      const rect = el.getBoundingClientRect();
      const area = rect.width * rect.height;
      if (area > bestArea) {
        bestArea = area;
        best = el;
      }
    }
    return best;
  }

  /**
   * Resolve where text should go, in order of confidence:
   *   1. the element the user is focused in right now
   *   2. the element they were last focused in (before a modal stole focus)
   *   3. this site's known composer selectors
   *   4. the largest visible editable
   *   5. any plain text input
   */
  function getInputElement() {
    const active = document.activeElement;
    if (isEditable(active) && visible(active)) return active;

    const remembered = getRememberedTarget();
    if (remembered && visible(remembered)) return remembered;

    const site = currentSite();
    if (site) {
      const found = firstVisible(site.input);
      if (found) return found;
    }

    const biggest = largestEditable();
    if (biggest) return biggest;

    return firstVisible(['input[type="text"]', 'input[type="search"]', 'input:not([type])']);
  }

  /* =====================================================================
     Public write API
     ===================================================================== */

  /**
   * Put text into the page's composer.
   *
   * @param {string} text
   * @param {{mode?: 'caret'|'append'|'replace', target?: Element, submit?: boolean}} options
   * @returns {{ok: boolean, mode: string, submitted: boolean, reason?: string}}
   */
  function insert(text, options) {
    const opts = options || {};
    const mode = ['caret', 'append', 'replace'].indexOf(opts.mode) !== -1 ? opts.mode : 'caret';
    const element =
      (opts.caret && opts.caret.el && isEditable(opts.caret.el) ? opts.caret.el : null) ||
      (opts.target && isEditable(opts.target) ? opts.target : getInputElement());

    if (!element) {
      return { ok: false, mode, submitted: false, reason: 'no-input' };
    }

    // Put the caret back before writing, in case a modal moved focus.
    if (opts.caret) restoreCaret(opts.caret);

    const check = landingCheck(element, text, mode);
    const wrote = writeText(element, text, mode);
    if (!wrote) return { ok: false, mode, submitted: false, reason: 'write-failed' };

    rememberFocus(element);

    let submitted = false;
    if (opts.submit) submitted = submit(element);

    return { ok: true, mode, submitted, target: element, check };
  }

  /**
   * Replace the `length` characters before the caret. Used by the slash menu.
   */
  function replaceRange(length, text, options) {
    const opts = options || {};
    const element =
      (opts.caret && opts.caret.el && isEditable(opts.caret.el) ? opts.caret.el : null) ||
      (opts.target && isEditable(opts.target) ? opts.target : getInputElement());
    if (!element) return { ok: false, submitted: false, reason: 'no-input' };

    // The token to replace sits immediately before the caret, so the caret has
    // to be exactly where it was when the user chose the prompt.
    if (opts.caret) restoreCaret(opts.caret);

    const check = landingCheck(element, text, 'caret');
    const wrote = replaceBeforeCaret(element, length, text);
    if (!wrote) return { ok: false, submitted: false, reason: 'write-failed' };

    rememberFocus(element);

    let submitted = false;
    if (opts.submit) submitted = submit(element);
    return { ok: true, submitted, target: element, check };
  }

  /* =====================================================================
     Auto-submit (opt-in)
     ===================================================================== */

  function clickableSubmit(element) {
    const site = currentSite();
    const selectors = (site && site.submit ? site.submit : []).concat([
      'button[data-testid="send-button"]',
      'button[aria-label*="send" i]',
      'button[title*="send" i]',
      'button[type="submit"]'
    ]);

    // Prefer a button inside the composer's own form or container.
    const scopes = [];
    const form = element.closest ? element.closest('form') : null;
    if (form) scopes.push(form);
    let parent = element.parentElement;
    let hops = 0;
    while (parent && hops < 5) {
      scopes.push(parent);
      parent = parent.parentElement;
      hops += 1;
    }
    scopes.push(document);

    for (let s = 0; s < scopes.length; s++) {
      for (let i = 0; i < selectors.length; i++) {
        let btn;
        try {
          btn = scopes[s].querySelector(selectors[i]);
        } catch (e) {
          continue;
        }
        if (!btn) continue;
        if (btn.disabled) continue;
        if (btn.getAttribute('aria-disabled') === 'true') continue;
        if (!visible(btn)) continue;
        return btn;
      }
    }
    return null;
  }

  /**
   * Send the message. Tries the site's send button first, then a synthetic
   * Enter, which is what most composers listen for.
   *
   * This is deliberately opt-in. Sending on the user's behalf is destructive
   * if the guess is wrong, so it stays behind a setting and an explicit button.
   */
  function submit(target) {
    const element = target && isEditable(target) ? target : getInputElement();
    if (!element) return false;

    const btn = clickableSubmit(element);
    if (btn) {
      btn.click();
      return true;
    }

    element.focus();
    const base = {
      key: 'Enter',
      code: 'Enter',
      keyCode: 13,
      which: 13,
      bubbles: true,
      cancelable: true
    };
    element.dispatchEvent(new KeyboardEvent('keydown', base));
    element.dispatchEvent(new KeyboardEvent('keypress', base));
    element.dispatchEvent(new KeyboardEvent('keyup', base));
    return true;
  }

  /* =====================================================================
     Caret geometry, used to position the slash menu
     ===================================================================== */

  /**
   * Viewport rectangle of the caret.
   *
   * For a contenteditable the selection's own client rect is exact. Textareas
   * expose no caret geometry, so the value up to the caret is measured in a
   * mirror div that copies the textarea's font and padding. The old code just
   * used the element's top-left corner, which put the menu in the wrong place
   * in any multi-line composer.
   */
  function getCaretRect(element) {
    const el = element || getInputElement();
    if (!el) return null;
    const box = el.getBoundingClientRect();

    if (el.isContentEditable) {
      const found = getSelectionInside(el);
      if (found) {
        const range = found.range.cloneRange();
        range.collapse(false);
        const rects = range.getClientRects();
        if (rects && rects.length) {
          const r = rects[rects.length - 1];
          return { top: r.top, bottom: r.bottom, left: r.left, height: r.height || 18 };
        }

        // A collapsed range in an empty block reports no rects. Measure the
        // enclosing element rather than inserting a marker node: writing into a
        // ProseMirror or Lexical document to measure it trips their mutation
        // observers and can move the caret we are trying to locate.
        let node = found.range.startContainer;
        if (node.nodeType === 3) node = node.parentNode;
        if (node && node.getBoundingClientRect) {
          const nr = node.getBoundingClientRect();
          if (nr.height) {
            return { top: nr.top, bottom: nr.bottom, left: nr.left, height: nr.height };
          }
        }
      }
      return { top: box.top, bottom: box.bottom, left: box.left + 8, height: box.height };
    }

    const caret = typeof el.selectionStart === 'number' ? el.selectionStart : (el.value || '').length;
    const measured = measureTextareaCaret(el, caret);
    if (measured) return measured;
    return { top: box.top, bottom: box.bottom, left: box.left + 8, height: 18 };
  }

  let mirror = null;

  function measureTextareaCaret(el, caretIndex) {
    if (el.tagName !== 'TEXTAREA' && el.tagName !== 'INPUT') return null;
    try {
      // Single-page apps sometimes replace document.body, which detaches the
      // mirror and makes every measurement read zero. Rebuild it if that has
      // happened.
      if (mirror && !mirror.isConnected) mirror = null;

      if (!mirror) {
        mirror = document.createElement('div');
        mirror.setAttribute('aria-hidden', 'true');
        mirror.style.position = 'absolute';
        mirror.style.top = '0';
        mirror.style.left = '0';
        mirror.style.visibility = 'hidden';
        mirror.style.pointerEvents = 'none';
        mirror.style.zIndex = '-1';
        document.body.appendChild(mirror);
      }

      const cs = window.getComputedStyle(el);
      const copy = [
        'fontFamily',
        'fontSize',
        'fontWeight',
        'fontStyle',
        'letterSpacing',
        'textTransform',
        'wordSpacing',
        'lineHeight',
        'paddingTop',
        'paddingRight',
        'paddingBottom',
        'paddingLeft',
        'borderTopWidth',
        'borderRightWidth',
        'borderBottomWidth',
        'borderLeftWidth',
        'boxSizing'
      ];
      copy.forEach((prop) => {
        mirror.style[prop] = cs[prop];
      });
      mirror.style.width = el.clientWidth + 'px';
      mirror.style.whiteSpace = el.tagName === 'INPUT' ? 'pre' : 'pre-wrap';
      mirror.style.overflowWrap = 'break-word';

      const before = (el.value || '').slice(0, caretIndex);
      mirror.textContent = before;
      const marker = document.createElement('span');
      marker.textContent = '\u200b';
      mirror.appendChild(marker);

      const elBox = el.getBoundingClientRect();
      const markerBox = marker.getBoundingClientRect();
      const mirrorBox = mirror.getBoundingClientRect();

      const offsetTop = markerBox.top - mirrorBox.top - el.scrollTop;
      const offsetLeft = markerBox.left - mirrorBox.left - el.scrollLeft;
      const lineHeight = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.4 || 18;

      const top = elBox.top + offsetTop;
      return {
        top,
        bottom: top + lineHeight,
        left: elBox.left + offsetLeft,
        height: lineHeight
      };
    } catch (e) {
      return null;
    }
  }

  /* =====================================================================
     Caret text, used to detect the slash trigger
     ===================================================================== */

  /** The text between the start of the field and the caret. */
  function getTextBeforeCaret(element) {
    const el = element || getInputElement();
    if (!el) return { text: '', caret: 0 };

    if (el.isContentEditable) {
      const found = getSelectionInside(el);
      if (!found) return { text: readContentEditable(el), caret: 0 };
      const pre = found.range.cloneRange();
      pre.selectNodeContents(el);
      try {
        pre.setEnd(found.range.endContainer, found.range.endOffset);
      } catch (e) {
        return { text: readContentEditable(el), caret: 0 };
      }
      const text = pre.toString();
      return { text, caret: text.length };
    }

    const caret = typeof el.selectionStart === 'number' ? el.selectionStart : (el.value || '').length;
    return { text: (el.value || '').slice(0, caret), caret };
  }

  return {
    // discovery
    trackFocus,
    getInputElement,
    getRememberedTarget,
    isEditable,
    isKnownSite,
    siteLabel,
    currentSite,
    SITES,
    COMPARE_TARGETS,

    // reading
    readValue,
    landingCheck,
    getTextBeforeCaret,
    getCaretRect,
    captureCaret,
    restoreCaret,

    // writing
    insert,
    replaceRange,
    submit,
    writeText,
    replaceBeforeCaret,
    placeCaretAtEnd
  };
})();

if (typeof window !== 'undefined') {
  window.ChatbotAdapters = ChatbotAdapters;
}
