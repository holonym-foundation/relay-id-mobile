const assert = require('node:assert/strict');
const { Buffer } = require('node:buffer');
const { test } = require('node:test');
const { Keypair, TransactionBuilder, Networks } = require('@stellar/stellar-base');
const { loadTs } = require('./helpers/load-ts.cjs');
const address = Keypair.fromRawEd25519Seed(Buffer.alloc(32, 1)).publicKey();
const hash = 'a'.repeat(64);
const response = (status, data) => ({ ok: status >= 200 && status < 300, status, json: async () => data });
function load(fetch, extra = {}) {
  return loadTs(require.resolve('../lib/stellar-native.ts'), {}, { fetch, ...extra });
}

test('native Stellar defaults to testnet and rejects unknown network configuration', () => {
  const api = load();
  assert.equal(api.parseStellarNetwork(), 'TESTNET');
  assert.equal(api.parseStellarNetwork('PUBLIC'), 'PUBLIC');
  assert.throws(() => api.parseStellarNetwork('mainnet'), /TESTNET or PUBLIC/);
});

test('a missing account is distinct from a funded account and balances retain precision', async () => {
  let reply = response(404);
  const api = load(async (url) => {
    assert.equal(url, `https://horizon-testnet.stellar.org/accounts/${address}`);
    return reply;
  });
  const missing = await api.fetchStellarBalance(address, 'TESTNET');
  assert.equal(missing.exists, false);
  assert.equal(missing.balance, null);
  reply = response(200, { balances: [{ asset_type: 'native', balance: '900719925.4740993' }] });
  const funded = await api.fetchStellarBalance(address, 'TESTNET');
  assert.equal(funded.exists, true);
  assert.equal(funded.balance, '900719925.4740993');
});

test('failed and malformed balance reads are errors, never a zero balance', async () => {
  const failed = load(async () => response(503));
  await assert.rejects(failed.fetchStellarBalance(address, 'TESTNET'), /503/);
  const malformed = load(async () => response(200, { balances: [] }));
  await assert.rejects(malformed.fetchStellarBalance(address, 'TESTNET'), /invalid balance/);
});

test('test payment is a standard envelope, one stroop to self, with a fresh exact sequence', async () => {
  const api = load(async () => response(200, { sequence: '9007199254740993' }));
  const encoded = await api.buildStellarTestPayment(address, 'TESTNET');
  assert.match(encoded, /^[A-Za-z0-9+/]+=*$/);
  const transaction = TransactionBuilder.fromXDR(encoded, Networks.TESTNET);
  assert.equal(transaction.source, address);
  assert.equal(transaction.sequence, '9007199254740994');
  assert.equal(transaction.fee, '100');
  assert.equal(transaction.operations.length, 1);
  assert.equal(transaction.operations[0].type, 'payment');
  assert.equal(transaction.operations[0].destination, address);
  assert.equal(transaction.operations[0].amount, '0.0000001');
  assert.equal(transaction.operations[0].asset.isNative(), true);
  assert.equal(transaction.memo.value.toString(), 'RelayID native test');
  assert.ok(Number(transaction.timeBounds.maxTime) <= Math.floor(Date.now() / 1000) + 180);
  assert.ok(Number(transaction.timeBounds.maxTime) > Math.floor(Date.now() / 1000));
  const before = api.signedTransactionHash(encoded, 'TESTNET');
  transaction.sign(Keypair.fromRawEd25519Seed(Buffer.alloc(32, 1)));
  assert.equal(api.signedTransactionHash(transaction.toXDR(), 'TESTNET'), before);
});

test('test funding, building and broadcasting cannot reach mainnet', async () => {
  let requests = 0;
  const api = load(async () => { requests++; throw new Error('must not fetch'); });
  await assert.rejects(api.fundStellarTestAccount(address, 'PUBLIC'), /testnet/);
  await assert.rejects(api.buildStellarTestPayment(address, 'PUBLIC'), /testnet/);
  await assert.rejects(api.submitStellarTestPayment('xdr', 'PUBLIC'), /testnet/);
  assert.equal(requests, 0);
});

test('invalid addresses are rejected before a network request', async () => {
  const api = load(async () => { throw new Error('must not fetch'); });
  await assert.rejects(api.fetchStellarBalance('not-an-address', 'TESTNET'), /invalid Stellar/);
});

test('confirmation checks distinguish pending, confirmed and failed transactions', async () => {
  let reply = response(404);
  const api = load(async (url) => {
    assert.equal(url, `https://horizon-testnet.stellar.org/transactions/${hash}`);
    return reply;
  });
  assert.equal(await api.fetchStellarTransactionStatus(hash, 'TESTNET'), 'pending');
  reply = response(200, { successful: true });
  assert.equal(await api.fetchStellarTransactionStatus(hash, 'TESTNET'), 'confirmed');
  reply = response(200, { successful: false });
  assert.equal(await api.fetchStellarTransactionStatus(hash, 'TESTNET'), 'failed');
  assert.match(api.transactionUrl('PUBLIC', hash), /explorer\/public\/tx/);
  assert.throws(() => api.transactionUrl('TESTNET', '../bad'), /Invalid/);
});

test('submission sends the signed envelope to the selected testnet endpoint', async () => {
  const api = load(async (url, options) => {
    assert.equal(url, 'https://horizon-testnet.stellar.org/transactions');
    assert.equal(options.method, 'POST');
    assert.equal(options.body, 'tx=abc%2B%2F%3D');
    return response(200, { hash });
  });
  await api.submitStellarTestPayment('abc+/=', 'TESTNET');
});

test('the request timeout includes reading the response body', async () => {
  let expire;
  let signal;
  let markReading;
  const reading = new Promise((resolve) => { markReading = resolve; });
  const api = load(async (_url, options) => {
    signal = options.signal;
    return { ok: true, status: 200, json: () => new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(new Error('body read aborted')));
      markReading();
    }) };
  }, { setTimeout: (fn) => { expire = fn; return 1; }, clearTimeout() {} });
  const read = api.fetchStellarBalance(address, 'TESTNET');
  await reading;
  expire();
  await assert.rejects(read, /aborted/);
  assert.equal(signal.aborted, true);
});
