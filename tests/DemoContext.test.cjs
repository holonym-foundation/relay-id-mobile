const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const fs = require('node:fs');
const { test } = require('node:test');
const vm = require('node:vm');
const React = require('react');
const { act, create } = require('react-test-renderer');
const ts = require('typescript');

// Exercise the real context with only the native SDK and clock replaced.
global.IS_REACT_ACT_ENVIRONMENT = true;
const source = fs.readFileSync(require.resolve('../contexts/DemoContext.tsx'), 'utf8');
const code = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    jsx: ts.JsxEmit.ReactJSX,
    target: ts.ScriptTarget.ES2020,
  },
}).outputText;
const address = '0x1111111111111111111111111111111111111111';
const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};

async function mount(t, options = {}) {
  const provider = new EventEmitter();
  const timers = new Map();
  let now = 0;
  let current;
  let loginCalls = 0;
  let initCalls = 0;
  let initConfig;
  let logoutCalls = 0;
  let chainCalls = 0;
  provider.request = async ({ method }) => {
    if (method === 'eth_accounts') return options.accounts ?? [];
    if (method === 'eth_chainId') {
      chainCalls += 1;
      return options.chain ? options.chain() : '0xaa36a7';
    }
    throw new Error(`Unexpected request: ${method}`);
  };
  provider.login = () => {
    loginCalls += 1;
    return options.login ? options.login() : Promise.resolve(null);
  };
  provider.logout = async () => {
    logoutCalls += 1;
    await options.logout?.();
    provider.emit('disconnect');
    provider.emit('accountsChanged', []);
  };
  const module = { exports: {} };
  vm.runInNewContext(code, {
    module,
    exports: module.exports,
    require: (id) => {
      if (id === '@/config/chains') return { appChain: { id: 11155111 } };
      if (id === '@/lib/constants') return { WAAP_ENVIRONMENT: 'production' };
      if (id === '@/lib/utils/serialize') return { marshalTypedData: (data) => data };
      if (id === '@human.tech/waap-sdk-react-native') {
        return { initWaapNative: (config) => { initCalls++; initConfig = config; return provider; }, createExpoNativeBrowser: () => () => {} };
      }
      if (id === 'expo-web-browser') return {};
      if (id === 'expo-constants') return { default: { expoConfig: { extra: { waapProject: options.waapProject } } } };
      if (id === 'viem') {
        return { createPublicClient: () => ({}), http: () => {}, numberToHex: (n) => `0x${n.toString(16)}` };
      }
      return require(id);
    },
    console: { log() {}, error() {} },
    setTimeout: (fn, ms) => {
      const id = Symbol();
      timers.set(id, { fn, at: now + ms });
      return id;
    },
    clearTimeout: (id) => timers.delete(id),
  });
  function Probe() {
    current = module.exports.useDemoMode();
    return null;
  }
  let root;
  await act(async () => {
    const tree = React.createElement(module.exports.DemoProvider, null, React.createElement(Probe));
    root = create(options.strict ? React.createElement(React.StrictMode, null, tree) : tree);
  });
  t.after(async () => { await act(async () => root.unmount()); });
  return {
    provider,
    timers,
    get: () => current,
    loginCalls: () => loginCalls,
    initCalls: () => initCalls,
    initConfig: () => initConfig,
    logoutCalls: () => logoutCalls,
    chainCalls: () => chainCalls,
    advance: async (ms) => {
      now += ms;
      await act(async () => {
        for (const [id, timer] of timers) {
          if (timer.at <= now) {
            timers.delete(id);
            timer.fn();
          }
        }
      });
    },
  };
}

test('a failed chain lookup remains bounded even after the account arrives', async (t) => {
  const app = await mount(t, { chain: () => { throw new Error('offline'); } });
  await act(async () => { await app.get().signIn(); });
  await act(async () => {
    app.provider.emit('accountsChanged', [address]);
    app.provider.emit('connect', { chainId: '0x1' });
  });
  assert.equal(app.get().isSigningIn, true);
  assert.equal(app.get().isConnected, false);
  await app.advance(45_000);
  assert.equal(app.get().isSigningIn, false);
  assert.equal(app.get().account, null);
  assert.equal(app.logoutCalls(), 1);
});

test('an SDK login that never settles times out and permits a fresh attempt', async (t) => {
  const oldLogin = deferred();
  let login = () => oldLogin.promise;
  const app = await mount(t, { login: () => login() });
  await act(async () => { void app.get().signIn(); });
  await app.advance(120_000);
  assert.equal(app.get().isSigningIn, false);
  assert.equal(app.logoutCalls(), 1);
  login = () => Promise.resolve(null);
  await act(async () => { await app.get().signIn(); });
  assert.equal(app.loginCalls(), 2);
  assert.equal(app.get().isSigningIn, true);
});

test('Cancel resets an unresolved SDK login and ignores its late result', async (t) => {
  const oldLogin = deferred();
  let login = () => oldLogin.promise;
  const app = await mount(t, { login: () => login() });
  await act(async () => { void app.get().signIn(); });
  await act(async () => app.get().cancelSignIn());
  assert.equal(app.get().isSigningIn, false);
  assert.equal(app.logoutCalls(), 1);
  login = () => Promise.resolve(null);
  await act(async () => { await app.get().signIn(); });
  const deadline = [...app.timers.values()][0].at;
  await act(async () => oldLogin.resolve(null));
  assert.equal(app.loginCalls(), 2);
  assert.equal(app.get().isSigningIn, true);
  assert.equal([...app.timers.values()][0].at, deadline);
});

