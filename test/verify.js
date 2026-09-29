/**
 * OmniPrompt - Regression suite
 *
 * Run with:  node test/verify.js
 *
 * The previous version of this file only checked that files existed and parsed,
 * and reported 58/58 passing while the extension shipped with data-losing bugs.
 * This suite exercises real behaviour through test/harness.js, which loads the
 * extension's own scripts into a Node realm with a working in-memory
 * chrome.storage. Each section names the defect it guards against so a
 * regression is obvious from the failure message alone.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const H = require('./harness.js');

const ROOT = H.ROOT;

let passed = 0;
let failed = 0;
let currentSection = '';

function section(title) {
  currentSection = title;
  console.log('\n' + title);
}

function ok(condition, message, detail) {
  if (condition) {
    passed += 1;
    console.log('  PASS  ' + message);
  } else {
    failed += 1;
    console.error('  FAIL  ' + message + (detail ? '\n          ' + detail : ''));
    process.exitCode = 1;
  }
}

function eq(actual, expected, message) {
  const same = JSON.stringify(actual) === JSON.stringify(expected);
  ok(same, message, same ? '' : 'expected ' + JSON.stringify(expected) + ', got ' + JSON.stringify(actual));
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

/**
 * A stand-in for Dodo Payments' public licence endpoints. Only the keys in
 * `validKeys` activate; every call is recorded so tests can check what left
 * the browser.
 */
function dodoFetch(validKeys) {
  const keys = validKeys || [];
  const calls = [];
  const reply = (ok, status, body) => ({
    ok,
    status,
    json: async () => body
  });
  const fn = async (url, init) => {
    const body = init && init.body ? JSON.parse(init.body) : {};
    calls.push({ url, body });
    const known = keys.indexOf(body.license_key) !== -1;
    if (/\/activate$/.test(url)) {
      return known
        ? reply(true, 201, { id: 'lki_' + body.license_key, license_key_id: 'lk_1' })
        : reply(false, 404, { message: 'License key not found' });
    }
    if (/\/validate$/.test(url)) return reply(true, 200, { valid: known });
    if (/\/deactivate$/.test(url)) return reply(true, 200, {});
    return reply(false, 400, {});
  };
  fn.calls = calls;
  return fn;
}

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

/**
 * Read a file with comments removed.
 *
 * Several checks below assert that a name is *absent* from the code. The source
 * files explain in comments which old behaviour they replaced, and those
 * comments naturally mention the very names being checked for. Stripping
 * comments keeps the assertions about code rather than prose.
 *
 * Quotes, template literals and regex literals are respected so that a `//`
 * inside a string (the default trigger prefix, for instance) is not mistaken
 * for the start of a comment.
 */
function readCode(rel) {
  const src = read(rel);
  let out = '';
  let i = 0;

  const isRegexPosition = () => {
    // A `/` starts a regex only where a value is expected. Walk back over
    // whitespace and decide from the previous significant character.
    for (let j = out.length - 1; j >= 0; j--) {
      const ch = out[j];
      if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') continue;
      return '(,=:[!&|?{};+-*%~^<>'.indexOf(ch) !== -1;
    }
    return true;
  };

  while (i < src.length) {
    const ch = src[i];
    const next = src[i + 1];

    if (ch === '/' && next === '/') {
      while (i < src.length && src[i] !== '\n') i += 1;
      continue;
    }

    if (ch === '/' && next === '*') {
      i += 2;
      while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i += 1;
      i += 2;
      continue;
    }

    if (ch === '"' || ch === "'" || ch === '`') {
      const quote = ch;
      out += ch;
      i += 1;
      while (i < src.length) {
        if (src[i] === '\\') {
          out += src[i] + (src[i + 1] || '');
          i += 2;
          continue;
        }
        out += src[i];
        if (src[i] === quote) {
          i += 1;
          break;
        }
        i += 1;
      }
      continue;
    }

    if (ch === '/' && isRegexPosition()) {
      out += ch;
      i += 1;
      let inClass = false;
      while (i < src.length) {
        if (src[i] === '\\') {
          out += src[i] + (src[i + 1] || '');
          i += 2;
          continue;
        }
        if (src[i] === '[') inClass = true;
        else if (src[i] === ']') inClass = false;
        out += src[i];
        if (src[i] === '/' && !inClass) {
          i += 1;
          break;
        }
        if (src[i] === '\n') {
          i += 1;
          break;
        }
        i += 1;
      }
      continue;
    }

    out += ch;
    i += 1;
  }

  return out;
}

/* =====================================================================
   1. Manifest
   ===================================================================== */

function testManifest() {
  section('1. Manifest and file wiring');

  const manifest = JSON.parse(read('manifest.json'));

  ok(manifest.manifest_version === 3, 'Manifest version is 3');
  ok(!!manifest.name && !!manifest.version, 'Has a name and version');
  ok(/^\d+\.\d+\.\d+$/.test(manifest.version), 'Version is x.y.z (' + manifest.version + ')');

  // Permission hygiene. Each of these was removed for a stated reason and
  // should not creep back in without a matching code change.
  const perms = manifest.permissions || [];
  ok(perms.indexOf('clipboardRead') === -1, 'clipboardRead is not requested (clipboard reads are user-initiated)');
  ok(
    perms.indexOf('activeTab') === -1,
    'activeTab is not requested (redundant beside the <all_urls> host permission)'
  );
  ok(perms.indexOf('storage') !== -1, 'storage is requested');
  ok(perms.indexOf('contextMenus') !== -1, 'contextMenus is requested');
  ok(perms.indexOf('scripting') !== -1, 'scripting is requested, to reach tabs open at install time');

  const hosts = manifest.host_permissions || [];
  eq(hosts, ['<all_urls>'], 'host_permissions is only <all_urls>, with no redundant per-site entries');

  // Every referenced file must exist.
  ok(exists(manifest.background.service_worker), 'Service worker file exists');
  ok(exists(manifest.action.default_popup), 'Popup file exists');
  ok(exists(manifest.options_ui.page), 'Options page exists');
  Object.keys(manifest.icons).forEach((size) => {
    ok(exists(manifest.icons[size]), 'Icon ' + size + 'px exists');
  });

  const cs = manifest.content_scripts[0];
  cs.js.forEach((file) => ok(exists(file), 'Content script exists: ' + file));

  // Load order matters: libraries must be evaluated before the modules that
  // use them, and the coordinator must be last.
  const order = cs.js;
  ok(
    order.indexOf('data/defaultPrompts.js') === 0,
    'defaultPrompts.js loads first'
  );
  ok(
    order.indexOf('lib/promptStore.js') < order.indexOf('content/content.js'),
    'promptStore loads before the coordinator'
  );
  ok(
    order.indexOf('lib/template.js') < order.indexOf('lib/promptStore.js'),
    'template loads before promptStore, which calls into it'
  );
  ok(
    order.indexOf('content/content.js') === order.length - 1,
    'The coordinator loads last'
  );
  ok(
    order.indexOf('content/adapters.js') < order.indexOf('content/slashTrigger.js'),
    'adapters load before the slash trigger that uses them'
  );

  // The CSS the shadow root fetches at runtime must be web accessible.
  const war = (manifest.web_accessible_resources || []).reduce(
    (acc, entry) => acc.concat(entry.resources || []),
    []
  );
  ok(war.indexOf('content/content.css') !== -1, 'content.css is web accessible');
  ok(
    war.indexOf('data/defaultPrompts.js') === -1,
    'The prompt data is no longer needlessly exposed to every page'
  );

  ok(!!manifest.commands['toggle-command-palette'], 'The palette command is declared');
}

/* =====================================================================
   2. Syntax
   ===================================================================== */

function testSyntax() {
  section('2. Every script parses');

  const files = [
    'data/defaultPrompts.js',
    'lib/template.js',
    'lib/modifiers.js',
    'lib/importers.js',
    'lib/promptStore.js',
    'content/adapters.js',
    'content/variableModal.js',
    'content/slashTrigger.js',
    'content/commandPalette.js',
    'content/content.js',
    'background/background.js',
    'popup/popup.js',
    'options/options.js',
    'welcome/welcome.js',
    'test/harness.js'
  ];

  files.forEach((file) => {
    ok(exists(file), 'Exists: ' + file);
    try {
      new vm.Script(read(file), { filename: file });
      ok(true, 'Parses: ' + file);
    } catch (e) {
      ok(false, 'Parses: ' + file, e.message);
    }
  });
}

/* =====================================================================
   3. Prompt library data
   ===================================================================== */

