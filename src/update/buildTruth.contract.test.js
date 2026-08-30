const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { resolveReleaseChannel } = require('../../scripts/resolve-release-channel');

const readSource = path => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('MOB-028 build truth', () => {
  it('keeps dev and prod comparisons isolated by branch truth', () => {
    expect(resolveReleaseChannel({ env: {}, branchName: 'dev' })).toBe('dev');
    expect(resolveReleaseChannel({ env: {}, branchName: 'prod' })).toBe('prod');

    // GitHub PR base is authoritative even if a stale workflow-level env says dev.
    expect(
      resolveReleaseChannel({
        env: { MIRA_RELEASE_CHANNEL: 'dev', GITHUB_BASE_REF: 'prod' },
        branchName: '',
      }),
    ).toBe('prod');
    expect(
      resolveReleaseChannel({
        env: { MIRA_RELEASE_CHANNEL: 'prod', GITHUB_BASE_REF: 'dev' },
        branchName: '',
      }),
    ).toBe('dev');
  });

  it('defaults feature/local unknown branches to dev and rejects invalid explicit channels', () => {
    expect(resolveReleaseChannel({ env: {}, branchName: 'feature/mob-028' })).toBe('dev');
    expect(() =>
      resolveReleaseChannel({
        env: { MIRA_RELEASE_CHANNEL: 'preview' },
        branchName: 'feature/mob-028',
      }),
    ).toThrow('Invalid MIRA_RELEASE_CHANNEL');
  });

  it('keeps the iOS installed marketing version aligned with package.json', () => {
    const packageVersion = JSON.parse(readSource('package.json')).version;
    const plist = readSource('ios/UIChatMira/Info.plist');
    const match = /<key>CFBundleShortVersionString<\/key>\s*<string>([^<]+)<\/string>/.exec(plist);

    expect(match).not.toBeNull();
    expect(match[1]).toBe(packageVersion);
  });
});
