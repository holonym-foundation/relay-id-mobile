// The production identity stays in app.json. Staging installs alongside it.
module.exports = ({ config }) => {
  if (process.env.RELAYID_APP_VARIANT !== 'staging') return config;

  const appId = 'org.refunite.relayid.app.staging';
  const scheme = 'relayidmobilestaging';
  return {
    ...config,
    name: 'RelayID Staging',
    slug: 'relayid-mobile-staging',
    owner: 'holosoe',
    scheme,
    android: { ...config.android, package: appId, intentFilters: [] },
    ios: { ...config.ios, bundleIdentifier: appId, associatedDomains: [] },
    extra: {
      ...config.extra,
      eas: { projectId: 'ae63e081-9532-4065-92d8-99310cc0213c' },
      waapProject: { appId, nativeRedirect: `${scheme}://` },
    },
  };
};
