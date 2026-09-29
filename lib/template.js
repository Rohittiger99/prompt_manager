/**
 * OmniPrompt - Template engine
 *
 * Owns everything about {{variables}}: parsing, labelling, auto-fill rules and
 * rendering. Shared by the in-page modal, the popup and the options dashboard
 * so the three surfaces can never disagree about what a template means.
 *
 * Two bugs this module exists to prevent
 * --------------------------------------
 * 1. Replacement-pattern corruption. The old code passed the user's value as
 *    the replacement string of String.replace, so a value containing `$&`,
 *    `$1` or `` $` `` was interpreted as a substitution pattern. Pasting
 *    `text.replace(/a/g, "$&!")` rendered as `{{code}}!`. Values now go
 *    through a replacer function, which treats `$` literally.
 * 2. Silent clipboard reads. Auto-fill used to call
 *    navigator.clipboard.readText() every time a prompt opened and paste the
 *    result into any field named `code` or `text`. Clipboard access is now
 *    opt-in and always user-initiated.
 *
 * Inline syntax
 *   {{name}}                plain field
 *   {{name|default value}}  field pre-filled with a default
 */

(function (root, factory) {
  'use strict';
  var api = factory();
  root.OmniTemplate = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var TOKEN_RE = /\{\{([^{}]+)\}\}/g;

  /* =====================================================================
     Auto-fill sources
     ===================================================================== */

  var AUTOFILL = {
    SELECTION: 'selection',
    CLIPBOARD: 'clipboard',
    URL: 'url',
    PAGE_TITLE: 'page_title',
    DATE: 'date',
    TIME: 'time',
    DATETIME: 'datetime'
  };

  var AUTOFILL_LABELS = {
    selection: 'Highlighted text',
    clipboard: 'Clipboard',
    url: 'Page URL',
    page_title: 'Page title',
    date: "Today's date",
    time: 'Current time',
    datetime: 'Date and time'
  };

  /**
   * Decide whether a variable can fill itself.
   *
   * `code` and `text` resolve from the page selection only. They deliberately
   * never touch the clipboard: the user can see what they highlighted, but
   * they cannot see what is on their clipboard, and quietly pasting it into a
   * prompt is a privacy problem rather than a convenience.
   */
  function detectAutofill(name) {
    var n = String(name || '').toLowerCase().trim();

    if (n === 'clipboard' || n === 'clip' || /(^|_)clipboard(_|$)/.test(n)) {
      return AUTOFILL.CLIPBOARD;
    }
    if (n === 'url' || n === 'page_url' || n === 'current_url') return AUTOFILL.URL;
    if (n === 'page_title' || n === 'tab_title' || n === 'title_of_page') return AUTOFILL.PAGE_TITLE;
    if (n === 'date' || n === 'today') return AUTOFILL.DATE;
    if (n === 'time') return AUTOFILL.TIME;
    if (n === 'datetime' || n === 'now' || n === 'timestamp') return AUTOFILL.DATETIME;

    if (
      n === 'selection' ||
      n === 'selected_text' ||
      n === 'highlighted_text' ||
      n === 'code' ||
      n === 'text' ||
      /(^|_)(selection|selected|highlight|highlighted)(_|$)/.test(n)
    ) {
      return AUTOFILL.SELECTION;
    }

    return null;
  }

  /* =====================================================================
     Labels
     ===================================================================== */

  var ACRONYMS = {
    api: 'API',
    url: 'URL',
    urls: 'URLs',
    seo: 'SEO',
    sql: 'SQL',
    html: 'HTML',
    css: 'CSS',
    json: 'JSON',
    yaml: 'YAML',
    csv: 'CSV',
    ui: 'UI',
    ux: 'UX',
    cta: 'CTA',
    kpi: 'KPI',
    kpis: 'KPIs',
    roi: 'ROI',
    icp: 'ICP',
    b2b: 'B2B',
    b2c: 'B2C',
    saas: 'SaaS',
    ci: 'CI',
    cd: 'CD',
    id: 'ID',
    rps: 'RPS',
    qps: 'QPS',
    tdd: 'TDD',
    mvp: 'MVP',
    faq: 'FAQ',
    faqs: 'FAQs',
    cms: 'CMS',
    crm: 'CRM',
    llm: 'LLM',
    ai: 'AI',
    aws: 'AWS',
    gcp: 'GCP'
  };

  /**
   * Turn a raw variable name into a human label plus a placeholder hint.
   *
   * The shipped library uses names like `scale_requirements_e_g_100k_rps`,
   * which rendered as the label "Scale requirements e g 100k rps". The `_e_g_`
   * marker is really an example, so it is split out and used as the input's
   * placeholder instead.
   */
  function describeName(name) {
    var raw = String(name || '').trim();
    if (!raw) return { label: 'Value', hint: '' };

    // camelCase and PascalCase to snake, then normalise separators.
    var norm = raw
      .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
      .replace(/[\s\-.]+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');

    var hint = '';
    var labelPart = norm;

    var egMatch = norm.match(/^(.*?)_?e_g_(.+)$/i);
    if (egMatch && egMatch[1]) {
      labelPart = egMatch[1];
      hint = 'e.g. ' + humanise(egMatch[2], false);
    } else {
      var exampleMatch = norm.match(/^(.*?)_(?:example|examples|such_as|like)_(.+)$/i);
      if (exampleMatch && exampleMatch[1]) {
        labelPart = exampleMatch[1];
        hint = 'e.g. ' + humanise(exampleMatch[2], false);
      }
    }

    return { label: humanise(labelPart, true), hint: hint };
  }

  function humanise(str, capitalise) {
    var words = String(str || '')
      .split('_')
      .filter(Boolean)
      .map(function (w) {
        var lower = w.toLowerCase();
        if (ACRONYMS[lower]) return ACRONYMS[lower];
        return lower;
      });

    if (!words.length) return capitalise ? 'Value' : '';

    var joined = words.join(' ');
    if (!capitalise) return joined;

    // Only lift the first character so acronyms keep their casing.
    return joined.charAt(0).toUpperCase() + joined.slice(1);
  }

  /* =====================================================================
     Field type inference
     ===================================================================== */

  var LONG_FORM_NAME_RE = /(code|diff|snippet|transcript|error|stack|trace|log|logs|query|json|yaml|schema|summary|notes|note|spec|content|body|article|draft|text|details|description|requirements|data|essay|copy|email_body|paragraph|abstract|feedback|reviews|answers|faqs)/i;

  var SHORT_FORM_NAME_RE = /(name|title|language|tone|role|count|number|days|minutes|duration|year|month|date|time|url|keyword|keywords|niche|topic|industry|audience|framework|platform|format|style|version|budget|price|timezone|city|country|company|brand|product|goal|metric|type|flavor|flavour|engine|library|model)/i;

  /**
   * Prefer the template's own shape over the variable's name. A token sitting
   * alone on a line or inside a fenced code block wants a textarea whatever it
   * is called.
   */
  function inferType(name, template) {
    var n = String(name || '');

    if (template) {
      var ctx = tokenContext(template, n);
      if (ctx.insideFence || ctx.insideBlockQuote) return 'textarea';
      if (ctx.ownLine) return 'textarea';
      if (ctx.inline) {
        // An inline token in running prose is almost always a short value.
        if (LONG_FORM_NAME_RE.test(n) && !SHORT_FORM_NAME_RE.test(n)) return 'textarea';
        return 'text';
      }
    }

    if (LONG_FORM_NAME_RE.test(n) && !SHORT_FORM_NAME_RE.test(n)) return 'textarea';
    return 'text';
  }

  /**
   * Locate a token in the template and report the surrounding structure.
   * Fence detection counts the ``` markers that appear before the token.
   */
  function tokenContext(template, name) {
    var out = { insideFence: false, insideBlockQuote: false, ownLine: false, inline: false, found: false };
    var tpl = String(template || '');
    var pattern = new RegExp('\\{\\{\\s*' + escapeRegex(name) + '\\s*(?:[|:][^{}]*)?\\}\\}');
    var m = tpl.match(pattern);
    if (!m) return out;

    out.found = true;
    var idx = tpl.indexOf(m[0]);
    var before = tpl.slice(0, idx);

    var fenceCount = (before.match(/```/g) || []).length;
    out.insideFence = fenceCount % 2 === 1;

    var quoteCount = (before.match(/"""/g) || []).length;
    out.insideBlockQuote = quoteCount % 2 === 1;

    var lineStart = before.lastIndexOf('\n') + 1;
    var lineEndRel = tpl.slice(idx + m[0].length).indexOf('\n');
    var after = lineEndRel === -1 ? tpl.slice(idx + m[0].length) : tpl.slice(idx + m[0].length, idx + m[0].length + lineEndRel);
    var linePrefix = tpl.slice(lineStart, idx);

    out.ownLine = linePrefix.trim() === '' && after.trim() === '';
    out.inline = !out.ownLine;
    return out;
  }

  /* =====================================================================
     Suggestions for common short fields
     ===================================================================== */

  var SUGGESTIONS = {
    language: ['JavaScript', 'TypeScript', 'Python', 'Go', 'Rust', 'Java', 'C#', 'PHP', 'Ruby', 'Swift', 'Kotlin', 'SQL'],
    tone: ['Professional', 'Friendly', 'Confident', 'Direct', 'Playful', 'Empathetic', 'Authoritative', 'Casual'],
    test_framework: ['Jest', 'Vitest', 'Pytest', 'JUnit', 'RSpec', 'Go test', 'Mocha'],
    database_engine: ['PostgreSQL', 'MySQL', 'SQLite', 'SQL Server', 'Oracle', 'MongoDB'],
    format: ['Markdown', 'Plain text', 'JSON', 'Table', 'Bullet list', 'Numbered steps'],
    audience: ['Developers', 'Executives', 'Beginners', 'Investors', 'End users', 'Technical buyers'],
    target_audience: ['Developers', 'Executives', 'Beginners', 'Investors', 'End users', 'Technical buyers'],
    business_model: ['B2B SaaS', 'B2C SaaS', 'Ecommerce', 'Marketplace', 'Agency', 'Open source'],
    timeframe: ['7 days', '30 days', '90 days', '6 months', '1 year']
  };

  function suggestionsFor(name) {
    var n = String(name || '').toLowerCase();
    if (SUGGESTIONS[n]) return SUGGESTIONS[n].slice();
    var keys = Object.keys(SUGGESTIONS);
    for (var i = 0; i < keys.length; i++) {
      if (n.indexOf(keys[i]) !== -1) return SUGGESTIONS[keys[i]].slice();
    }
    return [];
  }

  /* =====================================================================
     Parsing
     ===================================================================== */

  function escapeRegex(str) {
    return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Split the inside of one {{token}} into its parts.
   *
   *   {{name}}                  a blank field
   *   {{name|default}}          a field with a pre-filled value
   *   {{name:One|Two|Three}}    a dropdown; the first option is the default
   *   {{@shortcut}}             a context block, expanded from another prompt
   *
   * A colon only means "dropdown" when it comes before any pipe, so a default
   * such as {{time|10:30}} keeps working.
   */
  function parseToken(inner) {
    var raw = String(inner || '');
    var trimmed = raw.trim();
    if (trimmed.charAt(0) === '@') {
      return { name: trimmed, inlineDefault: '', options: [], isBlock: true };
    }

    var pipeIdx = raw.indexOf('|');
    var colonIdx = raw.indexOf(':');

    if (colonIdx > 0 && (pipeIdx === -1 || colonIdx < pipeIdx)) {
      var selName = raw.slice(0, colonIdx).trim();
      var options = raw
        .slice(colonIdx + 1)
        .split('|')
        .map(function (o) {
          return o.trim();
        })
        .filter(Boolean);
      if (selName) {
        return { name: selName, inlineDefault: options[0] || '', options: options, isBlock: false };
      }
    }

    var name = (pipeIdx === -1 ? raw : raw.slice(0, pipeIdx)).trim();
    var inlineDefault = pipeIdx === -1 ? '' : raw.slice(pipeIdx + 1).trim();
    return { name: name, inlineDefault: inlineDefault, options: [], isBlock: false };
  }

  /* =====================================================================
     Context blocks
     ===================================================================== */

  var BLOCK_RE = /\{\{\s*@([^{}\s]+)\s*\}\}/g;
  var MAX_BLOCK_DEPTH = 4;

  /** Names of the {{@blocks}} a template uses, without the @, in order. */
  function listBlocks(template) {
    var out = [];
    var seen = {};
    var m;
    var tpl = String(template || '');
    BLOCK_RE.lastIndex = 0;
    while ((m = BLOCK_RE.exec(tpl)) !== null) {
      var key = m[1].toLowerCase();
      if (seen[key]) continue;
      seen[key] = true;
      out.push(m[1]);
    }
    return out;
  }

  /**
   * Replace every {{@name}} with the text `resolve(name)` returns.
   *
   * Blocks may contain blocks, up to a small depth. A block that refers back
   * to itself, directly or through others, is left as written instead of
   * looping. Unknown names are left in place and reported in `missing`.
   */
  function expandBlocks(template, resolve) {
    var used = [];
    var missing = [];
    var usedSeen = {};
    var missingSeen = {};

    function expand(text, stack, depth) {
      return String(text || '').replace(BLOCK_RE, function (match, name) {
        var key = name.toLowerCase();
        if (depth >= MAX_BLOCK_DEPTH || stack.indexOf(key) !== -1) return match;
        var body = typeof resolve === 'function' ? resolve(name) : null;
        if (typeof body !== 'string') {
          if (!missingSeen[key]) {
            missingSeen[key] = true;
            missing.push(name);
          }
          return match;
        }
        if (!usedSeen[key]) {
          usedSeen[key] = true;
          used.push(name);
        }
        return expand(body, stack.concat([key]), depth + 1);
      });
    }

    var text = expand(template, [], 0);
    return { text: text, used: used, missing: missing };
  }

  /**
   * Read every distinct {{token}} out of a template and return a descriptor
   * per variable, in first-appearance order.
   */
  function parseVariables(template) {
    var tpl = String(template || '');
    var seen = {};
    var out = [];
    var m;

    TOKEN_RE.lastIndex = 0;
    while ((m = TOKEN_RE.exec(tpl)) !== null) {
      var token = parseToken(m[1]);
      // Blocks are expanded from other prompts, never asked for in the form.
      if (token.isBlock) continue;
      var name = token.name;
      var inlineDefault = token.inlineDefault;
      if (!name) continue;

      var key = name.toLowerCase();
      if (seen[key]) {
        if (inlineDefault && !seen[key].default) seen[key].default = inlineDefault;
        if (token.options.length && !seen[key].options.length) {
          seen[key].options = token.options.slice();
          seen[key].type = 'select';
        }
        continue;
      }

      var described = describeName(name);
      var descriptor = {
        name: name,
        label: described.label,
        hint: described.hint,
        type: token.options.length ? 'select' : inferType(name, tpl),
        autofill: token.options.length ? null : detectAutofill(name),
        default: inlineDefault,
        options: token.options.slice(),
        suggestions: token.options.length ? [] : suggestionsFor(name),
        required: true
      };
      seen[key] = descriptor;
      out.push(descriptor);
    }

    return out;
  }

  /**
   * Merge parsed tokens with any declarative `variables` array on the prompt.
   * The declaration wins for label, type, options and default, but a token
   * that only exists in the template still shows up, so a prompt can never
   * present a field the template will not use.
   */
  function resolveVariables(prompt) {
    var p = prompt || {};
    var parsed = parseVariables(p.template);
    var declared = Array.isArray(p.variables) ? p.variables : [];

    var byName = {};
    parsed.forEach(function (v) {
      byName[v.name.toLowerCase()] = v;
    });

    declared.forEach(function (d) {
      if (!d || typeof d.name !== 'string') return;
      var key = d.name.toLowerCase();
      var target = byName[key];
      if (!target) return; // declared but unused: ignore rather than mislead
      if (typeof d.label === 'string' && d.label.trim()) target.label = d.label.trim();
      if (typeof d.hint === 'string') target.hint = d.hint;
      if (typeof d.type === 'string' && ['text', 'textarea', 'select'].indexOf(d.type) !== -1) {
        target.type = d.type;
      }
      if (Array.isArray(d.options) && d.options.length) {
        target.options = d.options.map(String);
        target.type = 'select';
      }
      if (typeof d.default === 'string' && d.default) target.default = d.default;
      if (typeof d.autofill === 'string') {
        target.autofill = d.autofill === 'none' ? null : d.autofill;
      }
      if (typeof d.required === 'boolean') target.required = d.required;
    });

    return parsed;
  }

  function hasVariables(template) {
    TOKEN_RE.lastIndex = 0;
    return TOKEN_RE.test(String(template || ''));
  }

  /** Kept for callers that only need the raw names. */
  function extractVariables(template) {
    return parseVariables(template).map(function (v) {
      return v.name;
    });
  }

  /* =====================================================================
     Rendering
     ===================================================================== */

  /**
   * Substitute values into a template.
   *
   * The replacement is a function, so `$&`, `$1` and `` $` `` inside a user's
   * value are inserted literally instead of being read as regex substitution
   * patterns.
   */
  function render(template, values, opts) {
    var o = opts || {};
    var tpl = String(template || '');
    var vals = values || {};

    // Case-insensitive lookup so {{Code}} and {{code}} share one value.
    var lookup = {};
    Object.keys(vals).forEach(function (k) {
      lookup[String(k).toLowerCase()] = vals[k];
    });

    var missing = [];

    var out = tpl.replace(TOKEN_RE, function (match, inner) {
      var token = parseToken(inner);
      // A block that was not expanded stays exactly as written.
      if (token.isBlock) return match;
      var name = token.name;
      var inlineDefault = token.inlineDefault;
      if (!name) return match;

      var raw = lookup[name.toLowerCase()];
      var value = raw === undefined || raw === null ? '' : String(raw);

      if (!value) value = inlineDefault;

      if (!value) {
        missing.push(name);
        if (o.keepEmptyTokens) return match;
        if (o.blankMissing) return '';
        // A visible placeholder beats a silently truncated prompt.
        return '[' + name + ']';
      }

      return value;
    });

    return o.withMeta ? { text: out, missing: missing } : out;
  }

  /** True when every required variable has a usable value. */
  function validate(prompt, values) {
    var vars = resolveVariables(prompt);
    var vals = values || {};
    var lookup = {};
    Object.keys(vals).forEach(function (k) {
      lookup[String(k).toLowerCase()] = vals[k];
    });

    var missing = [];
    vars.forEach(function (v) {
      if (!v.required) return;
      var raw = lookup[v.name.toLowerCase()];
      var value = raw === undefined || raw === null ? '' : String(raw).trim();
      if (!value && !v.default) missing.push(v);
    });
    return { ok: missing.length === 0, missing: missing };
  }

  /* =====================================================================
     Auto-fill resolution
     ===================================================================== */

  /**
   * Build the starting values for a prompt's form.
   *
   * `context` supplies whatever the caller already knows without asking the
   * browser for permission: `selection`, `url`, `title`, and optionally
   * `clipboard` when the user has explicitly enabled clipboard auto-fill.
   * Nothing here performs I/O, so this function cannot trigger a permission
   * prompt as a side effect of opening a modal.
   */
  function buildInitialValues(prompt, context, opts) {
    var ctx = context || {};
    var o = opts || {};
    var allowClipboard = !!o.allowClipboard;
    var cached = o.cached || {};
    var vars = resolveVariables(prompt);
    var now = new Date();

    var values = {};
    var filledFrom = {};

    vars.forEach(function (v) {
      var cachedVal = cached[v.name];
      if (cachedVal !== undefined && cachedVal !== '') {
        values[v.name] = cachedVal;
        filledFrom[v.name] = 'previous';
        return;
      }

      var resolved = '';
      switch (v.autofill) {
        case AUTOFILL.SELECTION:
          resolved = ctx.selection || '';
          if (resolved) filledFrom[v.name] = AUTOFILL.SELECTION;
          break;
        case AUTOFILL.CLIPBOARD:
          if (allowClipboard && ctx.clipboard) {
            resolved = ctx.clipboard;
            filledFrom[v.name] = AUTOFILL.CLIPBOARD;
          }
          break;
        case AUTOFILL.URL:
          resolved = ctx.url || '';
          if (resolved) filledFrom[v.name] = AUTOFILL.URL;
          break;
        case AUTOFILL.PAGE_TITLE:
          resolved = ctx.title || '';
          if (resolved) filledFrom[v.name] = AUTOFILL.PAGE_TITLE;
          break;
        case AUTOFILL.DATE:
          resolved = now.toLocaleDateString();
          filledFrom[v.name] = AUTOFILL.DATE;
          break;
        case AUTOFILL.TIME:
          resolved = now.toLocaleTimeString();
          filledFrom[v.name] = AUTOFILL.TIME;
          break;
        case AUTOFILL.DATETIME:
          resolved = now.toLocaleString();
          filledFrom[v.name] = AUTOFILL.DATETIME;
          break;
        default:
          resolved = '';
      }

      if (!resolved && v.default) {
        resolved = v.default;
        filledFrom[v.name] = 'default';
      }

      values[v.name] = resolved;
    });

    return { values: values, filledFrom: filledFrom, variables: vars };
  }

  /**
   * Label for the badge shown next to a field, or '' when nothing was filled.
   * The old UI showed "Auto: Selection" even when the field was empty because
   * the badge was derived from the name rather than the outcome.
   */
  function autofillBadge(source) {
    if (!source) return '';
    if (source === 'previous') return 'Restored';
    if (source === 'default') return 'Default';
    return AUTOFILL_LABELS[source] || '';
  }

  /* =====================================================================
     Prompt normalisation
     ===================================================================== */

  /**
   * Attach a cached variable descriptor list to a prompt. Called by the store
   * so every consumer sees the same parsed shape.
   */
  function normalizePrompt(prompt) {
    if (!prompt || typeof prompt !== 'object') return prompt;
    var out = {};
    Object.keys(prompt).forEach(function (k) {
      out[k] = prompt[k];
    });
    if (!out.description && out.template) {
      out.description = String(out.template).replace(/\s+/g, ' ').trim().slice(0, 110);
    }
    if (typeof out.template !== 'string') out.template = '';
    if (!Array.isArray(out.tags)) out.tags = [];
    return out;
  }

  /** Count of fields the user will actually be asked to fill. */
  function variableCount(prompt) {
    return resolveVariables(prompt).length;
  }

  return {
    AUTOFILL: AUTOFILL,
    AUTOFILL_LABELS: AUTOFILL_LABELS,
    TOKEN_RE: TOKEN_RE,

    parseVariables: parseVariables,
    resolveVariables: resolveVariables,
    extractVariables: extractVariables,
    hasVariables: hasVariables,
    variableCount: variableCount,

    render: render,
    validate: validate,

    describeName: describeName,
    detectAutofill: detectAutofill,
    inferType: inferType,
    tokenContext: tokenContext,
    suggestionsFor: suggestionsFor,

    buildInitialValues: buildInitialValues,
    autofillBadge: autofillBadge,

    normalizePrompt: normalizePrompt,
    escapeRegex: escapeRegex,

    parseToken: parseToken,
    listBlocks: listBlocks,
    expandBlocks: expandBlocks
  };
});
