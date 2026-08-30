import {
  fetchLatestRelease,
  isUpdateAvailable,
  selectLatestRelease,
  type AppRelease,
} from './appUpdate';
import { parseSemver } from './semver';

const release = (overrides: Partial<AppRelease> & { tag: string }): AppRelease => ({
  version: parseSemver('0.2.9')!,
  notes: null,
  apkUrl: 'https://example.com/uichat-mira-mobile-release.apk',
  releaseUrl: `https://github.com/dangjingtao/uichat-mira-mobile/releases/tag/${overrides.tag}`,
  ...overrides,
});

describe('selectLatestRelease', () => {
  it('keeps dev channel away from prod releases', () => {
    const latest = selectLatestRelease('dev', [
      { tag_name: 'v0.3.0', draft: false, prerelease: false },
      { tag_name: 'v0.2.9-dev', draft: false, prerelease: true },
    ]);

    expect(latest?.tag).toBe('v0.2.9-dev');
  });

  it('keeps prod channel away from dev prereleases', () => {
    const latest = selectLatestRelease('prod', [
      { tag_name: 'v0.3.0-dev', draft: false, prerelease: true },
      { tag_name: 'v0.2.8', draft: false, prerelease: false },
    ]);

    expect(latest?.tag).toBe('v0.2.8');
  });

  it('rejects a dev-tagged release that is not flagged as a prerelease', () => {
    const latest = selectLatestRelease('dev', [
      { tag_name: 'v0.2.9-dev', draft: false, prerelease: false },
    ]);

    expect(latest).toBeNull();
  });

  it('rejects a stable-tagged release that is flagged as a prerelease', () => {
    const latest = selectLatestRelease('prod', [
      { tag_name: 'v0.2.8', draft: false, prerelease: true },
    ]);

    expect(latest).toBeNull();
  });

  it('picks the highest version within the channel', () => {
    const latest = selectLatestRelease('dev', [
      { tag_name: 'v0.2.9-dev', draft: false, prerelease: true },
      { tag_name: 'v0.2.10-dev', draft: false, prerelease: true },
      { tag_name: 'v0.2.2-dev', draft: false, prerelease: true },
    ]);

    expect(latest?.tag).toBe('v0.2.10-dev');
  });

  it('ignores drafts and invalid tags', () => {
    const latest = selectLatestRelease('dev', [
      { tag_name: 'v0.9.9-dev', draft: true, prerelease: true },
      { tag_name: 'not-a-version', draft: false, prerelease: true },
      { tag_name: 'v0.2.9-dev2', draft: false, prerelease: true },
      { tag_name: 'v0.2.9', draft: false, prerelease: false },
    ]);

    expect(latest).toBeNull();
  });

  it('extracts the signed release APK asset when present', () => {
    const latest = selectLatestRelease('prod', [
      {
        tag_name: 'v0.2.8',
        draft: false,
        prerelease: false,
        assets: [
          { name: 'SHA256SUMS.txt', browser_download_url: 'https://example.com/sums' },
          {
            name: 'uichat-mira-mobile-release.apk',
            browser_download_url: 'https://example.com/apk',
          },
        ],
      },
    ]);

    expect(latest?.apkUrl).toBe('https://example.com/apk');
  });

  it('reports a missing APK asset instead of guessing a URL', () => {
    const latest = selectLatestRelease('prod', [
      {
        tag_name: 'v0.2.8',
        draft: false,
        prerelease: false,
        assets: [{ name: 'SHA256SUMS.txt', browser_download_url: 'https://example.com/sums' }],
      },
    ]);

    expect(latest?.apkUrl).toBeNull();
  });
});

describe('isUpdateAvailable', () => {
  it('detects a newer remote version', () => {
    expect(
      isUpdateAvailable(
        parseSemver('0.2.9')!,
        release({ tag: 'v0.2.10-dev', version: parseSemver('0.2.10')! }),
      ),
    ).toBe(true);
  });

  it('treats equal versions as current', () => {
    expect(
      isUpdateAvailable(parseSemver('0.2.9')!, release({ tag: 'v0.2.9-dev' })),
    ).toBe(false);
  });

  it('treats a newer local version as current', () => {
    expect(
      isUpdateAvailable(parseSemver('0.3.0')!, release({ tag: 'v0.2.9-dev' })),
    ).toBe(false);
  });

  it('treats an absent release as not-current-but-unknown', () => {
    expect(isUpdateAvailable(parseSemver('0.2.9')!, null)).toBe(false);
  });
});

describe('fetchLatestRelease', () => {
  const jsonResponse = (payload: unknown) =>
    ({ ok: true, json: async () => payload }) as Response;

  it('returns the latest release for the channel', async () => {
    const result = await fetchLatestRelease('dev', async () =>
      jsonResponse([
        { tag_name: 'v0.2.8-dev', draft: false, prerelease: true },
        { tag_name: 'v0.2.9-dev', draft: false, prerelease: true },
      ]),
    );

    expect(result?.tag).toBe('v0.2.9-dev');
  });

  it('throws on HTTP failure instead of reporting "up to date"', async () => {
    await expect(
      fetchLatestRelease('dev', async () =>
        ({ ok: false, status: 503 }) as Response,
      ),
    ).rejects.toThrow('HTTP 503');
  });

  it('throws on network failure', async () => {
    await expect(
      fetchLatestRelease('dev', async () => {
        throw new Error('network unreachable');
      }),
    ).rejects.toThrow('network unreachable');
  });

  it('returns null when the channel has no published releases', async () => {
    const result = await fetchLatestRelease('dev', async () =>
      jsonResponse([{ tag_name: 'v0.2.8', draft: false, prerelease: false }]),
    );

    expect(result).toBeNull();
  });

  it('throws when the payload is not a list', async () => {
    await expect(
      fetchLatestRelease('dev', async () => jsonResponse({ message: 'nope' })),
    ).rejects.toThrow('响应格式异常');
  });
});