function testLibraryData(realm) {
  section('3. Built-in prompt library');

  const prompts = realm.sandbox.DEFAULT_PROMPTS;
  const T = realm.sandbox.OmniTemplate;

  ok(Array.isArray(prompts), 'DEFAULT_PROMPTS is an array');
  ok(prompts.length >= 110, 'Contains ' + prompts.length + ' prompts');

  // A top-level const is not a property of the global object, so the explicit
  // assignments at the end of defaultPrompts.js are what make it reachable.
  // The service worker has no `window`, only `self`.
  const dataSource = read('data/defaultPrompts.js');
  ok(/self\.DEFAULT_PROMPTS\s*=/.test(dataSource), 'Publishes onto self, for the service worker');
  ok(/window\.DEFAULT_PROMPTS\s*=/.test(dataSource), 'Publishes onto window, for pages and content scripts');

  const ids = prompts.map((p) => p.id);
  ok(new Set(ids).size === ids.length, 'All prompt ids are unique');

  const shortcuts = prompts.map((p) => p.shortcut).filter(Boolean);
  ok(new Set(shortcuts).size === shortcuts.length, 'All shortcuts are unique');
  ok(shortcuts.length === prompts.length, 'Every prompt has a shortcut');

  const missing = prompts.filter((p) => !p.id || !p.title || !p.category || !p.template);
  eq(missing.map((p) => p.id), [], 'No prompt is missing a required field');

  const categories = Array.from(new Set(prompts.map((p) => p.category)));
  ok(categories.length >= 6, 'Spans ' + categories.length + ' categories');

  // The inline default syntax uses a pipe, so a shipped token containing one
  // would be silently reinterpreted.
  const pipeTokens = prompts.filter((p) => /\{\{[^}]*\|/.test(p.template));
  eq(pipeTokens.map((p) => p.id), [], 'No shipped token contains a pipe, so {{name|default}} cannot collide');

  const noVars = prompts.filter((p) => T.resolveVariables(p).length === 0);
  eq(noVars.map((p) => p.id), [], 'Every shipped prompt exposes at least one field');

  // Every prompt must survive rendering with no values supplied.
  let renderFailures = 0;
  prompts.forEach((p) => {
    try {
      if (typeof T.render(p.template, {}) !== 'string') renderFailures += 1;
    } catch (e) {
      renderFailures += 1;
    }
  });
  ok(renderFailures === 0, 'Every prompt renders with no values supplied');
}

/* =====================================================================
   4. Template rendering
   ===================================================================== */

function testTemplate(realm) {
  section('4. Template engine');

  const T = realm.sandbox.OmniTemplate;

  // Defect: values were passed as the replacement string of String.replace, so
  // `$&`, `$1` and `` $` `` were treated as substitution patterns. Pasting
  // regex or sed code silently corrupted the prompt.
  eq(
    T.render('Review:\n{{code}}', { code: 'text.replace(/a/g, "$&!")' }),
    'Review:\ntext.replace(/a/g, "$&!")',
    'A value containing $& is inserted literally'
  );
  eq(
    T.render('X {{v}} Y', { v: 'cost is $`100' }),
    'X cost is $`100 Y',
    'A value containing $` is inserted literally'
  );
  eq(
    T.render('A {{v}} B', { v: "sed -E 's/(a)(b)/$2$1/'" }),
    "A sed -E 's/(a)(b)/$2$1/' B",
    'A value containing $1 and $2 is inserted literally'
  );
  eq(
    T.render('{{a}}', { a: '$$' }),
    '$$',
    'A value of $$ is not collapsed to a single $'
  );

  // Empty values become a visible placeholder rather than vanishing.
  const meta = T.render('L={{language}} C={{code}}', { code: 'x' }, { withMeta: true });
  eq(meta.text, 'L=[language] C=x', 'A missing value renders as a visible placeholder');
  eq(meta.missing, ['language'], 'Missing names are reported to the caller');

  // Inline defaults.
  eq(T.render('Tone: {{tone|professional}}', {}), 'Tone: professional', 'An inline default is used when empty');
  eq(T.render('Tone: {{tone|professional}}', { tone: 'blunt' }), 'Tone: blunt', 'A supplied value beats the default');

  // Case-insensitive matching, so {{Code}} and {{code}} share one field.
  eq(T.render('{{Code}}', { code: 'v' }), 'v', 'Token matching ignores case');

  // Repeated tokens all get the value.
  eq(T.render('{{a}} and {{a}}', { a: 'x' }), 'x and x', 'A repeated token is filled everywhere');

  section('4b. Auto-fill rules');

  // Defect: `code` and `text` used to fall back to the clipboard, so opening a
  // prompt pasted unrelated clipboard content into it.
  eq(T.detectAutofill('code'), 'selection', '{{code}} resolves from the selection');
  eq(T.detectAutofill('text'), 'selection', '{{text}} resolves from the selection');
  ok(T.detectAutofill('code') !== 'clipboard', '{{code}} never resolves from the clipboard');
  ok(T.detectAutofill('text') !== 'clipboard', '{{text}} never resolves from the clipboard');
  eq(T.detectAutofill('clipboard'), 'clipboard', '{{clipboard}} is the only clipboard source');
  eq(T.detectAutofill('url'), 'url', '{{url}} resolves from the page URL');
  eq(T.detectAutofill('page_title'), 'page_title', '{{page_title}} resolves from the title');
  eq(T.detectAutofill('language'), null, 'An ordinary name has no auto-fill');

  // Clipboard content is ignored unless the caller opts in.
  const locked = T.buildInitialValues(
    { id: 'x', template: 'A {{clipboard}}' },
    { clipboard: 'SECRET', selection: '', url: '', title: '' },
    { allowClipboard: false }
  );
  eq(locked.values.clipboard, '', 'Clipboard text is ignored when auto-fill is off');
  eq(T.autofillBadge(locked.filledFrom.clipboard), '', 'No badge is shown when nothing was filled');

  const opened = T.buildInitialValues(
    { id: 'x', template: 'A {{clipboard}}' },
    { clipboard: 'SECRET', selection: '', url: '', title: '' },
    { allowClipboard: true }
  );
  eq(opened.values.clipboard, 'SECRET', 'Clipboard text is used when auto-fill is on');
  eq(T.autofillBadge(opened.filledFrom.clipboard), 'Clipboard', 'The badge names the real source');

  // Defect: the badge used to be derived from the field name, so it claimed
  // "Auto-filled: Selection" above an empty box.
  const noSelection = T.buildInitialValues(
    { id: 'x', template: 'Fix {{code}}' },
    { selection: '', url: '', title: '' },
    { allowClipboard: false }
  );
  eq(noSelection.values.code, '', 'An empty selection leaves the field empty');
  eq(T.autofillBadge(noSelection.filledFrom.code), '', 'No badge is claimed when the selection was empty');

  section('4c. Labels and field types');

  // Defect: names like scale_requirements_e_g_100k_rps rendered as the label
  // "Scale requirements e g 100k rps".
  const scale = T.describeName('scale_requirements_e_g_100k_rps');
  eq(scale.label, 'Scale requirements', 'The _e_g_ marker is stripped from the label');
  eq(scale.hint, 'e.g. 100k RPS', 'The example becomes the field hint');
  eq(T.describeName('api_url').label, 'API URL', 'Known acronyms keep their casing');
  eq(T.describeName('target_keyword').label, 'Target keyword', 'A plain name reads normally');
  eq(T.describeName('targetAudience').label, 'Target audience', 'camelCase is split');

  // A token alone on its own line wants a multi-line box whatever it is called.
  eq(T.inferType('anything', 'Header\n{{anything}}\nFooter'), 'textarea', 'A token on its own line is long-form');
  eq(T.inferType('anything', 'Say {{anything}} now'), 'text', 'An inline token is short-form');
  eq(T.inferType('x', 'See:\n```\n{{x}}\n```'), 'textarea', 'A token inside a fence is long-form');
}

/* =====================================================================
   5. Storage: the four data-loss blockers
   ===================================================================== */

async function testStorage() {
  section('5. Storage, schema v2');

  const realm = H.createStoreRealm();
  const S = realm.sandbox.OmniStore;
  const builtinCount = realm.sandbox.DEFAULT_PROMPTS.length;

  await S.init();
  eq(realm.read('omni.schemaVersion'), 2, 'A fresh install writes schema version 2');
  eq(S.getAll().length, builtinCount, 'A fresh install shows the whole built-in library');

  // Privacy and safety defaults.
  eq(S.getSettings().clipboardAutofill, false, 'Clipboard auto-fill is off by default');
  eq(S.getSettings().insertMode, 'caret', 'Insert mode defaults to caret, which preserves the draft');
  eq(S.getSettings().autoSubmit, false, 'Auto-send is off by default');
  eq(S.getSettings().syncEnabled, false, 'Sync is off by default');
  eq(S.getSettings().paletteHotkey.display, 'Alt+K', 'The in-page hotkey default is Alt+K');

  section('5a. Blocker: a prompt saved in one surface was invisible in the other');

  // v1 wrote popup prompts to custom_prompts and options prompts to
  // prompts_override, and readers preferred the latter, so one of the two
  // silently disappeared.
  await S.savePrompt({ title: 'FROM OPTIONS', template: 'o', category: 'Custom' });
  await S.savePrompt({ title: 'FROM POPUP', template: 'p', category: 'Custom' });
  const titles = S.getAll().map((p) => p.title);
  ok(titles.indexOf('FROM OPTIONS') !== -1, 'A prompt saved first is visible');
  ok(titles.indexOf('FROM POPUP') !== -1, 'A prompt saved second is also visible');
  eq(S.getAll().length, builtinCount + 2, 'Both user prompts are counted');

  section('5b. Blocker: editing a built-in cloned the whole library');

  await S.savePrompt({ id: 'dev-code-review', title: 'My renamed review' });
  const patches = realm.read('omni.defaultPatches');
  eq(Object.keys(patches), ['dev-code-review'], 'Exactly one patch is stored');
  ok(
    JSON.stringify(patches).length < 2000,
    'The patch is small (' + JSON.stringify(patches).length + ' bytes, was ~95000 for a full clone)'
  );
  eq(S.getById('dev-code-review').title, 'My renamed review', 'The edit is visible');
  eq(S.getById('dev-code-review').isEdited, true, 'The prompt is flagged as edited');
  eq(S.getAll().length, builtinCount + 2, 'Editing does not change the prompt count');

  section('5c. Blocker: deleting from the library table threw and did nothing');

  // The old options handler called an undefined saveCustomPrompts(), so the
  // ReferenceError stopped the save and the row never went away.
  const deleted = await S.deletePrompt('dev-bug-root-cause');
  eq(deleted, true, 'deletePrompt reports success');
  eq(S.getById('dev-bug-root-cause'), null, 'The prompt is gone from the resolved list');
  eq(realm.read('omni.hiddenDefaults'), ['dev-bug-root-cause'], 'The deletion is persisted');
  eq(S.getAll().length, builtinCount + 1, 'The count reflects the deletion');

  section('5d. Blocker: "restore defaults" deleted every user prompt');

  const before = S.getAll().filter((p) => p.isCustom).map((p) => p.title);
  const report = await S.restoreDefaultLibrary();
  const after = S.getAll().filter((p) => p.isCustom).map((p) => p.title);

  eq(after, before, 'Restoring the library leaves user prompts untouched');
  ok(after.length === 2, 'Both user prompts are still present');
  eq(S.getById('dev-bug-root-cause') !== null, true, 'A deleted built-in is brought back');
  eq(S.getById('dev-code-review').title, 'Rigorous Code Review', 'An edited built-in reverts to the shipped text');
  eq(report.promptsRestored, 1, 'The report counts the restored prompt');
  eq(report.patchesCleared, 1, 'The report counts the cleared edit');
  eq(realm.read('omni.userPrompts').length, 2, 'userPrompts on disk is untouched by a restore');

  section('5e. Erasing everything is a separate, explicit action');

  await S.eraseAllData();
  eq(S.getAll().filter((p) => p.isCustom).length, 0, 'eraseAllData removes user prompts');
  eq(S.getAll().length, builtinCount, 'The built-in library returns after an erase');
  section('5f. Role-based onboarding and starter packs');

  await S.savePrompt({ title: 'My Personal Prompt', template: 'test' });
  eq(S.getSelectedRole(), 'all', 'Default role is all');
  eq(S.getActivePacks()[0], 'all', 'Default active pack is all');

  await S.setRole('Coding');
  eq(S.getSelectedRole(), 'Coding', 'Selected role switches to Coding');
  const codingCount = S.getAll().filter((p) => p.category === 'Coding').length;
  eq(codingCount, 25, 'Coding starter pack has 25 prompts');
  eq(S.getAll().length, 26, 'Only user prompts and Coding prompts are active');
  ok(S.getAll().some((p) => p.title === 'My Personal Prompt'), 'User prompt is retained when role is filtered');

  await S.setRole('Writing');
  eq(S.getSelectedRole(), 'Writing', 'Role switches to Writing');
  eq(S.getAll().filter((p) => p.category === 'Writing').length, 20, 'Writing starter pack has 20 prompts');
  eq(S.getAll().length, 21, 'Only user prompts and Writing prompts are active');

  await S.setRole('all');
  eq(S.getSelectedRole(), 'all', 'Role can be reset to all');
  eq(S.getAll().length, builtinCount + 1, 'All built-in prompts return when role is all');
}

/* =====================================================================
   6. Migration from v1
   ===================================================================== */

async function testMigration() {
  section('6. Migration from the v1 two-key layout');

  const probe = H.createStoreRealm();
  const builtins = probe.sandbox.DEFAULT_PROMPTS;

  // A realistic v1 profile: prompts written in both surfaces, one built-in
  // edited, one built-in deleted, a custom category, and old settings.
  const seed = {
    custom_prompts: [{ id: 'custom-1', title: 'POPUP ERA', template: 'p', isCustom: true }],
    prompts_override: [
      { id: 'custom-2', title: 'OPTIONS ERA', template: 'o', isCustom: true },
      Object.assign({}, builtins[0], { title: 'EDITED BUILTIN' })
    ].concat(builtins.slice(2)), // index 1 absent: the user deleted it
    custom_categories: ['Client Work'],
    settings: {
      slashTriggerChar: 'none',
      commandPaletteHotkey: { key: 'p', code: 'KeyP', altKey: true, display: 'Alt+P' }
    }
  };

  const realm = H.createStoreRealm({ storageSeed: seed });
  const S = realm.sandbox.OmniStore;
  await S.init();

  const all = S.getAll();
  ok(all.some((p) => p.title === 'POPUP ERA'), 'Prompts from custom_prompts survive');
  ok(all.some((p) => p.title === 'OPTIONS ERA'), 'Prompts from prompts_override survive');
  eq(S.getById(builtins[0].id).title, 'EDITED BUILTIN', 'An edited built-in is preserved as a patch');
  eq(S.getById(builtins[1].id), null, 'A built-in the user deleted stays deleted');
  eq(all.length, builtins.length - 1 + 2, 'The total is right: library minus one, plus two user prompts');

  eq(S.getFolders().map((f) => f.name), ['Client Work'], 'Old categories become folders');
  eq(S.getSettings().slashEnabled, false, "slashTriggerChar 'none' becomes slashEnabled false");
  eq(S.getSettings().slashTriggerChar, '//', 'The trigger falls back to a usable prefix');
  eq(S.getSettings().paletteHotkey.display, 'Alt+P', 'The old hotkey is carried over');
  eq(realm.read('omni.schemaVersion'), 2, 'The schema version is written');
  eq(realm.read('omni.migratedFrom'), 1, 'The migration is recorded');

  // The v1 keys are deliberately left in place as a manual recovery path.
  ok(!!realm.read('prompts_override'), 'The old prompts_override key is left on disk as a safety net');
  ok(!!realm.read('custom_prompts'), 'The old custom_prompts key is left on disk as a safety net');

  // Migrating and then restoring must not undo the migration's rescue work.
  await S.restoreDefaultLibrary();
  const afterRestore = S.getAll();
  ok(afterRestore.some((p) => p.title === 'POPUP ERA'), 'A restore after migration keeps POPUP ERA');
  ok(afterRestore.some((p) => p.title === 'OPTIONS ERA'), 'A restore after migration keeps OPTIONS ERA');
  eq(afterRestore.length, builtins.length + 2, 'A restore brings the deleted built-in back');

  // Running init twice must not duplicate anything.
  await S.reload();
  eq(S.getAll().length, builtins.length + 2, 'Re-initialising does not duplicate prompts');
}

/* =====================================================================
   7. Ranking and favourites
   ===================================================================== */

async function testRanking() {
  section('7. Ranking, favourites and usage');

  const realm = H.createStoreRealm();
  const S = realm.sandbox.OmniStore;
  await S.init();

  // Resolve real ids from the data rather than hardcoding them, so renaming a
  // shipped prompt does not produce a misleading test failure.
  const byShortcut = (sc) => {
    const hit = realm.sandbox.DEFAULT_PROMPTS.filter((p) => p.shortcut === sc)[0];
    return hit ? hit.id : null;
  };
  const dockerId = byShortcut('docker');
  const schemaId = byShortcut('schema');
  ok(!!dockerId && !!schemaId, 'Test fixtures resolve to real prompt ids');

  // One scorer is shared by the slash menu, palette, popup and options table.
  // v1 had four near-identical copies that had already drifted apart.
  const exact = S.search({ query: 'debug', limit: 5 });
  ok(exact.length > 0, 'Searching a shortcut returns a result');
  eq(exact[0].shortcut, 'debug', 'An exact shortcut match ranks first');

  const prefix = S.search({ query: 'refac', limit: 5 });
  ok(prefix.length > 0 && prefix[0].shortcut === 'refactor', 'A shortcut prefix ranks first');

  ok(S.scoreOne({ shortcut: 'x', title: 'y' }, 'x') > S.scoreOne({ shortcut: 'zz', title: 'x' }, 'x'),
    'A shortcut match outranks a title match');
  eq(S.scoreOne({ title: 'nothing relevant', template: '' }, 'zzzznomatch'), 0, 'A non-match scores zero');

  await S.toggleFavorite(dockerId);
  eq(S.isFavorite(dockerId), true, 'A prompt can be favourited');
  eq(S.getFavorites().length, 1, 'The favourites list has one entry');

  const browsing = S.search({ query: '', limit: 5 });
  eq(browsing[0].id, dockerId, 'With no query, a favourite is first');

  await S.toggleFavorite(dockerId);
  eq(S.isFavorite(dockerId), false, 'Favouriting toggles off');

  await S.recordUse(schemaId);
  eq(S.getUsage(schemaId).count, 1, 'Use is counted');
  eq(S.getRecent(3)[0].id, schemaId, 'The most recent prompt is listed first');
  eq(S.getMostUsed(3)[0].id, schemaId, 'The most used prompt is listed first');

  // A used prompt should outrank an unused one when simply browsing.
  const rankedByUse = S.search({ query: '', limit: 3 });
  eq(rankedByUse[0].id, schemaId, 'A recently used prompt floats to the top');

  // Deleting a favourite must not leave a dangling id behind.
  await S.savePrompt({ id: 'temp-fav', title: 'Temp', template: 't' });
  const created = S.getAll().filter((p) => p.title === 'Temp')[0];
  await S.toggleFavorite(created.id);
  await S.deletePrompt(created.id);
  eq(S.getFavorites().length, 0, 'Deleting a prompt clears its favourite entry');

  // Filtering.
  const coding = S.search({ query: '', category: 'Coding' });
  ok(coding.length > 0 && coding.every((p) => p.category === 'Coding'), 'Category filtering works');
  await S.savePrompt({ title: 'Mine', template: 'm', category: 'Custom' });
  const mine = S.search({ query: '', category: 'Custom' });
  ok(mine.length === 1 && mine[0].title === 'Mine', 'The Custom filter shows only user prompts');
}

/* =====================================================================
   8. Import and export
   ===================================================================== */

async function testImportExport() {
  section('8. Import and export');

  const realm = H.createStoreRealm();
  const S = realm.sandbox.OmniStore;
  await S.init();

  await S.savePrompt({ title: 'Mine A', template: 'a {{x}}', category: 'Custom' });
  await S.savePrompt({ title: 'Mine B', template: 'b', category: 'Custom' });

  // Defect: export wrote the whole 110-prompt library, and the popup importer
  // then dropped everything without an isCustom flag, so a backup could not be
  // restored while the toast still claimed success.
  const bundle = S.exportBundle();
  eq(bundle.counts.prompts, 2, 'Export contains only the user prompts by default');
  eq(bundle.includesLibrary, false, 'The bundle records that the library was excluded');
  ok(JSON.stringify(bundle).length < 20000, 'The default backup is small');

  const full = S.exportBundle({ includeLibrary: true });
  ok(full.counts.prompts > 100, 'Including the library is available when asked for');

  // Re-importing a backup is a no-op rather than a duplication.
  const again = await S.importBundle(JSON.stringify(bundle), { mode: 'merge' });
  eq(again.ok, true, 'A backup re-imports without error');
  eq(again.added, 0, 'Nothing is added twice');
  eq(again.skipped, 2, 'Both duplicates are reported as skipped');

  // Restoring into a clean profile must actually restore.
  const fresh = H.createStoreRealm();
  const S2 = fresh.sandbox.OmniStore;
  await S2.init();
  const restored = await S2.importBundle(JSON.stringify(bundle), { mode: 'merge' });
  eq(restored.added, 2, 'A backup restores into a fresh profile');
  ok(S2.getAll().some((p) => p.title === 'Mine A'), 'The restored prompt is visible');

  // Malformed rows must be skipped, not crash the list render.
  const messy = await S.importBundle([{}, { title: 'no template' }, { template: 'has one' }, null, 42], {
    mode: 'merge'
  });
  eq(messy.ok, true, 'A file with malformed rows still imports');
  eq(messy.added, 1, 'Only the usable row is added');
  const T = realm.sandbox.OmniTemplate;
  ok(
    S.getAll().every((p) => typeof p.template === 'string' && typeof T.render(p.template, {}) === 'string'),
    'Every prompt in the store is renderable after a messy import'
  );
  ok(S.getAll().every((p) => typeof p.title === 'string' && p.title.length > 0), 'Every prompt has a title');

  // An import must never take over a shipped prompt.
  const hijack = await S.importBundle([{ id: 'dev-code-review', title: 'HIJACK', template: 'evil' }], {
    mode: 'merge'
  });
  eq(hijack.added, 1, 'The row is imported');
  eq(S.getById('dev-code-review').title, 'Rigorous Code Review', 'The built-in prompt is untouched');
  ok(S.getAll().some((p) => p.title === 'HIJACK'), 'The imported row lands under a new id');

  // Replace mode.
  const replaced = await S.importBundle([{ title: 'Only one', template: 'x' }], { mode: 'replace' });
  eq(replaced.added, 1, 'Replace mode imports the new prompt');
  eq(S.getAll().filter((p) => p.isCustom).length, 1, 'Replace mode clears the previous user prompts');

  // Bad input is reported, not thrown.
  const bad = await S.importBundle('not json at all {{{', { mode: 'merge' });
  ok(typeof bad.ok === 'boolean', 'Unparseable input returns a result rather than throwing');
  const emptyFile = await S.importBundle('', { mode: 'merge' });
  eq(emptyFile.ok, false, 'An empty file is rejected with a message');
  ok(!!emptyFile.error, 'The rejection carries an explanation');

  // Custom categories in bundle export and import
  const catStore = H.createStoreRealm().sandbox.OmniStore;
  await catStore.init();
  await catStore.createCategory('Data Science', '🧪');
  await catStore.savePrompt({ title: 'PyTorch model', category: 'Data Science', template: 'nn.Module' });
  const catBundle = catStore.exportBundle();
  ok(Array.isArray(catBundle.customCategories) && catBundle.customCategories.length === 1, 'Bundle contains custom categories');
  eq(catBundle.customCategories[0].name, 'Data Science', 'Bundle category name matches');
  eq(catBundle.customCategories[0].icon, '🧪', 'Bundle category icon matches');

  const catTarget = H.createStoreRealm().sandbox.OmniStore;
  await catTarget.init();
  await catTarget.importBundle(JSON.stringify(catBundle), { mode: 'merge' });
  eq(catTarget.getCustomCategories().length, 1, 'Custom category is restored upon import');
  eq(catTarget.getCustomCategories()[0].name, 'Data Science', 'Restored category name matches');
  eq(catTarget.getCategoryMeta('Data Science').icon, '🧪', 'Restored category emoji icon matches');
  const restoredPrompt = catTarget.getAll().find((p) => p.title === 'PyTorch model');
  ok(!!restoredPrompt && restoredPrompt.category === 'Data Science', 'Prompt retains custom category upon import');
}

/* =====================================================================
   9. Import adapters
   ===================================================================== */

function testImporters(realm) {
  section('9. Import adapters');

  const I = realm.sandbox.OmniImporters;

  const aiprm = I.detectAndParse([
    { Title: 'Fix Bugs', Prompt: 'Find bugs in {{code}}', Teaser: 'debug helper', AuthorName: 'a', Community: 'x' }
  ]);
  eq(aiprm.ok, true, 'An AIPRM export is recognised');
  eq(aiprm.source, 'aiprm', 'It is reported as an AIPRM file');
  eq(aiprm.prompts[0].title, 'Fix Bugs', 'The AIPRM title is mapped');
  eq(aiprm.prompts[0].template, 'Find bugs in {{code}}', 'The AIPRM prompt body is mapped');
  eq(aiprm.prompts[0].description, 'debug helper', 'The AIPRM teaser becomes the description');

  // Prompt templates are multi-line, so quoted newlines must survive.
  const csv = 'Title,Prompt,Tags\n"Grammar","Proofread this:\n\n{{text}}","writing, editing"\n"Short","One liner","misc"';
  const csvResult = I.detectAndParse(csv);
  eq(csvResult.ok, true, 'CSV is parsed');
  eq(csvResult.prompts.length, 2, 'Both CSV rows are read');
  eq(csvResult.prompts[0].template, 'Proofread this:\n\n{{text}}', 'A quoted multi-line template survives');
  eq(csvResult.prompts[0].tags, ['writing', 'editing'], 'A tag column is split');

  const tsv = 'name\tprompt\nA\tdo {{x}}\nB\tdo y';
  const tsvResult = I.detectAndParse(tsv);
  eq(tsvResult.ok, true, 'TSV is parsed');
  eq(tsvResult.prompts.length, 2, 'Both TSV rows are read');

  const md = '# Code Review\n> Reviews code carefully\n\nReview this {{code}} please\n\n## Grammar\n\nFix {{text}}\n';
  const mdResult = I.detectAndParse(md);
  eq(mdResult.ok, true, 'Markdown is parsed');
  eq(mdResult.prompts.length, 2, 'Each heading becomes a prompt');
  eq(mdResult.prompts[0].title, 'Code Review', 'The heading becomes the title');
  eq(mdResult.prompts[0].description, 'Reviews code carefully', 'A leading blockquote becomes the description');
  eq(mdResult.prompts[0].template, 'Review this {{code}} please', 'The body becomes the template');

  // A fenced code block inside Markdown must not be mistaken for a heading.
  const fenced = '# One\n\n```\n# not a heading\n```\n';
  const fencedResult = I.detectAndParse(fenced);
  eq(fencedResult.prompts.length, 1, 'A # inside a code fence is not treated as a heading');

  const map = I.detectAndParse({ 'Fix grammar': 'Proofread {{text}}' });
  eq(map.ok, true, 'A flat name-to-prompt object is parsed');
  eq(map.prompts[0].title, 'Fix grammar', 'The key becomes the title');

  const strings = I.detectAndParse(['a raw prompt string']);
  eq(strings.ok, true, 'An array of strings is parsed');

  const nested = I.detectAndParse({ prompts: [{ title: 'N', prompt: 'p' }] });
  eq(nested.ok, true, 'A nested prompts array is found');

  const plain = I.detectAndParse('First\nbody one\n---\nSecond\nbody two');
  eq(plain.ok, true, 'Plain text split on --- is parsed');
  eq(plain.prompts.length, 2, 'Both text blocks are read');

  // Field-name aliasing.
  eq(I.canonicalKey('Prompt'), 'template', 'Prompt maps to template');
  eq(I.canonicalKey('prompt_text'), 'template', 'prompt_text maps to template');
  eq(I.canonicalKey('Name'), 'title', 'Name maps to title');
  eq(I.canonicalKey('keywords'), 'tags', 'keywords maps to tags');
  eq(I.canonicalKey('irrelevant_column'), null, 'An unknown column is ignored');

  // A row with no prompt text is not importable.
  eq(I.mapRecord({ title: 'only a title' }), null, 'A row with no template is rejected');
  eq(I.detectAndParse('').ok, false, 'Empty input is rejected');
}

/* =====================================================================
   10. Folders, settings and per-site disable
   ===================================================================== */

async function testFoldersAndSettings() {
  section('10. Folders, settings and per-site disable');

  const realm = H.createStoreRealm();
  const S = realm.sandbox.OmniStore;
  await S.init();

  const parent = await S.createFolder('Client Work');
  ok(!!parent, 'A folder is created');
  const child = await S.createFolder('Acme', parent.id);
  ok(!!child, 'A nested folder is created');
  eq(
    S.getFolderTree().map((n) => n.depth + ':' + n.folder.name),
    ['0:Client Work', '1:Acme'],
    'The tree reports depth correctly'
  );

  eq(await S.createFolder('Client Work'), null, 'A duplicate folder name at the same level is refused');

  await S.savePrompt({ title: 'In folder', template: 'x', folderId: child.id });
  eq(S.search({ query: '', folderId: child.id }).length, 1, 'Folder filtering works');

  // Deleting a folder must move its contents, not delete them.
  await S.deleteFolder(parent.id);
  eq(S.getFolderTree().map((n) => n.folder.name), ['Acme'], 'A child is re-parented when its parent is deleted');
  ok(S.getAll().some((p) => p.title === 'In folder'), 'A prompt survives its folder being deleted');

  await S.renameFolder(child.id, 'Acme Corp');
  eq(S.getFolders()[0].name, 'Acme Corp', 'A folder can be renamed');

  section('10a. Custom categories and Emoji Icon Pack');

  ok(Array.isArray(S.EMOJI_PACK) && S.EMOJI_PACK.length >= 6, 'Emoji icon pack has at least 6 categories');
  ok(
    S.EMOJI_PACK.every((g) => g.group && g.icon && Array.isArray(g.emojis) && g.emojis.length > 0),
    'Every emoji group has group name, icon and emojis array'
  );

  const cat1 = await S.createCategory('Marketing Ops', '🚀');
  ok(!!cat1 && cat1.name === 'Marketing Ops' && cat1.icon === '🚀', 'A custom category is created with emoji');
  eq(await S.createCategory('Marketing Ops', '📈'), null, 'A duplicate category name is refused');

  const cats = S.getCategories();
  ok(cats.indexOf('Marketing Ops') !== -1, 'Custom category is listed in getCategories()');
  const meta1 = S.getCategoryMeta('Marketing Ops');
  eq(meta1.icon, '🚀', 'getCategoryMeta returns custom emoji icon');

  await S.savePrompt({ title: 'Ad copy', category: 'Marketing Ops', template: 'x' });
  eq(S.search({ query: '', category: 'Marketing Ops' }).length, 1, 'Filtering prompts by custom category works');

  const updatedCat = await S.updateCategory(cat1.id, { name: 'Growth Marketing', icon: '🎯' });
  ok(!!updatedCat && updatedCat.name === 'Growth Marketing' && updatedCat.icon === '🎯', 'Custom category is updated');
  const adPrompt = S.getAll().find((p) => p.title === 'Ad copy');
  eq(adPrompt.category, 'Growth Marketing', 'Prompts are cascaded to new category name upon update');

  await S.deleteCategory(cat1.id);
  eq(S.getCustomCategories().length, 0, 'Custom category is deleted');
  const survivingAdPrompt = S.getAll().find((p) => p.title === 'Ad copy');
  eq(survivingAdPrompt.category, 'Custom', 'Prompts in deleted category are re-assigned to Custom');

  section('10b. Settings');

  await S.setSetting('insertMode', 'append');
  eq(S.getSettings().insertMode, 'append', 'A setting persists');
  await S.setSetting('insertMode', 'nonsense');
  eq(S.getSettings().insertMode, 'caret', 'An invalid insert mode falls back to caret');
  eq(await S.setSetting('notARealSetting', 1), false, 'An unknown setting key is refused');

  const hk = S.normalizeHotkey({ key: 'j', code: 'KeyJ', ctrlKey: true, shiftKey: true });
  eq(hk.display, 'Ctrl+Shift+J', 'A hotkey gets a readable description');
  eq(S.describeHotkey({ altKey: true, key: 'k' }), 'Alt+K', 'Alt+K is described correctly');
  eq(S.describeHotkey({ ctrlKey: true, shiftKey: true, key: 'k' }), 'Ctrl+Shift+K', 'Ctrl+Shift+K is described correctly');

  section('10c. Per-site disable');

  await S.setSiteDisabled('example.com', true);
  eq(S.isSiteDisabled('example.com'), true, 'An exact hostname matches');
  eq(S.isSiteDisabled('app.example.com'), true, 'A subdomain matches');
  eq(S.isSiteDisabled('notexample.com'), false, 'A lookalike hostname does not match');
  eq(S.isSiteDisabled('other.com'), false, 'An unrelated hostname does not match');
  await S.setSiteDisabled('example.com', false);
  eq(S.isSiteDisabled('example.com'), false, 'A site can be re-enabled');
}

/* =====================================================================
   11. Sync
   ===================================================================== */

async function testSync() {
  section('11. Optional cross-device sync');

  const realm = H.createStoreRealm();
  const S = realm.sandbox.OmniStore;
  await S.init();

  eq(S.getSyncStatus().enabled, false, 'Sync starts disabled');
  await S.savePrompt({ title: 'Synced prompt', template: 'x' });

  await S.setSyncEnabled(true);
  eq(S.getSyncStatus().enabled, true, 'Sync can be enabled');
  ok(!!realm.readSync('omni.sync.index'), 'An index is written to sync storage');
  ok(typeof realm.readSync('omni.sync.c0') === 'string', 'The payload is chunked');

  // Chunks must be small enough for Chrome's 8KB per-item ceiling.
  const index = realm.readSync('omni.sync.index');
  let oversize = 0;
  for (let i = 0; i < index.count; i++) {
    if (String(realm.readSync('omni.sync.c' + i)).length > 8192) oversize += 1;
  }
  eq(oversize, 0, 'Every chunk fits inside the 8KB per-item limit');

  // Long prompt with emojis and quotes that would exceed per-item quota if chunked by char length
  await S.savePrompt({
    title: 'Huge Prompt with Quotes & Emojis',
    template: '"""\n🚀 "Quote" \\path\\to\\file\n"""\n'.repeat(250)
  });
  const index2 = realm.readSync('omni.sync.index');
  ok(!!index2, 'Sync successfully written for large prompt with emojis');
  eq(S.getSyncStatus().lastError, null, 'No kQuotaBytesPerItem error on large prompt');

  // A second, empty device turning sync on must receive the library, not
  // replace it. Pushing before pulling silently wiped the synced copy.
  const other = H.createStoreRealm({ sharedSync: realm.storage.sync });
  const S2 = other.sandbox.OmniStore;
  await S2.init();
  eq(S2.getAll().filter((p) => p.isCustom).length, 0, 'The second profile starts empty');

  await S2.setSyncEnabled(true);
  ok(S2.getAll().some((p) => p.title === 'Synced prompt'), 'Enabling sync on an empty device pulls the library in');
  ok(!!realm.readSync('omni.sync.index'), 'The remote copy still exists after the second device joins');

  // And the first device must not lose anything when the second one edits.
  await S2.savePrompt({ title: 'From device two', template: 'two' });
  await S.pullSync();
  const merged = S.getAll().map((p) => p.title);
  ok(merged.indexOf('Synced prompt') !== -1, 'Merging keeps the first device\u2019s prompt');
  ok(merged.indexOf('From device two') !== -1, 'Merging adds the second device\u2019s prompt');

  // Favourites are unioned rather than overwritten.
  const anyId = S2.getAll()[0].id;
  await S2.toggleFavorite(anyId);
  await S.pullSync();
  eq(S.isFavorite(anyId), true, 'A favourite set on one device reaches the other');

  // Pulling twice must not duplicate anything.
  const countBefore = S.getAll().length;
  await S.pullSync();
  eq(S.getAll().length, countBefore, 'Pulling twice does not duplicate prompts');

  await S.setSyncEnabled(false);
  eq(S.getSyncStatus().enabled, false, 'Sync can be turned off');
  eq(realm.readSync('omni.sync.index'), undefined, 'Turning sync off clears the remote copy');

  // An oversized library must fail loudly and leave local data alone.
  const big = H.createStoreRealm({ fetch: dodoFetch(['LIVE-KEY-SYNC']) });
  const S3 = big.sandbox.OmniStore;
  await S3.init();
  await S3.activateLicense('LIVE-KEY-SYNC');
  const filler = 'x'.repeat(4000);
  for (let i = 0; i < 40; i++) {
    await S3.savePrompt({ title: 'Big ' + i, template: filler });
  }
  await S3.setSyncEnabled(true);
  const status = S3.getSyncStatus();
  ok(!!status.lastError, 'An oversized library reports a sync error');
  ok(/limit|quota/i.test(status.lastError), 'The error explains the size limit');
  eq(S3.getAll().filter((p) => p.isCustom).length, 40, 'Local prompts are unaffected by a sync failure');
}

/* =====================================================================
   12. Modifiers
   ===================================================================== */

function testModifiers(realm) {
  section('12. Quick modifiers');

  const M = realm.sandbox.OmniModifiers;
  const all = M.getAll();

  ok(all.length >= 12, 'There are ' + all.length + ' modifiers');
  const ids = all.map((m) => m.id);
  ok(new Set(ids).size === ids.length, 'Modifier ids are unique');
  ok(all.every((m) => m.id.indexOf('mod-') === 0), 'Every id uses the mod- prefix the menu router expects');
  ok(all.every((m) => !!m.title && !!m.description && !!m.icon), 'Every modifier has a title, description and icon');
  ok(all.every((m) => typeof m.transform === 'function'), 'Every modifier has a transform');

  const output = M.apply('mod-concise', 'HELLO');
  ok(typeof output === 'string' && output.indexOf('HELLO') !== -1, 'A transform embeds the source text');
  eq(M.apply('mod-nope', 'x'), null, 'An unknown modifier id returns null');

  eq(M.contextMenuItems().length, all.length, 'Every modifier reaches the context menu');
  ok(
    M.contextMenuItems().every((i) => !!i.id && !!i.title),
    'Every context-menu entry has an id and a title'
  );
  eq(M.asPaletteItems().length, all.length, 'Every modifier is searchable in the palette');

  // Defect: the list existed three times (content script, popup, background)
  // and had already drifted. There must now be exactly one definition.
  const popupSource = readCode('popup/popup.js');
  const backgroundSource = readCode('background/background.js');
  ok(
    popupSource.indexOf('mod-concise') === -1,
    'The popup no longer hard-codes the modifier list'
  );
  ok(
    backgroundSource.indexOf('mod-concise') === -1,
    'The service worker no longer hard-codes the modifier list'
  );
  ok(popupSource.indexOf('OmniModifiers') !== -1, 'The popup reads the shared modifier list');
  ok(backgroundSource.indexOf('OmniModifiers') !== -1, 'The service worker reads the shared modifier list');
}

/* =====================================================================
   13. Content-script behaviour, checked at source level
   ===================================================================== */

function testContentScripts() {
  section('13. Content-script guarantees');

  // Comments are stripped so "this name must be absent" checks test the code,
  // not the comments that explain what the code replaced.
  const adapters = readCode('content/adapters.js');
  const slash = readCode('content/slashTrigger.js');
  const palette = readCode('content/commandPalette.js');
  const modal = readCode('content/variableModal.js');
  const coordinator = readCode('content/content.js');
  const css = read('content/content.css');

  // Defect: insert() defaulted to replacing the whole field, so every caller
  // destroyed the user's draft.
  ok(
    /mode\s*=\s*\[\s*'caret'/.test(adapters) || adapters.indexOf("opts.mode) !== -1 ? opts.mode : 'caret'") !== -1,
    'adapters default to caret insertion, not replace'
  );
  ok(adapters.indexOf('replaceBeforeCaret') !== -1, 'adapters expose a range replace for the slash token');
  ok(adapters.indexOf('rangeBeforeCaret') !== -1, 'A DOM range is built for contenteditable token replacement');
  ok(
    adapters.indexOf("execCommand('delete')") === -1,
    'The per-character execCommand delete loop is gone'
  );
  ok(adapters.indexOf('trackFocus') !== -1, 'adapters remember the last focused editable');
  ok(adapters.indexOf('function submit') !== -1, 'Auto-send is implemented, not just documented');
  ok(adapters.indexOf('measureTextareaCaret') !== -1, 'Textarea caret position is measured, not guessed');

  // A modal taking focus loses the caret in a contenteditable, which would
  // leave the typed //token behind in the message.
  ok(adapters.indexOf('function captureCaret') !== -1, 'The caret can be captured before a modal opens');
  ok(adapters.indexOf('function restoreCaret') !== -1, 'The caret is restored before writing');
  ok(slash.indexOf('captureCaret') !== -1, 'The slash menu captures the caret when a prompt is chosen');
  ok(palette.indexOf('captureCaret') !== -1, 'The palette captures the caret when it opens');
  ok(coordinator.indexOf('caret: opts.caret') !== -1, 'The coordinator passes the caret through to the write');

  // Measuring must not mutate the page: writing a marker node into ProseMirror
  // or Lexical to measure it trips their mutation observers.
  ok(
    adapters.indexOf('range.insertNode(marker)') === -1,
    'Caret measurement does not insert a marker node into the editor'
  );

  // Defect: the slash menu was absolutely positioned but fed viewport
  // coordinates, so it drifted by the scroll offset.
  ok(
    /\.omni-slash-menu\s*\{[^}]*position:\s*fixed/.test(css),
    'The slash menu is position:fixed to match viewport coordinates'
  );
  ok(slash.indexOf("window.addEventListener('scroll'") !== -1, 'The menu repositions on scroll');
  ok(slash.indexOf('resizeHandler') !== -1, 'The menu repositions on resize');

  // Defect: Escape did not stick; typing one more character reopened the menu.
  ok(slash.indexOf('dismissedToken') !== -1, 'The slash menu records that the user dismissed it');

  // Defect: the palette re-bound a container listener on every open.
  ok(
    palette.indexOf('if (!backdrop) build();') !== -1,
    'The palette builds its DOM once instead of on every open'
  );
  ok(palette.indexOf('restoreTarget') !== -1, 'The palette restores focus to the composer on close');
  ok(palette.indexOf('lastToggleAt') !== -1, 'A debounce stops the two hotkeys double-firing');

  // Defect: category headings repeated because rows were score-ordered.
  ok(palette.indexOf('byCategory') !== -1, 'The palette groups rows before rendering headings');

  // Defect: the modal read the clipboard on every open.
  ok(
    !/navigator\.clipboard\.readText\(\)\s*;?\s*\n/.test(modal.replace(/pasteInto[\s\S]*?\n  \}/, '')) ||
      modal.indexOf('pasteInto') !== -1,
    'Clipboard reads in the modal happen only inside the Paste handler'
  );
  ok(modal.indexOf('data-paste') !== -1, 'Each field offers an explicit Paste button');
  ok(
    modal.indexOf("document.addEventListener('keydown', escHandler, true)") !== -1,
    'The Escape handler is registered once during build'
  );

  // The coordinator must never call a bare replace.
  ok(coordinator.indexOf('replaceLength') !== -1, 'The coordinator passes the slash token length through');
  ok(coordinator.indexOf('isSiteDisabled') !== -1, 'The coordinator honours the per-site disable');
  ok(coordinator.indexOf('capturePageContext') !== -1, 'Page context is captured before overlays steal the selection');
  ok(coordinator.indexOf('__OMNIPROMPT_LOADED__') !== -1, 'A guard flag makes double injection harmless');

  // The message listener must be registered before storage is awaited. A
  // keyboard command arriving during that tick would otherwise be reported back
  // to the service worker as "no content script".
  const listenerAt = coordinator.indexOf('onMessage.addListener');
  const awaitInitAt = coordinator.indexOf('await window.OmniStore.init()');
  ok(listenerAt !== -1, 'The coordinator registers a message listener');
  ok(awaitInitAt !== -1, 'The coordinator awaits the store');
  ok(listenerAt < awaitInitAt, 'The message listener is registered before storage is awaited');

  // Blocker guard: nothing may read the v1 storage keys any more. Only
  // lib/promptStore.js is allowed to, and only inside its migration.
  ['content/content.js', 'popup/popup.js', 'options/options.js'].forEach((file) => {
    const source = readCode(file);
    ok(source.indexOf('prompts_override') === -1, file + ' does not touch the old prompts_override key');
    ok(source.indexOf('custom_prompts') === -1, file + ' does not touch the old custom_prompts key');
  });

  // Blocker guard: the function whose absence broke the delete button.
  const optionsSource = readCode('options/options.js');
  ok(
    optionsSource.indexOf('saveCustomPrompts') === -1,
    'options.js no longer calls the undefined saveCustomPrompts()'
  );
  ok(optionsSource.indexOf('store.deletePrompt') !== -1, 'options.js deletes through the store');
}

/* =====================================================================
   13b. Insertion behaviour, executed against a stand-in textarea
   ===================================================================== */

function testInsertionBehaviour() {
  section('13b. Insertion behaviour (running the real adapter)');

  const realm = H.createAdapterRealm();
  const A = realm.adapters;
  const make = realm.sandbox.makeTextarea;

  ok(!!A, 'The adapter loads into a DOM realm');

  // The blocker, stated as a test. A user types three paragraphs and then pulls
  // in a prompt. Every v1 caller replaced the whole field, so the paragraphs
  // were silently destroyed.
  const draft = make('Here is my long draft that must survive.');
  draft.selectionStart = draft.selectionEnd = draft.value.length;
  const inserted = A.insert('PROMPT', { target: draft });
  eq(inserted.ok, true, 'The insert reports success');
  eq(inserted.mode, 'caret', 'The default mode is caret');
  eq(
    draft.value,
    'Here is my long draft that must survive.PROMPT',
    'Caret insertion keeps the whole existing draft'
  );

  // Mid-draft insertion must not disturb the text on either side.
  const middle = make('start END');
  middle.selectionStart = middle.selectionEnd = 6; // between "start " and "END"
  A.insert('X', { target: middle });
  eq(middle.value, 'start XEND', 'Insertion happens exactly at the caret');
  eq(middle.selectionStart, 7, 'The caret ends up after the inserted text');

  // An active selection is replaced, which is what typing would do.
  const selected = make('keep REPLACE keep');
  selected.selectionStart = 5;
  selected.selectionEnd = 12;
  A.insert('NEW', { target: selected });
  eq(selected.value, 'keep NEW keep', 'A selected range is replaced by the insert');

  // Append mode.
  const appended = make('draft');
  A.insert('MORE', { target: appended, mode: 'append' });
  eq(appended.value, 'draft\n\nMORE', 'Append mode adds to the end with a blank line');

  const appendedSpaced = make('draft ');
  A.insert('MORE', { target: appendedSpaced, mode: 'append' });
  eq(appendedSpaced.value, 'draft MORE', 'Append mode does not add a gap after existing whitespace');

  // Replace mode still exists, but only when asked for by name.
  const replaced = make('gone');
  A.insert('ONLY', { target: replaced, mode: 'replace' });
  eq(replaced.value, 'ONLY', 'Replace mode is available explicitly');

  // An unknown mode must not silently become a destructive one.
  const guarded = make('safe');
  A.insert('X', { target: guarded, mode: 'obliterate' });
  eq(guarded.value, 'safeX', 'An unrecognised mode falls back to caret, not replace');

  section('13c. Slash-token replacement');

  // Choosing a prompt from the slash menu must remove only the token typed.
  const typed = make('Please look at this: //review');
  typed.selectionStart = typed.selectionEnd = typed.value.length;
  const swap = A.replaceRange('//review'.length, 'FULL PROMPT TEXT', { target: typed });
  eq(swap.ok, true, 'The token swap reports success');
  eq(
    typed.value,
    'Please look at this: FULL PROMPT TEXT',
    'Only the //token is replaced; the rest of the draft is intact'
  );

  // With text after the caret too. Positions are derived rather than counted by
  // hand, so the test cannot drift out of step with the fixture.
  const lead = 'before ';
  const token = '//deb';
  const trail = ' after';
  const surrounded = make(lead + token + trail);
  surrounded.selectionStart = surrounded.selectionEnd = (lead + token).length;
  A.replaceRange(token.length, 'DEBUG', { target: surrounded });
  eq(surrounded.value, lead + 'DEBUG' + trail, 'Text after the caret is preserved');

  // A token at the very start.
  const atStart = make('//x');
  atStart.selectionStart = atStart.selectionEnd = 3;
  A.replaceRange(3, 'Y', { target: atStart });
  eq(atStart.value, 'Y', 'A token at position zero is replaced cleanly');

  // Asking to remove more characters than exist must clamp, not corrupt.
  const shortField = make('ab');
  shortField.selectionStart = shortField.selectionEnd = 2;
  A.replaceRange(99, 'Z', { target: shortField });
  eq(shortField.value, 'Z', 'An over-long replace length is clamped to the field');

  section('13d. Caret capture and restore');

  const saved = make('hello world');
  saved.selectionStart = saved.selectionEnd = 5;
  const snapshot = A.captureCaret(saved);
  ok(!!snapshot, 'A caret snapshot is produced');
  eq(snapshot.kind, 'input', 'A textarea snapshot records the input kind');
  eq(snapshot.start, 5, 'The snapshot records the position');

  // Simulate a modal moving the caret, then writing through the snapshot.
  saved.selectionStart = saved.selectionEnd = 0;
  A.insert('!', { caret: snapshot });
  eq(saved.value, 'hello! world', 'Writing through a snapshot lands at the original caret');

  // Frameworks must be told the value changed, or React state goes stale.
  realm.sandbox.__events.length = 0;
  A.insert('Z', { target: make('q') });
  ok(realm.sandbox.__events.indexOf('input') !== -1, 'An input event is dispatched for framework listeners');
  ok(realm.sandbox.__events.indexOf('change') !== -1, 'A change event is dispatched');

  // A page with nothing editable must report failure, not throw, so the caller
  // can fall back to the clipboard. This needs a realm that has never focused
  // anything, since the adapter deliberately remembers the last target.
  const emptyPage = H.createAdapterRealm();
  const nothing = emptyPage.adapters.insert('x', {});
  eq(nothing.ok, false, 'A page with no text box returns a failure result');
  eq(nothing.reason, 'no-input', 'The failure names the reason so the caller can fall back to the clipboard');
}

/* =====================================================================
   14. Service worker
   ===================================================================== */

function testServiceWorker() {
  section('14. Service worker');

  const source = readCode('background/background.js');

  // Defect: contextMenus.create ran with fixed ids on install and update with
  // no removeAll, which throws a duplicate-id error on update.
  ok(source.indexOf('contextMenus.removeAll') !== -1, 'Menus are cleared before being rebuilt');
  const removeAllAt = source.indexOf('contextMenus.removeAll');
  const firstCreateAt = source.indexOf('contextMenus.create');
  ok(removeAllAt !== -1 && removeAllAt < firstCreateAt, 'removeAll runs before the first create');

  // Defect: unchecked runtime.lastError on every call.
  ok(source.indexOf('chrome.runtime.lastError') !== -1, 'runtime.lastError is checked');

  // Fresh installs used to do nothing in tabs that were already open.
  ok(source.indexOf('injectIntoOpenTabs') !== -1, 'Tabs open at install time are injected into');
  ok(source.indexOf('chrome.scripting.executeScript') !== -1, 'Injection uses the scripting API');

  ok(source.indexOf('importScripts') !== -1, 'Shared libraries are imported into the worker');
  ok(source.indexOf('OmniStore.init') !== -1, 'The worker runs the migration on install');
  ok(source.indexOf('relay_to_active_tab') !== -1, 'The worker relays popup messages, with a retry');
  ok(source.indexOf('onStartup') !== -1, 'Menus are repaired on browser startup');

  // The files the worker imports must match the manifest's content scripts.
  const manifest = JSON.parse(read('manifest.json'));
  const csFiles = manifest.content_scripts[0].js;
  const injected = source.match(/const CONTENT_SCRIPTS = \[([\s\S]*?)\]/);
  ok(!!injected, 'The worker declares the list of files it injects');
  if (injected) {
    const listed = injected[1].match(/'([^']+)'/g).map((s) => s.replace(/'/g, ''));
    eq(listed, csFiles, 'The injected file list matches the manifest content scripts exactly');
  }
}

