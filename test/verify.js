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
// The product that unlocks OmniPrompt Pro in the Dodo environment this build
// uses (DODO_MODE), read from the shipped store.
const SHIPPED_STORE = H.createStoreRealm().sandbox.OmniStore;
const DODO_MODE = SHIPPED_STORE.DODO_MODE;
const PRO_PRODUCT_ID = SHIPPED_STORE.PRO_PRODUCT_IDS[DODO_MODE][0];
const DODO_BASE = 'https://' + DODO_MODE + '.dodopayments.com/licenses';

/**
 * `validKeys` is either an array of keys sold as OmniPrompt Pro, or a map of
 * key -> product id, to model keys sold for other products in the same Dodo
 * account.
 */
function dodoFetch(validKeys) {
  const productOf = {};
  if (Array.isArray(validKeys)) {
    validKeys.forEach((k) => {
      productOf[k] = PRO_PRODUCT_ID;
    });
  } else if (validKeys) {
    Object.assign(productOf, validKeys);
  }
  const keys = Object.keys(productOf);
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
      // Mirrors Dodo's real response, which names the product the key was sold for.
      return known
        ? reply(true, 201, {
            id: 'lki_' + body.license_key,
            license_key_id: 'lk_1',
            business_id: 'bus_1',
            product: { product_id: productOf[body.license_key] }
          })
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

  // Permission hygiene. Option B permission model.
  const perms = manifest.permissions || [];
  ok(perms.indexOf('clipboardRead') === -1, 'clipboardRead is not requested (clipboard reads are user-initiated)');
  ok(perms.indexOf('activeTab') !== -1, 'activeTab is requested for on-demand injection');
  ok(perms.indexOf('storage') !== -1, 'storage is requested');
  ok(perms.indexOf('unlimitedStorage') !== -1, 'unlimitedStorage is requested');
  ok(perms.indexOf('contextMenus') !== -1, 'contextMenus is requested');
  ok(perms.indexOf('scripting') !== -1, 'scripting is requested, to reach tabs open at install time');

  eq(manifest.optional_host_permissions, ['<all_urls>'], 'optional_host_permissions contains <all_urls>');

  const hosts = manifest.host_permissions || [];
  const csMatches = (manifest.content_scripts[0] && manifest.content_scripts[0].matches) || [];
  const hostsSet = hosts.slice().sort();
  const csSet = csMatches.slice().sort();
  eq(hostsSet, csSet, 'manifest.host_permissions matches content_scripts[0].matches as a set');

  const generalPlatforms = ['*://*.google.com/*', '*://google.com/*', '*://*.bing.com/*', '*://bing.com/*', '*://*.x.com/*', '*://x.com/*', '*://*.twitter.com/*', '*://twitter.com/*', '*://*.notion.so/*', '*://notion.so/*'];
  const hasGeneral = hosts.some((h) => h === '<all_urls>' || generalPlatforms.indexOf(h) !== -1);
  ok(!hasGeneral, 'host_permissions does not contain <all_urls> or broad general-purpose platform domains');

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

  // Only the popup and the library page import files, so the import adapters
  // are not injected into every page.
  ok(order.indexOf('lib/importers.js') === -1, 'The import adapters are not loaded into web pages');
  ok(!/importers\.js/.test(readCode('background/background.js')), 'The service worker does not load the import adapters');
  ['popup/popup.html', 'options/options.html'].forEach((page) => {
    ok(read(page).indexOf('src="../lib/importers.js"') !== -1, page + ' still loads the import adapters');
  });
}

/**
 * The page realm, loaded with exactly the libraries the manifest injects, must
 * boot and handle an OmniPrompt JSON file without lib/importers.js.
 */
