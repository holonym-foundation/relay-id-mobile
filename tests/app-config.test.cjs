const assert = require('node:assert/strict');
const { test } = require('node:test');
const configure = require('../app.config.js');
const base = require('../app.json').expo;
const profiles = require('../eas.json').build;

test('default app configuration preserves the production identity and EAS project', () => {
  const previous = process.env.RELAYID_APP_VARIANT;
  try {
    delete process.env.RELAYID_APP_VARIANT;
    assert.equal(configure({ config: base }), base);
    assert.equal(base.extra.eas.projectId, '0be37a59-094c-44b4-9e51-5a8528b958c1');
  } finally {
    if (previous === undefined) delete process.env.RELAYID_APP_VARIANT;
    else process.env.RELAYID_APP_VARIANT = previous;
  }
});

test('staging APK has its own identity, wallet callback and EAS project with no production app links', () => {
  const previous = process.env.RELAYID_APP_VARIANT;
  try {
    process.env.RELAYID_APP_VARIANT = profiles.staging.env.RELAYID_APP_VARIANT;
    const config = configure({ config: base });
    assert.equal(config.android.package, 'org.refunite.relayid.app.staging');
    assert.equal(config.extra.waapProject.appId, config.android.package);
    assert.equal(config.extra.waapProject.nativeRedirect, `${config.scheme}://`);
    assert.notEqual(config.scheme, base.scheme);
    assert.notEqual(config.extra.eas.projectId, base.extra.eas.projectId);
    assert.deepEqual(config.android.intentFilters, []);
    assert.deepEqual(config.ios.associatedDomains, []);
    assert.equal(profiles.staging.android.buildType, 'apk');
    assert.equal(profiles.staging.env.EXPO_PUBLIC_WAAP_ENVIRONMENT, 'staging');
    assert.equal(profiles.staging.env.EXPO_PUBLIC_STELLAR_NATIVE_NETWORK, 'TESTNET');
    assert.equal(base.android.package, 'org.refunite.relayid.app');
  } finally {
    if (previous === undefined) delete process.env.RELAYID_APP_VARIANT;
    else process.env.RELAYID_APP_VARIANT = previous;
  }
});