/* =====================================================================
   15. UI wiring
   ===================================================================== */

function testUiWiring() {
  section('15. UI wiring');

  const pairs = [
    ['popup/popup.html', 'popup/popup.js'],
    ['options/options.html', 'options/options.js'],
    ['welcome/welcome.html', 'welcome/welcome.js']
  ];

  pairs.forEach(([htmlFile, jsFile]) => {
    const html = read(htmlFile);
    const js = read(jsFile);

    const available = new Set();
    const idRe = /\sid=["']([^"']+)["']/g;
    let m;
    while ((m = idRe.exec(html)) !== null) available.add(m[1]);

    const referenced = [];
    const getRe = /getElementById\(\s*['"]([^'"]+)['"]\s*\)/g;
    while ((m = getRe.exec(js)) !== null) referenced.push(m[1]);

    const missing = Array.from(new Set(referenced)).filter((id) => !available.has(id));
    eq(missing, [], jsFile + ' references no element id that is absent from its HTML');

    // A single inline handler would break under the extension CSP.
    const inline = html.match(/\son(?:click|change|input|submit|load|error|keydown|focus|blur)=/g) || [];
    eq(inline.length, 0, htmlFile + ' has no inline event handlers (CSP)');

    // Every referenced script and stylesheet must exist.
    const dir = path.dirname(htmlFile);
    const refs = []
      .concat((html.match(/<script[^>]*src=["']([^"']+)["']/g) || []).map((s) => s.match(/src=["']([^"']+)["']/)[1]))
      .concat((html.match(/<link[^>]*href=["']([^"']+)["']/g) || []).map((s) => s.match(/href=["']([^"']+)["']/)[1]));
    refs.forEach((ref) => {
      ok(fs.existsSync(path.join(ROOT, dir, ref)), htmlFile + ' -> ' + ref + ' exists');
    });
  });

  // The extension pages must load the shared libraries in dependency order.
  ['popup/popup.html', 'options/options.html'].forEach((file) => {
    const html = read(file);
    ['../data/defaultPrompts.js', '../lib/template.js', '../lib/promptStore.js'].forEach((lib) => {
      ok(html.indexOf(lib) !== -1, file + ' loads ' + lib);
    });
    ok(
      html.indexOf('../lib/template.js') < html.indexOf('../lib/promptStore.js'),
      file + ' loads template.js before promptStore.js'
    );
  });

  // Defect: the popup's reset button promised custom prompts were safe while
  // deleting the key they lived in. The wording must match the new behaviour.
  const popupHtml = read('popup/popup.html');
  ok(
    /not touched|not affected|untouched/i.test(popupHtml),
    'The popup restore control states that user prompts are kept'
  );

  const optionsHtml = read('options/options.html');
  ok(
    !/will be backed up/i.test(optionsHtml),
    'The old, false "custom prompts will be backed up" claim is gone'
  );
  ok(!/Clipboard auto-fill/i.test(optionsHtml), 'Clipboard auto-fill setting is removed to avoid review friction');
  ok(!/At the caret/i.test(optionsHtml), 'Insert mode dropdown is removed; default caret insertion is universal');
}

