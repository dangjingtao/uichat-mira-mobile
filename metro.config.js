const { execFileSync } = require('node:child_process');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');
const { resolveReleaseChannel } = require('./scripts/resolve-release-channel');

const currentBranch = () => {
  try {
    return execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
      cwd: __dirname,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
};

/**
 * Build-time release channel truth (MOB-028).
 *
 * dev builds compare only dev prereleases; prod builds compare only stable
 * prod releases. GitHub branch/base refs and local dev/prod checkouts are
 * authoritative so a production build cannot silently become a dev build.
 */
const releaseChannel = resolveReleaseChannel({
  env: process.env,
  branchName: currentBranch(),
});
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
