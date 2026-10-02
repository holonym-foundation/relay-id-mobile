const assert = require('node:assert/strict');
const { test } = require('node:test');
const React = require('react');
const { create, act } = require('react-test-renderer');
const { loadTs } = require('./helpers/load-ts.cjs');
global.IS_REACT_ACT_ENVIRONMENT = true;
const hash = 'a'.repeat(64);
const deferred = () => {
  let resolve;
  const promise = new Promise((yes) => { resolve = yes; });
  return { promise, resolve };
};
async function mount(t, options = {}) {
  const shared = { account: '0xfirst', provider: {} };
  const timers = new Map();
  const calls = [];
  const sdk = {
    restoreAccount: async () => ({ address: `G-${shared.account}` }),
    signMessage: async (_message, args) => { calls.push(['signMessage', args]); return { signedMessage: 'signature' }; },
    signTransaction: async (_xdr, args) => { calls.push(['signTransaction', args]); return { signedTxXdr: 'signed' }; },
    ...options.sdk,
  };
  const helpers = {
    STELLAR_NATIVE_NETWORK: 'TESTNET',
    networkPassphrase: () => 'testnet-passphrase',
    fetchStellarBalance: async () => ({ exists: true, balance: '10000.0000000' }),
    fundStellarTestAccount: async () => {},
    buildStellarTestPayment: async () => 'unsigned',
    signedTransactionHash: () => hash,
    submitStellarTestPayment: async () => { calls.push(['submit']); },
    fetchStellarTransactionStatus: async () => 'confirmed',
    ...options.helpers,
  };
  const mod = loadTs(require.resolve('../hooks/useNativeStellarWallet.ts'), {
    '@/contexts/DemoContext': { useDemoMode: () => shared, toError: (error) => error },
    '@human.tech/waap-sdk-react-native/stellar': { getWaaPStellarProvider: (args) => {
      assert.equal(args.network, 'TESTNET');
      return sdk;
    } },
    '@/lib/stellar-native': helpers,
  }, {
    setTimeout: (fn, ms) => { const id = Symbol(); timers.set(id, { fn, ms }); return id; },
    clearTimeout: (id) => timers.delete(id),
  });
  let current;
  function Probe() { current = mod.useNativeStellarWallet(); return null; }
  let root;
  await act(async () => { root = create(React.createElement(Probe)); });
  t.after(async () => { await act(async () => root.unmount()); });
  return {
    calls, timers, get: () => current,
    setAccount: async (account) => {
      shared.account = account;
      await act(async () => root.update(React.createElement(Probe)));
    },
  };
}

test('uses the existing session and reads its native Stellar balance', async (t) => {
  const app = await mount(t);
  assert.equal(app.get().address, 'G-0xfirst');
  assert.equal(app.get().balance.balance, '10000.0000000');
  assert.equal(app.get().busy, null);
});

test('logout clears the address and ignores a delayed balance read', async (t) => {
  const read = deferred();
  const app = await mount(t, { helpers: { fetchStellarBalance: () => read.promise } });
  await app.setAccount(null);
  await act(async () => read.resolve({ exists: true, balance: '123' }));
  assert.equal(app.get().address, null);
  assert.equal(app.get().balance, null);
  assert.equal(app.get().busy, null);
});

test('switching accounts replaces native state and clears the old signature', async (t) => {
  const app = await mount(t);
  await act(async () => { await app.get().signMessage(); });
  assert.equal(app.get().signature, 'signature');
  await app.setAccount('0xsecond');
  assert.equal(app.get().address, 'G-0xsecond');
  assert.equal(app.get().signature, null);
});

test('a signature arriving after logout is never broadcast', async (t) => {
  const signing = deferred();
  const app = await mount(t, { sdk: { signTransaction: () => signing.promise } });
  await act(async () => { void app.get().sendTestPayment(); });
  await app.setAccount(null);
  await act(async () => signing.resolve({ signedTxXdr: 'signed' }));
  assert.equal(app.calls.some(([name]) => name === 'submit'), false);
  assert.equal(app.get().transaction, null);
});

test('a timed-out signature is never broadcast and releases the busy state', async (t) => {
  const signing = deferred();
  const app = await mount(t, { sdk: { signTransaction: () => signing.promise } });
  await act(async () => { void app.get().sendTestPayment(); });
  await act(async () => {
    for (const timer of app.timers.values()) if (timer.ms === 120_000) timer.fn();
  });
  assert.equal(app.get().busy, null);
  assert.match(app.get().error, /too long/);
  await act(async () => signing.resolve({ signedTxXdr: 'signed' }));
  assert.equal(app.calls.some(([name]) => name === 'submit'), false);
});

test('payment binds the requested account and confirms separately from signing', async (t) => {
  const app = await mount(t);
  await act(async () => { await app.get().sendTestPayment(); });
  const signing = app.calls.find(([name]) => name === 'signTransaction')[1];
  assert.equal(signing.address, 'G-0xfirst');
  assert.equal(signing.networkPassphrase, 'testnet-passphrase');
  assert.notEqual(signing.submit, true);
  assert.equal(app.calls.filter(([name]) => name === 'submit').length, 1);
  assert.equal(app.get().transaction.hash, hash);
  assert.equal(app.get().transaction.status, 'confirmed');
});

test('an uncertain submission retains the hash and blocks duplicate sends', async (t) => {
  let submitted = 0;
  const app = await mount(t, { helpers: { submitStellarTestPayment: async () => {
    submitted++;
    throw new Error('connection lost');
  } } });
  await act(async () => { await app.get().sendTestPayment(); });
  assert.equal(app.get().transaction.status, 'pending');
  assert.equal(app.get().transaction.hash, hash);
  await act(async () => { await app.get().sendTestPayment(); });
  assert.equal(submitted, 1);
  await act(async () => { await app.get().checkTransaction(); });
  assert.equal(app.get().transaction.status, 'confirmed');
});

test('the wallet cannot silently change the payment before submission', async (t) => {
  const app = await mount(t, { helpers: { signedTransactionHash: (xdr) => xdr === 'unsigned' ? hash : 'b'.repeat(64) } });
  await act(async () => { await app.get().sendTestPayment(); });
  assert.equal(app.calls.some(([name]) => name === 'submit'), false);
  assert.match(app.get().error, /different payment/);
});