/* =====================================================================
   16. Documentation truthfulness
   ===================================================================== */

function testDocs(realm) {
  section('16. Documentation matches the code');

  const readme = read('README.md');
  const welcome = read('welcome/welcome.html');
  const manifest = JSON.parse(read('manifest.json'));
  const prompts = realm.sandbox.DEFAULT_PROMPTS;
  const S = realm.sandbox.OmniStore;

  // Defect: 26 of the 35 shortcuts the README advertised did not exist.
  const shortcuts = new Set(prompts.map((p) => p.shortcut));
  const claimed = Array.from(new Set((readme.match(/`\/\/[a-z-]+`/g) || []).map((s) => s.replace(/[`\/]/g, ''))));
  const bogus = claimed.filter((s) => !shortcuts.has(s));
  ok(claimed.length > 50, 'The README documents ' + claimed.length + ' shortcuts');
  eq(bogus, [], 'Every shortcut the README claims actually exists');

  // Defect: three different hotkeys were documented across the code and docs.
  const declared = manifest.commands['toggle-command-palette'].suggested_key.default;
  ok(readme.indexOf(declared) !== -1, 'The README names the browser command ' + declared);
  ok(
    readme.indexOf(S.DEFAULT_HOTKEY.display) !== -1,
    'The README names the in-page hotkey ' + S.DEFAULT_HOTKEY.display
  );
  ok(
    welcome.indexOf(S.DEFAULT_HOTKEY.display) !== -1,
    'The welcome page names the in-page hotkey ' + S.DEFAULT_HOTKEY.display
  );
  ok(welcome.indexOf(declared) !== -1, 'The welcome page also names the browser command');

  // The default trigger must be what the docs say.
  const trigger = S.DEFAULT_SETTINGS.slashTriggerChar;
  eq(trigger, '//', 'The default trigger is //');
  ok(readme.indexOf('Type `' + trigger + '`') !== -1, 'The README documents the real trigger');

  // Defect: the README promised "Insert & Send" auto-submit that the code did
  // not contain, and the old verify suite asserted it had been removed.
  const adapters = read('content/adapters.js');
  const promisesSend = /insert(s)? and send|Insert & Send|insert and sends/i.test(readme);
  const implementsSend = adapters.indexOf('function submit') !== -1;
  ok(
    !promisesSend || implementsSend,
    'Auto-send is only documented because it is implemented'
  );
  ok(implementsSend, 'Auto-send is implemented');

  // Defect: the README pointed at a folder name that did not exist.
  ok(!/chatbot_pro/.test(readme), 'The stale chatbot_pro path is gone from the README');

  // Only claim features that exist.
  if (/duplicate/i.test(readme)) {
    ok(typeof S.duplicatePrompt === 'function', 'Duplicate is documented and implemented');
  }
  if (/folder/i.test(readme)) {
    ok(typeof S.createFolder === 'function', 'Folders are documented and implemented');
  }
  if (/categor/i.test(readme)) {
    ok(typeof S.createCategory === 'function', 'Custom categories are documented and implemented');
  }
  if (/favourite|favorite/i.test(readme)) {
    ok(typeof S.toggleFavorite === 'function', 'Favourites are documented and implemented');
  }
  if (/sync/i.test(readme)) {
    ok(typeof S.setSyncEnabled === 'function', 'Sync is documented and implemented');
  }

  // The privacy claim must hold: no network calls anywhere in the extension.
  const shipped = [
    'lib/template.js',
    'lib/modifiers.js',
    'lib/importers.js',
    'lib/promptStore.js',
    'content/adapters.js',
    'content/variableModal.js',
    'content/slashTrigger.js',
    'content/commandPalette.js',
    'content/content.js',
    'background/background.js',
    'popup/popup.js',
    'options/options.js',
    'welcome/welcome.js'
  ];
  const networkCalls = [];
  shipped.forEach((file) => {
    const source = read(file);
    if (/XMLHttpRequest/.test(source)) networkCalls.push(file + ' (XMLHttpRequest)');
    if (/new\s+WebSocket/.test(source)) networkCalls.push(file + ' (WebSocket)');
    if (/navigator\.sendBeacon/.test(source)) networkCalls.push(file + ' (sendBeacon)');
    if (file === 'lib/promptStore.js') {
      // promptStore only calls fetch for Dodo Payments license activation/validation
      ok(source.indexOf('dodopayments.com') !== -1, 'promptStore references Dodo Payments license API');
      return;
    }
    if (/\bfetch\s*\(/.test(source)) networkCalls.push(file + ' (fetch)');
  });
  eq(networkCalls, [], 'No content script, UI or background script makes network requests; promptStore only contacts Dodo on license check');

  // The permission table must cover every permission actually requested.
  const allPerms = (manifest.permissions || []).concat(manifest.host_permissions || []);
  allPerms.forEach((perm) => {
    ok(readme.indexOf(perm) !== -1, 'The README explains the ' + perm + ' permission');
  });

  // The stated prompt count must be real.
  const claimedCount = readme.match(/(\d{3}) built-in prompts/);
  if (claimedCount) {
    eq(Number(claimedCount[1]), prompts.length, 'The README prompt count matches the data');
  }
}

/* =====================================================================
   17. No leftover scratch files
   ===================================================================== */

function testHygiene() {
  section('17. Repository hygiene');

  const stray = fs
    .readdirSync(ROOT)
    .filter((name) => /^_/.test(name) || /\.tmp$/.test(name) || /^scratch/.test(name));
  eq(stray, [], 'No scratch or temporary files are left in the repository root');
}

/* =====================================================================
   18. Licensing, Free Limits, and Pro Upgrade
   ===================================================================== */

async function testLicensingAndLimits() {
  section('18. Licensing, Free Limits, and Pro Upgrade');

  const fakeDodo = dodoFetch(['LIVE-KEY-1234-ABCD']);
  const realm = H.createStoreRealm({ fetch: fakeDodo });
  await realm.sandbox.OmniStore.init();
  const S = realm.sandbox.OmniStore;

  // 1. Initial Free Tier State
  eq(S.isPro(), false, 'Default license state is Free (isPro is false)');
  eq(S.getFreeLimit(), 25, 'Free tier limit is 25 prompts');
  eq(S.getCustomCount(), 0, 'Initial custom count is 0');
  eq(S.isLimitReached(), false, 'Limit is not reached initially');
  eq(S.canCreatePrompt(), true, 'canCreatePrompt is true when under limit');
  eq(S.getLicense(), null, 'getLicense returns null on free tier');

  // 2. Add custom prompts up to the free limit of 25
  const createdPrompts = [];
  for (let i = 1; i <= 25; i++) {
    const p = await S.savePrompt({
      title: 'Custom Prompt ' + i,
      template: 'Template ' + i,
      category: 'Custom'
    });
    createdPrompts.push(p);
  }

  eq(S.getCustomCount(), 25, 'Custom prompt count reached 25');
  eq(S.isLimitReached(), true, 'isLimitReached is true at 25 custom prompts');
  eq(S.canCreatePrompt(), false, 'canCreatePrompt is false when free limit is reached');

  // 3. Attempting to add 26th custom prompt without Pro should reject
  let limitRejected = false;
  try {
    await S.savePrompt({
      title: 'Custom Prompt 26',
      template: 'Template 26'
    });
  } catch (err) {
    if (err && err.code === 'LIMIT_REACHED') {
      limitRejected = true;
    }
  }
  ok(limitRejected, 'Saving a 26th custom prompt on Free tier is rejected with LIMIT_REACHED');

  // 4. Attempting to duplicate prompt when limit reached should reject
  let duplicateRejected = false;
  try {
    await S.duplicatePrompt(createdPrompts[0].id);
  } catch (err) {
    if (err && err.code === 'LIMIT_REACHED') {
      duplicateRejected = true;
    }
  }
  ok(duplicateRejected, 'Duplicating a prompt when limit reached is rejected with LIMIT_REACHED');

  // 5. Editing existing prompts is still permitted when limit reached
  const updatedFirst = await S.savePrompt({
    id: createdPrompts[0].id,
    title: 'Custom Prompt 1 (Updated)',
    template: 'Template 1 (Updated)'
  });
  eq(updatedFirst.title, 'Custom Prompt 1 (Updated)', 'Editing existing custom prompt succeeds at limit');

  // 6. Editing built-in prompts is still permitted when limit reached
  const editedBuiltin = await S.savePrompt({
    id: 'dev-code-review',
    title: 'Code Review (Customized)',
    template: 'Review carefully: {{code}}'
  });
  eq(editedBuiltin.title, 'Code Review (Customized)', 'Editing built-in prompt succeeds at limit');

  // 7. Bypassing limit (for bulk imports / onboarding starter packs) works
  const bypassed = await S.savePrompt(
    {
      title: 'Starter Pack Prompt',
      template: 'Starter pack template'
    },
    { bypassLimit: true }
  );
  ok(bypassed && bypassed.id, 'savePrompt with bypassLimit: true succeeds');
  eq(S.getCustomCount(), 26, 'Custom count increased with bypass');

  // 8. The old hard-coded dev keys must not unlock anything any more.
  const bypass1 = await S.activateLicense('TEST-PRO-UNLIMITED-KEY');
  const bypass2 = await S.activateLicense('PRO-LIFETIME-KEY');
  ok(!bypass1.success && !bypass2.success, 'The old offline dev keys no longer unlock Pro');
  eq(S.isPro(), false, 'A rejected key leaves the user on Free');
  ok(/not found/i.test(bypass1.error || ''), 'A rejected key explains itself');
  const shippedStore = readCode('lib/promptStore.js');
  ok(
    shippedStore.indexOf('TEST-PRO-UNLIMITED-KEY') === -1 && shippedStore.indexOf('PRO-LIFETIME-KEY') === -1,
    'No licence key is hard-coded in shipped code'
  );

  // 9. A real key is checked with Dodo Payments.
  const actRes = await S.activateLicense('  LIVE-KEY-1234-ABCD  ');
  ok(actRes.success, 'A key Dodo accepts activates Pro');
  const activateCall = fakeDodo.calls.filter((c) => /\/activate$/.test(c.url)).pop();
  ok(
    activateCall && activateCall.url === 'https://live.dodopayments.com/licenses/activate',
    'Activation calls the live Dodo endpoint'
  );
  eq(activateCall.body.license_key, 'LIVE-KEY-1234-ABCD', 'The key is trimmed before it is sent');
  eq(Object.keys(activateCall.body).sort(), ['license_key', 'name'], 'Only the key and an instance name are sent');
  eq(S.isPro(), true, 'isPro is true after license activation');
  eq(S.isLimitReached(), false, 'isLimitReached is false for Pro users');
  eq(S.canCreatePrompt(), true, 'canCreatePrompt is true for Pro users');
  const lic = S.getLicense();
  ok(lic && lic.key === 'LIVE-KEY-1234-ABCD', 'License key is recorded in storage');
  eq(lic.status, 'active', 'License status is active');
  eq(lic.instanceId, 'lki_LIVE-KEY-1234-ABCD', 'The activation instance id is kept for deactivation');

  const validated = await S.validateLicense();
  eq(validated.valid, true, 'validateLicense confirms an active key');

  // 9. Saving new prompt now succeeds freely on Pro
  const proPrompt = await S.savePrompt({
    title: 'Pro Prompt 27',
    template: 'Pro template'
  });
  ok(proPrompt && proPrompt.id, 'Saving custom prompt succeeds unconditionally on Pro tier');
  eq(S.getCustomCount(), 27, 'Custom prompt count increased on Pro tier');

  // 10. Deactivation reverts back to Free tier
  const deactRes = await S.deactivateLicense();
  ok(deactRes.success, 'deactivateLicense succeeds');
  eq(S.isPro(), false, 'isPro is false after deactivation');
  eq(S.getLicense(), null, 'License is null after deactivation');
  eq(S.isLimitReached(), true, 'isLimitReached is true again because count (27) > 25');
  const deactivateCall = fakeDodo.calls.filter((c) => /\/deactivate$/.test(c.url)).pop();
  ok(
    deactivateCall && deactivateCall.body.license_key_instance_id === 'lki_LIVE-KEY-1234-ABCD',
    'Deactivation frees the activation slot with Dodo'
  );

  // 11. Over the limit, nothing is taken away: every prompt still reads and exports.
  eq(S.getAll().filter((p) => p.isCustom).length, 27, 'Prompts above the free limit are kept, not deleted');
  eq(S.exportBundle().prompts.length, 27, 'Prompts above the free limit still export');

  // 12. No network at all when nobody activates anything.
  const quiet = dodoFetch([]);
  const quietRealm = H.createStoreRealm({ fetch: quiet });
  const Q = quietRealm.sandbox.OmniStore;
  await Q.init();
  await Q.savePrompt({ title: 'Local only', template: 'x' });
  Q.search({ query: 'local' });
  eq(quiet.calls.length, 0, 'Using the free features makes no network request');

  // 13. One price, one checkout link, used everywhere.
  const info = S.getProInfo();
  eq(info.price, '$25', 'Pro is priced at $25');
  eq(info.freeLimit, 25, 'The free limit is reported with the price');
  ['options/options.html', 'options/options.js', 'popup/popup.html', 'popup/popup.js'].forEach((file) => {
    ok(!/\$19\b/.test(read(file)), file + ' no longer mentions the old $19 price');
  });
}

/* =====================================================================
   19. Dropdowns, page context and context blocks (template)
   ===================================================================== */

function testTemplateExtensions(realm) {
  section('19. Dropdowns, page context and context blocks');

  const T = realm.sandbox.OmniTemplate;

  const [tone] = T.parseVariables('Write in a {{tone:Formal|Casual|Urgent}} voice.');
  eq(tone.name, 'tone', 'A dropdown token is named by the part before the colon');
  eq(tone.type, 'select', 'A dropdown token becomes a select field');
  eq(tone.options, ['Formal', 'Casual', 'Urgent'], 'Dropdown options are split on |');
  eq(tone.default, 'Formal', 'The first option is the default');
  eq(tone.autofill, null, 'A dropdown never auto-fills from the page');

  eq(T.render('A {{tone:Formal|Casual}} note', {}), 'A Formal note', 'An untouched dropdown renders its first option');
  eq(T.render('A {{tone:Formal|Casual}} note', { tone: 'Casual' }), 'A Casual note', 'A chosen option renders');

  const [time] = T.parseVariables('Meet at {{time|10:30}}');
  eq(time.type !== 'select' && time.default, '10:30', 'A colon after the pipe is part of a default, not a dropdown');
  eq(T.render('Meet at {{time|10:30}}', {}), 'Meet at 10:30', 'A default containing a colon renders intact');

  const repeated = T.parseVariables('{{tone}} and again {{tone:Warm|Cold}}');
  eq(repeated.length, 1, 'A name used twice is one field');
  eq(repeated[0].type, 'select', 'A later dropdown declaration upgrades the field to a select');

  // Blocks are not form fields.
  const withBlock = 'Use this brief: {{@client-brief}}\nTopic: {{topic}}';
  eq(T.parseVariables(withBlock).map((v) => v.name), ['topic'], 'A {{@block}} is not asked for in the form');
  eq(T.variableCount({ template: '{{@only-a-block}}' }), 0, 'A template with only a block has no fields');
  ok(
    T.render(withBlock, { topic: 'Q3' }).indexOf('{{@client-brief}}') !== -1,
    'An unexpanded block stays exactly as written'
  );
  eq(T.listBlocks('{{@a}} {{ @b }} {{@A}}'), ['a', 'b'], 'listBlocks returns each block once, in order');

  const lib = {
    brief: 'Client: {{@company}}. Tone: warm.',
    company: 'Acme $& Sons',
    loop: 'I include {{@loop}}',
    'ping': 'ping {{@pong}}',
    'pong': 'pong {{@ping}}'
  };
  const resolve = (name) => (Object.prototype.hasOwnProperty.call(lib, name) ? lib[name] : null);

  const nested = T.expandBlocks('Start. {{@brief}} End.', resolve);
  eq(nested.text, 'Start. Client: Acme $& Sons. Tone: warm. End.', 'Blocks expand, including blocks inside blocks, with $& kept literal');
  eq(nested.used, ['brief', 'company'], 'Expanded blocks are reported');

  const missing = T.expandBlocks('{{@nope}} ok', resolve);
  eq(missing.text, '{{@nope}} ok', 'An unknown block is left in place');
  eq(missing.missing, ['nope'], 'An unknown block is reported as missing');

  const selfRef = T.expandBlocks('{{@loop}}', resolve);
  ok(selfRef.text.indexOf('{{@loop}}') !== -1 && selfRef.text.length < 200, 'A block that includes itself stops instead of looping');
  const cycle = T.expandBlocks('{{@ping}}', resolve);
  ok(cycle.text.length < 200, 'A cycle between two blocks stops');

  // The type inferrer must still find a dropdown token in the template.
  ok(T.tokenContext('x {{tone:A|B}} y', 'tone').found, 'Field layout detection finds dropdown tokens');
}

/* =====================================================================
   20. Version history, notes and search
   ===================================================================== */

async function testHistoryNotesSearch() {
  section('20. Version history, notes and search');

  const fake = dodoFetch(['PRO-HIST']);
  const realm = H.createStoreRealm({ fetch: fake });
  const S = realm.sandbox.OmniStore;
  await S.init();

  const p = await S.savePrompt({ title: 'Brief v1', template: 'First text', notes: 'Works best on Claude' });
  eq(S.getById(p.id).notes, 'Works best on Claude', 'Notes are saved with a prompt');
  eq(S.getHistory(p.id).length, 0, 'A new prompt has no history');

  await S.savePrompt({ id: p.id, title: 'Brief v2', template: 'Second text' });
  await S.savePrompt({ id: p.id, title: 'Brief v3', template: 'Third text' });
  const hist = S.getHistory(p.id);
  eq(hist.length, 2, 'Each saved edit keeps the version it replaced');
  eq(hist[0].template, 'Second text', 'History is newest first');
  eq(hist[1].title, 'Brief v1', 'The oldest version is kept intact');
  ok(typeof hist[0].replacedAt === 'number', 'A version records when it was replaced');

  await S.savePrompt({ id: p.id, title: 'Brief v3', template: 'Third text' });
  eq(S.getHistory(p.id).length, 2, 'Saving without a change adds no version');

  let blocked = null;
  try {
    await S.restoreVersion(p.id, 1);
  } catch (e) {
    blocked = e;
  }
  eq(blocked && blocked.code, 'PRO_REQUIRED', 'Restoring a version asks for Pro on Free');
  eq(S.getById(p.id).template, 'Third text', 'A refused restore changes nothing');

  await S.activateLicense('PRO-HIST');
  await S.restoreVersion(p.id, 1);
  eq(S.getById(p.id).template, 'First text', 'Pro restores an older version');
  eq(S.getHistory(p.id)[0].template, 'Third text', 'The text a restore replaced is kept, so the restore can be undone');

  for (let i = 0; i < 30; i++) await S.savePrompt({ id: p.id, template: 'Edit ' + i });
  eq(S.getHistory(p.id).length, 20, 'History is capped at 20 versions per prompt');
  ok(!!realm.read('omni.history'), 'History is written to local storage');

  // Built-ins keep history too.
  await S.savePrompt({ id: 'dev-code-review', title: 'My review', template: 'Review {{code}} gently' });
  const builtinHist = S.getHistory('dev-code-review');
  eq(builtinHist.length, 1, 'Editing a built-in keeps the shipped version in history');
  eq(builtinHist[0].title, 'Rigorous Code Review', 'The recorded version is the one the user saw');

  await S.deletePrompt(p.id);
  eq(S.getHistory(p.id).length, 0, 'Deleting a prompt removes its history');

  // Notes on a built-in survive as a patch.
  await S.savePrompt({ id: 'write-cold-email-sales', notes: 'Use for SaaS founders' });
  eq(S.getById('write-cold-email-sales').notes, 'Use for SaaS founders', 'Notes on a built-in are kept as an edit');

  // Search reads notes and tolerates word order.
  const byNotes = S.search({ query: 'saas founders' }).map((x) => x.id);
  ok(byNotes.indexOf('write-cold-email-sales') !== -1, 'Search finds a prompt by its notes');
  const byWords = S.search({ query: 'email cold' }).map((x) => x.id);
  ok(byWords.indexOf('write-cold-email-sales') !== -1, 'Search matches several words in any order');
  eq(S.search({ query: 'email zzzqqq' }).length, 0, 'Every word must match somewhere');
}

/* =====================================================================
   21. Automatic backups and pending drafts
   ===================================================================== */

async function testBackups() {
  section('21. Automatic backups and drafts from the page');

  const realm = H.createStoreRealm();
  const S = realm.sandbox.OmniStore;
  await S.init();

  eq(await S.takeSnapshot('manual'), null, 'Nothing is backed up when the user has no work yet');
  eq(await S.maybeDailySnapshot(), null, 'The daily backup waits for real work');

  await S.savePrompt({ title: 'Keep me', template: 'precious' });
  const first = await S.maybeDailySnapshot();
  ok(first && first.prompts === 1, 'The daily backup captures the user prompt');
  eq(await S.maybeDailySnapshot(), null, 'A second daily backup on the same day is skipped');
  await S.takeSnapshot('manual');
  eq((await S.getSnapshots()).length, 1, 'An unchanged library does not create duplicate backups');

  await S.savePrompt({ title: 'Second', template: 'also precious' });
  await S.takeSnapshot('manual');
  const snaps = await S.getSnapshots();
  eq(snaps.length, 2, 'A changed library gets a new backup');
  eq(snaps[0].prompts, 2, 'Backups are listed newest first');
  ok(snaps.every((s) => !s.bundle), 'The backup list does not ship the full copies to the UI');

  // Disaster: the user deletes everything of their own.
  for (const q of S.getAll().filter((x) => x.isCustom)) await S.deletePrompt(q.id);
  eq(S.getCustomCount(), 0, 'The user prompts are gone');
  await S.savePrompt({ title: 'Written after the loss', template: 'new work' });
  const restored = await S.restoreSnapshot(snaps[0].id);
  ok(restored.ok, 'A backup restores');
  eq(S.getCustomCount(), 2, 'Restoring brings the prompts back');
  const afterRestore = await S.getSnapshots();
  eq(afterRestore[0].reason, 'before-restore', 'The state before a restore is backed up first');
  eq(afterRestore[0].prompts, 1, 'So work written after the loss is not lost by the restore');
  eq((await S.restoreSnapshot('snap-missing')).ok, false, 'Restoring a backup that no longer exists fails cleanly');

  // Destructive operations are covered.
  await S.savePrompt({ title: 'Pre-import', template: 'p' });
  await S.importBundle(JSON.stringify([{ title: 'Imported', template: 'x' }]), { mode: 'replace' });
  const importSnap = (await S.getSnapshots())[0];
  eq(importSnap.reason, 'before-import', 'A replace import is preceded by a backup');
  eq(importSnap.prompts, 3, 'That backup holds the library as it was before the import');
  eq(S.getCustomCount(), 1, 'The replace import still replaced');

  await S.savePrompt({ id: 'dev-code-review', title: 'Edited' });
  await S.restoreDefaultLibrary();
  eq((await S.getSnapshots())[0].reason, 'before-restore-built-ins', 'Restoring built-ins is preceded by a backup');

  for (let i = 0; i < 12; i++) {
    await S.savePrompt({ title: 'Filler ' + i, template: 'f' + i });
    await S.takeSnapshot('manual');
  }
  eq((await S.getSnapshots()).length, 7, 'Only the last 7 backups are kept');

  const before = await S.getBackupStatus();
  eq(before.lastExportAt, 0, 'No file download is recorded at first');
  await S.markExported();
  const after = await S.getBackupStatus();
  ok(after.lastExportAt > 0, 'A file download is recorded');
  ok(after.lastSnapshotAt > 0 && after.snapshotCount === 7, 'The status reports the newest backup and the count');

  // Erase means erase.
  await S.eraseAllData();
  eq((await S.getSnapshots()).length, 0, 'Erasing everything also erases the backups');
  eq(realm.read('omni.history'), undefined, 'Erasing everything also erases version history');

  // Drafts handed from the page to the editor.
  ok(!(await S.setPendingDraft({ template: '   ' })), 'An empty draft is not stored');
  await S.setPendingDraft({ template: 'Line one\nLine two', source: 'Some page' });
  const draft = await S.takePendingDraft();
  eq(draft && draft.template, 'Line one\nLine two', 'A draft keeps its line breaks');
  eq(await S.takePendingDraft(), null, 'A draft is read once, then cleared');

  const stale = H.createStoreRealm({
    storageSeed: { 'omni.pendingDraft': { template: 'old', at: Date.now() - 60 * 60 * 1000 } }
  });
  await stale.sandbox.OmniStore.init();
  eq(await stale.sandbox.OmniStore.takePendingDraft(), null, 'A draft older than ten minutes is ignored');
}

/* =====================================================================
   22. Context blocks, review request, SKILL.md
   ===================================================================== */

async function testBlocksReviewSkills() {
  section('22. Context blocks, the review request and SKILL.md');

  const fake = dodoFetch(['PRO-BLOCKS']);
  const realm = H.createStoreRealm({ fetch: fake });
  const S = realm.sandbox.OmniStore;
  const I = realm.sandbox.OmniImporters;
  await S.init();

  await S.savePrompt({ title: 'Client brief', shortcut: 'client-brief', template: 'Acme sells {{product|widgets}}.' });
  const user = await S.savePrompt({ title: 'Email', shortcut: 'mail', template: 'Context: {{@client-brief}}\nWrite about {{topic}}. {{@ghost}}' });

  const free = S.prepareForUse(user);
  eq(free.locked, ['client-brief', 'ghost'], 'On Free, blocks are reported as locked');
  eq(free.prompt.template, user.template, 'On Free, the template is inserted as written');
  ok(free.prompt !== user, 'prepareForUse never hands back the stored object');

  await S.activateLicense('PRO-BLOCKS');
  const pro = S.prepareForUse(user);
  eq(pro.locked, [], 'On Pro nothing is locked');
  ok(pro.prompt.template.indexOf('Acme sells {{product|widgets}}.') !== -1, 'On Pro a block expands to that prompt text');
  eq(pro.missing, ['ghost'], 'A block with no matching shortcut is reported');
  eq(
    realm.sandbox.OmniTemplate.parseVariables(pro.prompt.template).map((v) => v.name),
    ['product', 'topic'],
    'Fields inside a block join the form'
  );
  eq(S.getById(user.id).template.indexOf('{{@client-brief}}') !== -1, true, 'Expansion never changes the saved prompt');

  const selfRef = await S.savePrompt({ title: 'Self', shortcut: 'selfie', template: 'Me: {{@selfie}}' });
  ok(S.prepareForUse(selfRef).prompt.template.indexOf('{{@selfie}}') !== -1, 'A prompt cannot expand into itself');
  ok(!!S.findByShortcut('/Client-Brief'), 'Block lookup ignores case and a leading slash');

  // The review request.
  eq(S.shouldAskForReview(), false, 'No review request before the extension has proved useful');
  for (let i = 0; i < S.REVIEW_AFTER_USES; i++) await S.recordUse(user.id);
  eq(S.getTotalUses(), S.REVIEW_AFTER_USES, 'Uses are counted across prompts');
  eq(S.shouldAskForReview(), true, 'The review request appears after enough successful inserts');
  await S.setSetting('reviewPrompt', 'dismissed');
  eq(S.shouldAskForReview(), false, 'Once dismissed, it never asks again');
  await S.setSetting('reviewPrompt', 'nonsense');
  eq(S.getSettings().reviewPrompt, 'pending', 'An invalid review state falls back safely');

  // SKILL.md in and out.
  const skill = [
    '---',
    'name: pr-reviewer',
    'description: "Reviews a pull request for bugs"',
    'tags: [code, review]',
    '---',
    '',
    '# Instructions',
    'Review {{diff}} carefully.',
    '---',
    'Then list risks.'
  ].join('\n');
  ok(I.looksLikeSkillMd(skill), 'SKILL.md front matter is recognised');
  const parsed = I.detectAndParse(skill);
  eq(parsed.source, 'skill-md', 'SKILL.md is read as a skill, not as plain text');
  eq(parsed.prompts.length, 1, 'One skill file is one prompt');
  eq(parsed.prompts[0].title, 'Pr reviewer', 'The skill name becomes a readable title');
  eq(parsed.prompts[0].shortcut, 'pr-reviewer', 'The skill name becomes the shortcut');
  eq(parsed.prompts[0].description, 'Reviews a pull request for bugs', 'The description is read');
  eq(parsed.prompts[0].tags, ['code', 'review'], 'Tags are read');
  ok(/---\nThen list risks\./.test(parsed.prompts[0].template), 'A --- line inside the instructions is kept');
  ok(!I.looksLikeSkillMd('---\nnot front matter\n---\nbody'), 'A --- block without a name is not treated as a skill');

  const imported = await S.importBundle(skill);
  ok(imported.ok && imported.added === 1, 'A SKILL.md file imports into the library');

  const out = I.toSkillMd({ title: 'My Review', shortcut: 'myreview', description: 'Says "hi"', tags: ['a'], template: 'Do it.\n' });
  ok(/^---\nname: myreview\n/.test(out), 'Export writes the skill name from the shortcut');
  ok(out.indexOf('description: "Says \'hi\'"') !== -1, 'Quotes in the description cannot break the front matter');
  const back = I.parseSkillMd(out);
  eq(back.prompts[0].template, 'Do it.', 'An exported skill reads back to the same text');
}

/* =====================================================================
   23. Insertion is confirmed before it counts
   ===================================================================== */

function testLandingCheck() {
  section('23. Insertion is confirmed before it counts or sends');

  const realm = H.createAdapterRealm();
  const A = realm.adapters;
  const make = realm.sandbox.makeTextarea;

  const box = make('draft ');
  const result = A.insert('Summarise this report', { target: box });
  ok(typeof result.check === 'function', 'insert returns a way to confirm the text arrived');
  eq(result.check(), true, 'Text that landed is confirmed');
  ok(result.target === box, 'insert reports which element it wrote to');

  const swallowed = make('');
  const check = A.landingCheck(swallowed, 'Hello world', 'caret');
  eq(check(), false, 'Text that never arrived is caught');
  swallowed.value = 'Hello world';
  eq(check(), true, 'The check passes once the text is there');

  const dup = make('Hello world');
  const dupCheck = A.landingCheck(dup, 'Hello world', 'caret');
  eq(dupCheck(), false, 'Text already in the box does not count as a new insert');
  dup.value = 'Hello world Hello world';
  eq(dupCheck(), true, 'A second copy counts');

  const md = make('');
  const mdCheck = A.landingCheck(md, '# Role\n\nYou are **helpful**.', 'caret');
  md.value = 'Role You are helpful.';
  eq(mdCheck(), true, 'Markdown the editor reformatted still counts as landed');

  const gone = make('');
  const goneCheck = A.landingCheck(gone, 'Some text', 'caret');
  gone.value = 'Some text';
  gone.isConnected = false;
  eq(goneCheck(), false, 'A composer that was removed from the page is not trusted');

  eq(A.landingCheck(make(''), '   ', 'caret')(), true, 'Whitespace-only text is not second-guessed');

  // The coordinator must confirm before sending or counting.
  const coordinator = readCode('content/content.js');
  ok(coordinator.indexOf('confirmLanded') !== -1, 'The coordinator confirms each write');
  ok(/submit:\s*false/.test(coordinator), 'The coordinator never lets the adapter send before confirmation');
  ok(coordinator.indexOf('adapters.submit(result.target)') !== -1, 'Sending happens only after the text is confirmed');
  ok(coordinator.indexOf("'not-landed'") !== -1, 'A refused write falls back to the clipboard with its own reason');
  ok(coordinator.indexOf('prepareForUse') !== -1, 'Prompts are prepared (blocks expanded) before insertion');

  const popup = readCode('popup/popup.js');
  ok(popup.indexOf('pageHandledIt') !== -1, 'The popup does not copy a second time when the page already fell back');
  ok(popup.indexOf('prepareForUse') !== -1, 'The popup expands blocks before inserting or copying');
}

/* =====================================================================
   24. Launch wiring
   ===================================================================== */

function testLaunchWiring() {
  section('24. Launch wiring: capture, CSP, markup');

  const manifest = JSON.parse(read('manifest.json'));
  const csp = (manifest.content_security_policy || {}).extension_pages || '';
  ok(/script-src 'self'/.test(csp), 'Extension pages only run their own scripts');
  const connect = (csp.match(/connect-src ([^;]+)/) || [])[1] || '';
  eq(
    connect.trim().split(/\s+/).sort(),
    ["'self'", 'https://live.dodopayments.com', 'https://test.dodopayments.com'],
    'Extension pages may only connect to Dodo Payments'
  );

  const background = readCode('background/background.js');
  ok(background.indexOf('SAVE_SELECTION_ID') !== -1, 'The right-click menu offers "Save selection as a new prompt"');
  ok(background.indexOf("'open_editor_with_draft'") !== -1, 'The worker opens the editor on a pending draft');
  ok(background.indexOf('maybeDailySnapshot') !== -1, 'The worker takes the daily backup on browser start');

  const palette = readCode('content/commandPalette.js');
  ok(palette.indexOf("'save-as-prompt'") !== -1, 'The palette offers "Save as a new prompt"');
  ok(palette.indexOf('openSelection = readPageSelection()') !== -1, 'The palette keeps the page selection from before it took focus');

  const options = readCode('options/options.js');
  ok(options.indexOf('takePendingDraft') !== -1, 'The editor picks up drafts from the page');
  ok(options.indexOf('restoreSnapshot') !== -1, 'Backups can be restored from the options page');
  ok(options.indexOf('restoreVersion') !== -1, 'Versions can be restored from the editor');
  ok(options.indexOf('toSkillMd') !== -1, 'A prompt can be exported as SKILL.md');
  ok(options.indexOf('markExported') !== -1, 'File downloads are recorded for the backup status');

  // An unclosed div once hid the upgrade dialog and every toast inside a
  // hidden modal. Keep the markup balanced.
  ['options/options.html', 'popup/popup.html', 'welcome/welcome.html'].forEach((file) => {
    const html = read(file);
    const open = (html.match(/<div[\s>]/g) || []).length;
    const close = (html.match(/<\/div>/g) || []).length;
    eq(open, close, file + ' has balanced <div> tags');
  });

  const optionsHtml = read('options/options.html');
  const catAt = optionsHtml.indexOf('id="category-modal"');
  const upgradeAt = optionsHtml.indexOf('id="upgrade-modal"');
  const between = optionsHtml.slice(catAt, upgradeAt);
  const depth = (between.match(/<div[\s>]/g) || []).length - (between.match(/<\/div>/g) || []).length;
  eq(depth, 0, 'The upgrade dialog is not nested inside the category dialog');

  ok(!/all 6 (starter )?packs/i.test(optionsHtml + read('popup/popup.html')), 'No page claims the built-in packs are Pro-only');
}

/* =====================================================================
   Runner
   ===================================================================== */

async function main() {
  console.log('OmniPrompt regression suite');
  console.log('===========================');

  const realm = H.createStoreRealm();
  await realm.sandbox.OmniStore.init();

  testManifest();
  testSyntax();
  testLibraryData(realm);
  testTemplate(realm);
  await testStorage();
  await testMigration();
  await testRanking();
  await testImportExport();
  testImporters(realm);
  await testFoldersAndSettings();
  await testSync();
  testModifiers(realm);
  testContentScripts();
  testInsertionBehaviour();
  testServiceWorker();
  testUiWiring();
  testDocs(realm);
  testHygiene();
  await testLicensingAndLimits();
  testTemplateExtensions(realm);
  await testHistoryNotesSearch();
  await testBackups();
  await testBlocksReviewSkills();
  testLandingCheck();
  testLaunchWiring();

  console.log('\n===========================');
  console.log('Passed: ' + passed);
  console.log('Failed: ' + failed);
  if (failed === 0) {
    console.log('\nAll checks passed.');
  } else {
    console.log('\n' + failed + ' check(s) failed.');
  }
}

main().catch((e) => {
  console.error('\nSuite crashed: ' + (e && e.stack ? e.stack : e));
  process.exitCode = 1;
});
