const assert = require('node:assert/strict');
const { test } = require('node:test');
const React = require('react');
const { act, create } = require('react-test-renderer');
const { loadTs } = require('./helpers/load-ts.cjs');
global.IS_REACT_ACT_ENVIRONMENT = true;
const deferred = () => { let resolve; const promise = new Promise((yes) => { resolve = yes; }); return { promise, resolve }; };
async function mount(t, options = {}) {
  const shared = { account: '0xfirst' };
  let wallet = { address: options.initialAddress === null ? null : 'Gfirst', network: 'TESTNET', busy: null };
  const instances = [], events = [];
  const empty = { authenticated: false, loaded: false, fresh: false, items: [], busy: null, redeemingId: null, error: null };
  class Controller {
    constructor(deps) { this.deps = deps; this.state = empty; this.listeners = new Set(); instances.push(this); }
    getSnapshot = () => this.state;
    subscribe = (fn) => { this.listeners.add(fn); return () => this.listeners.delete(fn); };
    patch = (patch) => { this.state = { ...this.state, ...patch }; this.listeners.forEach((fn) => fn()); };
    restore = async () => { events.push(`restore:${this.deps.address}`); };
    dispose = () => { events.push(`dispose:${this.deps.address}`); };
    endSession = async () => { events.push(`end:${this.deps.address}`); if (options.end) await options.end.promise; return true; };
    refresh = () => {};
  }
  const storage = {
    read: async () => ({ cookie: 'relayid_stellar_session=stored' }),
    clear: async () => { events.push('storage:clear'); },
  };
  const api = async (route, params) => { events.push(`${params.method}:${route}`); };
  const mod = loadTs(require.resolve('../hooks/useStellarDisbursements.tsx'), {
    'react-native': { AppState: { addEventListener: () => ({ remove() {} }), currentState: 'active' } },
    'expo-crypto': { getRandomBytes: () => new Uint8Array(16) },
    '@/contexts/DemoContext': { useDemoMode: () => shared },
    './useNativeStellarWallet': { useNativeStellarWallet: () => wallet },
    '@/lib/disbursement-controller': { DisbursementController: Controller },
    '@/lib/disbursement-session-storage': { disbursementSessionStorage: () => storage },
    '@/lib/stellar-disbursements': { disbursementOrigin: () => 'https://relayid.example', createDisbursementApi: () => api },
    '@/lib/stellar-native': { networkPassphrase: () => 'testnet' },
  }, { setInterval, clearInterval });
  let current;
  function Probe() { current = mod.useStellarDisbursements(); return null; }
  const tree = () => React.createElement(React.StrictMode, null, React.createElement(mod.StellarDisbursementsProvider, null, React.createElement(Probe)));
  let root;
  await act(async () => { root = create(tree()); });
  t.after(async () => { await act(async () => root.unmount()); });
  return { instances, events, get: () => current, change: async (account, address) => {
    shared.account = account;
    wallet = { ...wallet, address };
    await act(async () => root.update(tree()));
  } };
}
test('root provider handles strict remount without duplicate session restores', async (t) => {
  const app = await mount(t);
  assert.equal(app.events.filter((e) => e === 'restore:Gfirst').length, 1);
  assert.equal(app.events.some((e) => e.startsWith('end:')), false);
});
test('account switch hides old rows immediately and waits for old session cleanup before restore', async (t) => {
  const ending = deferred();
  const app = await mount(t, { end: ending });
  await act(async () => app.instances.at(-1).patch({ authenticated: true, items: [{ id: 'first' }] }));
  assert.equal(app.get().items.length, 1);
  await app.change('0xsecond', 'Gsecond');
  assert.equal(app.get().items.length, 0);
  assert.ok(app.events.includes('end:Gfirst'));
  assert.equal(app.events.includes('restore:Gsecond'), false);
  await act(async () => { ending.resolve(); });
  assert.ok(app.events.includes('restore:Gsecond'));
});
test('logout before Stellar address is available still clears the persisted cookie and ends server session', async (t) => {
  const app = await mount(t, { initialAddress: null });
  await act(async () => { await app.get().endSession(); });
  assert.ok(app.events.includes('storage:clear'));
  assert.ok(app.events.includes('DELETE:/api/session/stellar'));
});
