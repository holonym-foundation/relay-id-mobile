const assert = require('node:assert/strict');
const { test } = require('node:test');
const { Buffer } = require('node:buffer');
const { Keypair, hash, Networks } = require('@stellar/stellar-base');
const { loadTs } = require('./helpers/load-ts.cjs');
const path = require('node:path');
const loadApi = (globals = {}) => loadTs(path.resolve(__dirname, '../lib/stellar-disbursements.ts'), {}, { URL, ...globals });
const api = loadApi();
const key = Keypair.fromRawEd25519Seed(Buffer.alloc(32, 7));
const address = key.publicKey();
const id = '6a55325a-29c2-4053-be2a-ebf91d7a0358';
const passphrase = Networks.TESTNET;
const common = { nonce: 'a1b2c3d4e5f6g7h8', issuedAt: '1790000000' };
const signed = (text) => key.sign(hash(Buffer.from(`Stellar Signed Message:\n${text}`))).toString('base64');
const vectors = [
  [{ account: address, ...common },
    `RelayID\nSign in to RelayID to see your disbursements.\nAction: StartStellarSession\nAccount: ${address}\nNetwork: ${passphrase}\nNonce: a1b2c3d4e5f6g7h8\nIssued at: 1790000000`,
    'q8/WAdBqY/xeDKbwrkqvtQUJvcE7E5K+HljYdy7y/e4GKBcDcxfepMmTF+MosDUa88RRJbpL4ikEXzGRMKhSBQ=='],
  [{ beneficiary: address, disbursementId: id, ...common },
    `RelayID\nRedeem a disbursement into this Stellar account.\nAction: RedeemDisbursement\nAccount: ${address}\nDisbursement: ${id}\nNetwork: ${passphrase}\nNonce: a1b2c3d4e5f6g7h8\nIssued at: 1790000000`,
    'ixpLscTGFGFmYaXhIa171bqOr0VbdfHG1s3RlRdovgzOiuyl9ZJ32pS+zSC4aJs+uoqbB3C4xT/cV5VuB6zZAA=='],
];
for (const [message, text, expected] of vectors) {
  test(`exact ${'account' in message ? 'session' : 'redeem'} text and SEP-53 signature match supplied vector`, () => {
    assert.equal(address, 'GDVEU3DD4KOFECV66VIHWEZOYX4ZKR3WV27L464SIIPOU2IUI3JCZA57');
    assert.equal(api.actionText(message, passphrase), text);
    assert.equal(signed(text), expected);
    assert.equal(api.verifiedSignature(text, address, { signerAddress: address, signedMessage: expected }), expected);
    assert.equal(api.verifiedSignature(text, address, { signerAddress: address, signedMessage: Buffer.from(expected, 'base64').toString('hex') }), expected);
  });
}
test('wallet signatures are bound to the requested key, full text and network', () => {
  const [, text, signature] = vectors[0];
  const result = { signerAddress: address, signedMessage: signature };
  assert.throws(() => api.verifiedSignature(`${text}\n`, address, result), /invalid/);
  assert.throws(() => api.verifiedSignature(text.replace(passphrase, Networks.PUBLIC), address, result), /invalid/);
  assert.throws(() => api.verifiedSignature(text, address, { ...result, signerAddress: 'another' }), /different/);
  assert.throws(() => api.verifiedSignature(text, address, { ...result, signedMessage: 'invalid' }), /invalid/);
});
test('configuration uses RelayID origin, strips /api, and rejects unsafe or ambiguous URLs', () => {
  assert.equal(api.disbursementOrigin('https://relayid.example/api'), 'https://relayid.example');
  assert.equal(api.disbursementOrigin(), null);
  assert.equal(api.disbursementOrigin('http://127.0.0.1:3000'), 'http://127.0.0.1:3000');
  for (const value of ['http://relayid.example', 'https://user:pass@relayid.example', 'https://relayid.example/wrong', 'https://relayid.example?token=secret']) {
    assert.throws(() => api.disbursementOrigin(value));
  }
});
test('HTTP client scopes explicit cookie, omits native cookies and uses a 75-second redeem timeout', async () => {
  const timers = [];
  const calls = [];
  const mod = loadApi({
    setTimeout: (fn, ms) => { timers.push(ms); return 1; }, clearTimeout: () => {},
    fetch: async (url, options) => {
      calls.push({ url, options });
      return { ok: true, json: async () => ({ address, expiresAt: 100 }), headers: new Headers({ 'set-cookie': 'relayid_stellar_session=abc.def; Path=/api; HttpOnly; Secure' }) };
    },
  });
  const request = mod.createDisbursementApi('https://relayid.example');
  const result = await request('/api/session/stellar', { method: 'POST', body: { message: {} } });
  await request('/api/disbursements/mine', { cookie: result.cookie });
  await request('/api/disbursements/redeem', { method: 'POST', body: {} });
  assert.equal(result.cookie, 'relayid_stellar_session=abc.def');
  assert.deepEqual(timers, [15000, 15000, 75000]);
  assert.equal(calls[1].options.headers.Cookie, result.cookie);
  assert.equal(calls[0].options.credentials, 'omit');
  assert.equal(calls[0].options.redirect, 'error');
  assert.equal(calls[2].options.headers.Cookie, undefined);
});
test('session probe accepts deployed 401 without machine code and HTTP errors branch on code', async () => {
  const mod = loadApi({ fetch: async () => ({ ok: false, status: 401, json: async () => ({ error: 'No session' }) }) });
  await assert.rejects(mod.createDisbursementApi('https://relayid.example')('/api/session/stellar'), (e) => e.code === 'no_session');
  const failed = loadApi({ fetch: async () => ({ ok: false, status: 502, json: async () => ({ error: 'arbitrary words', code: 'payment_unconfirmed' }) }) });
  await assert.rejects(failed.createDisbursementApi('https://relayid.example')('/api/disbursements/redeem'), (e) => e.code === 'payment_unconfirmed');
});

