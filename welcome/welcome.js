/**
 * OmniPrompt - Quick start guide controller
 *
 * The guide is a static page, so it reads and writes the theme choice straight
 * from extension storage rather than loading the whole prompt store for one
 * value. The stored shape stays intact: the theme key is merged into the
 * existing settings object instead of replacing it.
 */

document.addEventListener('DOMContentLoaded', () => {
  const SETTINGS_KEY = 'omni.settings';
  let choice = 'system';

  initTheme();
  bindOpenLibrary();
  bindSmoothScroll();
  initRoleOnboarding();

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
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) target.scrollIntoView({ behavior: 'smooth' });
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
    all: 'All Prompts'
  };

  const ROLE_COUNTS = {
    Coding: 25,
    Writing: 20,
    Marketing: 20,
    SEO: 15,
    Productivity: 15,
    Personas: 15,
    all: 110
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
      feedback.textContent = '✓ ' + title + ' starter pack activated (' + count + ' prompts). Type // in any text box!';
    }
  }

  function paintRole(role) {
    const activeRole = role || 'all';
    const grid = document.getElementById('role-grid');
    const allBtn = document.getElementById('btn-select-all-roles');

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
});
