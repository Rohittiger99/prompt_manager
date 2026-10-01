/**
 * OmniPrompt - Import adapters
 *
 * Reads prompt collections out of the formats people actually have, so
 * switching to OmniPrompt is not a retyping exercise:
 *
 *   - OmniPrompt bundles (handled upstream in promptStore)
 *   - a bare JSON array of prompt-ish objects
 *   - a flat JSON object of "name": "prompt text" pairs
 *   - AIPRM-style exports (Title / Prompt / Teaser / Community fields)
 *   - generic JSON with a nested list under prompts / items / data / snippets
 *   - CSV or TSV with a header row
 *   - SKILL.md skill files (front matter with name and description)
 *   - Markdown, where each heading becomes a prompt and its body the template
 *   - plain text split on --- separators
 *
 * Every adapter returns the same neutral shape. Field naming is resolved
 * through one alias table rather than per-format special cases.
 */

(function (root, factory) {
  'use strict';
  var api = factory();
  root.OmniImporters = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* =====================================================================
     Field aliases
     ===================================================================== */

  var ALIASES = {
    title: ['title', 'name', 'promptname', 'prompt_name', 'label', 'heading', 'subject', 'command'],
    template: [
      'template',
      'prompt',
      'prompttext',
      'prompt_text',
      'text',
      'content',
      'body',
      'value',
      'message',
      'instruction',
      'instructions',
      'snippet'
    ],
    description: ['description', 'teaser', 'summary', 'desc', 'subtitle', 'note', 'notes', 'prompthint', 'prompt_hint'],
    category: ['category', 'folder', 'group', 'topic', 'collection', 'section'],
    tags: ['tags', 'keywords', 'labels', 'tag'],
    shortcut: ['shortcut', 'slug', 'trigger', 'abbreviation', 'alias', 'key', 'hotstring', 'snippetshortcut']
  };

  function canonicalKey(key) {
    var k = String(key || '')
      .toLowerCase()
      .replace(/[\s\-]+/g, '_')
      .replace(/[^a-z0-9_]/g, '');
    var flat = k.replace(/_/g, '');
    var names = Object.keys(ALIASES);
    for (var i = 0; i < names.length; i++) {
      var list = ALIASES[names[i]];
      for (var j = 0; j < list.length; j++) {
        if (flat === list[j].replace(/_/g, '')) return names[i];
      }
    }
    return null;
  }

  /**
   * Map one arbitrary object onto our prompt fields.
   * Returns null when there is no usable template text.
   */
  function mapRecord(rec) {
    if (!rec || typeof rec !== 'object') return null;

    var out = {};
    Object.keys(rec).forEach(function (key) {
      var canon = canonicalKey(key);
      if (!canon) return;
      var value = rec[key];
      if (value === null || value === undefined) return;

      if (canon === 'tags') {
        out.tags = Array.isArray(value)
          ? value.map(String)
          : String(value)
              .split(/[,;|]/)
              .map(function (t) {
                return t.trim();
              })
              .filter(Boolean);
        return;
      }

      if (typeof value === 'object') return;
      var str = String(value).trim();
      if (!str) return;
      // First alias to produce a value wins, so a file with both `prompt` and
      // `text` does not overwrite the better field with the weaker one.
      if (out[canon] === undefined) out[canon] = str;
    });

    if (!out.template) return null;
    if (!out.title) {
      out.title = out.template.replace(/\s+/g, ' ').trim().slice(0, 60) || 'Imported prompt';
    }
    if (typeof rec.id === 'string' && rec.id.trim()) out.id = rec.id.trim();
    return out;
  }

  function mapMany(list) {
    var out = [];
    (list || []).forEach(function (rec) {
      var mapped = mapRecord(rec);
      if (mapped) out.push(mapped);
    });
    return out;
  }

  /* =====================================================================
     CSV / TSV
     ===================================================================== */

  /**
   * Split delimited text into rows, honouring quoted fields and embedded
   * newlines. Prompt templates are multi-line, so a naive split on "\n" would
   * shred them.
   */
  function parseDelimited(text, delimiter) {
    var rows = [];
    var row = [];
    var field = '';
    var inQuotes = false;
    var src = String(text).replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    for (var i = 0; i < src.length; i++) {
      var ch = src[i];

      if (inQuotes) {
        if (ch === '"') {
          if (src[i + 1] === '"') {
            field += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          field += ch;
        }
        continue;
      }

      if (ch === '"') {
        inQuotes = true;
      } else if (ch === delimiter) {
        row.push(field);
        field = '';
      } else if (ch === '\n') {
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
      } else {
        field += ch;
      }
    }

    row.push(field);
    rows.push(row);

    return rows.filter(function (r) {
      return r.some(function (c) {
        return String(c).trim() !== '';
      });
    });
  }

  function detectDelimiter(text) {
    var firstLine = String(text).split('\n')[0] || '';
    var tabs = (firstLine.match(/\t/g) || []).length;
    var commas = (firstLine.match(/,/g) || []).length;
    var semis = (firstLine.match(/;/g) || []).length;
    if (tabs >= commas && tabs >= semis && tabs > 0) return '\t';
    if (semis > commas) return ';';
    return ',';
  }

  function parseCsv(text) {
    var delimiter = detectDelimiter(text);
    var rows = parseDelimited(text, delimiter);
    if (rows.length < 2) return { ok: false, error: 'CSV needs a header row and at least one prompt.' };

    var header = rows[0].map(function (h) {
      return String(h).trim();
    });

    // A header with no recognisable column means this is not a prompt export.
    var recognised = header.filter(function (h) {
      return canonicalKey(h) !== null;
    });
    if (!recognised.length) {
      return { ok: false, error: 'No recognisable columns. Expected a title and prompt column.' };
    }

    var records = [];
    for (var i = 1; i < rows.length; i++) {
      var rec = {};
      header.forEach(function (h, idx) {
        rec[h] = rows[i][idx];
      });
      records.push(rec);
    }

    var prompts = mapMany(records);
    if (!prompts.length) return { ok: false, error: 'No rows contained prompt text.' };
    return { ok: true, prompts: prompts, folders: [], source: delimiter === '\t' ? 'tsv' : 'csv' };
  }

  /* =====================================================================
     Markdown
     ===================================================================== */

  /**
   * Treat each ATX heading as a prompt boundary. The heading text is the
   * title; everything until the next heading of the same or higher level is
   * the template. A leading `> quote` line is read as the description.
   */
  function parseMarkdown(text) {
    var lines = String(text).replace(/\r\n/g, '\n').split('\n');
    var sections = [];
    var current = null;
    var inFence = false;

    lines.forEach(function (line) {
      if (/^\s*```/.test(line)) inFence = !inFence;

      var headingMatch = inFence ? null : line.match(/^(#{1,4})\s+(.*\S)\s*$/);
      if (headingMatch) {
        if (current) sections.push(current);
        current = { level: headingMatch[1].length, title: headingMatch[2].trim(), body: [] };
        return;
      }
      if (current) current.body.push(line);
    });
    if (current) sections.push(current);

    var prompts = [];
    sections.forEach(function (s) {
      var body = s.body.join('\n');
      var description = '';

      // Pull a leading blockquote out as the description.
      var quoteMatch = body.match(/^\s*((?:>\s?.*\n?)+)/);
      if (quoteMatch) {
        description = quoteMatch[1]
          .split('\n')
          .map(function (l) {
            return l.replace(/^\s*>\s?/, '').trim();
          })
          .filter(Boolean)
          .join(' ');
        body = body.slice(quoteMatch[1].length);
      }

      // A single fenced block is the prompt itself; unwrap it.
      var fenceOnly = body.trim().match(/^```[a-zA-Z0-9_-]*\n([\s\S]*?)\n?```$/);
      if (fenceOnly) body = fenceOnly[1];

      var template = body.replace(/^\n+|\n+$/g, '');
      if (!template.trim()) return;

      prompts.push({
        title: s.title,
        template: template,
        description: description
      });
    });

    if (!prompts.length) return { ok: false, error: 'No headings with content found in the Markdown.' };
    return { ok: true, prompts: prompts, folders: [], source: 'markdown' };
  }

  /* =====================================================================
     SKILL.md (Claude, ChatGPT and Mistral skills share this shape)
     ===================================================================== */

  var FRONTMATTER_RE = /^\s*---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n([\s\S]*))?$/;

  function unquote(value) {
    var v = String(value || '').trim();
    if ((v.charAt(0) === '"' && v.slice(-1) === '"') || (v.charAt(0) === "'" && v.slice(-1) === "'")) {
      v = v.slice(1, -1);
    }
    return v.trim();
  }

  function slugify(str, max) {
    return String(str || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, max || 64);
  }

  /** True when the text opens with a YAML front-matter block that names a skill. */
  function looksLikeSkillMd(text) {
    var m = String(text || '').match(FRONTMATTER_RE);
    return !!(m && /^\s*(name|title)\s*:/m.test(m[1]));
  }

  /**
   * Read one SKILL.md file. The front matter supplies the name, description
   * and tags; everything after it is the prompt text.
   */
  function parseSkillMd(text) {
    var m = String(text || '').replace(/^\uFEFF/, '').match(FRONTMATTER_RE);
    if (!m) return { ok: false, error: 'No front matter found.' };

    var meta = {};
    m[1].split(/\r?\n/).forEach(function (line) {
      var kv = line.match(/^\s*([A-Za-z_][\w-]*)\s*:\s*(.*)$/);
      if (kv) meta[kv[1].toLowerCase()] = kv[2];
    });

    var name = unquote(meta.name || meta.title || '');
    var body = String(m[2] || '').replace(/^\s+|\s+$/g, '');
    if (!name || !body) return { ok: false, error: 'A skill needs a name and some instructions.' };

    var tags = [];
    if (meta.tags) {
      tags = unquote(meta.tags)
        .replace(/^\[|\]$/g, '')
        .split(',')
        .map(function (t) {
          return unquote(t);
        })
        .filter(Boolean);
    }

    var title = name
      .replace(/[-_]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    title = title.charAt(0).toUpperCase() + title.slice(1);

    return {
      ok: true,
      prompts: [
        {
          title: title,
          shortcut: slugify(name, 24),
          description: unquote(meta.description || ''),
          tags: tags,
          template: body
        }
      ],
      folders: [],
      source: 'skill-md'
    };
  }

  /** Write a prompt as a SKILL.md file that other AI tools can load. */
  function toSkillMd(prompt) {
    var p = prompt || {};
    var name = slugify(p.shortcut || p.title || 'omniprompt-skill', 64) || 'omniprompt-skill';
    var description = String(p.description || p.title || '')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/"/g, "'");
    var lines = ['---', 'name: ' + name, 'description: "' + description + '"'];
    if (Array.isArray(p.tags) && p.tags.length) lines.push('tags: [' + p.tags.join(', ') + ']');
    lines.push('---', '', String(p.template || '').replace(/\s+$/, ''), '');
    return lines.join('\n');
  }

  /* =====================================================================
     Plain text
     ===================================================================== */

  /** Split on a --- or === separator line; first line of each block is the title. */
  function parsePlainText(text) {
    var blocks = String(text)
      .replace(/\r\n/g, '\n')
      .split(/\n\s*(?:-{3,}|={3,})\s*\n/);

    var prompts = [];
    blocks.forEach(function (block) {
      var trimmed = block.replace(/^\n+|\n+$/g, '');
      if (!trimmed.trim()) return;
      var lines = trimmed.split('\n');
      var title = lines[0].replace(/^#+\s*/, '').trim();
      var rest = lines.slice(1).join('\n').replace(/^\n+/, '');
      if (!rest.trim()) {
        // Single-line block: the line is both title and template.
        prompts.push({ title: title.slice(0, 60), template: trimmed });
      } else {
        prompts.push({ title: title.slice(0, 80) || 'Imported prompt', template: rest });
      }
    });

    if (!prompts.length) return { ok: false, error: 'No prompt blocks found.' };
    return { ok: true, prompts: prompts, folders: [], source: 'text' };
  }

  /* =====================================================================
     JSON shapes
     ===================================================================== */

  var LIST_KEYS = ['prompts', 'items', 'data', 'snippets', 'records', 'results', 'list', 'entries', 'templates'];

  function looksLikeAiprm(list) {
    if (!Array.isArray(list) || !list.length) return false;
    var sample = list[0];
    if (!sample || typeof sample !== 'object') return false;
    var keys = Object.keys(sample);
    var hasTitle = keys.indexOf('Title') !== -1;
    var hasPrompt = keys.indexOf('Prompt') !== -1;
    var aiprmish =
      keys.indexOf('Teaser') !== -1 ||
      keys.indexOf('PromptHint') !== -1 ||
      keys.indexOf('AuthorName') !== -1 ||
      keys.indexOf('Community') !== -1 ||
      keys.indexOf('PromptTypeNo') !== -1;
    return hasTitle && hasPrompt && aiprmish;
  }

  function parseJsonPayload(data) {
    if (Array.isArray(data)) {
      if (looksLikeAiprm(data)) {
        var aiprm = mapMany(data);
        if (aiprm.length) return { ok: true, prompts: aiprm, folders: [], source: 'aiprm' };
      }
      var mapped = mapMany(data);
      if (mapped.length) return { ok: true, prompts: mapped, folders: [], source: 'json-array' };

      // An array of bare strings is still a usable prompt list.
      var strings = data.filter(function (d) {
        return typeof d === 'string' && d.trim();
      });
      if (strings.length) {
        return {
          ok: true,
          prompts: strings.map(function (s) {
            return { title: s.replace(/\s+/g, ' ').trim().slice(0, 60), template: s };
          }),
          folders: [],
          source: 'string-array'
        };
      }
      return { ok: false, error: 'That array contained no prompt text.' };
    }

    if (!data || typeof data !== 'object') {
      return { ok: false, error: 'Unsupported JSON payload.' };
    }

    for (var i = 0; i < LIST_KEYS.length; i++) {
      var candidate = data[LIST_KEYS[i]];
      if (Array.isArray(candidate) && candidate.length) {
        var nested = parseJsonPayload(candidate);
        if (nested.ok) {
          var folders = Array.isArray(data.folders) ? data.folders : [];
          nested.folders = folders;
          return nested;
        }
      }
    }

    // A flat object keyed by prompt name: { "Fix grammar": "Proofread ..." }
    var keys = Object.keys(data);
    var flat = [];
    keys.forEach(function (k) {
      if (typeof data[k] === 'string' && data[k].trim()) {
        flat.push({ title: k, template: data[k] });
      }
    });
    if (flat.length) return { ok: true, prompts: flat, folders: [], source: 'json-map' };

    // Finally, a single prompt object.
    var one = mapRecord(data);
    if (one) return { ok: true, prompts: [one], folders: [], source: 'json-single' };

    return { ok: false, error: 'No prompts found in that JSON.' };
  }

  /* =====================================================================
     Entry point
     ===================================================================== */

  /**
   * Work out what the payload is and parse it. Accepts a parsed object or
   * array, or raw file text.
   */
  function detectAndParse(payload) {
    if (payload === null || payload === undefined) {
      return { ok: false, error: 'Nothing to import.' };
    }

    if (typeof payload === 'object') {
      return parseJsonPayload(payload);
    }

    var text = String(payload).replace(/^\uFEFF/, '');
    if (!text.trim()) return { ok: false, error: 'The file is empty.' };

    // Checked first: the plain-text reader would split the front matter on
    // its --- lines and turn one skill into three broken prompts.
    if (looksLikeSkillMd(text)) {
      var skill = parseSkillMd(text);
      if (skill.ok) return skill;
    }

    var head = text.trim().charAt(0);
    if (head === '{' || head === '[') {
      try {
        return parseJsonPayload(JSON.parse(text));
      } catch (e) {
        return { ok: false, error: 'That file looks like JSON but will not parse: ' + e.message };
      }
    }

    // Markdown headings are a strong signal, so check them before CSV.
    if (/^\s*#{1,4}\s+\S/m.test(text)) {
      var md = parseMarkdown(text);
      if (md.ok) return md;
    }

    var firstLine = text.split('\n')[0] || '';
    if (/[,;\t]/.test(firstLine)) {
      var csv = parseCsv(text);
      if (csv.ok) return csv;
    }

    return parsePlainText(text);
  }

  /** File extensions the pickers should accept. */
  var ACCEPT = '.json,.csv,.tsv,.md,.markdown,.txt';

  return {
    ACCEPT: ACCEPT,
    detectAndParse: detectAndParse,
    parseJsonPayload: parseJsonPayload,
    parseCsv: parseCsv,
    parseMarkdown: parseMarkdown,
    parsePlainText: parsePlainText,
    parseDelimited: parseDelimited,
    mapRecord: mapRecord,
    canonicalKey: canonicalKey,
    looksLikeAiprm: looksLikeAiprm,
    looksLikeSkillMd: looksLikeSkillMd,
    parseSkillMd: parseSkillMd,
    toSkillMd: toSkillMd
  };
});