const { DisbursementController } = loadTs(path.resolve(__dirname, '../lib/disbursement-controller.ts'), { './stellar-disbursements': api });
const deferred = () => { let resolve; const promise = new Promise((yes) => { resolve = yes; }); return { promise, resolve }; };
function setup(overrides = {}) {
  const requests = [], texts = [], writes = [];
  let stored = overrides.stored ?? null;
  let counter = 0;
  let items = [{ id, beneficiary: address, amount: '900719925.4740993', status: 'pending', txHash: null, createdAt: '2026-10-02T15:20:11.000Z', redeemedAt: null }];
  const session = { address, expiresAt: Math.floor(Date.now() / 1000) + 86400 };
  const storage = {
    read: async () => stored, write: async (value) => { writes.push(value); stored = value; }, clear: async () => { stored = null; },
    ...overrides.storage,
  };
  const request = async (route, options = {}) => {
    requests.push({ route, ...options });
    const custom = overrides.api && await overrides.api(route, options, { items, setItems: (next) => { items = next; }, session });
    if (custom !== undefined) return custom;
    if (route === '/api/disbursements/mine') return { data: { disbursements: items } };
    if (route === '/api/disbursements/redeem') {
      items = items.map((item) => ({ ...item, status: 'redeemed', txHash: 'a'.repeat(64), redeemedAt: '2026-10-02T16:20:11.000Z' }));
      return { data: { disbursement: items[0] } };
    }
    return { data: session, cookie: 'relayid_stellar_session=secret' };
  };
  const deps = { address, passphrase, api: request, storage, nonce: () => `randomnonce${++counter}`, sign: async (text, signal) => { texts.push(text); return overrides.sign ? overrides.sign(text, signal) : signed(text); } };
  return { controller: new DisbursementController(deps), requests, texts, writes, deps, stored: () => stored, setItems: (next) => { items = next; } };
}
test('sign-in sends only contract fields, restores persisted session, and preserves exact amounts', async () => {
  const app = setup();
  await app.controller.signIn();
  assert.equal(app.controller.getSnapshot().items[0].amount, '900719925.4740993');
  assert.deepEqual(Object.keys(app.requests[0].body.message).sort(), ['account', 'issuedAt', 'nonce']);
  assert.equal(typeof app.requests[0].body.message.issuedAt, 'string');
  assert.equal(app.writes.length, 1);
  const restarted = new DisbursementController(app.deps);
  await restarted.restore();
  assert.equal(restarted.getSnapshot().authenticated, true);
  assert.equal(app.texts.length, 1);
  assert.equal(app.requests.at(-2).method, undefined);
  assert.equal(app.requests.at(-2).cookie, 'relayid_stellar_session=secret');
});
test('redeem signs exact action, refreshes after success, and prevents subsequent redemption', async () => {
  const app = setup();
  await app.controller.signIn();
  await app.controller.redeem(id);
  const request = app.requests.find((r) => r.route.endsWith('/redeem'));
  assert.deepEqual(Object.keys(request.body.message).sort(), ['beneficiary', 'disbursementId', 'issuedAt', 'nonce']);
  assert.equal(request.cookie, undefined);
  assert.match(app.texts.at(-1), /Action: RedeemDisbursement/);
  assert.equal(app.controller.getSnapshot().items[0].status, 'redeemed');
  assert.equal(app.requests.at(-1).route, '/api/disbursements/mine');
  await app.controller.redeem(id);
  assert.equal(app.requests.filter((r) => r.route.endsWith('/redeem')).length, 1);
});
test('double taps are ignored while wallet approval or server payment is pending', async () => {
  const signing = deferred();
  const app = setup({ sign: (text) => text.includes('RedeemDisbursement') ? signing.promise : signed(text) });
  await app.controller.signIn();
  const first = app.controller.redeem(id);
  await app.controller.redeem(id);
  assert.equal(app.texts.length, 2);
  signing.resolve('signature');
  await first;
  assert.equal(app.requests.filter((r) => r.route.endsWith('/redeem')).length, 1);
});
test('logout during signing suppresses late redemption and clears local and server session', async () => {
  const signing = deferred();
  const app = setup({ sign: (text) => text.includes('RedeemDisbursement') ? signing.promise : signed(text) });
  await app.controller.signIn();
  const redeem = app.controller.redeem(id);
  await app.controller.endSession();
  signing.resolve('signature');
  await redeem;
  assert.equal(app.requests.some((r) => r.route.endsWith('/redeem')), false);
  assert.equal(app.stored(), null);
  assert.equal(app.requests.at(-1).method, 'DELETE');
  assert.equal(app.controller.getSnapshot().items.length, 0);
});
test('logout during a session POST never persists its late response', async () => {
  const response = deferred();
  const app = setup({ api: (route, options) => options.method === 'POST' && route.includes('/session/') ? response.promise : undefined });
  const login = app.controller.signIn();
  await new Promise(setImmediate);
  await app.controller.endSession();
  response.resolve({ data: { address, expiresAt: Date.now() / 1000 + 1000 }, cookie: 'relayid_stellar_session=late' });
  await login;
  assert.equal(app.writes.length, 0);
  assert.equal(app.stored(), null);
});
test('ambiguous network failure is never automatically retried and failed refresh locks redemption', async () => {
  let failed = false, allowRefresh = false;
  const app = setup({ api: (route) => {
    if (route.endsWith('/redeem')) { failed = true; throw new api.DisbursementError('network_error'); }
    if (route.endsWith('/mine') && failed && !allowRefresh) throw new api.DisbursementError('network_error');
  } });
  await app.controller.signIn();
  await app.controller.redeem(id);
  assert.equal(app.controller.getSnapshot().fresh, false);
  await app.controller.redeem(id);
  assert.equal(app.requests.filter((r) => r.route.endsWith('/redeem')).length, 1);
  allowRefresh = true;
  await app.controller.refresh();
  assert.equal(app.controller.getSnapshot().fresh, true);
});
for (const code of ['expired_signature', 'replay']) {
  test(`${code} retries at most once with fresh signed fields, after refreshing status`, async () => {
    const app = setup({ api: (route) => { if (route.endsWith('/redeem')) throw new api.DisbursementError(code); } });
    await app.controller.signIn();
    await app.controller.redeem(id);
    const sent = app.requests.filter((r) => r.route.endsWith('/redeem'));
    assert.equal(sent.length, 2);
    assert.notEqual(sent[0].body.message.nonce, sent[1].body.message.nonce);
    assert.equal(app.requests.at(-1).route, '/api/disbursements/mine');
    assert.ok(app.controller.getSnapshot().error);
  });
}
for (const code of ['invalid_request', 'invalid_signature', 'not_beneficiary', 'disbursement_not_found', 'not_redeemable', 'payment_failed', 'payment_unconfirmed', 'server_error']) {
  test(`${code} is shown, followed by refresh without automatic redeem retry`, async () => {
    const app = setup({ api: (route, options, state) => {
      if (route.endsWith('/redeem')) {
        if (code === 'payment_unconfirmed') state.setItems(state.items.map((item) => ({ ...item, status: 'needs_review' })));
        throw new api.DisbursementError(code);
      }
    } });
    await app.controller.signIn();
    await app.controller.redeem(id);
    assert.equal(app.requests.filter((r) => r.route.endsWith('/redeem')).length, 1);
    assert.equal(app.requests.at(-1).route, '/api/disbursements/mine');
    assert.equal(app.controller.getSnapshot().error, api.disbursementErrorMessage(new api.DisbursementError(code)));
    if (code === 'payment_unconfirmed') {
      await app.controller.redeem(id);
      assert.equal(app.requests.filter((r) => r.route.endsWith('/redeem')).length, 1);
    }
  });
}
test('no_session clears credentials and list; expired saved session does not authenticate', async () => {
  let expired = false;
  const app = setup({ api: (route) => { if (expired && route.endsWith('/mine')) throw new api.DisbursementError('no_session'); } });
  await app.controller.signIn();
  expired = true;
  await app.controller.refresh();
  assert.equal(app.stored(), null);
  assert.equal(app.controller.getSnapshot().authenticated, false);
  assert.equal(app.controller.getSnapshot().items.length, 0);
  const old = setup({ stored: { address, expiresAt: 1, cookie: 'relayid_stellar_session=old' } });
  await old.controller.restore();
  assert.equal(old.stored(), null);
  assert.equal(old.controller.getSnapshot().authenticated, false);
});
test('list for another beneficiary is rejected; non-pending statuses cannot redeem', async () => {
  const app = setup();
  app.setItems([{ id, beneficiary: Keypair.random().publicKey(), amount: '1', status: 'pending', txHash: null, createdAt: '2026-10-02T15:20:11.000Z', redeemedAt: null }]);
  await app.controller.signIn();
  assert.equal(app.controller.getSnapshot().items.length, 0);
  assert.equal(app.controller.getSnapshot().fresh, false);
  for (const status of ['redeeming', 'redeemed', 'needs_review', 'cancelled']) {
    app.setItems([{ id, beneficiary: address, amount: '1', status, txHash: null, createdAt: '2026-10-02T15:20:11.000Z', redeemedAt: null }]);
    await app.controller.refresh();
    await app.controller.redeem(id);
  }
  assert.equal(app.requests.some((r) => r.route.endsWith('/redeem')), false);
});
test('logout clears local credentials even when server is unreachable', async () => {
  const app = setup({ api: (_route, options) => { if (options.method === 'DELETE') throw new Error('offline'); } });
  await app.controller.signIn();
  assert.equal(await app.controller.endSession(), false);
  assert.equal(app.stored(), null);
  assert.equal(app.controller.getSnapshot().authenticated, false);
});
