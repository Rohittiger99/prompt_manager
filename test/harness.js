/**
 * OmniPrompt - Node test harness
 *
 * Loads the extension's classic scripts into a throwaway realm that looks
 * enough like a browser (window, self) and ships a working in-memory stand-in
 * for chrome.storage. This lets the regression suite exercise the real storage
 * layer, migrations, ranking and template rendering instead of only checking
 * that files parse.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');

/**
 * Minimal chrome.storage.local / .sync replacement backed by plain objects.
 *
 * `sharedSync` lets two realms point at the same sync bucket, which is how the
 * suite simulates a second device picking up synced data.
 */
function createFakeChrome(seed, sharedSync) {
  const areas = {
    local: Object.assign({}, seed || {}),
    sync: sharedSync || {}
  };
  const listeners = [];

  function makeArea(name, quota) {
    return {
      QUOTA_BYTES: quota,
      get(keys, cb) {
        const store = areas[name];
        let out = {};
        if (keys === null || keys === undefined) {
          out = Object.assign({}, store);
        } else if (typeof keys === 'string') {
          if (keys in store) out[keys] = store[keys];
        } else if (Array.isArray(keys)) {
          keys.forEach((k) => {
            if (k in store) out[k] = store[k];
          });
        } else if (typeof keys === 'object') {
          Object.keys(keys).forEach((k) => {
            out[k] = k in store ? store[k] : keys[k];
          });
        }
        // Structured-clone semantics: callers must not share references.
        const cloned = JSON.parse(JSON.stringify(out));
        if (cb) cb(cloned);
      },
      set(obj, cb) {
        const store = areas[name];
        const changes = {};

        if (name === 'sync') {
          for (const k of Object.keys(obj)) {
            const itemBytes = Buffer.byteLength(k) + Buffer.byteLength(JSON.stringify(obj[k]));
            if (itemBytes > 8192) {
              const err = { message: 'Resource::kQuotaBytesPerItem quota exceeded' };
              lastErrorHolder.value = err;
              if (cb) cb();
              lastErrorHolder.value = null;
              return;
            }
          }
        }

        if (quota) {
          const projected = JSON.stringify(Object.assign({}, store, obj)).length;
          if (projected > quota) {
            const err = { message: 'QUOTA_BYTES quota exceeded' };
            lastErrorHolder.value = err;
            if (cb) cb();
            lastErrorHolder.value = null;
            return;
          }
        }

        Object.keys(obj).forEach((k) => {
          changes[k] = { oldValue: store[k], newValue: obj[k] };
          store[k] = JSON.parse(JSON.stringify(obj[k]));
        });
        if (cb) cb();
        listeners.forEach((fn) => fn(changes, name));
      },
      remove(keys, cb) {
        const store = areas[name];
        const list = Array.isArray(keys) ? keys : [keys];
        const changes = {};
        list.forEach((k) => {
          if (k in store) {
            changes[k] = { oldValue: store[k], newValue: undefined };
            delete store[k];
          }
        });
        if (cb) cb();
        listeners.forEach((fn) => fn(changes, name));
      },
      clear(cb) {
        areas[name] = {};
        if (cb) cb();
      }
    };
  }

  const lastErrorHolder = { value: null };

  const chrome = {
    storage: {
      local: makeArea('local', 0),
      sync: makeArea('sync', 102400),
      onChanged: {
        addListener(fn) {
          listeners.push(fn);
        },
        removeListener(fn) {
          const i = listeners.indexOf(fn);
          if (i !== -1) listeners.splice(i, 1);
        }
      }
    },
    runtime: {
      get lastError() {
        return lastErrorHolder.value;
      },
      getURL(p) {
        return 'chrome-extension://test/' + String(p).replace(/^\//, '');
      }
    }
  };

  return { chrome, areas, listeners };
}

/**
 * Build a realm and evaluate the requested classic scripts in order.
 * `files` are repo-relative paths.
 */
function createRealm(files, options) {
  const opts = options || {};
  const fake = createFakeChrome(opts.storageSeed, opts.sharedSync);

  const sandbox = {
    console,
    chrome: opts.noChrome ? undefined : fake.chrome,
    setTimeout,
    clearTimeout,
    Date,
    Math,
    JSON,
    Promise,
    RegExp,
    Error,
    String,
    Number,
    Object,
    Array,
    Boolean,
    isNaN,
    parseInt,
    parseFloat,
    encodeURIComponent,
    decodeURIComponent,
    fetch: opts.fetch || (typeof fetch !== 'undefined' ? fetch : undefined)
  };
  sandbox.window = sandbox;
  sandbox.self = sandbox;
  sandbox.globalThis = sandbox;

  vm.createContext(sandbox);

  (files || []).forEach((rel) => {
    const full = path.join(ROOT, rel);
    const code = fs.readFileSync(full, 'utf8');
    try {
      vm.runInContext(code, sandbox, { filename: rel });
    } catch (e) {
      throw new Error('Failed evaluating ' + rel + ': ' + e.message);
    }
  });

  return {
    sandbox,
    chrome: fake.chrome,
    storage: fake.areas,
    read(key) {
      return fake.areas.local[key];
    },
    readSync(key) {
      return fake.areas.sync[key];
    }
  };
}

/** The standard set of shared libraries, in load order. */
const LIB_FILES = [
  'data/defaultPrompts.js',
  'lib/template.js',
  'lib/modifiers.js',
  'lib/importers.js',
  'lib/promptStore.js'
];

function createStoreRealm(options) {
  return createRealm(LIB_FILES, options);
}

function readFile(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

module.exports = {
  ROOT,
  LIB_FILES,
  createRealm,
  createStoreRealm,
  createFakeChrome,
  readFile,
  exists
};

/**
 * Build a realm with just enough DOM to exercise content/adapters.js against a
 * textarea, and load the adapter into it.
 *
 * This exists so the most important guarantee in the extension - that inserting
 * a prompt does not destroy the user's draft - is tested by running the shipping
 * code, not by reading it. A full DOM library would be a heavier dependency
 * than the behaviour under test needs: the textarea path is string slicing plus
 * selectionStart bookkeeping.
 */
function createAdapterRealm() {
  const sandbox = {
    console,
    setTimeout,
    clearTimeout,
    JSON,
    Math,
    Date,
    Object,
    Array,
    String,
    Number,
    Boolean,
    Error,
    RegExp,
    Promise,
    parseFloat,
    parseInt
  };

  sandbox.window = sandbox;
  sandbox.self = sandbox;
  sandbox.globalThis = sandbox;

  // Events are recorded so a test can assert that frameworks were notified.
  sandbox.__events = [];

  function FakeEvent(type) {
    this.type = type;
    this.bubbles = true;
  }
  sandbox.Event = FakeEvent;
  sandbox.InputEvent = function (type, init) {
    FakeEvent.call(this, type);
    this.inputType = init && init.inputType;
    this.data = init && init.data;
  };
  sandbox.KeyboardEvent = function (type, init) {
    FakeEvent.call(this, type);
    Object.assign(this, init || {});
  };

  const rect = () => ({ top: 100, bottom: 140, left: 50, right: 450, width: 400, height: 40 });

  sandbox.document = {
    activeElement: null,
    body: { appendChild() {}, removeChild() {} },
    documentElement: {},
    addEventListener() {},
    removeEventListener() {},
    createElement() {
      return {
        style: {},
        setAttribute() {},
        appendChild() {},
        getBoundingClientRect: rect,
        set textContent(v) {
          this._text = v;
        },
        get textContent() {
          return this._text || '';
        }
      };
    },
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
    // The textarea path never reaches these, but adapters.js references them.
    createRange() {
      return {
        selectNodeContents() {},
        setStart() {},
        setEnd() {},
        collapse() {},
        cloneRange() {
          return this;
        },
        getClientRects() {
          return [];
        },
        deleteContents() {},
        insertNode() {},
        setStartAfter() {},
        toString() {
          return '';
        }
      };
    },
    createTreeWalker() {
      return { nextNode: () => null };
    },
    execCommand() {
      return false;
    }
  };

  sandbox.getSelection = () => ({
    rangeCount: 0,
    removeAllRanges() {},
    addRange() {},
    toString: () => ''
  });
  sandbox.getComputedStyle = () => ({
    visibility: 'visible',
    display: 'block',
    opacity: '1',
    lineHeight: '20px',
    fontSize: '14px'
  });
  sandbox.innerWidth = 1280;
  sandbox.innerHeight = 800;
  sandbox.location = { hostname: 'example.com', href: 'https://example.com/' };
  sandbox.requestAnimationFrame = (fn) => fn();
  sandbox.NodeFilter = { SHOW_TEXT: 4 };

  /** A stand-in for a real <textarea> with working selection bookkeeping. */
  sandbox.makeTextarea = function (value) {
    const el = {
      // adapters.isEditable checks nodeType, as a real element would have.
      nodeType: 1,
      tagName: 'TEXTAREA',
      isContentEditable: false,
      isConnected: true,
      disabled: false,
      readOnly: false,
      value: value || '',
      focus() {
        sandbox.document.activeElement = el;
      },
      setSelectionRange(start, end) {
        el.selectionStart = start;
        el.selectionEnd = end;
      },
      dispatchEvent(ev) {
        sandbox.__events.push(ev.type);
        return true;
      },
      getBoundingClientRect: rect,
      getAttribute() {
        return null;
      },
      closest() {
        return null;
      },
      parentElement: null,
      clientWidth: 400,
      scrollTop: 0,
      scrollLeft: 0
    };
    el.selectionStart = el.value.length;
    el.selectionEnd = el.value.length;
    return el;
  };

  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'content/adapters.js'), 'utf8'), sandbox, {
    filename: 'content/adapters.js'
  });

  return { sandbox, adapters: sandbox.ChatbotAdapters };
}

module.exports.createAdapterRealm = createAdapterRealm;