test('Cancel also recovers when an account exists without a chain', async (t) => {
  const app = await mount(t, { chain: () => { throw new Error('offline'); } });
  await act(async () => { await app.get().signIn(); });
  await act(async () => app.provider.emit('accountsChanged', [address]));
  await act(async () => app.get().cancelSignIn());
  assert.equal(app.get().isSigningIn, false);
  assert.equal(app.get().account, null);
  assert.equal(app.timers.size, 0);
});

test('browser dismissal keeps waiting, and success clears the deadline', async (t) => {
  const app = await mount(t);
  await act(async () => { await app.get().signIn(); });
  assert.equal(app.get().isSigningIn, true);
  await act(async () => app.provider.emit('accountsChanged', [address]));
  assert.equal(app.get().isConnected, true);
  assert.equal(app.get().isSigningIn, false);
  assert.equal(app.timers.size, 0);
  await app.advance(120_000);
  assert.equal(app.logoutCalls(), 0);
});

test('retry reads the chain without needing a second connect event', async (t) => {
  let offline = true;
  const app = await mount(t, { chain: () => {
    if (offline) throw new Error('offline');
    return '0xaa36a7';
  } });
  await act(async () => { await app.get().signIn(); });
  await act(async () => app.provider.emit('accountsChanged', [address]));
  await app.advance(45_000);
  offline = false;
  await act(async () => { await app.get().signIn(); });
  await act(async () => app.provider.emit('accountsChanged', [address]));
  assert.equal(app.get().chainId, 11155111);
  assert.equal(app.get().isConnected, true);
  assert.equal(app.get().isSigningIn, false);
  assert.equal(app.chainCalls(), 2);
});

test('retry waits for old logout without letting its disconnect cancel the retry', async (t) => {
  const reset = deferred();
  const app = await mount(t, { logout: () => reset.promise });
  await act(async () => { await app.get().signIn(); });
  await act(async () => app.get().cancelSignIn());
  let retry;
  await act(async () => { retry = app.get().signIn(); });
  assert.equal(app.loginCalls(), 1);
  await act(async () => { reset.resolve(); await retry; });
  assert.equal(app.loginCalls(), 2);
  assert.equal(app.get().isSigningIn, true);
  assert.equal(app.timers.size, 1);
});

test('late chain reads and account events cannot revive a cancelled attempt', async (t) => {
  const chain = deferred();
  const app = await mount(t, { chain: () => chain.promise });
  await act(async () => { void app.get().signIn(); });
  await act(async () => app.get().cancelSignIn());
  await act(async () => {
    chain.resolve('0xaa36a7');
    app.provider.emit('accountsChanged', [address]);
    app.provider.emit('chainChanged', '0xaa36a7');
  });
  assert.equal(app.get().account, null);
  assert.equal(app.get().chainId, null);
  assert.equal(app.get().isSigningIn, false);
});

test('duplicate taps start only one SDK login', async (t) => {
  const app = await mount(t);
  await act(async () => { await Promise.all([app.get().signIn(), app.get().signIn()]); });
  assert.equal(app.loginCalls(), 1);
});

test('silent restoration still connects without starting interactive login', async (t) => {
  const app = await mount(t, { accounts: [address] });
  assert.equal(app.get().isConnected, true);
  assert.equal(app.get().isSigningIn, false);
  assert.equal(app.loginCalls(), 0);
  assert.equal(app.timers.size, 0);
});

test('a late login rejection cannot disconnect an already confirmed session', async (t) => {
  const login = deferred();
  const app = await mount(t, { login: () => login.promise });
  await act(async () => { void app.get().signIn(); });
  await act(async () => {
    app.provider.emit('accountsChanged', [address]);
    app.provider.emit('connect', { chainId: '0x1' });
  });
  assert.equal(app.get().isConnected, true);
  assert.equal(app.get().isSigningIn, false);
  await act(async () => login.reject(new Error('late SDK rejection')));
  assert.equal(app.get().isConnected, true);
  assert.equal(app.logoutCalls(), 0);
});


test('React effect replay does not replace the live SDK event bus', async (t) => {
  const app = await mount(t, { strict: true, accounts: [address] });
  assert.equal(app.initCalls(), 1);
  assert.equal(app.get().account, address);
  assert.equal(app.get().provider, app.provider);
});


test('staging wallet login returns to its own app instead of the production app', async (t) => {
  const waapProject = { appId: 'org.refunite.relayid.app.staging', nativeRedirect: 'relayidmobilestaging://' };
  const app = await mount(t, { waapProject });
  assert.equal(app.initConfig().project, waapProject);
});

test('default wallet login preserves the production identity and redirects', async (t) => {
  const app = await mount(t);
  assert.equal(app.initConfig().project.appId, 'org.refunite.relayid.app');
  assert.equal(app.initConfig().project.nativeRedirect, 'relayidmobile://');
  assert.equal(app.initConfig().project.universalRedirect, 'https://relayid.app');
});
