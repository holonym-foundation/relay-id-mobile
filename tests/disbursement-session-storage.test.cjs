const assert = require('node:assert/strict');
const { test } = require('node:test');
const { Keypair } = require('@stellar/stellar-base');
const { loadTs } = require('./helpers/load-ts.cjs');
const api = loadTs(require.resolve('../lib/stellar-disbursements.ts'), {}, { URL });

test('secure storage survives a new client and serializes logout behind pending writes', async () => {
  const secrets = new Map();
  let finishWrite;
  const pendingWrite = new Promise((resolve) => { finishWrite = resolve; });
  const keychain = {
    ACCESSIBLE: { WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'device-only' },
    getGenericPassword: async ({ service }) => secrets.get(service) ?? false,
    setGenericPassword: async (_account, password, options) => {
      assert.equal(options.accessible, 'device-only');
      await pendingWrite;
      secrets.set(options.service, { password });
    },
    resetGenericPassword: async ({ service }) => secrets.delete(service),
  };
  const { disbursementSessionStorage } = loadTs(require.resolve('../lib/disbursement-session-storage.ts'), {
    'react-native-keychain': keychain, './stellar-disbursements': api,
  });
  const store = disbursementSessionStorage('https://relayid.example', 'TESTNET');
  const session = { address: Keypair.random().publicKey(), expiresAt: 1800000000, cookie: 'relayid_stellar_session=token' };
  const writing = store.write(session);
  finishWrite();
  await writing;
  const restarted = disbursementSessionStorage('https://relayid.example', 'TESTNET');
  assert.deepEqual(await restarted.read(), session);
  assert.equal(await disbursementSessionStorage('https://another.example', 'TESTNET').read(), null);
  assert.equal(await disbursementSessionStorage('https://relayid.example', 'PUBLIC').read(), null);
  const writingAgain = store.write(session);
  const clearing = restarted.clear();
  await Promise.all([writingAgain, clearing]);
  assert.equal(await store.read(), null);
});
