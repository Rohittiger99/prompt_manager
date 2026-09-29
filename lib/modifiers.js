/**
 * OmniPrompt - Quick modifiers
 *
 * One-click transformations that wrap whatever the user already has (a draft
 * in the chat box, or text highlighted on the page) in an instruction.
 *
 * This is the single definition. The list used to exist three times: the
 * transforms in content/quickModifiers.js, display-only copies in popup.js,
 * and context-menu titles in background.js. Adding a modifier meant editing
 * three files, and they had already drifted apart in wording.
 */

(function (root, factory) {
  'use strict';
  var api = factory();
  root.OmniModifiers = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /**
   * Wrap text in a fenced block when it looks like code, and in quote markers
   * otherwise, so the model can tell instruction from payload.
   */
  function fence(text) {
    return '```\n' + String(text) + '\n```';
  }

  function quote(text) {
    return '"""\n' + String(text) + '\n"""';
  }

  var MODIFIERS = [
    {
      id: 'mod-concise',
      title: 'Make Concise & Punchy',
      shortTitle: 'Make Concise',
      icon: '✂️',
      description: 'Trim fluff, cut passive voice, keep every fact.',
      contextMenuTitle: '✂️ Make Concise & Punchy',
      transform: function (text) {
        return (
          'Rewrite the text below so it is significantly more concise, clear and direct. ' +
          'Preserve every fact, number and intent. Do not add new claims.\n\n' +
          quote(text)
        );
      }
    },
    {
      id: 'mod-debug',
      title: 'Debug & Explain Root Cause',
      shortTitle: 'Debug Code',
      icon: '🔍',
      description: 'Find the bug, name the root cause, give the fix.',
      contextMenuTitle: '🔍 Debug & Explain Root Cause',
      transform: function (text) {
        return (
          'Analyse the code below for bugs, edge-case failures, performance problems and ' +
          'security issues.\n\nReturn:\n1. Root cause, stated precisely.\n2. The minimal fix as a diff.\n' +
          '3. A test that would have caught it.\n\n' +
          fence(text)
        );
      }
    },
    {
      id: 'mod-grammar',
      title: 'Fix Grammar & Improve Flow',
      shortTitle: 'Fix Grammar',
      icon: '📝',
      description: 'Correct errors and smooth the rhythm. Meaning unchanged.',
      contextMenuTitle: '📝 Fix Grammar & Improve Flow',
      transform: function (text) {
        return (
          'Proofread and polish the text below. Fix grammar, spelling, punctuation and awkward ' +
          'phrasing, and improve the flow. Keep the original meaning and voice. ' +
          'List the substantive changes at the end.\n\n' +
          quote(text)
        );
      }
    },
    {
      id: 'mod-table',
      title: 'Format as Markdown Table',
      shortTitle: 'Markdown Table',
      icon: '📊',
      description: 'Turn loose text or data into clean table columns.',
      contextMenuTitle: '📊 Format as Markdown Table',
      transform: function (text) {
        return (
          'Convert the information below into a well-structured Markdown table. ' +
          'Choose column headers that fit the data. Do not invent values; use an em dash ' +
          'for anything missing.\n\n' +
          quote(text)
        );
      }
    },
    {
      id: 'mod-eli5',
      title: 'Explain Simply (ELI5)',
      shortTitle: 'ELI5 Explainer',
      icon: '🎓',
      description: 'Plain language plus one real-world analogy.',
      contextMenuTitle: '🎓 Explain Simply (ELI5)',
      transform: function (text) {
        return (
          'Explain the concept below in plain language a smart twelve-year-old could follow. ' +
          'Use one concrete real-world analogy. Then add a short "the precise version" ' +
          'paragraph for an expert.\n\n' +
          quote(text)
        );
      }
    },
    {
      id: 'mod-critique',
      title: 'Critique & 3 Improvements',
      shortTitle: 'Critique & Upgrade',
      icon: '💡',
      description: 'Honest review, weakest links, three concrete upgrades.',
      contextMenuTitle: '💡 Critique & 3 Improvements',
      transform: function (text) {
        return (
          'Act as an uncompromising expert reviewer of the work below. ' +
          'Name the three weakest points with evidence, then give three concrete, ' +
          'high-impact improvements. Be specific rather than encouraging.\n\n' +
          quote(text)
        );
      }
    },
    {
      id: 'mod-action-items',
      title: 'Extract Action Items & Owners',
      shortTitle: 'Extract Actions',
      icon: '✅',
      description: 'Checklist with owners, dates and urgency.',
      contextMenuTitle: '✅ Extract Action Items & Owners',
      transform: function (text) {
        return (
          'Extract a prioritised checklist of action items from the text below. ' +
          'For each item give the task, the owner or role, any deadline, and urgency. ' +
          'Mark anything you inferred rather than read.\n\n' +
          quote(text)
        );
      }
    },
    {
      id: 'mod-translate-en',
      title: 'Translate to Natural English',
      shortTitle: 'Translate English',
      icon: '🌐',
      description: 'Idiomatic English, not word-for-word.',
      contextMenuTitle: '🌐 Translate to Natural English',
      transform: function (text) {
        return (
          'Translate the text below into fluent, idiomatic English. Keep the register and ' +
          'intent. Where a phrase has no direct equivalent, choose the natural English ' +
          'phrasing and note the choice in brackets.\n\n' +
          quote(text)
        );
      }
    },
    {
      id: 'mod-steelman',
      title: 'Steelman the Opposing View',
      shortTitle: 'Steelman',
      icon: '⚖️',
      description: 'Strongest honest case against your position.',
      contextMenuTitle: '⚖️ Steelman the Opposing View',
      transform: function (text) {
        return (
          'Build the strongest honest case against the position below. ' +
          'Give the three best counter-arguments, the evidence a reasonable critic would cite, ' +
          'and what would have to be true for the original position to be wrong. ' +
          'Do not strawman.\n\n' +
          quote(text)
        );
      }
    },
    {
      id: 'mod-tests',
      title: 'Write Tests for This',
      shortTitle: 'Write Tests',
      icon: '🧪',
      description: 'Happy path, edge cases and failure modes.',
      contextMenuTitle: '🧪 Write Tests for This',
      transform: function (text) {
        return (
          'Write a focused test suite for the code below. Cover the happy path, boundary ' +
          'values, empty and null input, and the error paths. Use the conventions already ' +
          'visible in the code. Explain any case you chose not to cover.\n\n' +
          fence(text)
        );
      }
    },
    {
      id: 'mod-explain-code',
      title: 'Explain This Code',
      shortTitle: 'Explain Code',
      icon: '📖',
      description: 'Walk through what it does and why, line by line.',
      contextMenuTitle: '📖 Explain This Code',
      transform: function (text) {
        return (
          'Explain the code below. Start with a one-sentence summary of what it does, ' +
          'then walk through the logic in order, then call out anything surprising, ' +
          'risky or non-obvious.\n\n' +
          fence(text)
        );
      }
    },
    {
      id: 'mod-reply',
      title: 'Draft a Reply',
      shortTitle: 'Draft Reply',
      icon: '↩️',
      description: 'Professional response that addresses every point.',
      contextMenuTitle: '↩️ Draft a Reply',
      transform: function (text) {
        return (
          'Draft a reply to the message below. Address every point raised, keep it warm but ' +
          'efficient, and end with a clear next step. Give me two versions: one short, ' +
          'one detailed.\n\n' +
          quote(text)
        );
      }
    }
  ];

  var byId = {};
  MODIFIERS.forEach(function (m) {
    byId[m.id] = m;
  });

  function getAll() {
    return MODIFIERS.slice();
  }

  function getById(id) {
    return byId[id] || null;
  }

  function apply(id, text) {
    var mod = byId[id];
    if (!mod) return null;
    return mod.transform(String(text == null ? '' : text));
  }

  /** Shape the background service worker needs for chrome.contextMenus. */
  function contextMenuItems() {
    return MODIFIERS.map(function (m) {
      return { id: m.id, title: m.contextMenuTitle || m.icon + ' ' + m.title };
    });
  }

  /** Shape the command palette needs so modifiers are searchable alongside prompts. */
  function asPaletteItems() {
    return MODIFIERS.map(function (m) {
      return {
        type: 'modifier',
        id: m.id,
        title: m.title,
        icon: m.icon,
        category: 'Quick Modifiers',
        tags: ['modifier', 'transform'],
        shortcut: '',
        description: m.description
      };
    });
  }

  return {
    MODIFIERS: MODIFIERS,
    getAll: getAll,
    getById: getById,
    apply: apply,
    contextMenuItems: contextMenuItems,
    asPaletteItems: asPaletteItems
  };
});