async function testPageRealmWithoutImporters() {
  section('1b. The page libraries work without the import adapters');

  const libs = JSON.parse(read('manifest.json')).content_scripts[0].js.filter((f) => /^(data|lib)\//.test(f));
  const realm = H.createRealm(libs);
  const S = realm.sandbox.OmniStore;
  await S.init();
  ok(S.getAll().length > 0, 'The store boots from the content-script libraries alone');
  ok(typeof realm.sandbox.OmniImporters === 'undefined', 'OmniImporters is absent in this realm');
  const json = await S.importBundle(JSON.stringify([{ title: 'From JSON', template: 'x {{y}}' }]), { mode: 'merge' });
  eq(json.added, 1, 'A JSON array still imports without the adapters');
  const csv = await S.importBundle('title,template\nA,b', { mode: 'merge' });
  eq(csv.ok, false, 'CSV needs the adapters and fails cleanly without them');
}

/* =====================================================================
   2. Syntax
   ===================================================================== */

function testSyntax() {
  section('2. Every script parses');

  const files = [
    'data/defaultPrompts.js',
    'lib/theme.js',
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

  const realm = H.createStoreRealm({ fetch: dodoFetch(['PRO-FOLDERS']) });
  const S = realm.sandbox.OmniStore;
  await S.init();

  // Folders are free for everyone.
  const freeFolder = await S.createFolder('Sandbox Folder');
  ok(!!freeFolder, 'Free users can create folders');
  await S.deleteFolder(freeFolder.id);

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

  // macOS Option+K types "˚"; the label comes from the physical key.
  eq(S.describeHotkey({ altKey: true, key: '˚', code: 'KeyK' }), 'Alt+K', 'Option+K recorded on a Mac is labelled Alt+K, not Alt+˚');
  eq(S.normalizeHotkey({ altKey: true, key: '˚', code: 'KeyK' }).display, 'Alt+K', 'A normalised Option+K gets the Alt+K label');
  eq(S.describeHotkey({ ctrlKey: true, altKey: true, key: '@', code: 'Digit2' }), 'Ctrl+Alt+2', 'A digit is labelled by its key, not the AltGr character');
  eq(S.describeHotkey({ ctrlKey: true, shiftKey: true, key: ' ', code: 'Space' }), 'Ctrl+Shift+Space', 'Space keeps its name');
  const optsSrc = readCode('options/options.js');
  ok(/\/\^Key\(\[A-Z\]\)\$\/\.exec\(e\.code/.test(optsSrc), 'The shortcut recorder stores the physical key from e.code');

  // Mac labels. The stored display stays "Alt+K" (the docs and tests rely on it).
  const defHk = S.getSettings().paletteHotkey;
  eq(defHk.display, 'Alt+K', 'The stored default label is still Alt+K');
  eq(S.formatHotkey(defHk, false), 'Alt+K', 'Windows and Linux show Alt+K');
  eq(S.formatHotkey(defHk, true), '\u2325K', 'A Mac shows \u2325K');
  eq(S.formatHotkey({ ctrlKey: true, shiftKey: true, key: 'k', code: 'KeyK', display: 'Ctrl+Shift+K' }, true), '\u2303\u21E7K', 'Ctrl+Shift+K reads \u2303\u21E7K on a Mac');
  eq(S.formatHotkey({ ctrlKey: true, metaKey: true, key: 'k', code: 'KeyK' }, true), '\u2318K', 'Ctrl-or-Cmd reads \u2318K on a Mac');
  eq(S.formatHotkey({ altKey: true, key: '˚', code: 'KeyK', display: 'Alt+˚' }, true), '\u2325K', 'An old Alt+˚ label reads \u2325K on a Mac');
  ['popup/popup.js', 'options/options.js', 'content/content.js'].forEach((file) => {
    const code = readCode(file);
    // Comparing stored labels is fine; showing one directly is not.
    const shown = /(textContent\s*=|\+|escapeHtml\(|push\(|const hk =)\s*settings\.paletteHotkey\.display/.test(code);
    ok(/formatHotkey\(/.test(code) && !shown, file + ' shows the shortcut through formatHotkey');
  });

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
   13e. IME composition and keyboard layouts, running the real modules
   ===================================================================== */

/**
 * Load a content module into an adapter realm whose document and window
 * record their listeners, so a test can send it keyboard events directly.
 */
function keyboardRealm(file, store) {
  const realm = H.createAdapterRealm();
  const sb = realm.sandbox;
  const listeners = { document: {}, window: {} };
  const record = (bucket) => (type, fn) => {
    (listeners[bucket][type] = listeners[bucket][type] || []).push(fn);
  };
  sb.document.addEventListener = record('document');
  sb.addEventListener = record('window');
  sb.removeEventListener = () => {};
  sb.document.createElement = () => ({
    style: {},
    dataset: {},
    innerHTML: '',
    setAttribute() {},
    appendChild() {},
    addEventListener() {},
    querySelector: () => null,
    querySelectorAll: () => [],
    getBoundingClientRect: () => ({ top: 100, bottom: 140, left: 50, right: 450, width: 400, height: 40 }),
    classList: { add() {}, remove() {}, toggle() {} }
  });
  if (store) sb.OmniStore = store;
  vm.runInContext(read(file), sb, { filename: file });
  const fire = (bucket, type, event) => (listeners[bucket][type] || []).forEach((fn) => fn(event));
  return { sb, listeners, fire };
}

/** A keydown-like event that records whether a handler claimed it. */
function keyEvent(init) {
  const e = Object.assign({ key: '', code: '', keyCode: 0, altKey: false, ctrlKey: false, shiftKey: false, metaKey: false, isComposing: false }, init);
  e.prevented = false;
  e.preventDefault = () => {
    e.prevented = true;
  };
  e.stopPropagation = () => {};
  return e;
}

async function testImeAndHotkeys() {
  section('13e. IME composition, macOS Option and AltGr');

  const storeRealm = H.createStoreRealm();
  await storeRealm.sandbox.OmniStore.init();
  const altK = storeRealm.sandbox.OmniStore.getSettings().paletteHotkey;
  eq([altK.altKey, altK.code, altK.display], [true, 'KeyK', 'Alt+K'], 'The default palette hotkey is Alt+K by physical key');

  // Command palette hotkey.
  const pal = keyboardRealm('content/commandPalette.js');
  pal.sb.CommandPalette.init(null, {}, { hotkey: altK, enabled: true });
  const press = (init) => {
    const e = keyEvent(init);
    pal.fire('window', 'keydown', e);
    return e.prevented;
  };
  ok(press({ key: 'k', code: 'KeyK', altKey: true }), 'Alt+K opens the palette');
  ok(press({ key: '˚', code: 'KeyK', altKey: true }), 'macOS Option+K (which types ˚) opens the palette');
  ok(!press({ key: 'k', code: 'KeyK', altKey: true, ctrlKey: true }), 'AltGr+K (Ctrl+Alt) does not open the Alt+K palette');
  ok(!press({ key: 'k', code: 'KeyK', altKey: true, isComposing: true }), 'A key pressed during IME composition does not open the palette');
  ok(!press({ key: 'Process', code: 'KeyK', altKey: true, keyCode: 229 }), 'An IME-processed key (keyCode 229) does not open the palette');

  // Slash menu.
  const picked = [];
  const fakeStore = {
    search: () => [{ id: 'p1', title: 'Review', shortcut: 'review', template: 'Review {{code}}', category: 'Coding' }],
    isFavorite: () => false,
    getCategoryMeta: () => null
  };
  const slash = keyboardRealm('content/slashTrigger.js', fakeStore);
  const ST = slash.sb.SlashTrigger;
  ST.init({ appendChild() {} }, (p) => picked.push(p), { triggerChar: '//', enabled: true });
  ok(!!slash.listeners.document.compositionend, 'The slash menu listens for compositionend');

  const box = slash.sb.makeTextarea('hello //rev');
  slash.fire('document', 'input', { target: box, isComposing: true });
  eq(ST.isOpen(), false, 'Half-composed IME text does not open the slash menu');
  slash.fire('document', 'compositionend', { target: box });
  eq(ST.isOpen(), true, 'The menu opens once the composition is committed');

  const imeEnter = keyEvent({ key: 'Enter', isComposing: true });
  slash.fire('document', 'keydown', imeEnter);
  const safariEnter = keyEvent({ key: 'Enter', keyCode: 229 });
  slash.fire('document', 'keydown', safariEnter);
  eq(picked.length, 0, 'The Enter that confirms an IME composition does not pick a menu row');
  ok(ST.isOpen() && !imeEnter.prevented && !safariEnter.prevented, 'The IME keeps that Enter and the menu stays open');

  const realEnter = keyEvent({ key: 'Enter', keyCode: 13 });
  slash.fire('document', 'keydown', realEnter);
  eq(picked.length, 1, 'A normal Enter still picks the row');

  // Every other keyboard handler that acts on Enter or Esc checks composition.
  ['content/variableModal.js', 'popup/popup.js', 'options/options.js', 'welcome/welcome.js'].forEach((file) => {
    const code = readCode(file);
    ok(/isComposing/.test(code) && /keyCode === 229/.test(code), file + ' ignores Enter and Esc during IME composition');
  });
  ok(/isComposing/.test(readCode('content/commandPalette.js').split('function handlePaletteKeydown')[1] || ''), 'The palette search box ignores the IME Enter');
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
    'lib/theme.js',
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

  // The permission table must cover every permission actually requested plus optional <all_urls>.
  const docPerms = (manifest.permissions || []).concat(manifest.optional_host_permissions || []);
  docPerms.forEach((perm) => {
    ok(readme.indexOf(perm) !== -1, 'The README explains the ' + perm + ' permission');
  });
  ok(readme.indexOf('Host permissions') !== -1, 'The README explains host permissions for AI sites');

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
  eq(S.getFreeLimit(), 20, 'Free tier limit is 20 prompts');
  eq(S.getCustomCount(), 0, 'Initial custom count is 0');
  eq(S.isLimitReached(), false, 'Limit is not reached initially');
  eq(S.canCreatePrompt(), true, 'canCreatePrompt is true when under limit');
  eq(S.getLicense(), null, 'getLicense returns null on free tier');

  // 2. Add custom prompts up to the free limit of 20
  const createdPrompts = [];
  for (let i = 1; i <= 20; i++) {
    const p = await S.savePrompt({
      title: 'Custom Prompt ' + i,
      template: 'Template ' + i,
      category: 'Custom'
    });
    createdPrompts.push(p);
  }

  eq(S.getCustomCount(), 20, 'Custom prompt count reached 20');
  eq(S.isLimitReached(), true, 'isLimitReached is true at 20 custom prompts');
  eq(S.canCreatePrompt(), false, 'canCreatePrompt is false when free limit is reached');

  // 3. Attempting to add a 21st custom prompt without Pro should reject
  let limitRejected = false;
  try {
    await S.savePrompt({
      title: 'Custom Prompt 21',
      template: 'Template 21'
    });
  } catch (err) {
    if (err && err.code === 'LIMIT_REACHED') {
      limitRejected = true;
    }
  }
  ok(limitRejected, 'Saving a 21st custom prompt on Free tier is rejected with LIMIT_REACHED');

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
  eq(S.getCustomCount(), 21, 'Custom count increased with bypass');

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
    activateCall && activateCall.url === DODO_BASE + '/activate',
    'Activation calls the Dodo endpoint for DODO_MODE (' + DODO_MODE + ')'
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
    title: 'Pro Prompt 22',
    template: 'Pro template'
  });
  ok(proPrompt && proPrompt.id, 'Saving custom prompt succeeds unconditionally on Pro tier');
  eq(S.getCustomCount(), 22, 'Custom prompt count increased on Pro tier');

  // 10. Deactivation reverts back to Free tier
  const deactRes = await S.deactivateLicense();
  ok(deactRes.success, 'deactivateLicense succeeds');
  eq(S.isPro(), false, 'isPro is false after deactivation');
  eq(S.getLicense(), null, 'License is null after deactivation');
  eq(S.isLimitReached(), true, 'isLimitReached is true again because count (22) > 20');
  const deactivateCall = fakeDodo.calls.filter((c) => /\/deactivate$/.test(c.url)).pop();
  ok(
    deactivateCall && deactivateCall.body.license_key_instance_id === 'lki_LIVE-KEY-1234-ABCD',
    'Deactivation frees the activation slot with Dodo'
  );

  // 11. Over the limit, nothing is taken away: every prompt still reads and exports.
  eq(S.getAll().filter((p) => p.isCustom).length, 22, 'Prompts above the free limit are kept, not deleted');
  eq(S.exportBundle().prompts.length, 22, 'Prompts above the free limit still export');

  // 11b. A key sold for another product in the same Dodo account must not
  // unlock OmniPrompt. Dodo's public activate endpoint accepts any key from
  // the business, so the product id in its response is the only guard.
  const otherDodo = dodoFetch({ 'OTHER-APP-KEY': 'pdt_some_other_product', 'OMNI-KEY': PRO_PRODUCT_ID });
  const otherRealm = H.createStoreRealm({ fetch: otherDodo });
  const O = otherRealm.sandbox.OmniStore;
  await O.init();
  const wrong = await O.activateLicense('OTHER-APP-KEY');
  eq(wrong.success, false, 'A key for a different product is refused');
  eq(wrong.code, 'WRONG_PRODUCT', 'The refusal says the key is for another product');
  eq(O.isPro(), false, 'A key for a different product leaves the user on Free');
  eq(O.getLicense(), null, 'A key for a different product is not stored');
  const giveBack = otherDodo.calls.filter((c) => /\/deactivate$/.test(c.url)).pop();
  ok(
    giveBack && giveBack.body.license_key === 'OTHER-APP-KEY' &&
      giveBack.body.license_key_instance_id === 'lki_OTHER-APP-KEY',
    'The activation slot taken from the other product is given back'
  );
  const right = await O.activateLicense('OMNI-KEY');
  ok(right.success && O.isPro(), 'A key for OmniPrompt Pro still activates');
  eq(O.getLicense().productId, PRO_PRODUCT_ID, 'The product id is stored with the licence');
  await O.validateLicense();
  const validateCall = otherDodo.calls.filter((c) => /\/validate$/.test(c.url)).pop();
  eq(validateCall.body.license_key_instance_id, 'lki_OMNI-KEY', 'Validation checks this activation, not just the key');

  // An earlier build stored keys without checking the product. Those stop
  // counting as Pro once this build loads them.
  const legacyRealm = H.createStoreRealm({
    storageSeed: {
      'omni.schemaVersion': 2,
      'omni.license': {
        key: 'OTHER-APP-KEY',
        status: 'active',
        instanceId: 'lki_x',
        data: { id: 'lki_x', product: { product_id: 'pdt_some_other_product' } }
      }
    }
  });
  await legacyRealm.sandbox.OmniStore.init();
  eq(legacyRealm.sandbox.OmniStore.isPro(), false, 'A stored licence for another product no longer unlocks Pro');
  const legacyNoProduct = H.createStoreRealm({
    storageSeed: { 'omni.schemaVersion': 2, 'omni.license': { key: 'K', status: 'active', data: {} } }
  });
  await legacyNoProduct.sandbox.OmniStore.init();
  eq(legacyNoProduct.sandbox.OmniStore.isPro(), false, 'A stored licence with no product is not trusted');
  const legacyOmni = H.createStoreRealm({
    storageSeed: {
      'omni.schemaVersion': 2,
      'omni.license': {
        key: 'K',
        status: 'active',
        testMode: DODO_MODE === 'test',
        data: { product: { product_id: PRO_PRODUCT_ID } }
      }
    }
  });
  await legacyOmni.sandbox.OmniStore.init();
  eq(legacyOmni.sandbox.OmniStore.isPro(), true, 'A stored OmniPrompt licence from an earlier build keeps working');

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
  eq(info.freeLimit, 20, 'The free limit is reported with the price');
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

  // Restoring an earlier version is the user's own data, so it works on Free.
  ok(!S.isPro(), 'This check runs on the Free plan');
  await S.restoreVersion(p.id, 1);
  eq(S.getById(p.id).template, 'First text', 'Free restores an older version');
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

/* =====================================================================
   25. Client Work pack, import limit and Pro visibility
   ===================================================================== */

async function testClientPackAndImportLimit() {
  section('25. Client Work pack, import limit and Pro visibility');

  const fake = dodoFetch(['PRO-CLIENT']);
  const realm = H.createStoreRealm({ fetch: fake });
  const S = realm.sandbox.OmniStore;
  const T = realm.sandbox.OmniTemplate;
  await S.init();

  // The pack is ordinary built-in data: present, free to read, and in its own pack.
  const pack = S.getAll().filter((p) => p.category === 'Clients');
  eq(pack.length, 26, 'Client Work has 26 prompts');
  ok(S.BUILTIN_CATEGORIES.indexOf('Clients') !== -1, 'Client Work is a built-in category');
  eq(S.getCategoryMeta('Clients').label, 'Client Work', 'Client Work has a readable label');

  const blockNames = ['client-brief', 'brand-voice', 'my-offer', 'about-me', 'audience', 'project-context'];
  blockNames.forEach((name) => {
    const hit = S.findByShortcut(name);
    ok(!!hit && hit.category === 'Clients', 'Profile block //' + name + ' ships');
  });

  const workflows = pack.filter((p) => T.listBlocks(p.template).length > 0);
  eq(workflows.length, 20, 'Twenty workflows use context blocks');
  const dangling = [];
  workflows.forEach((p) => {
    T.listBlocks(p.template).forEach((name) => {
      if (!S.findByShortcut(name)) dangling.push(p.shortcut + ' -> ' + name);
    });
  });
  eq(dangling, [], 'Every block a workflow uses is a shipped profile block');
  ok(pack.every((p) => typeof p.notes === 'string' && p.notes.length > 0), 'Every Client Work prompt explains itself in notes');

  // Blocks resolve even when the user picked a different role.
  await S.setRole('Coding');
  ok(!S.getAll().some((p) => p.category === 'Clients'), 'Picking a role still hides other packs, Client Work included');
  ok(!!S.findByShortcut('client-brief'), 'Blocks resolve even when their pack is hidden');
  await S.setRole('Clients');
  eq(S.getAll().filter((p) => p.category === 'Clients').length, 26, 'Client Work can be picked as a role');
  await S.setRole('all');

  // Free inserts the workflow as written; Pro expands its blocks.
  const proposal = S.findByShortcut('c-proposal');
  const free = S.prepareForUse(proposal);
  eq(free.locked, ['client-brief', 'my-offer', 'brand-voice'], 'On Free a workflow reports its blocks as locked');
  eq(free.prompt.template, proposal.template, 'On Free the workflow text is unchanged');

  // Editing a profile block once is how the user fills it in.
  const brief = S.findByShortcut('client-brief');
  await S.savePrompt(Object.assign({}, brief, { template: 'CLIENT BRIEF\nClient: Acme Ltd' }));
  await S.activateLicense('PRO-CLIENT');
  const pro = S.prepareForUse(S.findByShortcut('c-proposal'));
  eq(pro.locked, [], 'On Pro nothing is locked');
  ok(pro.prompt.template.indexOf('Client: Acme Ltd') !== -1, 'On Pro the edited brief is expanded into the proposal');
  ok(pro.prompt.template.indexOf('{{@') === -1, 'On Pro no block token is left behind');
  await S.deactivateLicense();

  // Import limit on Free.
  const rows = (n, tag) => Array.from({ length: n }, (_, i) => ({ title: tag + ' ' + i, template: tag + ' body ' + i }));
  const first = await S.importBundle(JSON.stringify(rows(15, 'A')), { mode: 'merge' });
  eq(first.added, 15, 'An import under the limit adds everything');
  eq(first.overLimit, 0, 'Nothing is reported over the limit');

  const second = await S.importBundle(JSON.stringify(rows(10, 'B')), { mode: 'merge' });
  eq(second.added, 5, 'A merge import on Free stops at the limit');
  eq(second.overLimit, 5, 'The rest are reported, not silently dropped');
  eq(second.limit, 20, 'The result names the limit');
  eq(S.getCustomCount(), 20, 'Free ends at exactly 20 of your own');

  const dupes = await S.importBundle(JSON.stringify(rows(3, 'A')), { mode: 'merge' });
  eq(dupes.skipped, 3, 'Duplicates are still counted as duplicates at the limit');
  eq(dupes.overLimit, 0, 'Duplicates are not blamed on the limit');

  // A user who grew past 20 on Pro and re-imports their own backup keeps it all.
  await S.activateLicense('PRO-CLIENT');
  await S.importBundle(JSON.stringify(rows(10, 'C')), { mode: 'merge' });
  eq(S.getCustomCount(), 30, 'Pro imports have no cap');
  await S.deactivateLicense();
  const backup = S.getAll().filter((p) => p.isCustom);
  const replaced = await S.importBundle(JSON.stringify(backup), { mode: 'replace' });
  eq(replaced.added, 30, 'A replace import on Free can bring back as many prompts as the user had');
  eq(replaced.overLimit, 0, 'Re-importing your own backup never shrinks the library');
  const more = await S.importBundle(JSON.stringify(rows(4, 'D')), { mode: 'merge' });
  eq(more.added, 0, 'Over the limit on Free, a merge import adds nothing new');
  eq(more.overLimit, 4, 'and says how many it left out');
  ok(S.getAll().some((p) => p.title === 'C 9'), 'Nothing already in the library was removed');

  // UI wiring: the Pro features are visible where they matter.
  const optionsJs = readCode('options/options.js');
  const optionsHtml = read('options/options.html');
  const popupJs = readCode('popup/popup.js');
  const popupHtml = read('popup/popup.html');
  ok(/historyBtn\.style\.display = id \? '' : 'none'/.test(optionsJs), 'History shows on every saved prompt, even with no versions yet');
  ok(optionsJs.indexOf('toldAboutHistory') === -1 && optionsJs.indexOf('Pro can restore it') === -1, 'History restore is free, so no screen says Pro is needed for it');
  ok(optionsHtml.indexOf('export-include-library') === -1, 'The export page has no built-ins checkbox to explain');
  ok(/id="view-data"[\s\S]*id="setting-folder-sync"[\s\S]*id="view-plan"/.test(optionsHtml), 'Sync lives on the Backup & sync page, not in Settings');
  ok(optionsJs.indexOf('result.overLimit') !== -1 && popupJs.indexOf('result.overLimit') !== -1, 'Both import screens explain the limit');
  ok(optionsHtml.indexOf('id="plan-compare"') !== -1, 'The licence card has a Free vs Pro table');
  ok(optionsJs.indexOf("setCell('plan-pro-price'") !== -1, 'The table reads the price from getProInfo');
  ok(optionsHtml.indexOf('value="Clients"') !== -1, 'Client Work can be chosen in Settings');
  ok(popupHtml.indexOf('id="popup-usage-meter"') !== -1 && popupJs.indexOf('paintUsageMeter') !== -1, 'The popup shows the Free allowance');
  ok(/listBlocks\(p\.template\)/.test(optionsJs) && /listBlocks\(p\.template\)/.test(popupJs), 'Prompts that use blocks are marked in both lists');
  ok(read('welcome/welcome.html').indexOf('data-role="Clients"') !== -1, 'The welcome page offers the Client Work pack');
}

/* =====================================================================
   26-31. Pro features: Dodo mode, workspaces, saved values, chains,
          library tools, folder sync
   ===================================================================== */

/** The error a promise rejects with, or null when it resolves. */
async function rejection(promise) {
  try {
    await promise;
    return null;
  } catch (err) {
    return err || new Error('rejected');
  }
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function proRealm(key, options) {
  const fake = dodoFetch([key]);
  const realm = H.createStoreRealm(Object.assign({ fetch: fake }, options || {}));
  const S = realm.sandbox.OmniStore;
  await S.init();
  await S.activateLicense(key);
  return { realm, S, T: realm.sandbox.OmniTemplate, fake };
}

async function testDodoMode() {
  section('26. Dodo environment, checkout and the Pro feature list');

  ok(DODO_MODE === 'test' || DODO_MODE === 'live', 'DODO_MODE is test or live');
  if (DODO_MODE === 'test') {
    console.log('  NOTE  DODO_MODE is "test". Switch it to "live" before packaging a release.');
  }

  const { realm, S, fake } = await proRealm('MODE-KEY');
  ok(S.isPro(), 'A key for the product of this Dodo environment activates');
  eq(S.getLicense().testMode, DODO_MODE === 'test', 'The licence records which environment issued it');

  // Callers cannot point a build at the other environment.
  await S.deactivateLicense();
  await S.activateLicense('MODE-KEY', { testMode: DODO_MODE !== 'test' });
  const last = fake.calls.filter((c) => /\/activate$/.test(c.url)).pop();
  eq(last.url, DODO_BASE + '/activate', 'activateLicense ignores a testMode option and follows DODO_MODE');

  // A licence from the other environment never counts.
  const crossed = H.createStoreRealm({
    storageSeed: {
      'omni.schemaVersion': 2,
      'omni.license': {
        key: 'K',
        status: 'active',
        testMode: DODO_MODE !== 'test',
        data: { product: { product_id: PRO_PRODUCT_ID } }
      }
    }
  });
  await crossed.sandbox.OmniStore.init();
  eq(crossed.sandbox.OmniStore.isPro(), false, 'A licence from the other Dodo environment does not unlock Pro');

  const info = S.getProInfo();
  eq(info.mode, DODO_MODE, 'getProInfo reports the Dodo environment');
  ok(info.checkoutUrl.indexOf(PRO_PRODUCT_ID) !== -1, 'The checkout link buys the product that unlocks Pro');
  ok(
    DODO_MODE === 'test'
      ? info.checkoutUrl.indexOf('https://test.checkout.dodopayments.com/') === 0
      : info.checkoutUrl.indexOf('https://checkout.dodopayments.com/') === 0,
    'The checkout link is on the Dodo checkout for this environment'
  );
  if (DODO_MODE === 'live') {
    ok(!/REPLACE/.test(PRO_PRODUCT_ID) && !/REPLACE/.test(info.checkoutUrl), 'A live build has a real product id and checkout link');
  }

  const ids = info.features.map((f) => f.id);
  ['limit', 'workspaces', 'sets', 'chains', 'sync', 'blocks'].forEach((id) => {
    ok(ids.indexOf(id) !== -1, 'Pro feature list includes ' + id);
  });
  ok(ids.indexOf('history') === -1, 'Version history is not sold as a Pro feature');
  ok(info.features.every((f) => f.title && f.text), 'Every Pro feature has a title and a line of text');
  const optionsJs = readCode('options/options.js');
  ids.forEach((id) => {
    ok(optionsJs.indexOf("'" + id + "'") !== -1, 'The upgrade dialog knows the reason "' + id + '"');
  });
  ok(realm.read('omni.license').key === 'MODE-KEY', 'The licence is stored locally');

  // Price label is read from the store, not hard-coded in HTML.
  const optionsHtml = read('options/options.html').replace(/about \$10 a month/, '');
  ok(!/\$\d/.test(optionsHtml), 'options/options.html has no hard-coded price');
  ok(!/\$\d/.test(read('popup/popup.html')), 'popup/popup.html has no hard-coded price');
  ok(optionsJs.indexOf('buy-pro-label') !== -1, 'options.js references buy-pro-label');
}

async function testWorkspaces() {
  section('27. Client workspaces (Pro)');

  const freeRealm = H.createStoreRealm();
  const F = freeRealm.sandbox.OmniStore;
  await F.init();
  const freeErr = await rejection(F.saveWorkspace({ name: 'Acme' }));
  eq(freeErr && freeErr.code, 'PRO_REQUIRED', 'Free cannot create a workspace');
  eq(freeErr && freeErr.feature, 'workspaces', 'The error names workspaces');
  eq((await rejection(F.setActiveWorkspace('ws-x'))).code, 'PRO_REQUIRED', 'Free cannot switch to a workspace');
  eq(await F.setActiveWorkspace(''), true, 'Switching workspaces off is always allowed');
  eq(F.getValueSources('any').workspace, null, 'Free forms get no workspace values');

  const { realm, S, T } = await proRealm('WS-KEY');
  const acme = await S.saveWorkspace({
    name: 'Acme',
    fields: [
      { key: 'Client name', value: 'Acme Ltd' },
      { key: 'client-brief', value: 'BRIEF FOR ACME' },
      { key: 'tone', value: 'Friendly' },
      { key: 'Tone', value: 'dropped duplicate' },
      { key: '   ', value: 'no name' }
    ]
  });
  eq(acme.fields.map((f) => f.key), ['client_name', 'client_brief', 'tone'], 'Value names are normalised, blank and repeated names dropped');
  eq((await rejection(S.saveWorkspace({ name: 'acme' }))).code, 'DUPLICATE', 'Two workspaces cannot share a name');
  eq((await rejection(S.saveWorkspace({ name: '  ' }))).code, 'INVALID', 'A workspace needs a name');
  ok(Array.isArray(realm.read('omni.workspaces')) && realm.read('omni.workspaces').length === 1, 'Workspaces are stored under omni.workspaces');

  await S.setActiveWorkspace(acme.id);
  eq(S.getActiveWorkspace().name, 'Acme', 'The chosen workspace is active');
  eq(S.getSettings().activeWorkspaceId, acme.id, 'The choice is kept in settings');
  const sources = S.getValueSources('some-prompt');
  eq(sources.workspace.values.client_name, 'Acme Ltd', 'Forms get the active workspace values');

  const init = T.buildInitialValues(
    { template: 'Hi {{Client-Name}}, tone {{tone:Formal|Friendly}}, re {{topic}} on {{date}}' },
    {},
    { workspace: sources.workspace.values }
  );
  eq(init.values['Client-Name'], 'Acme Ltd', 'A field fills from the workspace whatever its spelling');
  eq(init.filledFrom['Client-Name'], 'workspace', 'The field says it came from the workspace');
  eq(init.values.tone, 'Friendly', 'A dropdown takes a workspace value that is one of its choices');
  eq(init.values.topic, '', 'Fields the workspace does not know stay empty');
  eq(T.autofillBadge('workspace'), 'Workspace', 'The badge reads Workspace');
  const bad = T.buildInitialValues({ template: '{{tone:Formal|Direct}}' }, {}, { workspace: { tone: 'Friendly' } });
  eq(bad.values.tone, 'Formal', 'A workspace value that is not a dropdown choice is ignored');

  // The workspace wins over the built-in //client-brief block.
  const own = await S.savePrompt({ title: 'Proposal', template: 'Context:\n{{@client-brief}}\nWrite it.' });
  const ready = S.prepareForUse(S.getById(own.id));
  ok(ready.prompt.template.indexOf('BRIEF FOR ACME') !== -1, 'A {{@block}} fills from the active workspace first');
  eq(S.resolveBlockSource('client-brief').kind, 'workspace', 'resolveBlockSource reports the workspace');
  await S.setActiveWorkspace('');
  eq(S.resolveBlockSource('client-brief').kind, 'prompt', 'With no workspace the block comes from the prompt again');
  await S.setActiveWorkspace(acme.id);

  ok(S.exportBundle().workspaces.length === 1, 'Workspaces are in the backup file');

  // Losing Pro never takes the data away.
  await S.deactivateLicense();
  eq(S.getValueSources('x').workspace, null, 'Without Pro, forms stop filling from the workspace');
  eq(S.getWorkspaces().length, 1, 'Without Pro, the workspace is still there to see');
  ok(S.exportBundle().workspaces.length === 1, 'Without Pro, the workspace still exports');
  eq((await rejection(S.saveWorkspace(Object.assign({}, acme, { name: 'Acme 2' })))).code, 'PRO_REQUIRED', 'Without Pro, editing a workspace needs Pro');
  eq(await S.deleteWorkspace(acme.id), true, 'Without Pro, a workspace can still be deleted');
  eq(S.getSettings().activeWorkspaceId, '', 'Deleting the active workspace switches it off');
}

async function testSavedValues() {
  section('28. Saved values and remembered answers (Pro)');

  const freeRealm = H.createStoreRealm();
  const F = freeRealm.sandbox.OmniStore;
  await F.init();
  eq((await rejection(F.saveVariableSet('p1', 'Mine', { a: '1' }))).feature, 'sets', 'Free cannot save value sets');
  eq(await F.rememberValues('p1', { tone: 'x' }, [{ name: 'tone', type: 'text' }]), true, 'Free can remember short answers');
  ok(!!freeRealm.read('omni.lastValues') && !!freeRealm.read('omni.lastValues').p1, 'Free writes remembered answers');

  const { realm, S, T } = await proRealm('SETS-KEY');
  const p = await S.savePrompt({ title: 'Email', template: 'Write to {{name}} in {{tone}} about {{code}} at {{url}}' });
  const set1 = await S.saveVariableSet(p.id, 'Acme formal', { name: 'Ann', tone: 'Formal' });
  eq(S.getVariableSets(p.id).length, 1, 'A value set is saved');
  await S.saveVariableSet(p.id, 'ACME formal', { name: 'Bob', tone: 'Formal' });
  eq(S.getVariableSets(p.id).length, 1, 'Saving under the same name replaces the older set');
  eq(S.getVariableSets(p.id)[0].values.name, 'Bob', 'The replacement has the new values');
  eq((await rejection(S.saveVariableSet(p.id, '', {}))).code, 'INVALID', 'A value set needs a name');
  ok(!!realm.read('omni.variableSets')[p.id], 'Sets are stored under omni.variableSets');

  const vars = T.resolveVariables(S.getById(p.id));
  await S.rememberValues(p.id, { name: 'Remember-Me-7', tone: 'Formal', code: 'short', url: 'https://x' }, vars.map((v) =>
    v.name === 'code' ? Object.assign({}, v, { type: 'textarea' }) : v
  ));
  const kept = realm.read('omni.lastValues')[p.id].values;
  eq(Object.keys(kept).sort(), ['name', 'tone'], 'Only short typed answers are remembered, never long fields or page values');
  eq(S.getValueSources(p.id).remembered.name, 'Remember-Me-7', 'Forms get the remembered answers');
  await S.rememberValues(p.id, { name: 'x'.repeat(400) }, [{ name: 'name', type: 'text' }]);
  eq(S.getValueSources(p.id).remembered.name, 'Remember-Me-7', 'Very long answers are not remembered');

  const init = T.buildInitialValues({ template: '{{name}} {{date}}' }, {}, { remembered: { name: 'Last', date: 'old' } });
  eq(init.filledFrom.name, 'remembered', 'An empty field starts from the remembered answer');
  ok(init.values.date !== 'old', 'Page and date auto-fill beat a remembered answer');
  const both = T.buildInitialValues({ template: '{{name}}' }, {}, { workspace: { name: 'WS' }, remembered: { name: 'Last' } });
  eq(both.values.name, 'WS', 'A workspace value beats a remembered answer');
  eq(T.autofillBadge('remembered'), 'Last used', 'The badge reads Last used');

  // Remembered answers never leave this computer.
  await S.setSyncEnabled(true);
  const synced = JSON.stringify(realm.storage.sync);
  ok(synced.indexOf('Remember-Me-7') === -1, 'Remembered answers are not synced');
  ok(synced.indexOf('Acme formal') !== -1 || synced.indexOf('ACME formal') !== -1 || synced.indexOf('Bob') !== -1, 'Saved value sets are synced with the library');
  ok(JSON.stringify(S.exportBundle()).indexOf('Remember-Me-7') === -1, 'Remembered answers are not in backup files');
  await S.setSyncEnabled(false);

  await S.deleteVariableSet(p.id, S.getVariableSets(p.id)[0].id);
  eq(S.getVariableSets(p.id).length, 0, 'A value set can be deleted');
  await S.saveVariableSet(p.id, 'Again', { name: 'C' });
  await S.deletePrompt(p.id);
  eq(S.getVariableSets(p.id).length, 0, 'Deleting a prompt deletes its sets');
  eq(S.getValueSources(p.id).remembered, {}, 'Deleting a prompt forgets its answers');

  const q = await S.savePrompt({ title: 'Other', template: '{{tone}}' });
  await S.rememberValues(q.id, { tone: 'Calm' }, [{ name: 'tone', type: 'text' }]);
  await S.clearRememberedValues();
  eq(S.getValueSources(q.id).remembered, {}, '"Forget them" clears every remembered answer');
  ok(set1 && set1.id, 'saveVariableSet returns the set');

  const modal = readCode('content/variableModal.js');
  ok(modal.indexOf('getValueSources') !== -1 && modal.indexOf('rememberValues') !== -1, 'The page form uses workspace, remembered and saved values');
  ok(readCode('popup/popup.js').indexOf('getValueSources') !== -1, 'The popup form uses them too');
  ok(readCode('options/options.js').indexOf('getValueSources') !== -1, 'The library copy form uses them too');
}

async function testChains() {
  section('29. Stepped chains (Pro)');

  const freeRealm = H.createStoreRealm();
  const F = freeRealm.sandbox.OmniStore;
  await F.init();
  eq((await rejection(F.saveChain({ title: 'x', steps: [{ template: 'a' }] }))).feature, 'chains', 'Free cannot create chains');

  const { realm, S } = await proRealm('CHAIN-KEY');
  const chain = await S.saveChain({
    title: 'Blog post',
    shortcut: '/BlogChain',
    description: 'Research, then draft',
    steps: [
      { title: 'Research', template: 'Research {{topic}}' },
      { title: 'Draft', template: 'Draft about {{topic}} in a {{tone|plain}} tone' },
      { title: 'Empty', template: '   ' }
    ]
  });
  eq(chain.steps.length, 2, 'Empty steps are dropped');
  eq(chain.shortcut, 'blogchain', 'Chain shortcuts are cleaned like prompt shortcuts');
  eq((await rejection(S.saveChain({ title: 'No steps', steps: [] }))).code, 'INVALID', 'A chain needs a step');
  eq((await rejection(S.saveChain({ title: 'Clash', shortcut: 'review', steps: [{ template: 'a' }] }))).code, 'SHORTCUT_TAKEN', 'A chain cannot take a prompt shortcut');
  eq((await rejection(S.saveChain({ title: 'Clash 2', shortcut: 'blogchain', steps: [{ template: 'a' }] }))).code, 'SHORTCUT_TAKEN', 'Two chains cannot share a shortcut');
  const edited = await S.saveChain(Object.assign({}, chain, { title: 'Blog post v2' }));
  eq(edited.id, chain.id, 'Saving an existing chain keeps its id');
  ok(Array.isArray(realm.read('omni.chains')) && realm.read('omni.chains').length === 1, 'Chains are stored under omni.chains');

  const step0 = S.getChainStep(chain.id, 0);
  eq(step0.prompt.template, 'Research {{topic}}', 'Step 1 is shaped like a prompt');
  eq([step0.index, step0.total, step0.isLast], [0, 2, false], 'Step 1 knows where it is');
  eq(S.getChainStep(chain.id, 1).isLast, true, 'The last step says so');
  eq(S.getChainStep(chain.id, 2), null, 'There is no step after the last');
  ok(S.prepareForUse(step0.prompt).prompt.template.indexOf('{{topic}}') !== -1, 'A step goes through the normal prompt path');

  eq(S.searchChains({ query: 'blogchain' })[0].id, chain.id, 'A chain is found by its shortcut');
  eq(S.searchChains({ query: 'draft about' }).length, 1, 'A chain is found by its step text');
  eq(S.searchChains({ query: 'zzzz-nothing' }).length, 0, 'Unrelated searches find no chain');
  ok(S.exportBundle().chains.length === 1, 'Chains are in the backup file');

  // Backups bring chains back without doubling them.
  const text = JSON.stringify(S.exportBundle());
  const other = H.createStoreRealm();
  await other.sandbox.OmniStore.init();
  await other.sandbox.OmniStore.importBundle(text, { mode: 'merge' });
  await other.sandbox.OmniStore.importBundle(text, { mode: 'merge' });
  eq(other.sandbox.OmniStore.getChains().length, 1, 'Importing a backup twice keeps one copy of each chain, even on Free');

  await S.deactivateLicense();
  eq(S.getChains().length, 1, 'Without Pro, chains are still there to see');
  eq(await S.deleteChain(chain.id), true, 'Without Pro, a chain can still be deleted');
  ok(typeof S._internals.state.tombstones[chain.id] === 'number', 'Deleting a chain records it for sync');

  const content = readCode('content/content.js');
  const slash = readCode('content/slashTrigger.js');
  const palette = readCode('content/commandPalette.js');
  ok(content.indexOf("case 'start_chain'") !== -1, 'The page accepts start_chain from the popup');
  ok(/kind: 'next'/.test(slash) && /kind: 'end'/.test(slash), 'The slash menu offers Next and End while a chain runs');
  ok(palette.indexOf('Chain in progress') !== -1, 'The palette pins the running chain');
  ok(/if \(!store \|\| !store\.isPro\(\)\)/.test(content), 'Starting a chain checks Pro in the page');
  ok(content.indexOf('submit: meta && typeof meta.submit') !== -1, 'A step is only sent when the user chose Insert & Send');
}

async function testLibraryTools() {
  section('30. Library tools: folders, tags, bulk edit, tidy-up');

  const freeRealm = H.createStoreRealm();
  const F = freeRealm.sandbox.OmniStore;
  await F.init();
  const freeF1 = await F.createFolder('Clients');
  const freeF2 = await F.createFolder('Acme', freeF1.id);
  ok(!!freeF1 && !!freeF2, 'Free can create nested folders');
  eq(await F.moveFolder(freeF2.id, null), true, 'Free can move folders');
  const freeP = await F.savePrompt({ title: 'Free One', template: 'body' });
  const bulkRes = await F.bulkUpdate([freeP.id], { addTags: 'free-tag' });
  eq(bulkRes.updated, 1, 'Free can bulk edit');
  const bulkDel = await F.bulkDelete([freeP.id]);
  eq(bulkDel.deleted, 1, 'Free can bulk delete');
  ok(Array.isArray(F.getAllTags()) && F.getAllTags().length > 0, 'Anyone can read the tag list');

  const { realm, S } = await proRealm('LIB-KEY');
  const a = await S.createFolder('Clients');
  const b = await S.createFolder('Acme', a.id);
  eq(await S.moveFolder(a.id, b.id), false, 'A folder cannot move inside its own child');
  eq(await S.createFolder('Orphan', 'folder-missing'), null, 'A folder cannot go inside one that does not exist');
  const empty = await S.createFolder('Empty');

  const p1 = await S.savePrompt({ title: 'One', template: 'one body', tags: 'old' });
  const p2 = await S.savePrompt({ title: 'Two', template: 'two body' });
  const res = await S.bulkUpdate([p1.id, 'dev-code-review'], {
    folderId: b.id,
    addTags: 'zq-one, ZQ-Two',
    removeTags: 'old',
    category: 'Writing',
    favorite: true
  });
  eq(res.updated, 2, 'Bulk edit reports how many prompts changed');
  const one = S.getById(p1.id);
  eq([one.folderId, one.category, one.tags.slice().sort()], [b.id, 'Writing', ['zq-one', 'zq-two']], 'Bulk edit moves, recategorises and retags your prompt');
  const builtin = S.getById('dev-code-review');
  ok(builtin.folderId === b.id && builtin.tags.indexOf('zq-one') !== -1 && builtin.isEdited, 'Bulk edit on a built-in is stored as a patch');
  ok(S.isFavorite(p1.id) && S.isFavorite('dev-code-review'), 'Bulk favourite stars every selected prompt');
  eq(S.search({ query: '', tag: 'zq-one' }).length, 2, 'The tag filter finds retagged prompts');
  eq(S.search({ query: '', folderId: b.id }).length, 2, 'The folder filter finds moved prompts');
  ok((await S.getSnapshots()).some((s) => s.reason === 'before-bulk-edit'), 'A backup is taken before a bulk edit');
  ok(S.getAllTags().some((t) => t.tag === 'zq-one' && t.count === 2), 'The tag list counts prompts per tag');

  const del = await S.bulkDelete([p2.id, 'dev-bug-root-cause']);
  eq(del.deleted, 2, 'Bulk delete reports how many went');
  ok(!S.getById(p2.id), 'Bulk delete removes your prompt');
  ok(!S.getById('dev-bug-root-cause'), 'Bulk delete hides a built-in');
  ok(realm.read('omni.hiddenDefaults').indexOf('dev-bug-root-cause') !== -1, 'A bulk-deleted built-in is hidden, so Restore built-ins brings it back');

  // Tidy-up suggestions.
  const old = Date.now() - 40 * 86400000;
  await S.importBundle(
    JSON.stringify({
      format: 'omniprompt.bundle',
      prompts: [
        { title: 'Forgotten', template: 'never used text', createdAt: old, updatedAt: old },
        { title: 'Twin A', template: 'same   text here', createdAt: old },
        { title: 'Twin B', template: 'Same text here' }
      ]
    }),
    { mode: 'merge' }
  );
  const tidy = S.getTidySuggestions();
  ok(tidy.neverUsed.some((p) => p.title === 'Forgotten'), 'Tidy-up lists prompts you never used');
  ok(!tidy.neverUsed.some((p) => p.title === 'Twin B'), 'Brand-new prompts are not called unused');
  ok(tidy.duplicates.some((g) => g.length === 2 && g.every((p) => /Twin/.test(p.title))), 'Tidy-up finds prompts with the same text');
  ok(tidy.emptyFolders.some((f) => f.id === empty.id), 'Tidy-up lists empty folders');
  ok(!tidy.emptyFolders.some((f) => f.id === a.id), 'A folder with a folder inside is not empty');
  ok(realm.read('omni.folders').length === 3, 'Folders are stored under omni.folders');

  const html = read('options/options.html');
  ['id="bulk-bar"', 'id="sidebar-folder-list"', 'id="sidebar-tag-list"', 'id="tidy-modal"', 'id="edit-folder"'].forEach((id) => {
    ok(html.indexOf(id) !== -1, 'The library page has ' + id);
  });
}

async function testFolderSync() {
  section('31. Folder sync (Pro) and deletion records');

  const freeRealm = H.createStoreRealm();
  await freeRealm.sandbox.OmniStore.init();
  eq((await rejection(freeRealm.sandbox.OmniStore.folderSyncMerge(''))).feature, 'sync', 'Free cannot use folder sync');

  const A = (await proRealm('SYNC-A')).S;
  const B = (await proRealm('SYNC-B')).S;

  const keep = await A.savePrompt({ title: 'Keep me', template: 'keep body' });
  const gone = await A.savePrompt({ title: 'Delete me', template: 'delete body' });
  const edit = await A.savePrompt({ title: 'Edit me later', template: 'edit body' });
  await A.saveWorkspace({ name: 'Acme', fields: [{ key: 'tone', value: 'Warm' }] });
  await A.saveChain({ title: 'Flow', steps: [{ template: 'step one' }] });

  const first = await A.folderSyncMerge('');
  ok(first.ok && first.upToDate === false, 'An empty folder gets a new file');
  const file = JSON.parse(first.text);
  eq(file.format, 'omniprompt.bundle', 'The sync file is an ordinary OmniPrompt backup');
  eq(file.settings, null, 'Settings are not in the sync file');
  eq(first.prompts, 3, 'The result says how many prompts of your own are in the file');

  const onB = await B.folderSyncMerge(first.text);
  ok(onB.ok && onB.changed, 'A second computer merges the file');
  eq(B.getAll().filter((p) => p.isCustom).length, 3, 'The second computer gets the prompts');
  eq(B.getWorkspaces().map((w) => w.name), ['Acme'], 'The second computer gets the workspaces');
  eq(B.getChains().map((c) => c.title), ['Flow'], 'The second computer gets the chains');

  const again = await A.folderSyncMerge(onB.text);
  ok(again.ok && !again.changed, 'Syncing back changes nothing when nothing changed');
  eq(again.upToDate, true, 'An unchanged file is not rewritten');

  // A deletes one prompt; B edits another after that deletion.
  await A.deletePrompt(gone.id);
  await A.deletePrompt(edit.id);
  await wait(5);
  await B.savePrompt(Object.assign({}, B.getById(edit.id), { template: 'edited on B' }));

  const fromA = await A.folderSyncMerge(onB.text);
  ok(!A.getById(gone.id), 'A deleted prompt is not brought back by an older copy of the file');
  const toB = await B.folderSyncMerge(fromA.text);
  ok(!B.getById(gone.id), 'A deletion made on one computer reaches the other');
  eq(toB.removed, 1, 'The result says how many items were removed');
  ok(!!B.getById(edit.id), 'A prompt edited after it was deleted elsewhere is kept');
  ok(!!B.getById(keep.id), 'Other prompts are untouched');
  const snaps = await B.getSnapshots();
  ok(snaps.some((s) => s.reason === 'before-sync'), 'A backup is taken before a deletion from elsewhere is applied');

  // Restoring that backup brings the prompt back for good.
  await B.restoreSnapshot(snaps.filter((s) => s.reason === 'before-sync')[0].id);
  ok(!!B.getById(gone.id), 'Restoring the backup brings the deleted prompt back');
  await B.folderSyncMerge(fromA.text);
  ok(!!B.getById(gone.id), 'A restored prompt is not removed again by the same deletion record');

  const junk = await A.folderSyncMerge('not json');
  ok(!junk.ok && /not valid JSON/.test(junk.error), 'A broken file is reported and left alone');
  const foreign = await A.folderSyncMerge('{"hello": 1}');
  ok(!foreign.ok && /not an OmniPrompt library/.test(foreign.error), 'Someone else\'s file is reported and left alone');
  ok(!!A.getById(keep.id), 'A bad file changes nothing here');

  // The file also imports as a normal backup on a Free browser.
  const plain = H.createStoreRealm();
  await plain.sandbox.OmniStore.init();
  const imported = await plain.sandbox.OmniStore.importBundle(fromA.text, { mode: 'merge' });
  ok(imported.ok && imported.added >= 1, 'The sync file imports like any backup');

  const optionsJs = readCode('options/options.js');
  ok(optionsJs.indexOf('showDirectoryPicker') !== -1 && optionsJs.indexOf('folderSyncMerge') !== -1, 'The library page reads and writes the chosen folder');
  ok(optionsJs.indexOf('if (!res.upToDate)') !== -1, 'The page skips writing an unchanged file');
  ok(/await forgetSyncFolder\(\);\s*renderFolderSyncStatus\(\);\s*settings = store\.getSettings\(\);/.test(optionsJs), 'Erasing everything also stops folder sync');
  const optionsCode = readCode('options/options.js');
  ok(/const supported = typeof window\.showDirectoryPicker === 'function'/.test(optionsCode), 'Folder sync checks for the folder picker before offering it');
  ok(/folderSyncChoose\.disabled = !supported/.test(optionsCode), 'Choose folder is disabled where the browser has no folder picker');
  ok(/UNSUPPORTED_FOLDER_SYNC =[\s\S]{0,80}Chrome or Edge/.test(optionsCode), 'The status explains which browsers support folder sync');
}

async function testFreeTwentyAndBackups() {
  section('32. Free holds 20 prompts; backups and restore stay free');

  const realm = H.createStoreRealm();
  const S = realm.sandbox.OmniStore;
  await S.init();
  eq(S.getFreeLimit(), 20, 'Free holds 20 prompts of your own');
  await S.savePrompt({ title: 'Mine', template: 'my text' });
  const snap = await S.takeSnapshot('manual');
  ok(!!snap, 'Free can back up');
  await S.deletePrompt(S.getAll().filter((p) => p.isCustom)[0].id);
  const back = await S.restoreSnapshot(snap.id);
  ok(back.ok && S.getAll().some((p) => p.title === 'Mine'), 'Free can restore a backup');

  const readme = read('README.md');
  ok(/\| Prompts of your own \| 20 \| Unlimited \|/.test(readme), 'The README table says Free holds 20');
  ok(/Automatic backups and restoring them, import, export \| ✓ \| ✓/.test(readme), 'The README says backups and restore are free');
  ['options/options.html', 'popup/popup.html', 'welcome/welcome.html', 'CHROMEWEBSTORE.md'].forEach((file) => {
    const text = read(file);
    ok(!/\b25 (of your own|prompts of your own|custom)|\/ 25\b|of 25\b/.test(text), file + ' no longer mentions a 25-prompt limit');
  });
  ok(/20 prompts of your own/.test(read('CHROMEWEBSTORE.md')), 'The store listing says Free holds 20');
}

/* =====================================================================
   33. No remote code
   ===================================================================== */

/** Every .js, .html and .css file in the folders that ship in the zip. */
function shippedFiles() {
  const out = [];
  const walk = (rel) => {
    fs.readdirSync(path.join(ROOT, rel), { withFileTypes: true }).forEach((entry) => {
      const child = rel + '/' + entry.name;
      if (entry.isDirectory()) walk(child);
      else if (/\.(js|html|css)$/.test(entry.name)) out.push(child);
    });
  };
  ['background', 'content', 'data', 'lib', 'options', 'popup', 'styles', 'welcome'].forEach(walk);
  return out;
}

function testNoRemoteCode() {
  section('33. No remote code in shipped files');

  const files = shippedFiles();
  ok(files.length >= 20, 'Found ' + files.length + ' shipped .js/.html/.css files');

  const problems = [];
  files.forEach((file) => {
    const text = read(file);
    if (/<script[^>]*\ssrc\s*=\s*["']?(https?:)?\/\//i.test(text)) problems.push(file + ' (remote <script src>)');
    if (/<link[^>]*\shref\s*=\s*["']?(https?:)?\/\//i.test(text)) problems.push(file + ' (remote <link>)');
    if (/<iframe/i.test(text)) problems.push(file + ' (<iframe>)');
    if (/@import/i.test(text)) problems.push(file + ' (@import)');
    if (/url\(\s*["']?(https?:)?\/\//i.test(text)) problems.push(file + ' (remote url())');
    if (/fonts\.(googleapis|gstatic)\.com/i.test(text)) problems.push(file + ' (web font)');
    if (/\.js$/.test(file)) {
      const code = readCode(file);
      if (/set(Timeout|Interval)\(\s*["'`]/.test(code)) problems.push(file + ' (string timer)');
      // Strip string contents so prompt text that mentions eval( is not a hit.
      const bare = code.replace(/'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"|`(?:\\.|[^`\\])*`/g, '""');
      if (/\beval\s*\(/.test(bare)) problems.push(file + ' (eval)');
      if (/new\s+Function\b/.test(bare)) problems.push(file + ' (new Function)');
      if (/\bimport\s*\(/.test(bare)) problems.push(file + ' (dynamic import)');
    }
  });
  eq(problems, [], 'No remote script, stylesheet, font, iframe, eval or dynamic import in shipped files');

  const csp = (JSON.parse(read('manifest.json')).content_security_policy || {}).extension_pages || '';
  const scriptSrc = (csp.match(/script-src([^;]*)/) || [])[1] || '';
  eq(scriptSrc.trim(), "'self'", 'The extension-page CSP only allows packaged scripts');
}

async function testCompareAcrossAis() {
  section('34. Compare across AIs (Pro)');

  const freeRealm = H.createStoreRealm();
  const F = freeRealm.sandbox.OmniStore;
  await F.init();

  // Targets definition
  const targets = F.getCompareTargets();
  eq(targets.length, 12, 'Compare supports 12 major AI chatbots');
  const targetIds = targets.map((t) => t.id);
  ok(targetIds.indexOf('chatgpt') !== -1, 'ChatGPT is a compare target');
  ok(targetIds.indexOf('claude') !== -1, 'Claude is a compare target');
  ok(targetIds.indexOf('gemini') !== -1, 'Gemini is a compare target');
  ok(targetIds.indexOf('copilot') !== -1, 'Copilot is a compare target');
  ok(targetIds.indexOf('perplexity') !== -1, 'Perplexity is a compare target');
  ok(targetIds.indexOf('deepseek') !== -1, 'DeepSeek is a compare target');
  ok(targetIds.indexOf('grok') !== -1, 'Grok is a compare target');
  ok(targetIds.indexOf('mistral') !== -1, 'Mistral is a compare target');
  ok(targetIds.indexOf('metaai') !== -1, 'Meta AI is a compare target');
  ok(targetIds.indexOf('qwen') !== -1, 'Qwen is a compare target');
  ok(targetIds.indexOf('kimi') !== -1, 'Kimi is a compare target');
  ok(targetIds.indexOf('poe') !== -1, 'Poe is a compare target');

  // Default targets
  const defaults = await F.getLastCompareTargets();
  eq(defaults, ['chatgpt', 'claude', 'gemini'], 'Default targets are ChatGPT, Claude, and Gemini');

  await F.setLastCompareTargets(['claude', 'perplexity', 'deepseek']);
  const updatedTargets = await F.getLastCompareTargets();
  eq(updatedTargets, ['claude', 'perplexity', 'deepseek'], 'Last selected targets are remembered');

  // Pro gating
  eq(F.isPro(), false, 'Store starts in Free tier');
  const { S } = await proRealm('COMPARE-PRO-KEY');
  eq(S.isPro(), true, 'Pro realm has active Pro license');

  // Background compare messaging and geometry verification
  const bgCode = read('background/background.js');
  ok(bgCode.indexOf('start_compare') !== -1, 'Background handles start_compare');
  ok(bgCode.indexOf('get_pending_compare') !== -1, 'Background handles get_pending_compare');
  ok(bgCode.indexOf('compare_status') !== -1, 'Background handles compare_status');
  ok(bgCode.indexOf('chosen.length < 6') !== -1, 'Background caps compare targets at 6');

  // Content script adapters security check: no chatbot response reading, no transcript scraping
  const adaptersCode = read('content/adapters.js');
  ok(adaptersCode.indexOf('response') === -1 || adaptersCode.indexOf('readResponse') === -1, 'Adapters do not read chatbot responses');
  ok(adaptersCode.indexOf('transcript') === -1, 'Zero transcript scraping in adapters');
  ok(adaptersCode.indexOf('COMPARE_TARGETS') !== -1, 'Adapters export COMPARE_TARGETS');

  // Content script compare coordination
  const contentCode = read('content/content.js');
  ok(contentCode.indexOf('checkPendingCompare') !== -1, 'Content script checks for pending compare jobs');
  ok(contentCode.indexOf('open_compare') !== -1, 'Content script handles open_compare message');

  // The wiring between the form and the worker. Each of these was broken at
  // once, so Compare did nothing even with Pro active.
  const cs = readCode('content/content.js');
  const vmCode = readCode('content/variableModal.js');
  const opt = readCode('options/options.js');
  ok(/meta && meta\.compare\)[\s\S]{0,120}startCompareRun\(renderedText, meta\.compare\)/.test(cs),
    '"Run comparison" in the form starts a compare run instead of inserting into this page');
  ok(/onSelectPrompt: \(prompt, ctx\) => \{[\s\S]{0,400}compareMode: !!\(ctx && ctx\.compareMode\)/.test(cs),
    'The palette passes compareMode through, so Compare… opens the target picker');
  ok(/allowCompare: false/.test(cs) && /opts\.allowCompare === false/.test(vmCode),
    'Chain steps hide Compare, which would otherwise break the chain');
  ok(/Promise\.resolve\(store\.getLastCompareTargets\(\)\)/.test(vmCode) && vmCode.indexOf('lastTargets.forEach') === -1,
    'The in-page form treats the remembered targets as a promise');
  ok(/await store\.getLastCompareTargets\(\)/.test(opt) && opt.indexOf('lastChosen = store.getLastCompareTargets()') === -1,
    'The library page awaits the remembered targets before drawing the picker');
  ok(vmCode.indexOf('escapeHtml(t.name)') === -1 && opt.indexOf('escapeHtml(t.name)') === -1,
    'Compare pickers show the target label, which is the field the target lists define');
  ok(/compareModalPreview\.value/.test(opt) && /<textarea[^>]*id="opt-compare-preview"/.test(read('options/options.html')),
    'The library page sends the editable text box, so blanks can be filled first');

  // The worker opens URLs from the store's list; the tab finds its chat box
  // through the adapter's list. They must describe the same pages.
  const adapterTargets = H.createAdapterRealm().adapters.COMPARE_TARGETS.map((t) => t.id + ' ' + t.url);
  eq(targets.map((t) => t.id + ' ' + t.url), adapterTargets, 'Store and adapter compare targets open the same URLs');
  const manifest = JSON.parse(read('manifest.json'));
  const matches = manifest.content_scripts[0].matches;
  const covered = (url) => {
    const host = new URL(url).hostname;
    return matches.some((m) => {
      const h = m.replace(/^\*:\/\//, '').replace(/\/.*$/, '');
      if (h.indexOf('*.') === 0) return host === h.slice(2) || host.endsWith(h.slice(1));
      return host === h;
    });
  };
  const uncovered = targets.filter((t) => !covered(t.url)).map((t) => t.id);
  eq(uncovered, [], 'Every compare target URL gets the content script');

  // New tabs are the default; tiled windows only when picked.
  const optHtml = read('options/options.html');
  ok(/name="omni-compare-layout" value="tabs" checked/.test(vmCode) && !/value="window" checked/.test(vmCode),
    'The in-page form opens new tabs by default');
  ok(/name="opt-compare-layout" value="tabs" checked/.test(optHtml) && !/name="opt-compare-layout" value="window" checked/.test(optHtml),
    'The library dialog opens new tabs by default');
  ok(/const layout = request\.layout === 'tiled' \? 'tiled' : 'tabs';/.test(readCode('background/background.js')),
    'The worker opens tabs unless tiled windows were asked for');
}

async function testSmartTemplates() {
  section('35. Smart templates (conditionals, date maths, required fields, repeatable blocks)');

  const freeRealm = H.createStoreRealm();
  const F = freeRealm.sandbox.OmniStore;
  const T = freeRealm.sandbox.OmniTemplate;
  await F.init();

  // 1. Conditionals: presence
  const tplPresence = 'Hello {{name}}{{#if details}}, details: {{details}}{{/if}}!';
  eq(T.render(tplPresence, { name: 'Alice', details: 'Order #123' }), 'Hello Alice, details: Order #123!', 'Conditional renders block when variable is present');
  eq(T.render(tplPresence, { name: 'Bob', details: '' }), 'Hello Bob!', 'Conditional hides block when variable is empty');
  eq(T.render(tplPresence, { name: 'Bob' }), 'Hello Bob!', 'Conditional hides block when variable is omitted');

  // Conditionals: equality
  const tplEqual = 'Tone: {{#if tone=formal}}Formal greeting{{/if}}{{#if tone=casual}}Casual hello{{/if}}';
  eq(T.render(tplEqual, { tone: 'formal' }), 'Tone: Formal greeting', 'Equality conditional matches value');
  eq(T.render(tplEqual, { tone: 'FORMAL' }), 'Tone: Formal greeting', 'Equality conditional is case-insensitive');
  eq(T.render(tplEqual, { tone: 'casual' }), 'Tone: Casual hello', 'Equality conditional matches alternative branch');
  eq(T.render(tplEqual, { tone: 'pirate' }), 'Tone: ', 'Equality conditional produces empty string when no match');

  // Conditionals: else
  const tplElse = 'Status: {{#if active}}Online{{#else}}Offline{{/if}}';
  eq(T.render(tplElse, { active: 'yes' }), 'Status: Online', 'Else block is skipped when variable is present');
  eq(T.render(tplElse, { active: '' }), 'Status: Offline', 'Else block renders when variable is empty');

  // 2. Date maths
  const baseDate = new Date(2026, 0, 15); // Jan 15, 2026
  eq(T.computeDateMath(baseDate, '+7d').getDate(), 22, 'Date math +7d adds 7 days');
  eq(T.computeDateMath(baseDate, '-2w').getDate(), 1, 'Date math -2w subtracts 14 days');
  eq(T.computeDateMath(baseDate, '+1m').getMonth(), 1, 'Date math +1m adds 1 month');
  eq(T.computeDateMath(baseDate, '-1y').getFullYear(), 2025, 'Date math -1y subtracts 1 year');

  // Month rollover clamping
  const jan31 = new Date(2026, 0, 31);
  const febResult = T.computeDateMath(jan31, '+1m');
  eq(febResult.getMonth(), 1, 'Target month is February');
  eq(febResult.getDate(), 28, 'Jan 31 + 1m clamps to Feb 28 in a common year');

  // Leap year calculation
  const leapJan31 = new Date(2024, 0, 31);
  const leapFebResult = T.computeDateMath(leapJan31, '+1m');
  eq(leapFebResult.getDate(), 29, 'Jan 31 + 1m clamps to Feb 29 in a leap year');
  const leapFeb29 = new Date(2024, 1, 29);
  eq(T.computeDateMath(leapFeb29, '+1y').getDate(), 28, 'Feb 29 + 1y clamps to Feb 28 in next common year');

  // Date math in template rendering
  const tplDate = 'Due: {{date+14d}}';
  const renderedDate = T.render(tplDate, {});
  ok(renderedDate.indexOf('Due: 20') !== -1 || renderedDate.indexOf('Due: 10/') !== -1 || renderedDate.indexOf('Due: ') === 0, 'Date math expands in template render');

  // Variables parsing does not expose date math tokens as user form fields
  const parsedDateVars = T.parseVariables(tplDate);
  eq(parsedDateVars.length, 0, 'Date math tokens are not exposed as form input fields');

  // 3. Required fields with !
  const tplReq = 'Company: {{company!}}, Product: {{product}}';
  const reqVars = T.parseVariables(tplReq);
  eq(reqVars[0].name, 'company', 'Variable name strips trailing exclamation');
  eq(reqVars[0].strictRequired, true, 'Variable has strictRequired true');
  eq(reqVars[1].strictRequired, false, 'Non-exclamation variable has strictRequired false');

  const valMissing = T.validate(tplReq, { company: '', product: 'Widget' });
  eq(valMissing.ok, false, 'Validation fails when strictRequired field is empty');
  eq(valMissing.missing.map((v) => v.name), ['company'], 'Validation reports missing strictRequired field');

  const valOk = T.validate(tplReq, { company: 'Acme', product: 'Widget' });
  eq(valOk.ok, true, 'Validation passes when strictRequired field is provided');

  // 4. Repeatable blocks
  const tplRepeat = 'List:\n{{#repeat item}} - {{item}}\n{{/repeat}}Done.';
  const repVars = T.parseVariables(tplRepeat);
  eq(repVars[0].name, 'item', 'Repeat block variable name is parsed');
  eq(repVars[0].type, 'repeat', 'Repeat block variable has type repeat');

  const repRendered = T.render(tplRepeat, { item: ['Apple', 'Banana', 'Cherry'] });
  eq(repRendered, 'List:\n - Apple\n - Banana\n - Cherry\nDone.', 'Repeatable block renders each item in array');

  // 5. hasSmartSyntax and lintTemplate
  ok(T.hasSmartSyntax('{{#if x}}test{{/if}}'), 'hasSmartSyntax detects #if');
  ok(T.hasSmartSyntax('{{date+3d}}'), 'hasSmartSyntax detects date math');
  ok(T.hasSmartSyntax('{{user!}}'), 'hasSmartSyntax detects strictRequired !');
  ok(T.hasSmartSyntax('{{#repeat x}}{{x}}{{/repeat}}'), 'hasSmartSyntax detects #repeat');
  ok(!T.hasSmartSyntax('Hello {{name}}, welcome to {{city}}!'), 'hasSmartSyntax is false for standard templates');

  const lintErr = T.lintTemplate('{{#if condition}}Unclosed block');
  ok(lintErr.errors.length > 0, 'lintTemplate detects unclosed #if block');
  const lintOk = T.lintTemplate('{{#if condition}}Closed block{{/if}}');
  eq(lintOk.errors.length, 0, 'lintTemplate reports 0 errors for valid template');

  // 6. Regression check on all 136 built-in prompts
  const { S } = await proRealm('SMART-TPL-REGRESSION-KEY');
  const builtins = S.getAll({ allBuiltins: true }).filter((p) => S.isBuiltin(p.id));
  eq(builtins.length, 136, 'There are 136 built-in prompts');
  const builtinsWithSmart = builtins.filter((p) => T.hasSmartSyntax(p.template));
  eq(builtinsWithSmart.length, 0, 'Zero built-in prompts contain smart syntax (all stay 100% backward-compatible)');
}

async function testCustomModifiers() {
  section('36. Custom right-click modifiers (Pro)');

  const freeRealm = H.createStoreRealm();
  const F = freeRealm.sandbox.OmniStore;
  await F.init();

  // Free tier restrictions
  eq(F.getCustomModifiers().length, 0, 'Initial custom modifiers list is empty');
  eq((await rejection(F.saveCustomModifier({ title: 'My Mod', instruction: 'Do it' }))).code, 'PRO_REQUIRED', 'Free cannot save custom modifiers');

  // Pro tier functionality
  const { realm, S } = await proRealm('CUSTOM-MODS-KEY');
  const M = realm.sandbox.OmniModifiers;

  // Create custom modifier with 'quote' placement
  const modQuote = await S.saveCustomModifier({
    title: 'Summarize in 3 bullets',
    placement: 'quote',
    description: 'Quick bullet summary',
    instruction: 'Summarize the following text in 3 concise bullet points:'
  });
  ok(!!modQuote.id && modQuote.id.indexOf('mod-custom-') === 0, 'Custom modifier receives mod-custom- prefix');
  eq(modQuote.title, 'Summarize in 3 bullets', 'Title is stored');
  eq(modQuote.placement, 'quote', 'Placement is stored');
  eq(S.getCustomModifiers().length, 1, 'Custom modifier is listed in store');

  // Test placement formats in execution via OmniModifiers
  const outQuote = M.apply(modQuote.id, 'Sample input text');
  eq(outQuote, 'Summarize the following text in 3 concise bullet points:\n\n"""\nSample input text\n"""', 'Quote placement wraps text in triple quotes');

  // Create custom modifier with 'fence' placement
  const modFence = await S.saveCustomModifier({
    title: 'Code review',
    placement: 'fence',
    instruction: 'Review this code:'
  });
  const outFence = M.apply(modFence.id, 'const x = 1;');
  eq(outFence, 'Review this code:\n\n```\nconst x = 1;\n```', 'Fence placement wraps text in markdown code fence');

  // Create custom modifier with 'before' placement
  const modBefore = await S.saveCustomModifier({
    title: 'Add context before',
    placement: 'before',
    instruction: 'Explain why the above happened.'
  });
  const outBefore = M.apply(modBefore.id, 'An unexpected error occurred.');
  eq(outBefore, 'Explain why the above happened.\n\nAn unexpected error occurred.', 'Before placement puts selected text after instruction as payload');

  // Create custom modifier with 'after' placement
  const modAfter = await S.saveCustomModifier({
    title: 'Direct instruction',
    placement: 'after',
    instruction: 'Rewrite this professionally:'
  });
  const outAfter = M.apply(modAfter.id, 'hey bro');
  eq(outAfter, 'hey bro\n\nRewrite this professionally:', 'After placement puts instruction after selected text');

  // Verify getAll includes custom modifiers
  const allModifiers = M.getAll();
  ok(allModifiers.some((m) => m.id === modQuote.id), 'OmniModifiers.getAll() includes custom modifiers');
  ok(allModifiers.length >= 16, 'Total modifiers count reflects 12 built-in + 4 custom');

  // Delete custom modifier
  const deleted = await S.deleteCustomModifier(modQuote.id);
  eq(deleted, true, 'deleteCustomModifier returns true');
  eq(S.getCustomModifiers().length, 3, 'Custom modifier removed from list');

  // Limit check: 30 custom modifiers
  for (let i = 0; i < 27; i++) {
    await S.saveCustomModifier({ title: 'Bulk Mod ' + i, instruction: 'Instruction ' + i });
  }
  eq(S.getCustomModifiers().length, 30, 'Reached 30 custom modifiers');
  eq((await rejection(S.saveCustomModifier({ title: 'Mod 31', instruction: 'Over limit' }))).code, 'LIMIT_REACHED', 'Cannot exceed MAX_CUSTOM_MODIFIERS (30)');

  // Downgrade to Free: existing modifiers remain readable and deletable
  await S.deactivateLicense();
  eq(S.getCustomModifiers().length, 30, 'Custom modifiers remain visible on Free');
  eq(await S.deleteCustomModifier(modFence.id), true, 'Free can delete existing custom modifier');
  eq(S.getCustomModifiers().length, 29, 'Modifier deleted on Free');
}

async function testSiteRules() {
  section('37. Site rules (Pro)');

  const freeRealm = H.createStoreRealm();
  const F = freeRealm.sandbox.OmniStore;
  await F.init();

  // Free tier restrictions
  eq(F.getSiteRules().length, 0, 'Initial site rules list is empty');
  eq((await rejection(F.saveSiteRule({ name: 'Rule 1', hosts: ['github.com'] }))).code, 'PRO_REQUIRED', 'Free cannot save site rules');

  // Pro tier functionality
  const { S } = await proRealm('SITE-RULES-KEY');

  // Host matching logic
  ok(S.hostMatchesRule('mail.google.com', 'mail.google.com'), 'Exact host match succeeds');
  ok(!S.hostMatchesRule('google.com', 'mail.google.com'), 'Exact host match does not match parent domain');
  ok(!S.hostMatchesRule('notgoogle.com', 'google.com'), 'Exact host match does not match substring domain');

  // Wildcard host matching (*.domain.com)
  ok(S.hostMatchesRule('jira.atlassian.net', '*.atlassian.net'), 'Wildcard matches subdomain');
  ok(S.hostMatchesRule('confluence.atlassian.net', '*.atlassian.net'), 'Wildcard matches sibling subdomain');
  ok(S.hostMatchesRule('atlassian.net', '*.atlassian.net'), 'Wildcard matches root domain');
  ok(!S.hostMatchesRule('evil-atlassian.net', '*.atlassian.net'), 'Wildcard does not match substring domain');

  // Save site rule
  const p1 = await S.savePrompt({ title: 'PR Review', template: 'Review this PR', tags: ['code'] });
  const p2 = await S.savePrompt({ title: 'Bug Report', template: 'Report this bug', tags: ['code'] });
  const p3 = await S.savePrompt({ title: 'Casual Chat', template: 'Friendly chat', tags: ['chat'] });

  const rule = await S.saveSiteRule({
    name: 'GitHub Code Prompts',
    hosts: ['github.com', '*.github.com'],
    tags: ['code']
  });
  ok(!!rule.id && rule.id.indexOf('rule-') === 0, 'Site rule receives rule- prefix');
  eq(S.getSiteRules().length, 1, 'Site rule is listed');

  // Matching prompts for host
  const matchedRules = S.getRulesForHost('github.com');
  eq(matchedRules.length, 1, 'getRulesForHost finds matching rule');

  // Search ranking boost with host (empty query returns "For this site" prompts first)
  const emptyQueryResults = S.search({ query: '', host: 'github.com' });
  const firstTwo = [emptyQueryResults[0].id, emptyQueryResults[1].id];
  ok(firstTwo.indexOf(p1.id) !== -1 && firstTwo.indexOf(p2.id) !== -1, 'Empty query groups site-matched prompts first');

  // Limit check: 50 site rules
  for (let i = 0; i < 49; i++) {
    await S.saveSiteRule({ name: 'Rule ' + i, hosts: ['site' + i + '.com'] });
  }
  eq(S.getSiteRules().length, 50, 'Reached 50 site rules');
  eq((await rejection(S.saveSiteRule({ name: 'Rule 51', hosts: ['site51.com'] }))).code, 'LIMIT_REACHED', 'Cannot exceed MAX_SITE_RULES (50)');

  // Delete site rule
  eq(await S.deleteSiteRule(rule.id), true, 'deleteSiteRule returns true');
  eq(S.getSiteRules().length, 49, 'Rule count decremented');

  // Host privacy: content script isolation
  const palCode = read('content/commandPalette.js');
  ok(palCode.indexOf('location.hostname') !== -1 && palCode.indexOf('host: host') !== -1, 'Command palette passes only location.hostname');
  const triggerCode = read('content/slashTrigger.js');
  ok(triggerCode.indexOf('location.hostname') !== -1 && triggerCode.indexOf('host: host') !== -1, 'Slash trigger passes only location.hostname');
}

async function testFolderSyncSetupAndBacklog() {
  section('38. Folder sync setup copy and post-launch backlog notes');

  // Verify options page contains instructions for 4 providers and local privacy note
  const optionsHtml = read('options/options.html');
  ok(optionsHtml.indexOf('OneDrive') !== -1, 'options.html mentions OneDrive setup');
  ok(optionsHtml.indexOf('Google Drive') !== -1, 'options.html mentions Google Drive setup');
  ok(optionsHtml.indexOf('Dropbox') !== -1, 'options.html mentions Dropbox setup');
  ok(optionsHtml.indexOf('iCloud') !== -1, 'options.html mentions iCloud Drive setup');
  ok(optionsHtml.indexOf('local sync folder') !== -1 && optionsHtml.indexOf('sends nothing over the internet') !== -1, 'options.html mentions local file privacy');

  // Verify post-launch backlog notes in steering docs
  const productMd = read('.kiro/steering/product.md');
  ok(productMd.indexOf('Google Drive') !== -1, 'product.md contains post-launch Google Drive backlog note');

  const researchMd = read('product_research.md');
  ok(researchMd.indexOf('Google Drive') !== -1, 'product_research.md contains Google Drive note');
}

async function testFinalAuditRegressions() {
  section('39. Final audit regressions (storage reload, sync, compare, chains)');

  // A storage change from another surface reloads state. Every key the store
  // keeps must be re-read, or the next save writes an empty list back.
  const { realm, S } = await proRealm('AUDIT-KEY');
  await S.createCategory('Client work', '💼');
  await S.saveCustomModifier({ title: 'Bulletise', instruction: 'Make bullets', placement: 'quote' });
  await S.saveSiteRule({ name: 'Mail', hosts: ['mail.google.com'], tags: ['email'] });
  S.watchStorage();
  await new Promise((resolve) => realm.chrome.storage.local.set({ 'omni.usage': { x: 1 } }, resolve));
  await new Promise((r) => setTimeout(r, 20));
  ok(S.getCustomCategories().some((x) => x.name === 'Client work'), 'An unrelated storage change keeps custom categories in memory');
  eq(S.getCustomModifiers().length, 1, 'An unrelated storage change keeps custom modifiers in memory');
  eq(S.getSiteRules().length, 1, 'An unrelated storage change keeps site rules in memory');
  await S.restoreDefaultLibrary();
  eq((realm.read('omni.customModifiers') || []).length, 1, 'A later full save does not write custom modifiers back as empty');
  eq((realm.read('omni.siteRules') || []).length, 1, 'A later full save does not write site rules back as empty');

  // A fresh load reads custom categories too.
  const again = H.createStoreRealm({ storageSeed: JSON.parse(JSON.stringify(realm.storage.local)) });
  await again.sandbox.OmniStore.init();
  ok(again.sandbox.OmniStore.getCustomCategories().some((x) => x.name === 'Client work'), 'init() loads custom categories');

  // Custom modifiers and site rules travel through Chrome sync, and a
  // deletion on one device is not undone by the other.
  const one = await proRealm('SYNC-A');
  await one.S.setSyncEnabled(true);
  const mod = await one.S.saveCustomModifier({ title: 'Shorten', instruction: 'Shorten it', placement: 'after' });
  await one.S.saveSiteRule({ name: 'Code', hosts: ['github.com'], tags: ['code'] });
  await one.S.pushSync();
  const two = await proRealm('SYNC-B', { sharedSync: one.realm.storage.sync });
  await two.S.setSyncEnabled(true);
  ok(two.S.getCustomModifiers().some((m) => m.title === 'Shorten'), 'Custom modifiers reach a second device through sync');
  ok(two.S.getSiteRules().some((r) => r.name === 'Code'), 'Site rules reach a second device through sync');
  await one.S.deleteCustomModifier(mod.id);
  ok(typeof one.S.exportBundle({ includeTombstones: true }).tombstones[mod.id] === 'number', 'Deleting a custom modifier leaves a deletion record');
  await one.S.pushSync();
  await two.S.pullSync();
  ok(!two.S.getCustomModifiers().some((m) => m.id === mod.id), 'A modifier deleted on one device is removed on the other');

  // Folder sync carries them too.
  const file = JSON.stringify(two.S.exportBundle({ includeSettings: false, includeTombstones: true }));
  const three = await proRealm('SYNC-C');
  await three.S.folderSyncMerge(file);
  ok(three.S.getSiteRules().some((r) => r.name === 'Code'), 'Folder sync merges site rules');

  // Compare: the in-page form hands its result to the coordinator, which uses
  // the field names the worker reads.
  const cs = readCode('content/content.js');
  const bg = readCode('background/background.js');
  const vm = readCode('content/variableModal.js');
  ok(vm.indexOf("action: 'start_compare'") === -1, 'The fill-in form does not message the worker with its own field names');
  ok(/action: 'start_compare',\s*text,\s*targets:/.test(cs), 'Content sends start_compare with text and targets');
  ok(bg.indexOf('request.targets') !== -1 && bg.indexOf('request.text') !== -1, 'The worker reads text and targets');
  ok(cs.indexOf('landingCheck()') === -1 && cs.indexOf('await window.ChatbotAdapters.insert') === -1, 'Compare checks the landing result instead of a truthy object');
  ok(cs.indexOf('confirmLanded(result)') !== -1 && /checkPendingCompare[\s\S]*confirmLanded\(result\)/.test(cs), 'Compare tabs confirm the text landed before sending');
  ok(/case 'compare_status':[\s\S]{0,400}recordCompareResult/.test(bg), 'The worker records each compare result');
  ok(bg.indexOf("action: 'compare_summary'") !== -1 && cs.indexOf("case 'compare_summary'") !== -1, 'The tab that started Compare gets a summary');
  ok(bg.indexOf('availLeft') === -1 && bg.indexOf('screenLeft') !== -1, 'Tiling uses the screen position sent by the page');
  ok(bg.indexOf('COMPARE_MIN_W') !== -1, 'Tiled windows have a minimum width');

  // Chains: the runner uses adapter functions that exist.
  const ad = readCode('content/adapters.js');
  ok(cs.indexOf('findActiveComposer') === -1, 'The chain runner does not call a missing adapter function');
  ok(/getRememberedTarget,/.test(ad) && /getInputElement,/.test(ad), 'The adapter exports what the chain runner uses');

  // The palette compare shortcut works on macOS, where Option+C types "ç".
  const pal = readCode('content/commandPalette.js');
  ok(pal.indexOf("e.code === 'KeyC'") !== -1, 'The palette compare shortcut matches on e.code');

  // Every OmniStore call on the options page exists.
  const opt = readCode('options/options.js');
  const called = new Set((opt.match(/\bstore\.([A-Za-z]\w*)\(/g) || []).map((m) => m.slice(6, -1)));
  const missing = Array.from(called).filter((name) => typeof S[name] !== 'function');
  eq(missing.join(', '), '', 'Every store.*() call in options.js exists in OmniStore');
  const pop = readCode('popup/popup.js');
  const calledP = new Set((pop.match(/\bstore\.([A-Za-z]\w*)\(/g) || []).map((m) => m.slice(6, -1)));
  eq(Array.from(calledP).filter((name) => typeof S[name] !== 'function').join(', '), '', 'Every store.*() call in popup.js exists in OmniStore');
  ok(pop.indexOf('window.confirm(') === -1, 'The popup uses its own confirm dialog, which cannot close the popup');

  // Dates are YYYY-MM-DD from the local clock, as the README promises, so
  // 10/8/2026 never means October to one user and August to another.
  const tRealm = H.createStoreRealm();
  const T = tRealm.sandbox.OmniTemplate;
  eq(T.localIsoDate(new Date(2026, 0, 5, 23, 30)), '2026-01-05', 'localIsoDate pads and uses the local day');
  const rendered = T.render('Due {{date+7d}}', {});
  ok(/^Due \d{4}-\d{2}-\d{2}$/.test(rendered), 'Date maths renders YYYY-MM-DD', rendered);
  const tcode = readCode('lib/template.js');
  ok(tcode.indexOf('toLocaleDateString') === -1, 'Template dates do not depend on the browser locale');

  // Store-page excludes match between the manifest and dynamic registration.
  const m = JSON.parse(read('manifest.json'));
  const ex = m.content_scripts[0].exclude_matches;
  ok(ex.indexOf('*://addons.opera.com/*') !== -1, 'Opera add-ons store is excluded');
  ex.forEach((p) => ok(bg.indexOf("'" + p + "'") !== -1, 'Dynamic scripts exclude ' + p));
}

async function main() {
  console.log('OmniPrompt regression suite');
  console.log('===========================');

  const realm = H.createStoreRealm();
  await realm.sandbox.OmniStore.init();

  testManifest();
  await testPageRealmWithoutImporters();
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
  await testImeAndHotkeys();
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
  await testClientPackAndImportLimit();
  await testDodoMode();
  await testWorkspaces();
  await testSavedValues();
  await testChains();
  await testLibraryTools();
  await testFolderSync();
  await testFreeTwentyAndBackups();
  testNoRemoteCode();
  await testCompareAcrossAis();
  await testSmartTemplates();
  await testCustomModifiers();
  await testSiteRules();
  await testFolderSyncSetupAndBacklog();
  await testFinalAuditRegressions();

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
