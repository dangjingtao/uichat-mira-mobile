// The real module is selected at bundle time:
// - Metro (metro.config.js) resolves `mira-release-channel` to
//   `src/update/channel/dev.ts` or `src/update/channel/prod.ts` based on the
//   MIRA_RELEASE_CHANNEL environment variable set by CI.
// - Jest (jest.config.js moduleNameMapper) always resolves to the dev channel.
declare module 'mira-release-channel' {
  export type ReleaseChannelValue = 'dev' | 'prod';
  export const releaseChannel: ReleaseChannelValue;
}
