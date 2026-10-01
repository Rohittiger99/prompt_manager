/**
 * OmniPrompt - Quick start guide controller
 *
 * The guide is a static page, so it reads and writes the theme choice straight
 * from extension storage rather than loading the whole prompt store for one
 * value. The stored shape stays intact: the theme key is merged into the
 * existing settings object instead of replacing it.
 *
 * The practice box
 * ----------------
 * Content scripts do not run on extension pages, so the page cannot host the
 * real slash menu. Instead it offers a faithful practice copy: type //, pick a
 * built-in prompt, fill in its blanks with a live preview, insert. It uses the
 * real template engine (lib/template.js) and the real built-in library, so
 * what the user learns here is exactly what happens on ChatGPT or Claude. It
 * never stores anything and makes no request.
 */

'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const SETTINGS_KEY = 'omni.settings';
  let choice = 'system';
  let demoRole = 'all';

  initTheme();
  bindOpenLibrary();
  bindSmoothScroll();
  initRoleOnboarding();
  initPractice();
  initEverywhereSwitch();

  /* =====================================================================
     Theme
     ===================================================================== */

  function initTheme() {
    paint();

    readChoice().then((stored) => {
      choice = stored;
      paint();
    });

    document.querySelectorAll('.theme-opt').forEach((button) => {
      button.addEventListener('click', () => {
        choice = button.getAttribute('data-choice');
        paint();
        writeChoice(choice);
      });
    });

    if (window.OmniTheme) {
      window.OmniTheme.watchSystem(
        () => choice,
        () => paint()
      );
    }
  }

  function paint() {
    if (!window.OmniTheme) return;
    window.OmniTheme.apply(document.documentElement, choice);
    const normalized = window.OmniTheme.normalize(choice);
    document.querySelectorAll('.theme-opt').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.getAttribute('data-choice') === normalized));
    });
  }

  function readChoice() {
    return new Promise((resolve) => {
      if (!hasStorage()) return resolve('system');
      chrome.storage.local.get([SETTINGS_KEY], (result) => {
        void chrome.runtime.lastError;
        const settings = result && result[SETTINGS_KEY];
        const stored = settings && typeof settings.theme === 'string' ? settings.theme : 'system';
        resolve(stored);
      });
    });
  }

  function writeChoice(value) {
    if (!hasStorage()) return;
    chrome.storage.local.get([SETTINGS_KEY], (result) => {
      void chrome.runtime.lastError;
      const settings = Object.assign({}, (result && result[SETTINGS_KEY]) || {}, { theme: value });
      const patch = {};
      patch[SETTINGS_KEY] = settings;
      patch['omni.settingsUpdatedAt'] = Date.now();
      chrome.storage.local.set(patch, () => {
        void chrome.runtime.lastError;
        // Let open tabs repaint their injected overlays immediately.
        if (chrome.runtime && chrome.runtime.sendMessage) {
          chrome.runtime.sendMessage({ action: 'broadcast_settings' }, () => void chrome.runtime.lastError);
        }
      });
    });
  }

  function hasStorage() {
    return typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;
  }

  /* =====================================================================
     Navigation
     ===================================================================== */

  function bindOpenLibrary() {
    document.querySelectorAll('[data-open-options]').forEach((button) => {
      button.addEventListener('click', () => {
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.openOptionsPage) {
          chrome.runtime.openOptionsPage();
        } else {
          window.open('../options/options.html', '_blank');
        }
      });
    });
  }

  function bindSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener('click', function (e) {
        const target = document.querySelector(this.getAttribute('href'));
        if (!target) return;
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
        if (this.getAttribute('href') === '#practice') {
          const input = document.getElementById('practice-input');
          if (input) setTimeout(() => input.focus({ preventScroll: true }), 350);
        }
      });
    });
  }

  /* =====================================================================
     Role Onboarding
     ===================================================================== */

  const ROLE_NAMES = {
    Coding: 'Software Engineer',
    Writing: 'Writer & Creator',
    Marketing: 'Growth & Marketing',
    SEO: 'SEO Specialist',
    Productivity: 'Productivity & Ops',
    Personas: 'Expert Personas',
    Clients: 'Freelance & Client Work',
    all: 'All Prompts'
  };

  const ROLE_COUNTS = {
    Coding: 25,
    Writing: 20,
    Marketing: 20,
    SEO: 15,
    Productivity: 15,
    Personas: 15,
    Clients: 26,
    all: 136
  };

  function initRoleOnboarding() {
    const grid = document.getElementById('role-grid');
    const allBtn = document.getElementById('btn-select-all-roles');
    const feedback = document.getElementById('role-feedback');
    if (!grid) return;

    readRole().then((selected) => {
      paintRole(selected);
    });

    grid.querySelectorAll('.role-card').forEach((card) => {
      card.addEventListener('click', () => {
        const role = card.getAttribute('data-role');
        paintRole(role);
        writeRole(role);
        showRoleFeedback(role);
      });
    });

    if (allBtn) {
      allBtn.addEventListener('click', () => {
        paintRole('all');
        writeRole('all');
        showRoleFeedback('all');
      });
    }

    function showRoleFeedback(role) {
      if (!feedback) return;
      const title = ROLE_NAMES[role] || role;
      const count = ROLE_COUNTS[role] || '';
      feedback.style.display = 'inline-flex';
      feedback.textContent =
        '✓ ' + title + ' is on (' + count + ' prompts). Try it in the practice box, or type // in any text box.';
    }
  }

  function paintRole(role) {
    const activeRole = role || 'all';
    const grid = document.getElementById('role-grid');
    const allBtn = document.getElementById('btn-select-all-roles');
    demoRole = activeRole;

    if (grid) {
      grid.querySelectorAll('.role-card').forEach((card) => {
        const cardRole = card.getAttribute('data-role');
        const isMatch = cardRole === activeRole;
        card.setAttribute('aria-pressed', String(isMatch));
        card.classList.toggle('active', isMatch);
      });
    }

    if (allBtn) {
      allBtn.setAttribute('aria-pressed', String(activeRole === 'all'));
    }
  }

  function readRole() {
    return new Promise((resolve) => {
      if (!hasStorage()) return resolve('all');
      chrome.storage.local.get([SETTINGS_KEY], (result) => {
        void chrome.runtime.lastError;
        const settings = result && result[SETTINGS_KEY];
        const role = settings && typeof settings.selectedRole === 'string' ? settings.selectedRole : 'all';
        resolve(role);
      });
    });
  }

  function writeRole(role) {
    if (!hasStorage()) return;
    chrome.storage.local.get([SETTINGS_KEY], (result) => {
      void chrome.runtime.lastError;
      const settings = Object.assign({}, (result && result[SETTINGS_KEY]) || {}, {
        selectedRole: role,
        activePacks: role === 'all' ? ['all'] : [role],
        onboardingCompleted: true
      });
      const patch = {};
      patch[SETTINGS_KEY] = settings;
      patch['omni.settingsUpdatedAt'] = Date.now();
      chrome.storage.local.set(patch, () => {
        void chrome.runtime.lastError;
        if (chrome.runtime && chrome.runtime.sendMessage) {
          chrome.runtime.sendMessage({ action: 'broadcast_settings' }, () => void chrome.runtime.lastError);
        }
      });
    });
  }

  /* =====================================================================
     Practice box
     ===================================================================== */

  // A varied first look when every pack is on.
  const STARTERS = ['review', 'execsum', 'coldemail', 'debug', 'prioritize', 'hero', 'eli5', 'tests'];
  const MAX_ITEMS = 6;
  const TRIGGER = '//';

  function initPractice() {
    const input = document.getElementById('practice-input');
    const menu = document.getElementById('practice-menu');
    const form = document.getElementById('practice-form');
    const fieldsBox = document.getElementById('practice-fields');
    const preview = document.getElementById('practice-preview');
    const formTitle = document.getElementById('practice-form-title');
    const insertBtn = document.getElementById('practice-form-insert');
    const cancelBtn = document.getElementById('practice-form-cancel');
    const closeBtn = document.getElementById('practice-form-close');
    const tryBtn = document.getElementById('practice-try');
    const status = document.getElementById('practice-status');
    const done = document.getElementById('practice-done');
    const steps = document.getElementById('practice-steps');
    const warning = document.getElementById('practice-warning');
    const T = window.OmniTemplate;
    const library = Array.isArray(window.DEFAULT_PROMPTS) ? window.DEFAULT_PROMPTS : [];
    if (!input || !menu || !T || !library.length) return;

    let items = [];
    let selected = 0;
    let token = null; // { start, end, query } of the typed //word
    let dismissedAt = -1;
    let picked = null;
    let pickedToken = null;
    let variables = [];

    markStep(1, false);

    input.addEventListener('input', onInput);
    input.addEventListener('keydown', onKeydown);
    input.addEventListener('click', onInput);
    input.addEventListener('blur', () => setTimeout(() => {
      if (document.activeElement !== input) hideMenu();
    }, 150));

    tryBtn.addEventListener('click', () => {
      const start = input.selectionStart || input.value.length;
      const before = input.value.slice(0, start);
      const needsSpace = before && !/\s$/.test(before);
      input.value = before + (needsSpace ? ' ' : '') + TRIGGER + input.value.slice(start);
      const caret = before.length + (needsSpace ? 1 : 0) + TRIGGER.length;
      input.focus();
      input.setSelectionRange(caret, caret);
      onInput();
    });

    insertBtn.addEventListener('click', insertPicked);
    cancelBtn.addEventListener('click', closeForm);
    closeBtn.addEventListener('click', closeForm);
    form.addEventListener('keydown', (e) => {
      if (isImeKey(e)) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        closeForm();
      } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        insertPicked();
      }
    });

    /** The //word that ends at the caret, if there is one. */
    function readToken() {
      const caret = input.selectionStart;
      if (caret !== input.selectionEnd) return null;
      const before = input.value.slice(0, caret);
      const m = before.match(/(^|\s)\/\/([\w-]{0,40})$/);
      if (!m) return null;
      const start = caret - m[2].length - TRIGGER.length;
      return { start, end: caret, query: m[2].toLowerCase() };
    }

    function onInput() {
      token = readToken();
      if (!token || token.start === dismissedAt) {
        if (!token) dismissedAt = -1;
        hideMenu();
        return;
      }
      items = collect(token.query);
      selected = 0;
      renderMenu();
      markStep(1, true);
    }

    function inPack(p) {
      return demoRole === 'all' || demoRole === 'custom' || p.category === demoRole;
    }

    function collect(query) {
      const pool = library.filter(inPack);
      const source = pool.length ? pool : library;
      if (!query) {
        if (demoRole === 'all') {
          const starters = STARTERS.map((s) => library.find((p) => p.shortcut === s)).filter(Boolean);
          if (starters.length) return starters.slice(0, MAX_ITEMS);
        }
        return source.slice(0, MAX_ITEMS);
      }
      const scored = [];
      // Search the chosen pack first, then everything, like a short menu would.
      [source, library].forEach((list, pass) => {
        list.forEach((p) => {
          if (scored.some((s) => s.p === p)) return;
          const sc = String(p.shortcut || '').toLowerCase();
          const title = String(p.title || '').toLowerCase();
          let score = 0;
          if (sc === query) score = 100;
          else if (sc.indexOf(query) === 0) score = 80;
          else if (title.split(/\W+/).some((w) => w.indexOf(query) === 0)) score = 60;
          else if (sc.indexOf(query) !== -1) score = 40;
          else if (title.indexOf(query) !== -1) score = 30;
          if (score) scored.push({ p, score: score - pass * 50 });
        });
      });
      scored.sort((a, b) => b.score - a.score);
      return scored.slice(0, MAX_ITEMS).map((s) => s.p);
    }

    function renderMenu() {
      const head =
        '<div class="pm-head"><span>' +
        (token.query ? 'Matching “' + escapeHtml(token.query) + '”' : demoRole === 'all' ? 'A few to start with' : 'Your ' + escapeHtml(ROLE_NAMES[demoRole] || demoRole) + ' pack') +
        '</span><span><kbd>↑</kbd><kbd>↓</kbd> <kbd>↵</kbd> · <kbd>Esc</kbd></span></div>';
      if (!items.length) {
        menu.innerHTML = head + '<div class="pm-empty">Nothing matches. Keep typing, or press Esc to carry on writing.</div>';
      } else {
        menu.innerHTML =
          head +
          '<ul class="pm-list">' +
          items
            .map(
              (p, i) =>
                '<li class="pm-item' +
                (i === selected ? ' selected' : '') +
                '" role="option" id="pm-opt-' +
                i +
                '" aria-selected="' +
                (i === selected) +
                '" data-index="' +
                i +
                '">' +
                '<span class="pm-icon" aria-hidden="true">' +
                escapeHtml(iconFor(p)) +
                '</span>' +
                '<span class="pm-text"><span class="pm-title">' +
                escapeHtml(p.title) +
                '</span><span class="pm-desc">' +
                escapeHtml(p.description || '') +
                '</span></span>' +
                '<span class="pm-short">' +
                escapeHtml(TRIGGER + p.shortcut) +
                '</span>' +
                '</li>'
            )
            .join('') +
          '</ul>';
      }
      menu.hidden = false;
      input.setAttribute('aria-expanded', 'true');
      paintSelected();
      menu.querySelectorAll('.pm-item').forEach((node) => {
        node.addEventListener('mousedown', (e) => {
          e.preventDefault();
          pick(parseInt(node.getAttribute('data-index'), 10));
        });
        node.addEventListener('mouseenter', () => {
          selected = parseInt(node.getAttribute('data-index'), 10);
          paintSelected();
        });
      });
      status.classList.remove('is-good');
      status.innerHTML = 'Pick one with <kbd>↑</kbd> <kbd>↓</kbd> and <kbd>↵</kbd>, or keep typing to narrow it down.';
    }

    function paintSelected() {
      menu.querySelectorAll('.pm-item').forEach((node, i) => {
        const on = i === selected;
        node.classList.toggle('selected', on);
        node.setAttribute('aria-selected', String(on));
        if (on) node.scrollIntoView({ block: 'nearest' });
      });
      if (items.length) input.setAttribute('aria-activedescendant', 'pm-opt-' + selected);
    }

    function hideMenu() {
      menu.hidden = true;
      input.setAttribute('aria-expanded', 'false');
      input.removeAttribute('aria-activedescendant');
    }

    function onKeydown(e) {
      if (menu.hidden || isImeKey(e)) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        if (!items.length) return;
        e.preventDefault();
        selected = (selected + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
        paintSelected();
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        if (!items.length) return;
        e.preventDefault();
        pick(selected);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        // Like the real menu: Esc keeps it closed until a new // is typed.
        dismissedAt = token ? token.start : -1;
        hideMenu();
        status.innerHTML = 'Menu closed. Your text is untouched. Type a new <kbd>//</kbd> to open it again.';
      }
    }

    function pick(index) {
      const p = items[index];
      if (!p || !token) return;
      picked = p;
      pickedToken = token;
      hideMenu();
      markStep(2, true);

      const initial = T.buildInitialValues(p, { selection: '', url: '', title: document.title }, { allowClipboard: false });
      variables = initial.variables;
      if (!variables.length) {
        writeIntoBox(T.render(p.template, {}));
        return;
      }
      openForm(p, initial);
    }

    function openForm(p, initial) {
      formTitle.textContent = p.title;
      fieldsBox.innerHTML = variables
        .map((v, i) => {
          const id = 'practice-field-' + i;
          const value = initial.values[v.name] || '';
          const auto = initial.filledFrom[v.name];
          const note = auto && auto !== 'default' ? ' <span class="auto-note">filled for you</span>' : '';
          let control;
          if (v.type === 'select' && v.options.length) {
            control =
              '<select id="' + id + '" data-var="' + escapeHtml(v.name) + '">' +
              v.options.map((o) => '<option' + (o === value ? ' selected' : '') + '>' + escapeHtml(o) + '</option>').join('') +
              '</select>';
          } else if (v.type === 'textarea') {
            control =
              '<textarea id="' + id + '" data-var="' + escapeHtml(v.name) + '" rows="2" placeholder="' +
              escapeHtml(v.hint || 'Type or paste here') + '">' + escapeHtml(value) + '</textarea>';
          } else {
            control =
              '<input type="text" id="' + id + '" data-var="' + escapeHtml(v.name) + '" value="' + escapeHtml(value) +
              '" placeholder="' + escapeHtml(v.hint || 'Type a value') + '" />';
          }
          return '<label for="' + id + '">' + escapeHtml(v.label) + note + control + '</label>';
        })
        .join('');
      fieldsBox.querySelectorAll('[data-var]').forEach((f) => f.addEventListener('input', paintPreview));
      form.hidden = false;
      paintPreview();
      markStep(3, false);
      status.classList.remove('is-good');
      status.innerHTML = 'This is the form OmniPrompt shows for prompts with blanks. <kbd>Ctrl</kbd>+<kbd>↵</kbd> inserts.';
      const first = fieldsBox.querySelector('[data-var]');
      if (first) first.focus();
    }

    function readValues() {
      const values = {};
      fieldsBox.querySelectorAll('[data-var]').forEach((f) => {
        values[f.getAttribute('data-var')] = f.value;
      });
      return values;
    }

    /** Unfilled blanks stay visible in the preview, with the same warning the real form gives. */
    function paintPreview() {
      if (!picked) return;
      const result = T.render(picked.template, readValues(), { withMeta: true });
      const missing = Array.from(new Set((result.missing || []).map((n) => String(n).toLowerCase())));
      preview.innerHTML = escapeHtml(result.text).replace(/\[([^\[\]\n]{1,60})\]|\{\{[^{}]{1,80}\}\}/g, (m, inner) => {
        if (inner === undefined) return '<mark>' + m + '</mark>';
        return missing.indexOf(inner.toLowerCase()) !== -1 ? '<mark>' + m + '</mark>' : m;
      });
      if (warning) {
        warning.hidden = !missing.length;
        warning.textContent = missing.length
          ? missing.length + (missing.length === 1 ? ' blank is' : ' blanks are') + ' still empty. They go in as placeholders.'
          : '';
      }
    }

    function insertPicked() {
      if (!picked) return;
      writeIntoBox(T.render(picked.template, readValues()));
    }

    function closeForm() {
      form.hidden = true;
      picked = null;
      input.focus();
      status.innerHTML = 'No problem. Type <kbd>//</kbd> again to pick another.';
    }

    /** Replace only the typed //word, keep the rest of the draft, as the extension does. */
    function writeIntoBox(text) {
      const t = pickedToken;
      const value = input.value;
      const start = t ? t.start : value.length;
      const end = t ? t.end : value.length;
      input.value = value.slice(0, start) + text + value.slice(end);
      const caret = start + text.length;
      form.hidden = true;
      picked = null;
      input.focus();
      input.setSelectionRange(caret, caret);
      input.scrollTop = input.scrollHeight;
      markStep(3, true);
      tryBtn.hidden = true;
      status.classList.add('is-good');
      status.textContent = 'Inserted where your cursor was. On a real site you would now press Send.';
      done.hidden = false;
    }

    function markStep(n, complete) {
      if (!steps) return;
      steps.querySelectorAll('li[data-step]').forEach((li) => {
        const s = parseInt(li.getAttribute('data-step'), 10);
        if (complete && s === n) li.classList.add('done');
        if (s < n) li.classList.add('done');
        li.classList.toggle('is-current', !li.classList.contains('done') && s === (complete ? n + 1 : n));
      });
    }

    function iconFor(p) {
      const icons = {
        Coding: '💻',
        Writing: '✍️',
        Marketing: '📈',
        SEO: '🔍',
        Productivity: '⚡',
        Personas: '🎭',
        Clients: '💼'
      };
      return icons[p.category] || '📝';
    }
  }

  /**
   * True while an IME (Chinese, Japanese, Korean) is composing. Its Enter and
   * Esc belong to the IME and must not pick a prompt or close the form.
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

  /* =====================================================================
     Everywhere switch
     ===================================================================== */

  function initEverywhereSwitch() {
    const sw = document.getElementById('welcome-everywhere-switch');
    const status = document.getElementById('welcome-everywhere-status');
    if (!sw) return;

    function refreshStatus() {
      if (typeof chrome === 'undefined' || !chrome.permissions || !chrome.permissions.contains) {
        sw.checked = false;
        if (status) status.textContent = 'Permissions API not available.';
        return;
      }
      chrome.permissions.contains({ origins: ['<all_urls>'] }, (granted) => {
        void chrome.runtime.lastError;
        sw.checked = !!granted;
        if (status) {
          status.textContent = granted
            ? 'Active. OmniPrompt is enabled on all websites.'
            : 'Off. OmniPrompt is active on AI chat sites.';
        }
      });
    }

    refreshStatus();

    sw.addEventListener('change', () => {
      if (typeof chrome === 'undefined' || !chrome.permissions) return;
      if (sw.checked) {
        chrome.permissions.request({ origins: ['<all_urls>'] }, (granted) => {
          void chrome.runtime.lastError;
          sw.checked = !!granted;
          refreshStatus();
        });
      } else {
        chrome.permissions.remove({ origins: ['<all_urls>'] }, (removed) => {
          void chrome.runtime.lastError;
          refreshStatus();
        });
      }
    });
  }
});
