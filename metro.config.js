const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

/**
 * Build-time release channel truth (MOB-028).
 *
 * CI sets MIRA_RELEASE_CHANNEL (`dev` or `prod`) when bundling; local builds
 * default to `dev`. The channel decides which GitHub Release tags the update
 * check is allowed to consider, so a prod build never sees dev prereleases.
 */
const releaseChannel =
  process.env.MIRA_RELEASE_CHANNEL === 'prod' ? 'prod' : 'dev';
const channelModulePath = path.resolve(
  __dirname,
  'src',
  'update',
  'channel',
  `${releaseChannel}.ts`,
);

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  // Keep release bundling stable on Windows when transforming large ESM dependencies.
  maxWorkers: 1,
  resolver: {
    resolveRequest: (context, moduleName, platform) => {
      if (moduleName === 'mira-release-channel') {
        return { type: 'sourceFile', filePath: channelModulePath };
      }
      return context.resolveRequest(context, moduleName, platform);
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
