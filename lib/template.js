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
      return { name: trimmed, inlineDefault: '', options: [], isBlock: true, isDirective: false, isDateMath: false, strictRequired: false };
    }
    if (trimmed.charAt(0) === '#' || trimmed.charAt(0) === '/') {
      return { name: trimmed, inlineDefault: '', options: [], isBlock: true, isDirective: true, isDateMath: false, strictRequired: false };
    }
    if (/^(?:date|today)[+-]\d+[dwmy]$/i.test(trimmed)) {
      return { name: trimmed, inlineDefault: '', options: [], isBlock: false, isDirective: false, isDateMath: true, strictRequired: false };
    }

    var isStrictRequired = false;
    var pipeIdx = raw.indexOf('|');
    var colonIdx = raw.indexOf(':');

    if (colonIdx > 0 && (pipeIdx === -1 || colonIdx < pipeIdx)) {
      var selName = raw.slice(0, colonIdx).trim();
      if (selName.charAt(selName.length - 1) === '!') {
        isStrictRequired = true;
        selName = selName.slice(0, -1).trim();
      }
      var options = raw
        .slice(colonIdx + 1)
        .split('|')
        .map(function (o) {
          return o.trim();
        })
        .filter(Boolean);
      if (selName) {
        return { name: selName, inlineDefault: options[0] || '', options: options, isBlock: false, isDirective: false, isDateMath: false, strictRequired: isStrictRequired };
      }
    }

    var name = (pipeIdx === -1 ? raw : raw.slice(0, pipeIdx)).trim();
    if (name.charAt(name.length - 1) === '!') {
      isStrictRequired = true;
      name = name.slice(0, -1).trim();
    }
    var inlineDefault = pipeIdx === -1 ? '' : raw.slice(pipeIdx + 1).trim();
    return { name: name, inlineDefault: inlineDefault, options: [], isBlock: false, isDirective: false, isDateMath: false, strictRequired: isStrictRequired };
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

    // Detect repeat blocks so repeat variables have type: 'repeat'
    var REPEAT_RE = /\{\{#repeat\s+([a-zA-Z0-9_-]+)\}\}([\s\S]*?)\{\{\/repeat\}\}/gi;
    while ((m = REPEAT_RE.exec(tpl)) !== null) {
      var rName = m[1].trim();
      var rInner = m[2];
      var rKey = rName.toLowerCase();
      if (!seen[rKey]) {
        var rDesc = describeName(rName);
        var rDescriptor = {
          name: rName,
          label: rDesc.label,
          hint: 'Repeatable items',
          type: 'repeat',
          autofill: null,
          default: '',
          options: [],
          suggestions: [],
          required: false,
          strictRequired: false,
          repeatTemplate: rInner
        };
        seen[rKey] = rDescriptor;
        out.push(rDescriptor);
      }
    }

    // Detect conditionals so condition variable is included in form if not elsewhere
    var IF_HEAD_RE = /\{\{#if\s+([a-zA-Z0-9_-]+)(?:=[^{}]+)?\}\}/gi;
    while ((m = IF_HEAD_RE.exec(tpl)) !== null) {
      var ifName = m[1].trim();
      var ifKey = ifName.toLowerCase();
      if (!seen[ifKey]) {
        var ifDesc = describeName(ifName);
        var ifDescriptor = {
          name: ifName,
          label: ifDesc.label,
          hint: ifDesc.hint,
          type: inferType(ifName, tpl),
          autofill: detectAutofill(ifName),
          default: '',
          options: [],
          suggestions: suggestionsFor(ifName),
          required: false,
          strictRequired: false
        };
        seen[ifKey] = ifDescriptor;
        out.push(ifDescriptor);
      }
    }

    TOKEN_RE.lastIndex = 0;
    while ((m = TOKEN_RE.exec(tpl)) !== null) {
      var token = parseToken(m[1]);
      // Blocks, directives, and date math are not user form fields
      if (token.isBlock || token.isDirective || token.isDateMath) continue;
      var name = token.name;
      var inlineDefault = token.inlineDefault;
      if (!name) continue;

      var key = name.toLowerCase();
      if (seen[key]) {
        if (token.strictRequired) seen[key].strictRequired = true;
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
        required: true,
        strictRequired: !!token.strictRequired
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
    var p = typeof prompt === 'string' ? { template: prompt } : (prompt || {});
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
     Smart templates (Pro): conditionals, date maths, repeat blocks
     ===================================================================== */

  function computeDateMath(baseDate, offsetStr) {
    var m = /^([+-])(\d+)([dwmy])$/i.exec(String(offsetStr || '').trim());
    if (!m) return null;
    var sign = m[1] === '-' ? -1 : 1;
    var amount = parseInt(m[2], 10) * sign;
    var unit = m[3].toLowerCase();

    var d = new Date(baseDate.getTime());
    if (unit === 'd') {
      d.setDate(d.getDate() + amount);
    } else if (unit === 'w') {
      d.setDate(d.getDate() + amount * 7);
    } else if (unit === 'm') {
      var targetMonth = d.getMonth() + amount;
      var curDay = d.getDate();
      d.setDate(1);
      d.setMonth(targetMonth);
      var daysInTarget = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      d.setDate(Math.min(curDay, daysInTarget));
    } else if (unit === 'y') {
      var targetYear = d.getFullYear() + amount;
      var curMonth = d.getMonth();
      d.setFullYear(targetYear);
      if (d.getMonth() !== curMonth) {
        d.setDate(0);
      }
    }
    return d;
  }

  function expandDateMath(template) {
    var tpl = String(template || '');
    var DATE_MATH_RE = /\{\{(?:date|today)([+-]\d+[dwmy])\}\}/gi;
    var now = new Date();
    return tpl.replace(DATE_MATH_RE, function (match, offsetStr) {
      var d = computeDateMath(now, offsetStr);
      return d ? d.toLocaleDateString() : match;
    });
  }

  function expandConditionals(template, lookup) {
    var tpl = String(template || '');
    var IF_RE = /\{\{#if\s+([^{}]+?)\}\}((?:(?!\{\{#if\b)[\s\S])*?)\{\{\/if\}\}/gi;
    var passes = 0;
    while (passes < 10 && IF_RE.test(tpl)) {
      tpl = tpl.replace(IF_RE, function (match, condStr, body) {
        var parts = body.split(/\{\{#else\}\}/i);
        var truthy = parts[0];
        var falsy = parts.length > 1 ? parts.slice(1).join('{{#else}}') : '';

        var eqIdx = condStr.indexOf('=');
        var condMet = false;
        if (eqIdx !== -1) {
          var varName = condStr.slice(0, eqIdx).trim().toLowerCase();
          var targetVal = condStr.slice(eqIdx + 1).trim().toLowerCase();
          var actualVal = lookup[varName];
          condMet = actualVal !== undefined && actualVal !== null && String(actualVal).trim().toLowerCase() === targetVal;
        } else {
          var vName = condStr.trim().toLowerCase();
          var aVal = lookup[vName];
          condMet = aVal !== undefined && aVal !== null && String(aVal).trim().length > 0;
        }

        return condMet ? truthy : falsy;
      });
      passes += 1;
    }
    return tpl;
  }

  function expandRepeatBlocks(template, lookup) {
    var tpl = String(template || '');
    var REPEAT_RE = /\{\{#repeat\s+([a-zA-Z0-9_-]+)\}\}([\s\S]*?)\{\{\/repeat\}\}/gi;
    return tpl.replace(REPEAT_RE, function (match, varName, innerTpl) {
      var key = varName.toLowerCase();
      var raw = lookup[key];
      var list = Array.isArray(raw) ? raw : [];
      if (!list.length) return '';
      return list
        .map(function (itemVal) {
          var itemLookup = {};
          Object.keys(lookup).forEach(function (k) {
            itemLookup[k] = lookup[k];
          });
          itemLookup[key] = itemVal;
          return render(innerTpl, itemLookup, { keepEmptyTokens: false, blankMissing: false });
        })
        .join('');
    });
  }

  function hasSmartSyntax(template) {
    var tpl = String(template || '');
    if (/\{\{#(if|repeat)\b/i.test(tpl)) return true;
    if (/\{\{(?:date|today)[+-]\d+[dwmy]\}\}/i.test(tpl)) return true;
    if (/\{\{[a-zA-Z0-9_-]+![|:}]/.test(tpl)) return true;
    return false;
  }

  function lintTemplate(template) {
    var tpl = String(template || '');
    var errors = [];
    var ifOpens = (tpl.match(/\{\{#if\b/gi) || []).length;
    var ifCloses = (tpl.match(/\{\{\/if\}\}/gi) || []).length;
    if (ifOpens !== ifCloses) {
      errors.push('Unbalanced {{#if}} blocks: ' + ifOpens + ' opened, ' + ifCloses + ' closed.');
    }
    var repeatOpens = (tpl.match(/\{\{#repeat\b/gi) || []).length;
    var repeatCloses = (tpl.match(/\{\{\/repeat\}\}/gi) || []).length;
    if (repeatOpens !== repeatCloses) {
      errors.push('Unbalanced {{#repeat}} blocks: ' + repeatOpens + ' opened, ' + repeatCloses + ' closed.');
    }
    var badDate = /\{\{(?:date|today)[+-][^}]*\}\}/gi;
    var m;
    while ((m = badDate.exec(tpl)) !== null) {
      if (!/^\{\{(?:date|today)[+-]\d+[dwmy]\}\}$/i.test(m[0])) {
        errors.push('Invalid date maths format: ' + m[0] + ' (expected e.g. {{date+7d}}, {{date-1w}}, {{date+1m}}, {{date+1y}}).');
      }
    }
    return { ok: errors.length === 0, errors: errors, warnings: errors };
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

    // 1. Expand conditionals (#if ... #else ... /if)
    tpl = expandConditionals(tpl, lookup);

    // 2. Expand repeat blocks ({{#repeat var}}...{{/repeat}})
    tpl = expandRepeatBlocks(tpl, lookup);

    // 3. Expand date math tokens ({{date+7d}}, etc.)
    tpl = expandDateMath(tpl);

    var missing = [];

    var out = tpl.replace(TOKEN_RE, function (match, inner) {
      var token = parseToken(inner);
      // A block or directive that was not expanded stays exactly as written.
      if (token.isBlock || token.isDirective) return match;
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
      if (v.strictRequired) {
        if (!value) missing.push(v);
      } else {
        if (!value && !v.default) missing.push(v);
      }
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
   * `clipboard` when the user presses Paste in a form.
   * Nothing here performs I/O, so this function cannot trigger a permission
   * prompt as a side effect of opening a modal.
   */
  function buildInitialValues(prompt, context, opts) {
    var ctx = context || {};
    var o = opts || {};
    var allowClipboard = !!o.allowClipboard;
    var cached = o.cached || {};
    // Pro: the active workspace's values (keyed by normaliseKey) and the
    // short answers remembered from last time.
    var workspace = o.workspace || {};
    var remembered = o.remembered || {};
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

      // A workspace value beats page context: switching client should
      // change the client's name, not keep last week's.
      var wsVal = workspace[normaliseKey(v.name)];
      if (typeof wsVal === 'string' && wsVal !== '' && (!v.options.length || v.options.indexOf(wsVal) !== -1)) {
        values[v.name] = wsVal;
        filledFrom[v.name] = 'workspace';
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

      if (!resolved) {
        var lastVal = remembered[v.name];
        if (typeof lastVal === 'string' && lastVal !== '' && (!v.options.length || v.options.indexOf(lastVal) !== -1)) {
          resolved = lastVal;
          filledFrom[v.name] = 'remembered';
        }
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
    if (source === 'workspace') return 'Workspace';
    if (source === 'remembered') return 'Last used';
    if (source === 'set') return 'Saved values';
    return AUTOFILL_LABELS[source] || '';
  }

  /**
   * One spelling for a value's name, so a workspace field called
   * "Client name" matches {{client_name}}, {{Client-Name}} and
   * {{@client-name}}. lib/promptStore.js uses the same function.
   */
  function normaliseKey(name) {
    return String(name == null ? '' : name)
      .trim()
      .replace(/^\{\{\s*|\s*\}\}$/g, '')
      .replace(/^@/, '')
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, '_');
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
    normaliseKey: normaliseKey,

    normalizePrompt: normalizePrompt,
    escapeRegex: escapeRegex,

    parseToken: parseToken,
    listBlocks: listBlocks,
    expandBlocks: expandBlocks,

    hasSmartSyntax: hasSmartSyntax,
    lintTemplate: lintTemplate,
    computeDateMath: computeDateMath
  };
});
