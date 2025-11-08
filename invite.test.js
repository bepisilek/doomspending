const fs = require('fs');
const vm = require('vm');

class Element {
  constructor(id = null) {
    this.id = id;
    this.value = '';
    this.hidden = false;
    this.disabled = false;
    this.attributes = {};
    this.listeners = {};
    this._classes = new Set();
    this._textContent = '';
    this._innerHTML = '';
    this.style = {
      display: '',
      storage: {},
      setProperty(prop, value) {
        this.storage[prop] = value;
      },
    };
  }

  get className() {
    return Array.from(this._classes).join(' ');
  }

  set className(value) {
    this._classes = new Set(String(value || '').split(/\s+/).filter(Boolean));
  }

  get classList() {
    const self = this;
    return {
      add(...tokens) {
        tokens.forEach(token => {
          if (token) self._classes.add(token);
        });
        return self.className;
      },
      remove(...tokens) {
        tokens.forEach(token => {
          if (token) self._classes.delete(token);
        });
        return self.className;
      },
      toggle(token, force) {
        if (force === undefined) {
          if (self._classes.has(token)) {
            self._classes.delete(token);
            return false;
          }
          self._classes.add(token);
          return true;
        }
        if (force) {
          self._classes.add(token);
          return true;
        }
        self._classes.delete(token);
        return false;
      },
      contains(token) {
        return self._classes.has(token);
      },
    };
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
  }

  getAttribute(name) {
    return Object.prototype.hasOwnProperty.call(this.attributes, name)
      ? this.attributes[name]
      : null;
  }

  addEventListener(type, handler) {
    if (!this.listeners[type]) {
      this.listeners[type] = [];
    }
    this.listeners[type].push(handler);
  }

  dispatchEvent(event) {
    const handlers = this.listeners[event.type] || [];
    handlers.forEach(handler => handler.call(this, event));
  }

  get textContent() {
    return this._textContent;
  }

  set textContent(value) {
    this._textContent = String(value);
  }

  get innerText() {
    return this.textContent;
  }

  set innerText(value) {
    this.textContent = value;
  }

  get innerHTML() {
    return this._innerHTML;
  }

  set innerHTML(value) {
    this._innerHTML = String(value);
  }

  appendChild() {
    // No-op for tests
  }
}

class DocumentStub {
  constructor() {
    this.elements = new Map();
    this.documentElement = new Element('documentElement');
    this.documentElement.getAttribute = () => '';
    this.documentElement.setAttribute = () => {};
  }

  registerElement(id, element = new Element(id)) {
    element.id = id;
    this.elements.set(id, element);
    return element;
  }

  getElementById(id) {
    if (!this.elements.has(id)) {
      this.registerElement(id, new Element(id));
    }
    return this.elements.get(id);
  }

  querySelectorAll() {
    return [];
  }

  createElement(tag) {
    const el = new Element(tag);
    el.tagName = tag;
    return el;
  }
}

class LocalStorageStub {
  constructor() {
    this.store = {};
  }

  getItem(key) {
    return Object.prototype.hasOwnProperty.call(this.store, key) ? this.store[key] : null;
  }

  setItem(key, value) {
    this.store[key] = String(value);
  }

  removeItem(key) {
    delete this.store[key];
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const html = fs.readFileSync('index.html', 'utf8');
const scriptStart = html.lastIndexOf('<script>');
const scriptEnd = html.lastIndexOf('</script>');
if (scriptStart === -1 || scriptEnd === -1) {
  throw new Error('Unable to locate application script in index.html');
}
const scriptContent = html.slice(scriptStart + '<script>'.length, scriptEnd);

const document = new DocumentStub();
const localStorage = new LocalStorageStub();

const inviteForm = document.registerElement('inviteForm');
inviteForm.classList.add('invite-form');

const startButton = document.registerElement('startButton');
startButton.classList.add('invite-start');
startButton.disabled = true;
startButton.setAttribute('aria-disabled', 'true');

const inviteCodeInput = document.registerElement('inviteCodeInput');

const inviteStatus = document.registerElement('inviteStatus');

['name', 'age', 'city', 'income', 'hours'].forEach(id => {
  document.registerElement(id);
});

const gaCalls = [];

const context = {
  console,
  document,
  localStorage,
  window: {
    gtag: (...args) => {
      gaCalls.push(args);
    },
  },
  alert: () => {},
  setTimeout,
  clearTimeout,
  Blob: function () {},
  URL: { createObjectURL: () => 'blob:stub', revokeObjectURL: () => {} },
};
context.window.document = document;
context.window.localStorage = localStorage;

vm.createContext(context);
vm.runInContext(scriptContent, context);

const getGlobalValue = expression => vm.runInContext(expression, context);

assert(!startButton.classList.contains('show'), 'Start button should be hidden initially');
assert(startButton.disabled === true, 'Start button should be disabled initially');
assert(inviteForm.hidden === false, 'Invite form should be visible initially');

inviteCodeInput.value = '1843-5092-JKLP';
context.validateInvite();

assert(getGlobalValue('inviteValidated') === true, 'Invite state should be valid after entering a valid code');
assert(startButton.classList.contains('show'), 'Start button should be visible after successful validation');
assert(startButton.disabled === false, 'Start button should be enabled after successful validation');
assert(inviteForm.hidden === true, 'Invite form should be hidden after successful validation');
assert(localStorage.getItem('munkaora_invite_valid') === 'true', 'Validation flag should persist to localStorage');
assert(inviteStatus.textContent.includes('elfogadva'), 'Success status message should be shown');

inviteCodeInput.value = 'INVALID';
context.validateInvite();

assert(getGlobalValue('inviteValidated') === false, 'Invite state should reset after invalid input');
assert(!startButton.classList.contains('show'), 'Start button should hide after invalid input');
assert(startButton.disabled === true, 'Start button should disable after invalid input');
assert(inviteForm.hidden === false, 'Invite form should reappear after invalid input');
assert(localStorage.getItem('munkaora_invite_valid') === null, 'Validation flag should be cleared from localStorage');
assert(inviteStatus.textContent.includes('nem érvényes') || inviteStatus.textContent.includes('meghívó'), 'Error status message should be shown');

const gaCallsBeforeTrack = gaCalls.length;
context.track('test_event', { foo: 'bar' });

assert(gaCalls.length === gaCallsBeforeTrack + 1, 'GA should capture an additional event via gtag');
const [type, eventName, payload] = gaCalls[gaCalls.length - 1];
assert(type === 'event', 'GA call should be sent as an event');
assert(eventName === 'test_event', 'GA event name should match the track invocation');
assert(payload.foo === 'bar', 'GA event payload should propagate parameters');

console.log('Invite gate tests passed');
